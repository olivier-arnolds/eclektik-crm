# LinkedIn-antwoorden zichtbaar maken in cold outreach

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LinkedIn-antwoorden op de outreach-DM's detecteren en in het cold outreach-overzicht per contact tonen of er een conversatie is geweest en of een gentle reminder kan.

**Architecture:** Een nieuwe inboxscan (`api/outreach-linkedin-scan.js`) leest per outreach-contact de Unipile-chat op het exacte `linkedin_chat_id`, en hergebruikt de bestaande `classifyWithClaude` en `statusAfterClassification` zodat beide kanalen dezelfde statusmachine delen. Alle beslislogica komt als pure functies in `src/bd/outreach-match.js` te staan, waar `needsOurReply` en `statusAfterClassification` al wonen, zodat het zonder Supabase- of Unipile-verbinding getest kan worden. Het overzicht in `marketing-outreach.jsx` krijgt twee kolommen die uitsluitend uit die pure functies lezen.

**Tech Stack:** React 19, Vite, Supabase (Postgres), Vercel serverless, Unipile REST API, Anthropic SDK, Vitest.

**Ontwerp:** `docs/superpowers/specs/2026-09-25-linkedin-outreach-conversatie-design.md`

---

## Uitgangssituatie (gemeten op 25 september 2026)

```
Amsterdam 2026 LinkedIn:  154 contacten, 151 met linkedin_chat_id, 0 met last_inbound_at
DM's verstuurd tussen 11 en 22 september. Alle 151 staan nog op msg1_sent.
```

`last_inbound_at` wordt op dit moment alleen gezet door `api/outreach-classify.js`,
en dat is de mailboxscan. Er bestaat geen LinkedIn-scan.

## Bestandsoverzicht

| Bestand | Verantwoordelijkheid | Actie |
|---|---|---|
| `src/bd/outreach-match.js` | Pure outreach-logica (bestaat al: `needsOurReply`, `statusAfterClassification`) | Uitbreiden met 3 functies |
| `src/bd/outreach-match.test.js` | Tests daarvan (bestaat al) | Uitbreiden |
| `api/_lib/unipile-chat.js` | Unipile-chatberichten ophalen | Nieuw |
| `api/outreach-linkedin-scan.js` | De scan zelf, met droge run | Nieuw |
| `src/bd/marketing-outreach.jsx` | Cold outreach-overzicht | Twee kolommen erbij |
| `src/bd/lane-comms.jsx` | Comms-tab | Kapotte match repareren |
| `VERSION`, `package.json`, `src/bd/changelog.js` | Versie | Bijwerken |

**Waarom `api/_lib/unipile-chat.js` zijn eigen fetch bouwt:** `unipile-relation.js`,
`unipile-post.js` en `unipile-dm.js` doen dat alle drie ook, elk met hun eigen
`DSN`/`TOKEN` bovenaan. Dat is de conventie in deze repo. Niet unilateraal
herstructureren; dat is een apart gesprek.

## Belangrijke feiten over het datamodel

Geen migratie nodig. Alles bestaat al. Wat je moet weten:

* **`outreach_contact` heeft GEEN `last_sent_at`.** Het moment van onze laatste
  verzending komt uit `outreach_message` met `direction = 'outbound'`. Wie
  `last_sent_at` probeert te selecteren krijgt een 42703.
* **`outreach_message_inbound_provider_uniq`** is een unieke index op
  `provider_message_id` waar `direction = 'inbound'`. Dat geeft idempotentie
  gratis: een tweede scan die hetzelfde Unipile-bericht wil inserten botst.
* **`outreach_message_channel_chk`** staat `'email'` en `'linkedin'` toe.
* **`outreach_message_match_chk`** staat alleen
  `conversation_id | sender_email | domain_flag | none` toe. Voor LinkedIn
  gebruiken we `conversation_id`, want het chat-id IS de conversatie.
* Een Unipile-bericht is van ons als `is_sender === 1` (zo doet
  `lane-comms.jsx:718` het al).

---

## Task 1: Berichtselectie als pure functie

Welke berichten uit een chat tellen als antwoord: inkomend, en nieuwer dan onze
eigen laatste verzending.

**Files:**
- Modify: `src/bd/outreach-match.js` (toevoegen onderaan)
- Test: `src/bd/outreach-match.test.js` (toevoegen onderaan)

- [ ] **Step 1: Schrijf de falende test**

Toevoegen onderaan `src/bd/outreach-match.test.js`:

```js
describe('inkomendNaVerzending', () => {
  const V = '2026-09-11T10:00:00Z';

  it('laat onze eigen berichten weg', () => {
    const uit = inkomendNaVerzending([
      { id: 'a', is_sender: 1, timestamp: '2026-09-12T10:00:00Z' },
    ], { laatsteVerzendingISO: V });
    expect(uit).toEqual([]);
  });

  it('houdt een inkomend bericht van na onze verzending', () => {
    const uit = inkomendNaVerzending([
      { id: 'a', is_sender: 1, timestamp: '2026-09-11T10:00:00Z' },
      { id: 'b', is_sender: 0, timestamp: '2026-09-12T10:00:00Z' },
    ], { laatsteVerzendingISO: V });
    expect(uit.map(m => m.id)).toEqual(['b']);
  });

  it('laat een inkomend bericht van VOOR onze verzending weg', () => {
    // Iemand die ons eerder zelf schreef is geen antwoord op deze campagne.
    const uit = inkomendNaVerzending([
      { id: 'oud', is_sender: 0, timestamp: '2026-09-01T10:00:00Z' },
    ], { laatsteVerzendingISO: V });
    expect(uit).toEqual([]);
  });

  it('sorteert oplopend op tijd', () => {
    const uit = inkomendNaVerzending([
      { id: 'laat', is_sender: 0, timestamp: '2026-09-14T10:00:00Z' },
      { id: 'vroeg', is_sender: 0, timestamp: '2026-09-12T10:00:00Z' },
    ], { laatsteVerzendingISO: V });
    expect(uit.map(m => m.id)).toEqual(['vroeg', 'laat']);
  });

  it('neemt alles inkomend mee als de verzenddatum onbekend is', () => {
    const uit = inkomendNaVerzending([
      { id: 'a', is_sender: 0, timestamp: '2026-09-01T10:00:00Z' },
    ], { laatsteVerzendingISO: null });
    expect(uit.map(m => m.id)).toEqual(['a']);
  });

  it('slaat berichten zonder bruikbare tijd over', () => {
    const uit = inkomendNaVerzending([
      { id: 'a', is_sender: 0, timestamp: null },
      { id: 'b', is_sender: 0, timestamp: 'onzin' },
    ], { laatsteVerzendingISO: V });
    expect(uit).toEqual([]);
  });

  it('valt niet om op lege invoer', () => {
    expect(inkomendNaVerzending(null, {})).toEqual([]);
    expect(inkomendNaVerzending(undefined, undefined)).toEqual([]);
  });
});
```

