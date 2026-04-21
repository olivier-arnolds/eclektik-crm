import { useState, useEffect } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

export default function ContactSearchModal({ account, onClose, onAdded }) {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [linkedinAccountId, setLinkedinAccountId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState({});

  // Resolve LinkedIn account on mount
  useEffect(() => {
    fetch('/api/unipile?action=list-accounts')
      .then(r => r.json())
      .then(data => {
        const acc = data?.data?.items?.find(a => (a.account_type || '').toUpperCase().includes('LINKEDIN'));
        if (acc) setLinkedinAccountId(acc.id);
        else setError('No LinkedIn account connected in Unipile.');
      })
      .catch(e => setError('Failed to resolve LinkedIn account: ' + e.message));
  }, []);

  const search = async (loadMore = false) => {
    if (!linkedinAccountId) {
      setError('LinkedIn account not ready yet.');
      return;
    }
    if (loadMore) setLoadingMore(true);
    else { setSearching(true); setResults([]); setCursor(null); }
    setError(null);
    try {
      const body = {
        account_id: linkedinAccountId,
        company: account?.name || '',
        keywords: keywords.trim(),
        linkedin_url: account?.linkedin_url || account?.website || '',
      };
      if (loadMore && cursor) body.cursor = cursor;
      const resp = await fetch('/api/unipile?action=search-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.success) {
        const items = data.data?.items || data.data || [];
        const newItems = Array.isArray(items) ? items : [];
        setResults(prev => loadMore ? [...prev, ...newItems] : newItems);
        setCursor(data.data?.cursor || null);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (e) {
      setError(e.message);
    }
    setSearching(false);
    setLoadingMore(false);
  };

  const addToCRM = async (person) => {
    const pid = person.id || person.provider_id || person.public_identifier || Math.random().toString();
    setSavingId(pid);
    try {
      const rawUrl = person.public_profile_url || person.linkedin_url
        || (person.public_identifier ? `https://www.linkedin.com/in/${person.public_identifier}` : '');
      const linkedinUrl = rawUrl.split('?')[0].replace(/\/$/, '');
      const fullName = person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
      const { data: inserted } = await supabase.from('contacts').insert({
        full_name: fullName,
        first_name: person.first_name || fullName.split(' ')[0] || '',
        last_name: person.last_name || fullName.split(' ').slice(1).join(' ') || '',
        title: person.headline || person.title || '',
        company_id: account?.id || null,
        company_name: account?.name || null,
        linkedin_url: linkedinUrl || null,
        source: 'LinkedIn Search',
        stage: 'Active',
        owner: 'MVG',
      }).select().single();

      // Best-effort enrich for email
      if (inserted?.id) {
        fetch('/api/surfe-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'contacts', ids: [inserted.id] }),
        }).catch(() => {});
      }

      setSavedIds(prev => ({ ...prev, [pid]: true }));
      if (onAdded) onAdded(inserted);
    } catch (e) {
      alert('Failed to add contact: ' + e.message);
    }
    setSavingId(null);
  };

  const fieldStyle = {
    flex: 1, padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.search />
          <span>Search contacts on LinkedIn{account?.name ? ` — ${account.name}` : ''}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={fieldStyle} autoFocus value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') search(false); }}
              placeholder="e.g. CHRO, Head of HR, Talent Acquisition…" />
            <button className="btn-primary" onClick={() => search(false)} disabled={searching || !linkedinAccountId}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ {error}</div>
              {error.includes('No LinkedIn account') && (
                <button className="btn-primary tiny" style={{ alignSelf: 'flex-start' }}
                  onClick={async () => {
                    try {
                      const resp = await fetch(`/api/unipile?action=connect-linkedin&redirect_url=${encodeURIComponent(window.location.href)}`);
                      const data = await resp.json();
                      const url = data?.data?.url || data?.url;
                      if (url) window.open(url, '_blank', 'width=700,height=800');
                      else alert('Failed to generate connect link: ' + (data?.error || 'unknown error'));
                    } catch (e) {
                      alert('Connect failed: ' + e.message);
                    }
                  }}>
                  → Connect LinkedIn account
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 200 }}>
            {results.length === 0 && !searching && !error && (
              <div className="empty" style={{ padding: 32 }}>
                {keywords ? 'No results yet — click Search.' : 'Type keywords to search LinkedIn within this company.'}
              </div>
            )}
            {results.map(p => {
              const pid = p.id || p.provider_id || p.public_identifier;
              const name = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
              const title = p.headline || p.title || '';
              const url = p.public_profile_url || p.linkedin_url
                || (p.public_identifier ? `https://www.linkedin.com/in/${p.public_identifier}` : '');
              return (
                <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '0.5px solid var(--sep)', borderRadius: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: 'var(--fill-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0,
                  }}>
                    {(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {title && <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                         style={{ fontSize: 10, color: 'var(--chip-linkedin)', fontFamily: 'var(--font-mono)' }}>
                        {url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  {savedIds[pid] ? (
                    <span className="chip chip-good" style={{ fontSize: 11 }}>✓ Added</span>
                  ) : (
                    <button className="btn-primary tiny" onClick={() => addToCRM(p)} disabled={savingId === pid}>
                      {savingId === pid ? 'Adding…' : '+ Add to CRM'}
                    </button>
                  )}
                </div>
              );
            })}
            {cursor && results.length > 0 && (
              <button className="btn-ghost" onClick={() => search(true)} disabled={loadingMore}
                style={{ alignSelf: 'center', marginTop: 8 }}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
