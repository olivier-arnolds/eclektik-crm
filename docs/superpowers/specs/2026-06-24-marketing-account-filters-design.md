# Marketing-tab: account-gegevens als filtercriteria

**Datum:** 2026-06-24
**Component:** `src/bd/marketing-contacts.jsx` (+ `src/bd/adapters.js`)

## Doel

In de Marketing → Contacts-tab kun je contacten filteren op kenmerken van het
gekoppelde account: bedrijfsnaam, land, stad, industrie en aantal werknemers.
Voorbeeld: filter op land = United Kingdom → toon alle contacten waarvan het
account in UK zit.

## Datamodel (bestaand, geen DB-wijziging)

Contacten hangen aan een account via `contact.accountId`. De `companies`-tabel
levert via `adaptAccount` (`adapters.js`):

- `region`  ← `companies.country`  (land, 153/192 gevuld)
- `city`    ← `companies.city`      (stad, 129/192)
- `industry`← `companies.industry`  (industrie, 184/192)
- **nieuw:** `employeeCount` ← geparsed uit `companies.employee_count`
  (ruwe getallen-als-tekst, bv. "40000", "140", "4500.0"; 0/192 in `size`,
  daarom `employee_count` gebruiken)
- `name`    ← bedrijfsnaam (bestaand)

## UI

Nieuw sidebar-blok **"Account"** in de Contacts-filtersidebar, geplaatst tussen
"Account status" en "Status".

Vijf filters:

1. **Bedrijf** — zoekbare multi-select dropdown (alle bedrijfsnamen van
   accounts die aan ≥1 contact hangen).
2. **Land** — zoekbare multi-select (waarden uit `account.region`).
3. **Stad** — zoekbare multi-select (`account.city`).
4. **Industrie** — zoekbare multi-select (`account.industry`).
5. **Werknemers** — rij toggle-knoppen met vaste buckets:
   `1-50`, `51-200`, `201-1000`, `1001-5000`, `5000+`. Meerdere tegelijk
   selecteerbaar.

De keuzelijsten voor 1-4 worden afgeleid uit de aanwezige accounts,
alfabetisch gesorteerd, met een telling (#contacten) per waarde. Lege/onbekende
waarden komen niet in de lijst.

### Herbruikbaar dropdown-component

Eén klein component `MultiSelectFilter` voor Bedrijf/Land/Stad/Industrie:
- Knop toont label + aantal geselecteerd (bv. "Land (2)").
- Klap open → zoekveldje + scrollbare checkbox-lijst met telling per waarde.
- Selectie in een `Set` in de parent-state.

## Filterlogica

In de bestaande `filtered` useMemo:
- Bouw een lookup `accountId → { name, country, city, industry, emp }`.
- Voor een contact `c` met account `a`:
  - **Bedrijf**: als set niet leeg → `a.name ∈ set`.
  - **Land**: `a.region ∈ set`.
  - **Stad**: `a.city ∈ set`.
  - **Industrie**: `a.industry ∈ set`.
  - **Werknemers**: als ≥1 bucket actief → `a.emp` bekend én valt in een
    geselecteerde bucket. Onbekende `emp` matcht niet (valt buiten).
- **AND** tussen categorieën, **OR** binnen een categorie (consistent met de
  bestaande Account-status-filter).
- Combineert met alle bestaande filters (tags, status, deals, email/linkedin
  enz.).

## Versiebeleid

Bump `VERSION` + `package.json` `version` + `src/bd/changelog.js`-entry,
commit per stap, tag `v<version>`. Niet pushen zonder toestemming.

## Buiten scope (YAGNI)

- Geen opslaan van filter-presets.
- Geen DB-migratie of normalisatie van `employee_count`/landnamen.
- Geen filteren op velden die niet gevraagd zijn (tier, owner, ARR).
