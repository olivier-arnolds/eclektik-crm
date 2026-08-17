# Content-doelgroepkiezer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de permanente `target_tag`-dropdown in de content-e-maildraft door een tijdelijke doelgroepkiezer met marketing-achtige filters die een bevroren lijst contact-IDs op het item vastlegt.

**Architecture:** Client-side kiezer filtert de al ingeladen `contacts` (uit `useBDData`) en schrijft `target_contact_ids uuid[]` + `audience_summary text` weg op `content_calendar_items`. De publish-cron gebruikt die bevroren IDs (met opt-in/actief/afmeld-guard als vangnet) en valt terug op `target_tag` voor bestaande items. Puur-logica (filtering + samenvatting) zit in een apart, getest bestand.

**Tech Stack:** React 19, Supabase JS, Vite, Vitest. Bestaande patronen: `content-calendar-logic.js` (pure logica + vitest), `marketing-contacts.jsx` (filterpatroon), `api/content-calendar-execute.js` (cron).

**Referentie-spec:** `docs/superpowers/specs/2026-08-17-content-audience-picker-design.md`

---

## Bestandsoverzicht

- **Create** `sql/content_target_contact_ids_2026-08-17.sql` — DB-migratie (additief).
- **Create** `src/bd/content-audience-logic.js` — pure filter- + samenvattingslogica.
- **Create** `src/bd/content-audience-logic.test.js` — vitest-tests voor bovenstaande.
- **Create** `src/bd/content-audience-picker.jsx` — de modal-kiezer (UI).
- **Modify** `src/bd/content-calendar-view.jsx` — props uitbreiden, tag-dropdown vervangen door kiezer-knop, nieuwe velden opslaan, waarschuwing aanpassen.
- **Modify** `src/bd/BDApp.jsx:353` — `accounts` + `allTags` doorgeven aan `ContentCalendarView`.
- **Modify** `api/content-calendar-execute.js:56-92` — `recipientsForItem` ondersteunt `target_contact_ids`.
- **Modify** `VERSION`, `package.json`, `src/bd/changelog.js` — versiebump (CLAUDE.md §2).

---

## Task 1: DB-migratie (twee additieve kolommen)

**Files:**
- Create: `sql/content_target_contact_ids_2026-08-17.sql`

- [ ] **Step 1: Schrijf het migratiebestand**

```sql
-- 2026-08-17: content-doelgroepkiezer — bevroren selectie i.p.v. permanente tag.
-- Additief; raakt geen bestaande data aan. target_tag blijft bestaan als fallback.
alter table content_calendar_items
  add column if not exists target_contact_ids uuid[],
  add column if not exists audience_summary text;
```

- [ ] **Step 2: Migratie toepassen**

Toepassen via Supabase MCP `apply_migration` (project `jdzaypckluncdwsoxurs`, naam `content_target_contact_ids_2026_08_17`) met de SQL uit Step 1. Additief `add column if not exists` — geen backup nodig.

- [ ] **Step 3: Kolommen verifiëren**

Via MCP `execute_sql`:
```sql
select column_name, data_type from information_schema.columns
where table_name='content_calendar_items'
  and column_name in ('target_contact_ids','audience_summary');
```
Expected: twee rijen — `target_contact_ids | ARRAY`, `audience_summary | text`.

- [ ] **Step 4: Commit**

```bash
git add sql/content_target_contact_ids_2026-08-17.sql
git commit -m "feat(content-calendar): DB-kolommen target_contact_ids + audience_summary"
```

---

## Task 2: Pure filter- en samenvattingslogica (TDD)

**Files:**
- Create: `src/bd/content-audience-logic.js`
- Test: `src/bd/content-audience-logic.test.js`

Filtervorm (`filters`): alle velden optioneel; leeg/afwezig = geen beperking.
- `tagIds: string[]` — contact matcht als één van zijn tag-ids erin zit.
- `statuses: string[]` — account-`type` moet erin zitten.
- `countries: string[]` — account-land moet erin zitten.
- `industries: string[]` — account-industrie moet erin zitten.
- `hasEmail: boolean|null` — `true` = alleen met e-mail, `false` = alleen zonder, `null` = alles.
- `optIn: boolean|null` — idem op `marketing_content_opt_in`.

`accountMetaById`: `Map<accountId, { type, country, industry }>`.

- [ ] **Step 1: Schrijf de falende tests**

