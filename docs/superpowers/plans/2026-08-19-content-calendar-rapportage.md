# Content Calendar Rapportage-popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elk kalenderkaartje in de Content Calendar krijgt een rapportage-icoon dat een popup opent met pijplijn-status, verzendresultaat en inhoud (gestructureerd + optionele AI-samenvatting).

**Architecture:** Pure afgeleide logica (`itemReport`) in `content-calendar-logic.js` met unit-tests; een presentational `ContentReportModal` in `content-calendar-view.jsx`; een rapportage-icoon op `ItemCard` met een nieuwe `onReport`-prop die door `WeekGrid` en `UnscheduledTray` naar `ContentCalendarView` loopt; een lean `api/content-summary.js` (Haiku, `requireUser`) voor de AI-samenvatting op verzoek.

**Tech Stack:** React 19, Vite, Vitest, Supabase, Vercel serverless, `@anthropic-ai/sdk`.

**Belangrijk (geverifieerd):** de maandweergave (`MonthGrid`) rendert GEEN losse kaartjes — alleen gekleurde stipjes per dag. `ItemCard` wordt gebruikt in `WeekGrid` en `UnscheduledTray`. Het icoon verschijnt daar; niet in de maandweergave.

---

## Bestandsstructuur

- `src/bd/content-calendar-logic.js` — pure functie `itemReport()` toevoegen (afgeleide rapportage, geen UI-constanten).
- `src/bd/content-calendar-logic.test.js` — unit-tests voor `itemReport()`.
- `api/content-summary.js` — nieuw endpoint (`requireUser`, Haiku) → `{ summary }`.
- `src/bd/content-calendar-view.jsx` — `ContentReportModal`-component; icoon + `onReport` op `ItemCard`; `onReport` doorgeven in `WeekGrid` en `UnscheduledTray`; `reportItem`-state + modal renderen in `ContentCalendarView`.
- `VERSION`, `package.json`, `src/bd/changelog.js` — versie-discipline.

---

## Task 1: Pure functie `itemReport()` (TDD)

**Files:**
- Modify: `src/bd/content-calendar-logic.js`
- Test: `src/bd/content-calendar-logic.test.js`

`itemReport` bevat GEEN afzender-string (die vergt UI-account-mapping); de modal
bouwt de afzenderregel zelf. `now` is een parameter zodat de functie
deterministisch is (geen `Date.now()` intern).

- [ ] **Step 1: Schrijf de falende tests**

Voeg onderaan `src/bd/content-calendar-logic.test.js`, vóór de laatste sluitende
`});` van het bovenste `describe`-blok, een nieuw top-level testblok toe. Zet het
NA de bestaande `describe(...)` (op hetzelfde niveau) en werk de import bij.

Wijzig de importregel bovenaan:

```js
import { isApproved, deriveStatus, statusAfterMove, itemReport } from './content-calendar-logic';
```

Voeg dit testblok toe (na de bestaande `describe('content calendar status logic', ...)`):

