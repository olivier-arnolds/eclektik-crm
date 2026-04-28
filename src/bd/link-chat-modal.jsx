import { useEffect, useMemo, useRef, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Modal to link a Teams chat thread to an account.
// On save: insert into chat_account_links (or no-op if already linked).
// To unlink: clicking 'Unlink' deletes the existing link.
export default function LinkChatModal({ chat, currentLink, accounts, onClose, onSaved }) {
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (accounts || [])
      .filter(a => (a.name || '').toLowerCase().includes(q))
      .slice(0, 12);
  }, [accounts, query]);

  const link = async (accId) => {
    setSaving(true);
    // Remove any existing link for this chat (simplest: one chat → one account)
    await supabase.from('chat_account_links').delete().eq('chat_id', chat.id);
    const { error } = await supabase.from('chat_account_links').insert({
      chat_id: chat.id,
      company_id: accId,
      topic: chat.subject || chat.from || null,
      created_by: localStorage.getItem('user_email') || null,
    });
    setSaving(false);
    if (error) { alert('Failed: ' + error.message); return; }
    if (onSaved) onSaved();
    onClose();
  };

  const unlink = async () => {
    setSaving(true);
    const { error } = await supabase.from('chat_account_links').delete().eq('chat_id', chat.id);
    setSaving(false);
    if (error) { alert('Failed: ' + error.message); return; }
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Link Teams chat to account</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: 8, borderRadius: 6,
            background: 'var(--fill-1)', border: '0.5px solid var(--sep)',
            fontSize: 12,
          }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Chat</div>
            <div>{chat.subject || chat.from || '(unknown)'}</div>
          </div>

          {currentLink && (
            <div style={{
              padding: 8, borderRadius: 6,
              background: 'var(--accent-tint)', border: '0.5px solid var(--accent)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            }}>
              <span style={{ flex: 1 }}>Currently linked to: <b>{currentLink.accountName}</b></span>
              <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }}
                onClick={unlink} disabled={saving}>× Unlink</button>
            </div>
          )}

          <div>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={currentLink ? 'Search to relink to a different account…' : 'Search account…'}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                color: 'var(--text-1)', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font)', boxSizing: 'border-box',
              }} />
            {filtered.length > 0 && (
              <div style={{
                marginTop: 4, maxHeight: 240, overflowY: 'auto',
                border: '0.5px solid var(--sep)', borderRadius: 6, background: 'var(--bg-1)',
              }}>
                {filtered.map(a => (
                  <div key={a.id} onClick={() => link(a.id)}
                    style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ flex: 1 }}>{a.name}</span>
                    {a.type && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
