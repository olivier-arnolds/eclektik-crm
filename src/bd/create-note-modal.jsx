import { useState, useMemo, useEffect, useRef } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Quick-note modal: turns selected text into a comms row with channel='note'
// attached to an account (via company_id). Shown in Recent Comms of the 360 view.
// Props:
//   text: string — the selected text (becomes body_preview, first 80 chars → subject)
//   accounts: array — for picker
//   defaultAccount: optional pre-matched account
//   onClose: () => void
//   onCreated: () => void (refetch trigger)
export default function CreateNoteModal({ text, accounts, defaultAccount, onClose, onCreated }) {
  const [accountId, setAccountId] = useState(defaultAccount?.id || '');
  const [query, setQuery] = useState(defaultAccount?.name || '');
  const [showList, setShowList] = useState(false);
  const [subject, setSubject] = useState(() => (text || '').trim().slice(0, 80));
  const [body, setBody] = useState(text || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!defaultAccount) inputRef.current?.focus(); }, [defaultAccount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (accounts || [])
      .filter(a => (a.name || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [accounts, query]);

  const save = async () => {
    if (!accountId || !body.trim()) return;
    setSaving(true);
    const userEmail = (typeof window !== 'undefined' && localStorage.getItem('user_email')) || 'Olivier';
    const { error } = await supabase.from('comms').insert({
      company_id: accountId,
      channel: 'note',
      direction: 'note',
      subject: subject.trim().slice(0, 200) || 'Note',
      body_preview: body.trim(),
      owner: userEmail,
      sent_at: new Date().toISOString(),
      is_read: true,
    });
    setSaving(false);
    if (error) {
      alert('Save failed: ' + error.message + '\n\nCheck that the `company_id` column exists on the `comms` table.');
      return;
    }
    if (onCreated) onCreated();
    onClose();
  };

  const picked = accounts?.find(a => a.id === accountId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520, display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Create note from selection</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Account</label>
            {picked && defaultAccount ? (
              <div style={{
                marginTop: 4, padding: '8px 10px', borderRadius: 6,
                background: 'var(--fill-1)', border: '0.5px solid var(--sep)',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ flex: 1 }}>{picked.name}</span>
                <button className="btn-ghost tiny" onClick={() => { setAccountId(''); setQuery(''); setShowList(true); }}>
                  Change
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', marginTop: 4 }}>
                <input ref={inputRef} value={query}
                  onChange={e => { setQuery(e.target.value); setShowList(true); setAccountId(''); }}
                  onFocus={() => setShowList(true)}
                  placeholder="Search account…"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                    color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    fontFamily: 'var(--font)', boxSizing: 'border-box',
                  }} />
                {showList && filtered.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
                    background: 'var(--bg-1)', border: '0.5px solid var(--sep)',
                    borderRadius: 6, boxShadow: 'var(--shadow-2)', zIndex: 10,
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {filtered.map(a => (
                      <div key={a.id}
                        onClick={() => { setAccountId(a.id); setQuery(a.name); setShowList(false); }}
                        style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {a.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6, marginTop: 4,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                color: 'var(--text-1)', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font)', boxSizing: 'border-box',
              }} />
          </div>

          <div>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Note</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              style={{
                width: '100%', padding: 10, borderRadius: 6, marginTop: 4,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                color: 'var(--text-1)', fontSize: 12, fontFamily: 'var(--font)',
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
              }} />
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!accountId || !body.trim() || saving}>
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  );
}