```js
describe('itemReport — afgeleide rapportage per contentstuk', () => {
  const NOW = new Date('2026-08-19T12:00:00Z');
  const base = {
    status: 'draft', channel: 'glint', type: 'email',
    created_at: '2026-08-01T09:00:00Z', scheduled_at: null, published_at: null,
    target_tag: null, target_contact_ids: null, recipient_contact_id: null,
    published_recipient_count: null, external_message_id: null, sent_emails: null,
  };

  it('stage en stageIndex volgen de status', () => {
    expect(itemReport({ ...base, status: 'draft' }, { now: NOW }).stageIndex).toBe(0);
    expect(itemReport({ ...base, status: 'approved' }, { now: NOW }).stageIndex).toBe(1);
    expect(itemReport({ ...base, status: 'scheduled' }, { now: NOW }).stageIndex).toBe(2);
    expect(itemReport({ ...base, status: 'published' }, { now: NOW }).stageIndex).toBe(3);
  });

  it('onbekende status valt terug op draft', () => {
    expect(itemReport({ ...base, status: 'weird' }, { now: NOW }).stage).toBe('draft');
  });

  it('waarschuwt: goedgekeurd zonder datum', () => {
    const w = itemReport({ ...base, status: 'approved', scheduled_at: null }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'warn' && /geen datum/i.test(x.message))).toBe(true);
  });

  it('waarschuwt: geplande tijd verstreken', () => {
    const w = itemReport({ ...base, status: 'scheduled', scheduled_at: '2026-08-18T09:00:00Z', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'warn' && /verstreken/i.test(x.message))).toBe(true);
  });

  it('geen verstreken-waarschuwing als de datum in de toekomst ligt', () => {
    const w = itemReport({ ...base, status: 'scheduled', scheduled_at: '2026-08-20T09:00:00Z', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => /verstreken/i.test(x.message))).toBe(false);
  });

  it('blokkeert: e-mail zonder doelgroep', () => {
    const w = itemReport({ ...base, status: 'approved', type: 'email', target_tag: null, target_contact_ids: [] }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'block' && /doelgroep/i.test(x.message))).toBe(true);
  });

  it('geen doelgroep-blokkade als er een target_tag is', () => {
    const w = itemReport({ ...base, status: 'approved', type: 'email', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => /doelgroep/i.test(x.message))).toBe(false);
  });

  it('blokkeert: DM zonder ontvanger', () => {
    const w = itemReport({ ...base, status: 'scheduled', type: 'linkedin_dm', scheduled_at: '2026-08-20T09:00:00Z', recipient_contact_id: null }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'block' && /ontvanger/i.test(x.message))).toBe(true);
  });

  it('send is null bij een kale draft', () => {
    expect(itemReport({ ...base, status: 'draft' }, { now: NOW }).send).toBeNull();
  });

  it('send toont drip-voortgang en ontvangersaantal', () => {
    const r = itemReport({ ...base, status: 'published', published_recipient_count: 42, sent_emails: ['a@x.nl', 'b@x.nl'], external_message_id: 'msg_1' }, { now: NOW });
    expect(r.send.recipientCount).toBe(42);
    expect(r.send.dripSent).toBe(2);
    expect(r.send.externalId).toBe('msg_1');
  });

  it('timeline geeft de gevulde momenten door', () => {
    const r = itemReport({ ...base, status: 'published', published_at: '2026-08-19T09:00:00Z' }, { now: NOW });
    expect(r.timeline.created_at).toBe('2026-08-01T09:00:00Z');
    expect(r.timeline.published_at).toBe('2026-08-19T09:00:00Z');
  });
});
```

- [ ] **Step 2: Draai de tests, verifieer dat ze falen**

Run: `npx vitest run src/bd/content-calendar-logic.test.js`
Expected: FAIL — `itemReport is not a function` (of `is not exported`).

- [ ] **Step 3: Implementeer `itemReport`**

Voeg onderaan `src/bd/content-calendar-logic.js` toe:

```js
// Afgeleide rapportage voor één contentstuk. Pure functie: `now` komt binnen als
// parameter zodat de "verstreken tijd"-waarschuwing deterministisch testbaar is.
// Bevat bewust GEEN afzender-string (die vergt UI-account-mapping) — de modal
// bouwt de afzenderregel zelf.
export function itemReport(item, { now = new Date() } = {}) {
  const STAGES = ['draft', 'approved', 'scheduled', 'published'];
  const stage = STAGES.includes(item.status) ? item.status : 'draft';
  const stageIndex = STAGES.indexOf(stage);

  const hasDate = !!item.scheduled_at;
  const hasEmailAudience =
    !!item.target_tag ||
    (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length > 0);

  const warnings = [];
  if (stage === 'approved' && !hasDate) {
    warnings.push({ level: 'warn', message: 'Goedgekeurd maar geen datum; de cron plant dit nog niet in.' });
  }
  if (stage === 'scheduled' && hasDate && new Date(item.scheduled_at).getTime() < now.getTime()) {
    warnings.push({ level: 'warn', message: 'Geplande tijd is verstreken maar nog niet gepubliceerd; check de Vercel-logs.' });
  }
  if (item.type === 'email' && (stage === 'approved' || stage === 'scheduled') && !hasEmailAudience) {
    warnings.push({ level: 'block', message: 'Geen doelgroep; de cron kan niet versturen.' });
  }
  if (item.type === 'linkedin_dm' && (stage === 'approved' || stage === 'scheduled') && !item.recipient_contact_id) {
    warnings.push({ level: 'block', message: 'Geen ontvanger gekozen.' });
  }

  const dripSent = Array.isArray(item.sent_emails) ? item.sent_emails.length : 0;
  const showSend = stage === 'scheduled' || stage === 'published' || dripSent > 0;
  const send = showSend
    ? {
        channel: item.channel,
        type: item.type,
        recipientCount: item.published_recipient_count ?? null,
        dripSent,
        externalId: item.external_message_id || null,
      }
    : null;

  return {
    stage,
    stageIndex,
    timeline: {
      created_at: item.created_at || null,
      scheduled_at: item.scheduled_at || null,
      published_at: item.published_at || null,
    },
    warnings,
    send,
  };
}
```