Voeg `inkomendNaVerzending` toe aan de bestaande import bovenaan het testbestand.

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npx vitest run src/bd/outreach-match.test.js -t inkomendNaVerzending`
Expected: FAIL, `inkomendNaVerzending is not a function`

- [ ] **Step 3: Implementeer**

Toevoegen onderaan `src/bd/outreach-match.js`:

```js
/**
 * Kiest uit een Unipile-chat de berichten die als antwoord tellen: inkomend, en
 * van NA onze eigen laatste verzending.
 *
 * Die tweede eis doet ertoe. Een deel van deze chats bestond al voordat de
 * campagne liep, bijvoorbeeld omdat iemand Marco ooit zelf schreef. Zonder de
 * drempel zou zo'n oud bericht als antwoord op de campagne gelezen worden en
 * iemand ten onrechte op 'replied' zetten.
 *
 * Een bericht is van ons als is_sender 1 is; zo leest lane-comms.jsx het ook.
 */
export function inkomendNaVerzending(berichten, { laatsteVerzendingISO = null } = {}) {
  const drempelRuw = laatsteVerzendingISO ? new Date(laatsteVerzendingISO).getTime() : null;
  const drempel = Number.isFinite(drempelRuw) ? drempelRuw : null;

  return (Array.isArray(berichten) ? berichten : [])
    .filter((m) => m && m.is_sender !== 1)
    .filter((m) => {
      const t = m.timestamp ? new Date(m.timestamp).getTime() : null;
      if (t === null || !Number.isFinite(t)) return false;
      return drempel === null ? true : t > drempel;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npx vitest run src/bd/outreach-match.test.js -t inkomendNaVerzending`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/bd/outreach-match.js src/bd/outreach-match.test.js
git commit -m "feat(outreach): inkomendNaVerzending kiest de antwoorden uit een LinkedIn-chat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Conversatiestatus als pure functie

**Files:**
- Modify: `src/bd/outreach-match.js`
- Test: `src/bd/outreach-match.test.js`

- [ ] **Step 1: Schrijf de falende test**

```js
describe('conversatieStatus', () => {
  it('geen zonder inkomend bericht', () => {
    expect(conversatieStatus({})).toBe(CONV_GEEN);
    expect(conversatieStatus({ last_inbound_at: null })).toBe(CONV_GEEN);
  });

  it('antwoord als zij schreven en wij nog niet terug', () => {
    expect(conversatieStatus({ last_inbound_at: '2026-09-12T10:00:00Z' }))
      .toBe(CONV_ANTWOORD);
  });

  it('antwoord als ons bericht ouder is dan het hunne', () => {
    expect(conversatieStatus({
      last_inbound_at: '2026-09-12T10:00:00Z',
      answered_at: '2026-09-11T10:00:00Z',
    })).toBe(CONV_ANTWOORD);
  });

  it('heen en weer als wij als laatste schreven', () => {
    expect(conversatieStatus({
      last_inbound_at: '2026-09-12T10:00:00Z',
      answered_at: '2026-09-13T10:00:00Z',
    })).toBe(CONV_HEEN_EN_WEER);
  });

  it('blijft antwoord als iemand twee keer achter elkaar schrijft', () => {
    // Wij antwoordden op de 13e, zij schreven daarna nog een keer op de 14e.
    expect(conversatieStatus({
      last_inbound_at: '2026-09-14T10:00:00Z',
      answered_at: '2026-09-13T10:00:00Z',
    })).toBe(CONV_ANTWOORD);
  });

  it('negeert onbruikbare datums', () => {
    expect(conversatieStatus({ last_inbound_at: 'onzin' })).toBe(CONV_GEEN);
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npx vitest run src/bd/outreach-match.test.js -t conversatieStatus`
Expected: FAIL, `conversatieStatus is not a function`

- [ ] **Step 3: Implementeer**

```js
export const CONV_GEEN = 'geen';
export const CONV_ANTWOORD = 'antwoord';
export const CONV_HEEN_EN_WEER = 'heen_en_weer';

/**
 * Afgeleid uit dezelfde twee tijdstempels als needsOurReply, en om dezelfde
 * reden niet als DB-status opgeslagen: "heeft geantwoord" en "wij hebben
 * teruggeschreven" zijn onafhankelijke feiten. Zo blijft het kloppen als iemand
 * twee keer achter elkaar schrijft.
 */
export function conversatieStatus(r) {
  const inAt = r?.last_inbound_at ? new Date(r.last_inbound_at).getTime() : null;
  if (inAt === null || !Number.isFinite(inAt)) return CONV_GEEN;
  const outAt = r?.answered_at ? new Date(r.answered_at).getTime() : null;
  if (outAt !== null && Number.isFinite(outAt) && outAt > inAt) return CONV_HEEN_EN_WEER;
  return CONV_ANTWOORD;
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npx vitest run src/bd/outreach-match.test.js -t conversatieStatus`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/bd/outreach-match.js src/bd/outreach-match.test.js
git commit -m "feat(outreach): conversatieStatus leidt de gespreksstand af

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Herinneringsadvies als pure functie

**Files:**
- Modify: `src/bd/outreach-match.js`
- Test: `src/bd/outreach-match.test.js`

- [ ] **Step 1: Schrijf de falende test**

```js
describe('reminderAdvies', () => {
  const NU = new Date('2026-09-25T12:00:00Z');
  const basis = { status: 'msg1_sent', laatsteVerzendingISO: '2026-09-11T10:00:00Z', now: NU };

  it('kan na tien dagen zonder reactie', () => {
    const a = reminderAdvies(basis);
    expect(a.advies).toBe(HERINNERING_KAN);
    expect(a.reden).toBe('14 dagen geleden benaderd');
  });

  it('precies tien dagen telt als kan', () => {
    const a = reminderAdvies({ ...basis, laatsteVerzendingISO: '2026-09-15T12:00:00Z' });
    expect(a.advies).toBe(HERINNERING_KAN);
  });

  it('negen dagen is nog te vroeg en noemt de datum', () => {
    const a = reminderAdvies({ ...basis, laatsteVerzendingISO: '2026-09-16T12:00:00Z' });
    expect(a.advies).toBe(HERINNERING_TE_VROEG);
    expect(a.reden).toBe('kan vanaf 2026-09-26');
  });

  it('niet doen als er een antwoord binnen is', () => {
    const a = reminderAdvies({ ...basis, last_inbound_at: '2026-09-12T10:00:00Z' });
    expect(a.advies).toBe(HERINNERING_NIET);
    expect(a.reden).toBe('heeft geantwoord');
  });

  it.each([
    ['opted_out', 'afgemeld'],
    ['bounced', 'gebounced'],
    ['paused', 'gepauzeerd'],
    ['replied', 'heeft geantwoord'],
    ['referred', 'doorverwezen'],
  ])('niet doen bij status %s', (status, reden) => {
    const a = reminderAdvies({ ...basis, status });
    expect(a.advies).toBe(HERINNERING_NIET);
    expect(a.reden).toBe(reden);
  });

  it('al herinnerd na msg2', () => {
    expect(reminderAdvies({ ...basis, status: 'msg2_sent' }).advies).toBe(HERINNERING_AL);
  });

  it('niet doen als er nog niets verstuurd is', () => {
    const a = reminderAdvies({ ...basis, status: 'queued' });
    expect(a.advies).toBe(HERINNERING_NIET);
    expect(a.reden).toBe('nog niets verstuurd');
  });

  it('een lopende wachtdatum gaat voor op de tien dagen', () => {
    // Afwezigheidsmelding met terugkeerdatum: wachten tot die dag, ook al is
    // het bericht al veertien dagen oud.
    const a = reminderAdvies({ ...basis, next_action_at: '2026-10-01T09:00:00Z' });
    expect(a.advies).toBe(HERINNERING_TE_VROEG);
    expect(a.reden).toBe('kan vanaf 2026-10-01');
  });

  it('een verlopen wachtdatum blokkeert niet', () => {
    const a = reminderAdvies({ ...basis, next_action_at: '2026-09-20T09:00:00Z' });
    expect(a.advies).toBe(HERINNERING_KAN);
  });

  it('niet doen als de verzenddatum onbekend is', () => {
    const a = reminderAdvies({ ...basis, laatsteVerzendingISO: null });
    expect(a.advies).toBe(HERINNERING_NIET);
    expect(a.reden).toBe('verzenddatum onbekend');
  });

  it('valt niet om op lege invoer', () => {
    expect(reminderAdvies().advies).toBe(HERINNERING_NIET);
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npx vitest run src/bd/outreach-match.test.js -t reminderAdvies`
Expected: FAIL, `reminderAdvies is not a function`

- [ ] **Step 3: Implementeer**

```js
/**
 * Hoe lang na ons laatste bericht een herinnering redelijk is.
 * Afgesproken met Olivier op 25 september 2026.
 */
export const HERINNERING_NA_DAGEN = 10;

export const HERINNERING_KAN = 'kan';
export const HERINNERING_TE_VROEG = 'te_vroeg';
export const HERINNERING_AL = 'al_herinnerd';
export const HERINNERING_NIET = 'niet';

/**
 * Advies, geen handeling. Het versturen van een herinnering blijft handmatig;
 * de blokkade op een tweede LinkedIn-DM in outreach-send-lib.js blijft staan.
 *
 * Elke uitkomst draagt zijn reden mee, zodat de lijst laat zien waaróm er niet
 * herinnerd kan worden. Een kolom die alleen 'nee' zegt levert een vraag op in
 * plaats van een antwoord.
 *
 * @param {{status?: string, last_inbound_at?: string, next_action_at?: string,
 *          laatsteVerzendingISO?: string, now?: Date}} arg
 * @returns {{advies: string, reden: string, vanaf: string|null}}
 */
export function reminderAdvies({
  status, last_inbound_at, next_action_at, laatsteVerzendingISO, now = new Date(),
} = {}) {
  const niet = (reden) => ({ advies: HERINNERING_NIET, reden, vanaf: null });
  const teVroeg = (d) => ({
    advies: HERINNERING_TE_VROEG,
    reden: `kan vanaf ${d.toISOString().slice(0, 10)}`,
    vanaf: d.toISOString(),
  });

  if (last_inbound_at) return niet('heeft geantwoord');

  switch (status) {
    case 'opted_out': return niet('afgemeld');
    case 'bounced': return niet('gebounced');
    case 'paused': return niet('gepauzeerd');
    case 'replied': return niet('heeft geantwoord');
    case 'referred': return niet('doorverwezen');
    case 'msg2_sent':
      return { advies: HERINNERING_AL, reden: 'bericht 2 is al verstuurd', vanaf: null };
    case 'msg1_sent':
    case 'ooo':
      break;
    default:
      return niet('nog niets verstuurd');
  }

  // Een gemelde afwezigheid zet een terugkeerdatum. Tot die dag is elke
  // herinnering te vroeg, ongeacht hoe oud ons bericht is.
  const wacht = next_action_at ? new Date(next_action_at) : null;
  if (wacht && Number.isFinite(wacht.getTime()) && wacht.getTime() > now.getTime()) {
    return teVroeg(wacht);
  }

  const verzonden = laatsteVerzendingISO ? new Date(laatsteVerzendingISO) : null;
  if (!verzonden || !Number.isFinite(verzonden.getTime())) return niet('verzenddatum onbekend');

  const vanaf = new Date(verzonden.getTime() + HERINNERING_NA_DAGEN * 86400000);
  if (vanaf.getTime() > now.getTime()) return teVroeg(vanaf);

  const dagen = Math.floor((now.getTime() - verzonden.getTime()) / 86400000);
  return { advies: HERINNERING_KAN, reden: `${dagen} dagen geleden benaderd`, vanaf: vanaf.toISOString() };
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npx vitest run src/bd/outreach-match.test.js -t reminderAdvies`
Expected: PASS, 16 tests (de `it.each` telt als 5)

- [ ] **Step 5: Draai het hele testbestand**

Run: `npx vitest run src/bd/outreach-match.test.js`
Expected: PASS, alle bestaande tests plus de nieuwe

- [ ] **Step 6: Commit**

```bash
git add src/bd/outreach-match.js src/bd/outreach-match.test.js
git commit -m "feat(outreach): reminderAdvies met wachttijd van tien dagen

Advies, geen handeling. De blokkade op een tweede LinkedIn-DM blijft staan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Unipile-chatberichten ophalen

**Files:**
- Create: `api/_lib/unipile-chat.js`

Geen test: dit is een dunne laag om één fetch heen, net als `unipile-relation.js`.
De beslislogica zit in Task 1 en is daar getest.

- [ ] **Step 1: Schrijf het bestand**

```js
// Berichten uit één LinkedIn-chat lezen via Unipile.
//
// Eigen fetch met eigen DSN/TOKEN, net als unipile-relation.js, unipile-post.js
// en unipile-dm.js. Dat is de conventie hier; api/unipile.js houdt zijn
// unipileRequest privé.
//
// LET OP: dit is GEEN profielweergave. De rate-limit waar de bulk-connectiecheck
// rekening mee houdt geldt voor het bekijken van profielen en het versturen van
// uitnodigingen. Je eigen inbox lezen telt daar niet in mee.

const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

/**
 * @param {string} chatId
 * @returns {Promise<{ok: boolean, items: Array, error?: string}>}
 */
export async function haalChatBerichten(chatId) {
  if (!DSN || !TOKEN) return { ok: false, items: [], error: 'Unipile niet geconfigureerd' };
  if (!chatId) return { ok: false, items: [], error: 'chat_id ontbreekt' };

  let resp;
  try {
    resp = await fetch(`https://${DSN}/api/v1/chats/${encodeURIComponent(chatId)}/messages`, {
      headers: { 'X-API-KEY': TOKEN, accept: 'application/json' },
    });
  } catch (e) {
    return { ok: false, items: [], error: String(e?.message || e) };
  }

  const text = await resp.text();
  if (!resp.ok) return { ok: false, items: [], error: `${resp.status} ${text.slice(0, 200)}` };

  try {
    const json = JSON.parse(text);
    return { ok: true, items: Array.isArray(json?.items) ? json.items : [] };
  } catch {
    return { ok: false, items: [], error: 'onleesbaar antwoord van Unipile' };
  }
}
```

- [ ] **Step 2: Controleer dat het bestand laadt**

Run: `node --input-type=module -e "import('./api/_lib/unipile-chat.js').then(m => console.log(Object.keys(m)))"`
Expected: `[ 'haalChatBerichten' ]`

- [ ] **Step 3: Commit**

```bash
git add api/_lib/unipile-chat.js
git commit -m "feat(unipile): helper om berichten uit een chat te lezen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Het scan-endpoint, met droge run als standaard

**Files:**
- Create: `api/outreach-linkedin-scan.js`

**Kritiek:** `dry_run` staat standaard AAN. Alleen een expliciete
`dry_run: false` laat het endpoint schrijven. Bij 151 contacten die twee weken
onaangeraakt zijn wil je eerst zien wat eruit komt.

- [ ] **Step 1: Schrijf het endpoint**

```js
import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { inkomendNaVerzending, statusAfterClassification } from '../src/bd/outreach-match.js';
import { classifyWithClaude } from './_lib/outreach-classify-run.js';
import { haalChatBerichten } from './_lib/unipile-chat.js';
import { kort } from '../src/lib/mail-body.js';

// POST /api/outreach-linkedin-scan - de LinkedIn-tegenhanger van de mailboxscan.
//
// WAAROM DIT BESTAAT
//   De campagne verstuurde 151 DM's via Unipile en registreerde nul antwoorden,
//   omdat last_inbound_at alleen door api/outreach-classify.js werd gezet en dat
//   is de mailboxscan. Antwoorden bleven in Marco's LinkedIn-inbox staan.
//
// WAAROM DIT SIMPELER IS DAN DE MAILSCAN
//   Daar moet op afzenderadres en domein gematcht worden, want het uitgaande
//   bericht staat niet in de mailbox. Hier is linkedin_chat_id een exacte
//   sleutel: de chat IS de conversatie. Geen naamvergelijking, geen domain_flag.
//
// IDEMPOTENT
//   outreach_message_inbound_provider_uniq is een unieke index op
//   provider_message_id waar direction='inbound'. Een tweede scan botst daarop
//   en doet niets dubbel.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

// Per aanroep, om binnen de Vercel-tijdslimiet te blijven. 151 contacten zijn
// vier aanroepen. De client loopt door zolang volgende_offset niet null is.
const BATCH = 40;

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { campaign_id, offset = 0 } = req.body || {};
  // Schrijven moet expliciet aangezet worden. Alles behalve false is een droge run.
  const dryRun = (req.body || {}).dry_run !== false;
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id is verplicht' });

  const { count: totaal } = await supabase
    .from('outreach_contact')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null);

  const { data: contacten, error: selErr } = await supabase
    .from('outreach_contact')
    .select('id,first_name,last_name,company,status,linkedin_chat_id,last_inbound_at,next_action_at')
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null)
    .order('created_at', { ascending: true })
    .range(Number(offset), Number(offset) + BATCH - 1);
  if (selErr) return res.status(500).json({ error: selErr.message });

  const ids = (contacten || []).map(c => c.id);

  // Onze eigen laatste verzending per contact. outreach_contact heeft geen
  // last_sent_at-kolom; dat moment leeft in outreach_message.
  const laatsteVerzending = new Map();
  if (ids.length) {
    const { data: uit } = await supabase
      .from('outreach_message')
      .select('contact_id,sent_or_received_at')
      .in('contact_id', ids)
      .eq('direction', 'outbound');
    for (const m of uit || []) {
      const vorige = laatsteVerzending.get(m.contact_id);
      if (!vorige || new Date(m.sent_or_received_at) > new Date(vorige)) {
        laatsteVerzending.set(m.contact_id, m.sent_or_received_at);
      }
    }
  }

  const resultaten = [];
  let metAntwoord = 0;
  let geschreven = 0;

  for (const c of contacten || []) {
    const naam = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.id;
    const chat = await haalChatBerichten(c.linkedin_chat_id);
    if (!chat.ok) {
      resultaten.push({ id: c.id, naam, uitkomst: 'fout', detail: chat.error });
      continue;
    }

    const antwoorden = inkomendNaVerzending(chat.items, {
      laatsteVerzendingISO: laatsteVerzending.get(c.id) || null,
    });
    if (antwoorden.length === 0) {
      resultaten.push({ id: c.id, naam, uitkomst: 'geen antwoord' });
      continue;
    }

    metAntwoord += 1;
    const laatste = antwoorden[antwoorden.length - 1];
    const tekst = String(laatste.text || '').trim();

    const classificatie = await classifyWithClaude({
      fromAddress: naam,
      subject: null,
      bodyPreview: tekst,
      bodyFull: tekst,
    });

    const next = statusAfterClassification({
      classification: classificatie?.classification,
      confidence: classificatie?.confidence,
      currentStatus: c.status,
      oooUntilISO: classificatie?.ooo_until,
    });

    resultaten.push({
      id: c.id,
      naam,
      bedrijf: c.company,
      uitkomst: 'antwoord',
      aantal: antwoorden.length,
      tekst: kort(tekst, 200),
      ontvangen_op: laatste.timestamp,
      classificatie: classificatie?.classification || null,
      confidence: classificatie?.confidence ?? 0,
      status_nu: c.status,
      status_straks: next.status,
      beoordeling_nodig: next.needs_review,
    });

    if (dryRun) continue;

    // Het bericht vastleggen. Botst het op de unieke index, dan is deze chat al
    // eerder gescand en hoeft de status niet opnieuw gezet te worden.
    const { error: insErr } = await supabase.from('outreach_message').insert({
      campaign_id,
      contact_id: c.id,
      channel: 'linkedin',
      direction: 'inbound',
      provider_message_id: laatste.id || null,
      conversation_id: c.linkedin_chat_id,
      match_method: 'conversation_id',
      from_address: naam,
      body_preview: kort(tekst, 500),
      body_full: tekst,
      sent_or_received_at: laatste.timestamp || new Date().toISOString(),
      classification: classificatie?.classification || null,
      classification_confidence: classificatie?.confidence ?? null,
    });
    if (insErr) {
      resultaten[resultaten.length - 1].uitkomst = 'al bekend';
      continue;
    }

    await supabase.from('outreach_contact').update({
      last_inbound_at: laatste.timestamp || new Date().toISOString(),
      status: next.status,
      next_action_at: next.next_action_at,
      last_reply_summary: kort(tekst, 200),
    }).eq('id', c.id);
    geschreven += 1;
  }

  const volgende = Number(offset) + BATCH;
  return res.status(200).json({
    dry_run: dryRun,
    totaal: totaal ?? 0,
    verwerkt: (contacten || []).length,
    met_antwoord: metAntwoord,
    geschreven,
    volgende_offset: volgende < (totaal ?? 0) ? volgende : null,
    resultaten,
  });
}
```

- [ ] **Step 2: Controleer dat het bestand laadt**

Run: `node --input-type=module -e "import('./api/outreach-linkedin-scan.js').then(() => console.log('ok'))"`
Expected: `ok`

- [ ] **Step 3: Bouw**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna: `rm -rf dist_v*`

- [ ] **Step 4: Commit**

```bash
git add api/outreach-linkedin-scan.js
git commit -m "feat(outreach): LinkedIn-inboxscan, droge run als standaard

Spiegelbeeld van de mailboxscan, maar matcht exact op linkedin_chat_id in
plaats van op afzender en domein. Hergebruikt classifyWithClaude en
statusAfterClassification zodat beide kanalen dezelfde statusmachine delen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: CHECKPOINT - droge run laten zien aan Olivier

**Dit is geen codetaak. Niet doorlopen naar Task 7 zonder akkoord.**

- [ ] **Step 1: Pushen en laten deployen**

Vraag Olivier eerst om toestemming te pushen. Na `git push origin main` duurt de
deploy 1 tot 2 minuten.

- [ ] **Step 2: Droge run draaien over de hele LinkedIn-campagne**

De campagne is `Amsterdam 2026 LinkedIn`, id
`61096375-a56f-4748-a08a-ce5413da0389` (opgezocht op 25 september 2026).

Laat Olivier de scan starten vanuit de app (ingelogd, want `requireUser`), of
draai hem met een geldige sessie. Vier aanroepen met offset 0, 40, 80, 120.

- [ ] **Step 3: De uitkomst samenvatten**

Rapporteer aan Olivier, in het Nederlands:
* hoeveel van de 151 een antwoord blijken te hebben
* de verdeling over de classificaties
* elk geval waar `beoordeling_nodig` true is
* elke `uitkomst: 'fout'` met de reden

- [ ] **Step 4: Akkoord vragen**

Vraag expliciet of de scan echt mag schrijven. Pas na een ja verder.

---

## Task 7: De scan laten schrijven

- [ ] **Step 1: Draaien met `dry_run: false`**

Dezelfde vier aanroepen, nu met `dry_run: false` in de body.

- [ ] **Step 2: Controleren wat er is gebeurd**

```sql
select status, count(*),
       count(*) filter (where last_inbound_at is not null) as met_antwoord
from outreach_contact
where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389'
group by status order by 2 desc;
```

Expected: de aantallen komen overeen met wat de droge run voorspelde.

- [ ] **Step 3: Controleren dat de verzendguard nu grijpt**

```sql
select count(*) from outreach_contact
where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389' and last_inbound_at is not null and next_action_at is null;
```

Iedereen in die telling valt in de hold uit `outreach-send-lib.js` en krijgt geen
vervolgbericht. Dat is de bedoeling.

---

## Task 8: Twee kolommen in het cold outreach-overzicht

**Files:**
- Modify: `src/bd/marketing-outreach.jsx`

- [ ] **Step 1: Importeer de nieuwe functies**

Regel 7 luidt nu:

```js
import { scanInbox, needsOurReply, matchRegistrations } from './outreach-match';
```

Vervang door:

```js
import {
  scanInbox, needsOurReply, matchRegistrations,
  conversatieStatus, reminderAdvies,
  CONV_GEEN, CONV_ANTWOORD, CONV_HEEN_EN_WEER,
  HERINNERING_KAN, HERINNERING_TE_VROEG, HERINNERING_AL, HERINNERING_NIET,
} from './outreach-match';
```

- [ ] **Step 2: Voeg de labels en kleuren toe**

Onder de bestaande `STATUS_COLOR` (rond regel 37):

```js
const CONV_LABEL = {
  [CONV_GEEN]: 'geen',
  [CONV_ANTWOORD]: 'antwoord',
  [CONV_HEEN_EN_WEER]: 'heen en weer',
};
const CONV_COLOR = {
  [CONV_GEEN]: 'var(--text-3)',
  [CONV_ANTWOORD]: '#d97706',
  [CONV_HEEN_EN_WEER]: '#16a34a',
};
const HERINNERING_LABEL = {
  [HERINNERING_KAN]: 'kan',
  [HERINNERING_TE_VROEG]: 'te vroeg',
  [HERINNERING_AL]: 'al herinnerd',
  [HERINNERING_NIET]: 'niet doen',
};
const HERINNERING_COLOR = {
  [HERINNERING_KAN]: '#16a34a',
  [HERINNERING_TE_VROEG]: 'var(--text-3)',
  [HERINNERING_AL]: 'var(--text-3)',
  [HERINNERING_NIET]: '#6b7280',
};
```

- [ ] **Step 3: Bouw de map met onze laatste verzending per contact**

`outreach_contact` heeft geen `last_sent_at`. Die datum leeft in
`outreach_message`, en die tabel wordt al geladen rond regel 176 voor de
opens-en-kliks. Twee dingen om te weten voordat je begint: die select haalt
`sent_or_received_at` **niet** op, en de ruwe rijen (`msgs`) leven alleen binnen
dat `try`-blok. Een aparte `useMemo` erbuiten kan er dus niet bij.

Breid daarom die ene bestaande lus uit. Het blok luidt nu:

```js
        const { data: msgs } = await supabase
          .from('outreach_message')
          .select('contact_id, open_count, click_count, delivered_at')
          .eq('campaign_id', camp.id).eq('direction', 'outbound')
          .limit(5000);
        const m = new Map();
        for (const r of (msgs || [])) {
          if (!r.contact_id) continue;
          const v = m.get(r.contact_id) || { opens: 0, clicks: 0, delivered: 0 };
          v.opens += r.open_count || 0;
          v.clicks += r.click_count || 0;
          if (r.delivered_at) v.delivered += 1;
          m.set(r.contact_id, v);
        }
        setBetrokkenheid(m);
```

Vervang door:

```js
        const { data: msgs } = await supabase
          .from('outreach_message')
          .select('contact_id, open_count, click_count, delivered_at, sent_or_received_at')
          .eq('campaign_id', camp.id).eq('direction', 'outbound')
          .limit(5000);
        const m = new Map();
        // Onze laatste uitgaande datum per contact, in dezelfde lus. Nodig voor
        // reminderAdvies; outreach_contact heeft geen last_sent_at-kolom.
        const verzonden = new Map();
        for (const r of (msgs || [])) {
          if (!r.contact_id) continue;
          const v = m.get(r.contact_id) || { opens: 0, clicks: 0, delivered: 0 };
          v.opens += r.open_count || 0;
          v.clicks += r.click_count || 0;
          if (r.delivered_at) v.delivered += 1;
          m.set(r.contact_id, v);

          const vorige = verzonden.get(r.contact_id);
          if (r.sent_or_received_at
            && (!vorige || new Date(r.sent_or_received_at) > new Date(vorige))) {
            verzonden.set(r.contact_id, r.sent_or_received_at);
          }
        }
        setBetrokkenheid(m);
        setLaatsteVerzending(verzonden);
```

De query staat al op `direction = 'outbound'`, dus daar hoeft niets bij.

Voeg de state toe naast de bestaande `betrokkenheid`-state:

```js
  const [laatsteVerzending, setLaatsteVerzending] = useState(new Map());
```

Run: `grep -n "setBetrokkenheid\|useState(new Map())" src/bd/marketing-outreach.jsx`
Expected: je ziet waar `betrokkenheid` wordt gedeclareerd; zet de nieuwe regel
ernaast.

- [ ] **Step 4: Voeg de kolomkoppen toe**

Rond regel 883 staat:

```js
{['#', 'Naam', 'Bedrijf', 'Prioriteit', 'Status',
  ...(isLinkedIn ? [] : ['Geopend', 'Geklikt']),
  'Volgende actie', 'Toelichting'].map(h => (
```

Vervang door:

```js
{['#', 'Naam', 'Bedrijf', 'Prioriteit', 'Status',
  ...(isLinkedIn ? [] : ['Geopend', 'Geklikt']),
  'Conversatie', 'Herinnering',
  'Volgende actie', 'Toelichting'].map(h => (
```

- [ ] **Step 5: Voeg de cellen toe**

In de rij, direct voor de `Volgende actie`-cel (rond regel 948, de cel met
`r.next_action_at`):

```js
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const c = conversatieStatus(r);
                      return (
                        <span style={{ color: CONV_COLOR[c], fontWeight: c === CONV_GEEN ? 400 : 500 }}>
                          {CONV_LABEL[c]}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const a = reminderAdvies({
                        status: r.status,
                        last_inbound_at: r.last_inbound_at,
                        next_action_at: r.next_action_at,
                        laatsteVerzendingISO: laatsteVerzending.get(r.id) || null,
                      });
                      return (
                        <span title={a.reden}
                          style={{ color: HERINNERING_COLOR[a.advies], fontWeight: a.advies === HERINNERING_KAN ? 500 : 400 }}>
                          {HERINNERING_LABEL[a.advies]}
                        </span>
                      );
                    })()}
                  </td>
```

- [ ] **Step 6: Werk de colSpan bij**

Onderaan de tabel staat:

```js
<tr><td colSpan={isLinkedIn ? 7 : 9} ...>Niets gevonden.</td></tr>
```

Er komen twee kolommen bij:

```js
<tr><td colSpan={isLinkedIn ? 9 : 11} ...>Niets gevonden.</td></tr>
```

- [ ] **Step 7: Bouw en controleer in de browser**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna `rm -rf dist_v*`.

Controleer daarna in de draaiende app, campagne `Amsterdam 2026 LinkedIn`:
* de twee kolommen staan er
* iemand zonder antwoord toont `geen` en `kan` of `te vroeg`
* hover over de herinneringscel toont de reden
* het aantal kolommen klopt met de koppen (tel ze, de colSpan is makkelijk mis)

- [ ] **Step 8: Commit**

```bash
git add src/bd/marketing-outreach.jsx
git commit -m "feat(outreach): kolommen conversatie en herinnering in het overzicht

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: De kapotte contactmatch in de Comms-tab repareren

**Files:**
- Modify: `src/bd/lane-comms.jsx:236-257`

De huidige match vergelijkt `attendee_provider_id` (`ACoAAAM8V9wB...`) met
`linkedin_url` (`linkedin.com/in/clare-dunn`). Twee verschillende
nummersystemen; op acht echte records nul treffers. `unipile-webhook.js:31` doet
het wel goed en gebruikt `attendee_profile_url`.

- [ ] **Step 1: Controleer eerst of de attendee een profiel-URL meestuurt**

Dit is de aanname waar de reparatie op rust. De chatlijst haalt de attendees al
op. Voeg tijdelijk een log toe in de `Promise.all` rond regel 214:

```js
            console.log('attendee-vorm', JSON.stringify(attendees[0] || {}));
```

Open de Comms-tab, kies LinkedIn, en kijk in de console welke velden er zijn.

Zit er een `profile_url` of `public_identifier` in, ga door met Step 2.
Zit er geen van beide in, **stop en meld het**: dan is alleen de match op
`linkedin_chat_id` mogelijk en moet de slug-stap uit dit plan. Haal daarna het
log-regeltje weer weg.

- [ ] **Step 2: Laad de chat-id-koppeling uit outreach_contact**

Bij de andere `supabase.from(...)`-aanroepen bovenin de component (rond regel 38):

```js
  // Chats die vanuit een outreach-campagne zijn gestart. linkedin_chat_id is een
  // exacte sleutel; hier hoeft niets geraden te worden.
  const [outreachPerChat, setOutreachPerChat] = useState({});
  useEffect(() => {
    supabase.from('outreach_contact')
      .select('id,first_name,last_name,title,company,status,linkedin_chat_id,linkedin_url')
      .not('linkedin_chat_id', 'is', null)
      .then(({ data }) => {
        const m = {};
        for (const r of data || []) m[r.linkedin_chat_id] = r;
        setOutreachPerChat(m);
      });
  }, []);
```

- [ ] **Step 3: Vervang de match**

Regels 236 tot 257, het blok `const linkedInChatRows = useMemo(...)`. Vervang de
huidige `const contact = ...`-regel en de daaropvolgende return door:

```js
  const linkedInChatRows = useMemo(() => {
    if (channel !== 'linkedin') return [];

    // De slug uit een LinkedIn-profiel-URL. Zo doet unipile-webhook.js het ook.
    const slug = (url) => String(url || '').split('/in/')[1]?.split(/[/?]/)[0]?.toLowerCase() || '';

    return liveLinkedInChats.map(c => {
      // 1. Exact op chat-id: deze chat is door onze eigen campagne gestart.
      const outreach = outreachPerChat[c.id] || null;

      // 2. Anders op de slug uit de profiel-URL van de tegenpartij.
      //    NIET op attendee_provider_id: dat is de interne LinkedIn-id
      //    (ACoAAA...) en die komt in linkedin_url niet voor, dus die match
      //    kon nooit slagen.
      const profielSlug = slug(chatProfileUrls[c.id]);
      const contact = !outreach && profielSlug
        ? (contacts || []).find(x => slug(x.linkedin_url) === profielSlug)
        : null;

      const liveName = chatAttendeeNames[c.id];
      const outreachNaam = outreach
        ? [outreach.first_name, outreach.last_name].filter(Boolean).join(' ')
        : '';

      return {
        key: c.id,
        chatId: c.id,
        contactId: contact?.id || null,
        contactName: outreachNaam || contact?.name || liveName || c.name || 'LinkedIn user',
        contactRole: outreach?.title || contact?.role || '',
        accountId: contact?.accountId || null,
        account: outreach?.company || '',
        outreachStatus: outreach?.status || null,
        unreadCount: c.unread_count || 0,
        messageCount: 0,
        lastMessage: { ts: c.timestamp, preview: '' },
      };
    });
  }, [liveLinkedInChats, channel, contacts, chatAttendeeNames, chatProfileUrls, outreachPerChat]);
```

- [ ] **Step 4: Sla de profiel-URL per chat op**

De attendee-fetch bewaart nu alleen de naam. Breid hem uit. In de `Promise.all`
rond regel 213, waar nu `return [chat.id, other?.name || null];` staat:

```js
            return [chat.id, other?.name || null, other?.profile_url || (other?.public_identifier ? `https://www.linkedin.com/in/${other.public_identifier}` : null)];
```

En de verwerking daaronder:

```js
        })).then(rijen => {
          const namen = {};
          const urls = {};
          for (const [id, naam, url] of rijen) {
            if (naam) namen[id] = naam;
            if (url) urls[id] = url;
          }
          setChatAttendeeNames(namen);
          setChatProfileUrls(urls);
        });
```

Voeg de state toe naast `chatAttendeeNames` (rond regel 192):

```js
  const [chatProfileUrls, setChatProfileUrls] = useState({}); // chatId → profiel-URL
```

- [ ] **Step 5: Toon de campagnestatus op de rij**

In de chatrij, in `comm-row-bottom` (rond regel 423), naast `{g.account && ...}`:

```js
                  {g.outreachStatus && (
                    <span title="Deze persoon zit in een outreach-campagne"
                      style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '0.5px solid var(--sep)', color: 'var(--text-3)' }}>
                      campagne
                    </span>
                  )}
```

- [ ] **Step 6: Bouw en controleer in de browser**

Run: `npx vite build --outDir "dist_v$(date +%s)"`
Expected: `✓ built`. Daarna `rm -rf dist_v*`.

In de app, Comms-tab, kanaal LinkedIn: gesprekken die uit de campagne komen
tonen nu de naam uit `outreach_contact` plus het label `campagne`. Controleer dat
er geen console-fouten zijn en dat het tijdelijke log uit Step 1 weg is.

- [ ] **Step 7: Commit**

```bash
git add src/bd/lane-comms.jsx
git commit -m "fix(comms): LinkedIn-chats koppelen aan de juiste contactpersoon

De match vergeleek attendee_provider_id (ACoAAA...) met linkedin_url (de
publieke slug). Twee verschillende nummersystemen, dus nul treffers op acht
geteste records. Nu eerst exact op linkedin_chat_id en anders op de slug uit
attendee_profile_url, zoals unipile-webhook.js het al deed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Versie bijwerken

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`

Huidige versie is `1.125.0`. Dit is een feature, dus `1.126.0`.

- [ ] **Step 1: Alle drie bijwerken**

```bash
echo "1.126.0" > VERSION
npm version 1.126.0 --no-git-tag-version --allow-same-version
```

En in `src/bd/changelog.js`: `CURRENT_VERSION` op `'1.126.0'`, plus een nieuwe
entry bovenaan `CHANGELOG`. Haal de datum op met `date -u +%Y-%m-%dT%H:%M:%SZ`.

```js
  {
    version: '1.126.0',
    date: '<de uitkomst van date -u +%Y-%m-%dT%H:%M:%SZ>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'LinkedIn-antwoorden komen binnen in cold outreach',
    summary:
      'De campagne verstuurde 151 LinkedIn-DM\'s en registreerde nul antwoorden, want last_inbound_at werd alleen door de mailboxscan gezet en een LinkedIn-scan bestond niet. Die is er nu. Het overzicht toont per contact of er een conversatie is geweest en of een gentle reminder kan; dat laatste is advies, versturen blijft handmatig.',
    changes: [
      'Nieuw endpoint api/outreach-linkedin-scan.js dat per contact de Unipile-chat leest op het exacte linkedin_chat_id. Geen naamvergelijking nodig, anders dan bij de mailscan: de chat is de conversatie.',
      'Droge run staat standaard aan; alleen een expliciete dry_run:false laat het schrijven. Verwerkt 40 contacten per aanroep om binnen de tijdslimiet te blijven.',
      'Hergebruikt classifyWithClaude en statusAfterClassification, zodat een LinkedIn-antwoord hetzelfde betekent als een e-mailantwoord en er geen tweede statusmachine ontstaat.',
      'Idempotent via de bestaande unieke index outreach_message_inbound_provider_uniq; een tweede scan doet niets dubbel.',
      'Twee kolommen in het cold outreach-overzicht: conversatie (geen, antwoord, heen en weer) en herinnering (kan, te vroeg, al herinnerd, niet doen, met de reden in de tooltip).',
      'De wachttijd voor een herinnering is tien dagen, als benoemde constante HERINNERING_NA_DAGEN. Een lopende afwezigheidsdatum gaat daar altijd voor.',
      'De blokkade op een tweede LinkedIn-DM in outreach-send-lib.js blijft staan. De kolom is advies; Marco verstuurt zelf. Een cron die er honderdvijftig achter elkaar uitgooit is wat een account kost.',
      'Comms-tab: de koppeling van een LinkedIn-chat aan een contactpersoon vergeleek attendee_provider_id met linkedin_url, twee verschillende nummersystemen, dus nul treffers. Nu op chat-id en anders op de slug uit de profiel-URL.',
      'Geen migratie nodig; alle kolommen bestonden al.',
    ],
    files: [
      'api/outreach-linkedin-scan.js',
      'api/_lib/unipile-chat.js',
      'src/bd/outreach-match.js',
      'src/bd/outreach-match.test.js',
      'src/bd/marketing-outreach.jsx',
      'src/bd/lane-comms.jsx',
    ],
    rollback: 'git revert naar v1.125.0. De scan schrijft alleen last_inbound_at, status, next_action_at en last_reply_summary op outreach_contact plus inbound-rijen in outreach_message; die rijen zijn te herkennen aan channel=linkedin en direction=inbound.',
    gitTag: 'v1.126.0',
  },
```

- [ ] **Step 2: Controleer dat alle drie gelijk lopen**

```bash
cat VERSION && node -p "require('./package.json').version" && grep -n "CURRENT_VERSION" src/bd/changelog.js
```

Expected: drie keer `1.126.0`. Dit liep op 22 september uit elkaar; controleer het.

- [ ] **Step 3: Draai alle tests**

Run: `npm test`
Expected: alles groen behalve de vier bekende fouten in
`src/lib/broadcast-recipients.test.js`. Die staan los van dit werk en bestonden
al voor deze wijziging.

- [ ] **Step 4: Commit en taggen**

```bash
git add VERSION package.json src/bd/changelog.js
git commit -m "chore: versie 1.126.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git tag v1.126.0
```

- [ ] **Step 5: Vraag Olivier om te mogen pushen**

Nooit ongevraagd pushen. `git push origin main --tags` pas na akkoord.

---

## Wat bewust niet in dit plan zit

* **Een koppelknop per gesprek in de Comms-tab.** Na Task 5 lost het overgrote
  deel op via het chat-id. Pas bouwen als het gemist wordt.
* **`linkedin_provider_id` toevoegen aan `contacts`.** Alleen nodig voor die knop.
* **Automatisch een herinnering versturen.** Expliciet afgewezen op 25 september.
* **De drie contacten zonder `linkedin_chat_id`** (154 min 151). Daar is de DM
  niet aangekomen; dat hoort in de foutafhandeling van het versturen thuis.

## Opgemerkt maar niet aangeraakt

`marketing-outreach.jsx` gebruikt op twee plekken een em-dash (`'—'`) als
opvulteken in de kolommen Geopend en Geklikt. Dat botst met de projectregel dat
em-dashes nergens gebruikt worden. Niet meegenomen omdat het losstaat van deze
wijziging. Losse vraag aan Olivier waard.
