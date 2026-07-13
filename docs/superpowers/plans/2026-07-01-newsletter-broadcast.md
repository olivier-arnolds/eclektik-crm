# Newsletter via Resend Broadcasts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verstuur newsletters vanuit de Marketing-selectie via Resend Broadcasts (marketing/contact-plan) i.p.v. per-recipient transactionele `/emails`.

**Architecture:** Een selectie van CRM-contacten wordt ge-upsert als globale Resend-contacten, in een per-campagne segment gezet, en via een Broadcast verstuurd. Afmeldingen komen via een `contact.updated`-webhook terug als `do_not_email` in de CRM. De transactionele weg blijft bestaan voor 1-op-1 playbook-mails.

**Tech Stack:** Vercel serverless (Node), Resend REST API (`/contacts`, `/segments`, `/broadcasts`), Supabase (service key), React composer, Svix (webhook-signature), vitest.

**Spec:** `docs/superpowers/specs/2026-07-01-newsletter-broadcast-design.md`

---

## File Structure

- Create: `src/lib/broadcast-recipients.js` — pure helper: filter + map CRM-recipients → Resend-contactobjecten. Testbaar, geen I/O.
- Create: `src/lib/broadcast-recipients.test.js` — vitest.
- Create: `api/resend-broadcast.js` — orkestreert upsert → segment → broadcast (serverless, `requireUser`).
- Create: `api/resend-webhook.js` — `contact.updated` → `do_not_email` (Svix-validatie).
- Modify: `src/bd/marketing-composer.jsx` — verzendmodus "Versturen als newsletter (Broadcast)".
- Modify: `src/bd/changelog.js`, `VERSION`, `package.json` — versie + changelog.
- Modify: `CLAUDE.md` (§5) — noteer transactioneel vs broadcast + de vaste `RESEND_AUDIENCE_ID`.
- Reference (niet wijzigen): `api/marketing-webhook.js` (Svix-patroon), `api/_lib/guard.js` (`requireUser`), `api/marketing-send.js` (From-afhandeling).

**Env vars (Vercel):** hergebruik `RESEND_API_KEY`, `MARKETING_FROM_*`. Nieuw: `RESEND_AUDIENCE_ID` (de vaste audience) en `RESEND_WEBHOOK_SECRET` (Svix signing secret).

---

## Task 0: Resend API-spike (discovery — verplicht eerst)

**Files:** Create `docs/superpowers/notes/resend-api-findings.md` (bevindingen vastleggen).

Geen TDD; dit bevestigt de exacte API-vormen tegen het echte Resend-account zodat de latere code klopt. Gebruik een throwaway/test-audience.

- [ ] **Step 1: Audience aanmaken/ophalen.** Bepaal het endpoint en bewaar het id.

```bash
curl -X POST 'https://api.resend.com/audiences' \
  -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"Eclectik CRM (test)"}'
# Noteer: response-veld met het audience-id.
```

- [ ] **Step 2: Segment aanmaken + contact toevoegen.** Bevestig (a) hoe je een segment maakt en (b) hoe je een contact eraan koppelt: via `POST /contacts` met `"segments":["<segment_id>"]`, of via een apart add-to-segment endpoint.

```bash
curl -X POST 'https://api.resend.com/contacts' \
  -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' \
  -d '{"email":"test@eclectik.co","first_name":"Test","unsubscribed":false,"segments":["<segment_id>"]}'
```

- [ ] **Step 3: Broadcast maken + versturen.** Bevestig het target-veld (`segment_id` vs `audience_id`) en de merge-tag-syntax voor de voornaam.

```bash
curl -X POST 'https://api.resend.com/broadcasts' \
  -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' \
  -d '{"segment_id":"<id>","from":"Marketing <marketing@eclectik.co>","subject":"Test","html":"<p>Hoi {{FIRST_NAME}}</p>","send":true}'
# Bevestig: exacte merge-tag (bv. {{FIRST_NAME}} of {{{FIRST_NAME}}}), en of send:true direct verstuurt.
```

- [ ] **Step 4: Webhook-payload.** Registreer in het dashboard een webhook op `contact.updated`, meld een testcontact af, en leg het payload-formaat vast (bevat het `email` + `unsubscribed`?). Noteer het Svix signing secret als `RESEND_WEBHOOK_SECRET`.

