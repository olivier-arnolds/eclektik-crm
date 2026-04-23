import { useState, useEffect } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';
import { InlineContactDetail } from './inline-details';

// Modal wrapper around InlineContactDetail — used when the user opens a
// contact from the global Search results panel. Same features as the
// inline-expand version inside Account 360 (edit fields, move account,
// LinkedIn search, inactivate).
export default function ContactDetailModal({ contactId, onClose, refetch, onCompose }) {
  const [header, setHeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    supabase.from('contacts').select('id, full_name, first_name, last_name, email, company_name, companies(name)').eq('id', contactId).single()
      .then(({ data, error }) => {
        if (error) { setError(error.message); setLoading(false); return; }
        setHeader(data);
        setLoading(false);
      });
  }, [contactId]);

  if (!contactId) return null;

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Loading contact…</div>
        </div>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Error loading contact</div>
          <div className="modal-body">{error || 'Not found'}</div>
          <div className="modal-actions"><button className="btn-ghost" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  const initials = (header.full_name || `${header.first_name || ''} ${header.last_name || ''}`)
    .trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: 'var(--fill-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
          }}>{initials || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {header.full_name || 'Unnamed contact'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {header.companies?.name || header.company_name || ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          <InlineContactDetail
            contactId={contactId}
            onCompose={onCompose}
            refetch={() => {
              if (refetch) refetch();
              // Also re-read header in case name/company changed
              supabase.from('contacts').select('id, full_name, first_name, last_name, email, company_name, companies(name)').eq('id', contactId).single()
                .then(({ data }) => data && setHeader(data));
            }}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