```js
import { describe, it, expect } from 'vitest';
import { contactMatchesAudience, filterAudience, audienceSummary, seniorityScore, isHrRole, contactRank, surplusExclusions } from './content-audience-logic';

const meta = new Map([
  ['a1', { type: 'Prospect', country: 'Netherlands', industry: 'Retail' }],
  ['a2', { type: 'Customer', country: 'United Kingdom', industry: 'Finance' }],
]);
const base = { id: 'c1', accountId: 'a1', tags: [{ id: 't1', name: 'Glint' }], email: 'x@y.com', isFormer: false, marketing_content_opt_in: true };

describe('contactMatchesAudience', () => {
  it('leeg filter matcht elk actief contact', () => {
    expect(contactMatchesAudience(base, {}, meta)).toBe(true);
  });
  it('former contacten matchen nooit', () => {
    expect(contactMatchesAudience({ ...base, isFormer: true }, {}, meta)).toBe(false);
  });
  it('tagIds: matcht alleen als contact een van de tags heeft', () => {
    expect(contactMatchesAudience(base, { tagIds: ['t1'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { tagIds: ['t9'] }, meta)).toBe(false);
  });
  it('statuses: matcht op account-type', () => {
    expect(contactMatchesAudience(base, { statuses: ['Prospect'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { statuses: ['Customer'] }, meta)).toBe(false);
  });
  it('countries + industries', () => {
    expect(contactMatchesAudience(base, { countries: ['Netherlands'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { industries: ['Finance'] }, meta)).toBe(false);
  });
  it('hasEmail true/false', () => {
    expect(contactMatchesAudience({ ...base, email: '' }, { hasEmail: true }, meta)).toBe(false);
    expect(contactMatchesAudience({ ...base, email: '' }, { hasEmail: false }, meta)).toBe(true);
  });
  it('optIn true sluit niet-opted-in uit', () => {
    expect(contactMatchesAudience({ ...base, marketing_content_opt_in: false }, { optIn: true }, meta)).toBe(false);
  });
  it('onbekend account (geen meta) faalt op status/land/industrie-filters', () => {
    const noAcc = { ...base, accountId: 'zzz' };
    expect(contactMatchesAudience(noAcc, { statuses: ['Prospect'] }, meta)).toBe(false);
    expect(contactMatchesAudience(noAcc, {}, meta)).toBe(true);
  });
});

describe('filterAudience', () => {
  it('geeft alleen matchende contacten terug', () => {
    const cs = [base, { id: 'c2', accountId: 'a2', tags: [], email: 'a@b.com', isFormer: false, marketing_content_opt_in: true }];
    const out = filterAudience(cs, { statuses: ['Customer'] }, meta);
    expect(out.map(c => c.id)).toEqual(['c2']);
  });
});

describe('audienceSummary', () => {
  it('bouwt een leesbare regel met telling', () => {
    const s = audienceSummary({ statuses: ['Prospect'], countries: ['Netherlands'], tagNames: [], industries: [], hasEmail: true, optIn: true }, 42);
    expect(s).toBe('Prospect, Netherlands, e-mail aanwezig, opt-in - 42 contacten');
  });
  it('leeg filter = alle contacten, enkelvoud bij 1', () => {
    expect(audienceSummary({}, 1)).toBe('alle contacten - 1 contact');
  });
  it('geen em-dash in de samenvatting', () => {
    const s = audienceSummary({ tagNames: ['Glint'] }, 3);
    expect(s.includes('—')).toBe(false);
  });
});

describe('seniorityScore', () => {
  it('kent tiers toe op basis van titel', () => {
    expect(seniorityScore('Chief People Officer')).toBe(100);
    expect(seniorityScore('VP of People')).toBe(80);
    expect(seniorityScore('Head of HR')).toBe(80);
    expect(seniorityScore('HR Director')).toBe(60);
    expect(seniorityScore('HR Manager')).toBe(40);
    expect(seniorityScore('HR Business Partner')).toBe(20);
    expect(seniorityScore('')).toBe(20);
  });
  it('managing director telt als exec, niet als director', () => {
    expect(seniorityScore('Managing Director')).toBe(100);
  });
  it('vice president is tier 80, niet exec', () => {
    expect(seniorityScore('Vice President')).toBe(80);
    expect(seniorityScore('Executive Vice President')).toBe(80);
  });
  it('losse president (geen vice) is exec', () => {
    expect(seniorityScore('President')).toBe(100);
  });
});

describe('isHrRole', () => {
  it('herkent HR/People-rollen', () => {
    expect(isHrRole('Head of People')).toBe(true);
    expect(isHrRole('Talent Acquisition Lead')).toBe(true);
    expect(isHrRole('CHRO')).toBe(true);
    expect(isHrRole('Chief Financial Officer')).toBe(false);
    expect(isHrRole('Software Engineer')).toBe(false);
  });
});

describe('contactRank', () => {
  it('HR-rol krijgt boost boven gelijke niet-HR-tier', () => {
    const hrHead = { role: 'Head of HR', email: 'a@b.com', marketing_content_opt_in: true };
    const cfo = { role: 'Chief Financial Officer', email: 'c@d.com', marketing_content_opt_in: true };
    // Head of HR: 80 + 25 + 2 + 1 = 108 ; CFO: 100 + 0 + 2 + 1 = 103
    expect(contactRank(hrHead)).toBeGreaterThan(contactRank(cfo));
  });
  it('tie-break: e-mail + opt-in verhogen de rang', () => {
    const withBoth = { role: 'HR Manager', email: 'x@y.com', marketing_content_opt_in: true };
    const without = { role: 'HR Manager', email: '', marketing_content_opt_in: false };
    expect(contactRank(withBoth)).toBeGreaterThan(contactRank(without));
  });
  it('leest zowel role als title', () => {
    expect(contactRank({ title: 'CHRO' })).toBeGreaterThan(contactRank({ title: 'Analyst' }));
  });
});

describe('surplusExclusions', () => {
  const mk = (id, accountId, role) => ({ id, accountId, role, email: 'x@y.com', marketing_content_opt_in: true });
  it('onbeperkt (null/0) sluit niets uit', () => {
    const cs = [mk('1', 'a', 'HR Manager'), mk('2', 'a', 'HR Director')];
    expect(surplusExclusions(cs, null)).toEqual([]);
    expect(surplusExclusions(cs, 0)).toEqual([]);
  });
  it('max 1 houdt per bedrijf de hoogst-rangschikkende, sluit de rest uit', () => {
    const cs = [mk('1', 'a', 'HR Manager'), mk('2', 'a', 'Head of HR'), mk('3', 'b', 'HR Director')];
    // bedrijf a: Head of HR (id 2) wint → id 1 uitgesloten; bedrijf b: enige → blijft
    expect(surplusExclusions(cs, 1).sort()).toEqual(['1']);
  });
  it('contacten zonder account worden niet gelimiteerd', () => {
    const cs = [mk('1', null, 'HR Manager'), mk('2', null, 'HR Director')];
    expect(surplusExclusions(cs, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run de tests, bevestig dat ze falen**

Run: `npm test -- content-audience-logic`
Expected: FAIL — module `./content-audience-logic` bestaat nog niet.

- [ ] **Step 3: Schrijf de minimale implementatie**

```js
// Pure filter- en samenvattingslogica voor de content-doelgroepkiezer.
// Werkt over de verrijkte contacts uit useBDData. Geen React/Supabase.

