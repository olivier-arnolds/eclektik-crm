// Reporting lane — BD revenue & pipeline dashboard.
//
// Reads LIVE from Supabase (opportunities + companies) at load time; every
// number is derived from a query, nothing is hardcoded. Canonical metric
// definitions live in the helpers at the top of this file so the whole lane
// stays consistent. Styling uses the app's CSS variables, so it follows the
// light/dark theme like every other lane. Charts are hand-rolled SVG (no chart
// dependency). Clicking a client name calls onPickAccount(account), which opens
// that account's 360 in the persistent right pane.
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import IndustryBreakdown from './industry-breakdown';

// ───────────────────────── canonical metric helpers ─────────────────────────
const ADECCO = 'Adecco Group';
const TARGET_Q = 250000;          // €250k / quarter
const US_COUNTRIES = ['US', 'United States'];

const num = (v) => (v === null || v === undefined || v === '') ? null : Number(v);

// Revenue of a deal = COALESCE(actual_revenue, est_revenue, 0).
// A literal 0 in actual_revenue is a real value (not "missing").
function revenueOf(o) {
  const a = num(o.actual_revenue);
  if (a !== null) return a;
  const e = num(o.est_revenue);
  return e !== null ? e : 0;
}
function lineOf(o) {
  let pl = o.product_line;
  if (Array.isArray(pl)) pl = pl.filter(Boolean).join(', ');
  pl = String(pl || '');
  if (pl.startsWith('Glint')) return 'Glint';
  if (pl === 'ROI') return 'ROI';
  return 'Other';
}
// Quarter of COALESCE(actual_close_date, close_date) → "YYYY-Qn".
function quarterOf(o) {
  const d = o.actual_close_date || o.close_date;
  if (!d) return null;
  const [y, m] = String(d).split('-');
  if (!y || !m) return null;
  return `${y}-Q${Math.floor((Number(m) - 1) / 3) + 1}`;
}
const regionOf = (country) => US_COUNTRIES.includes(country || '') ? 'US' : 'EMEA';
// "YYYY-Qn" ↔ absolute quarter index, for ordering and forward projection.
function qIndex(q) { const [y, n] = q.split('-Q'); return Number(y) * 4 + (Number(n) - 1); }
function qLabel(idx) { const y = Math.floor(idx / 4); const n = (idx % 4) + 1; return `${y}-Q${n}`; }
function qShort(q) { const [y, n] = q.split('-Q'); return `Q${n} ${y.slice(2)}`; }
const eur = (v) => '€' + Math.round((v || 0) / 1000) + 'k';
const ccShort = (c) => {
  const m = { 'United States': 'US', 'United Kingdom': 'UK', 'Netherlands': 'NL', 'Ireland': 'IE', 'Germany': 'DE', 'Switzerland': 'CH', 'Spain': 'ES', 'Italy': 'IT' };
  return c ? (m[c] || c) : '—';
};

// Marco's authoritative role assignment (overrides whatever account_links.role
// says). Keyed by normalised name; anyone not listed falls back to the link role.
// Exported so the War room (coverage tab, insights CS/PS initials) shares it.
const normNameKey = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
export const ROLE_OVERRIDE = {
  'angela schwingel': 'CSM', 'avneeta solanki': 'PSC', 'eric quintane': 'ROI',
  'ezra fermanis': 'CSM', 'heidi muhle': 'CSM', 'ivan de las cuevas ruiz': 'CSM',
  'kirsty thompson-clarke': 'PSC', 'manish goel': 'ROI', 'pablo borges patel': 'PSC',
  'paul mastrangelo': 'PSC', 'simon boehm': 'rest', 'stephanie noack': 'CSM',
  'yarmilla koenders': 'rest', 'kate feeney': 'PSC',
};
export const roleOverrideFor = (name) => ROLE_OVERRIDE[normNameKey(name)] || null;
export const normLinkRole = (r) => (r === 'CSM' || r === 'PSC' || r === 'ROI') ? r : 'rest';

