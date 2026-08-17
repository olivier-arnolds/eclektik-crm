# Content-doelgroepkiezer: tijdelijke selectie i.p.v. permanente tag

Datum: 2026-08-17
Status: ontwerp (goedgekeurd door Olivier, klaar voor implementatieplan)

## Probleem

In de Content-tab kiest de draft-popup nu één permanente `target_tag` als
doelgroep voor een e-mail-item. Dat werkt niet zoals gewenst: je moet eerst
ergens een tag aanmaken/onderhouden, en de selectie is grofmazig. Olivier wil
per content-item een **tijdelijke** doelgroep kunnen samenstellen met filters
zoals in de Marketing-tab, zonder dat dit een permanente tag wordt.

## Kernbeslissingen (vastgelegd)

1. **Bevroren momentopname.** Bij het samenstellen/goedkeuren wordt de concrete
   lijst contact-IDs op het item vastgelegd. De cron verstuurt naar exact die
   lijst. Nieuwe contacten die later aan dezelfde criteria voldoen gaan *niet*
   automatisch mee. Reden: geen server-side her-implementatie van de
   (client-side) marketingfilter nodig; voorspelbaar gedrag.
2. **Praktische subset van filters** (geen 1-op-1 hergebruik van het volledige
   marketing-component): tags, account-status, land, industrie, e-mail aanwezig,
   opt-in. Nieuw, licht component; geen refactor van `marketing-contacts.jsx`.
3. **Tag-UI vervangen** door de nieuwe kiezer. `target_tag` blijft alleen in de
   DB bestaan als fallback voor reeds bestaande items.
4. **Compliance-vangnet blijft** in de cron: ook bij een bevroren lijst filtert
   de cron op `marketing_content_opt_in=true`, actief (niet `former`), en slaat
   afgemelde / `do_not_email` contacten over (conform CLAUDE.md §5).
5. **Per-bedrijf ontdubbeling (hybride).** Bij grote accounts komen snel meerdere
   contacten boven; om overkill te voorkomen wil je per bedrijf alleen de meest
   passende contact(en). De kiezer:
   - **groepeert de lijst per bedrijf** (met per bedrijf een teller: hoeveel van
     hoeveel geselecteerd);
   - biedt een **"max per bedrijf"-knop** (onbeperkt / 1 / 2 / 3) die automatisch
     de best-passende N per bedrijf voorselecteert en de rest uitvinkt;
   - laat je daarna **handmatig per contact bijsturen**.
   De automatische rangorde (wie "wint" per bedrijf) = **functietitel-senioriteit
   met een HR/People-boost**, tie-break op e-mail + opt-in aanwezig:
   `rank = senioriteit(titel) + (HR-rol ? 25 : 0) + (e-mail ? 2 : 0) + (opt-in ? 1 : 0)`.
   Senioriteit-tiers: exec/C-level 100, VP/Head 80, Director 60, Manager/Lead 40,
   overig 20. HR/People-rollen (CHRO, Head of HR, People, Talent, Culture, L&D,
   Workforce, DEI) krijgen +25 zodat ze net boven de eerstvolgende niet-HR-tier
   uitkomen. Contacten zónder gekoppeld account worden niet gelimiteerd (elk een
   eigen "groep").

## Datamodel

Tabel `content_calendar_items` krijgt twee kolommen:

- `target_contact_ids uuid[]` - de bevroren selectie (null/leeg = geen selectie).
- `audience_summary text` - kort leesbaar label, bijv.
  `"Prospect + Nederland, e-mail aanwezig - 42 contacten"`. Puur voor weergave
  in popup en kalender.

`target_tag` blijft bestaan (backward-compat). Geen data-migratie nodig; oude
items houden hun tag en blijven via de fallback werken.

Migratie in `sql/` opslaan (conform werkwijze). Backup vooraf niet nodig (alleen
additief `ADD COLUMN`, geen bestaande data aangeraakt).

## Componenten

### Nieuw: `src/bd/content-audience-picker.jsx` (modal)

- **Input (props):** `contacts` (verrijkt, uit `useBDData` - bevat `c.tags`,
  `c.accountId`, `c.role`, `c.isFormer`, `c.email`, opt-in-status), `accounts`
  (voor land/industrie-meta per account), `allTags`, `onApply`, `onClose`.
  (Geen `initialContactIds`: we bewaren alleen ids + samenvatting, niet de
  filters, dus "wijzigen" opent een verse kiezer.)
- **Filters (subset), client-side over `contacts`:**
  - Tags (multi-select uit `allTags`)
  - Account-status (`companies.type`: Prospect / Customer / Partner / Relation)
  - Land (`account.country`)
  - Industrie (`account.industry`)
  - E-mail aanwezig (ja/nee)
  - Opt-in (`marketing_content_opt_in`) - default aan "ja" zodat de selectie
    standaard mailbaar is.