- [ ] **Step 5: Leg alle bevindingen vast** in `docs/superpowers/notes/resend-api-findings.md` (exacte endpoints, veldnamen, merge-tag, payload). Commit.

```bash
git add docs/superpowers/notes/resend-api-findings.md
git commit -m "docs: Resend Broadcasts API-bevindingen (fase 0)"
```

**Let op:** pas in Task 2/4 de veldnamen (`segment_id`/`audience_id`, merge-tag, payload-keys) aan op deze bevindingen als ze afwijken.

---

## Task 1: Pure helper — recipients → Resend-contacten

**Files:**
- Create: `src/lib/broadcast-recipients.js`
- Test: `src/lib/broadcast-recipients.test.js`

- [ ] **Step 1: Schrijf de failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { toResendContacts } from './broadcast-recipients';

describe('toResendContacts', () => {
  it('mapt e-mail + voornaam en zet unsubscribed uit do_not_email', () => {
    const out = toResendContacts([
      { email: 'a@x.co', first_name: 'Ann', do_not_email: false },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false }]);
  });

  it('laat contacten zonder e-mail weg', () => {
    const out = toResendContacts([{ email: '', first_name: 'X' }]);
    expect(out).toEqual([]);
  });

  it('markeert opt-out contacten als unsubscribed maar houdt ze in de lijst', () => {
    const out = toResendContacts([{ email: 'b@x.co', first_name: 'Bo', do_not_email: true }]);
    expect(out).toEqual([{ email: 'b@x.co', first_name: 'Bo', unsubscribed: true }]);
  });

  it('normaliseert e-mail (trim + lowercase) en dedupliceert', () => {
    const out = toResendContacts([
      { email: ' A@X.co ', first_name: 'Ann' },
      { email: 'a@x.co', first_name: 'Ann2' },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false }]);
  });
});
```

- [ ] **Step 2: Run test — verwacht FAIL**

Run: `npx vitest run src/lib/broadcast-recipients.test.js`
Expected: FAIL ("toResendContacts is not a function").

- [ ] **Step 3: Implementeer de helper**

```javascript
// Pure mapping van CRM-recipients naar Resend-contactobjecten.
// - Alleen contacten met een e-mailadres.
// - do_not_email -> unsubscribed (Resend slaat unsubscribed sowieso over).
// - E-mail genormaliseerd (trim + lowercase) en gededupliceerd (eerste wint).
export function toResendContacts(recipients) {
  const seen = new Set();
  const out = [];
  for (const r of recipients || []) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      first_name: r.first_name || '',
      unsubscribed: !!r.do_not_email,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test — verwacht PASS**

Run: `npx vitest run src/lib/broadcast-recipients.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/broadcast-recipients.js src/lib/broadcast-recipients.test.js
git commit -m "feat(broadcast): pure helper recipients -> Resend-contacten"
```

---

## Task 2: Backend — `api/resend-broadcast.js`

**Files:**
- Create: `api/resend-broadcast.js`

Geen unit-test (externe I/O); handmatige integratietest in Step 3-4. Pas veldnamen aan op Task 0-bevindingen.

- [ ] **Step 1: Schrijf het endpoint**

```javascript
import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { toResendContacts } from '../src/lib/broadcast-recipients.js';

const RESEND = 'https://api.resend.com';
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

async function rs(path, method, body) {
  const resp = await fetch(`${RESEND}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return res.status(500).json({ error: 'RESEND_AUDIENCE_ID not configured' });

  const { subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by } = req.body || {};
  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'subject, html_body en recipients[] vereist' });
  }
  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'from_email/MARKETING_FROM_EMAIL ontbreekt' });
  const from = `${from_name || process.env.MARKETING_FROM_NAME || 'Marketing'} <${fromEmail}>`;

  // Alleen echt verzendbare contacten (met e-mail, niet opt-out).
  const contacts = toResendContacts(recipients).filter(c => !c.unsubscribed);
  if (contacts.length === 0) return res.status(400).json({ error: 'geen verzendbare ontvangers' });

  // 1) Segment aanmaken (per campagne). VELD/endpoint uit Task 0.
  const segName = (campaign_name || subject).slice(0, 80);
  const seg = await rs(`/audiences/${audienceId}/segments`, 'POST', { name: segName });
  if (!seg.ok) return res.status(502).json({ error: 'segment aanmaken faalde', detail: seg.data });
  const segmentId = seg.data.id;

  // 2) Contacten upserten + aan segment koppelen. VELD/endpoint uit Task 0.
  let upserted = 0;
  for (const c of contacts) {
    const r = await rs('/contacts', 'POST', { ...c, audience_id: audienceId, segments: [segmentId] });
    if (r.ok) upserted++;
  }
  if (upserted === 0) return res.status(502).json({ error: 'geen contacten toegevoegd aan segment' });

  // 3) Broadcast maken + versturen. TARGET-VELD uit Task 0 (segment_id vs audience_id).
  const bc = await rs('/broadcasts', 'POST', {
    segment_id: segmentId, from, reply_to: reply_to || undefined,
    subject, html: html_body, send: true,
  });
  if (!bc.ok) return res.status(502).json({ error: 'broadcast faalde', detail: bc.data });

  // 4) Log in campaigns (kanaal 'broadcast').
  await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: from_name || null, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: upserted, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id || null, sent_at: new Date().toISOString(),
  });

  return res.status(200).json({ broadcast_id: bc.data.id, segment_id: segmentId, recipients: upserted });
}
```

- [ ] **Step 2: DB-kolommen voor campaigns (indien nodig).** Voeg `channel` (text) en `resend_broadcast_id` (text) toe aan `campaigns` als ze ontbreken (Supabase MCP `apply_migration`, backup niet nodig — additief, nullable). Bewaar DDL in `sql/schema_campaign_broadcast_2026-07-01.sql`.

```sql
alter table public.campaigns add column if not exists channel text;
alter table public.campaigns add column if not exists resend_broadcast_id text;
```

- [ ] **Step 3: Handmatige integratietest (klein).** Zet `RESEND_AUDIENCE_ID` (test-audience) in de lokale env; roep het endpoint aan met 1-2 testadressen via `curl` (met een geldige sessie-JWT) of via de composer in Task 3. Controleer in het Resend-dashboard dat de broadcast op het marketingplan valt.

- [ ] **Step 4: Commit**

```bash
git add api/resend-broadcast.js sql/schema_campaign_broadcast_2026-07-01.sql
git commit -m "feat(broadcast): api/resend-broadcast (upsert -> segment -> broadcast)"
```

---

## Task 3: Composer-UI — Broadcast-modus

**Files:**
- Modify: `src/bd/marketing-composer.jsx`

- [ ] **Step 1: Voeg een verzendmodus toe.** Boven de verzendknoppen een keuze "Verzenden via": `Newsletter (Broadcast)` (default) of `Transactioneel (1-op-1)`. State: `const [sendMode, setSendMode] = useState('broadcast');`.

- [ ] **Step 2: Routeer de echte verzending.** In `send(testOnly)`: bij `testOnly` altijd de bestaande transactionele testmail naar `sentBy` houden. Bij een echte send en `sendMode === 'broadcast'`, POST naar `/api/resend-broadcast` met payload:

```javascript
const resp = await apiFetch('/api/resend-broadcast', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaign_name: name || subject,
    subject, html_body: htmlBody,
    from_name: fromName, from_email: fromEmail, reply_to: replyTo || null,
    recipients: recipients
      .filter(r => r.email)
      .map(r => ({ email: r.email, first_name: r.first_name || r.firstName || '', contact_id: r.id, do_not_email: r.do_not_email })),
    sent_by: sentBy,
  }),
});
```

Bij `sendMode === 'transactional'` blijft de bestaande `/api/marketing-send`-aanroep.

- [ ] **Step 3: Toon het aantal verzendbare ontvangers** (met e-mail) bij de Broadcast-modus, en een notitie "Personalisatie: voornaam".

- [ ] **Step 4: Build-check**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm && npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -E "built|error"; rm -rf dist_v*`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/bd/marketing-composer.jsx
git commit -m "feat(broadcast): composer-modus Newsletter (Broadcast) vs transactioneel"
```

---

## Task 4: Afmeld-webhook — `api/resend-webhook.js`

**Files:**
- Create: `api/resend-webhook.js`
- Reference: `api/marketing-webhook.js` (Svix-validatiepatroon)

- [ ] **Step 1: Bekijk het bestaande Svix-patroon.** Lees `api/marketing-webhook.js` en kopieer de handtekening-verificatie (headers `svix-id`, `svix-timestamp`, `svix-signature`, secret uit env). Gebruik `RESEND_WEBHOOK_SECRET`.

- [ ] **Step 2: Schrijf het endpoint** (pas payload-keys aan op Task 0-bevindingen).

```javascript
import { createClient } from '@supabase/supabase-js';
// Hergebruik dezelfde Svix-verificatie als api/marketing-webhook.js.
import { verifySvix } from './_lib/svix.js'; // extraheer indien nog inline in marketing-webhook

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const config = { api: { bodyParser: false } }; // raw body nodig voor Svix

