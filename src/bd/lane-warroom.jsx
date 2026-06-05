import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import { fmtRelative } from './atoms';

// War-room: the running Glint delivery projects, synced from Yarmilla's Master
// Project Overview into public.glint_delivery. People (CS / PS / support) are
// shown in their own columns, with the operational detail (survey-live dates,
// dependencies) in Details. Rows order by urgency: Not started first, then by
// soonest milestone.

const SOURCE_URL = 'https://eclectikadmin-my.sharepoint.com/personal/yarmilla_eclectik_co/Documents/Chatbestanden%20van%20Microsoft%20Teams/Master_Project_Overview.xlsx';

// Render one Eclectik person + hours, or — if empty / N/A.
function person(name, hours) {
  if (!name || String(name).trim() === '' || String(name).toUpperCase() === 'N/A') return '—';
  return `${name}${hours ? ` · ${hours}h` : ''}`;
}

export default function WarRoomLane({ accounts = [], onPickAccount }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const accById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

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

      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: '6px 0' }}>
        Glint delivery — running projects · {delivery.length}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Client · project</th>
          <th style={th}>CS</th><th style={th}>PS</th><th style={th}>Support</th>
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
                  <div style={sub}>{r.project_name || ''}</div>
                </td>
                <td style={{ ...td, fontSize: 11.5 }}>{person(r.cs_owner, r.cs_hours)}</td>
                <td style={{ ...td, fontSize: 11.5 }}>{person(r.ps_owner, r.ps_hours)}</td>
                <td style={{ ...td, fontSize: 11.5 }}>{person(r.other_contractors, r.other_hours)}</td>
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
