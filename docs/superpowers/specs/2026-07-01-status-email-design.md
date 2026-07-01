# Status Email — Surfe-uitkomst per contact

**Datum:** 2026-07-01
**Status:** Goedgekeurd (Olivier), klaar voor implementatie

## Doel

Per contact zichtbaar maken wat de laatste Surfe-e-mailzoekpoging opleverde,
zodat je in de Marketing-tab in één oogopslag ziet welke contacten ná een
Surfe-poging nog steeds geen e-mail hebben (bv. voor een LinkedIn-only aanpak of
een volgende zoekronde). Zichtbaar als badge in de lijst én als filter.

## Datamodel

Nieuwe kolom `contacts.email_status` (`text`, nullable). Gestructureerde waarde
(niet de letterlijke weergavetekst) zodat er betrouwbaar op te filteren is:

| Waarde              | Weergave    | Betekenis                          |
|---------------------|-------------|------------------------------------|
| `null`              | (niets)     | Nog niet via Surfe gezocht         |
| `found_surfe`       | ✓ Surfe     | E-mail gevonden via Surfe          |
| `not_found_surfe`   | ❌ Surfe    | Gezocht via Surfe, niets gevonden  |

Bij een volgende Surfe-run wordt de status overschreven (❌ → ✓ als 'ie later
alsnog gevonden wordt).

## Backend — `api/surfe.js` (action `find-emails`)

Bij het terugschrijven per contact:
- **gevonden** → `email` + `email_status = 'found_surfe'`
- **niets gevonden** (`no-email`-tak) → `email_status = 'not_found_surfe'` (nieuwe DB-write)
- **DB update-fout / Surfe API-fout / timeout** → status ongemoeid laten
  (geen definitief "niet gevonden", opnieuw proberen blijft mogelijk)

## Frontend — Marketing-tab

**Adapterketen:** `email_status` doorgeven in `adapters.js` `adaptContact`
(de eerste adapter in `usePipelineData` spreidt de ruwe row al door; de fetch
gebruikt `select('*')`, dus geen fetch-wijziging nodig).

**Badge in de contactenlijst:** klein label per rij — `✓ Surfe` (groene
achtergrond-tint, donkere tekst) / `❌ Surfe` (rode achtergrond-tint, donkere
tekst), niets bij `null`. Conform de contrast-afspraak (kleur = achtergrond,
niet tekst).

**Filter in het linkermenu:** een "Status Email"-filter met drie keuzes —
gevonden / niet gevonden / nog niet gezocht — zodat je de lijst kunt inperken
(bv. alle ❌ voor LinkedIn-only, of alle "nog niet gezocht" voor de volgende
Surfe-ronde).

## Kanttekening

De status weerspiegelt de **Surfe-poging**, niet of er überhaupt een e-mail is.
Een contact dat al mét e-mail is geïmporteerd heeft `null` als status tot je
'm zoekt. E-mail-aanwezigheid is al apart zichtbaar in de lijst.

## Implementatiestappen (elk apart committen, verifiëren per stap)

1. DB-migratie: kolom `email_status` toevoegen (Supabase MCP).
2. `api/surfe.js`: status terugschrijven in de drie takken.
3. `adapters.js`: `email_status` doorgeven in `adaptContact`.
4. `marketing-contacts.jsx`: badge in de rij + "Status Email"-filter in de sidebar.
5. Versie-bump + changelog + tag.

## Buiten scope

- Verrijking via andere providers dan Surfe (Unipile heeft eigen enrich-acties).
- Automatisch opnieuw zoeken; blijft handmatig via de bestaande "Find emails"-knop.
