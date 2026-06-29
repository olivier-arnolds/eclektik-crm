# Organogram — design spec

Datum: 2026-06-29
Status: goedgekeurd (ontwerp), klaar voor implementatieplan

## Doel

Een nieuwe view "Organogram" in de CRM waarmee je per account de
contactpersonen van een bedrijf visueel kunt ordenen: hiërarchie (medewerker
onder contactpersoon), gelijke partners naast elkaar, en losstaande groepjes.
Je kunt bovendien deals (leads/opportunities) aan een contactpersoon koppelen
als visuele annotatie.

Look & feel volgt de bestaande Playbooks-view (React Flow / `@xyflow/react`),
met als verschil dat de linkerbalk contactpersonen toont in plaats van
processtappen.

## Beslissingen (vastgelegd met gebruiker)

- **Bereik:** per account. Eén organogram per account.
- **Beginstaat canvas:** leeg; gebruiker sleept zelf contactpersonen erop.
- **Deal-koppeling:** alleen visueel in het organogram. Verandert niets aan de
  deal in de funnel/database.
- **Koppelbare deals:** alle leads + opportunities van het account (incl.
  offertes (proposal), lopende projecten (onboarding/active), gesloten/slapende).
- **Verbindingslijnen:** twee soorten — `reports_to` (hiërarchie, verticaal) en
  `peer` (gelijk niveau, gestippeld/horizontaal), visueel onderscheiden.
- **Opslag:** autosave (gedebounced), geen aparte opslaan-knop.

## Niet in scope (YAGNI)

- Geen aparte "offerte/quote"-entiteit — die bestaat niet in de DB; een offerte
  is een opportunity in fase `proposal`.
- Geen terugschrijven van deal-koppeling naar de deal zelf.
- Geen cross-account / globaal canvas.
- Geen automatische lay-out/auto-arrange in v1 (handmatig plaatsen).
- Geen export (PNG/PDF) in v1.

## Navigatie & shell

- Nieuwe knop **"Organogram"** in `src/bd/topbar.jsx`, tussen *Meetings* en
  *Comms*. Eigen icoon (netwerk/org-icoon) toe te voegen aan `I` in
  `src/bd/atoms.jsx`.
- `'organogram'` toevoegen aan `NAV_VIEWS` in `src/bd/BDApp.jsx` (tussen
  `'meetings'` en `'comms'`).
- Linker-pane render in de unified shell: `activeView === 'organogram'` →
  `<OrganogramView accounts contacts deals refetch ... />`. Neemt het
  hoofdgebied in beslag (zoals Playbooks).
- **Account-selectie** kan op twee manieren, gesynchroniseerd:
  - via een zoekbare **dropdown** bovenin de organogram-view, en
  - via het **geselecteerde account in de rechter accountview-tab** (Account 360).
  Beide gebruiken dezelfde globale account-selectie uit `BDApp` (`pickAccount` /
  de geselecteerde account-state), zodat het organogram automatisch het account
  toont dat in de accountview openstaat, en andersom een keuze in de dropdown de
  accountview meebeweegt. Als er al een account geselecteerd is, opent het
  organogram daar meteen op.

## Layout van de view

Net als Playbooks: een linkerbalk (palette) + een React Flow canvas.

**Linkerbalk** met twee secties:
- *Contactpersonen* — alle (niet-inactieve) contactpersonen van het gekozen
  account, sleepbaar naar het canvas. Een contact dat al op het canvas staat
  wordt gemarkeerd als "geplaatst" (gedimd/vinkje) zodat je geen dubbel zet.
- *Deals* — alle leads + opportunities van het account, sleepbaar op een
  contactblokje.

**Canvas** (React Flow): pan/zoom, Background, Controls, MiniMap — net als
`PlaybookFlowBuilder.jsx`. Begint leeg.

## Datamodel & componenten

### Nieuwe componenten

- `src/bd/lane-organogram.jsx` (of `src/components/organogram/OrganogramView.jsx`)
  — top-level view: account-kiezer + palette + canvas + autosave-orchestratie.
  Volgt de mappenstijl van Playbooks (`src/components/playbooks/`). Definitieve
  plek wordt in het implementatieplan bepaald, consistent met bestaande conventie.
- Een custom React Flow node-type `contactNode` (NodeCard-equivalent) dat avatar,
  naam, rol, ★/$ badges en deal-chips toont.
- Een palette-component met de twee secties (contacten + deals) en
  `onDragStart` die het sleeptype + id meegeeft via `dataTransfer`.
- Een I/O-module (zoals `playbookGraphIO.js`) voor laden/opslaan van het
  organogram per account.

### React Flow shape

- Node: `{ id, type: 'contactNode', position: {x,y}, data: { contactId, dealRefs:[{table,id}] } }`.
  De weergavevelden (naam, avatar, badges) worden bij render opgezocht uit de
  `contacts`-array op `contactId` (we slaan geen contactgegevens dubbel op).
