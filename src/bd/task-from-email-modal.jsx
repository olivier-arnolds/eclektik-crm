import { useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Creates a task based on an email. Pre-fills title from subject, notes
// from the preview/body, due date (default tomorrow), and auto-links to
// the sender's account when known.
export default function TaskFromEmailModal({ comm, contacts, accounts, onClose, onCreated }) {
  const senderContact = (contacts || []).find(c =>
    c.email && comm?.fromAddress &&
    c.email.toLowerCase() === comm.fromAddress.toLowerCase()
  );
  const defaultAccount = senderContact?.accountId || null;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  const [title, setTitle] = useState(comm?.subject ? `Follow up: ${comm.subject}` : 'Follow up email');
  const [notes, setNotes] = useState(comm?.preview || '');
  const [dueDate, setDueDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(defaultAccount);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const row = {
      title: title.trim(),
      description: notes || null,
      due_date: dueDate,
      status: 'pending',
      company_id: accountId || null,
    };
    const { error } = await supabase.from('tasks').insert(row);
    setSaving(false);
    if (error) {
      alert('Failed to create task: ' + error.message);
      return;
    }
    if (onCreated) onCreated();
  };

  const fieldStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box', resize: 'vertical',
  };
  const label = {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.check />
          <span>Create task from email</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comm?.from && (
            <div className="modal-body-sub" style={{ fontSize: 11 }}>
              Based on email from <b>{comm.from}</b>
            </div>
          )}

          <div>
            <div style={label}>Task title *</div>
            <input autoFocus style={fieldStyle} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?" />
          </div>

          <div>
            <div style={label}>Notes</div>
            <textarea rows={3} style={fieldStyle} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional context (pre-filled from email preview)…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={label}>Due date</div>
              <input type="date" style={fieldStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <div style={label}>Link to account</div>
              <select style={fieldStyle} value={accountId || ''} onChange={e => setAccountId(e.target.value || null)}>
                <option value="">— none —</option>
                {[...(accounts || [])].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {senderContact && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Auto-linked to {senderContact.name}'s account.
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}