// ───────────────────────── data hook ─────────────────────────
export function useReportingData() {
  const [opps, setOpps] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [links, setLinks] = useState(null);
  const [teamContacts, setTeamContacts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [o, c, l, ct] = await Promise.all([
        supabase.from('opportunities')
          .select('id,company_id,company_name,status,stage,product_line,est_revenue,actual_revenue,probability,close_date,actual_close_date')
          .limit(2000),
        supabase.from('companies').select('id,name,type,country,industry').limit(2000),
        supabase.from('account_links').select('account_id,contact_id,role').eq('link_type', 'eclectik_team').limit(2000),
        supabase.from('contacts').select('id,first_name,last_name,full_name,title').limit(2000),
      ]);
      if (o.error) throw o.error;
      if (c.error) throw c.error;
      setOpps(o.data || []);
      setCompanies(c.data || []);
      setLinks(l.data || []);
      setTeamContacts(ct.data || []);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  return { opps, companies, links, teamContacts, error, loading, refreshedAt, reload: load };
}

// ───────────────────────── metric computation ─────────────────────────
export function computeMetrics(opps, companies, links, teamContacts, cfg) {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const isCustomer = (c) => c && c.type === 'Customer' && c.name !== ADECCO;

  // KPI aggregates
  const won = opps.filter((o) => o.status === 'Won');
  const lost = opps.filter((o) => o.status === 'Lost');
  const openP = opps.filter((o) => o.stage === 'opportunity');
  const activeNoStatus = opps.filter((o) => ['active', 'onboarding'].includes(o.stage) && !o.status);

  const wonRevBase = won.reduce((s, o) => s + revenueOf(o), 0);
  const wonRev = cfg.countActiveAsWon ? wonRevBase + activeNoStatus.reduce((s, o) => s + revenueOf(o), 0) : wonRevBase;
  const wonN = won.length + (cfg.countActiveAsWon ? activeNoStatus.length : 0);
  const lostN = lost.length;
  const winRate = (wonN + lostN) ? wonN / (wonN + lostN) : 0;
  const openGross = openP.reduce((s, o) => s + (num(o.est_revenue) || 0), 0);
  const openWeighted = openP.reduce((s, o) => s + (num(o.est_revenue) || 0) * (num(o.probability) || 0) / 100, 0);

  const customers = companies.filter(isCustomer);
  const activeCustomerIds = new Set(
    opps.filter((o) => ['active', 'onboarding', 'opportunity'].includes(o.stage) && isCustomer(byId.get(o.company_id)))
      .map((o) => o.company_id)
  );
  const activeClients = activeCustomerIds.size;
  const dormantClients = customers.length - activeClients;

  // Ordered quarter range (earliest..latest won quarter)
  const wonQ = won.map(quarterOf).filter(Boolean);
  const idxs = wonQ.map(qIndex);
  const minIdx = Math.min(...idxs), maxIdx = Math.max(...idxs);
  const quarters = [];
  for (let i = minIdx; i <= maxIdx; i++) quarters.push(qLabel(i));

  // Won by quarter, split by line
  const zero = () => Object.fromEntries(quarters.map((q) => [q, 0]));
  const glint = zero(), roi = zero(), other = zero(), totals = zero(), wonCount = zero(), lostCount = zero();
  for (const o of won) {
    const q = quarterOf(o); if (!q || !(q in totals)) continue;
    const r = revenueOf(o); totals[q] += r; wonCount[q]++;
    const l = lineOf(o); (l === 'Glint' ? glint : l === 'ROI' ? roi : other)[q] += r;
  }
  for (const o of lost) { const q = quarterOf(o); if (q && q in lostCount) lostCount[q]++; }

  // Linear trend over quarter totals (least squares)
  const ys = quarters.map((q) => totals[q]);
  const n = ys.length;
  const xm = (n - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, sst = 0;
  ys.forEach((y, x) => { sxy += (x - xm) * (y - ym); sxx += (x - xm) ** 2; sst += (y - ym) ** 2; });
  const slope = sxx ? sxy / sxx : 0;
  const intercept = ym - slope * xm;
  let ssr = 0; ys.forEach((y, x) => { ssr += (y - (intercept + slope * x)) ** 2; });
  const r2 = sst ? 1 - ssr / sst : 0;
  // Forward extension to the target-crossing quarter (capped at +6)
  let crossingIdx = null;
  if (slope > 0) {
    const cx = (TARGET_Q - intercept) / slope;
    if (cx > n - 1) crossingIdx = minIdx + Math.round(cx);
  }
  const endIdx = crossingIdx ? Math.min(crossingIdx, maxIdx + 6) : maxIdx;
  const extQuarters = [];
  for (let i = minIdx; i <= endIdx; i++) extQuarters.push(qLabel(i));
  const trendVals = extQuarters.map((_, x) => intercept + slope * x);
  const crossingLabel = crossingIdx ? qLabel(crossingIdx) : null;

  // Open proposal pipeline (stage 'opportunity') by line, pooled into the next
  // calendar quarter. Probability-weighted (est × prob). Hollow/outlined bars.
  const nowIdx = (() => { const d = new Date(); return d.getFullYear() * 4 + Math.floor(d.getMonth() / 3); })();
  const proposalQuarter = qLabel(nowIdx + 1);
  const propByLine = (L) => openP.filter((o) => lineOf(o) === L)
    .reduce((s, o) => s + (num(o.est_revenue) || 0) * (num(o.probability) || 0) / 100, 0);
  const proposal = { quarter: proposalQuarter, glint: propByLine('Glint'), roi: propByLine('ROI') };

  // New vs recurring by line. Rank a company's won deals by close date,id.
  // relationship-level (default): first win across ALL lines = new.
  // line-level (cfg.recurringLineLevel): first win within the same line = new.
  const keyer = (o) => cfg.recurringLineLevel ? `${o.company_id}|${lineOf(o)}` : o.company_id;
  const groups = new Map();
  for (const o of won) {
    const k = keyer(o); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o);
  }
  const seqOf = new Map();
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const da = a.actual_close_date || a.close_date || '9999';
      const db = b.actual_close_date || b.close_date || '9999';
      return da < db ? -1 : da > db ? 1 : (a.id < b.id ? -1 : 1);
    });
    arr.forEach((o, i) => seqOf.set(o.id, i === 0 ? 'new' : 'rec'));
  }
  const nr = { glintNew: zero(), glintRec: zero(), roiNew: zero(), roiRec: zero() };
  let recGlint = 0, recRoi = 0, recTotal = 0, recDeals = 0;
  for (const o of won) {
    const q = quarterOf(o); if (!q || !(q in totals)) continue;
    const l = lineOf(o); if (l === 'Other') continue;
    const isNew = seqOf.get(o.id) === 'new'; const r = revenueOf(o);
    nr[`${l === 'Glint' ? 'glint' : 'roi'}${isNew ? 'New' : 'Rec'}`][q] += r;
    if (!isNew) { recTotal += r; recDeals++; if (l === 'Glint') recGlint += r; else recRoi += r; }
  }

  // Win / loss by line
  const lines = ['Glint', 'ROI', 'Other'];
  const wl = lines.map((L) => {
    const w = won.filter((o) => lineOf(o) === L);
    const lo = lost.filter((o) => lineOf(o) === L);
    return { line: L, wonN: w.length, lostN: lo.length, wonVal: w.reduce((s, o) => s + revenueOf(o), 0), lostEst: lo.reduce((s, o) => s + (num(o.est_revenue) || 0), 0) };
  });

  // Clients by region: customers (excl Adecco) ∪ non-customers with won revenue
  const wonByCompany = new Map();
  for (const o of won) {
    const id = o.company_id; if (!id) continue;
    if (!wonByCompany.has(id)) wonByCompany.set(id, zero());
    const q = quarterOf(o); if (q && q in totals) wonByCompany.get(id)[q] += revenueOf(o);
  }
  const liveCount = new Map(), openCount = new Map();
  for (const o of opps) {
    if (['active', 'onboarding'].includes(o.stage)) liveCount.set(o.company_id, (liveCount.get(o.company_id) || 0) + 1);
    if (o.stage === 'opportunity') openCount.set(o.company_id, (openCount.get(o.company_id) || 0) + 1);
  }
  const acctIds = new Set(customers.map((c) => c.id));
  for (const id of wonByCompany.keys()) acctIds.add(id);
  const rows = [];
  for (const id of acctIds) {
    const c = byId.get(id); if (!c || c.name === ADECCO) continue;
    const q = wonByCompany.get(id) || zero();
    const total = quarters.reduce((s, k) => s + q[k], 0);
    const cust = isCustomer(c);
    const live = (liveCount.get(id) || 0) > 0, open = (openCount.get(id) || 0) > 0;
    let status;
    if (!cust) status = c.type;                       // Partner / Prospect
    else if (live) status = 'Live';
    else if (open) status = 'Open';
    else status = 'Dormant';
    rows.push({
      id, name: c.name, region: regionOf(c.country), cc: ccShort(c.country),
      noCountry: !c.country, q, total, status, green: cust && live, isCustomer: cust,
    });
  }
  rows.sort((a, b) => (a.region < b.region ? -1 : a.region > b.region ? 1 : b.total - a.total));
  const regionRows = (R) => rows.filter((r) => r.region === R);
  const subtotal = (rs) => { const s = zero(); let t = 0; rs.forEach((r) => { quarters.forEach((k) => s[k] += r.q[k]); t += r.total; }); return { q: s, total: t }; };
  const grand = subtotal(rows);
  const colTotals = zero(); quarters.forEach((k) => colTotals[k] = rows.reduce((s, r) => s + r.q[k], 0));

  // Dormant clients (customers excl Adecco with no live/open work)
  const dormant = rows.filter((r) => r.isCustomer && r.status === 'Dormant')
    .sort((a, b) => b.total - a.total);

  // Data-quality warnings
  const warnings = {
    wonNoRevenue: won.filter((o) => revenueOf(o) === 0)
      .map((o) => o.company_name || byId.get(o.company_id)?.name || '—'),
    activeNoStatus: activeNoStatus.map((o) => o.company_name || byId.get(o.company_id)?.name || '—'),
    wonNonCustomer: won.filter((o) => { const c = byId.get(o.company_id); return c && c.type !== 'Customer'; })
      .map((o) => `${byId.get(o.company_id)?.name} (${byId.get(o.company_id)?.type})`),
    missingCountry: customers.filter((c) => !c.country).map((c) => c.name),
  };

  // Team coverage matrix: Eclectik team members (columns) × clients (rows).
  // Person role from account_links.role; columns sorted CSM → PSC → ROI → rest.
  const ROLE_ORDER = { CSM: 0, PSC: 1, ROI: 2, rest: 3 };
  const normRole = normLinkRole; // shared with War room (see exports above)
  const ctById = new Map((teamContacts || []).map((c) => [c.id, c]));
  const personName = (c) => {
    const n = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    return n || c.full_name || '—';
  };
  const clientIds = new Set(rows.map((r) => r.id));
  const people = new Map(); // by display name (merge duplicate contact rows)
  for (const l of (links || [])) {
    if (!clientIds.has(l.account_id)) continue;       // only clients shown in the table
    const c = ctById.get(l.contact_id); if (!c) continue;
    const name = personName(c);
    if (!people.has(name)) people.set(name, { name, roleCounts: {}, clients: new Set() });
    const p = people.get(name);
    p.clients.add(l.account_id);
    const rr = normRole(l.role); p.roleCounts[rr] = (p.roleCounts[rr] || 0) + 1;
  }
  const team = [...people.values()].map((p) => {
    let role = 'rest', best = 0;
    for (const k of ['CSM', 'PSC', 'ROI']) if ((p.roleCounts[k] || 0) > best) { role = k; best = p.roleCounts[k]; }
    role = roleOverrideFor(p.name) || role;
    return { name: p.name, role, clients: p.clients, n: p.clients.size, initials: p.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() };
  }).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));

  return {
    kpi: { wonRev, wonN, lostN, winRate, openGross, openN: openP.length, openWeighted, customers: customers.length, activeClients, dormantClients },
    quarters, extQuarters, glint, roi, other, totals, wonCount, lostCount,
    trend: { slope, intercept, r2, trendVals, crossingLabel },
    nr, recGlint, recRoi, recTotal, recDeals, proposal,
    wl, rows, regionRows, subtotal, grand, colTotals, dormant, warnings, team,
  };
}

