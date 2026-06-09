import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';

// Syncs Yarmilla's "Master Project Overview.xlsx" into public.glint_delivery,
// which powers the War-room Projects tab (the operational delivery view).
//
// Reads BOTH project tabs:
//   • "MASTER – Project Overview"  → current projects
//   • "Old Projects"               → previous projects (forced status = Completed)
// The "Contract durations" tab is ignored.
//
// ── PREREQUISITES (one-time, in Azure) ────────────────────────────────────
// Reading a OneDrive/SharePoint workbook needs Microsoft Graph application
// permission **Files.Read.All** (or Sites.Read.All) with admin consent, plus a
// client secret. Set these Vercel env vars:
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET
//   GLINT_DRIVE_ID  (default below = Yarmilla's OneDrive drive)
//   GLINT_ITEM_ID   (default below = Master_Project_Overview.xlsx)
// Until those exist the endpoint returns 503 and the War-room keeps showing the
// last synced (or seeded) rows — nothing breaks.
//
// Trigger: POST /api/glint-sync  (wire to the Refresh button and/or a cron).

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRIVE_ID = process.env.GLINT_DRIVE_ID
  || 'b!UzWiv8rmuEqlM9GU8Ym6rJbQn5Ki7shJsypuuXFscN-kSCE3yII_ToHlP6KGjwB2';
const ITEM_ID = process.env.GLINT_ITEM_ID || '01ONBCLI7JEHM66SBHXBCZMMMMRI3B2TXP';

async function graphToken() {
  const tenant = process.env.GRAPH_TENANT_ID;
  const id = process.env.GRAPH_CLIENT_ID;
  const secret = process.env.GRAPH_CLIENT_SECRET;
  if (!tenant || !id || !secret) return null;
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const j = await r.json();
  return j.access_token || null;
}

// Best-effort parse of a free-text date cell into an ISO date (yyyy-mm-dd).
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function parseLooseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);        // m/d/yyyy
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return iso(y, +m[1]-1, +m[2]); }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);                       // yyyy-mm-dd
  if (m) return iso(+m[1], +m[2]-1, +m[3]);
  m = t.toLowerCase().match(/([a-z]{3})[a-z]*[\s-]+(\d{2,4})/);      // Jun-26 / June 2026
  if (m && MONTHS[m[1]] !== undefined) { const y = +m[2] < 100 ? 2000 + +m[2] : +m[2]; return iso(y, MONTHS[m[1]], 15); }
  return null;
}
function iso(y, mo, d) { const dt = new Date(Date.UTC(y, mo, d)); return isNaN(dt) ? null : dt.toISOString().slice(0,10); }

// Of survey / insight-review / delivery-end, pick the soonest still in the future
// (fallback: soonest overall). Returns { label, date }.
function nextMilestone(row) {
  const cands = [
    { label: 'Survey', raw: row.survey_date },
    { label: 'Insight review', raw: row.insight_review_date },
    { label: 'Delivery end', raw: row.delivery_end },
  ].map(c => ({ ...c, date: parseLooseDate(c.raw) })).filter(c => c.date);
  if (!cands.length) return { label: null, date: null };
  const today = new Date().toISOString().slice(0,10);
  const future = cands.filter(c => c.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  const pick = future[0] || cands.sort((a,b) => a.date.localeCompare(b.date))[0];
  return { label: `${pick.label} ${pick.date}`, date: pick.date };
}

// Normalise a workbook cell to a trimmed string. Graph returns ISO datetimes for
// real date cells (e.g. "2026-08-01T00:00:00Z") — keep just the date part.
// Excel serial date (days since 1899-12-30) -> ISO yyyy-mm-dd.
function serialToIso(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}
function cellStr(v) {
  if (v === null || v === undefined) return '';
  // Graph returns date cells as Excel serial NUMBERS — convert to ISO.
  if (typeof v === 'number' && v >= 30000 && v <= 60000) return serialToIso(v) || String(v);
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (m) return m[1];
  if (/^\d{5}(\.\d+)?$/.test(s)) { const n = parseFloat(s); if (n >= 30000 && n <= 60000) return serialToIso(n) || s; }
  return s;
}

// Map one worksheet's usedRange values → glint_delivery rows.
// isOld = rows come from the "Old Projects" tab (shown as previous / Completed).
function mapSheet(values, isOld) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const header = values[0].map(h => String(h || '').toLowerCase());
  const col = (...keys) => header.findIndex(h => keys.some(k => h.includes(k)));
  const idx = {
    client: col('client name'),
    project: col('project name', 'yoobi'),
    ptype: col('project type'),
    service: col('service type'),
    region: col('region'),
    status: col('project status', 'status'),
    priority: col('priority'),
    cs_owner: col('cs owner'),
    ps_owner: col('ps owner'),
    other: col('other contractors', 'support'),
    dstart: col('expected delivery start', 'delivery start'),
    dend: col('expected delivery end', 'delivery end'),
    ko: col('ko date'),
    survey: col('survey date'),
    ir: col('insight review date', 'insight review'),
    notes: col('key notes', 'notes', 'dependencies'),
    follow: col('follow-up', 'follow up'),
  };
  const get = (row, i) => (i >= 0 ? cellStr(row[i]) : '');
  const rows = [];
  let lastClient = '';
  for (let r = 1; r < values.length; r++) {
    const v = values[r];
    let client = get(v, idx.client);
    const project = get(v, idx.project);
    if (client.toLowerCase() === 'onboardings') { lastClient = ''; continue; }
    if (client) lastClient = client; else if (project) client = lastClient; // forward-fill
    if (!client && !project) continue;
    const ptype = get(v, idx.ptype), service = get(v, idx.service);
    const serviceType = [ptype, service].filter(Boolean).join(' / ') || null;
    const status = isOld ? 'Completed' : (get(v, idx.status) || null);
    const base = {
      client_name: client,
      project_name: project || null,
      service_type: serviceType,
      region: get(v, idx.region) || null,
      status,
      priority: get(v, idx.priority) || null,
      cs_owner: get(v, idx.cs_owner) || null,
      ps_owner: get(v, idx.ps_owner) || null,
      other_contractors: get(v, idx.other) || null,
      delivery_start: get(v, idx.dstart) || null,
      delivery_end: get(v, idx.dend) || null,
      ko_date: get(v, idx.ko) || null,
      survey_date: get(v, idx.survey) || null,
      insight_review_date: get(v, idx.ir) || null,
      notes: get(v, idx.notes) || null,
      follow_up: get(v, idx.follow) || null,
    };
    const ms = nextMilestone(base);
    rows.push({
      ...base,
      sheet_key: `${base.client_name}|${base.project_name || ''}${isOld ? '|old' : ''}`.slice(0, 200),
      next_milestone_label: ms.label,
      next_milestone_date: ms.date,
    });
  }
  return rows;
}

