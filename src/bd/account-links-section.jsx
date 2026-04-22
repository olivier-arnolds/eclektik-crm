import { useState, useEffect, useMemo, useRef } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Reusable section for Partners or Eclectik Team on an account.
// linkType = 'partner' | 'eclectik_team'
export default function AccountLinksSection({ account, contacts, linkType, label, accent, onOpenContact }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    supabase.from('account_links')
      .select('id, contact_id, role, notes, created_at')
      .eq('account_id', account.id)
      .eq('link_type', linkType)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setLinks(data || []);
        setLoading(false);
      });
  }, [account?.id, linkType]);

  const addLink = async (contactId) => {
    const { data, error } = await supabase.from('account_links').insert({
      account_id: account.id,
      contact_id: contactId,
      link_type: linkType,
      created_by: localStorage.getItem('user_first_name') || 'MVG',
    }).select().single();
    if (error) {
      if (error.code === '23505') {
        alert('This contact is already linked.');
      } else {
        alert('Failed to add: ' + error.message);
      }
      return;
    }
    setLinks(prev => [data, ...prev]);
    setShowPicker(false);
  };

  const removeLink = async (linkId) => {
    if (!confirm('Remove this link?')) return;
    await supabase.from('account_links').delete().eq('id', linkId);
    setLinks(prev => prev.filter(l => l.id !== linkId));
  };

  // Resolve contact details for each link
  const linkedContacts = useMemo(() => {
    const byId = new Map((contacts || []).map(c => [c.id, c]));
    return links.map(l => ({ ...l, contact: byId.get(l.contact_id) })).filter(l => l.contact);
  }, [links, contacts]);

  return (
    <Section label={`${label} · ${linkedContacts.length}`}
      actions={account?.id && (
        <button className="btn-ghost tiny" onClick={() => setShowPicker(p => !p)}>
          <I.plus /> Add
        </button>
      )}>
      {loading && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>Loading…</div>}
      {!loading && linkedContacts.length === 0 && !showPicker && (
        <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>
          No {label.toLowerCase()} linked
        </div>
      )}

      {showPicker && (
        <ContactPicker
          contacts={contacts}
          excludeAccountId={linkType === 'eclectik_team' ? null : account.id}
          alreadyLinkedIds={new Set(links.map(l => l.contact_id))}
          onPick={addLink}
          onCancel={() => setShowPicker(false)}
          accent={accent}
        />
      )}

      {linkedContacts.length > 0 && (
        <div className="contacts-grid" style={{ marginTop: showPicker ? 6 : 0 }}>
          {linkedContacts.map(l => {
            const c = l.contact;
            return (
              <div key={l.id} className="contact-card" style={{ cursor: 'pointer' }}
                onClick={() => onOpenContact && onOpenContact(c.id)}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: c.avatarBg || 'var(--fill-2)', color: c.avatarColor || 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                  {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-role">
                    {c.account || '—'}
                    {c.role ? ` · ${c.role}` : ''}
                  </div>
                </div>
                <button className="icon-btn tiny" style={{ color: 'var(--danger)' }}
                  onClick={(e) => { e.stopPropagation(); removeLink(l.id); }}
                  title="Remove link">
                  <I.close />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function Section({ label, actions, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="acc-section">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="acc-section-head" style={{ flex: 1 }} onClick={() => setOpen(o => !o)}>
          {open ? <I.chevronD /> : <I.chevronR />}
          <span>{label}</span>
        </button>
        {actions && <div style={{ display: 'flex', gap: 4, paddingRight: 14 }}>{actions}</div>}
      </div>
      {open && <div className="acc-section-body">{children}</div>}
    </div>
  );
}

// Inline contact picker with autocomplete
function ContactPicker({ contacts, excludeAccountId, alreadyLinkedIds, onPick, onCancel, accent }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    let list = contacts;
    if (excludeAccountId) list = list.filter(c => c.accountId !== excludeAccountId);
    list = list.filter(c => !alreadyLinkedIds.has(c.id));
    if (q) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
        || (c.account || '').toLowerCase().includes(q)
        || (c.role || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 20);
  }, [contacts, query, excludeAccountId, alreadyLinkedIds]);

  return (
    <div style={{
      border: `0.5px solid ${accent || 'var(--accent)'}`,
      borderRadius: 6, padding: 8, marginBottom: 8,
      background: 'var(--fill-1)',
    }}>
      <input ref={inputRef}
        value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, email, company, role…"
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        style={{
          width: '100%', padding: '6px 8px', borderRadius: 5,
          border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
          color: 'var(--text-1)', fontSize: 12, outline: 'none',
          boxSizing: 'border-box', marginBottom: 6,
        }} />
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {results.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: 6 }}>
            {query ? 'No matches' : 'Start typing to search…'}
          </div>
        )}
        {results.map(c => (
          <div key={c.id} onClick={() => onPick(c.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--fill-3)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>
              {(c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {c.account || '—'}{c.role ? ` · ${c.role}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn-ghost tiny" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