// contact: { accountId, tags:[{id,name}], email, isFormer, marketing_content_opt_in }
// filters: { tagIds?, statuses?, countries?, industries?, hasEmail?, optIn? }
// accountMetaById: Map<accountId, { type, country, industry }>
export function contactMatchesAudience(c, f = {}, accountMetaById) {
  if (c.isFormer) return false;
  const meta = (accountMetaById && accountMetaById.get(c.accountId)) || {};
  if (f.tagIds && f.tagIds.length) {
    const ids = (c.tags || []).map(t => t.id);
    if (!ids.some(id => f.tagIds.includes(id))) return false;
  }
  if (f.statuses && f.statuses.length && !f.statuses.includes(meta.type)) return false;
  if (f.countries && f.countries.length && !f.countries.includes(meta.country)) return false;
  if (f.industries && f.industries.length && !f.industries.includes(meta.industry)) return false;
  if (f.hasEmail === true && !c.email) return false;
  if (f.hasEmail === false && c.email) return false;
  if (f.optIn === true && !c.marketing_content_opt_in) return false;
  if (f.optIn === false && c.marketing_content_opt_in) return false;
  return true;
}

export function filterAudience(contacts, filters, accountMetaById) {
  return (contacts || []).filter(c => contactMatchesAudience(c, filters, accountMetaById));
}

