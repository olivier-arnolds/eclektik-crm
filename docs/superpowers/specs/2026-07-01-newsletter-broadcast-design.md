# Newsletter via Resend Broadcasts (selectie-gebaseerd)

**Datum:** 2026-07-01
**Status:** Goedgekeurd (Olivier), klaar voor implementatieplan

## Aanleiding

De juli-newsletter verbruikte de transactionele e-maillimiet van Resend in
plaats van het geactiveerde marketing (contact-)plan. Oorzaak: `api/marketing-send.js`
verstuurt per ontvanger een transactionele mail via `POST /emails`. Resend kent
twee gescheiden modellen:

- **Transactioneel** (`/emails`): volume-gelimiteerd (Free = 100/dag, 3000/maand).
- **Marketing/Broadcasts**: contact-gelimiteerd; verstuurd naar een Segment binnen
  een Audience.

Newsletters horen via Broadcasts te gaan. 1-op-1 playbook-mails blijven
transactioneel (dat is correct en valt buiten deze wijziging).

## Doel

Vanuit de Marketing-tab een **willekeurige selectie** (opgebouwd met het
linkermenu-filter + handmatige selectie) als newsletter versturen via een Resend
**Broadcast**, zodat het marketingplan wordt gebruikt en er geen daglimiet geldt.

## Uitgangspunten (goedgekeurd)

- Doelgroep = de actuele selectie in de Marketing-tab (niet beperkt tot tags).
- Personalisatie: **alleen voornaam** (voorlopig).
- Afzender: hergebruik van de bestaande From-keuze (`from_name`/`from_email`, v1.51.6).
- Afmelden: tweerichting-sync met de bestaande `do_not_email`-opt-out.

## Architectuur

### Resend-datamodel (bevestigd via docs)

- **Contacts** zijn globaal per e-mailadres (velden: `email`, `first_name`,
  `last_name`, `unsubscribed`, custom properties). Aanmaken/upserten via
  `POST /contacts`, met een `segments`-array om ze meteen aan een segment te koppelen.
- **Segments** kunnen **statische lijsten** zijn die we programmatisch vullen
  (niet enkel filters). Een Broadcast gaat naar een segment.
- **Broadcasts**: `POST /broadcasts` met segment-target, `from`, `subject`, `html`,
  `reply_to`, `send: true`. Resend voegt automatisch de verplichte afmeldlink toe
  en slaat `unsubscribed` contacten over.
- **Afmelden** wordt gereflecteerd via het webhook-event `contact.updated`
  (`unsubscribed = true`). Geen dedicated unsubscribe-event.

### Componenten (nieuw / gewijzigd)

1. **`api/resend-broadcast.js`** (nieuw, serverless, `requireUser`): orkestreert
   één newsletter-verzending:
   a. Ontvangt `{ subject, html_body, from_name, from_email, reply_to, recipients: [{email, first_name, contact_id}], campaign_name }`.
   b. Filtert `recipients` op geldig e-mailadres en niet-`do_not_email`.
   c. Upsert elk contact in de vaste Audience via `POST /contacts`
      (`unsubscribed` afgeleid van `do_not_email`).
   d. Maakt een segment (genoemd naar de campagne) en voegt exact deze contacten toe.
   e. Maakt + verstuurt de broadcast naar dat segment (`send: true`).
   f. Schrijft een `campaigns`-rij (kanaal `broadcast`) + `campaign_sends` (of een
      lichte variant; zie Datamodel).
2. **`api/resend-webhook.js`** (nieuw): ontvangt `contact.updated`, valideert de
   Svix-handtekening (zelfde patroon als `marketing-webhook.js`), en zet bij
   `unsubscribed = true` het corresponderende CRM-contact op `do_not_email = true`
   (match op e-mailadres).
3. **Composer-UI** (`marketing-composer.jsx`): een verzendmodus "Versturen als
   newsletter (Broadcast)". De From-keuze en het HTML-veld blijven; de knop routeert
   naar `api/resend-broadcast` i.p.v. `api/marketing-send`. Toont het aantal
   geldige ontvangers. De transactionele test-send blijft beschikbaar als
   "Testmail naar mijzelf".
