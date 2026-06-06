import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { supabase } from '../supabase';
import { fmtRelative, fmtMoney } from './atoms';

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

function InsightsMatrix({ accounts = [], pscByAccount = {}, onPickAccount }) {
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

  // Account-level notes (companies.notes) — editable here and in the 360.
  const [noteByAcc, setNoteByAcc] = useState({});
  useEffect(() => {
    supabase.from('companies').select('id, notes').then(({ data }) => {
      const m = {};
      (data || []).forEach(r => { if (r.notes != null) m[r.id] = r.notes; });
      setNoteByAcc(m);
    });
  }, []);

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
  const baseSections = sections.length ? sections : [{ key: null, label: '', count: clients.length }];
  const sectionList = baseSections.map(s => s.key === 'pre' ? { ...s, count: s.count + extraRows.length } : s);

  // People scientist for a client = the PSC member on the matched account's 360.
  const accountFor = (c) => c.crmAccount || matchAccount(c.name);
  const psFor = (c) => { const a = accountFor(c); return a ? (pscByAccount[a.id] || '') : ''; };
  const sortRows = (list) => {
    if (sortKey === 'client') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === 'ps') return [...list].sort((a, b) => (psFor(a) || '~').localeCompare(psFor(b) || '~'));
    return list; // section/display order
  };
  const sortMark = (k) => sortKey === k ? ' ↓' : '';

  const clientRow = (c) => {
    const acc = accountFor(c);
    return (
      <tr key={c.id}>
        <td style={{ ...td2, paddingLeft: c.isSub ? 22 : 8, fontWeight: c.isSub ? 400 : 500, position: 'sticky', left: 0, background: 'var(--bg-1)', whiteSpace: 'nowrap', color: acc && onPickAccount ? 'var(--accent)' : 'inherit', cursor: acc && onPickAccount ? 'pointer' : 'default' }}
          onClick={() => acc && onPickAccount && onPickAccount(acc)}
          title={acc ? `Open ${acc.name} (360)` : undefined}>
          {c.name}{c.crmOnly && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · CRM</span>}
        </td>
        <td style={{ ...td2, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{psFor(c) || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
        {quarters.map(q => (
          <td key={q} style={{ ...td2, textAlign: 'center' }}>
            {cells[c.id]?.[q] ? dot(cells[c.id][q]) : <span style={{ color: 'var(--text-3)' }}>·</span>}
          </td>
        ))}
        <td style={{ ...td2, minWidth: 200 }}>
          {acc ? (
            <input value={noteByAcc[acc.id] ?? ''}
              onChange={e => setNoteByAcc(m => ({ ...m, [acc.id]: e.target.value }))}
              onBlur={e => supabase.from('companies').update({ notes: e.target.value || null }).eq('id', acc.id)}
              placeholder="Add note…"
              style={{ width: '100%', minWidth: 180, padding: '3px 6px', fontSize: 11.5, border: '0.5px solid var(--sep)', borderRadius: 4, background: 'var(--fill-1)', color: 'var(--text-1)', fontFamily: 'var(--font)', outline: 'none' }} />
          ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 8px' }}>
        <span style={{ color: '#1D9E75' }}>●</span> analysis on record · <span style={{ color: '#E24B4A' }}>●</span> survey, no analysis yet ·
        source: <a href="https://peoplescience.eclectik-insights.co/meta" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>People Science meta</a>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th2, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-1)', cursor: 'pointer' }}
              onClick={() => setSortKey(k => k === 'client' ? null : 'client')} title="Sort by client">Client{sortMark('client')}</th>
            <th style={{ ...th2, textAlign: 'left', cursor: 'pointer' }}
              onClick={() => setSortKey(k => k === 'ps' ? null : 'ps')} title="Sort by people scientist">People scientist{sortMark('ps')}</th>
            {quarters.map(q => <th key={q} style={{ ...th2, textAlign: 'center' }}>{q}</th>)}
            <th style={{ ...th2, textAlign: 'left' }}>Note</th>
          </tr></thead>
          <tbody>
            {sectionList.map(s => (
              <Fragment key={s.key || 'all'}>
                {s.label && (
                  <tr>
                    <td colSpan={quarters.length + 3} style={{ padding: '10px 8px 4px', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'none', position: 'sticky', left: 0, background: 'var(--bg-1)' }}>
                      {s.label} <span style={{ color: 'var(--text-3)' }}>({s.count})</span>
                    </td>
                  </tr>
                )}
                {sortRows(allRows.filter(c => s.key == null || c.cohort === s.key)).map(clientRow)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
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

  // People scientist per account = the Eclectik-team member linked on the 360
  // whose name maps to the PSC (people science) role. Keyed by CRM account id.
  const [pscByAccount, setPscByAccount] = useState({});
  useEffect(() => {
    supabase.from('account_links')
      .select('account_id, contacts:contact_id(first_name, last_name, full_name)')
      .eq('link_type', 'eclectik_team')
      .then(({ data }) => {
        const m = {};
        (data || []).forEach(l => {
          const c = l.contacts;
          if (!c || !l.account_id) return;
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.full_name || '';
          if (PSC_NAMES.has(normName(name)) && !m[l.account_id]) m[l.account_id] = name;
        });
        setPscByAccount(m);
      });
  }, []);

  // Deal value for a project's company = its RUNNING deals only (active /
  // onboarding). We do NOT fall back to past/lost deals — that was inflating
  // values (e.g. IMC, whose only running stage is none; its other deals are
  // past/won/lost and shouldn't count here).
  const dealValueFor = useCallback((companyId) => {
    if (!companyId) return 0;
    return (deals || [])
      .filter(d => d.accountId === companyId && ['active', 'onboarding'].includes(d.stage))
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
  }, [deals]);

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
    return [...(rows || [])].sort((a, b) => {
      const na = (a.status || '') === 'Not started' ? 0 : 1;
      const nb = (b.status || '') === 'Not started' ? 0 : 1;
      if (na !== nb) return na - nb;
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
          {[['projects', 'Projects'], ['insights', 'Insights review']].map(([t, label]) => (
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
            <button className="btn-ghost tiny" onClick={update} disabled={syncing}
              style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }} title="Pull the latest from Yarmilla's sheet">
              {syncing ? 'Updating…' : '↻ Update'}
            </button>
          </>
        )}
      </div>

      {tab === 'insights' && <InsightsMatrix accounts={accounts} pscByAccount={pscByAccount} onPickAccount={onPickAccount} />}

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
                <span style={{ color: 'var(--text-3)' }}>{d.title}</span>
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
          <th style={th}>Milestone</th><th style={th}>Details</th><th style={th}>Status</th>
        </tr></thead>
        <tbody>
          {loading && <tr><td style={td} colSpan={7}>Loading…</td></tr>}
          {!loading && delivery.length === 0 && (
            <tr><td style={{ ...td, color: 'var(--text-3)' }} colSpan={7}>No delivery rows yet — run the seed or hit Update.</td></tr>
          )}
          {delivery.map(r => {
            const acc = r.company_id ? accById.get(r.company_id) : null;
            return (
              <tr key={r.id}>
                <td style={td}>
                  {acc && onPickAccount
                    ? <span onClick={() => onPickAccount(acc)} style={{ fontWeight: 500, color: 'var(--accent)', cursor: 'pointer' }}>{r.client_name}</span>
                    : <span style={{ fontWeight: 500 }}>{r.client_name}</span>}
                  <div style={sub}>
                    {r.project_name || ''}
                    {(() => {
                      const v = dealValueFor(r.company_id);
                      if (!v) return null;
                      const h = (Number(r.cs_hours) || 0) + (Number(r.ps_hours) || 0) + (Number(r.other_hours) || 0);
                      const rate = h > 0 ? Math.round(v / h) : null;
                      return <span style={{ color: 'var(--text-2)', fontWeight: 500 }}> · {fmtMoney(v)}{rate ? ` (€${rate}/h)` : ''}</span>;
                    })()}
                  </div>
                </td>
                <td style={td}><PersonCell name={r.cs_owner} hours={r.cs_hours} used={r.cs_used_hours} /></td>
                <td style={td}><PersonCell name={r.ps_owner} hours={r.ps_hours} used={r.ps_used_hours} /></td>
                <td style={td}><PersonCell name={r.other_contractors} hours={r.other_hours} used={r.other_used_hours} /></td>
                <td style={td}>{r.next_milestone_label || <span style={sub}>TBC</span>}</td>
                <td style={{ ...td, fontSize: 11.5, color: 'var(--text-2)', maxWidth: 340, lineHeight: 1.4 }}>{r.notes || <span style={sub}>—</span>}</td>
                <td style={td}><span style={chip(
                  r.status === 'Not started' ? 'rgba(226,75,74,.13)' : r.status === 'Completed' ? 'rgba(136,135,128,.15)' : 'rgba(29,158,117,.14)',
                  r.status === 'Not started' ? '#A32D2D' : r.status === 'Completed' ? '#5F5E5A' : '#0F6E56'
                )}>{r.status || '—'}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </>)}
    </div>
  );
}