const ROLE_COLOR = { CSM: 'var(--good)', PSC: 'var(--accent)', ROI: 'var(--warn)', rest: 'var(--text-3)' };

// Eclectik team ↔ client coverage matrix. Clients down the side, team across
// the top (grouped by role); a colored dot marks each covered crossing.
// Exported: rendered in the War room's Coverage tab.
export function TeamCoverageMatrix({ m, onPick }) {
  const { team, regionRows } = m;
  if (!team.length) return <div style={{ ...muted, fontSize: 12 }}>No Eclectik-team links found.</div>;
  const stickyName = { position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-1)' };
  const HeadCell = (p) => (
    <th key={p.name} title={`${p.name} · ${p.role}`} style={{ padding: '2px 0 4px', textAlign: 'center', fontWeight: 400, verticalAlign: 'bottom' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{p.initials}</div>
      <div style={{ height: 2, width: 16, margin: '3px auto 0', borderRadius: 2, background: ROLE_COLOR[p.role] }} />
    </th>
  );
  const Row = (r) => (
    <tr key={r.id} onClick={() => onPick(r.id)} style={{ borderTop: '0.5px solid var(--sep)', cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--fill-1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
      <td style={{ ...stickyName, padding: '4px 8px 4px 6px', whiteSpace: 'nowrap', color: r.green ? 'var(--good)' : 'var(--text-1)', textDecoration: 'underline', textDecorationColor: 'var(--sep-strong)', textUnderlineOffset: 2 }}>{r.name}</td>
      {team.map((p) => (
        <td key={p.name} style={{ textAlign: 'center', padding: '4px 0' }}>
          {p.clients.has(r.id) ? <span style={{ color: ROLE_COLOR[p.role], fontSize: 13 }}>●</span> : <span style={{ color: 'var(--text-4)' }}>·</span>}
        </td>
      ))}
    </tr>
  );
  const Section = (label) => (
    <tr><td colSpan={team.length + 1} style={{ ...stickyName, padding: '7px 6px', background: 'var(--good-tint)', fontSize: 10.5, ...muted, letterSpacing: '0.04em' }}>{label}</td></tr>
  );
  const us = regionRows('US'), emea = regionRows('EMEA');
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, fontSize: 11, ...muted }}>
        {[['CSM', 'CSM'], ['PSC', 'PSC'], ['ROI', 'ROI'], ['rest', 'Leadership / other']].map(([k, lbl]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: ROLE_COLOR[k], fontSize: 13 }}>●</span>{lbl}</span>
        ))}
        <span>· hover a column for the full name · click a client to open its 360</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...stickyName, padding: '2px 6px', textAlign: 'left', fontWeight: 400, ...muted }}>CLIENT</th>
              {team.map(HeadCell)}
            </tr>
          </thead>
          <tbody>
            {Section(`UNITED STATES · ${us.length}`)}
            {us.map(Row)}
            {Section(`EMEA · ${emea.length}`)}
            {emea.map(Row)}
            <tr style={{ borderTop: '0.5px solid var(--sep-strong)' }}>
              <td style={{ ...stickyName, padding: '6px', fontWeight: 500 }}>Clients covered</td>
              {team.map((p) => <td key={p.name} style={{ textAlign: 'center', padding: '6px 0', fontWeight: 500, ...mono }}>{p.n}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────── small UI atoms ─────────────────────────
const card = { background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-card)', padding: '14px 16px' };
const mono = { fontFamily: 'var(--font-mono)' };
const muted = { color: 'var(--text-3)' };

function Kpi({ label, value, sub, danger }) {
  return (
    <div style={{ background: danger ? 'var(--danger-tint)' : 'var(--good-tint)', borderRadius: 'var(--radius-card)', padding: '12px 14px' }}>
      <div style={{ fontSize: 12, ...muted }}>{label}</div>
      <div style={{ ...mono, fontSize: 22, fontWeight: 500, marginTop: 2, color: danger ? 'var(--danger)' : 'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 1, ...muted }}>{sub}</div>}
    </div>
  );
}
function Panel({ title, hint, children, right }) {
  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>{hint && <div style={{ fontSize: 12, ...muted, marginTop: 2 }}>{hint}</div>}</div>
        {right}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}
const PILL = {
  Live: ['var(--good-tint)', 'var(--good)'],
  Open: ['var(--warn-tint)', 'var(--warn)'],
  Dormant: ['var(--danger-tint)', 'var(--danger)'],
  Partner: ['var(--fill-2)', 'var(--text-2)'],
  Prospect: ['var(--fill-2)', 'var(--text-2)'],
};
function Pill({ status }) {
  const [bg, c] = PILL[status] || PILL.Partner;
  return <span style={{ background: bg, color: c, fontSize: 10.5, padding: '1px 8px', borderRadius: 7, whiteSpace: 'nowrap' }}>{status}</span>;
}

// ───────────────────────── SVG charts ─────────────────────────
const CHART = { W: 760, H: 300, padL: 46, padR: 12, padT: 22, padB: 26 };
function yTicks(max) { const t = []; for (let v = 0; v <= max; v += 50000) t.push(v); return t; }

function WonByQuarterChart({ m }) {
  const { quarters, extQuarters, glint, roi, totals, trend, proposal } = m;
  const { W, padL, padR, padT } = CHART;
  // Extra bottom band (+16) for a YoY row below the quarter labels; plot area
  // stays identical (H and padB both grow by the same amount).
  const padB = CHART.padB + 16;
  const H = CHART.H + 16;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  // Forward axis = trend extension, extended (contiguously) to the proposal quarter.
  const startI = qIndex(extQuarters[0]);
  const endI = Math.max(qIndex(extQuarters[extQuarters.length - 1]), qIndex(proposal.quarter));
  const axis = []; for (let i = startI; i <= endI; i++) axis.push(qLabel(i));
  const pi = axis.indexOf(proposal.quarter);
  const maxV = Math.max(300000, ...quarters.map((q) => totals[q]), proposal.glint, proposal.roi);
  const x = axis.map((_, i) => padL + (plotW / axis.length) * (i + 0.5));
  const y = (v) => padT + plotH - (v / maxV) * plotH;
  const bw = (plotW / axis.length) * 0.26;
  const baseY = padT + plotH;
  const labelY = baseY + 18;   // quarter labels just below the plot
  const yoyY = baseY + 31;     // YoY row below the quarter labels
  const totalPts = quarters.map((q, i) => `${x[i]},${y(totals[q])}`).join(' ');
  const trendPts = extQuarters.map((_, i) => `${x[i]},${y(trend.trendVals[i])}`).join(' ');
  const crossI = trend.crossingLabel ? axis.indexOf(trend.crossingLabel) : -1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Won revenue by quarter with total line, target and trend" style={{ display: 'block' }}>
      {yTicks(maxV).map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--sep)" strokeWidth="1" />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-3)">{eur(v)}</text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={y(TARGET_Q)} y2={y(TARGET_Q)} stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="6 4" />
      {quarters.map((q, i) => (
        <g key={q}>
          <rect x={x[i] - bw - 1} y={y(glint[q])} width={bw} height={padT + plotH - y(glint[q])} rx="2" fill="var(--good)" />
          {roi[q] > 0 && <rect x={x[i] + 1} y={y(roi[q])} width={bw} height={padT + plotH - y(roi[q])} rx="2" fill="var(--accent)" />}
          {glint[q] > 0 && <text x={x[i] - bw / 2 - 1} y={y(glint[q]) - 4} textAnchor="middle" fontSize="9.5" fill="var(--good)">{eur(glint[q])}</text>}
          {roi[q] > 0 && <text x={x[i] + bw / 2 + 1} y={y(roi[q]) - 4} textAnchor="middle" fontSize="9.5" fill="var(--accent)">{eur(roi[q])}</text>}
        </g>
      ))}
      {/* Next-quarter open proposal pipeline by line — hollow/outlined bars (not yet won) */}
      {pi >= 0 && proposal.glint > 0 && (
        <g>
          <rect x={x[pi] - bw - 1} y={y(proposal.glint)} width={bw} height={baseY - y(proposal.glint)} rx="2" fill="none" stroke="var(--good)" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x={x[pi] - bw / 2 - 1} y={y(proposal.glint) - 4} textAnchor="middle" fontSize="9.5" fill="var(--good)" opacity="0.8">{eur(proposal.glint)}</text>
        </g>
      )}
      {pi >= 0 && proposal.roi > 0 && (
        <g>
          <rect x={x[pi] + 1} y={y(proposal.roi)} width={bw} height={baseY - y(proposal.roi)} rx="2" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x={x[pi] + bw / 2 + 1} y={y(proposal.roi) - 4} textAnchor="middle" fontSize="9.5" fill="var(--accent)" opacity="0.8">{eur(proposal.roi)}</text>
        </g>
      )}
      <polyline points={trendPts} fill="none" stroke="var(--rep-trend)" strokeWidth="1.5" strokeDasharray="2 3" />
      <polyline points={totalPts} fill="none" stroke="var(--text-1)" strokeWidth="2" />
      {quarters.map((q, i) => <circle key={q} cx={x[i]} cy={y(totals[q])} r="3" fill="var(--text-1)" />)}
      {/* YoY delta vs the same quarter last year, below the quarter labels */}
      {quarters.map((q, i) => {
        const [yy, nn] = q.split('-Q');
        const prev = totals[`${+yy - 1}-Q${nn}`];
        if (prev == null || prev <= 0) return null;
        const up = totals[q] >= prev;
        const pct = Math.abs(Math.round(((totals[q] - prev) / prev) * 100));
        return (
          <text key={'yoy' + q} x={x[i]} y={yoyY} textAnchor="middle" fontSize="9" fontWeight="500"
            fill={up ? 'var(--good)' : '#E24B4A'}>
            {up ? '▲' : '▼'}{pct}%
          </text>
        );
      })}
      {crossI >= 0 && (
        <g>
          <circle cx={x[crossI]} cy={y(TARGET_Q)} r="5" fill="var(--rep-trend)" />
          <text x={x[crossI]} y={y(TARGET_Q) - 10} textAnchor="middle" fontSize="10.5" fill="var(--rep-trend)">≈ {qShort(trend.crossingLabel)}</text>
        </g>
      )}
      {axis.map((q, i) => <text key={q} x={x[i]} y={labelY} textAnchor="middle" fontSize="9.5" fill={i === pi ? 'var(--text-2)' : 'var(--text-3)'}>{qShort(q)}</text>)}
    </svg>
  );
}

function NewRecurringChart({ m }) {
  const { quarters, nr, proposal } = m;
  const { W, H, padL, padR, padT, padB } = CHART;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const stackTot = (q) => nr.glintNew[q] + nr.glintRec[q] + nr.roiNew[q] + nr.roiRec[q];
  // Extend (contiguously) to the proposal quarter for the open-pipeline forecast.
  const startI = qIndex(quarters[0]);
  const endI = Math.max(qIndex(quarters[quarters.length - 1]), qIndex(proposal.quarter));
  const axis = []; for (let i = startI; i <= endI; i++) axis.push(qLabel(i));
  const pi = axis.indexOf(proposal.quarter);
  const maxV = Math.max(300000, ...quarters.map(stackTot), proposal.glint, proposal.roi);
  const x = axis.map((_, i) => padL + (plotW / axis.length) * (i + 0.5));
  const y = (v) => padT + plotH - (v / maxV) * plotH;
  const bw = (plotW / axis.length) * 0.5;
  const obw = (plotW / axis.length) * 0.26; // narrower outlined proposal bars (side-by-side)
  const baseY = padT + plotH;
  const segs = [['glintNew', 'var(--good)', 1], ['glintRec', 'var(--good)', 0.4], ['roiNew', 'var(--accent)', 1], ['roiRec', 'var(--accent)', 0.4]];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="New versus recurring won revenue by line per quarter" style={{ display: 'block' }}>
      {yTicks(maxV).map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--sep)" strokeWidth="1" />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-3)">{eur(v)}</text>
        </g>
      ))}
      {quarters.map((q, i) => {
        let acc = 0;
        return (
          <g key={q}>
            {segs.map(([k, fill, op]) => {
              const v = nr[k][q]; if (!v) return null;
              const yTop = y(acc + v), h = y(acc) - y(acc + v); acc += v;
              return <rect key={k} x={x[i] - bw / 2} y={yTop} width={bw} height={h} fill={fill} fillOpacity={op} />;
            })}
            {stackTot(q) > 0 && <text x={x[i]} y={y(stackTot(q)) - 5} textAnchor="middle" fontSize="9.5" fill="var(--text-2)">{eur(stackTot(q))}</text>}
            <text x={x[i]} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-3)">{qShort(q)}</text>
          </g>
        );
      })}
      {/* Next-quarter open proposal pipeline by line — hollow/outlined bars (not yet won) */}
      {pi >= 0 && proposal.glint > 0 && (
        <g>
          <rect x={x[pi] - obw - 1} y={y(proposal.glint)} width={obw} height={baseY - y(proposal.glint)} rx="2" fill="none" stroke="var(--good)" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x={x[pi] - obw / 2 - 1} y={y(proposal.glint) - 4} textAnchor="middle" fontSize="9.5" fill="var(--good)" opacity="0.8">{eur(proposal.glint)}</text>
        </g>
      )}
      {pi >= 0 && proposal.roi > 0 && (
        <g>
          <rect x={x[pi] + 1} y={y(proposal.roi)} width={obw} height={baseY - y(proposal.roi)} rx="2" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x={x[pi] + obw / 2 + 1} y={y(proposal.roi) - 4} textAnchor="middle" fontSize="9.5" fill="var(--accent)" opacity="0.8">{eur(proposal.roi)}</text>
        </g>
      )}
      {pi >= 0 && (proposal.glint > 0 || proposal.roi > 0) &&
        <text x={x[pi]} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-2)">{qShort(proposal.quarter)}</text>}
    </svg>
  );
}