// selection: display-ready labels — { statuses?, countries?, industries?, tagNames?, hasEmail?, optIn? }
export function audienceSummary(selection = {}, count = 0) {
  const parts = [];
  const push = (arr) => { if (arr && arr.length) parts.push(arr.join('/')); };
  push(selection.statuses);
  push(selection.countries);
  push(selection.industries);
  if (selection.tagNames && selection.tagNames.length) parts.push('tags: ' + selection.tagNames.join('/'));
  if (selection.hasEmail === true) parts.push('e-mail aanwezig');
  if (selection.optIn === true) parts.push('opt-in');
  const head = parts.length ? parts.join(', ') : 'alle contacten';
  const noun = count === 1 ? 'contact' : 'contacten';
  return `${head} - ${count} ${noun}`;
}

// --- Rangorde per bedrijf (voor 'max per bedrijf'-ontdubbeling) ---
const titleOf = (c) => String(c.role || c.title || '').toLowerCase();

// Senioriteit-tier op basis van functietitel. Volgorde van checks is belangrijk:
// 'managing director' moet als exec tellen, niet als director.
export function seniorityScore(title) {
  const t = String(title || '').toLowerCase();
  // VP/Head-tier eerst, zodat "vice president" niet door de exec-regel
  // (\bpresident\b) wordt opgeslokt en als C-level scoort.
  if (/\b(vp|svp|evp|vice president|head of|global head)\b/.test(t)) return 80;
  if (/\b(chief|chro|cfo|ceo|coo|cto|cpo|cmo|cio|founder|co-?founder|owner|president|managing director|managing partner)\b/.test(t)) return 100;
  if (/\bdirector\b/.test(t)) return 60;
  if (/\b(manager|lead|principal)\b/.test(t)) return 40;
  return 20;
}

// HR/People-relevantie (Glint-koper). 'employee engagement' voluit om marketing-
// 'engagement' niet mee te pakken.
export function isHrRole(title) {
  const t = String(title || '').toLowerCase();
  return /\b(hr|human resources|people|talent|culture|workforce|chro|l&d|learning and development|learning & development|total rewards|dei|diversity|employee experience|employee engagement)\b/.test(t);
}

export function contactRank(c) {
  const title = titleOf(c);
  return seniorityScore(title)
    + (isHrRole(title) ? 25 : 0)
    + (c.email ? 2 : 0)
    + (c.marketing_content_opt_in ? 1 : 0);
}

// Geeft de contact-ids terug die door 'max N per bedrijf' worden uitgesloten
// (de lager-rangschikkende boven de top-N per accountId). maxPerCompany null/0 =
// geen limiet. Contacten zonder accountId worden niet gelimiteerd.
export function surplusExclusions(contacts, maxPerCompany) {
  const n = Number(maxPerCompany) || 0;
  if (!n) return [];
  const byCompany = new Map();
  for (const c of (contacts || [])) {
    if (!c.accountId) continue; // geen bedrijf → nooit limiteren
    if (!byCompany.has(c.accountId)) byCompany.set(c.accountId, []);
    byCompany.get(c.accountId).push(c);
  }
  const excluded = [];
  for (const group of byCompany.values()) {
    if (group.length <= n) continue;
    const sorted = group.slice().sort((a, b) => contactRank(b) - contactRank(a));
    for (const c of sorted.slice(n)) excluded.push(c.id);
  }
  return excluded;
}
```

- [ ] **Step 4: Run de tests, bevestig dat ze slagen**

Run: `npm test -- content-audience-logic`
Expected: PASS — alle tests groen.

- [ ] **Step 5: Commit**

```bash
git add src/bd/content-audience-logic.js src/bd/content-audience-logic.test.js
git commit -m "feat(content-calendar): pure doelgroep-filter + samenvattingslogica (getest)"
```

---

## Task 3: Doelgroepkiezer-component

**Files:**
- Create: `src/bd/content-audience-picker.jsx`

Props: `contacts` (verrijkt), `accounts`, `allTags`, `initialContactIds` (string[]), `onApply({ contact_ids, summary })`, `onClose`.

- [ ] **Step 1: Schrijf het component**

```jsx
import React, { useMemo, useState } from 'react';
import { filterAudience, audienceSummary, surplusExclusions, contactRank } from './content-audience-logic';

