import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import { fmtRelative } from './atoms';

// War-room: one screen spanning the commercial pipeline (from the CRM) and the
// running Glint delivery projects (synced from Yarmilla's Master Project
// Overview into public.glint_delivery). Health is auto-derived from status,
// priority, milestone proximity and the follow-up flag.

const SOURCE_URL = 'https://eclectikadmin-my.sharepoint.com/personal/yarmilla_eclectik_co/Documents/Chatbestanden%20van%20Microsoft%20Teams/Master_Project_Overview.xlsx';

function daysUntil(d) {
  if (!d) return null;
  return Math.round((new Date(d) - new Date()) / 86400000);
}

// → { c: 'r'|'a'|'g', why } from the signals we have on each delivery row.
function deliveryHealth(r) {
  const today = new Date().toISOString().slice(0, 10);
  const notes = (r.notes || '').toLowerCase();
  const blocked = /block|no access|can only watch|slipped|delay|stuck/.test(notes);
  const ms = r.next_milestone_date;
  const d = daysUntil(ms);
  const soon = ms && ms >= today && d <= 14;
  const overdue = ms && ms < today && (r.status || '') !== 'Completed';
  if ((r.status || '') === 'Not started' || blocked) {
    return { c: 'r', why: blocked ? 'Blocked / slipped' : 'Not started' };
  }
  const bits = [];
  if ((r.priority || '').toLowerCase() === 'high') bits.push('High priority');
  if (r.follow_up) bits.push('Follow-up: ' + r.follow_up);
  if (soon) bits.push(`milestone in ${d}d`);
  if (overdue) bits.push('milestone passed');
  if (bits.length) return { c: 'a', why: bits.join(' · ') };
  return { c: 'g', why: 'On track' };
}
const RANK = { r: 0, a: 1, g: 2 };
const DOT = { r: '#E24B4A', a: '#BA7517', g: '#1D9E75' };

function teamLabel(r) {
  const parts = [];
  if (r.cs_owner && r.cs_owner !== 'N/A') parts.push(`${r.cs_owner}${r.cs_hours ? ` ${r.cs_hours}h` : ''}`);
  if (r.ps_owner && r.ps_owner !== 'N/A') parts.push(`${r.ps_owner}${r.ps_hours ? ` ${r.ps_hours}h` : ''}`);
  if (r.other_contractors && r.other_contractors !== 'N/A') parts.push(`+${r.other_contractors}`);
  return parts;
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

  const delivery = useMemo(() => {
    return (rows || [])
      .map(r => ({ ...r, _h: deliveryHealth(r) }))
      .sort((a, b) => RANK[a._h.c] - RANK[b._h.c]);
  }, [rows]);

  const lastSynced = useMemo(() => {
    const ts = rows.map(r => r.synced_at).filter(Boolean).sort().pop();
    return ts || null;
  }, [rows]);
  const sheetModified = useMemo(() => {
    const ts = rows.map(r => r.source_modified_at).filter(Boolean).sort().pop();
    return ts || null;
  }, [rows]);

  const th = { textAlign: 'left', fontWeight: 500, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', padding: '4px 8px', borderBottom: '0.5px solid var(--sep)' };
  const td = { padding: '7px 8px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top', fontSize: 12.5 };
  const sub = { color: 'var(--text-3)', fontSize: 11 };
  const dot = (c) => ({ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: DOT[c], marginTop: 3, flex: 'none' });
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

      {/* In delivery */}
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: '6px 0' }}>
        Glint delivery — running projects · {delivery.length}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Client · project</th><th style={th}>Health — why</th>
          <th style={th}>Who's on it</th><th style={th}>Next milestone</th><th style={th}>Status</th>
        </tr></thead>
        <tbody>
          {loading && <tr><td style={td} colSpan={5}>Loading…</td></tr>}
          {!loading && delivery.length === 0 && (
            <tr><td style={{ ...td, color: 'var(--text-3)' }} colSpan={5}>No delivery rows yet — run the seed or hit Update.</td></tr>
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
                <td style={td}><div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={dot(r._h.c)} /><div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.35 }}>{r._h.why}{r.priority ? ` · ${r.priority}` : ''}</div>
                </div></td>
                <td style={{ ...td, fontSize: 11 }}>{teamLabel(r).length ? teamLabel(r).map((t, i) => <div key={i}>{t}</div>) : <span style={sub}>—</span>}</td>
                <td style={td}>{r.next_milestone_label || <span style={sub}>TBC</span>}</td>
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
