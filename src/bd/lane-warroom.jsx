import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { supabase } from '../supabase';
import { fmtRelative, fmtMoney } from './atoms';
import { useReportingData, computeMetrics, TeamCoverageMatrix, roleOverrideFor, normLinkRole } from './lane-reporting';

// ISO week label "wk NN ’YY" from y/mo(0-based)/d.
function isoWeekStr(y, mo, d) {
  const dt = new Date(Date.UTC(y, mo, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  return `wk ${week} ’${String(dt.getUTCFullYear()).slice(2)}`;
}
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_IDX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Convert a date/phrase cell to a week number ("wk 32 ’26") or, for month-only
// values, a month ("May ’26"). Handles exact dates and fuzzy phrases:
// "End of Feb 2026", "beginning of march", "Mid June-26", "First week of June",
// "w/c 13 July", "3rd June". Truly non-date text is returned unchanged.
function dateLabel(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return isoWeekStr(+m[1], +m[2] - 1, +m[3]);
  // Excel serial date number (days since 1899-12-30).
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const n = parseFloat(t);
    if (n >= 30000 && n <= 60000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000); return isoWeekStr(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  }
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return isoWeekStr(y, +m[1] - 1, +m[2]); }
  const lo = t.toLowerCase();
  const mon = lo.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  if (!mon) return t;
  const mo = MON_IDX[mon[1]];
  const y4 = lo.match(/(20\d{2})/), y2 = lo.match(/-(\d{2})\b/);
  const y = y4 ? +y4[1] : y2 ? 2000 + +y2[1] : new Date().getUTCFullYear();
  let day = null;
  if (/\b(begin|beginning|early|start|first)\b/.test(lo)) day = 4;
  else if (/\b(mid|middle)\b/.test(lo)) day = 15;
  else if (/\b(end|late)\b/.test(lo)) day = 25;
  const ord = lo.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/);
  if (ord) day = +ord[1];
  else { const dn = lo.match(/\b(\d{1,2})\s+(?:of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/); if (dn) day = +dn[1]; }
  if (day != null && day >= 1 && day <= 31) return isoWeekStr(y, mo, day);
  return `${MON3[mo]} ’${String(y).slice(2)}`;
}
// Convert any date inside a milestone label to a week (e.g. "Survey 2026-09-01" → "Survey wk 36 ’26").
function weekifyLabel(lbl) {
  return lbl ? lbl.replace(/\d{4}-\d{2}-\d{2}/, (d) => dateLabel(d)) : lbl;
}

// War-room: the running Glint delivery projects, synced from Yarmilla's Master
// Project Overview into public.glint_delivery. People (CS / PS / support) are
// shown in their own columns, with the operational detail (survey-live dates,
// dependencies) in Details. Rows order by urgency: Not started first, then by
// soonest milestone.

const SOURCE_URL = 'https://eclectikadmin-my.sharepoint.com/personal/yarmilla_eclectik_co/Documents/Chatbestanden%20van%20Microsoft%20Teams/Master_Project_Overview.xlsx';

function isPerson(name) {
  return name && String(name).trim() !== '' && String(name).toUpperCase() !== 'N/A';
}

// Small allocated-hours bar: green blocks = used, red blocks = remaining.
// `used` comes from a field we'll wire later — until then it's 0 (all remaining).
function HourBar({ allocated, used = 0 }) {
  const a = Number(allocated) || 0;
  if (a <= 0) return null;
  const n = Math.min(12, Math.max(1, Math.round(a / 10)));      // ~10h per block, capped
  const greenN = Math.max(0, Math.min(n, Math.round((Number(used) / a) * n)));
  return (
    <div title={`Used ${Number(used) || 0} / ${a}h`} style={{ display: 'flex', gap: 1, marginTop: 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 5, borderRadius: 1, background: i < greenN ? '#1D9E75' : '#F09595' }} />
      ))}
    </div>
  );
}

