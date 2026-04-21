import { useState, useEffect } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Editable detail view for a contact. All fields inline-editable, save on blur.
export default function ContactDetailModal({ contactId, onClose, refetch, onCompose }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    supabase.from('contacts').select('*, companies(name, linkedin_url, website)').eq('id', contactId).single()
      .then(({ data, error }) => {
        if (error) { setError(error.message); setLoading(false); return; }
        setRow(data);
        setLoading(false);
      });
  }, [contactId]);

  const saveField = async (field, value) => {
    setSaving(s => ({ ...s, [field]: true }));
    const { error } = await supabase.from('contacts').update({ [field]: value }).eq('id', contactId);
    setSaving(s => ({ ...s, [field]: false }));
    if (error) {
      alert('Save failed: ' + error.message);
      return;
    }
    setRow(r => ({ ...r, [field]: value }));
    if (refetch) refetch();
  };

  if (!contactId) return null;

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Loading contact…</div>
        </div>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Error loading contact</div>
          <div className="modal-body">{error || 'Not found'}</div>
          <div className="modal-actions"><button className="btn-ghost" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  const initials = (row.full_name || `${row.first_name || ''} ${row.last_name || ''}`).trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: 'var(--fill-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
          }}>{initials || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.full_name || 'Unnamed contact'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{row.companies?.name || row.company_name || ''}</div>
          </div>
          {row.email && onCompose && (
            <button className="btn-ghost tiny" onClick={() => onCompose({ to: row.email, contact: row })}>
              <I.send /> Email
            </button>
          )}
          <button className="icon-btn" onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="First name" value={row.first_name} saving={saving.first_name} onSave={(v) => saveField('first_name', v)} />
          <Field label="Last name" value={row.last_name} saving={saving.last_name} onSave={(v) => saveField('last_name', v)} />
          <Field label="Full name" value={row.full_name} saving={saving.full_name} onSave={(v) => saveField('full_name', v)} colspan={2} />
          <Field label="Email" value={row.email} saving={saving.email} onSave={(v) => saveField('email', v)} type="email" colspan={2} />
          <Field label="Phone" value={row.phone} saving={saving.phone} onSave={(v) => saveField('phone', v)} />
          <Field label="Mobile" value={row.mobile} saving={saving.mobile} onSave={(v) => saveField('mobile', v)} />
          <Field label="Role / title" value={row.title} saving={saving.title} onSave={(v) => saveField('title', v)} colspan={2} />
          <LinkedInField
            value={row.linkedin_url}
            saving={saving.linkedin_url}
            onSave={(v) => saveField('linkedin_url', v)}
            firstName={row.first_name || (row.full_name || '').split(' ')[0] || ''}
            lastName={row.last_name || (row.full_name || '').split(' ').slice(1).join(' ') || ''}
            fullName={row.full_name}
            companyName={row.companies?.name || row.company_name || ''}
            companyLinkedIn={row.companies?.linkedin_url}
          />
          <Field label="Gender" value={row.gender} saving={saving.gender} onSave={(v) => saveField('gender', v)} />
          <Field label="Stage" value={row.stage} saving={saving.stage} onSave={(v) => saveField('stage', v)} />
          <Field label="Source" value={row.source || row.event_source} saving={saving.source} onSave={(v) => saveField('source', v)} colspan={2} />
          <Field label="Notes" value={row.notes} saving={saving.notes} onSave={(v) => saveField('notes', v)} type="textarea" colspan={2} />
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Smart LinkedIn URL field: click-to-open if set, otherwise one-click search on LinkedIn
// prefilled with contact's first+last name and the company's LinkedIn slug (if known)
function LinkedInField({ value, saving, onSave, firstName, lastName, fullName, companyName, companyLinkedIn }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = () => {
    setEditing(false);
    if ((draft || '') !== (value || '')) {
      // Normalize: strip tracking params, trailing slash
      const clean = (draft || '').trim().split('?')[0].replace(/\/$/, '');
      onSave(clean || null);
    }
  };

  // Derive LinkedIn company slug from URL (e.g. linkedin.com/company/abb → "abb")
  const companySlug = (() => {
    const m = (companyLinkedIn || '').match(/linkedin\.com\/company\/([^\/\?]+)/);
    return m ? m[1] : null;
  })();

  const buildSearchUrl = () => {
    const name = [firstName, lastName].filter(Boolean).join(' ') || fullName || '';
    // Combine name + company into keywords (most robust, no need for numeric company ID)
    const keywords = [name, companySlug, !companySlug ? companyName : ''].filter(Boolean).join(' ');
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
  };

  const openProfile = () => {
    if (value) window.open(value, '_blank', 'noopener,noreferrer');
  };
  const openSearch = () => {
    window.open(buildSearchUrl(), '_blank', 'noopener,noreferrer');
  };

  const style = { display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' };
  const inputStyle = {
    width: '100%', padding: '5px 8px', borderRadius: 5,
    border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };

  return (
    <div style={style}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>LinkedIn URL</span>
        {saving && <span style={{ color: 'var(--accent)' }}>…</span>}
        {value && (
          <button onClick={openProfile}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--chip-linkedin)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
            → Open profile
          </button>
        )}
        <button onClick={openSearch}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--chip-linkedin)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
          🔍 Search on LinkedIn
        </button>
      </div>
      {editing ? (
        <input autoFocus type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
          placeholder="https://linkedin.com/in/…"
          style={inputStyle} />
      ) : (
        <div onClick={() => setEditing(true)}
          style={{
            fontSize: 12, color: value ? 'var(--chip-linkedin)' : 'var(--text-3)',
            padding: '5px 8px', borderRadius: 5, cursor: 'text',
            minHeight: 22,
            border: '0.5px solid transparent',
            textDecoration: value ? 'underline' : 'none',
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {value || <span style={{ fontStyle: 'italic', textDecoration: 'none', fontFamily: 'var(--font)' }}>Click to edit, or use "Search on LinkedIn" →</span>}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, type = 'text', saving, onSave, colspan }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = () => {
    setEditing(false);
    if ((draft || '') !== (value || '')) {
      onSave(draft || null);
    }
  };

  const cancel = () => { setDraft(value || ''); setEditing(false); };

  const style = {
    display: 'flex', flexDirection: 'column', gap: 4,
    ...(colspan === 2 ? { gridColumn: 'span 2' } : {}),
  };
  const inputStyle = {
    width: '100%', padding: '5px 8px', borderRadius: 5,
    border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none',
    fontFamily: type === 'textarea' ? 'var(--font)' : 'var(--font)',
    boxSizing: 'border-box', resize: 'vertical',
  };

  return (
    <div style={style}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        {label}{saving && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>…</span>}
      </div>
      {editing ? (
        type === 'textarea' ? (
          <textarea autoFocus rows={3} value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
            style={inputStyle} />
        ) : (
          <input autoFocus type={type} value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            style={inputStyle} />
        )
      ) : (
        <div onClick={() => setEditing(true)}
          style={{
            fontSize: 12, color: value ? 'var(--text-1)' : 'var(--text-3)',
            padding: '5px 8px', borderRadius: 5, cursor: 'text',
            minHeight: 22, whiteSpace: 'pre-wrap',
            border: '0.5px solid transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {value || <span style={{ fontStyle: 'italic' }}>Click to edit…</span>}
        </div>
      )}
    </div>
  );
}