- Edge: `{ id, source, target, data: { relType: 'reports_to' | 'peer' } }`.
  `reports_to` en `peer` krijgen elk een eigen edge-stijl (kleur/streepjes).

## Relaties (de drie scenario's)

1. **Medewerker onder contactpersoon (hiërarchie):** verbind contact → medewerker
   met een `reports_to`-edge (verticaal, doorgetrokken).
2. **Gelijke partners (peers):** verbind twee contacten met een `peer`-edge
   (gestippeld/horizontaal), visueel anders dan hiërarchie.
3. **Losstaande groepjes:** twee niet-verbonden subtrees op hetzelfde canvas;
   geen edge ertussen = niet gelinkt.

Hoe het edge-type bij het verbinden wordt gekozen, wordt in het implementatieplan
uitgewerkt (bv. standaard `reports_to`, met een toggle/contextmenu om een edge
naar `peer` om te zetten). Default: `reports_to`.

## Deal koppelen aan een contact

- Sleep een deal uit de linkerbalk op een contactblokje. Bij drop verschijnt een
  **dropdown** met de deals van dat account; kies er één.
- De gekozen deal wordt toegevoegd aan `data.dealRefs` van de node en getoond als
  **chip** op het blokje (titel + D-nummer + fase-kleurtje uit `STAGE_TINT`).
- Meerdere deals per contact toegestaan. Chip verwijderen mogelijk.
- Klik op een chip kan (optioneel, in implementatieplan te bevestigen) de deal
  openen/naar de funnel navigeren. Koppeling blijft puur visueel; schrijft niets
  terug naar de deal.

## Opslag (Supabase)

Twee nieuwe tabellen, per account gekoppeld via `company_id`:

```sql
create table public.organogram_nodes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  pos_x        numeric not null default 0,
  pos_y        numeric not null default 0,
  deal_refs    jsonb not null default '[]'::jsonb,  -- [{ "table": "opportunities"|"leads", "id": "<uuid>" }]
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.organogram_edges (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  source_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  target_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  rel_type       text not null default 'reports_to',  -- 'reports_to' | 'peer'
  created_at     timestamptz not null default now()
);

create index on public.organogram_nodes (company_id);
create index on public.organogram_edges (company_id);
```

- RLS wordt automatisch aangezet door de bestaande `rls_auto_enable` event
  trigger; de uniforme `auth users full access`-policy geldt (geen Anon-policies
  toevoegen).
- Migratie additief en niet-destructief; SQL opslaan in `sql/` conform protocol.

### Laden / opslaan

- **Laden** (bij account-selectie): haal nodes + edges op waar
  `company_id = <account>`. Map naar React Flow shape; weergavevelden opzoeken in
  `contacts`/`deals`.
- **Opslaan (autosave, gedebounced ~500-800ms):** bij verslepen/verbinden/deal
  koppelen. Strategie: delete-all-then-insert per `company_id` (zoals
  `savePlaybookGraph`), of gerichte upserts. Definitieve strategie in
  implementatieplan; delete-then-insert is de eenvoudige baseline.

## Look & feel

- Hergebruik bestaande atoms/CSS (`atoms.jsx`, `styles.css`) en de avatar-/badge-
  styling uit `lane-accounts.jsx` (★ groen primary, $ blauw financieel, dubbele
  ring bij beide) zodat blokjes consistent zijn met Account 360.
- React Flow Background/Controls/MiniMap zoals Playbooks.

## Versioning & deploy

- Conform CLAUDE.md: `VERSION` + `package.json` + `src/bd/changelog.js`-entry in
  lockstep, git-tag `v<versie>`. Nieuwe minor (volgend op huidige 1.45.0).
- DB-migratie via Supabase MCP (`apply_migration`) of SQL Editor; SQL bewaren in
  `sql/`.
- Verificatie op de live Vercel-deploy (app zit lokaal achter Microsoft-login).

## Raakvlakken met bestaande code (referenties)

- `src/bd/topbar.jsx` — nav-knoppen.
- `src/bd/BDApp.jsx` — `NAV_VIEWS`, view-state, left-pane switch, data uit
  `useBDData()` (`accounts`, `contacts`, `deals`, `refetch`).
- `src/components/playbooks/PlaybookFlowBuilder.jsx` — React Flow canvas +
  drag-from-sidebar patroon.
- `src/components/playbooks/panels/NodePalette.jsx` — sleepbare palette-items.
- `src/components/playbooks/lib/playbookGraphIO.js` — laad/opslaan-patroon.
- `src/bd/adapters.js` / `src/hooks/usePipelineData.js` — contact- en deal-shapes.
- `src/bd/atoms.jsx` — `I` iconenset, `STAGE_TINT`.
```
