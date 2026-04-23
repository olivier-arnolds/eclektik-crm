import { useState, useEffect, useMemo } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

export default function AddContactModal({ account, onClose, onCreated, initialName, initialEmail, initialRole, initialLinkedIn, initialPhone }) {
  const [fullName, setFullName] = useState(initialName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [role, setRole] = useState(initialRole || '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedIn || '');
  const [phone] = useState(initialPhone || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // Account picker state (only when caller didn't pass an account prop).
  // If account prop is given → locked to that account.
  const locked = !!account?.id;
  const [pickedAccount, setPickedAccount] = useState(account || null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [accQuery, setAccQuery] = useState('');
  const [accPickerOpen, setAccPickerOpen] = useState(false);

  useEffect(() => {
    if (locked) return;
    supabase.from('companies').select('id,name,type').neq('stage', 'Inactive').order('name')
      .then(({ data }) => setAllAccounts(data || []));
  }, [locked]);

  // Suggest an account based on email domain if no account picked yet
  useEffect(() => {
    if (locked || pickedAccount || !email) return;
    const domain = (email.split('@')[1] || '').toLowerCase();
    if (!domain) return;
    const match = allAccounts.find(a => {
      const web = (a.name || '').toLowerCase();
      // Basic: name contains domain prefix (e.g. "godaddy" matches "GoDaddy")
      const prefix = domain.split('.')[0];
      return web.includes(prefix) && prefix.length >= 3;
    });
    if (match) setPickedAccount(match);
  }, [email, locked, pickedAccount, allAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = accQuery.trim().toLowerCase();
    const list = q
      ? allAccounts.filter(a => a.name.toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q))
      : allAccounts;
    return list.slice(0, 20);
  }, [allAccounts, accQuery]);

  const canSave = fullName.trim().length > 0;

  const normalizeUrl = (url) => {
    if (!url) return null;
    const t = url.trim();
    if (!t) return null;
    return t.split('?')[0].replace(/\/$/, '');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus('Creating contact…');
    const nameParts = fullName.trim().split(' ');
    const first = nameParts[0] || '';
    const last = nameParts.slice(1).join(' ') || '';

    const { data: inserted, error } = await supabase.from('contacts').insert({
      full_name: fullName.trim(),
      first_name: first,
      last_name: last,
      email: email.trim() || null,
      phone: (phone || '').trim() || null,
      title: role.trim() || null,
      linkedin_url: normalizeUrl(linkedinUrl),
      company_id: pickedAccount?.id || null,
      company_name: pickedAccount?.name || null,
      source: 'Manual add',
      stage: 'Active',
      owner: 'MVG',
    }).select().single();

    if (error) {
      setSaving(false);
      alert('Failed to create contact: ' + error.message);
      return;
    }

    if (inserted?.id && (linkedinUrl.trim() || email.trim())) {
      setStatus('Enriching via LinkedIn/Surfe…');
      try {
        const enrichResp = await fetch('/api/surfe-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'contacts', ids: [inserted.id] }),
        });
        const enrichData = await enrichResp.json();
        if (enrichData.surfeResponse?.enrichmentID) {
          await new Promise(r => setTimeout(r, 4000));
          await fetch(`/api/surfe-poll?enrichmentID=${enrichData.surfeResponse.enrichmentID}&type=contacts`);
        }
      } catch (e) {
        console.warn('Auto-enrich failed:', e);
      }
    }

    setSaving(false);
    if (onCreated) onCreated(inserted);
  };

  const fieldStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };
  const label = {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.plus />
          <span>New contact{locked && account?.name ? ` — ${account.name}` : ''}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={label}>Full name *</div>
            <input autoFocus style={fieldStyle} value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Jane Doe" />
          </div>
          <div>
            <div style={label}>Email</div>
            <input style={fieldStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jane@company.com" />
          </div>

          {/* Account picker: hidden when caller locked us to a specific account */}
          {!locked && (
            <div>
              <div style={{ ...label, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Account</span>
                {pickedAccount && (
                  <button onClick={() => setPickedAccount(null)}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
                    × clear
                  </button>
                )}
              </div>
              {pickedAccount && !accPickerOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 6, background: 'var(--accent-tint)', color: 'var(--accent)' }}>
                  <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pickedAccount.name}
                  </span>
                  {pickedAccount.type && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{pickedAccount.type}</span>}
                  <button className="btn-ghost tiny" onClick={() => setAccPickerOpen(true)}>Change</button>
                </div>
              ) : (
                <div>
                  <input style={fieldStyle} value={accQuery}
                    onChange={e => { setAccQuery(e.target.value); setAccPickerOpen(true); }}
                    onFocus={() => setAccPickerOpen(true)}
                    placeholder="Search account by name or type…" />
                  {accPickerOpen && filteredAccounts.length > 0 && (
                    <div style={{
                      border: '0.5px solid var(--sep)', borderRadius: 6, marginTop: 4,
                      background: 'var(--bg-1)', maxHeight: 200, overflowY: 'auto',
                    }}>
                      {filteredAccounts.map(a => (
                        <div key={a.id} onClick={() => { setPickedAccount(a); setAccPickerOpen(false); setAccQuery(''); }}
                          style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontSize: 12, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                          {a.type && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!pickedAccount && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 4 }}>
                      Leave empty to create contact without account — you can link later.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={label}>Role / title</div>
            <input style={fieldStyle} value={role} onChange={e => setRole(e.target.value)}
              placeholder="Head of HR" />
          </div>
          <div>
            <div style={label}>LinkedIn URL</div>
            <input style={fieldStyle} value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/jane-doe" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            After saving, extra data (email if missing, profile details) is fetched automatically via LinkedIn/Surfe.
          </div>
          {status && <div style={{ fontSize: 11, color: 'var(--accent)' }}>⟳ {status}</div>}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save & enrich'}
          </button>
        </div>
      </div>
    </div>
  );
}
