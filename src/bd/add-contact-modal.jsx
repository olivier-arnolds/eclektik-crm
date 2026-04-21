import { useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

export default function AddContactModal({ account, onClose, onCreated, initialName, initialEmail }) {
  const [fullName, setFullName] = useState(initialName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [role, setRole] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

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
      title: role.trim() || null,
      linkedin_url: normalizeUrl(linkedinUrl),
      company_id: account?.id || null,
      company_name: account?.name || null,
      source: 'Manual add',
      stage: 'Active',
      owner: 'MVG',
    }).select().single();

    if (error) {
      setSaving(false);
      alert('Failed to create contact: ' + error.message);
      return;
    }

    // Auto-enrich via Surfe if we have anything to look up
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
        console.warn('Auto-enrich failed (background job will catch up):', e);
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
          <span>New contact{account?.name ? ` — ${account.name}` : ''}</span>
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
