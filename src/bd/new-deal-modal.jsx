import { useState } from 'react';
import { supabase } from '../supabase';

// Defined OUTSIDE the component so React doesn't re-create the wrapper
// every render (which was unmounting/remounting inputs on every keystroke
// and stealing focus).
function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>{label}</span>
      {children}
    </div>
  );
}

export default function NewDealModal({ accounts, contacts, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [contactIds, setContactIds] = useState([]);
  const [dealType, setDealType] = useState('');
  const [source, setSource] = useState('Inbound');
  const [stage, setStage] = useState('qualify');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const accountContacts = accountId ? contacts.filter(c => c.accountId === accountId) : [];

  const pickAccount = (id) => { setAccountId(id); setContactIds([]); };
  const toggleContact = (id) => setContactIds(cs => cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id]);

  const canSave = title.trim() && accountId;

  const handleAdd = async () => {
    if (!canSave) return;
    setSaving(true);
    const numericValue = parseInt((value || '').replace(/\D/g, '')) || 0;
    // New deals always start as leads. The leads table doesn't have a
    // contact_id column — contacts get linked via contacts.lead_id afterwards.
    const row = {
      full_name: title.trim(),
      topic: title.trim(),
      company_id: accountId,
      est_revenue: numericValue,
      sub_status: stage,
      product_line: dealType || null,
      source: source || null,
      status: 'New',
    };
    const { error } = await supabase.from('leads').insert(row);
    setSaving(false);
    if (error) {
      alert('Failed to create deal: ' + error.message);
      return;
    }
    if (onCreated) onCreated();
  };

  const chipSingle = (options, selected, onPick) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {options.map(o => (
        <button key={o} className={`chip ${selected === o ? 'chip-on' : ''}`}
          style={{ fontSize: 11 }}
          onClick={() => onPick(o)}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 420, maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">New deal</div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <F label="Client">
            <select value={accountId} onChange={e => pickAccount(e.target.value)}
              style={{ background: 'var(--fill-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text-1)', fontSize: 12, width: '100%' }}>
              <option value="">Select account…</option>
              {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </F>

          <F label="Topic">
            <input placeholder="Deal title…" value={title} onChange={e => setTitle(e.target.value)}
              style={{ background: 'var(--fill-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text-1)', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
          </F>

          {accountContacts.length > 0 && (
            <F label={`Contact${contactIds.length > 1 ? 's' : ''}`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {accountContacts.map(c => (
                  <button key={c.id}
                    className={`chip ${contactIds.includes(c.id) ? 'chip-on' : ''}`}
                    style={{ fontSize: 11 }}
                    onClick={() => toggleContact(c.id)}>
                    {c.name}
                    {c.role && <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 3 }}>{c.role}</span>}
                  </button>
                ))}
              </div>
            </F>
          )}

          <F label="Type / Product line">
            {chipSingle(['Glint', 'ROI', 'ROE', 'Other'], dealType, setDealType)}
          </F>

          <F label="Source">
            {chipSingle(['Inbound', 'Outbound', 'Referral', 'Renewal', 'Platform'], source, setSource)}
          </F>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="Stage">
              <select value={stage} onChange={e => setStage(e.target.value)}
                style={{ background: 'var(--fill-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text-1)', fontSize: 12 }}>
                <option value="qualify">Qualify</option>
                <option value="develop">Develop</option>
                <option value="proposal">Proposal</option>
                <option value="close">Close</option>
              </select>
            </F>
            <F label="Value (€)">
              <input placeholder="0" value={value} onChange={e => setValue(e.target.value)}
                style={{ background: 'var(--fill-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text-1)', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
            </F>
          </div>

        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canSave || saving} onClick={handleAdd}>
            {saving ? 'Saving…' : 'Add deal'}
          </button>
        </div>
      </div>
    </div>
  );
}