function PersonCell({ name, hours, used }) {
  if (!isPerson(name)) return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>;
  return (
    <div style={{ fontSize: 11.5 }}>
      <div>{name}{hours ? ` · ${hours}h` : ''}</div>
      <HourBar allocated={hours} used={used} />
    </div>
  );
}

// Insights-review matrix: clients × quarters, green = an analysis is on record
// (from the People Science meta), red = a survey cycle exists but no analysis yet.
// Normalize a name for matching. Keep parenthetical text (acronyms like
// "(ETF)") so "ETF" still matches "European Training Foundation (ETF)".
const normName = (s) => (s || '').toLowerCase().replace(/↳/g, '').replace(/[^a-z0-9]/g, '');

// People scientists (PSC role), by normalized name — mirrors ROLE_OVERRIDE in
// lane-reporting.jsx. Used to pick the people scientist off an account's
// Eclectik-team links (which carry no role field).
const PSC_NAMES = new Set(['avneetasolanki', 'kirstythompsonclarke', 'pabloborgespatel', 'paulmastrangelo', 'katefeeney']);

function InsightsMatrix({ accounts = [], pscByAccount = {}, teamByAccount = {}, operationalAccIds = new Set(), signedByAccount = {}, onPickAccount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null); // null = section order | 'client' | 'ps'
  useEffect(() => {
    fetch('/api/insights-review')
      .then(async r => { const j = await r.json().catch(() => ({})); if (r.ok) setData(j); else setError(j.error || 'Failed'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Match a People Science client name to a CRM account (names differ a bit).
  const accNorm = useMemo(() => accounts.map(a => ({ a, n: normName(a.name) })), [accounts]);
  const matchAccount = useCallback((clientName) => {
    const n = normName(clientName);
    if (!n) return null;
    let hit = accNorm.find(x => x.n === n)
      || accNorm.find(x => x.n.length >= 3 && (x.n.includes(n) || n.includes(x.n)))
      || accNorm.find(x => x.n.slice(0, 4) === n.slice(0, 4) && n.length >= 4);
    return hit ? hit.a : null;
  }, [accNorm]);

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading…</div>;
  if (error) return <div style={{ fontSize: 12, color: 'var(--warn)' }}>{error}</div>;
  const { clients = [], sections = [], quarters = [], cells = {} } = data || {};
  if (!clients.length) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No insights data.</div>;

  // CRM customers not yet in People Science → appended under Pre-IR / pre-contract.
  const ADECCO = 'Adecco Group';
  const isCustomer = (a) => (a.type || '') === 'Customer' && a.name !== ADECCO;
  const psAccountIds = new Set();
  clients.forEach(c => { const a = matchAccount(c.name); if (a) psAccountIds.add(a.id); });
  const extraRows = (accounts || [])
    .filter(a => isCustomer(a) && !psAccountIds.has(a.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(a => ({ id: 'crm:' + a.id, name: a.name, isSub: false, cohort: 'pre', crmAccount: a, crmOnly: true }));
  const allRows = [...clients, ...extraRows];

  const th2 = { fontWeight: 500, fontSize: 10.5, color: 'var(--text-3)', padding: '4px 8px', borderBottom: '0.5px solid var(--sep)', whiteSpace: 'nowrap' };
  const td2 = { padding: '6px 8px', borderBottom: '0.5px solid var(--sep)', fontSize: 12 };
  const dot = (c) => <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c === 'green' ? '#1D9E75' : '#E24B4A' }} />;

  // People scientist for a client = the PSC member on the matched account's 360.
  const accountFor = (c) => c.crmAccount || matchAccount(c.name);
  const psFor = (c) => { const a = accountFor(c); return a ? (pscByAccount[a.id] || '') : ''; };

  // Group by region like the Reporting view: US vs EMEA (missing country → EMEA).
  // NB: the adapter stores the country string on account.region.
  const regionFor = (c) => { const a = accountFor(c); return ['US', 'United States', 'USA'].includes(a?.region || a?.country || '') ? 'US' : 'EMEA'; };
  const REGIONS = ['US', 'EMEA'];

  // Columns = PS survey quarters ∪ any quarter a deal was signed (so the ❊ has a
  // column), starting at 2024-Q4 (older baseline quarters are hidden).
  const qkey = (q) => { const [y, n] = q.split('-Q').map(Number); return y * 4 + n; };
  const MIN_Q = 2024 * 4 + 4; // 2024-Q4
  const allQuarters = (() => {
    const s = new Set(quarters);
    allRows.forEach(c => { const a = accountFor(c); if (a && signedByAccount[a.id]) signedByAccount[a.id].forEach(q => s.add(q)); });
    return [...s].filter(q => qkey(q) >= MIN_Q).sort((a, b) => qkey(a) - qkey(b));
  })();

  // "Previous" = everything before 2024-Q4, collapsed into one cell.
  const prevFor = (c) => {
    const cm = cells[c.id] || {};
    let dotVal = null;
    for (const q in cm) { if (qkey(q) < MIN_Q) { if (cm[q] === 'green') { dotVal = 'green'; break; } dotVal = dotVal || 'red'; } }
    const a = accountFor(c);
    const signed = a && signedByAccount[a.id] && [...signedByAccount[a.id]].some(q => qkey(q) < MIN_Q);
    return { dotVal, signed };
  };
  const hasPrevious = allRows.some(c => { const p = prevFor(c); return p.dotVal || p.signed; });
  const prevTh = { ...th2, textAlign: 'center', borderRight: '0.5px solid var(--sep)' };

  // ── Forecast: extend 4 quarters past the latest actual quarter and predict the
  // next deal / PSC readout per client from its historical cadence (median gap
  // between past events). Naive extrapolation — a planning prompt, not a model.
  const BLUE = '#3B82F6';
  const qFromKey = (k) => { const n = ((k - 1) % 4) + 1; const y = Math.floor((k - 1) / 4); return `${y}-Q${n}`; };
  const now = new Date();
  const currentQk = now.getFullYear() * 4 + (Math.floor(now.getMonth() / 3) + 1);
  const lastActualQk = allQuarters.length ? qkey(allQuarters[allQuarters.length - 1]) : currentQk;
  const horizonStart = Math.max(lastActualQk, currentQk) + 1;
  const futureQuarters = [0, 1, 2, 3].map(i => qFromKey(horizonStart + i));
  const futureSet = new Set(futureQuarters.map(qkey));
  const displayQuarters = [...allQuarters, ...futureQuarters];
  // Engagement surveys run on a yearly ritual (sometimes semi-annual). So we don't
  // read raw event gaps — a survey + its readout + the deal signing all belong to
  // ONE cycle. We cluster events <=1 quarter apart into a cycle, then measure the
  // gap between cycles: default annual (4q), semi-annual (2q) only if cycles are
  // consistently ~2 apart. A single cycle still forecasts next year, same season.
  const predictFor = (c) => {
    const acc = accountFor(c);
    const cm = cells[c.id] || {};
    const evts = new Set();
    for (const q in cm) evts.add(qkey(q));
    if (acc && signedByAccount[acc.id]) signedByAccount[acc.id].forEach(q => evts.add(qkey(q)));
    const keys = [...evts].sort((a, b) => a - b);
    if (!keys.length) return new Set();
    // Collapse events within 1 quarter of each other into a single survey cycle.
    const cycles = [keys[0]];
    for (let i = 1; i < keys.length; i++) if (keys[i] - keys[i - 1] > 1) cycles.push(keys[i]);
    let cadence = 4; // annual by default
    if (cycles.length >= 2) {
      const gaps = [];
      for (let i = 1; i < cycles.length; i++) gaps.push(cycles[i] - cycles[i - 1]);
      gaps.sort((a, b) => a - b);
      const mid = Math.floor(gaps.length / 2);
      const g = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
      cadence = g <= 2.5 ? 2 : 4; // snap to semi-annual or annual
    }
    // Surveys recur in the same SEASON each year. Lock onto the client's dominant
    // survey quarter (mode of past cycles) and predict that season annually — twice
    // a year if the cadence is semi-annual.
    const seasonCount = {};
    cycles.forEach(k => { const s = ((k - 1) % 4) + 1; seasonCount[s] = (seasonCount[s] || 0) + 1; });
    let season = ((cycles[cycles.length - 1] - 1) % 4) + 1, best = -1;
    for (const s in seasonCount) if (seasonCount[s] > best) { best = seasonCount[s]; season = +s; }
    const seasons = cadence === 2 ? new Set([season, ((season + 1) % 4) + 1]) : new Set([season]);
    const out = new Set();
    for (let k = horizonStart; k <= horizonStart + 3; k++) if (seasons.has(((k - 1) % 4) + 1)) out.add(k);
    return out;
  };
  const diamond = <span title="Predicted next activity (deal or PSC readout) — based on past cadence" style={{ display: 'inline-block', width: 8, height: 8, background: BLUE, transform: 'rotate(45deg)' }} />;
  const sortRows = (list) => {
    if (sortKey === 'ps') return [...list].sort((a, b) => (psFor(a) || '~').localeCompare(psFor(b) || '~'));
    return [...list].sort((a, b) => a.name.localeCompare(b.name)); // default + 'client' → alphabetical
  };
  const sortMark = (k) => sortKey === k ? ' ↓' : '';

  const clientRow = (c) => {
    const acc = accountFor(c);
    const operational = acc && operationalAccIds.has(acc.id);
    return (
      <tr key={c.id}>
        <td style={{ ...td2, paddingLeft: c.isSub ? 22 : 8, fontWeight: c.isSub ? 400 : 500, position: 'sticky', left: 0, background: 'var(--bg-1)', whiteSpace: 'nowrap', color: acc && onPickAccount ? 'var(--accent)' : 'inherit', cursor: acc && onPickAccount ? 'pointer' : 'default' }}
          onClick={() => acc && onPickAccount && onPickAccount(acc)}
          title={acc ? `Open ${acc.name} (360)${operational ? ' · operational (running project)' : ''}` : undefined}>
          <span title={operational ? 'Operational — running project' : undefined} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, marginRight: 6, verticalAlign: 'middle', background: operational ? BLUE : 'transparent' }} />
          {c.name}{c.crmOnly && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · CRM</span>}
        </td>
        <td style={{ ...td2, whiteSpace: 'nowrap' }}>
          {(acc && teamByAccount[acc.id] ? teamByAccount[acc.id] : []).map((p, i) => (
            <span key={p.name} title={`${p.name} · ${p.role}`}
              style={{ color: p.role === 'CSM' ? '#1D9E75' : 'var(--accent)', fontSize: 10.5, fontFamily: 'var(--font-mono)', marginLeft: i ? 6 : 0 }}>
              {p.initials}
            </span>
          ))}
        </td>
        {hasPrevious && (() => {
          const p = prevFor(c);
          return (
            <td style={{ ...td2, textAlign: 'center', whiteSpace: 'nowrap', borderRight: '0.5px solid var(--sep)' }}>
              {p.dotVal ? dot(p.dotVal) : (!p.signed && <span style={{ color: 'var(--text-3)' }}>·</span>)}
              {p.signed && <span title="Deal signed (before 2024-Q4)" style={{ color: 'var(--text-1)', marginLeft: p.dotVal ? 3 : 0 }}>❊</span>}
            </td>
          );
        })()}
        {(() => { const pred = predictFor(c); return displayQuarters.map(q => {
          const k = qkey(q);
          const v = cells[c.id]?.[q];
          const signed = acc && signedByAccount[acc.id]?.has(q);
          const predicted = pred.has(k);
          const divider = k === horizonStart ? { borderLeft: '1px dashed var(--sep)' } : null;
          return (
            <td key={q} style={{ ...td2, textAlign: 'center', whiteSpace: 'nowrap', ...divider }}>
              {v ? dot(v) : ((!signed && !predicted) && <span style={{ color: 'var(--text-3)' }}>·</span>)}
              {signed && <span title="Deal signed" style={{ color: 'var(--text-1)', marginLeft: v ? 3 : 0 }}>❊</span>}
              {predicted && diamond}
            </td>
          );
        }); })()}
      </tr>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 8px' }}>
        <span style={{ color: '#1D9E75' }}>●</span> analysis on record · <span style={{ color: '#E24B4A' }}>●</span> survey, no analysis yet · <span style={{ color: 'var(--text-1)' }}>❊</span> deal signed · <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, background: BLUE, verticalAlign: 'middle' }} /> operational · <span style={{ display: 'inline-block', width: 7, height: 7, background: BLUE, transform: 'rotate(45deg)', verticalAlign: 'middle' }} /> predicted next activity (forecast, next 4Q) ·
        source: <a href="https://peoplescience.eclectik-insights.co/meta" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>People Science meta</a>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th2, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-1)', cursor: 'pointer' }}
              onClick={() => setSortKey(k => k === 'client' ? null : 'client')} title="Sort by client">Client{sortMark('client')}</th>
            <th style={{ ...th2, textAlign: 'left' }} title="CS (green) and PS (purple) contractors on the account">CS · PS</th>
            {hasPrevious && <th style={prevTh} />}
            {displayQuarters.map(q => <th key={q} style={{ ...th2, ...(qkey(q) === horizonStart ? { borderLeft: '1px dashed var(--sep)' } : null) }} />)}
          </tr></thead>
          <tbody>
            {REGIONS.map(R => {
              const list = sortRows(allRows.filter(c => regionFor(c) === R));
              if (!list.length) return null;
              return (
                <Fragment key={R}>
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', position: 'sticky', left: 0, background: 'var(--bg-1)' }}>
                      {R} <span style={{ color: 'var(--text-3)' }}>({list.length})</span>
                    </td>
                    {hasPrevious && <td style={{ padding: '10px 4px 4px', fontSize: 9.5, fontWeight: 500, color: 'var(--text-3)', textAlign: 'center', whiteSpace: 'nowrap', borderRight: '0.5px solid var(--sep)' }}>Previous</td>}
                    {displayQuarters.map(q => { const fut = futureSet.has(qkey(q)); return <td key={q} style={{ padding: '10px 4px 4px', fontSize: 9.5, fontWeight: 500, color: fut ? BLUE : 'var(--text-3)', fontStyle: fut ? 'italic' : 'normal', textAlign: 'center', whiteSpace: 'nowrap', ...(qkey(q) === horizonStart ? { borderLeft: '1px dashed var(--sep)' } : null) }}>{q}</td>; })}
                  </tr>
                  {list.map(clientRow)}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Coverage tab: the "Client coverage · Eclectik team" matrix, moved here from
// the Reporting page. Reuses Reporting's data hook + model + matrix component.
function CoverageTab({ accounts = [], onPickAccount }) {
  const { opps, companies, links, teamContacts, error, loading } = useReportingData();
  const m = useMemo(
    () => (opps && companies) ? computeMetrics(opps, companies, links || [], teamContacts || [], { countActiveAsWon: false, recurringLineLevel: false }) : null,
    [opps, companies, links, teamContacts]
  );
  if (loading) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading…</div>;
  if (error) return <div style={{ fontSize: 12, color: 'var(--warn)' }}>{error}</div>;
  if (!m) return null;
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 8px' }}>
        Who covers each client. Columns grouped CSM → PSC → ROI → leadership/other; a dot marks coverage. Click a client to open its 360.
      </div>
      <TeamCoverageMatrix m={m} onPick={(id) => { const acc = accounts.find(a => a.id === id); if (acc && onPickAccount) onPickAccount(acc); }} />
    </div>
  );
}

export default function WarRoomLane({ accounts = [], deals = [], onPickAccount }) {
  const [tab, setTab] = useState('projects');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const accById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Accounts that are still operational = have a delivery project that isn't Completed.
  const operationalAccIds = useMemo(() => {
    const s = new Set();
    (rows || []).forEach(r => { if (r.company_id && (r.status || '') !== 'Completed') s.add(r.company_id); });
    return s;
  }, [rows]);

  // People scientist per account = the Eclectik-team member linked on the 360
  // whose name maps to the PSC (people science) role. Keyed by CRM account id.
  const [pscByAccount, setPscByAccount] = useState({});
  // CS + PS contractors per account (initials shown in the Insights matrix).
  const [teamByAccount, setTeamByAccount] = useState({});
  useEffect(() => {
    supabase.from('account_links')
      .select('account_id, role, contacts:contact_id(first_name, last_name, full_name)')
      .eq('link_type', 'eclectik_team')
      .then(({ data }) => {
        const m = {};
        const t = {};
        (data || []).forEach(l => {
          const c = l.contacts;
          if (!c || !l.account_id) return;
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.full_name || '';
          if (PSC_NAMES.has(normName(name)) && !m[l.account_id]) m[l.account_id] = name;
          const role = roleOverrideFor(name) || normLinkRole(l.role);
          if (role === 'CSM' || role === 'PSC') {
            const arr = (t[l.account_id] = t[l.account_id] || []);
            if (!arr.some(p => p.name === name)) {
              arr.push({ name, role, initials: name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() });
            }
          }
        });
        Object.values(t).forEach(arr => arr.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'CSM' ? -1 : 1)));
        setPscByAccount(m);
        setTeamByAccount(t);
      });
  }, []);

  // Quarters in which a deal was signed (won), per account — drives the ★ marker.
  const [signedByAccount, setSignedByAccount] = useState({});
  useEffect(() => {
    supabase.from('opportunities').select('company_id, close_date, actual_close_date').eq('status', 'Won')
      .then(({ data }) => {
        const m = {};
        (data || []).forEach(o => {
          const d = o.actual_close_date || o.close_date;
          if (!o.company_id || !d) return;
          const dt = new Date(d);
          if (isNaN(dt)) return;
          const q = `${dt.getUTCFullYear()}-Q${Math.floor(dt.getUTCMonth() / 3) + 1}`;
          (m[o.company_id] = m[o.company_id] || new Set()).add(q);
        });
        setSignedByAccount(m);
      });
  }, []);

  // Deal value for a project's company = its RUNNING deals only (active /
  // onboarding). We do NOT fall back to past/lost deals — that was inflating
  // values (e.g. IMC, whose only running stage is none; its other deals are
  // past/won/lost and shouldn't count here).
  const runningDealsFor = useCallback((companyId) => {
    if (!companyId) return [];
    return (deals || []).filter(d => d.accountId === companyId && ['active', 'onboarding'].includes(d.stage));
  }, [deals]);
  const dealValueFor = useCallback((companyId) => {
    return runningDealsFor(companyId).reduce((s, d) => s + (Number(d.value) || 0), 0);
  }, [runningDealsFor]);

  // Active/onboarding CRM deals whose company has NO row in the delivery sheet
  // — i.e. running per the CRM but missing from the war-room. Shown at the top.
  const missing = useMemo(() => {
    const have = new Set((rows || []).map(r => r.company_id).filter(Boolean));
    return (deals || [])
      .filter(d => ['active', 'onboarding'].includes(d.stage) && d.accountId && !have.has(d.accountId))
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  }, [deals, rows]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('glint_delivery').select('*');
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const resp = await fetch('/api/glint-sync', { method: 'POST' });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) { setSyncMsg(`Synced ${data.synced ?? 0} rows`); await load(); }
      else setSyncMsg(data.error || 'Sync not available yet');
    } catch (e) {
      setSyncMsg('Sync failed: ' + e.message);
    }
    setSyncing(false);
  };

  // Order: Not started first, then soonest milestone, then the rest.
  const delivery = useMemo(() => {
    const ms = (r) => r.next_milestone_date || '9999-12-31';
    // Order by status: Not started → In progress (running) → Completed.
    const rank = (r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'not started') return 0;
      if (s === 'completed') return 2;
      return 1; // In progress / anything else = running
    };
    return [...(rows || [])].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return ms(a).localeCompare(ms(b));
    });
  }, [rows]);

  const totals = useMemo(() => {
    const sum = (k) => (rows || []).reduce((s, r) => s + (Number(r[k]) || 0), 0);
    return { cs: sum('cs_hours'), ps: sum('ps_hours'), other: sum('other_hours') };
  }, [rows]);

  const lastSynced = useMemo(() => rows.map(r => r.synced_at).filter(Boolean).sort().pop() || null, [rows]);
  const sheetModified = useMemo(() => rows.map(r => r.source_modified_at).filter(Boolean).sort().pop() || null, [rows]);

  const th = { textAlign: 'left', fontWeight: 500, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', padding: '4px 8px', borderBottom: '0.5px solid var(--sep)' };
  const td = { padding: '7px 8px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top', fontSize: 12.5 };
  const sub = { color: 'var(--text-3)', fontSize: 11 };
  const chip = (bg, col) => ({ fontSize: 10.5, padding: '1px 7px', borderRadius: 4, background: bg, color: col, whiteSpace: 'nowrap' });

  return (
    <div className="lane" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 14 }}>
      {/* Header: title + sub-tabs (+ source/update on the Projects tab) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>War room</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['projects', 'Projects'], ['insights', 'Insights review'], ['coverage', 'Client coverage']].map(([t, label]) => (
            <button key={t} className="btn-ghost tiny" onClick={() => setTab(t)}
              style={{ fontWeight: tab === t ? 500 : 400, color: tab === t ? 'var(--text-1)' : 'var(--text-3)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, borderRadius: 0 }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {tab === 'projects' && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', lineHeight: 1.5 }}>
              Source: <a href={SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Master Project Overview.xlsx</a>
              {sheetModified && <> · sheet updated {fmtRelative(sheetModified)}</>}
              <br />
              {lastSynced ? <>synced {fmtRelative(lastSynced)}</> : 'not synced yet'}
              {syncMsg && <> · <span style={{ color: 'var(--text-2)' }}>{syncMsg}</span></>}
            </div>
            <a href="/warroom-projects-field-guide.md" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap', alignSelf: 'center' }}
              title="How to fill the project sheet — usage guide">📄 Field guide</a>
            <button className="btn-ghost tiny" onClick={update} disabled={syncing}
              style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }} title="Pull the latest from Yarmilla's sheet">
              {syncing ? 'Updating…' : '↻ Update'}
            </button>
          </>
        )}
      </div>

      {tab === 'insights' && <InsightsMatrix accounts={accounts} pscByAccount={pscByAccount} teamByAccount={teamByAccount} operationalAccIds={operationalAccIds} signedByAccount={signedByAccount} onPickAccount={onPickAccount} />}

      {tab === 'coverage' && <CoverageTab accounts={accounts} onPickAccount={onPickAccount} />}

      {tab === 'projects' && missing.length > 0 && (
        <div style={{ marginBottom: 14, border: '0.5px solid var(--warn)', background: 'var(--warn-tint)', borderRadius: 8, padding: '9px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--warn)', marginBottom: 6 }}>
            In CRM "active" but not in the sheet · {missing.length}
          </div>
          {missing.map(d => {
            const acc = d.accountId ? accById.get(d.accountId) : null;
            return (
              <div key={d.id} style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'baseline', padding: '2px 0' }}>
                <span style={{ fontWeight: 500, color: acc && onPickAccount ? 'var(--accent)' : 'inherit', cursor: acc && onPickAccount ? 'pointer' : 'default' }}
                  onClick={() => acc && onPickAccount && onPickAccount(acc)}>{acc?.name || d.account || '—'}</span>
                {acc?.accountNo && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{acc.accountNo}</span>}
                <span style={{ color: 'var(--text-3)' }}>{d.title}</span>
                {d.dealNo && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{d.dealNo}</span>}
                <span style={{ marginLeft: 'auto', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{d.value ? fmtMoney(d.value) : ''}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'projects' && (<>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: '6px 0' }}>
        Glint delivery — running projects · {delivery.length}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Client · project</th>
          <th style={th}>CS ({totals.cs}h)</th><th style={th}>PS ({totals.ps}h)</th><th style={th}>Support ({totals.other}h)</th>
          <th style={th}>Delivery</th><th style={th}>KO</th><th style={th}>Start</th><th style={th}>End</th><th style={th}>Status</th>
        </tr></thead>
        <tbody>
          {loading && <tr><td style={td} colSpan={9}>Loading…</td></tr>}
          {!loading && delivery.length === 0 && (
            <tr><td style={{ ...td, color: 'var(--text-3)' }} colSpan={9}>No delivery rows yet — run the seed or hit Update.</td></tr>
          )}
          {delivery.map(r => {
            const acc = r.company_id ? accById.get(r.company_id) : null;
            const hasNotes = !!(r.notes && String(r.notes).trim());
            const cTd = hasNotes ? { ...td, borderBottom: 'none' } : td; // keep details line attached to its row
            return (
              <Fragment key={r.id}>
              <tr>
                <td style={cTd}>
                  {acc && onPickAccount
                    ? <span onClick={() => onPickAccount(acc)} style={{ fontWeight: 500, color: 'var(--accent)', cursor: 'pointer' }}>{r.client_name}</span>
                    : <span style={{ fontWeight: 500 }}>{r.client_name}</span>}
                  {acc?.accountNo && <span title="Account number" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginLeft: 6 }}>{acc.accountNo}</span>}
                  <div style={sub}>
                    {r.project_name || ''}
                    {(() => {
                      const ds = runningDealsFor(r.company_id);
                      const v = ds.reduce((s, d) => s + (Number(d.value) || 0), 0);
                      if (!v && !ds.length) return null;
                      const h = (Number(r.cs_hours) || 0) + (Number(r.ps_hours) || 0) + (Number(r.other_hours) || 0);
                      const rate = h > 0 && v ? Math.round(v / h) : null;
                      const nos = ds.map(d => d.dealNo).filter(Boolean).join(' ');
                      return (
                        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                          {v ? <> · {fmtMoney(v)}{rate ? ` (€${rate}/h)` : ''}</> : null}
                          {nos && <span title="Running deal number(s)" style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>{nos}</span>}
                        </span>
                      );
                    })()}
                  </div>
                </td>
                <td style={cTd}><PersonCell name={r.cs_owner} hours={r.cs_hours} used={r.cs_used_hours} /></td>
                <td style={cTd}><PersonCell name={r.ps_owner} hours={r.ps_hours} used={r.ps_used_hours} /></td>
                <td style={cTd}><PersonCell name={r.other_contractors} hours={r.other_hours} used={r.other_used_hours} /></td>
                <td style={cTd}>{r.next_milestone_label ? weekifyLabel(r.next_milestone_label) : <span style={sub}>TBC</span>}</td>
                <td style={{ ...cTd, fontSize: 11.5, whiteSpace: 'nowrap' }}>{dateLabel(r.ko_date) || <span style={sub}>—</span>}</td>
                <td style={{ ...cTd, fontSize: 11.5, whiteSpace: 'nowrap' }}>{dateLabel(r.delivery_start) || <span style={sub}>—</span>}</td>
                <td style={{ ...cTd, fontSize: 11.5, whiteSpace: 'nowrap' }}>{dateLabel(r.delivery_end) || <span style={sub}>—</span>}</td>
                <td style={cTd}><span style={chip(
                  r.status === 'Not started' ? 'rgba(226,75,74,.13)' : r.status === 'Completed' ? 'rgba(136,135,128,.15)' : 'rgba(29,158,117,.14)',
                  r.status === 'Not started' ? '#A32D2D' : r.status === 'Completed' ? '#5F5E5A' : '#0F6E56'
                )}>{r.status || '—'}</span></td>
              </tr>
              {hasNotes && (
                <tr>
                  <td colSpan={9} style={{ padding: '0 8px 8px 8px', borderBottom: '0.5px solid var(--sep)', fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
                    <span style={{ ...sub, marginRight: 6 }}>↳ Details</span>{r.notes}
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </>)}
    </div>
  );
}
