import { useEffect, useMemo, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Inline edit modal for a task. Shows title, description, due date, owner,
// done toggle, account link, and a delete button.
export default function TaskDetailModal({ taskId, accounts, onClose, refetch }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accQuery, setAccQuery] = useState('');
  const [showAccPicker, setShowAccPicker] = useState(false);

  const [team, setTeam] = useState([]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    supabase.from('tasks').select('*').eq('id', taskId).single()
      .then(({ data }) => { setRow(data); setLoading(false); });
  }, [taskId]);

  // Eclectik team roster for the "With" picker: distinct contacts linked to any
  // account as link_type='eclectik_team'.
  useEffect(() => {
    supabase.from('account_links')
      .select('contact_id, contacts:contact_id(id, full_name, first_name, last_name)')
      .eq('link_type', 'eclectik_team')
      .then(({ data }) => {
        const seen = new Map();
        (data || []).forEach(l => {
          const c = l.contacts;
          if (!c) return;
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.full_name || '';
          if (!name || name.includes('@')) return;        // skip blank / email-as-name junk
          const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
          if (!seen.has(key)) seen.set(key, { id: c.id, name });
        });
        setTeam([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
      });
  }, []);

  const update = async (patch) => {
    setSaving(true);
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId);
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    setRow(r => ({ ...r, ...patch }));
    if (refetch) refetch();
  };

  const account = accounts?.find(a => a.id === row?.company_id);

  const filteredAccs = useMemo(() => {
    const q = accQuery.trim().toLowerCase();
    if (!q) return [];
    return (accounts || []).filter(a => (a.name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [accounts, accQuery]);

  const remove = async () => {
    if (!confirm(`Delete task "${row?.title || ''}"?`)) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    if (refetch) refetch();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Task{saving && <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 11 }}>saving…</span>}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : !row ? (
          <div className="modal-body" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Task not found.</div>
        ) : (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Done toggle + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => {
                const nowDone = row.status !== 'done';
                update({ status: nowDone ? 'done' : 'pending', completed_at: nowDone ? new Date().toISOString() : null });
              }}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  border: '0.5px solid var(--sep)',
                  background: row.status === 'done' ? 'var(--good)' : 'transparent',
                  color: row.status === 'done' ? '#fff' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                ✓
              </button>
              <input value={row.title || ''} onChange={e => setRow(r => ({ ...r, title: e.target.value }))}
                onBlur={e => update({ title: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                placeholder="Task title…"
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 5,
                  border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                  color: 'var(--text-1)', fontSize: 14, fontWeight: 500,
                  outline: 'none', boxSizing: 'border-box',
                  textDecoration: row.status === 'done' ? 'line-through' : 'none',
                }} />
            </div>

            {/* Due date + owner + priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={fieldLabel}>Due date</div>
                <input type="date" value={row.due_date || ''}
                  onChange={e => update({ due_date: e.target.value || null })}
                  style={fieldInput} />
              </div>
              <div>
                <div style={fieldLabel}>Owner</div>
                <input value={row.owner || ''} onChange={e => setRow(r => ({ ...r, owner: e.target.value }))}
                  onBlur={e => update({ owner: e.target.value || null })}
                  placeholder="MVG / OA / YK"
                  style={fieldInput} />
              </div>
              <div>
                <div style={fieldLabel}>Priority</div>
                <select value={row.priority || 'Normal'} onChange={e => update({ priority: e.target.value })}
                  style={fieldInput}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {/* With — an Eclectik team member joining this task */}
            <div>
              <div style={fieldLabel}>With (Eclectik)</div>
              <select value={row.with_contact_id || ''}
                onChange={e => update({ with_contact_id: e.target.value || null })}
                style={fieldInput}>
                <option value="">—</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                {/* keep the current value selectable even if not in the roster */}
                {row.with_contact_id && !team.some(m => m.id === row.with_contact_id) && (
                  <option value={row.with_contact_id}>(linked member)</option>
                )}
              </select>
            </div>

            {/* Account link */}
            <div>
              <div style={fieldLabel}>Account</div>
              {account && !showAccPicker ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 5,
                  border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                  fontSize: 12,
                }}>
                  <span style={{ flex: 1 }}>{account.name}</span>
                  <button className="btn-ghost tiny" onClick={() => setShowAccPicker(true)}>Change</button>
                  <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }}
                    onClick={() => update({ company_id: null })}>× Unlink</button>
                </div>
              ) : (
                <>
                  <input autoFocus={showAccPicker} value={accQuery} onChange={e => setAccQuery(e.target.value)}
                    placeholder="Search account…"
                    style={fieldInput} />
                  {filteredAccs.length > 0 && (
                    <div style={{
                      marginTop: 4, maxHeight: 180, overflowY: 'auto',
                      border: '0.5px solid var(--sep)', borderRadius: 5, background: 'var(--bg-1)',
                    }}>
                      {filteredAccs.map(a => (
                        <div key={a.id}
                          onClick={() => { update({ company_id: a.id }); setShowAccPicker(false); setAccQuery(''); }}
                          style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Description / notes */}
            <div>
              <div style={fieldLabel}>Notes</div>
              <textarea rows={5} value={row.description || ''}
                onChange={e => setRow(r => ({ ...r, description: e.target.value }))}
                onBlur={e => update({ description: e.target.value || null })}
                placeholder="Details, links, follow-ups…"
                style={{ ...fieldInput, resize: 'vertical', fontFamily: 'var(--font)' }} />
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={remove}>🗑 Delete</button>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const fieldLabel = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4,
};
const fieldInput = {
  width: '100%', padding: '6px 8px', borderRadius: 5,
  border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
  color: 'var(--text-1)', fontSize: 12, outline: 'none',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
};