- **Weergave:** live teller ("X van Y") + **per bedrijf gegroepeerde** lijst,
  binnen elke groep gesorteerd op rangorde (best-passende bovenaan). Standaard
  staan alle gefilterde contacten aangevinkt; individueel uit-/aanvinken mogelijk.
- **Max per bedrijf:** knop (onbeperkt / 1 / 2 / 3). Bij wijziging voorselecteert
  de kiezer automatisch de top-N per bedrijf (op basis van de rangorde in
  beslissing #5) en vinkt de rest uit; handmatig bijsturen blijft mogelijk.
- **Output:** knop "Gebruik deze selectie" → `onApply({ contact_ids, summary })`.
  `summary` wordt afgeleid uit de actieve filters + telling.
- Filter-afleidingen (land/industrie/status per contact via `accountId`) volgen
  hetzelfde patroon als `marketing-contacts.jsx` (`accountMetaById`,
  `accountTypeById`), maar als kleine lokale helper - niet gedeeld/geëxtraheerd.

### Wijziging: `src/bd/content-calendar-view.jsx`

- `ContentCalendarView` krijgt extra props `accounts` en `allTags` (nu alleen
  `contacts`); doorgeven aan `ContentItemModal` en de picker.
- In `ContentItemModal` (e-mail-type): de "Doelgroep (tag)"-dropdown vervangen
  door:
  - knop **"Doelgroep samenstellen"** die de picker opent;
  - na selectie een samenvattingsregel (`audience_summary` + aantal) met een
    "wijzig"-knop.
- State: `targetContactIds` + `audienceSummary` (init uit
  `item.target_contact_ids` / `item.audience_summary`).
- Opslaan (`onSaved` / DB-update): schrijf `target_contact_ids` en
  `audience_summary` weg; `target_tag` niet meer vanuit de UI zetten (blijft
  ongemoeid op bestaande items).
- Goedkeur-/plan-waarschuwing: de bestaande melding "kies een doelgroep, anders
  kan de cron niet versturen" checkt voortaan op een niet-lege
  `targetContactIds` i.p.v. op `targetTag`.

### Wijziging: `src/bd/BDApp.jsx`

- `<ContentCalendarView contacts={contacts} accounts={accounts}
  allTags={allTags} />` (accounts + allTags toevoegen).

### Wijziging: `api/content-calendar-execute.js`

- `recipientsForItem(item)`:
  - als `item.target_contact_ids?.length` → haal die contacten op als basis;
  - anders → huidige tag-pad (`resolveTagId(item.target_tag)`).
- Beide paden lopen daarna door **dezelfde guard**: `marketing_content_opt_in =
  true`, niet `former`, geen `do_not_email`, en de bestaande afgemeld-check.
- Foutmeldingen aanpassen ("geen opted-in ontvangers in de selectie" vs.
  "...voor deze tag").

## Data-flow

1. Gebruiker opent content-e-mail draft → "Doelgroep samenstellen".
2. Picker filtert `contacts` client-side → gebruiker verfijnt en vinkt af.
3. "Gebruik deze selectie" → `contact_ids` + `summary` terug naar de popup.
4. Opslaan schrijft `target_contact_ids` + `audience_summary` op het item.
5. Goedkeuren + datum → status `scheduled`.
6. Cron pakt `scheduled`-items; `recipientsForItem` neemt de bevroren IDs,
   past de compliance-guard toe, en verstuurt via `sendBroadcast`.

## Foutafhandeling / randgevallen

- **Lege selectie bij verzenden:** cron geeft (zoals nu) `ok:false, reason:
  'geen opted-in ontvangers ...'`; item blijft `scheduled` (retry-safe), niets
  wordt gepubliceerd.
- **Contact verwijderd tussen selectie en verzending:** ontbrekende IDs worden
  simpelweg overgeslagen bij het ophalen (geen error).
- **Contact niet (meer) opted-in of afgemeld:** valt weg door de guard, ook al
  stond het in de bevroren lijst. Dit is bewust (compliance boven WYSIWYG).
- **Bestaande items met alleen `target_tag`:** blijven werken via de fallback.

## Testen

- `content-calendar-logic.js` blijft de statusafleiding testen (ongewijzigd).
- Nieuwe pure helper voor de picker-filtering (contact→past-bij-filters) apart
  testbaar houden, met een klein unit-testbestand
  (`content-audience-picker-logic.test.js`) analoog aan bestaande tests.
- Handmatige verificatie in de live deploy: item samenstellen, opslaan,
  goedkeuren+plannen, cron-run controleren via Vercel runtime-logs.

## Buiten scope (YAGNI)

- Server-side her-evaluatie van filters (live doelgroep).
- Opslaan/hergebruiken van samengestelde selecties als herbruikbare "segmenten".
- De volledige marketingfilter-set (werknemers-buckets, connectiestatus,
  Glint-deal, stad, e-mailstatus) in de content-kiezer.
- Refactor van `marketing-contacts.jsx` tot gedeeld filtercomponent.
