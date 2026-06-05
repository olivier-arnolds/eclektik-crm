import { useMemo, useState } from 'react';
import { supabase } from '../supabase';

// Lichte normalisatie: lowercase, strip diakritieken, alleen [a-z0-9].
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Bouw local-part voor een patroon op basis van first/last.
function buildLocal(pattern, first, last) {
  const f = norm(first);
  const l = norm(last);
  const fi = f.slice(0, 1);
  const li = l.slice(0, 1);
  if (!f || !l) {
    if (pattern === 'first' && f) return f;
    if (pattern === 'last' && l) return l;
    return '';
  }
  switch (pattern) {
    case 'first.last': return `${f}.${l}`;
    case 'last.first': return `${l}.${f}`;
    case 'firstlast': return `${f}${l}`;
    case 'lastfirst': return `${l}${f}`;
    case 'first_last': return `${f}_${l}`;
    case 'f.last': return `${fi}.${l}`;
    case 'flast': return `${fi}${l}`;
    case 'first.l': return `${f}.${li}`;
    case 'firstl': return `${f}${li}`;
    case 'fl': return `${fi}${li}`;
    case 'first': return f;
    case 'last': return l;
    default: return '';
  }
}

// Welk patroon past op (local-part, first, last)? null = geen match.
function detectPattern(localPart, first, last) {
  const lp = norm(localPart);
  const candidates = [
    'first.last', 'last.first', 'firstlast', 'lastfirst',
    'first_last', 'f.last', 'flast', 'first.l', 'firstl',
    'first', 'last', 'fl',
  ];
  for (const p of candidates) {
    const built = norm(buildLocal(p, first, last));
    if (built && built === lp) return p;
  }
  return null;
}

// Bouw {accountId → { pattern, domain, confidence, sampleCount, totalEmails }}
function buildCompanyPatterns(contacts) {
  const byCompany = new Map();
  for (const c of contacts) {
    if (!c.accountId) continue;
    if (!c.email) continue;
    if (!c.first_name || !c.last_name) continue;
    const at = c.email.indexOf('@');
    if (at <= 0) continue;
    const local = c.email.slice(0, at);
    const domain = c.email.slice(at + 1).toLowerCase();
    const pattern = detectPattern(local, c.first_name, c.last_name);
    if (!pattern) continue;
    if (!byCompany.has(c.accountId)) {
      byCompany.set(c.accountId, { patterns: new Map(), domains: new Map() });
    }
    const entry = byCompany.get(c.accountId);
    entry.patterns.set(pattern, (entry.patterns.get(pattern) || 0) + 1);
    entry.domains.set(domain, (entry.domains.get(domain) || 0) + 1);
  }
  const result = new Map();
  for (const [accountId, entry] of byCompany) {
    let bestPattern = null, bestPCount = 0, totalP = 0;
    for (const [p, n] of entry.patterns) {
      totalP += n;
      if (n > bestPCount) { bestPattern = p; bestPCount = n; }
    }
    let bestDomain = null, bestDCount = 0;
    for (const [d, n] of entry.domains) {
      if (n > bestDCount) { bestDomain = d; bestDCount = n; }
    }
    if (!bestPattern || !bestDomain) continue;
    result.set(accountId, {
      pattern: bestPattern,
      domain: bestDomain,
      sampleCount: bestPCount,
      totalEmails: totalP,
      confidence: bestPCount / totalP,
    });
  }
  return result;
}

// Toon-naam voor een patroon (Nederlands-vriendelijk).
function patternLabel(p) {
  return ({
    'first.last': 'voornaam.achternaam',
    'last.first': 'achternaam.voornaam',
    'firstlast': 'voornaamachternaam',
    'lastfirst': 'achternaamvoornaam',
    'first_last': 'voornaam_achternaam',
    'f.last': 'v.achternaam',
    'flast': 'vachternaam',
    'first.l': 'voornaam.a',
    'firstl': 'voornaama',
    'fl': 'va',
    'first': 'voornaam',
    'last': 'achternaam',
  })[p] || p;
}