async function readSheetValues(token, name) {
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}`
    + `/workbook/worksheets('${encodeURIComponent(name)}')/usedRange?$select=values`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const j = await r.json();
  return Array.isArray(j.values) ? j.values : null;
}

export default async function handler(req, res) {
  // Auth guard (v1.39.0): only logged-in CRM users may call this endpoint.
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await graphToken();
  if (!token) {
    return res.status(503).json({
      error: 'Graph credentials not configured. Set GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET with Files.Read.All consent.',
    });
  }

  // File metadata — when the sheet itself was last edited (shown in the header).
  let sourceModifiedAt = null;
  try {
    const meta = await fetch(`https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}?$select=lastModifiedDateTime`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (meta.ok) sourceModifiedAt = (await meta.json()).lastModifiedDateTime || null;
  } catch (_) { /* non-fatal */ }

  // Discover the worksheets and classify them. Robust to exact naming (en-dash,
  // casing) by keyword match; falls back to sensible defaults.
  let current = ['MASTER – Project Overview'];
  let old = ['Old Projects'];
  try {
    const wl = await fetch(`https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets?$select=name`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (wl.ok) {
      const names = ((await wl.json()).value || []).map(w => w.name).filter(Boolean);
      if (names.length) {
        const lc = (s) => s.toLowerCase();
        old = names.filter(n => lc(n).includes('old'));
        current = names.filter(n => !lc(n).includes('old') && !lc(n).includes('contract'));
      }
    }
  } catch (_) { /* use defaults */ }

  let rows = [];
  for (const name of current) {
    const v = await readSheetValues(token, name);
    if (v) rows = rows.concat(mapSheet(v, false));
  }
  for (const name of old) {
    const v = await readSheetValues(token, name);
    if (v) rows = rows.concat(mapSheet(v, true));
  }
  if (!rows.length) return res.status(200).json({ synced: 0, note: 'No rows found' });

  // Link to CRM accounts by normalised name.
  const { data: companies } = await supabase.from('companies').select('id, name');
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const matchCompany = (name) => {
    const n = norm(name);
    if (!n) return null;
    const exact = (companies || []).find(c => norm(c.name) === n);
    if (exact) return exact.id;
    const partial = (companies || []).find(c => norm(c.name).includes(n) || n.includes(norm(c.name)));
    return partial?.id || null;
  };

  const nowIso = new Date().toISOString();
  rows = rows.map(r => ({
    ...r,
    company_id: matchCompany(r.client_name),
    source_modified_at: sourceModifiedAt,
    synced_at: nowIso,
  }));

  // Full refresh: replace the table so removed/renamed rows don't linger.
  const keep = rows.map(r => r.sheet_key);
  const errors = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('glint_delivery')
      .upsert(rows.slice(i, i + 100), { onConflict: 'sheet_key' });
    if (error) errors.push(error.message);
  }
  // Drop rows whose sheet_key is no longer present in the sheet — but never
  // touch manually-added rows (e.g. the Graveyard cards), which aren't on the sheet.
  if (keep.length) {
    const { error } = await supabase.from('glint_delivery')
      .delete().eq('manual', false).not('sheet_key', 'in', `(${keep.map(k => `"${k.replace(/"/g, '')}"`).join(',')})`);
    if (error) errors.push('cleanup: ' + error.message);
  }
  return res.status(200).json({ synced: rows.length, current: current, old: old, errors });
}