- [ ] **Step 4: Draai de tests, verifieer dat ze slagen**

Run: `npx vitest run src/bd/content-calendar-logic.test.js`
Expected: PASS (alle nieuwe `itemReport`-tests én de bestaande status-tests).

- [ ] **Step 5: Commit**

```bash
git add src/bd/content-calendar-logic.js src/bd/content-calendar-logic.test.js
git commit -m "feat(content-calendar): pure itemReport() met tests"
```

---

## Task 2: AI-samenvatting endpoint `api/content-summary.js`

**Files:**
- Create: `api/content-summary.js`

Er is geen serverless-testharnas in dit project; dit endpoint wordt via de build
en handmatig geverifieerd (Task 5). Patroon gekopieerd van `api/account-summary.js`
(guard + Anthropic SDK). Model: Haiku 4.5.

- [ ] **Step 1: Schrijf het endpoint**

Maak `api/content-summary.js`:

```js
import { requireUser } from './_lib/guard.js';
import Anthropic from '@anthropic-ai/sdk';

// Korte, on-demand samenvatting van één contentstuk voor de rapportage-popup in
// de Content Calendar. Puur intern (geen client-facing tekst), dus de §2b-
// communicatieregels gelden hier niet. Guard: alleen ingelogde CRM-gebruikers.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channel, type, subject, body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'body is verplicht' });
  }

  const text = String(body).replace(/\s+/g, ' ').slice(0, 4000);
  const prompt = `Vat het volgende interne contentstuk in 1-2 korte zinnen samen, in het Nederlands, zodat een collega in één oogopslag weet waar het over gaat. Geef ALLEEN de samenvatting terug, zonder inleiding of opmaak.

Kanaal: ${channel || 'onbekend'}
Type: ${type || 'onbekend'}
${subject ? `Onderwerp: ${subject}\n` : ''}Inhoud: ${text}`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const summary = (message.content[0]?.text || '').trim();
    return res.status(200).json({ summary });
  } catch (e) {
    console.error('content-summary generation failed:', e);
    return res.status(500).json({ error: 'Samenvatting mislukt: ' + e.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/content-summary.js
git commit -m "feat(content-calendar): api/content-summary endpoint (Haiku, requireUser)"
```

---

## Task 3: `ContentReportModal`-component

**Files:**
- Modify: `src/bd/content-calendar-view.jsx`

De component leeft in `content-calendar-view.jsx` (naast `ContentItemModal`).
`apiFetch`, `CHANNELS`, `TYPE_BADGE`, `STATUS_STYLE`, `linkedinAccountLabel`,
`MONTHS_NL` zijn al beschikbaar in dit bestand. `itemReport` moet geïmporteerd
worden.

- [ ] **Step 1: Werk de logic-import bij**

Vind de bestaande import (rond regel 6):

```js
import { isApproved, deriveStatus, statusAfterMove } from './content-calendar-logic';
```

Vervang door:

```js
import { isApproved, deriveStatus, statusAfterMove, itemReport } from './content-calendar-logic';
```

- [ ] **Step 2: Voeg de `ContentReportModal`-component toe**

Plaats dit direct vóór de definitie van `function ItemCard(` (rond regel 226):

