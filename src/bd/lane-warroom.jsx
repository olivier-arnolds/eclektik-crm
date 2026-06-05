import { useState, useEffect, useMemo, useCallback } from 'react';
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

export default function WarRoomLane({ accounts = [], deals = [], onPickAccount }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const accById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

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
      {/* Header: source + last updated + update */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>War room</div>
        <div style={{ flex: 1 }} />
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
      </div>

      {missing.length > 0 && (
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
    </div>
  );
}
