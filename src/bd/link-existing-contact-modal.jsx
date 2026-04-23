import { useState, useMemo, useEffect, useRef } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Link an existing contact (from anywhere in the CRM) to this account.
// Updates the contact's company_id (and company_name) — effectively a move.
export default function LinkExistingContactModal({ account, contacts, onClose, onLinked }) {
  const [query, setQuery] = useState('');
  const [linking, setLinking] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (contacts || [])
      .filter(c => c.accountId !== account?.id) // exclude already at this account
      .filter(c => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const role = (c.role || '').toLowerCase();
        const company = (c.account || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q) || company.includes(q);
      })
      .slice(0, 30);
  }, [query, contacts, account?.id]);

  const handleLink = async (contact) => {
    setLinking(contact.id);
    const { error } = await supabase.from('contacts').update({
      company_id: account.id,
      company_name: account.name,
    }).eq('id', contact.id);
    setLinking(null);
    if (error) {
      alert('Failed: ' + error.message);
      return;
    }
    if (onLinked) onLinked(contact);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.search />
          <span>Link existing contact — {account?.name}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Search all contacts in the CRM. Pick one to move them to <b>{account?.name}</b>
            {' '}(their current account link will be replaced).
          </div>

          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email, role, or current company…"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
              color: 'var(--text-1)', fontSize: 13, outline: 'none',
              fontFamily: 'var(--font)', boxSizing: 'border-box',
            }} />

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {query.trim() === '' && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
                Type at least one character to search…
              </div>
            )}
            {query.trim() && results.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                No matches found.
              </div>
            )}
            {results.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: 8, border: '0.5px solid var(--sep)', borderRadius: 6,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: c.avatarBg || 'var(--fill-2)', color: c.avatarColor || 'var(--text-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, flexShrink: 0,
                }}>
                  {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.account && <span>{c.account}</span>}
                    {c.role && <><span>·</span><span>{c.role}</span></>}
                  </div>
                  {c.email && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                </div>
                <button className="btn-primary tiny" onClick={() => handleLink(c)} disabled={linking === c.id}>
                  {linking === c.id ? 'Linking…' : 'Link'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