```jsx
// Kleine datum-notatie voor de rapportage (nl-NL, dag-maand-tijd).
function fmtReportDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const REPORT_STAGES = [
  { key: 'draft', label: 'Concept' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'scheduled', label: 'Gepland' },
  { key: 'published', label: 'Gepubliceerd' },
];

// Rapportage-popup voor één contentstuk. Los van de editor (ContentItemModal).
function ContentReportModal({ item, contacts = [], onClose }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState(null);

  const rep = itemReport(item, { now: new Date() });
  const ch = CHANNELS.find(c => c.key === item.channel);

  // Afzenderregel (kanaal-afhankelijk; bewust buiten de pure itemReport gehouden).
  let senderLine = null;
  if (item.type === 'email') {
    senderLine = [item.from_name, item.from_email].filter(Boolean).join(' · ') || null;
  } else {
    senderLine = `LinkedIn van ${linkedinAccountLabel(item.linkedin_account_id)}`;
  }

  // Doelgroep-omschrijving voor het inhoud-blok.
  let audience = null;
  if (item.type === 'linkedin_dm') {
    const c = contacts.find(x => x.id === item.recipient_contact_id);
    audience = c ? (c.name || c.full_name || c.email || 'gekozen contact') : (item.recipient_contact_id ? 'gekozen contact' : 'geen ontvanger');
  } else if (item.target_tag) {
    audience = `tag: ${item.target_tag}`;
  } else if (item.audience_summary) {
    audience = item.audience_summary;
  } else if (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length) {
    audience = `${item.target_contact_ids.length} contact${item.target_contact_ids.length === 1 ? '' : 'en'}`;
  }

  async function runSummary() {
    setAiLoading(true); setAiErr(null);
    try {
      const resp = await apiFetch('/api/content-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: item.channel, type: item.type, subject: item.subject, body: item.body }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setAiSummary(data.summary || '(geen samenvatting)');
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const box = { fontSize: 13, border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 };
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(560px, 95vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: ch?.color || 'var(--text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: ch?.color }}>{ch?.label || item.channel}</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{TYPE_BADGE[item.type] || item.type}</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>Rapportage</span>
          <button className="btn-ghost tiny" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Blok 1: Status */}
          <div style={box}>
            <span style={label}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {REPORT_STAGES.map((s, i) => (
                <span key={s.key} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 999,
                  border: `1px solid ${i <= rep.stageIndex ? (ch?.color || 'var(--accent)') : 'var(--sep)'}`,
                  background: i === rep.stageIndex ? (ch?.color || 'var(--accent)') : 'transparent',
                  color: i === rep.stageIndex ? '#fff' : (i < rep.stageIndex ? 'var(--text-1)' : 'var(--text-3)'),
                  fontWeight: i === rep.stageIndex ? 700 : 500,
                }}>{s.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: 'var(--text-2)', fontSize: 12 }}>
              {fmtReportDate(rep.timeline.created_at) && <div>Aangemaakt: {fmtReportDate(rep.timeline.created_at)}</div>}
              {fmtReportDate(rep.timeline.scheduled_at) && <div>Gepland voor: {fmtReportDate(rep.timeline.scheduled_at)}</div>}
              {fmtReportDate(rep.timeline.published_at) && <div>Gepubliceerd: {fmtReportDate(rep.timeline.published_at)}</div>}
            </div>
            {rep.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: w.level === 'block' ? '#dc2626' : '#d97706' }}>
                {w.level === 'block' ? '⛔ ' : '⚠️ '}{w.message}
              </div>
            ))}
          </div>

          {/* Blok 2: Verzendresultaat */}
          {rep.send && (
            <div style={box}>
              <span style={label}>Verzendresultaat</span>
              {senderLine && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Afzender: {senderLine}</div>}
              {rep.send.recipientCount != null
                ? <div style={{ color: 'var(--text-1)' }}>Verstuurd aan {rep.send.recipientCount} contact{rep.send.recipientCount === 1 ? '' : 'en'}</div>
                : (rep.send.dripSent > 0
                    ? <div style={{ color: 'var(--text-1)' }}>{rep.send.dripSent} verstuurd tot nu toe (drip loopt nog)</div>
                    : <div style={{ color: 'var(--text-3)' }}>Nog niet verstuurd</div>)}
              {rep.send.externalId && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>ID: {rep.send.externalId}</div>}
            </div>
          )}

          {/* Blok 3: Inhoud */}
          <div style={box}>
            <span style={label}>Inhoud</span>
            {audience && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Doelgroep: {audience}</div>}
            {item.subject && <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{item.subject}</div>}
            <div style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
              {(item.body || '(geen inhoud)').slice(0, 240)}{(item.body || '').length > 240 ? '…' : ''}
            </div>
            {item.source_note && <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Bron: {item.source_note}</div>}

            <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aiSummary
                ? <div style={{ color: 'var(--text-1)' }}>{aiSummary}</div>
                : (
                  <button className="btn-ghost tiny" style={{ alignSelf: 'flex-start' }} disabled={aiLoading} onClick={runSummary}>
                    {aiLoading ? 'Samenvatten…' : 'AI-samenvatting'}
                  </button>
                )}
              {aiErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Samenvatting mislukt: {aiErr}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verifieer dat het bestand nog bouwt (component nog niet gebruikt)**

Run: `D="dist_v$(date +%s)"; npx vite build --outDir "$D" 2>&1 | grep -E "built|error|Error"; rm -rf dist_v*`
Expected: `✓ built` (React kan een gedefinieerde-maar-ongebruikte component negeren).

- [ ] **Step 4: Commit**

```bash
git add src/bd/content-calendar-view.jsx
git commit -m "feat(content-calendar): ContentReportModal-component"
```

---

## Task 4: Icoon op de kaart + bedrading naar de parent

**Files:**
- Modify: `src/bd/content-calendar-view.jsx`

`onReport` moet stromen: `ContentCalendarView` → `WeekGrid` → `ItemCard`, en
`ContentCalendarView` → `UnscheduledTray` → `ItemCard`.

- [ ] **Step 1: Voeg `reportItem`-state toe in `ContentCalendarView`**

Vind (rond regel 78):

```js
  const [openItem, setOpenItem] = useState(null); // item-object voor de detail-modal
