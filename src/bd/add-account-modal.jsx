import { useState, useEffect, useMemo } from 'react';
import { I } from './atoms';
import { insertRow } from '../hooks/useSupabase';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';

// Normalize a company name for similarity matching:
// - lowercase, strip whitespace
// - remove common prefixes ("* ", "P2P |")
// - remove common corporate suffixes/stopwords (Inc, Ltd, BV, GmbH, Corp, LLC,
//   Technologies, Solutions, Group, etc.)
// - collapse multiple spaces
const CORP_STOPWORDS = [
  'inc', 'incorporated', 'ltd', 'limited', 'bv', 'b.v.', 'nv', 'n.v.',
  'gmbh', 'ag', 'corp', 'corporation', 'co', 'company', 'llc', 'llp', 'sa',
  'sarl', 'srl', 'oy', 'ab', 'as', 'plc', 'gbr', 'kgaa',
  'group', 'holdings', 'enterprises', 'international', 'global',
  'technologies', 'technology', 'tech', 'solutions', 'solution',
  'services', 'service', 'systems', 'system', 'consulting',
  'partners', 'ventures', 'capital', 'industries',
];
const STOPWORD_SET = new Set(CORP_STOPWORDS);

function normalizeName(raw) {
  if (!raw) return '';
  let n = raw.toLowerCase().trim();
  // Strip common prefixes
  if (n.startsWith('* ')) n = n.slice(2).trim();
  if (n.startsWith('p2p |')) n = n.slice(5).trim();
  if (n.startsWith('p2p|')) n = n.slice(4).trim();
  // Remove punctuation (keep alphanumerics + spaces)
  n = n.replace(/[^a-z0-9\s]+/g, ' ');
  // Remove stopword tokens
  const kept = n.split(/\s+/).filter(t => t && !STOPWORD_SET.has(t));
  return kept.join(' ').trim();
}

function findSimilarAccounts(query, accounts) {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const qLower = q.toLowerCase();
  const qNorm = normalizeName(q);

  const matches = [];
  for (const a of accounts || []) {
    if (!a?.name) continue;
    const nameLower = a.name.toLowerCase();
    const nameNorm = normalizeName(a.name);

    // 1) Exact (normalized) match
    if (qNorm && nameNorm && qNorm === nameNorm) {
      matches.push({ account: a, matchType: 'exact', score: 100 });
      continue;
    }
    // 2) Normalized stem contains the other (e.g. "trane" ⊂ "trane technologies")
    if (qNorm && nameNorm && qNorm.length >= 3 && nameNorm.length >= 3) {
      if (nameNorm.includes(qNorm) || qNorm.includes(nameNorm)) {
        matches.push({ account: a, matchType: 'similar', score: 70 });
        continue;
      }
    }
    // 3) Raw substring (catches punctuation-heavy names e.g. "P2P | X")
    if (qLower.length >= 3 && (nameLower.includes(qLower) || qLower.includes(nameLower))) {
      matches.push({ account: a, matchType: 'substring', score: 50 });
      continue;
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5);
}

export default function AddAccountModal({ onClose, onCreated, initialName, initialWebsite, initialLinkedIn }) {
  const [name, setName] = useState(initialName || '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedIn || '');
  const [website, setWebsite] = useState(initialWebsite || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [allAccounts, setAllAccounts] = useState([]);

  useEffect(() => {
    supabase.from('companies').select('id,name,type,stage').order('name')
      .then(({ data }) => setAllAccounts(data || []));
  }, []);

  // Debounced version of `name` for dupe-check (avoids firing on each keystroke)
  const [debouncedName, setDebouncedName] = useState(name);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(name), 300);
    return () => clearTimeout(t);
  }, [name]);

  const similar = useMemo(() => findSimilarAccounts(debouncedName, allAccounts), [debouncedName, allAccounts]);
  const exactMatch = similar.find(m => m.matchType === 'exact')?.account;

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
    // Warn if there's an exact duplicate, but allow creating anyway
    if (exactMatch) {
      const proceed = confirm(
        `An account called "${exactMatch.name}" already exists (${exactMatch.type || 'no type'}).\n\n` +
        `Create a new one anyway?\n\n` +
        `Click OK to continue, or Cancel to go back and pick the existing one.`
      );
      if (!proceed) return;
    }
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

    if (newCompany?.id && newCompany.linkedin_url) {
      setStatus('Enriching via LinkedIn…');
      try {
        await apiFetch('/api/unipile?action=enrich-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: newCompany.id, linkedin_url: newCompany.linkedin_url }),
        });
      } catch (e) {
        console.warn('Auto-enrich failed:', e);
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

  const openExisting = (acc) => {
    // Signal parent to navigate to this account instead of creating a new one
    if (onCreated) onCreated(acc);
    onClose();
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

            {similar.length > 0 && (
              <div style={{
                marginTop: 8, padding: 10, borderRadius: 6,
                background: exactMatch ? 'var(--danger-tint)' : 'var(--warn-tint)',
                border: `0.5px solid ${exactMatch ? 'var(--danger)' : 'var(--warn)'}`,
                fontSize: 11,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: exactMatch ? 'var(--danger)' : 'var(--warn)' }}>
                  <span style={{ fontWeight: 600 }}>
                    {exactMatch ? '⚠ Exact duplicate found' : '⚠ Possible duplicates'}
                  </span>
                  <span style={{ opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {similar.length} match{similar.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 6 }}>
                  {exactMatch
                    ? 'A company with this exact name already exists. Consider opening the existing one instead, or create new if this is a different entity (e.g. country branch).'
                    : 'Check if one of these is the same company. Country branches / divisions are fine to add separately.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {similar.map(({ account: a, matchType }) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', background: 'var(--bg-1)',
                      borderRadius: 4,
                    }}>
                      <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: 3,
                        background: matchType === 'exact' ? 'var(--danger-tint)' : 'var(--fill-2)',
                        color: matchType === 'exact' ? 'var(--danger)' : 'var(--text-3)',
                      }}>
                        {matchType === 'exact' ? 'EXACT' : matchType === 'similar' ? 'SIMILAR' : 'SUBSTR'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.name}
                      </span>
                      {a.type && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</span>}
                      <button className="btn-ghost tiny" onClick={() => openExisting(a)}>Open</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {saving ? 'Saving…' : (exactMatch ? 'Create anyway' : 'Save & enrich')}
          </button>
        </div>
      </div>
    </div>
  );
}
