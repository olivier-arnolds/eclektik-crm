import { createClient } from '@supabase/supabase-js';

// Syncs Yarmilla's "Master Project Overview.xlsx" into public.glint_delivery,
// which powers the War-room tab's delivery layer.
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
// Handles "6/1/2026", "2026-05-19", "Mid June-26", "Apr-26", "Aug 2026".
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

export default async function handler(req, res) {
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

  // Read the first worksheet's used range.
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets('Sheet1')/usedRange?$select=values`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) {
    const txt = await r.text();
    return res.status(502).json({ error: 'Graph read failed', detail: txt.slice(0, 500) });
  }
  const { values } = await r.json();
  if (!Array.isArray(values) || values.length < 2) {
    return res.status(200).json({ synced: 0, note: 'No rows found' });
  }

  // Map columns by fuzzy header match (the sheet has a banded header; we match
  // on keywords). Header is assumed to be the first row of the used range.
  const header = values[0].map(h => String(h || '').toLowerCase());
  const col = (...keys) => header.findIndex(h => keys.some(k => h.includes(k)));
  const idx = {
    client: col('client name', 'client'),
    project: col('project name', 'yoobi', 'project'),
    service: col('service type', 'service'),
    region: col('region'),
    status: col('project status', 'status'),
    priority: col('priority'),
    cs_owner: col('cs owner'),
    ps_owner: col('ps owner'),
    other: col('other contractors', 'support'),
    ko: col('ko date'),
    survey: col('survey date'),
    ir: col('insight review date', 'insight review'),
    dend: col('expected delivery end', 'delivery end'),
    dstart: col('expected delivery start', 'delivery start'),
    notes: col('key notes', 'notes', 'dependencies'),
    follow: col('follow-up', 'follow up'),
  };

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
  const get = (row, i) => (i >= 0 ? (row[i] ?? null) : null);

  const rows = [];
  for (let r2 = 1; r2 < values.length; r2++) {
    const v = values[r2];
    const client = get(v, idx.client);
    if (!client || !String(client).trim()) continue;
    const base = {
      client_name: String(client).trim(),
      project_name: get(v, idx.project),
      service_type: get(v, idx.service),
      region: get(v, idx.region),
      status: get(v, idx.status),
      priority: get(v, idx.priority),
      cs_owner: get(v, idx.cs_owner),
      ps_owner: get(v, idx.ps_owner),
      other_contractors: get(v, idx.other),
      ko_date: get(v, idx.ko),
      survey_date: get(v, idx.survey),
      insight_review_date: get(v, idx.ir),
      delivery_end: get(v, idx.dend),
      delivery_start: get(v, idx.dstart),
      notes: get(v, idx.notes),
      follow_up: get(v, idx.follow),
    };
    const ms = nextMilestone(base);
    rows.push({
      ...base,
      sheet_key: `${base.client_name}|${base.project_name || ''}`.slice(0, 200),
      next_milestone_label: ms.label,
      next_milestone_date: ms.date,
      company_id: matchCompany(base.client_name),
      source_modified_at: sourceModifiedAt,
      synced_at: new Date().toISOString(),
    });
  }

  const errors = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('glint_delivery')
      .upsert(rows.slice(i, i + 100), { onConflict: 'sheet_key' });
    if (error) errors.push(error.message);
  }
  return res.status(200).json({ synced: rows.length, errors });
}
