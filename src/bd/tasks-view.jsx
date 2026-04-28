import { useEffect, useMemo, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// All-tasks overview (Dynamics-style table). Click a row to open the
// linked account on the right pane (the same wiring as calendar tasks).
// Columns: Regarding · Subject · Description · Priority · Start Date.
export default function TasksView({ accounts, contacts, onSelectTask }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [sortBy, setSortBy] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    supabase.from('tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(2000)
      .then(({ data, error }) => {
        if (!error) setRows(data || []);
        setLoading(false);
      });
  }, []);

  const accById = useMemo(() => new Map((accounts || []).map(a => [a.id, a])), [accounts]);
  const contactById = useMemo(() => new Map((contacts || []).map(c => [c.id, c])), [contacts]);

  const filtered = useMemo(() => {
    let out = rows;
    if (!showDone) out = out.filter(t => t.status !== 'done');
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(t => {
        const acc = t.company_id ? accById.get(t.company_id) : null;
        const c   = t.contact_id ? contactById.get(t.contact_id) : null;
        return (
          (t.title || '').toLowerCase().includes(q)
          || (t.description || '').toLowerCase().includes(q)
          || (acc?.name || '').toLowerCase().includes(q)
          || (c?.name || '').toLowerCase().includes(q)
          || (t.owner || '').toLowerCase().includes(q)
        );
      });
    }
    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const va = sortBy === 'regarding'
        ? (accById.get(a.company_id)?.name || '').toLowerCase()
        : sortBy === 'subject' ? (a.title || '').toLowerCase()
        : sortBy === 'description' ? (a.description || '').toLowerCase()
        : sortBy === 'priority' ? (a.priority || 'normal')
        : (a.due_date || '');
      const vb = sortBy === 'regarding'
        ? (accById.get(b.company_id)?.name || '').toLowerCase()
        : sortBy === 'subject' ? (b.title || '').toLowerCase()
        : sortBy === 'description' ? (b.description || '').toLowerCase()
        : sortBy === 'priority' ? (b.priority || 'normal')
        : (b.due_date || '');
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
    return out;
  }, [rows, showDone, query, sortBy, sortDir, accById, contactById]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 14, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Tasks</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
          {filtered.length} {showDone ? 'total' : 'open'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="searchfield" style={{ width: 240 }}>
            <I.search />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Filter tasks…" />
            {query && <button className="icon-btn tiny" onClick={() => setQuery('')}><I.close /></button>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            Show completed
          </label>
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto',
        border: '0.5px solid var(--sep)', borderRadius: 8,
        background: 'var(--bg-1)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-2)' }}>
            <tr>
              {[
                ['regarding',  'Regarding',  220],
                ['subject',    'Subject',    360],
                ['description','Description',420],
                ['priority',   'Priority',   100],
                ['due_date',   'Start Date', 140],
              ].map(([key, label, w]) => (
                <th key={key} onClick={() => toggleSort(key)}
                  style={{
                    padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                    borderBottom: '0.5px solid var(--sep)',
                    fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    width: w,
                  }}>
                  {label}{sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ▾'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>No tasks</td></tr>
            )}
            {filtered.map(t => {
              const acc = t.company_id ? accById.get(t.company_id) : null;
              const contact = t.contact_id ? contactById.get(t.contact_id) : null;
              const regarding = acc?.name || contact?.name || '—';
              const priority = (t.priority || 'Normal').replace(/^\w/, c => c.toUpperCase());
              const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
              return (
                <tr key={t.id}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '0.5px solid var(--sep)',
                    opacity: t.status === 'done' ? 0.55 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px 12px', color: 'var(--accent)' }}>
                    {regarding}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--accent)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                    {t.title || '(untitled)'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-2)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(t.description || '').replace(/\s+/g, ' ').slice(0, 200)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 3,
                      background: priority === 'High' ? 'var(--warn-tint)' : priority === 'Low' ? 'var(--fill-2)' : 'var(--fill-1)',
                      color: priority === 'High' ? 'var(--warn)' : 'var(--text-2)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {priority}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: overdue && t.status !== 'done' ? 'var(--danger)' : 'var(--text-2)' }}>
                    {fmtDate(t.due_date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
