import { useState } from 'react';
import { I, fmtMoney, OwnerDot, AccountMark, STAGE_TINT, OWNERS } from './atoms';
import { updateRow } from '../hooks/useSupabase';
import { ConvertLeadModal, DisqualifyLeadModal } from './convert-disqualify-modal';
import PlaybookEnrollModal from './playbook-enroll-modal';

export default function DealDetailModal({ deal, accounts, contacts, rawItems, onClose, onCompose, refetch }) {
  const [showConvert, setShowConvert] = useState(false);
  const [showDisqualify, setShowDisqualify] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');

  const account = accounts.find(a => a.id === deal.accountId);
  const dealContacts = contacts.filter(c => deal.contactIds?.includes(c.id));
  const primaryContact = dealContacts[0];

  // Suggest matching accounts based on deal title + notes.
  // Match if any whole word of length ≥ 3 in account.name appears in the deal text.
  const accountSuggestions = (() => {
    if (account) return [];
    const haystack = `${deal.title || ''} ${deal.description || ''} ${deal.notes || ''}`.toLowerCase();
    if (!haystack.trim()) return [];
    return (accounts || []).filter(a => {
      const words = (a.name || '').toLowerCase().split(/[\s\-,&\/]+/).filter(w => w.length >= 3);
      return words.some(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`).test(haystack));
    }).slice(0, 4);
  })();

  const linkAccount = async (accId) => {
    await updateRow(deal.table, deal.id, { company_id: accId });
    setLinkingAccount(false);
    setLinkQuery('');
    if (refetch) refetch();
  };

  const filteredLink = (linkQuery || '').trim().length >= 1
    ? (accounts || []).filter(a => a.name.toLowerCase().includes(linkQuery.trim().toLowerCase())).slice(0, 12)
    : [];

  const isLead = deal.funnelStage === 'lead';

  const updateField = async (field, value) => {
    await updateRow(deal.table, deal.id, { [field]: value });
    if (refetch) refetch();
    setEditingField(null);
  };

  const F = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AccountMark account={account} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingField === 'title' ? (
              <input autoFocus defaultValue={deal.title}
                onBlur={(e) => updateField(deal.table === 'opportunities' ? 'topic' : 'full_name', e.target.value || deal.title)}
                onKeyDown={(e) => { if (e.key === 'Enter') updateField(deal.table === 'opportunities' ? 'topic' : 'full_name', e.target.value || deal.title); if (e.key === 'Escape') setEditingField(null); }}
                style={{ width: '100%', padding: '2px 4px', borderRadius: 4, border: '0.5px solid var(--accent)', background: 'var(--fill-1)', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />
            ) : (
              <div onClick={() => setEditingField('title')}
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                title="Click to rename">
                {deal.title}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {account?.name ? (
                <span>{account.name}</span>
              ) : (
                <button
                  onClick={() => setLinkingAccount(v => !v)}
                  style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  + Link account
                </button>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close /></button>
        </div>

        {linkingAccount && !account && (
          <div style={{
            padding: 10, margin: '0 16px', borderBottom: '0.5px solid var(--sep)',
            background: 'var(--fill-1)', borderRadius: 6, marginTop: 8,
          }}>
            {accountSuggestions.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Suggestions (from notes/title)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {accountSuggestions.map(a => (
                    <button key={a.id} className="btn-ghost tiny"
                      onClick={() => linkAccount(a.id)}
                      style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)' }}>
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input autoFocus value={linkQuery} onChange={e => setLinkQuery(e.target.value)}
              placeholder="Search accounts to link…"
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 5,
                border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
                color: 'var(--text-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }} />
            {filteredLink.length > 0 && (
              <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
                {filteredLink.map(a => (
                  <div key={a.id} onClick={() => linkAccount(a.id)}
                    style={{ padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ flex: 1 }}>{a.name}</span>
                    {a.type && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onCompose && primaryContact?.email && (
              <button className="btn-primary tiny" onClick={() => onCompose({ to: primaryContact.email, contact: primaryContact })}>
                <I.send /> Email
              </button>
            )}
            {onCompose && (
              <button className="btn-ghost tiny" onClick={() => onCompose({ channel: 'linkedin', contact: primaryContact })}>
                LinkedIn
              </button>
            )}
            <button className="btn-ghost tiny" onClick={() => setShowEnroll(true)}>
              <I.sparkle /> Enroll in playbook
            </button>
            {isLead && (
              <>
                <button className="btn-primary tiny" style={{ background: 'var(--good)' }} onClick={() => setShowConvert(true)}>
                  Convert to opportunity
                </button>
                <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }} onClick={() => setShowDisqualify(true)}>
                  Disqualify
                </button>
              </>
            )}
          </div>

          {/* Core fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Stage">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="stage-pill stage-lead" style={{ background: `oklch(92% 0.05 ${STAGE_TINT[deal.stage]?.hue || 220})`, color: `oklch(40% 0.12 ${STAGE_TINT[deal.stage]?.hue || 220})` }}>
                  {STAGE_TINT[deal.stage]?.label || deal.stage}
                </span>
              </div>
            </F>
            <F label="Owner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <OwnerDot id={deal.owner} />
                <span>{deal.owner}</span>
              </div>
            </F>
            <F label="Value">
              {editingField === 'value' ? (
                <input autoFocus type="number" defaultValue={deal.value}
                  onBlur={(e) => updateField('est_revenue', Number(e.target.value) || 0)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateField('est_revenue', Number(e.target.value) || 0); if (e.key === 'Escape') setEditingField(null); }}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, boxSizing: 'border-box' }} />
              ) : (
                <button className="btn-ghost tiny" style={{ justifyContent: 'flex-start', padding: '4px 0' }} onClick={() => setEditingField('value')}>
                  {fmtMoney(deal.value)}
                </button>
              )}
            </F>
            <F label="Probability">
              {editingField === 'probability' ? (
                <input autoFocus type="number" min="0" max="100" defaultValue={deal.probability}
                  onBlur={(e) => updateField('probability', Number(e.target.value) || 0)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateField('probability', Number(e.target.value) || 0); if (e.key === 'Escape') setEditingField(null); }}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, boxSizing: 'border-box' }} />
              ) : (
                <button className="btn-ghost tiny" style={{ justifyContent: 'flex-start', padding: '4px 0' }} onClick={() => setEditingField('probability')}>
                  {deal.probability || 0}%
                </button>
              )}
            </F>
            <F label="Close date">
              {editingField === 'closeDate' ? (
                <input autoFocus type="date" defaultValue={deal.closeDate}
                  onBlur={(e) => updateField(deal.table === 'opportunities' ? 'est_close_date' : 'close_date', e.target.value || null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateField(deal.table === 'opportunities' ? 'est_close_date' : 'close_date', e.target.value || null); if (e.key === 'Escape') setEditingField(null); }}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, boxSizing: 'border-box' }} />
              ) : (
                <button className="btn-ghost tiny" style={{ justifyContent: 'flex-start', padding: '4px 0' }} onClick={() => setEditingField('closeDate')}>
                  {deal.closeDate || '— pick date'}
                </button>
              )}
            </F>
            <F label="Product line">
              <span style={{ fontSize: 12 }}>{deal.dealType || '—'}</span>
            </F>
            <F label="Eclectik team">
              <TeamEditor deal={deal} onSave={(team) => updateField('team', team)} />
            </F>
          </div>

          <F label="Contacts">
            {dealContacts.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No contacts linked</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dealContacts.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, background: 'var(--fill-1)', borderRadius: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{c.name}</div>
                    {c.role && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.role}</div>}
                    {c.email && onCompose && (
                      <button className="icon-btn tiny" onClick={() => onCompose({ to: c.email, contact: c })}><I.send /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </F>

          {deal.description && (
            <F label="Notes">
              <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text-2)', padding: 8, background: 'var(--fill-1)', borderRadius: 6 }}>
                {deal.description}
              </div>
            </F>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>

      {showConvert && (
        <ConvertLeadModal deal={deal} accounts={accounts} rawItems={rawItems}
          onClose={() => setShowConvert(false)}
          onDone={() => { setShowConvert(false); onClose(); if (refetch) refetch(); }} />
      )}
      {showDisqualify && (
        <DisqualifyLeadModal deal={deal} rawItems={rawItems}
          onClose={() => setShowDisqualify(false)}
          onDone={() => { setShowDisqualify(false); onClose(); if (refetch) refetch(); }} />
      )}
      {showEnroll && (
        <PlaybookEnrollModal contact={primaryContact} deal={deal}
          onClose={() => setShowEnroll(false)}
          onEnrolled={() => { /* keep open for multiple enrollments */ }} />
      )}
    </div>
  );
}

// Inline team editor: multi-select of team members (MVG, OA, YK). Saves as
// comma-separated string to tasks/leads/opportunities.team column.
function TeamEditor({ deal, onSave }) {
  const [editing, setEditing] = useState(false);
  const currentTeam = deal.team || [];

  const toggle = (memberId) => {
    const next = currentTeam.includes(memberId)
      ? currentTeam.filter(m => m !== memberId)
      : [...currentTeam, memberId];
    onSave(next.join(', '));
  };

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {currentTeam.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Click to add team…</span>
        ) : (
          currentTeam.map(m => (
            <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <OwnerDot id={m} />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{m}</span>
            </span>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {Object.values(OWNERS).map(o => {
        const on = currentTeam.includes(o.id);
        return (
          <button key={o.id} onClick={() => toggle(o.id)}
            className={`chip ${on ? 'chip-on' : ''}`}
            style={{ fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: o.color, display: 'inline-block' }} />
            {o.id}
          </button>
        );
      })}
      <button className="btn-ghost tiny" onClick={() => setEditing(false)}>Done</button>
    </div>
  );
}