4. **DB (klein)**: onthoud de vaste Resend `audience_id` in een config-tabel of env
   var, zodat we niet elke keer een audience aanmaken. Segments zijn per campagne.

### Data-flow

```
Marketing-selectie ─▶ Send campaign ─▶ Composer (Broadcast-modus)
   ─▶ api/resend-broadcast
        ├─ upsert contacts (POST /contacts, unsubscribed=do_not_email)
        ├─ create segment + add contacts
        └─ create+send broadcast (POST /broadcasts, send:true)
   ─▶ campaigns/campaign_sends bijgewerkt

Afmelden in Resend ─▶ webhook contact.updated ─▶ api/resend-webhook
   ─▶ contacts.do_not_email = true (match op e-mail)
```

## Personalisatie

Alleen voornaam, via Resend's merge-tag voor `first_name` in de HTML. De exacte
merge-tag-syntax wordt in fase 1 bevestigd. De client stuurt de HTML met de
merge-tag mee; per-recipient client-side rendering (zoals bij de transactionele
weg) is niet meer nodig voor de broadcast.

## Foutafhandeling

- Ontbrekende `RESEND_API_KEY` / audience-config → 500 met duidelijke melding.
- Contact-upsert faalt voor één contact → loggen, doorgaan (best-effort), tenzij
  het de hele batch betreft.
- Broadcast-creatie faalt → campagne markeren als `failed`, foutdetails teruggeven.
- Webhook: ongeldige Svix-handtekening → 401, geen mutatie.

## Testen

- Unit: mapping `do_not_email → unsubscribed`, recipient-filtering (geen e-mail /
  opt-out eruit).
- Integratie (tegen Resend-testaccount): contact-upsert → segment → broadcast met
  1-2 testadressen; controleer dat de mail op het marketingplan valt (dashboard).
- Webhook: simuleer `contact.updated` unsubscribed=true → `do_not_email` gezet.

## Gefaseerde implementatie

**Fase 0 - API-spike (verplicht eerst).** Bevestig tegen het echte Resend-account
de exacte vormen: audience aanmaken/ophalen, segment aanmaken + contacten toevoegen
(endpoint), broadcast-target-veld (`segment_id` vs `audience_id`), merge-tag-syntax
voor voornaam, en het `contact.updated`-payloadformaat. Leg de bevindingen vast.

**Fase 1 - Backend broadcast-send.** `api/resend-broadcast.js`: upsert → segment →
broadcast. Handmatig te testen met een kleine selectie.

**Fase 2 - Composer-UI.** Broadcast-modus + routering + ontvangersteller;
testmail-pad behouden.

**Fase 3 - Afmeld-webhook.** `api/resend-webhook.js` (Svix-validatie) → `do_not_email`.
Webhook registreren in het Resend-dashboard.

**Fase 4 - Opruimen/versie.** Changelog, versie-bump, documentatie in CLAUDE.md
(§5 Resend: transactioneel vs broadcast).

Elke fase apart committen en verifiëren. Vercel Pro-functielimiet: dit voegt 2
nieuwe serverless-functies toe; controleren dat we onder de limiet blijven.

## Buiten scope

- Personalisatie voorbij voornaam (custom properties) - later.
- Automatische/geplande newsletters (cron) - later.
- Migratie van de transactionele playbook-1-op-1-mails (blijven transactioneel).
- Beheer-UI voor Resend-audiences/segmenten in de CRM (segments worden per
  campagne automatisch aangemaakt).

## Te bevestigen in Fase 0

- Exacte endpoints: create audience, create segment, add-contact-to-segment.
- Broadcast-target: `segment_id` (nieuw) vs `audience_id` (oud) in het account.
- Merge-tag-syntax voor `first_name`.
- `contact.updated`-payload (bevat het e-mailadres + `unsubscribed`).
