# Content Calendar — rapportage-popup per contentstuk (fase 1)

**Datum:** 2026-08-19
**Status:** ontwerp, goedgekeurd voor uitwerking naar implementatieplan
**Scope:** fase 1 van 2. Engagement-tracking (opens/kliks/likes) is bewust een apart fase-2-project en valt buiten deze spec.

## Doel

Olivier wil per contentstuk in de Content Calendar snel een kleine rapportage
kunnen inzien zonder de editor te openen: waar staat het stuk in de pijplijn,
wat is het verzendresultaat, en waar gaat het over. De rapportage draait
(op de optionele AI-samenvatting na) volledig op data die al in
`content_calendar_items` staat — geen nieuwe tracking, geen DB-schemawijziging.

## Trigger & interactie

- Elk kalenderkaartje (`ItemCard`, gebruikt in zowel week- als maandweergave)
  krijgt rechtsboven een klein rapportage-icoon.
- Klik op het icoon opent de rapportage-popup voor dat stuk. De klik roept
  `stopPropagation()` aan zodat de bestaande kaart-`onClick` (die de editor
  opent via `onOpen`) niet óók afgaat.
- De popup is een aparte modal, los van de bestaande `ContentItemModal`
  (de editor). Sluiten via kruisje of klik op de overlay, net als de editor.
- Eén popup tegelijk; state leeft in de parent `ContentCalendarView`
  (`reportItem`, net zoals het bestaande `openItem`).

## Inhoud van de popup — drie blokken

### 1. Status (pijplijn)

- Visuele stappenbalk met de vier statussen in vaste volgorde:
  `draft` (Concept) → `approved` (Goedgekeurd) → `scheduled` (Gepland) →
  `published` (Gepubliceerd). De huidige stap licht op; eerdere stappen tonen
  als "gehaald".
- Tijdlijn met de relevante momenten: aangemaakt op (`created_at`),
  gepland voor (`scheduled_at`), gepubliceerd op (`published_at`). Toon alleen
  wat gevuld is, in `nl-NL`-notatie.
- Waarschuwingen (afgeleid, zie logica hieronder), in amber (aandacht) of rood
  (blokkerend voor publicatie). Geen waarschuwing = niets tonen.

### 2. Verzendresultaat

Alleen tonen zodra er iets te melden is (`scheduled`, aan het versturen, of
`published`). Bevat:

- Kanaal (`channel` → CHANNELS-label) en type (`type` → TYPE_BADGE).
- Afzender/account: bij e-mail `from_name`/`from_email`; bij LinkedIn het
  account-label via `linkedinAccountLabel(linkedin_account_id)`.
- Aantal ontvangers: `published_recipient_count` als gepubliceerd.
- Drip-voortgang: `sent_emails` is een jsonb-array van reeds-verstuurde
  e-mailadressen. Toon "X verstuurd tot nu toe" (X = `sent_emails.length`).
  Het totaal is mid-drip niet persistent opgeslagen; bij afronding is
  `published_recipient_count` het totaal.
- Extern bericht-ID: `external_message_id` (klein, monospace, informatief).

### 3. Inhoud

- **Altijd** gestructureerd, gratis, geen model-aanroep:
  - Doelgroep: `target_tag`, anders `audience_summary`, anders het aantal
    `target_contact_ids`, anders (bij DM) de ontvanger via
    `recipient_contact_id`.
  - Onderwerp (`subject`, bij e-mail) en de eerste paar regels van `body`.
  - `source_note` indien aanwezig (waar het idee vandaan kwam).
- **Op verzoek** een AI-samenvatting: knop "AI-samenvatting" doet één lichte
  model-aanroep (Haiku) die het stuk in 1-2 zinnen samenvat. Resultaat wordt
  gecachet in de popup-state zolang die open is (herklik = geen nieuwe call).
  Alleen kosten wanneer de gebruiker klikt.

## Architectuur

Opgedeeld in kleine, los-testbare eenheden, in lijn met bestaande patronen.

### Pure logica — `src/bd/content-calendar-logic.js`

Nieuwe pure functie, naast de bestaande `isApproved`/`deriveStatus`/
`statusAfterMove`:

