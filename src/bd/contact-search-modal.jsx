import { useState, useEffect } from 'react';
import { I } from './atoms';

// Opens LinkedIn people search in a new tab, pre-filtered by the account's
// company name. User copies profile details → pastes into "Add contact".
// Replaces the previous Unipile-based in-app search (disabled since trial ended).
export default function ContactSearchModal({ account, onClose }) {
  const [keywords, setKeywords] = useState('');

  // Extract company slug from LinkedIn URL if available (more precise filter)
  const companySlug = (() => {
    const m = (account?.linkedin_url || '').match(/linkedin\.com\/company\/([^\/\?]+)/);
    return m ? m[1] : null;
  })();

  const buildUrl = (kw) => {
    const q = (kw || '').trim();
    const company = account?.name || '';
    // Use LinkedIn people search; prefer currentCompany filter if we have a slug
    if (companySlug) {
      return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}&origin=FACETED_SEARCH&company=${encodeURIComponent(companySlug)}`;
    }
    // Fallback: include company name in keywords
    const combined = [q, company].filter(Boolean).join(' ');
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(combined)}`;
  };

  const openSearch = () => {
    window.open(buildUrl(keywords), '_blank', 'noopener,noreferrer');
  };

  // Also open current-employees list directly if we have a LinkedIn company URL
  const openEmployees = () => {
    if (account?.linkedin_url) {
      const url = account.linkedin_url.replace(/\/$/, '') + '/people/';
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      openSearch();
    }
  };

  const fieldStyle = {
    flex: 1, padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.search />
          <span>Search contacts on LinkedIn{account?.name ? ` — ${account.name}` : ''}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Opens LinkedIn in a new tab, filtered by this company. Copy the name + profile URL, then use <b>+ Add</b> to create the contact in CRM.
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
              Role or keywords (optional)
            </div>
            <input autoFocus style={fieldStyle} value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') openSearch(); }}
              placeholder="e.g. CHRO, Head of HR, Talent Acquisition…" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={openSearch}>
              <I.search /> Search on LinkedIn
            </button>
            {account?.linkedin_url && (
              <button className="btn-ghost" style={{ flex: 1 }} onClick={openEmployees}>
                All employees →
              </button>
            )}
          </div>

          {!account?.linkedin_url && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Tip: add a LinkedIn company URL to the account for more precise filtering.
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
