import React, { useMemo, useState } from 'react';
import { filterAudience, audienceSummary, surplusExclusions, contactRank } from './content-audience-logic';

// Tijdelijke doelgroepkiezer voor één content-item. Filtert de al ingeladen
// contacten client-side en levert een bevroren lijst contact-IDs + samenvatting.
export default function ContentAudiencePicker({ contacts = [], accounts = [], allTags = [], onApply, onClose }) {
  // Meta per account (type/land/industrie). region = land (adapters.js).
  const accountMetaById = useMemo(() => {
    const m = new Map();
    for (const a of (accounts || [])) m.set(a.id, { type: a.type || '', country: a.region || '', industry: a.industry || '' });
    return m;
  }, [accounts]);
  const accountNameById = useMemo(() => {
    const m = new Map();
    for (const a of (accounts || [])) m.set(a.id, a.name || '');
    return m;
  }, [accounts]);

  // Filterstate.
  const [tagIds, setTagIds] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [hasEmail, setHasEmail] = useState(null); // null | true | false
  const [optIn, setOptIn] = useState(true);       // default: alleen opted-in

  // Uitsluitingen (auto via 'max per bedrijf' + handmatig afvinken).
  const [excluded, setExcluded] = useState(() => new Set());
  const [maxPerCompany, setMaxPerCompany] = useState(null); // null = onbeperkt

  // Distinct opties uit de data.
  const options = useMemo(() => {
    const st = new Set(), co = new Set(), ind = new Set();
    for (const a of (accounts || [])) {
      if (a.type) st.add(a.type);
      if (a.region) co.add(a.region);
      if (a.industry) ind.add(a.industry);
    }
    const sort = (s) => [...s].sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()));
    return { statuses: sort(st), countries: sort(co), industries: sort(ind) };
  }, [accounts]);

  const filters = { tagIds, statuses, countries, industries, hasEmail, optIn };
  const matched = useMemo(() => filterAudience(contacts, filters, accountMetaById),
    [contacts, tagIds, statuses, countries, industries, hasEmail, optIn, accountMetaById]);

  // Definitieve selectie = matchend minus uitgesloten.
  const selectedContacts = matched.filter(c => !excluded.has(c.id));

  // Groepeer de matchende contacten per bedrijf, binnen elke groep op rang.
  const groups = useMemo(() => {
    const m = new Map(); // accountId|'' → contacten
    for (const c of matched) {
      const k = c.accountId || '';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    const out = [...m.entries()].map(([accountId, list]) => ({
      accountId,
      name: accountId ? (accountNameById.get(accountId) || '(onbekend bedrijf)') : '(geen bedrijf)',
      contacts: list.slice().sort((a, b) => contactRank(b) - contactRank(a)),
    }));
    out.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    return out;
  }, [matched, accountNameById]);

  const toggle = (setter) => (val) => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const toggleExcluded = (id) => setExcluded(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  // 'Max per bedrijf' zetten: voorselecteer top-N per bedrijf (rest uitgevinkt).
  const applyMax = (n) => {
    setMaxPerCompany(n);
    setExcluded(new Set(surplusExclusions(matched, n)));
  };

  const tagNames = allTags.filter(t => tagIds.includes(t.id)).map(t => t.name);

  function apply() {
    const summary = audienceSummary({ statuses, countries, industries, tagNames, hasEmail, optIn }, selectedContacts.length);
    onApply({ contact_ids: selectedContacts.map(c => c.id), summary });
  }

  const chip = (active) => ({
    padding: '3px 8px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
    border: '0.5px solid var(--sep)',
    background: active ? 'var(--accent, #2563eb)' : 'var(--bg-2)',
    color: active ? '#fff' : 'var(--text-1)',
  });
  const Group = ({ label, values, selected, onToggle }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {values.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>(geen)</span>}
        {values.map(v => <span key={v} style={chip(selected.includes(v))} onClick={() => onToggle(v)}>{v}</span>)}
      </div>
    </div>
  );
  const Tri = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={chip(value === true)} onClick={() => onChange(value === true ? null : true)}>ja</span>
      <span style={chip(value === false)} onClick={() => onChange(value === false ? null : false)}>nee</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 94vw)', maxHeight: '88vh', overflow: 'auto', background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Doelgroep samenstellen</strong>
          <button className="btn-ghost tiny" onClick={onClose}>Sluiten</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Group label="Tags" values={allTags.map(t => t.name)} selected={allTags.filter(t => tagIds.includes(t.id)).map(t => t.name)}
            onToggle={(name) => { const t = allTags.find(x => x.name === name); if (t) toggle(setTagIds)(t.id); }} />
          <Group label="Account-status" values={options.statuses} selected={statuses} onToggle={toggle(setStatuses)} />
          <Group label="Land" values={options.countries} selected={countries} onToggle={toggle(setCountries)} />
          <Group label="Industrie" values={options.industries} selected={industries} onToggle={toggle(setIndustries)} />
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Tri label="E-mail aanwezig" value={hasEmail} onChange={setHasEmail} />
            <Tri label="Opt-in" value={optIn} onChange={setOptIn} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Max per bedrijf</span>
            {[{ l: 'onbeperkt', v: null }, { l: '1', v: 1 }, { l: '2', v: 2 }, { l: '3', v: 3 }].map(o => (
              <span key={o.l} style={chip(maxPerCompany === o.v)} onClick={() => applyMax(o.v)}>{o.l}</span>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <strong>{selectedContacts.length}</strong> geselecteerd uit {matched.length} gefilterde contacten
          {' '}bij {groups.length} bedrijf{groups.length === 1 ? '' : 'ven'}
        </div>

        <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, maxHeight: 300, overflow: 'auto' }}>
          {groups.length === 0 && <div style={{ padding: 12, fontSize: 13, color: 'var(--text-3)' }}>Geen contacten voor deze filters.</div>}
          {groups.map(g => {
            const sel = g.contacts.filter(c => !excluded.has(c.id)).length;
            return (
              <div key={g.accountId || 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--sep)', position: 'sticky', top: 0 }}>
                  <strong style={{ fontSize: 12 }}>{g.name}</strong>
                  <span style={{ fontSize: 11, color: g.contacts.length > 1 ? 'var(--text-2)' : 'var(--text-3)' }}>{sel}/{g.contacts.length} geselecteerd</span>
                </div>
                {g.contacts.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 20px', borderBottom: '0.5px solid var(--sep)', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!excluded.has(c.id)} onChange={() => toggleExcluded(c.id)} />
                    <span style={{ flex: 1 }}>{c.name || c.full_name || '(naamloos)'}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{c.role || c.title || ''}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{c.email || 'geen e-mail'}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Annuleren</button>
          <button className="btn-primary" disabled={selectedContacts.length === 0} onClick={apply}>
            Gebruik deze selectie ({selectedContacts.length})
          </button>
        </div>
      </div>
    </div>
  );
}