```
itemReport(item, { now }) -> {
  stage,            // 'draft' | 'approved' | 'scheduled' | 'published'
  stageIndex,       // 0..3, voor de stappenbalk
  timeline: { created_at, scheduled_at, published_at },
  warnings: [ { level: 'warn'|'block', message } ],
  send: {           // null als er niets te melden is
    channel, type, sender, recipientCount, dripSent, externalId,
  },
}
```

`now` wordt als parameter meegegeven (niet `Date.now()` intern) zodat de functie
deterministisch testbaar is.

**Waarschuwingsregels (pure):**

- `approved` én geen `scheduled_at` → warn: "Goedgekeurd maar geen datum; de
  cron plant dit nog niet in."
- `scheduled` én `scheduled_at` in het verleden (t.o.v. `now`) → warn:
  "Geplande tijd is verstreken maar nog niet gepubliceerd; check de Vercel-logs."
- type `email`, status `approved`/`scheduled`, én geen `target_tag` én lege
  `target_contact_ids` → block: "Geen doelgroep; de cron kan niet versturen."
- type `linkedin_dm`, status `approved`/`scheduled`, én geen
  `recipient_contact_id` → block: "Geen ontvanger gekozen."

Bijbehorende unit-tests in `content-calendar-logic.test.js`: één test per
waarschuwingsregel (wel/niet triggeren), stage-afleiding, en de send-samenvatting
(o.a. drip vs. afgerond, LinkedIn vs. e-mail afzender).

### UI-component — rapportage-popup

Nieuwe component `ContentReportModal({ item, contacts, onClose })` (in
`content-calendar-view.jsx` of een eigen bestandje als het te groot wordt).
Rendert de drie blokken op basis van `itemReport(item, { now: new Date() })`.
`contacts` is nodig om `recipient_contact_id` naar een naam te resolven.
De AI-knop zit in blok 3; de fetch-state (`loading`/`summary`/`error`) leeft
lokaal in deze component.

### Kaart-icoon — `ItemCard`

- Kop van het kaartje wordt een flex-rij: type-badge links, rapportage-icoon
  rechts.
- Nieuwe prop `onReport(item)`. De icoon-`onClick` doet `stopPropagation()` en
  roept `onReport(it)` aan. `onReport` wordt door `WeekGrid`/`MonthGrid`
  doorgegeven vanaf `ContentCalendarView`, net als het bestaande `onOpen`.

### AI-samenvatting endpoint — `api/content-summary.js`

- Nieuw serverless-endpoint, guard `requireUser` (via `api/_lib/guard.js`),
  aangeroepen met `apiFetch` (session-token) vanuit de popup.
- Input: `{ channel, type, subject, body }` van het item.
- Model: `claude-haiku-4-5` (goedkoop), korte system-prompt: "vat dit
  contentstuk in 1-2 zinnen samen voor een intern overzicht." Puur intern,
  dus §2b-communicatieregels zijn hier niet van toepassing.
- Output: `{ summary }`. Bij fout → nette foutmelding in de popup, geen crash.

## Wat expliciet NIET in fase 1 zit

- Geen engagement-cijfers (opens, kliks, likes, reacties, impressies) en dus
  geen Resend-webhook-events of Unipile-polling. Dat is fase 2.
- Geen DB-schemawijziging.
- Geen aparte overzichtslijst/tabel-weergave; de rapportage is per stuk via het
  kaart-icoon.

## Bestanden die geraakt worden

- `src/bd/content-calendar-logic.js` — `itemReport()` toevoegen.
- `src/bd/content-calendar-logic.test.js` — tests voor `itemReport()`.
- `src/bd/content-calendar-view.jsx` — `ItemCard`-icoon + `onReport`-prop,
  `reportItem`-state, `ContentReportModal` renderen.
- `api/content-summary.js` — nieuw endpoint.
- Versie-discipline: `VERSION`, `package.json`, `src/bd/changelog.js` bumpen +
  commit taggen.

## Testen & verificatie

- `npm test` (vitest) groen, inclusief de nieuwe logic-tests.
- Build-check via de wegwerp-outDir (CLAUDE.md §2).
- Handmatig in de live deploy: icoon zichtbaar op kaartjes in week- én
  maandweergave; klik opent de popup en niet de editor; blokken kloppen voor
  een draft, een gepland stuk en een gepubliceerd stuk; AI-knop werkt en cachet.