const Legend = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '2px 0 8px', fontSize: 12, ...muted }}>
    {items.map(([label, color, dash, op]) => (
      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {dash
          ? <span style={{ width: 16, height: 0, borderTop: `2px ${dash} ${color}` }} />
          : <span style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: op || 1 }} />}
        {label}
      </span>
    ))}
  </div>
);

// ───────────────────────── clients-by-region table ─────────────────────────
function ClientsTable({ m, onPick }) {
  const { quarters, regionRows, subtotal, grand, warnings } = m;
  const cellTxt = (v) => v > 0 ? eur(v) : <span style={{ color: 'var(--text-4)' }}>·</span>;
  const Row = (r) => (
    <tr key={r.id} onClick={() => onPick(r.id)} style={{ borderTop: '0.5px solid var(--sep)', cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--fill-1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
      <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', color: r.green ? 'var(--good)' : 'var(--text-1)', textDecoration: 'underline', textDecorationColor: 'var(--sep-strong)', textUnderlineOffset: 2 }}>{r.name}</td>
      <td style={{ padding: '5px 6px', ...muted }}>{r.cc}</td>
      {quarters.map((q) => <td key={q} style={{ padding: '5px 6px', textAlign: 'right', ...mono }}>{cellTxt(r.q[q])}</td>)}
      <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 500, ...mono }}>{cellTxt(r.total)}</td>
      <td style={{ padding: '5px 6px', textAlign: 'center' }}><Pill status={r.status} /></td>
    </tr>
  );
  const SubRow = (label, st, count) => (
    <tr style={{ background: 'var(--fill-1)' }}>
      <td style={{ padding: 6, color: 'var(--text-2)' }} colSpan={2}>{label}{count != null ? ` (${count} clients)` : ''}</td>
      {quarters.map((q) => <td key={q} style={{ padding: 6, textAlign: 'right', fontWeight: 500, ...mono }}>{st.q[q] > 0 ? eur(st.q[q]) : <span style={{ color: 'var(--text-4)' }}>·</span>}</td>)}
      <td style={{ padding: 6, textAlign: 'right', fontWeight: 500, ...mono }}>{eur(st.total)}</td><td />
    </tr>
  );
  const yoyRow = (qmap, key) => (
    <tr key={key} style={{ background: 'var(--fill-1)' }}>
      <td style={{ padding: '3px 6px', ...muted, fontSize: 9.5 }} colSpan={2}>↳ YoY vs last year</td>
      {quarters.map((q) => {
        const [yy, nn] = q.split('-Q');
        const prev = qmap[`${+yy - 1}-Q${nn}`];
        if (prev == null || prev <= 0) return <td key={q} style={{ padding: '3px 6px', textAlign: 'right', ...muted, fontSize: 9.5 }}>·</td>;
        const cur = qmap[q] || 0; const up = cur >= prev;
        const pct = Math.abs(Math.round(((cur - prev) / prev) * 100));
        return <td key={q} style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 500, fontSize: 9.5, color: up ? 'var(--good)' : '#E24B4A' }}>{up ? '▲' : '▼'}{pct}%</td>;
      })}
      <td /><td />
    </tr>
  );
  const SectionHead = (label) => (
    <tr><td colSpan={quarters.length + 4} style={{ padding: '7px 6px', background: 'var(--good-tint)', fontSize: 10.5, ...muted, letterSpacing: '0.04em' }}>{label}</td></tr>
  );
  const us = regionRows('US'), emea = regionRows('EMEA');
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr style={{ textAlign: 'left', fontWeight: 400, ...muted }}>
            <th style={{ padding: '5px 6px', fontWeight: 400 }}>CLIENT</th>
            <th style={{ padding: '5px 6px', fontWeight: 400 }}>CTY</th>
            {quarters.map((q) => <th key={q} style={{ padding: '5px 6px', fontWeight: 400, textAlign: 'right' }}>{qShort(q)}</th>)}
            <th style={{ padding: '5px 6px', fontWeight: 400, textAlign: 'right' }}>TOTAL</th>
            <th style={{ padding: '5px 6px', fontWeight: 400, textAlign: 'center' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {SectionHead(`UNITED STATES · ${us.length} CLIENTS`)}
          {us.map(Row)}
          {SubRow('US subtotal', subtotal(us))}
          {yoyRow(subtotal(us).q, 'yoy-us')}
          {SectionHead(`EMEA · ${emea.length} CLIENTS`)}
          {emea.map(Row)}
          {SubRow('EMEA subtotal', subtotal(emea))}
          {yoyRow(subtotal(emea).q, 'yoy-emea')}
          <tr style={{ borderTop: '0.5px solid var(--sep-strong)' }}>
            <td style={{ padding: '7px 6px', fontWeight: 500 }} colSpan={2}>All clients</td>
            {quarters.map((q) => <td key={q} style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 500, ...mono }}>{m.colTotals[q] > 0 ? eur(m.colTotals[q]) : '·'}</td>)}
            <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 500, ...mono }}>{eur(grand.total)}</td><td />
          </tr>
          {yoyRow(m.colTotals, 'yoy-all')}
        </tbody>
      </table>
      <div style={{ fontSize: 11, ...muted, marginTop: 10, lineHeight: 1.6 }}>
        Region split: US {eur(subtotal(us).total)} · EMEA {eur(subtotal(emea).total)} = {eur(grand.total)}, reconciling to total won.
        {warnings.missingCountry.length > 0 && ` ${warnings.missingCountry.join(', ')} ${warnings.missingCountry.length === 1 ? 'has' : 'have'} no country in the CRM — shown under EMEA.`}
      </div>
    </div>
  );
}