export default function MarketingEmailSuggestModal({ allContacts, selectedIds, onClose, refetch }) {
  // Genereer suggesties bij open.
  const suggestions = useMemo(() => {
    const companyPatterns = buildCompanyPatterns(allContacts);
    const out = [];
    for (const c of allContacts) {
      if (!selectedIds.has(c.id)) continue;
      if (c.email) continue;
      if (!c.accountId) continue;
      if (!c.first_name || !c.last_name) continue;
      const cp = companyPatterns.get(c.accountId);
      if (!cp) continue;
      const local = buildLocal(cp.pattern, c.first_name, c.last_name);
      if (!local) continue;
      out.push({
        contactId: c.id,
        name: c.name,
        company: c.account || '',
        suggested: `${local}@${cp.domain}`,
        pattern: cp.pattern,
        domain: cp.domain,
        sampleCount: cp.sampleCount,
        totalEmails: cp.totalEmails,
        confidence: cp.confidence,
      });
    }
    out.sort((a, b) => b.confidence - a.confidence || a.company.localeCompare(b.company));
    return out;
  }, [allContacts, selectedIds]);

  // Hoeveel geselecteerd missen we patroon voor?
  const missCount = useMemo(() => {
    let count = 0;
    for (const c of allContacts) {
      if (!selectedIds.has(c.id)) continue;
      if (c.email) continue;
      count++;
    }
    return count - suggestions.length;
  }, [allContacts, selectedIds, suggestions]);

  // Per-row checkbox + bewerkbare email
  const [checks, setChecks] = useState(() => {
    const init = {};
    for (const s of suggestions) {
      // Default aan voor confidence ≥ 0.66 (2/3 of meer collega's)
      init[s.contactId] = s.confidence >= 0.66;
    }
    return init;
  });
  const [edits, setEdits] = useState({});
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [alert, setAlert] = useState('');

  const selectedCount = Object.values(checks).filter(Boolean).length;

  function toggleAll(on) {
    const next = {};
    for (const s of suggestions) next[s.contactId] = on;
    setChecks(next);
  }

  async function applySelected() {
    const toApply = suggestions
      .filter(s => checks[s.contactId])
      .map(s => ({ contactId: s.contactId, email: (edits[s.contactId] ?? s.suggested).trim() }))
      .filter(x => x.email.includes('@'));
    if (toApply.length === 0) {
      setAlert('Geen suggesties geselecteerd.');
      return;
    }
    setApplying(true);
    setProgress({ done: 0, total: toApply.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < toApply.length; i++) {
      const { contactId, email } = toApply[i];
      const { error } = await supabase.from('contacts').update({ email }).eq('id', contactId);
      if (error) fail++; else ok++;
      setProgress({ done: i + 1, total: toApply.length });
    }
    setApplying(false);
    setAlert(`Klaar: ${ok} toegepast${fail > 0 ? `, ${fail} fout` : ''}.`);
    if (refetch) refetch();
    if (fail === 0) setTimeout(() => { if (onClose) onClose(); }, 1200);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-1)', borderRadius: 12, width: 'min(900px, 92vw)',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Email-suggesties op basis van collega-patronen</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              {suggestions.length} suggestie{suggestions.length === 1 ? '' : 's'} gegenereerd
              {missCount > 0 && ` · ${missCount} contact${missCount === 1 ? '' : 'en'} zonder bruikbaar patroon (geen collega met email of geen naam)`}
            </div>
          </div>
          <button className="btn-ghost tiny" onClick={onClose}>✕</button>
        </div>

        {alert && (
          <div style={{ padding: '10px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            {alert}
          </div>
        )}

        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-2)' }}>
          Let op: dit zijn gokjes op basis van patroonherkenning, niet geverifieerd. Standaard aangevinkt bij ≥66% confidence (2 van 3 collega's). Bewerk of vink uit waar nodig.
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              Geen suggesties beschikbaar. Voor elke target hebben we ten minste 1 collega met email + naam nodig in hetzelfde bedrijf.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-1)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', width: 32 }}>
                    <input type="checkbox"
                      checked={selectedCount === suggestions.length && suggestions.length > 0}
                      onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Naam</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Bedrijf</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Voorgestelde email</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Patroon</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map(s => {
                  const pct = Math.round(s.confidence * 100);
                  const pctColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626';
                  return (
                    <tr key={s.contactId} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="checkbox"
                          checked={!!checks[s.contactId]}
                          onChange={e => setChecks(c => ({ ...c, [s.contactId]: e.target.checked }))} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>{s.name}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-3)' }}>{s.company}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          value={edits[s.contactId] ?? s.suggested}
                          onChange={e => setEdits(x => ({ ...x, [s.contactId]: e.target.value }))}
                          style={{
                            width: '100%', background: 'var(--bg-2)',
                            border: '1px solid var(--line)', borderRadius: 6,
                            padding: '4px 8px', fontSize: 13, color: 'var(--text-1)',
                          }} />
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)' }}>{patternLabel(s.pattern)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: pctColor }}>
                        {pct}% ({s.sampleCount}/{s.totalEmails})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {selectedCount} van {suggestions.length} aangevinkt
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}>Annuleren</button>
            <button className="btn-primary"
              disabled={applying || selectedCount === 0}
              onClick={applySelected}>
              {applying ? `Toepassen ${progress.done}/${progress.total}…` : `Pas ${selectedCount} toe`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