```

Voeg direct daaronder toe:

```js
  const [reportItem, setReportItem] = useState(null); // item-object voor de rapportage-popup
```

- [ ] **Step 2: Geef `onReport` door aan `WeekGrid` en `UnscheduledTray`**

Vind de `WeekGrid`-render (rond regel 201-202):

```jsx
              {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} items={items} />
```

Vervang door:

```jsx
              {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} onReport={setReportItem} items={items} />
```

Vind de `UnscheduledTray`-render (rond regel 208):

```jsx
          <UnscheduledTray items={unscheduled} {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} />
```

Vervang door:

```jsx
          <UnscheduledTray items={unscheduled} {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} onReport={setReportItem} />
```

- [ ] **Step 3: Render de `ContentReportModal`**

Vind waar de bestaande `ContentItemModal` (editor) gerenderd wordt. Zoek naar
`openItem &&` in `ContentCalendarView`'s return. Voeg direct ná dat blok toe:

```jsx
      {reportItem && (
        <ContentReportModal item={reportItem} contacts={contacts} onClose={() => setReportItem(null)} />
      )}
```

(Als de editor conditioneel is als `{openItem && (<ContentItemModal ... />)}`, plaats
het rapportage-blok op hetzelfde niveau, ernaast.)

- [ ] **Step 4: `onReport` toevoegen aan `ItemCard` + het icoon**

Vind de `ItemCard`-signature (regel 226):

```jsx
function ItemCard({ it, draggable = false, dragging = false, setDraggingId, onOpen }) {
```

Vervang door:

```jsx
function ItemCard({ it, draggable = false, dragging = false, setDraggingId, onOpen, onReport }) {
```

Vind de type-badge-regel binnen `ItemCard` (rond regel 242-244):

```jsx
      <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', color: ch?.color || 'var(--text-2)', fontWeight: 700 }}>
        {TYPE_BADGE[it.type] || it.type}
      </span>
```

Vervang door (badge links, rapportage-icoon rechts):

```jsx
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', color: ch?.color || 'var(--text-2)', fontWeight: 700 }}>
          {TYPE_BADGE[it.type] || it.type}
        </span>
        <button
          title="Rapportage bekijken"
          onClick={(e) => { e.stopPropagation(); onReport && onReport(it); }}
          onDragStart={(e) => e.preventDefault()}
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 11, color: 'var(--text-3)' }}>
          📊
        </button>
      </span>
```

- [ ] **Step 5: Geef `onReport` door binnen `WeekGrid` en `UnscheduledTray` naar `ItemCard`**

`WeekGrid`-signature (regel 252): voeg `onReport` toe aan de props-destructuring:

```jsx
function WeekGrid({ channels, weekDays, weekIndex, today, draggingId, setDraggingId, onMoveToDate, onOpen, onReport, items }) {
```

`WeekGrid`'s `ItemCard`-render (rond regel 296):

```jsx
                  <ItemCard key={it.id} it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} />
```

Vervang door:

```jsx
                  <ItemCard key={it.id} it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} onReport={onReport} />
```

`UnscheduledTray`-signature (regel 367): voeg `onReport` toe:

```jsx
function UnscheduledTray({ items, draggingId, setDraggingId, onMoveToDate, onOpen, onReport }) {
```

`UnscheduledTray`'s `ItemCard`-render (rond regel 391):

```jsx
            <ItemCard it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} />
```

Vervang door:

```jsx
            <ItemCard it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} onReport={onReport} />
