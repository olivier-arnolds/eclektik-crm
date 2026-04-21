import { useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Inactivate an account (and cascade to linked contacts) with a reason.
// After inactivation the account/contacts are filtered out of BD views.
export default function InactivateAccountModal({ account, contacts, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const linkedContacts = (contacts || []).filter(c => c.accountId === account?.id);
  const canSave = reason.trim().length > 0;

  const handleInactivate = async () => {
    if (!canSave) return;
    setSaving(true);
    const nowIso = new Date().toISOString();

    // 1. Inactivate the company
    const { error: accErr } = await supabase.from('companies').update({
      stage: 'Inactive',
      inactive_reason: reason.trim(),
      inactivated_at: nowIso,
    }).eq('id', account.id);

    if (accErr) {
      setSaving(false);
      alert('Failed to inactivate account: ' + accErr.message);
      return;
    }

    // 2. Cascade: inactivate all linked contacts
    if (linkedContacts.length > 0) {
      const ids = linkedContacts.map(c => c.id);
      await supabase.from('contacts').update({
        stage: 'Inactive',
        inactive_reason: `Company "${account.name}" inactivated: ${reason.trim()}`,
        inactivated_at: nowIso,
      }).in('id', ids);
    }

    setSaving(false);
    if (onDone) onDone();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
          <I.archive />
          <span>Inactivate account</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto', color: 'var(--text-2)' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="modal-body-strong">{account?.name}</div>
          <div className="modal-body-sub">
            This will mark the account as <b>Inactive</b> and hide it from all views.
            {linkedContacts.length > 0 && (
              <> All <b>{linkedContacts.length} linked contact{linkedContacts.length !== 1 ? 's' : ''}</b> will also be inactivated.</>
            )}
            <br />
            Data is preserved in the database and can be restored via SQL if needed.
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>Reason *</div>
            <textarea autoFocus
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Duplicate, lost deal, no longer relevant, closed company…"
              style={{
                width: '100%', padding: 8, borderRadius: 6,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
              }} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" disabled={!canSave || saving}
            style={{ background: 'var(--danger)' }}
            onClick={handleInactivate}>
            {saving ? 'Inactivating…' : 'Inactivate definitively'}
          </button>
        </div>
      </div>
    </div>
  );
}