// ───────────────────────── main lane ─────────────────────────
export default function ReportingLane({ onPickAccount, accounts = [] }) {
  const { opps, companies, links, teamContacts, error, loading, refreshedAt, reload } = useReportingData();
  const [countActiveAsWon, setCountActiveAsWon] = useState(false);
  const [recurringLineLevel, setRecurringLineLevel] = useState(false);
  const rootRef = useRef(null);

  const m = useMemo(
    () => (opps && companies) ? computeMetrics(opps, companies, links || [], teamContacts || [], { countActiveAsWon, recurringLineLevel }) : null,
    [opps, companies, links, teamContacts, countActiveAsWon, recurringLineLevel]
  );

  const pick = (id) => { if (onPickAccount) onPickAccount(accounts.find((a) => a.id === id) || { id }); };
  const toggleFull = () => {
    const el = rootRef.current; if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();
  };

  const ctrlBtn = { background: 'transparent', border: '0.5px solid var(--sep-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', padding: '5px 10px', fontSize: 12, cursor: 'pointer' };

  return (
    <div ref={rootRef} className="rep-root" style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--bg-0)' }}>
      <style>{`.rep-root{--rep-trend:#8a6fb5}body.theme-dark .rep-root{--rep-trend:#b89be0}`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Revenue &amp; pipeline</div>
            <div style={{ fontSize: 12, ...muted }}>
              {refreshedAt ? `Last refreshed ${refreshedAt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} · live from CRM` : 'Loading…'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11.5, ...muted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="checkbox" checked={countActiveAsWon} onChange={(e) => setCountActiveAsWon(e.target.checked)} /> count unstatused-active as won
            </label>
            <label style={{ fontSize: 11.5, ...muted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="checkbox" checked={recurringLineLevel} onChange={(e) => setRecurringLineLevel(e.target.checked)} /> recurring per line
            </label>
            <button style={ctrlBtn} onClick={reload}>Refresh</button>
            <button style={ctrlBtn} onClick={toggleFull}>⛶</button>
          </div>
        </div>

        {loading && <div style={{ ...card, ...muted }}>Loading live figures…</div>}
        {error && <div style={{ ...card, color: 'var(--danger)' }}>Could not load reporting data: {error}</div>}

        {m && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
              <Kpi label="Won revenue" value={eur(m.kpi.wonRev)} sub={`${m.kpi.wonN} deals`} />
              <Kpi label="Win rate" value={`${(m.kpi.winRate * 100).toFixed(1)}%`} sub={`${m.kpi.wonN} won / ${m.kpi.lostN} lost`} />
              <Kpi label="Open pipeline" value={eur(m.kpi.openGross)} sub={`${m.kpi.openN} deals · gross`} />
              <Kpi label="Pipeline weighted" value={eur(m.kpi.openWeighted)} sub="stage-driven prob." />
              <Kpi label="Active clients" value={`${m.kpi.activeClients} / ${m.kpi.customers}`} sub="excl. Adecco" />
              <Kpi label="Dormant clients" value={m.kpi.dormantClients} sub="no live / open work" danger />
            </div>

            {(m.warnings.activeNoStatus.length > 0 || m.warnings.wonNonCustomer.length > 0 || m.warnings.wonNoRevenue.length > 0 || m.warnings.missingCountry.length > 0) && (
              <div style={{ ...card, marginBottom: 14, borderColor: 'var(--danger)', background: 'var(--danger-tint)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--danger)', marginBottom: 4 }}>Data warnings</div>
                <div style={{ fontSize: 11.5, ...muted, lineHeight: 1.7 }}>
                  {m.warnings.activeNoStatus.length > 0 && <div>{m.warnings.activeNoStatus.length} active/onboarding deal(s) with no status: {m.warnings.activeNoStatus.join(', ')}.</div>}
                  {m.warnings.wonNonCustomer.length > 0 && <div>{m.warnings.wonNonCustomer.length} won deal(s) on non-Customer accounts: {m.warnings.wonNonCustomer.join(', ')}.</div>}
                  {m.warnings.wonNoRevenue.length > 0 && <div>{m.warnings.wonNoRevenue.length} won deal(s) with no revenue at all (no actual or estimate): {m.warnings.wonNoRevenue.join(', ')}.</div>}
                  {m.warnings.missingCountry.length > 0 && <div>{m.warnings.missingCountry.length} customer(s) with no country (defaulted to EMEA): {m.warnings.missingCountry.join(', ')}.</div>}
                </div>
              </div>
            )}

            <Panel title="Won revenue by quarter" hint={`Filled bars = won actuals by close date · hollow bars (${qShort(m.proposal.quarter)}) = open proposal pipeline by line, probability-weighted, not yet won · total + linear trend vs €250k/q target · R²=${m.trend.r2.toFixed(2)} (illustrative, not a forecast) · ▲/▼ % above each point = YoY vs the same quarter last year`}>
              <Legend items={[['Glint (won)', 'var(--good)'], ['ROI (won)', 'var(--accent)'], ['Proposals (open)', 'var(--text-3)', 'dashed'], ['Total (actual)', 'var(--text-1)', 'solid'], ['Target €250k/q', 'var(--text-3)', 'dashed'], ['Trend', 'var(--rep-trend)', 'dotted']]} />
              <WonByQuarterChart m={m} />
            </Panel>

            <Panel title="New vs recurring business by quarter" hint={`Full tone = new client, light tone = recurring · hollow bars (${qShort(m.proposal.quarter)}) = open proposal pipeline by line, probability-weighted, not yet won · recurring ${eur(m.recTotal)} of ${eur(m.kpi.wonRev)} won: Glint ${eur(m.recGlint)} · ROI ${eur(m.recRoi)} · ${m.recDeals} repeat deals`}>
              <Legend items={[['Glint — new', 'var(--good)'], ['Glint — recurring', 'var(--good)', null, 0.4], ['ROI — new', 'var(--accent)'], ['ROI — recurring', 'var(--accent)', null, 0.4], ['Proposals (open)', 'var(--text-3)', 'dashed']]} />
              <NewRecurringChart m={m} />
            </Panel>

            <Panel title="Win / loss by line" hint="Won/lost counts and won value per product line; total lost estimate as a cross-check.">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                <thead><tr style={{ textAlign: 'left', fontWeight: 400, ...muted }}>
                  <th style={{ padding: '4px 6px', fontWeight: 400 }}>Line</th><th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Won n</th>
                  <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Lost n</th><th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Win rate</th>
                  <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Won value</th>
                  <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }} title="Average won deal size (won value / won n)">Avg deal</th>
                  <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Lost est.</th>
                </tr></thead>
                <tbody>
                  {m.wl.map((r) => (
                    <tr key={r.line} style={{ borderTop: '0.5px solid var(--sep)' }}>
                      <td style={{ padding: '4px 6px' }}>{r.line}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono }}>{r.wonN}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono }}>{r.lostN}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono }}>{(r.wonN + r.lostN) ? ((r.wonN / (r.wonN + r.lostN)) * 100).toFixed(0) + '%' : '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500, ...mono }}>{eur(r.wonVal)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono }}>{r.wonN ? eur(r.wonVal / r.wonN) : '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono, ...muted }}>{eur(r.lostEst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="All clients · US & EMEA" hint={<span>Won revenue per quarter per client · <span style={{ color: 'var(--good)' }}>green name = live project</span> · click a name to open its Account 360 · Adecco excluded</span>}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10, fontSize: 11, ...muted }}>
                <span><Pill status="Live" /> in delivery</span><span><Pill status="Open" /> pipeline</span>
                <span><Pill status="Dormant" /> no live/open</span><span><Pill status="Partner" /> won, not a Customer</span>
              </div>
              <ClientsTable m={m} onPick={pick} />
            </Panel>

            <Panel title="Dormant clients" hint="Customers (excl. Adecco) with no live or open work — re-engagement candidates.">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                <thead><tr style={{ textAlign: 'left', fontWeight: 400, ...muted }}>
                  <th style={{ padding: '4px 6px', fontWeight: 400 }}>Client</th><th style={{ padding: '4px 6px', fontWeight: 400 }}>Region</th>
                  <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: 'right' }}>Won to date</th>
                </tr></thead>
                <tbody>
                  {m.dormant.map((r) => (
                    <tr key={r.id} onClick={() => pick(r.id)} style={{ borderTop: '0.5px solid var(--sep)', cursor: 'pointer' }}>
                      <td style={{ padding: '4px 6px', textDecoration: 'underline', textDecorationColor: 'var(--sep-strong)', textUnderlineOffset: 2 }}>{r.name}</td>
                      <td style={{ padding: '4px 6px', ...muted }}>{r.region}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', ...mono }}>{r.total > 0 ? eur(r.total) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <IndustryBreakdown companies={companies} />

              <div style={{ ...card, fontSize: 11.5, ...muted, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Methodology &amp; caveats</div>
              Revenue = COALESCE(actual, estimate, 0). Quarter = quarter of actual/expected close date. Won = status Won; Open pipeline = stage opportunity; weighted = Σ(estimate × probability). Probability is now stage-driven (set automatically on stage moves), so weighted pipeline behaves as a stage weighting rather than independent judgement — win rate is shown alongside as a cross-check. Customer = companies.type Customer (Adecco Group excluded; we deliver under LHH). Live = stage active/onboarding; active client = a Customer with any active/onboarding/opportunity deal; dormant = none. Region: US = country US/United States, else EMEA. New vs recurring ranks a client's won deals by close date ({recurringLineLevel ? 'per product line' : 'across all lines'}). Target = €1M/yr (€250k/q). Figures are operational CRM values, not reconciled finance actuals.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