// Tijdelijke doelgroepkiezer voor één content-item. Filtert de al ingeladen
// contacten client-side en levert een bevroren lijst contact-IDs + samenvatting.
export default function ContentAudiencePicker({ contacts = [], accounts = [], allTags = [], initialContactIds = [], onApply, onClose }) {
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
```

- [ ] **Step 2: Bevestig dat het bouwt (geen syntaxfouten)**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built` zonder errors. Daarna: `rm -rf dist_v*`.

- [ ] **Step 3: Commit**

```bash
git add src/bd/content-audience-picker.jsx
git commit -m "feat(content-calendar): doelgroepkiezer-component (filters + afvinkbare lijst)"
```

---

## Task 4: Content-view + modal omzetten naar de kiezer

**Files:**
- Modify: `src/bd/content-calendar-view.jsx`

- [ ] **Step 1: Import + props doorgeven**

Boven in het bestand, bij de bestaande imports, toevoegen:
```jsx
import ContentAudiencePicker from './content-audience-picker';
```

Signatuur van de view uitbreiden (`content-calendar-view.jsx:68`):
```jsx
export default function ContentCalendarView({ contacts = [], accounts = [], allTags = [] }) {
```

De modal-aanroep (`content-calendar-view.jsx:213-221`) props laten meegeven:
```jsx
      {openItem && (
        <ContentItemModal
          item={items.find(it => it.id === openItem.id) || openItem}
          tags={tags}
          contacts={contacts}
          accounts={accounts}
          allTags={allTags}
          onClose={() => setOpenItem(null)}
          onSaved={(fields) => { patchLocal(openItem.id, fields); }}
        />
      )}
```

- [ ] **Step 2: Modal-signatuur + state**

`ContentItemModal`-signatuur (`content-calendar-view.jsx:400`):
```jsx
function ContentItemModal({ item, tags = [], contacts = [], accounts = [], allTags = [], onClose, onSaved }) {
```

Na de bestaande `targetTag`-state (`content-calendar-view.jsx:409`) toevoegen:
```jsx
  const [targetContactIds, setTargetContactIds] = useState(item.target_contact_ids || []);
  const [audienceSummaryText, setAudienceSummaryText] = useState(item.audience_summary || '');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
```

- [ ] **Step 3: Save-velden uitbreiden**

In `save()` het `fields`-object (`content-calendar-view.jsx:493-502`) uitbreiden zodat de bevroren selectie wordt weggeschreven (en `target_tag` niet meer vanuit de UI wordt gezet):
```jsx
    const fields = {
      subject: isEmail ? (subject || null) : null,
      body,
      target_tag: item.target_tag || null,
      target_contact_ids: isEmail ? (targetContactIds.length ? targetContactIds : null) : null,
      audience_summary: isEmail ? (audienceSummaryText || null) : null,
      linkedin_account_id: isLinkedIn ? (accountId || null) : null,
      recipient_contact_id: isDM ? (recipientId || null) : null,
      scheduled_at,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
```

En de `onSaved`-callback (`content-calendar-view.jsx:506`) meesturen zodat de lokale patch klopt:
```jsx
    onSaved && onSaved({ subject: fields.subject, body, target_tag: fields.target_tag, target_contact_ids: fields.target_contact_ids, audience_summary: fields.audience_summary, linkedin_account_id: fields.linkedin_account_id, recipient_contact_id: fields.recipient_contact_id, scheduled_at, status: nextStatus });
```

- [ ] **Step 4: Tag-dropdown vervangen door kiezer-knop**

Vervang het volledige `{isEmail && ( ... )}`-blok van de "Doelgroep (tag)"-dropdown (`content-calendar-view.jsx:620-635`) door:
```jsx
          {isEmail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Doelgroep
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn-ghost" disabled={published} onClick={() => setShowAudiencePicker(true)}>
                  {targetContactIds.length ? 'Doelgroep wijzigen' : 'Doelgroep samenstellen'}
                </button>
                {targetContactIds.length > 0
                  ? <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{audienceSummaryText || `${targetContactIds.length} contacten geselecteerd`}</span>
                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Nog geen doelgroep gekozen.</span>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Tijdelijke selectie voor dit bericht. De cron verstuurt alleen naar opted-in, actieve contacten.
              </span>
            </div>
          )}
```

- [ ] **Step 5: Goedkeur-waarschuwing op selectie i.p.v. tag**

In het goedkeur-label (`content-calendar-view.jsx:657` en `:659`) `targetTag` vervangen door `targetContactIds.length`:
```jsx
              {approved && hasDate && isEmail && !targetContactIds.length && <span style={{ fontSize: 11, color: '#d97706' }}>(stel een doelgroep samen, anders kan de cron niet versturen)</span>}
```
en in de "wordt automatisch gepubliceerd"-conditie:
```jsx
              {approved && hasDate && ((isEmail && targetContactIds.length) || (isDM && recipientId) || item.type === 'linkedin_post') && <span style={{ fontSize: 11, color: '#16a34a' }}>→ wordt automatisch gepubliceerd op de geplande tijd</span>}
```

- [ ] **Step 6: Kiezer-modal renderen**

Direct vóór de afsluitende return-tags van de modal (net ná het hoofd-form-blok, binnen de outer modal-`div`), de picker conditioneel tonen:
```jsx
          {showAudiencePicker && (
            <ContentAudiencePicker
              contacts={contacts}
              accounts={accounts}
              allTags={allTags}
              initialContactIds={targetContactIds}
              onApply={({ contact_ids, summary }) => { setTargetContactIds(contact_ids); setAudienceSummaryText(summary); setShowAudiencePicker(false); }}
              onClose={() => setShowAudiencePicker(false)}
            />
          )}
```

- [ ] **Step 7: Bevestig dat het bouwt**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna `rm -rf dist_v*`.

- [ ] **Step 8: Commit**

```bash
git add src/bd/content-calendar-view.jsx
git commit -m "feat(content-calendar): draft-popup gebruikt doelgroepkiezer i.p.v. tag-dropdown"
```

---

## Task 5: Props doorgeven vanuit BDApp

**Files:**
- Modify: `src/bd/BDApp.jsx:353`

- [ ] **Step 1: `accounts` + `allTags` meegeven**

Vervang (`BDApp.jsx:353`):
```jsx
    leftPane = <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}><ContentCalendarView contacts={contacts} /></div>;
```
door:
```jsx
    leftPane = <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}><ContentCalendarView contacts={contacts} accounts={accounts} allTags={allTags} /></div>;
```

- [ ] **Step 2: Bevestig dat het bouwt**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna `rm -rf dist_v*`.

- [ ] **Step 3: Commit**

```bash
git add src/bd/BDApp.jsx
git commit -m "feat(content-calendar): accounts + allTags doorgeven aan content-view"
```

---

## Task 6: Cron gebruikt de bevroren selectie

**Files:**
- Modify: `api/content-calendar-execute.js:56-92`

- [ ] **Step 1: `recipientsForItem` uitbreiden**

Vervang de functie (`api/content-calendar-execute.js:56-76`) door onderstaande. Nieuw: als `target_contact_ids` gevuld is, gebruik die als basis-IDs; anders het bestaande tag-pad. Beide lopen door dezelfde opt-in/actief-guard.

```js
// Ontvangers voor een e-mail-item. Voorkeur: bevroren target_contact_ids;
// anders fallback naar de tag. Beide paden filteren op content-opt-in, e-mail,
// en slaan afgemelde/inactieve/former contacten over (compliance-vangnet).
async function baseContactIds(item) {
  if (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length) {
    return { ids: item.target_contact_ids };
  }
  const tagId = await resolveTagId(item.target_tag);
  if (!tagId) return { error: `tag "${item.target_tag || '(leeg)'}" niet gevonden` };
  const links = await supabase.from('contact_tags').select('contact_id').eq('tag_id', tagId);
  return { ids: (links.data || []).map(r => r.contact_id) };
}

async function recipientsForItem(item) {
  const { ids, error: baseErr } = await baseContactIds(item);
  if (baseErr) return { error: baseErr };
  if (!ids || ids.length === 0) return { recipients: [] };
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await supabase.from('contacts')
      .select('id, email, first_name, do_not_email, former, stage')
      .in('id', ids.slice(i, i + 500))
      .eq('marketing_content_opt_in', true)
      .not('email', 'is', null);
    if (error) return { error: error.message };
    rows.push(...(data || []));
  }
  // Inactieve/former contacten overslaan (zelfde regel als de app).
  const active = rows.filter(r => !r.former && String(r.stage || '').toLowerCase() !== 'inactive');
  return { recipients: active };
}
```

- [ ] **Step 2: Foutmelding neutraliseren (niet "voor deze tag")**

Vervang de reason-tekst (`api/content-calendar-execute.js:82`):
```js
  if (!recipients || recipients.length === 0) return { ok: false, reason: 'geen opted-in ontvangers in de selectie' };
```

- [ ] **Step 3: Bevestig dat het bouwt**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built` (build compileert ook de api-imports niet, maar valideert de frontend; de api-wijziging is los). Daarna `rm -rf dist_v*`.

- [ ] **Step 4: Commit**

```bash
git add api/content-calendar-execute.js
git commit -m "feat(content-calendar): cron verstuurt naar bevroren target_contact_ids (tag als fallback)"
```

---

## Task 7: Versiebump, volledige testrun, changelog

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`

- [ ] **Step 1: Huidige versie lezen**

Run: `cat VERSION`
Bepaal de nieuwe minor-versie (bv. huidige `1.72.0` → nieuwe `1.73.0`). Gebruik hieronder `<NEW>` = die versie.

- [ ] **Step 2: Versie bumpen (lockstep)**

Zet `<NEW>` in `VERSION` en in `package.json` (`"version": "<NEW>"`). Voeg boven aan de changelog-lijst in `src/bd/changelog.js` een entry toe in hetzelfde format als de bestaande bovenste entry, met tekst:
`Content: doelgroep per e-mail-item samenstellen met filters (tijdelijke selectie i.p.v. vaste tag).`

- [ ] **Step 3: Volledige testsuite draaien**

Run: `npm test`
Expected: alle tests PASS (inclusief `content-audience-logic` en de bestaande `content-calendar-logic` / `adapters`).

- [ ] **Step 4: Productiebuild**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna `rm -rf dist_v*`.

- [ ] **Step 5: Commit + tag**

```bash
git add VERSION package.json src/bd/changelog.js
git commit -m "chore(release): v<NEW> — content-doelgroepkiezer"
git tag v<NEW>
```

- [ ] **Step 6: Handmatige verificatie (na push door de gebruiker)**

CLAUDE.md §10: gebruiker pusht (na akkoord) → Vercel deploy (~1-2 min) → hard refresh. Verifieer:
1. Content-tab → open een e-mail-item → "Doelgroep samenstellen" → filter (bv. status Prospect + land) → contacten afvinken → "Gebruik deze selectie".
2. Samenvattingsregel verschijnt; goedkeuren + datum zetten → status `scheduled`.
3. Na de cron-run (of via de Vercel-logs, filter op `content-calendar-execute`): controleer `published_recipient_count` en dat de e-mail naar de bevroren selectie ging.

---

## Zelf-review (uitgevoerd bij het schrijven)

- **Spec-dekking:** DB-kolommen (Task 1), pure logica incl. per-bedrijf rangorde + ontdubbeling (Task 2: `seniorityScore`/`isHrRole`/`contactRank`/`surplusExclusions`), kiezer-component met gegroepeerde lijst + 'max per bedrijf' (Task 3), popup-integratie + waarschuwing (Task 4), props (Task 5), cron-fallback + guard (Task 6), versie/changelog + verificatie (Task 7). Alle spec-secties (incl. beslissing #5) gedekt.
- **Fallback-gedrag:** bestaande items zonder `target_contact_ids` gebruiken `target_tag` (Task 6, `baseContactIds`).
- **Compliance-guard:** blijft in beide paden (opt-in, e-mail aanwezig, niet former/inactief) — Task 6.
- **Type-consistentie:** `target_contact_ids` overal `uuid[]`/`string[]`; `audience_summary`/`audienceSummaryText` string; `filters`-vorm identiek tussen logica (Task 2) en component (Task 3); functienamen `contactMatchesAudience`/`filterAudience`/`audienceSummary`/`seniorityScore`/`isHrRole`/`contactRank`/`surplusExclusions` consistent gebruikt; `surplusExclusions` retourneert `string[]` en wordt in de component in een `Set` gestopt (`new Set(...)`).
- **Rangorde-titelveld:** `contactRank` leest `c.role || c.title` (verrijkte contacten dragen `role`), zodat de ranking werkt ongeacht welk veld gevuld is.
- **Geen em-dash** in samenvatting (getest in Task 2, Step 1) — conform CLAUDE.md §2b voor content richting personen; hier UI-tekst, maar veilig gehouden.