```

- [ ] **Step 6: Build-check**

Run: `D="dist_v$(date +%s)"; npx vite build --outDir "$D" 2>&1 | grep -E "built|error|Error"; rm -rf dist_v*`
Expected: `✓ built`, geen errors.

- [ ] **Step 7: Commit**

```bash
git add src/bd/content-calendar-view.jsx
git commit -m "feat(content-calendar): rapportage-icoon op kaartjes + popup-bedrading"
```

---

## Task 5: Versie-discipline, volledige verificatie & handmatige check

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`

- [ ] **Step 1: Draai de volledige testsuite**

Run: `npm test`
Expected: alle tests groen (incl. de nieuwe `itemReport`-tests).

- [ ] **Step 2: Bepaal de nieuwe versie**

Run: `cat VERSION`
Bump de patch/minor met één (feature → minor is prima; volg wat op dat moment
logisch is t.o.v. de laatste tag). Noteer de nieuwe versie als `<NEW>` in de
volgende stappen.

- [ ] **Step 3: Bump `VERSION` en `package.json`**

```bash
printf '<NEW>\n' > VERSION
sed -i '' 's/"version": "<OLD>"/"version": "<NEW>"/' package.json
```

- [ ] **Step 4: Changelog-entry toevoegen**

Zet `CURRENT_VERSION` in `src/bd/changelog.js` op `<NEW>` en voeg bovenaan de
`CHANGELOG`-array een entry toe (timestamp via `date -u +%Y-%m-%dT%H:%M:%SZ`):

```js
  {
    version: '<NEW>',
    date: '<UTC-TIMESTAMP>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Content Calendar: rapportage-popup per contentstuk',
    summary: 'Elk kaartje krijgt een rapportage-icoon dat een popup opent met pijplijn-status, verzendresultaat en inhoud (gestructureerd + optionele AI-samenvatting).',
    changes: [
      'content-calendar-logic.js: pure itemReport() met waarschuwingsregels + tests.',
      'content-calendar-view.jsx: ContentReportModal + rapportage-icoon op ItemCard (week + ongeplande tray).',
      'api/content-summary.js: nieuw endpoint (requireUser, Haiku) voor de AI-samenvatting op verzoek.',
    ],
    files: [
      'src/bd/content-calendar-logic.js',
      'src/bd/content-calendar-view.jsx',
      'api/content-summary.js',
    ],
    gitTag: 'v<NEW>',
  },
```

- [ ] **Step 5: Build-check**

Run: `D="dist_v$(date +%s)"; npx vite build --outDir "$D" 2>&1 | grep -E "built|error|Error"; rm -rf dist_v*`
Expected: `✓ built`.

- [ ] **Step 6: Commit + tag**

```bash
git add VERSION package.json src/bd/changelog.js
git commit -m "chore(content-calendar): versie <NEW> — rapportage-popup"
git tag v<NEW>
```

- [ ] **Step 7: Handmatige verificatie (na push + deploy, met de gebruiker)**

Vraag de gebruiker om na de deploy hard te refreshen (Cmd+Shift+R) en te checken:
- 📊-icoon zichtbaar rechtsboven op de kaartjes in de weekweergave én in de
  tray met ongeplande stukken (niet in de maandweergave — die heeft geen kaartjes).
- Klik op het icoon opent de rapportage-popup en NIET de editor.
- Statusbalk, tijdlijn en waarschuwingen kloppen voor: een draft (geen datum),
  een gepland stuk (met datum), en een gepubliceerd stuk (met ontvangersaantal).
- "AI-samenvatting"-knop levert een korte samenvatting en herklik hergebruikt
  het resultaat (geen nieuwe call).

---

## Self-review notities

- **Spec-dekking:** trigger/icoon (Task 4), blok 1 status + waarschuwingen (Task 1 + 3), blok 2 verzendresultaat (Task 1 + 3), blok 3 inhoud + AI (Task 2 + 3), pure logica + tests (Task 1), versie-discipline (Task 5). Alle spec-secties gedekt.
- **Afwijking van de spec (bewust):** de spec noemde "week- én maandweergave"; de maandweergave rendert geen losse kaartjes, dus het icoon zit op `ItemCard` = week + ongeplande tray. In het plan expliciet gemaakt.
- **Afwijking van de spec (bewust):** `itemReport.send` bevat géén `sender`-string; die wordt in `ContentReportModal` gebouwd (kanaal-afhankelijke UI-mapping hoort niet in de pure functie).
- **Type-consistentie:** `itemReport` retourneert `{ stage, stageIndex, timeline{created_at,scheduled_at,published_at}, warnings[{level,message}], send|null{channel,type,recipientCount,dripSent,externalId} }` — consistent gebruikt in Task 3.