export default async function handler(req, res) {
  const raw = await readRaw(req); // helper: verzamel de raw body
  const evt = verifySvix(raw, req.headers, process.env.RESEND_WEBHOOK_SECRET);
  if (!evt) return res.status(401).json({ error: 'invalid signature' });

  if (evt.type === 'contact.updated' && evt.data?.unsubscribed === true) {
    const email = String(evt.data.email || '').trim().toLowerCase();
    if (email) {
      await supabase.from('contacts')
        .update({ do_not_email: true })
        .ilike('email', email);
    }
  }
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 3: `readRaw`-helper en Svix-extractie.** Als `api/marketing-webhook.js` de Svix-logica inline heeft, verplaats die naar `api/_lib/svix.js` (`verifySvix(rawBody, headers, secret)`) en laat marketing-webhook die hergebruiken (DRY). Voeg een kleine `readRaw(req)` toe die de stream leest.

- [ ] **Step 4: Handmatige test.** Registreer de webhook-URL in het Resend-dashboard, meld een testcontact af, en controleer dat `contacts.do_not_email` op `true` staat (Supabase).

- [ ] **Step 5: Commit**

```bash
git add api/resend-webhook.js api/_lib/svix.js api/marketing-webhook.js
git commit -m "feat(broadcast): afmeld-webhook contact.updated -> do_not_email"
```

---

## Task 5: Versie, changelog, docs

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`, `CLAUDE.md`

- [ ] **Step 1: Bump versie** naar de volgende patch/minor (minor: nieuwe feature). Zet `VERSION`, `package.json` `version`, en `CURRENT_VERSION` in `changelog.js` gelijk.

- [ ] **Step 2: Changelog-entry** (type `feat`, titel "Newsletter via Resend Broadcasts", changes: broadcast-verzending, afmeld-webhook, composer-modus; files-lijst).

- [ ] **Step 3: CLAUDE.md §5** — documenteer: newsletters via Broadcasts (`RESEND_AUDIENCE_ID`, `RESEND_WEBHOOK_SECRET`), transactioneel blijft voor playbook-1-op-1, afmelden sync via `contact.updated`.

- [ ] **Step 4: Test + build**

Run: `npm test && npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -E "built|error"; rm -rf dist_v*`
Expected: tests groen, `✓ built`.

- [ ] **Step 5: Commit + tag**

```bash
git add VERSION package.json src/bd/changelog.js CLAUDE.md
git commit -m "chore: versie + changelog + docs newsletter Broadcasts"
git tag v<versie>
```

---

## Deploy & env (na implementatie)

- Zet in Vercel: `RESEND_AUDIENCE_ID` (productie-audience) en `RESEND_WEBHOOK_SECRET`.
- Registreer de webhook-URL (`/api/resend-webhook`) in het Resend-dashboard op `contact.updated`.
- Push (met akkoord) → Vercel deploy → verifieer met een kleine testselectie dat de broadcast op het marketingplan valt.

## Verificatie-checklist (eindtoets tegen de spec)

- [ ] Newsletter vanuit Marketing-selectie verstuurt via Broadcast (dashboard bevestigt marketingplan).
- [ ] Alleen voornaam-personalisatie werkt.
- [ ] From-keuze (v1.51.6) wordt gerespecteerd.
- [ ] Opt-out contacten worden niet gemaild; afmelden via de link zet `do_not_email` in de CRM.
- [ ] Transactionele playbook-1-op-1-weg ongewijzigd.

---

## UPDATE na Fase 0 (2026-07-13) — herziening Taak 2 & 4

Fase 0 bevestigde (zie `docs/superpowers/notes/resend-api-findings.md`):
- Broadcasts targeten een **`audience_id`**, niet een segment. **Segments vervallen.**
- Contacten: `POST /audiences/{id}/contacts` `{email, first_name, unsubscribed}`.
- Broadcast: `POST /broadcasts {audience_id, from, subject, name, html}` → daarna
  `POST /broadcasts/{id}/send`.
- Personalisatie voornaam: merge-tag **`{{{FIRST_NAME}}}`** (bevestigd: rendert "Hoi Olivier").
- **Per campagne een nieuwe audience** (keuze Olivier).
- Webhook: **bestaande `api/marketing-webhook.js` uitbreiden** met `contact.updated`
  (geen nieuw endpoint, geen nieuwe secret).

### Taak 2 (herzien): `api/resend-broadcast.js` — audience-based

```javascript
import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { toResendContacts } from '../src/lib/broadcast-recipients.js';

const RESEND = 'https://api.resend.com';
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

async function rs(path, method, body) {
  const resp = await fetch(`${RESEND}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Zet de app-placeholder {{first_name}} om naar Resend's merge-tag {{{FIRST_NAME}}}.
function toResendMergeTags(html) {
  return String(html || '').replaceAll('{{first_name}}', '{{{FIRST_NAME}}}');
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by } = req.body || {};
  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0)
    return res.status(400).json({ error: 'subject, html_body en recipients[] vereist' });

  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'from_email/MARKETING_FROM_EMAIL ontbreekt' });
  const from = `${from_name || process.env.MARKETING_FROM_NAME || 'Marketing'} <${fromEmail}>`;

  const contacts = toResendContacts(recipients).filter(c => !c.unsubscribed);
  if (contacts.length === 0) return res.status(400).json({ error: 'geen verzendbare ontvangers' });

  // 1) Nieuwe audience per campagne.
  const audName = `${campaign_name || subject} (${new Date().toISOString().slice(0,10)})`.slice(0, 100);
  const aud = await rs('/audiences', 'POST', { name: audName });
  if (!aud.ok || !aud.data?.id) return res.status(502).json({ error: 'audience aanmaken faalde', detail: aud.data });
  const audienceId = aud.data.id;

  // 2) Contacten toevoegen.
  let added = 0;
  for (const c of contacts) {
    const r = await rs(`/audiences/${audienceId}/contacts`, 'POST',
      { email: c.email, first_name: c.first_name, unsubscribed: false });
    if (r.ok) added++;
  }
  if (added === 0) return res.status(502).json({ error: 'geen contacten toegevoegd' });

  // 3) Broadcast maken + versturen.
  const bc = await rs('/broadcasts', 'POST', {
    audience_id: audienceId, from, reply_to: reply_to || undefined,
    subject, name: campaign_name || subject, html: toResendMergeTags(html_body),
  });
  if (!bc.ok || !bc.data?.id) return res.status(502).json({ error: 'broadcast aanmaken faalde', detail: bc.data });
  const send = await rs(`/broadcasts/${bc.data.id}/send`, 'POST', {});
  if (!send.ok) return res.status(502).json({ error: 'broadcast versturen faalde', detail: send.data });

  // 4) Log in campaigns (kanaal 'broadcast').
  await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: from_name || null, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: added, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id, resend_audience_id: audienceId,
    sent_at: new Date().toISOString(),
  });

  return res.status(200).json({ broadcast_id: bc.data.id, audience_id: audienceId, recipients: added });
}
```

DB-migratie (Supabase MCP, additief): `campaigns` krijgt `channel text`,
`resend_broadcast_id text`, `resend_audience_id text`. Bewaar in
`sql/schema_campaign_broadcast_2026-07-13.sql`.

### Taak 4 (herzien): afmelden via bestaande webhook

Geen nieuw endpoint. In `api/marketing-webhook.js`, in de `switch`/`case` op
`type`, een tak toevoegen: bij `contact.updated` met `event.data.unsubscribed === true`
→ `supabase.from('contacts').update({ do_not_email: true }).ilike('email', event.data.email)`.
Daarna in het Resend-dashboard het event `contact.updated` aanzetten op de
bestaande webhook. Bestaande `RESEND_WEBHOOK_SECRET` blijft ongewijzigd.

### Env

`RESEND_AUDIENCE_ID` vervalt (we maken per campagne een audience). Enkel de
bestaande `RESEND_API_KEY` (full access) en `RESEND_WEBHOOK_SECRET` zijn nodig.
