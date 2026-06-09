import { useEffect, useMemo, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';
import { graphGet } from '../lib/graph';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/apiFetch';

// First names of CRM users (extend if more team members onboard).
const TEAM = ['Marco', 'Olivier', 'Yarmilla'];

function firstNameFromSession(session) {
  const full = session?.user?.user_metadata?.full_name || '';
  if (full) return full.split(' ')[0];
  const email = session?.user?.email || '';
  const local = email.split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
}

// "Create task with AI suggestion" modal.
// Workflow:
//  1. Fetch full body for the email (Graph) if we don't have it.
//  2. POST {subject, fromName, body} → /api/suggest-task → {title, description, priority, due_date_iso}.
//  3. Pre-fill an editable form with the suggestion + a pre-resolved account.
//  4. User reviews/edits → Save inserts into tasks.
export default function SuggestTaskModal({ comm, accounts, contacts, onClose, onCreated }) {
  const { session } = useAuth();
  const defaultOwner = useMemo(() => {
    const name = firstNameFromSession(session);
    return TEAM.includes(name) ? name : (TEAM[0] || '');
  }, [session]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [dueDate, setDueDate] = useState('');
  const [owner, setOwner] = useState(defaultOwner);

  // Account: prefer comm.accountId (already matched), else try sender domain.
  const matchedAccount = useMemo(() => {
    if (comm?.accountId) return accounts.find(a => a.id === comm.accountId) || null;
    const sender = (comm?.fromAddress || '').toLowerCase();
    if (!sender) return null;
    const domain = (sender.split('@')[1] || '').toLowerCase();
    return (accounts || []).find(a => {
      const wd = (a.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      return wd && (wd === domain || domain.endsWith('.' + wd));
    }) || null;
  }, [comm, accounts]);
  const [accountId, setAccountId] = useState(matchedAccount?.id || '');
  const [accountQuery, setAccountQuery] = useState(matchedAccount?.name || '');
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const matchedContact = useMemo(() => {
    const sender = (comm?.fromAddress || '').toLowerCase();
    if (!sender) return null;
    return (contacts || []).find(c => (c.email || '').toLowerCase() === sender) || null;
  }, [comm, contacts]);

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase();
    if (!q) return [];
    return (accounts || []).filter(a => (a.name || '').toLowerCase().includes(q)).slice(0, 10);
  }, [accounts, accountQuery]);

  // Fetch suggestion
  useEffect(() => {
    if (!comm) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // Get the email body. Graph emails have only the preview client-side;
      // pull the full body when possible.
      let body = comm.preview || comm.bodyPreview || '';
      const isGraph = comm.id && /^[A-Za-z0-9=+/_-]{40,}$/.test(comm.id);
      if (isGraph && comm.channel === 'email') {
        try {
          const res = await graphGet(`/me/messages/${comm.id}?$select=body`);
          if (res?.body?.content) body = res.body.content;
        } catch (_) { /* fall back to preview */ }
      }
      if (cancelled) return;

      try {
        const r = await apiFetch('/api/suggest-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: comm.subject || '',
            fromName: comm.from || '',
            body,
          }),
        });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`AI ${r.status}: ${txt.slice(0, 200)}`);
        }
        const sug = await r.json();
        if (cancelled) return;
        setTitle(sug.title || '');
        setDescription(sug.description || '');
        setPriority(sug.priority || 'Normal');
        setDueDate(sug.due_date_iso || '');
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to generate suggestion');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [comm]);

  const save = async () => {
    if (!title.trim()) { alert('Title required'); return; }
    const { error: err } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      status: 'pending',
      priority,
      due_date: dueDate || null,
      company_id: accountId || null,
      contact_id: matchedContact?.id || null,
      owner: owner || null,
    });
    if (err) { alert('Save failed: ' + err.message); return; }
    if (onCreated) onCreated();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨ Create task from email</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: 8, borderRadius: 6, background: 'var(--fill-1)', border: '0.5px solid var(--sep)',
            fontSize: 11, color: 'var(--text-2)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Source email
            </div>
            <div style={{ fontWeight: 500 }}>{comm?.subject || '(no subject)'}</div>
            <div style={{ color: 'var(--text-3)' }}>{comm?.from} {comm?.fromAddress && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>&lt;{comm.fromAddress}&gt;</span>}</div>
          </div>

          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              ✨ Reading the latest message and drafting a task…
            </div>
          )}
          {error && (
            <div style={{ padding: 10, borderRadius: 6, background: 'var(--warn-tint)', color: 'var(--warn)', fontSize: 11 }}>
              {error}. You can still fill in the task manually.
            </div>
          )}

          {!loading && (
            <>
              <div>
                <div style={lblStyle}>Title</div>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Task title…" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={lblStyle}>Due date</div>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={lblStyle}>Priority</div>
                  <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <div style={lblStyle}>For</div>
                  <select value={owner} onChange={e => setOwner(e.target.value)} style={inputStyle}>
                    {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lblStyle}>Account</div>
                  {accountId && !accountPickerOpen ? (
                    <div style={{
                      ...inputStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                      cursor: 'pointer',
                    }} onClick={() => setAccountPickerOpen(true)}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(accounts || []).find(a => a.id === accountId)?.name || '—'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>change</span>
                    </div>
                  ) : (
                    <input autoFocus={accountPickerOpen} value={accountQuery}
                      onChange={e => { setAccountQuery(e.target.value); setAccountId(''); }}
                      placeholder="Search account…" style={inputStyle} />
                  )}
                </div>
              </div>
              {accountPickerOpen && filteredAccounts.length > 0 && (
                <div style={{
                  marginTop: -4, maxHeight: 160, overflowY: 'auto',
                  border: '0.5px solid var(--sep)', borderRadius: 6, background: 'var(--bg-1)',
                }}>
                  {filteredAccounts.map(a => (
                    <div key={a.id}
                      onClick={() => { setAccountId(a.id); setAccountQuery(a.name); setAccountPickerOpen(false); }}
                      style={{ padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {a.name}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div style={lblStyle}>Description</div>
                <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Notes / context…"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font)' }} />
              </div>
            </>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading || !title.trim()}>
            ✓ Create task
          </button>
        </div>
      </div>
    </div>
  );
}

const lblStyle = {
  fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4,
};
const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 5,
  border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
  color: 'var(--text-1)', fontSize: 12, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font)',
};
