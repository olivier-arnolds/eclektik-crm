# Accountlijst beweegt live mee met marketing-filters

**Datum:** 2026-06-24
**Componenten:** `src/bd/BDApp.jsx`, `src/bd/marketing-view.jsx`,
`src/bd/marketing-contacts.jsx`, `src/bd/lane-accounts.jsx`

## Doel

In de Marketing-view staan de contactenfilter (links) en het Account-paneel
(rechts, `AccountsLane → AccountsList`) tegelijk in beeld. Terwijl je contacten
filtert, toont de accountlijst rechts alleen de bedrijven van de overgebleven
contacten - zodat je zo'n account direct kunt openen en aanpassen in Account 360.

## Gedrag

- **Alleen in de Marketing-view.** In andere views verandert de accountlijst niet.
- **Alleen bij actief filteren.** Zonder actieve filters toont de accountlijst
  gewoon alles (anders zouden accounts zonder contacten verdwijnen).
  "Actief filteren" = minstens één filter anders dan de standaard:
  tags, account-status, bedrijf/land/stad/industrie/werknemers, has-deal,
  email/linkedin/title/follow/tag yes-no, zoektekst, of Active op iets anders
  dan de default `'yes'`.
- **De accountset** = de unieke `accountId`'s van de gefilterde contacten. Alle
  marketing-filters tellen dus mee, niet alleen de account-velden.
- **Banner** bovenaan de accountlijst: `ⓘ Gefilterd op je marketing-selectie (N)`.
  De eigen zoek/type-filters van de accountlijst blijven werken en verfijnen
  daarbinnen (AND). Geen wis-knop: je wist het door je marketing-filters los te
  laten.
- **Account openen** werkt als vanouds: klik in de lijst → Account 360 (detail)
  in hetzelfde rechterpaneel.

## Dataflow

```
MarketingContacts (filtered contacts + filtersActive)
  └─ onFilteredAccountsChange(idsOrNull)   ← useEffect
       └─ BDApp state: marketingAccountIds
            └─ AccountsLane  (alleen als activeView === 'marketing')
                 └─ AccountsList  → versmalt lijst + banner
```

- **MarketingContacts**: nieuwe prop `onFilteredAccountsChange`. Een `useEffect`
  op `[filtered, filtersActive]` roept de callback met de array unieke
  `accountId`'s (als `filtersActive`), anders `null`. `filtersActive` is een
  `useMemo`-boolean volgens de definitie hierboven.
- **MarketingView**: geeft de prop door van `BDApp` naar `MarketingContacts`.
- **BDApp**: `const [marketingAccountIds, setMarketingAccountIds] = useState(null)`.
  Callback `setMarketingAccountIds`. Aan `AccountsLane` geef je
  `accountFilterIds={activeView === 'marketing' ? marketingAccountIds : null}`.
- **AccountsLane**: nieuwe prop `accountFilterIds`, doorgegeven aan `AccountsList`.
- **AccountsList**: als `accountFilterIds` niet-null → `list = list.filter(a =>
  idSet.has(a.id))` vóór de bestaande naam/type-filters, plus de banner.

## Randgevallen

- Geen oneindige render-loop: de callback zet state in `BDApp`, die naar
  `AccountsList` stroomt (ander component), niet terug naar `MarketingContacts`.
- `filtered` is gememoïseerd, dus de effect-dependency is stabiel.
- Account zonder contacten verschijnt niet zodra er gefilterd wordt - dat is
  precies de bedoeling van deze modus.

## Versie

Minor bump `1.43.0` + changelog + tag `v1.43.0`. Geen DB-wijziging.

## Buiten scope (YAGNI)

- Geen wis-knop in de banner (filters loslaten = wissen).
- Geen koppeling buiten de Marketing-view.
- Geen omgekeerde koppeling (accountlijst → contactenfilter).
