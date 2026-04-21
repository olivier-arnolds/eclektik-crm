import { useState } from 'react';
import { I } from './atoms';
import { insertRow } from '../hooks/useSupabase';

export default function AddAccountModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const canSave = name.trim().length > 0 && (website.trim() || linkedinUrl.trim());

  const normalizeUrl = (url) => {
    if (!url) return null;
    const t = url.trim();
    if (!t) return null;
    if (!/^https?:\/\//i.test(t)) return 'https://' + t;
    return t;
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus('Creating account…');
    const { data: newCompany, error } = await insertRow('companies', {
      name: name.trim(),
      website: normalizeUrl(website),
      linkedin_url: normalizeUrl(linkedinUrl),
      type: 'Prospect',
      stage: 'Active',
      owner: 'MVG',
    });
    if (error) {
      setSaving(false);
      alert('Failed to create account: ' + error.message);
      return;
    }

    // Auto-enrich via Surfe (best-effort)
    if (newCompany?.id) {
      setStatus('Enriching via Surfe…');
      try {
        const enrichResp = await fetch('/api/surfe-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'companies', ids: [newCompany.id] }),
        });
        const enrichData = await enrichResp.json();
        if (enrichData.surfeResponse?.enrichmentID) {
          // Brief poll attempt to catch fast results
          await new Promise(r => setTimeout(r, 4000));
          await fetch(`/api/surfe-poll?enrichmentID=${enrichData.surfeResponse.enrichmentID}&type=companies`);
        }
      } catch (e) {
        console.warn('Auto-enrich failed (background job will catch up):', e);
      }
    }

    setSaving(false);
    if (onCreated) onCreated(newCompany);
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
          <span>New account</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Fill in the basics — we'll auto-enrich industry, size, description, and more via Surfe.
          </div>

          <div>
            <div style={label}>Company name *</div>
            <input autoFocus style={fieldStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="Acme Corporation" />
          </div>

          <div>
            <div style={label}>Website</div>
            <input style={fieldStyle} value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="acme.com or https://acme.com" />
          </div>

          <div>
            <div style={label}>LinkedIn URL</div>
            <input style={fieldStyle} value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/company/acme" />
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            At least one of Website or LinkedIn URL is required for enrichment.
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
