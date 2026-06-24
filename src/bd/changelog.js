// ─────────────────────────────────────────────────────────────────────────
// Changelog — single source of truth for the in-app "Log" tab.
//
// HOW THIS WORKS
//   • Every meaningful change to the app gets ONE entry here, newest first.
//   • Each entry maps 1:1 to a git tag (`gitTag`), which is how you roll back.
//   • The Log tab (src/bd/log-view.jsx) renders this array.
//
// HOW TO ADD AN ENTRY (do this with each change before committing)
//   1. Bump `version` using semver: patch = fix, minor = feature, major = big.
//   2. Set `date` to the real ISO timestamp (UTC) — run `date -u +%Y-%m-%dT%H:%M:%SZ`.
//   3. Fill `title`, `summary`, the `changes[]` detail, and `files[]` touched.
//   4. Keep `gitTag` = `v<version>`; create that tag on the commit (see README/Log).
//   5. Also bump "version" in package.json and the VERSION file to match.
//
// HOW TO ROLL BACK (shown in the Log tab too)
//   • Inspect a version:     git checkout v1.1.0
//   • Undo a version safely:  git revert <commit-of-that-version>
//   • Return to latest:       git checkout main
// ─────────────────────────────────────────────────────────────────────────

export const CURRENT_VERSION = '1.42.2';

export const CHANGELOG = [
  {
    version: '1.42.2',
    date: '2026-06-24T05:39:26Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Marketing - "(leeg)"-optie bij Land/Stad/Industrie/Werknemers',
    summary:
      'De account-filters Land, Stad en Industrie hebben nu een "(leeg)"-optie ' +
      'en Werknemers een "Onbekend"-knop. Daarmee vind je contacten waarvan ' +
      'het gekoppelde account die waarde mist (of helemaal geen account heeft).',
    changes: [
      '"(leeg)"-optie bovenaan de Land/Stad/Industrie-dropdowns, met telling.',
      '"Onbekend"-knop bij Werknemers voor accounts zonder employee_count.',
      'Bedrijf houdt bewust geen leeg-optie (contact zonder account = geen naam).',
    ],
    files: [
      'src/bd/marketing-contacts.jsx',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.42.2',
  },
  {
    version: '1.42.1',
    date: '2026-06-24T05:39:26Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'Marketing - stadfilter toont echte stad i.p.v. straatadres',
    summary:
      'Het Stad-filter in de Marketing-tab toonde het straatadres in plaats ' +
      'van de stadsnaam (bv. London). De adapter-keten overschreef de stad ' +
      'met het adres; nu wordt de echte companies.city gebruikt.',
    changes: [
      'usePipelineData: echte stadsnaam bewaard als cityName (los van het ' +
        'city-veld dat bewust het straatadres toont).',
      'adaptAccount gebruikt cityName voor account.city → marketing-stadfilter.',
    ],
    files: [
      'src/hooks/usePipelineData.js',
      'src/bd/adapters.js',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.42.1',
  },
  {
    version: '1.42.0',
    date: '2026-06-24T05:39:26Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Marketing - filter contacten op account-gegevens',
    summary:
      'In de Marketing-tab kun je contacten nu filteren op kenmerken van het ' +
      'gekoppelde account: bedrijf, land, stad, industrie en aantal ' +
      'werknemers. Bijvoorbeeld: kies land = United Kingdom en je ziet alle ' +
      'contacten waarvan het bedrijf in UK zit.',
    changes: [
      'Nieuw "Account"-blok in de linker filtersidebar van de Contacts-tab.',
      'Bedrijf / Land / Stad / Industrie als zoekbare multi-select dropdowns ' +
        '(meerdere waarden tegelijk, met telling per waarde).',
      'Werknemers-filter met vaste buckets: 1-50, 51-200, 201-1000, ' +
        '1001-5000, 5000+ (meerdere tegelijk aanklikbaar).',
      'AND tussen categorieën, OR binnen een categorie; combineert met alle ' +
        'bestaande filters (tags, status, deals, email/linkedin).',
      'employeeCount toegevoegd aan de account-adapter (uit companies.employee_count).',
    ],
    files: [
      'src/bd/marketing-contacts.jsx',
      'src/bd/adapters.js',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.42.0',
  },
  {
    version: '1.41.16',
    date: '2026-06-18T14:08:35Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'Account 360 - leesbaarheid hero-iconen en linkermarge',
    summary:
      'Het potlood- en chevron-icoon naast de bedrijfsnaam zijn groter voor ' +
      'leesbaarheid. De kerngegevens en secties krijgen meer ruimte aan de ' +
      'linkerkant zodat tekst niet meer onder de inklap-knop of tegen de ' +
      'framerand plakt.',
    changes: [
      'Chevron naast naam 10px -> 13px, potlood-icoon 11px -> 14px.',
      'Inklap-knop versmald (22px -> 16px) zodat content erlangs past.',
      'Horizontale padding account-paneel 14px -> 18px (hero, highlight, sectiekop, sectiebody).',
      'Kerngegevens-grid kreeg eigen horizontale padding van 18px (was 0).',
    ],
    files: [
      'src/bd/lane-accounts.jsx',
      'src/bd/styles.css',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.41.16',
  },
  {
    version: '1.41.15',
    date: '2026-06-18T14:08:35Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Marketing - Tag yes/no filter in linker menu',
    summary:
      'Onder de Active yes/no filter staat nu een Tag yes/no filter. Yes toont ' +
      'alleen contacten met minstens 1 tag, No alleen contacten zonder tags.',
    changes: [
      'Nieuwe tagFilter-state + YesNoFilter "Tag" onder "Active" in marketing-contacts.jsx.',
      'Filtert op of het contact tags heeft (c.tags array niet leeg).',
    ],
    files: [
      'src/bd/marketing-contacts.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.41.15',
  },
  {
    version: '1.41.14',
    date: '2026-06-18T14:08:35Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Account 360 - bedrijfsnaam inline aanpasbaar',
    summary:
      'De bedrijfsnaam in de account-hero (rechter accountview) heeft nu een ' +
      'potlood-knop. Klik erop om de naam ter plekke aan te passen; Enter slaat ' +
      'op, Esc annuleert. Schrijft direct naar companies.name.',
    changes: [
      'Nieuw EditableAccountName-component in lane-accounts.jsx (zelfde patroon als EditableDealTitle).',
      'Hero-naam toont nu een potlood-knop wanneer een account geselecteerd is.',
      'Opslaan via supabase.from("companies").update({ name }) + refetch.',
    ],
    files: [
      'src/bd/lane-accounts.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.41.14',
  },
  {
    version: '1.41.13',
    date: '2026-06-17T13:25:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: ROI-lead met ROI in topic ook weren',
    summary:
      'Een legacy-lead (Moreno Scarfo bij Microsoft) had de ROI-aanduiding in het topic-veld i.p.v. product_line, waardoor de product_line-filter \'m niet ving. Lead-ROI-check verbreed: een lead met topic = "ROI" telt nu ook als ROI en valt uit de Leads-kolom. "ROE"-topics blijven (terecht) staan.',
    changes: [
      'onepager-modal.jsx: isROILead = isROI(product_line) OF topic === "ROI".',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.13',
  },
  {
    version: '1.41.12',
    date: '2026-06-17T13:05:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: alleen leads met bekende account in de Leads-kolom',
    summary:
      'De Leads-kolom toont nu alleen leads waar een account (bedrijf) aan gekoppeld is. Losse leads zonder bedrijf vallen weg. Filter geldt op de leads-tabel én op de qualify/develop-opps. Effect op de leads-tabel: van 33 non-ROI leads blijven er 11 met account over.',
    changes: [
      'onepager-modal.jsx: leadItems gefilterd op een resolvebare company-naam; earlyOpps krijgen dezelfde accountNameOf-check.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.12',
  },
  {
    version: '1.41.11',
    date: '2026-06-17T12:40:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: geen omzetcijfers meer tonen',
    summary:
      'Op verzoek (contractors mogen geen omzet zien): de KPI-tegel "Won revenue 2026" (€408k) is weg, en de New-vs-recurring-sectie toont nu het AANTAL gewonnen deals i.p.v. €-bedragen — bars per jaar (new vs recurring), groei in aantal deals YoY en recurring-share %. De "€717k full year"-referentie is verwijderd. eurK-helper en won-revenue-berekening zijn geschrapt; nergens in de one-pager staat nog een omzetbedrag.',
    changes: [
      'onepager-modal.jsx: KPI-rij 6→5 (Won revenue weg); NewRecurring op deal-count basis (newN/recN) i.p.v. €; eurK + wonRevFull/wonRevCur/wonRevPrevFull verwijderd.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.11',
  },
  {
    version: '1.41.10',
    date: '2026-06-17T12:20:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: ROI ook uit de Leads-kolom',
    summary:
      'ROI-leads worden nu ook uit de Leads-kolom geweerd (eerder bleven die staan). Filter geldt zowel op de leads-tabel (product_line=ROI) als op de qualify/develop-opps. Effect op de leads-tabel: 52 → 33 (19 ROI-leads weg). De hele lifecycle is daarmee ROI-vrij.',
    changes: [
      'onepager-modal.jsx: product_line toegevoegd aan leads-fetch; leadItems en earlyOpps gefilterd op !isROI.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.10',
  },
  {
    version: '1.41.9',
    date: '2026-06-17T12:05:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: employee_count met decimaal/komma correct geparsed',
    summary:
      'De Company size-band parste employee_count door alle niet-cijfers weg te strepen, waardoor "1600.0" (IMC) als 16000 in de band 5.000+ belandde. Nu parseFloat na verwijderen van duizendtal-/spatie-scheiders, zodat "1600.0" → 1.600 (band 1.000–4.999) en "10,000" → 10.000. Lege/tekst-waarden blijven unknown.',
    changes: [
      'onepager-modal.jsx: size-band parse via Math.round(parseFloat(cleaned)) i.p.v. niet-cijfers strippen.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.9',
  },
  {
    version: '1.41.8',
    date: '2026-06-17T11:45:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: ROI-opportunities uit kolommen proposal..sleeping',
    summary:
      'In de lifecycle-kolommen Proposal / Onboarding / Running / Sleeping worden ROI-opportunities (product_line = ROI) nu weggelaten — die sectie toont alleen de niet-ROI (Glint c.s.) projecten. De Leads-kolom houdt bewust álle types, inclusief ROI. Effect: proposal 9→8, running 17→15, sleeping 28→26 (5 ROI-deals weg uit de funnel; onboarding had er geen).',
    changes: [
      'onepager-modal.jsx: isROI-helper (product_line=ROI); proposal/onboarding/active/sleeping-buckets gefilterd op !isROI; leadsBucket ongewijzigd (alle types).',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.8',
  },
  {
    version: '1.41.7',
    date: '2026-06-17T11:30:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'One-pager: lifecycle leads → sleeping (5 kolommen)',
    summary:
      'De projecten-sectie is omgebouwd van proposal→completed (4 kolommen) naar de volledige lifecycle (5 kolommen): Leads → Proposal → Onboarding → Running/Completed → Sleeping. Leads = de leads-tabel (qualify) + qualify/develop-opps (pre-proposal pijplijn). Running/Completed = stage active. Sleeping = stage past + Won (afgerond, revivable). In dit datamodel is een afgerond project gelijk aan sleeping, dus "completed" valt onder Sleeping; de active-kolom toont de lopende/af te ronden projecten.',
    changes: [
      'onepager-modal.jsx: leads-fetch nu rijen (id/full_name/topic/company_id) i.p.v. count; leadsBucket = leads-tabel + qualify/develop-opps; nieuwe sleeping-bucket (past/Won); funnel-grid naar 5 kolommen; footer-regel over early pipeline verwijderd.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.7',
  },
  {
    version: '1.41.6',
    date: '2026-06-17T11:05:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager-knop verplaatst naar War room (weg uit topbar)',
    summary:
      'De "📊 One-pager"-knop staat niet langer in de hoofd-topbar maar in het War room-tabblad, naast de sub-tabs Projects / Customer journey / Client coverage. De modal zelf blijft globaal in BDApp (full-screen overlay), alleen de trigger is verhuisd.',
    changes: [
      'lane-warroom.jsx: One-pager-knop naast de sub-tabs (prop onOpenOnepager).',
      'BDApp.jsx: onOpenOnepager doorgegeven aan WarRoomLane; verwijderd van Topbar.',
      'topbar.jsx: One-pager-knop + prop verwijderd.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/BDApp.jsx', 'src/bd/topbar.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.6',
  },
  {
    version: '1.41.5',
    date: '2026-06-17T10:45:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'One-pager: win rate (alleen proposal-stage verliezen tellen)',
    summary:
      'Win-rate-blok toegevoegd, vergelijkbaar met de Reporting-tab maar met een striktere loss-definitie: alleen verloren deals die tot een proposal kwamen tellen als loss. pipeline_phase (Dynamics-veld) codeert de bereikte fase; 3-Propose of 4-Close = er is een proposal geweest, qualify/develop strandingen tellen niet mee. Geverifieerd tegen de DB: 49 won vs 46 proposal-stage lost = 52% (versus 43% als je alle 64 verliezen meetelt).',
    changes: [
      'onepager-modal.jsx: pipeline_phase aan fetch; reachedProposal = /propose|close/; winRate = won / (won + proposal-stage lost); nieuw WinRate-component (groot %, won/lost-balk, uitleg) tussen KPI-rij en projecten.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.5',
  },
  {
    version: '1.41.4',
    date: '2026-06-17T10:25:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'One-pager: client-profiel (geo / sector / omvang) i.p.v. lost-lijst',
    summary:
      'De "Lost in 2026"-sectie is vervangen door een client-profiel over de bedrijven waar we daadwerkelijk leveren (gewonnen / lopend / onboarding deals): geografie (US vs EMEA), sector-sterkte (industrieën geclusterd naar sectoren, want de ruwe industry-tekst is te versnipperd) en bedrijfsomvang naar werknemersaantal (employee_count, in banden). De "Lost in 2026"-KPI bovenin blijft staan voor funnel-compleetheid. Live berekend over dezelfde set, en geverifieerd tegen de database (35 clients: EMEA 22 / US 13; sectoren Life Sciences 6 · Manufacturing 6 · Consumer & Retail 5 · Technology 5 · Financial 4; omvang overwegend 1.000+ medewerkers).',
    changes: [
      'onepager-modal.jsx: companies-fetch uitgebreid met country/industry/employee_count; client-base = won/active/onboarding; region/sector/size berekend; nieuwe ProfilePanel-component; lost-sectie verwijderd (KPI-tegel blijft).',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.4',
  },
  {
    version: '1.41.3',
    date: '2026-06-17T10:00:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: grotere lettertypes voor presentatie',
    summary:
      'Tekst overal vergroot zodat de schermvullende one-pager goed leesbaar is op afstand tijdens een meeting. Project- en bedrijfsnamen het meest (11→15 / 9→12), plus KPI-cijfers (28→36), kolomkoppen en -tellingen, sectietitels, de new/recurring-balken en de groei-indicator.',
    changes: [
      'onepager-modal.jsx: font-sizes opgehoogd in Kpi, Section, FunnelCol (project/klant), lost-chips, header, footer en NewRecurring; balkhoogte + paddings iets ruimer.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.3',
  },
  {
    version: '1.41.2',
    date: '2026-06-17T09:40:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: eerlijke YTD-vs-YTD omzetvergelijking',
    summary:
      'De new-vs-recurring vergelijking zette een half jaar 2026 (t/m vandaag) tegen een vol jaar 2025, wat structureel een daling toonde (-43%) ongeacht de werkelijke prestatie. Nu worden beide jaren op dezelfde periode geteld: 1 jan t/m dezelfde kalenderdag (MM-DD). De groei-% is daarmee een echte like-for-like vergelijking. Het volledige jaar 2025 staat als losse referentieregel eronder. De "new = eerste gewonnen deal per klant"-bepaling kijkt nog steeds naar de volledige historie; alleen de jaar-aggregatie krijgt de YTD-grens.',
    changes: [
      'onepager-modal.jsx: nrYtdFor(yr) telt won-deals t/m current_date MM-DD per jaar; groei-% = YTD vs YTD; rij-labels "2025 YTD"/"2026 YTD"; sectietitel + voetnoot tonen de YTD-periode; volledig jaar 2025 als referentie.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.2',
  },
  {
    version: '1.41.1',
    date: '2026-06-17T09:15:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'One-pager: volledig Engels + schermvullend',
    summary:
      'De one-pager is nu schermvullend (full-viewport modal i.p.v. een gecentreerde kaart) en alle user-facing tekst is naar het Engels vertaald, want de contractors spreken alleen Engels. Bedragen gebruiken nu en-US duizendtal-notatie en de datum een en-GB-formaat. Inhoud en cijfers ongewijzigd.',
    changes: [
      'onepager-modal.jsx: modal full-screen (100vw/100vh, borderRadius 0), body gecentreerd met max-breedte 1400px; alle labels/secties/knoppen vertaald naar Engels; eurK → en-US, datum → en-GB.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.1',
  },
  {
    version: '1.41.0',
    date: '2026-06-17T08:30:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'One-pager: live overzicht 2026 (knop in topbar)',
    summary:
      'Nieuwe "📊 One-pager"-knop rechts in de topbar opent een full-screen overzicht, bedoeld voor een informele meeting (bv. met contractors). Leest live uit Supabase via de ingelogde sessie en toont: kerncijfers 2026 (afgerond / nu lopend / in onboarding / in offerte / gevallen + totale gewonnen omzet), de delivery-funnel met de projectnamen (klanten) per fase, en new business vs recurring business 2025 → 2026 als omzetvergelijking met groei-%. Alleen totaalbedragen, geen per-deal omzet. Definities zijn 1-op-1 met de Reporting-tab (won = status Won, omzet = COALESCE(actual_revenue, est_revenue), jaar uit actual_close_date || close_date, new = eerste gewonnen deal per klant).',
    changes: [
      'src/bd/onepager-modal.jsx: nieuw component — eigen focus-fetch (opportunities + companies + leads-count), funnel-snapshot + new/recurring over alle product-lijnen, presentatie-styling, Print/PDF-knop.',
      'topbar.jsx: nieuwe One-pager-knop in topbar-right (prop onOpenOnepager).',
      'BDApp.jsx: showOnepager-state + OnepagerModal in de globale-modal-set.',
    ],
    files: ['src/bd/onepager-modal.jsx', 'src/bd/topbar.jsx', 'src/bd/BDApp.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.41.0',
  },
  {
    version: '1.40.7',
    date: '2026-06-12T19:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Deal panel weighted value + funnel close-period filter',
    summary:
      'Deal panel now shows a Weighted line under value/probability (value × probability, e.g. €142k · 60% of €236k). Funnel gets a "Close" period filter for the current year: All / Q1 / Q2 / Q3 / Q4 / Overdue, filtering deals by their close date. Overdue = open deals whose expected close has already passed - the chase list.',
    changes: [
      'inline-details.jsx: InlineDealDetail shows probability-weighted value.',
      'lane-funnel.jsx: close-period filter — All / Q1 / Q2 / Q3 / Q4 (current calendar year) / Overdue.',
      'lane-accounts.jsx: deal-row headers (Open/Active/Sleeping) show probability + expected close.',
      'lane-funnel.jsx: deal cards now show expected close next to probability.',
      'usePipelineData.js: open deals now use est_close_date (expected close) as their close date, so editing it updates cards/rows/filter (a stale close_date no longer masks the change).',
      'lane-reporting.jsx: hover tips on Won-by-quarter and New-vs-recurring bars list the client names + deal size in EUR for that quarter/segment.',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/lane-funnel.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.7',
  },
  {
    version: '1.40.6',
    date: '2026-06-12T18:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Deal panel: show the expected close date you entered',
    summary:
      'On an open opportunity, the "Close date" field saved your input to est_close_date but displayed close_date first, so a stale close_date hid the date you typed. Relabelled it "Expected close" for opportunities and it now shows/saves est_close_date (leads still use close_date). No effect on funnel or reporting placement.',
    changes: [
      'inline-details.jsx: opportunity close-date field reads + writes est_close_date, labelled "Expected close".',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.6',
  },
  {
    version: '1.40.5',
    date: '2026-06-12T16:40:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'chore',
    title: 'Enrich response: duidelijker veld-namen',
    summary:
      'Response van find-contact-linkedin had used_account.owner_email naast owner_name wat verwarrend leest wanneer cascade de owner overslaat (Microsoft = Marco, maar Yarmillas account vond Edwin). Hernoemd naar company_owner (top-level, naam van de bedrijfs-owner) en used_linkedin_account.email (de account die uiteindelijk de hit had). Per-account-tried entries hebben nu ook gewoon email ipv owner_email.',
    changes: [
      'api/unipile.js: used_account → used_linkedin_account; owner_email → email (op zowel used_linkedin_account als accounts_tried entries); owner_name → company_owner (top-level).',
    ],
    files: ['api/unipile.js', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.5',
  },
  {
    version: '1.40.4',
    date: '2026-06-12T16:30:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'Vercel build fix: unescaped apostrof in v1.40.3 changelog-entry',
    summary:
      'De Nederlandse contractie in de v1.40.3 summary sloot de JS-string vroegtijdig waardoor Vercel build faalde met "Expected , or }". Apostrof verwijderd, build draait weer. Geen functionele wijziging — de cascade-fallback uit v1.40.3 zit hier dus ook in en is voor het eerst live.',
    changes: [
      'src/bd/changelog.js: summary van v1.40.3 herschreven zonder de string-brekende apostrof.',
    ],
    files: ['src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.4',
  },
  {
    version: '1.40.3',
    date: '2026-06-12T16:20:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Enrich-via-LinkedIn cascadeert naar collega-accounts bij 0 hits',
    summary:
      'LinkedIn-search is netwerk-afhankelijk: Marco vindt Edwin niet als die geen 1st-degree connection is, terwijl Olivier hem wel ziet. Nu probeert find-contact-linkedin eerst de owner-LinkedIn-account met alle 3 attempts, en pas bij 0 hits over de hele linie valt de search terug op de andere gekoppelde LinkedIn-accounts in volgorde. Eerste account die hits geeft wint. Geen extra API-calls in het normale geval (eerste account werkt), wel hogere recall in randgevallen. Response bevat nu accounts_tried met per-account-per-attempt count voor debug, plus used_account met de account die uiteindelijk de hit had.',
    changes: [
      'api/unipile.js (find-contact-linkedin): accountChain = [owner, ...others] cascade; per account doorlopen we alle 3 attempts vóór we naar volgende account gaan; workingAccount tracked; accounts_tried in no-results response; used_account in alle response-paden.',
    ],
    files: ['api/unipile.js', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.3',
  },
  {
    version: '1.40.2',
    date: '2026-06-12T16:00:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'Enrich-via-LinkedIn: gebruik LinkedIn-account van account-owner',
    summary:
      'De Enrich-via-LinkedIn server-flow pakte tot nu toe altijd de eerste LinkedIn-account die Unipile teruggaf. Dat hoefde niet die van de juiste owner te zijn — voor een Microsoft-contact owned by Marco werd soms Yarmilla\'s of Olivier\'s LinkedIn gebruikt, en die geeft andere search-resultaten (1st-degree connections, geo-bias, rate limits). Resultaat: "no-results" terwijl Marco\'s LinkedIn de match wel had. Nu wordt op basis van companies.owner de juiste Unipile-account gekozen (Marco / Yarmilla / Olivier name → email → account_id). Fallback: eerste LinkedIn-account als owner onbekend. Response bevat voortaan used_account.owner_email zodat je in debug kan zien welke account gebruikt is.',
    changes: [
      'api/unipile.js (find-contact-linkedin): companies.owner toegevoegd aan contact-fetch; NAME_TO_EMAIL + UNIPILE_BY_EMAIL inline mapping bepaalt voorkeurs-account; fallback naar eerste LinkedIn-account; used_account in alle response-paden.',
    ],
    files: ['api/unipile.js', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.2',
  },
  {
    version: '1.40.1',
    date: '2026-06-12T15:25:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'LinkedIn-search uit contact-detail: company-naam ipv slug',
    summary:
      'De "Search this person on LinkedIn" link in de contact-detail bouwde de zoekstring als full_name + company-slug (uit companies.linkedin_url). Voor Microsoft Switzerland werd dat "Kahina Hanis hubswiss" — niet wat je verwacht. Nu altijd gewoon full_name + company-naam, dus "Kahina Hanis Microsoft Switzerland".',
    changes: [
      'inline-details.jsx: linkedinSearch() — slug-extractie weggehaald, gebruikt nu altijd companies.name (met fallback company_name).',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.1',
  },
  {
    version: '1.40.0',
    date: '2026-06-12T15:00:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Contact last-updated zichtbaar + sorteer-toggle in Marketing',
    summary:
      'De DB houdt al automatisch contacts.updated_at bij (trg_contacts_updated_at trigger). Nu maken we het ook zichtbaar: (1) klein mono-relatief tijdje "· 2d" achter de contactnaam in de Marketing-lijst met de volle datum als hover-tooltip; (2) "Updated X ago" in de contact-detail popup header, met de created-datum erachter als ze niet gelijk zijn; (3) sorteer-toggle "Sort: Account | Recent" naast Select all — Account is de oude default (company A-Z + naam), Recent sorteert op meest recent geüpdate eerst. Nieuw helper relativeTime() in lib/constants centraliseert de "5m / 3h / 2d / 6w" formatter.',
    changes: [
      'lib/constants.js: relativeTime(input) helper voor "5m / 3h / 2d / 6w / 3mo / 2y" formatter.',
      'adapters.js: updatedAt + createdAt (camelCase) doorgegeven via pass-2 adaptContact.',
      'marketing-contacts.jsx: relatief tijd-chipje achter contactnaam; sortMode-state (account|updated) + sorteer-toggle naast Select all.',
      'inline-details.jsx: contact-detail popup header toont "Updated X ago" met optioneel · created datum.',
    ],
    files: ['src/lib/constants.js', 'src/bd/adapters.js', 'src/bd/marketing-contacts.jsx', 'src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.40.0',
  },
  {
    version: '1.39.12',
    date: '2026-06-12T14:45:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'fix',
    title: 'Clear-knop × in Marketing-zoekbalk naar links verplaatst',
    summary:
      'De × in de Marketing-zoekbalk stond rechts; nu links — vóór het zoekwoord. Padding van de input is gespiegeld zodat de tekst niet over de knop loopt.',
    changes: [
      'marketing-contacts.jsx: × button van right: 8 naar left: 8; input padding-left ipv padding-right wanneer searchText gevuld is.',
    ],
    files: ['src/bd/marketing-contacts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.12',
  },
  {
    version: '1.39.11',
    date: '2026-06-12T14:35:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Clear-knop (×) in Marketing-zoekbalk',
    summary:
      'Kleine × verschijnt rechts in de Marketing-zoekbalk zodra je iets typt. Klik = zoektekst meteen leeg, lijst toont weer alle contacten (rekening houdend met de actieve sidebar-filters). Geen × als de balk leeg is.',
    changes: [
      'marketing-contacts.jsx: search-input in een relative container; conditionele × button rechts wanneer searchText niet leeg is.',
    ],
    files: ['src/bd/marketing-contacts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.11',
  },
  {
    version: '1.39.10',
    date: '2026-06-12T14:25:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Reactivate-knop pakt ook former=true contacten',
    summary:
      'De Reactivate-toggle in de contact-detail popup bekeek alleen stage=Inactive — contacten die via Account 360 → mark former (former=true, stage blijft Active) waren afgevoerd toonden nog steeds Inactivate. Nu telt former=true ook als "inactief", dus Sophia Driess et al. tonen Reactivate. Klikken zet stage=Active, wist inactive_reason + inactivated_at, en zet former=false — dus 1 enkele plek om vanuit Marketing iemand weer actief te maken.',
    changes: [
      'inline-details.jsx: isInactive folde stage=Inactive OF former=true; Reactivate-handler reset alle drie de inactiviteits-velden.',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.10',
  },
  {
    version: '1.39.9',
    date: '2026-06-12T14:10:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Inactivate-knop is nu een toggle: ook reactiveren mogelijk',
    summary:
      'De rode "Inactivate"-knop onderaan een contact-detail werkt nu twee kanten op. Voor een actief contact toont hij Inactivate (rood, archive-icoon) en vraagt om een reden zoals voorheen. Voor een inactief contact (stage=Inactive) toont hij Reactivate (accent-kleur, check-icoon) met als hover-tooltip de oude inactive_reason als die er was. Reactivate zet stage terug naar Active en wist inactive_reason + inactivated_at. De "mark former"-toggle in Account 360 blijft een aparte mechanism (per account-link).',
    changes: [
      'inline-details.jsx: rode Inactivate-knop omgebouwd naar conditionele Inactivate/Reactivate toggle op basis van row.stage.',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.9',
  },
  {
    version: '1.39.8',
    date: '2026-06-12T13:50:00Z',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Inactivate-reden zichtbaar als chip in Marketing-lijst',
    summary:
      'In de Marketing → Contacts lijst staat nu naast de naam van elke inactieve contact een klein grijs chipje met de reden van inactivatie (bv. "duplicate", "left company"). Voor contacten die alleen via "mark former" zijn afgevoerd (former=true zonder stage=Inactive) toont het chipje "former". De inactive_reason wordt nu ook door de adapter-keten geleid (adapters.adaptContact) zodat het veld doorkomt in de Marketing-prop.',
    changes: [
      'adapters.js: inactive_reason doorgeven via pass-2 adaptContact.',
      'marketing-contacts.jsx: grijze chip naast contactnaam zodra c.isFormer, met reden of fallback "former".',
    ],
    files: ['src/bd/adapters.js', 'src/bd/marketing-contacts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.8',
  },
  {
    version: '1.39.7',
    date: '2026-06-10T16:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey rebuilt on CRM deals (single source of truth)',
    summary:
      'The journey board now reads straight from CRM deals instead of the glint_delivery project sheet. It shows every Glint deal that is onboarding, active or sleeping (Won/past) as a card with client + deal name + deal # (D-####). Project numbers (P-####) are gone, from both the board and the deal panel. Kept the People Science green/red dot and the contractor first names. Dragging a card between lanes now saves on the deal itself (opportunities.journey_stage) and survives reloads; default lane derives from the deal stage (onboarding→Configure, active→Survey live, sleeping→Enablement) until you hand-place it.',
    changes: [
      'opportunities: new journey_stage column (manual lane placement per deal).',
      'usePipelineData + adapters: thread journeyStage onto deals.',
      'lane-warroom.jsx: JourneyBoard rebuilt deal-based (onboarding/active/sleeping Glint deals); card = client + deal name + D-####, PS dot, contractor first names; drag saved to opportunities.journey_stage.',
      'inline-details.jsx + journey cards: removed P-#### project numbers.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/inline-details.jsx', 'src/bd/adapters.js', 'src/hooks/usePipelineData.js', 'sql/schema_opportunities_journey_stage_2026-06-10.sql', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.7',
  },
  {
    version: '1.39.6',
    date: '2026-06-10T15:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey ↔ deals: deal names on cards + P-#### shown on the deal',
    summary:
      'Tightened the link between journey projects and CRM deals, both directions. Journey cards now show the CRM deal name (the same name as in the 360) instead of the raw sheet project name - resolved via deal_no. And the deal panel in the 360 now shows its linked journey project id(s) (P-####). Ran a full consistency check across all 39 projects vs their deals and companies: every project links to a valid deal and the project company matches the deal company - zero mismatches. Note: most projects deals are stage past/Won (i.e. "sleeping" in the funnel), so they disappear from the pipeline view - the journey board is the place that always shows all projects regardless of deal stage.',
    changes: [
      'lane-warroom.jsx: journey card shows the linked deal name (dealByNo map by deal_no); falls back to the sheet name if no deal match.',
      'inline-details.jsx: deal panel lists its linked journey project id(s) P-#### (fetched from glint_delivery by deal_no).',
      'Consistency check: 39/39 projects link to a valid deal with matching company - no orphans or mismatches.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.6',
  },
  {
    version: '1.39.5',
    date: '2026-06-10T14:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Stop edits from resetting the view; fixes journey-tab jump + 360 product-line save',
    summary:
      'Editing a field in Account 360 (or anywhere) triggered a data refetch, and BDApp showed a full-screen "Loading…" on every refetch - which unmounted the current view. That reset the War-room tab back to Projects and made changes like picking a product line in the 360 appear not to save (the view re-mounted before the refetch settled). Now the loading screen only shows on the very first load; later refetches keep the current view and tab mounted, so edits stick and you stay where you were. Also removed a redundant PIMCO Prime Real Estate Graveyard card (P-0029) that only existed because of the earlier IMC mislink.',
    changes: [
      'BDApp.jsx: loading screen gated to first load only (loadedOnceRef) - background refetches no longer blank/unmount the view.',
      'glint_delivery: deleted graveyard card P-0029 (PIMCO Prime, false duplicate of the real project P-0028); backup _dq_backup_glint_delivery_p0029_20260610.',
    ],
    files: ['src/bd/BDApp.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.5',
  },
  {
    version: '1.39.4',
    date: '2026-06-10T14:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Fix: PIMCO Prime Real Estate projects mislinked to IMC',
    summary:
      'The 3 "PIMCO Prima Real Estate" journey projects pointed at IMC\'s account because the sync matched the substring "imc" inside "pIMCo". Fixed the company matcher in glint-sync (no short reverse-substring matches; a name must be >= 5 chars to match inside a longer client name) plus an explicit alias for the sheet\'s "Prima" vs company "Prime" typo, so a re-sync can no longer re-break it. Repointed the 3 rows to PIMCO Prime Real Estate. Checked all 40 journey links - the rest were correct.',
    changes: [
      'api/glint-sync.js: matchCompany hardened - alias map + min-length guards to stop "IMC" matching inside "PIMCO".',
      'glint_delivery: P-0026/27/28 repointed to PIMCO Prime Real Estate (backup _dq_backup_glint_delivery_20260610).',
    ],
    files: ['api/glint-sync.js', 'sql/data_glint_delivery_pimco_relink_2026-06-10.sql', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.4',
  },
  {
    version: '1.39.3',
    date: '2026-06-10T13:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'tweak',
    title: 'Customer journey: Client Accountability Review as its own column',
    summary:
      'Moved the Client Accountability Review lane out of the Enablement column into its own standalone column, positioned between Enablement & embedding and Off Rails.',
    changes: [
      'lane-warroom.jsx: JOURNEY_COLUMNS now [prep] · [configure/launch/live] · [rollout/review] · [embed] · [car] · [offrails/graveyard].',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.3',
  },
  {
    version: '1.39.2',
    date: '2026-06-10T13:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey: reflow lanes + new Client Accountability Review lane',
    summary:
      'Reordered the journey board to follow the cadence vertically: Survey live now sits under Launch (under Configure & QA), and Insights review & action sits under Close & results rollout. Added a new PS lane "Client Accountability Review" after Enablement & embedding - the quarterly PS check-in on how things are moving and whether managers acted on their results (and how often they checked in). New lane starts empty; drag projects in and the placement persists.',
    changes: [
      'lane-warroom.jsx: new JOURNEY phase "car" (Client Accountability Review, PS lead, every quarter).',
      'lane-warroom.jsx: JOURNEY_COLUMNS regrouped to [prep] · [configure/launch/live] · [rollout/review] · [embed/car] · [offrails/graveyard].',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.2',
  },
  {
    version: '1.39.1',
    date: '2026-06-10T10:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'fix',
    title: 'Security follow-up: webhook-secret guard op unipile-webhook',
    summary:
      'v1.39.0 dekte alle /api endpoints af behalve unipile-webhook — die '
      + 'bleef open omdat Unipile dashboard geen custom headers toestaat. '
      + 'Toegevoegd: requireWebhookSecret helper in api/_lib/guard.js die '
      + 'checkt op een UNIPILE_WEBHOOK_SECRET match in EITHER de '
      + 'x-webhook-secret header OF de ?secret=... query-param. URL-fallback '
      + 'is bewust afgewogen tradeoff voor low-traffic internal endpoints '
      + '(Vercel logt URLs incl. secret). Olivier heeft een nieuwe webhook '
      + 'eclectik-crm-secured in Unipile aangemaakt met de secret in de '
      + 'request URL; de oude eclectik-crm webhook gaat 401 krijgen en moet '
      + 'handmatig worden verwijderd.',
    changes: [
      'api/_lib/guard.js: nieuwe requireWebhookSecret(req, res, envName) — header OR query-param match tegen genoemde env var.',
      'api/unipile-webhook.js: vereist nu UNIPILE_WEBHOOK_SECRET via x-webhook-secret header of ?secret=... in URL.',
      'Vereist in Vercel env: UNIPILE_WEBHOOK_SECRET (random hex). Olivier heeft die gezet.',
      'Vereist in Unipile dashboard: nieuwe webhook met request_url eindigend op ?secret=<hex>. Olivier heeft eclectik-crm-secured aangemaakt.',
      'Cleanup: tijdelijke scripts/unipile-webhook-fix.mjs verwijderd (was helper voor het uitzoeken van Unipile-API-toegang, niet meer nodig).',
    ],
    files: [
      'api/_lib/guard.js',
      'api/unipile-webhook.js',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.39.1',
  },
  {
    version: '1.39.0',
    date: '2026-06-09T22:13:29Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Security: auth guard on all serverless API endpoints',
    summary:
      'Closes the highest-risk audit finding: 17 of the 19 /api endpoints ran with the Supabase service key (bypasses RLS) and accepted requests from anyone who knew the URL — including marketing-send (mass email), lusha (paid lookups), unipile (LinkedIn write actions), glint-sync (overwrites glint_delivery) and account-summary (client data + Anthropic spend). New shared guard in api/_lib/guard.js: requireUser verifies the caller\'s Supabase session JWT via auth.getUser; requireCron verifies Vercel cron invocations (CRON_SECRET if set, else the platform x-vercel-cron header); requireQueueSecret supports Claude\'s feature-request automation. Every frontend /api call (34 call sites across 22 files) now goes through src/lib/apiFetch.js, which attaches the session token. Webhooks keep their own validation (marketing-webhook: Svix signature; unipile-webhook: unchanged). Recommended follow-up in Vercel env: set CRON_SECRET (Vercel then signs cron calls automatically) and optionally FEATURE_QUEUE_SECRET for the Claude feature-pull workflow — without the latter, next-feature-request now requires a logged-in user (Claude can use the Supabase MCP instead).',
    changes: [
      'api/_lib/guard.js: requireUser (Supabase JWT), requireCron (CRON_SECRET / x-vercel-cron), requireQueueSecret.',
      '12 user-facing endpoints guarded with requireUser; 3 cron endpoints with requireCron; admin-weekly-export dual (cron path vs manual Run-now); next-feature-request accepts queue secret OR user JWT.',
      'src/lib/apiFetch.js: fetch wrapper that attaches the session access token; all 34 frontend /api call sites migrated (incl. multi-line fetches in useLinkedInMessages/useLinkedInPosts).',
      'CLAUDE.md §5: documents the guard + recommended CRON_SECRET / FEATURE_QUEUE_SECRET env vars.',
    ],
    files: ['api/_lib/guard.js', 'src/lib/apiFetch.js', 'api/*.js (17 endpoints)', 'src (22 files, 34 call sites)', 'CLAUDE.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.39.0',
  },
  {
    version: '1.38.0',
    date: '2026-06-09T22:02:16Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Clickthrough round 2: no more stale cross-view context + predictable search dismiss',
    summary:
      'Two navigation-predictability fixes from the live clickthrough. (1) Switching views now resets the cross-view selection state (right-pane context, selected deal/comm, and the account scope). Previously a deal picked in Funnel kept the Account 360 pinned to that account across War room, Tasks, Meetings AND quietly left a "Filtered by account" scope on Comms — if you missed the banner, your inbox looked nearly empty. The initial mount is skipped so a restored session keeps its state. (2) Search: Esc now clears the whole search (text + panel) instead of leaving orphaned text that looked active but showed no results, and focusing the search field reopens the results panel when there is still a query (e.g. after dismissing with the ✕ button, which keeps the text).',
    changes: [
      'BDApp.jsx: view-switch effect resets rightContext / accountScope / selectedDeal / selectedComm (skips initial mount); passes onSearchFocus to Topbar.',
      'search-results-panel.jsx: Esc calls onClearSearch (text + panel) instead of onClose (panel only).',
      'topbar.jsx: search input onFocus reopens the results panel via onSearchFocus.',
    ],
    files: ['src/bd/BDApp.jsx', 'src/bd/search-results-panel.jsx', 'src/bd/topbar.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.38.0',
  },
  {
    version: '1.37.0',
    date: '2026-06-09T21:55:53Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Live-clickthrough fix round: Open deal button, Esc closes modals, calendar MS notice, column totals, contact row cleanup',
    summary:
      'Five fixes from the first interactive clickthrough of the live app (driven via the Chrome connection). (1) The "Open deal" button in the Account 360 deal card was a silent no-op when the deal\'s account was visible — it now always opens the deal modal; explicit click = explicit intent. (2) Esc now closes the topmost open modal, app-wide, via one global listener that clicks the top .modal-backdrop (every modal already closes on backdrop click, so behavior-equivalent and future-proof). (3) The Calendar shows a "Microsoft is not connected" notice + Connect button when the Graph token is missing — previously the week just rendered empty as if you had no meetings (Comms already had this empty-state; Calendar now matches). (4) Funnel column totals under €1k display as "€<1k" instead of e.g. "€168", which read as 168k next to the other columns\' k-format. (5) The per-contact "former?" button read as a data-quality question on every row — renamed to "mark former" and only revealed on row hover (.hover-action); "↻ restore" stays visible on struck-through former contacts.',
    changes: [
      'BDApp.jsx: dedicated onOpenDeal handler for Account 360 (always opens modal) + global Esc-closes-topmost-modal listener.',
      'lane-calendar.jsx: "Microsoft is not connected" notice + Connect button in the lane header when hasGraphToken is false.',
      'lane-funnel.jsx: swimlane totals under €1k render as "€<1k".',
      'lane-accounts.jsx + styles.css: "former?" → "mark former", hover-revealed via .contact-card .hover-action.',
    ],
    files: ['src/bd/BDApp.jsx', 'src/bd/lane-calendar.jsx', 'src/bd/lane-funnel.jsx', 'src/bd/lane-accounts.jsx', 'src/bd/styles.css', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.37.0',
  },
  {
    version: '1.36.0',
    date: '2026-06-09T21:28:01Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Data safety: atomic lead→opp promotion + fetch-limit warning banner',
    summary:
      'Two data-integrity fixes from the UX/architecture audit. (1) Lead→opportunity promotion is now ONE transactional Postgres function (promote_lead_to_opportunity, applied as migration promote_lead_to_opportunity_atomic) instead of four sequential best-effort writes — a failure halfway can no longer orphan child rows or delete a lead without its opportunity existing. Bonus: the lead\'s D-#### deal_no now carries over, so a deal keeps its number across promotion. Round-trip tested against production with throwaway data (insert lead + task → promote → verify opp/reparent/delete → clean up). (2) usePipelineData now reports when a table returns exactly its fetch cap (FETCH_LIMITS), and BDApp shows a dismissible warning banner naming the truncated tables — previously rows beyond the cap (e.g. >500 leads) silently vanished from the UI.',
    changes: [
      'sql/schema_promote_lead_atomic_2026-06-09.sql: new promote_lead_to_opportunity(p_lead_id, p_updates) function — atomic insert+reparent+delete, deal_no carry-over, safe text→uuid cast for parent_contact.',
      'src/bd/lead-promote.js: now a single supabase.rpc() call; stageUpdates stays the single source of truth for stage fields.',
      'src/hooks/usePipelineData.js: FETCH_LIMITS constant + truncation detection exposed as `truncated`.',
      'src/bd/useBDData.js: passes `truncated` through.',
      'src/bd/BDApp.jsx: dismissible warning banner when a fetch cap is hit.',
      'CLAUDE.md: §8 transactions-gotcha updated — multi-table writes go through rpc now.',
    ],
    files: ['sql/schema_promote_lead_atomic_2026-06-09.sql', 'src/bd/lead-promote.js', 'src/hooks/usePipelineData.js', 'src/bd/useBDData.js', 'src/bd/BDApp.jsx', 'CLAUDE.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.36.0',
  },
  {
    version: '1.35.0',
    date: '2026-06-09T20:55:18Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'First automated test suite: vitest over the adapter business logic',
    summary:
      'Adds vitest (dev-only, no runtime impact) and an 18-test suite over src/bd/adapters.js — the layer where stage encoding, owner mapping and drag-drop DB writes live, and where past bugs (first-name owner rows hiding tasks, sleeping-stage deals disappearing) originated. Covers ownerIdFromName (full names, first-name legacy rows, initials fallback), adaptDeal\'s 7-column stage derivation (past+Won → sleeping, past+Lost → close, sub_status fallback, leads/opportunities table mapping), stageUpdates for all 7 drop targets on both tables (incl. the "leads have no stage column" contract), and the stage-model invariants (column order, win probabilities). Run with `npm test`. Also corrects a stale CLAUDE.md §3 note: the per-view Topbar/modal duplication was already collapsed into one shell back in v1.2.0.',
    changes: [
      'package.json: vitest devDependency + `npm test` script (vitest run).',
      'src/bd/adapters.test.js: 18 tests over ownerIdFromName, adaptDeal stage derivation, stageUpdates, STAGES/STAGE_PROBABILITY invariants.',
      'CLAUDE.md: §3 note about per-view Topbar/modal duplication updated to reflect the unified shell (since v1.2.0).',
    ],
    files: ['package.json', 'package-lock.json', 'src/bd/adapters.test.js', 'CLAUDE.md', 'src/bd/changelog.js', 'VERSION'],
    gitTag: 'v1.35.0',
  },
  {
    version: '1.34.6',
    date: '2026-06-09T17:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'QA round 2: error boundary, no-hang data load, drag rollback + full-app audit',
    summary:
      'Second audit pass over the modules round 1 skipped (War room, Calendar, Playbooks, app shell, auth, all /api endpoints, responsive, accessibility, performance). Fixes: a top-level ErrorBoundary so one crash no longer blanks the whole app; usePipelineData no longer hangs on "Loading…" if a query fails; journey drag now rolls back if the DB save fails; calendar task drag surfaces errors instead of failing silently; journey search shows a clear no-results message. Bigger items (unauthenticated /api endpoints, no mobile/responsive support, O(N²) adapters, accessibility) are documented in docs/ux-audit-2026-06-09.md for scheduling - they are projects, not quick wins.',
    changes: [
      'main.jsx: top-level ErrorBoundary with reload fallback.',
      'usePipelineData.js: try/finally so loading always clears on fetch failure.',
      'lane-warroom.jsx: moveJourney rolls back the card on a failed save; journey search empty-state.',
      'lane-calendar.jsx: moveTaskToDate surfaces save errors.',
      'docs/ux-audit-2026-06-09.md: expanded to full-coverage findings + prioritized roadmap.',
    ],
    files: ['src/main.jsx', 'src/hooks/usePipelineData.js', 'src/bd/lane-warroom.jsx', 'src/bd/lane-calendar.jsx', 'docs/ux-audit-2026-06-09.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.34.6',
  },
  {
    version: '1.34.5',
    date: '2026-06-09T16:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Reporting: Industries breakdown now split by market tier (SMB / Mid-Market / Enterprise)',
    summary:
      'Each Industries · clients vs prospects bar is now segmented by the classic three-tier market division: SMB (1-100 employees / <$50M), Mid-Market (100-1,000 / $50M-$1B) and Enterprise (1,000+ / >$1B). Tier is derived from company headcount (primary, cleanest data) with annual revenue as a fallback (handles both band strings like "50-100M" and raw dollar figures). Segment widths show the count per tier; the expanded account list tags each company with its tier. Added a tier legend.',
    changes: [
      'industry-breakdown.jsx: tierOf() classifier (headcount, revenue fallback); bars rendered as stacked tier segments; tier legend; tier tag on each account chip.',
      'lane-reporting.jsx: companies query now also selects employee_count + annual_revenue.',
    ],
    files: ['src/bd/industry-breakdown.jsx', 'src/bd/lane-reporting.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.34.5',
  },
  {
    version: '1.34.4',
    date: '2026-06-09T16:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'UX/QA pass: SEER tagging inline, account scroll, Microsoft auto-load + edge-state fixes',
    summary:
      'Static audit of the whole front-end plus fixes for the three reported issues. (1) The inline deal panel now has a Product line picker (Glint/ROI/Seer/Insights/Other) - previously Seer could only be set in the rarely-opened modal. (2) The account core-details block (incl. industry dropdown) moved out of the fixed hero into the scroll area, so company detail scrolls properly. (3) Graph data now auto-loads the moment the Microsoft token arrives (re-runs on hasGraphToken), removing the many-clicks-after-connect friction. Also: Tasks tab no longer hangs on a failed load (added .catch), and failed Teams/LinkedIn threads now show a clear error instead of a silent empty state. Full findings + recommended next steps in docs/ux-audit-2026-06-09.md.',
    changes: [
      'inline-details.jsx: Product line dropdown added to InlineDealDetail (preserves non-standard existing values).',
      'lane-accounts.jsx: moved expandable account core-details from the clipped hero into .acc-scroll.',
      'BDApp.jsx: fetchGraphData re-runs when hasGraphToken flips true (auto-load after connect).',
      'tasks-view.jsx: added .catch so a failed tasks fetch always clears the loading state.',
      'lane-comms.jsx: visible error state for failed Teams/LinkedIn thread fetches (was a silent empty).',
      'docs/ux-audit-2026-06-09.md: full prioritized audit report.',
    ],
    files: [
      'src/bd/inline-details.jsx',
      'src/bd/lane-accounts.jsx',
      'src/bd/BDApp.jsx',
      'src/bd/tasks-view.jsx',
      'src/bd/lane-comms.jsx',
      'docs/ux-audit-2026-06-09.md',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.34.4',
  },
  {
    version: '1.34.3',
    date: '2026-06-09T15:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey: contractor first names on the cards + search box',
    summary:
      'Each journey card now shows the first names of the contractors on the assignment, de-duplicated, under the P-#### · D-#### line and alongside the People Science dot. Sheet projects use their CS/PS owners; the Graveyard/owner-less cards fall back to the Eclektik account team (account_links, @eclectik.co only, so client/Microsoft contacts are never shown). 39 of 40 cards now carry names - only Eppendorf has no Eclektik consultant linked to its account. Added a live search box that filters cards by client name OR contractor (and project/deal number) - e.g. "paul" shows every card Paul is on, "war" shows Warburtons.',
    changes: [
      'lane-warroom.jsx: firstNameOf() helper; cards render de-duplicated contractor first names from cs_owner / ps_owner / other_contractors.',
      'lane-warroom.jsx: live search box filtering on client name, contractors, project_name, P-#### and D-####; lane counts follow the filter.',
      'glint_delivery: backfilled other_contractors for 13 owner-less cards from the Eclektik account team (backup _dq_backup_glint_delivery_20260609f).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'sql/data_glint_delivery_contractor_fallback_2026-06-09.sql', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.34.3',
  },
  {
    version: '1.34.2',
    date: '2026-06-09T14:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Journey board: 7-column layout + project id (P-####) linked to funnel deal (D-####)',
    summary:
      'Reflowed the journey lanes into 7 columns (Launch stacked under Configure & QA, Graveyard under Off Rails) so the board fills the screen width instead of scrolling sideways. Every project now carries its own unique project id (P-####, like A-#### / D-####) plus its linked funnel deal number (D-####) for consistency with the sales funnel; cards show client name + project name + P-#### · D-#### + the People Science dot, and the sheet-derived milestone and contractor initials were removed. Also fixed 3 PIMCO Prime Real Estate projects that were mislinked to IMC company record.',
    changes: [
      'glint_delivery: new project_no (P-#### sequence + before-insert trigger) and deal_no (linked funnel deal), backfilled for all 40 rows (backups _dq_backup_glint_delivery_20260609d / _e).',
      'glint_delivery: repointed 3 PIMCO Prime Real Estate rows from IMC company to the correct company.',
      'lane-warroom.jsx: JOURNEY_COLUMNS groups Configure+Launch and OffRails+Graveyard; cards show P-#### · D-####, keep the PS dot, drop initials + milestone.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'sql/schema_glint_delivery_project_no_2026-06-09.sql',
      'sql/data_glint_delivery_deal_link_2026-06-09.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.34.2',
  },
  {
    version: '1.34.1',
    date: '2026-06-09T13:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Journey board: Graveyard lane for Won-but-untracked Glint engagements',
    summary:
      'Added a Graveyard lane (after Off Rails) and seeded it with 13 Won/active Glint deals that had no delivery-project row (Boston Red Sox, Chugai, Eppendorf, EFTA, Liberty Global ×2, M&C Saatchi ×2, PEPKOR, TDIndustries, Westfalen ×2, PIMCO Prime). Added a glint_delivery.manual flag so these (and any future manual cards) survive the Graph sync cleanup.',
    changes: [
      'glint_delivery: new manual flag; 13 graveyard rows seeded from the opportunities (backup _dq_backup_glint_delivery_20260609c).',
      'glint-sync.js: cleanup delete now skips manual=true rows.',
      'lane-warroom.jsx: Graveyard lane (grey) after Off Rails.',
    ],
    files: [
      'api/glint-sync.js',
      'src/bd/lane-warroom.jsx',
      'sql/data_glint_delivery_graveyard_2026-06-09.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.34.1',
  },
  {
    version: '1.34.0',
    date: '2026-06-09T13:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Journey board: PS-analysis dot + contractor initials; remove Insights tab & flag badges',
    summary:
      'Each journey card now shows a green dot if the client has a People Science analysis on record, red if not (live from the PS database via /api/journey-analyses), plus the CS·PS·support contractor initials. Removed the noisy flag badges (Multi-cycle / Expansion / Churn) from cards and removed the separate "Insights review" tab.',
    changes: [
      'api/journey-analyses.js: new endpoint returning PS client names with ≥1 analysis (reads the People Science Supabase).',
      'lane-warroom.jsx: per-card green/red PS-analysis dot (name-matched) + contractor initials; removed flag badges; removed the Insights review tab.',
    ],
    files: [
      'api/journey-analyses.js',
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.34.0',
  },
  {
    version: '1.33.1',
    date: '2026-06-09T12:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Journey board: restore Configure & QA + Launch lanes; project name as ID (not account no.)',
    summary:
      'Restored the two lanes that got folded into "Preparing for Launch" — the board is now the full journey: Preparing for Launch → Configure & QA → Launch → Survey live → Close & results rollout → Insights review & action → Enablement & embedding → Off Rails. Cards now show the project name (mono) as the identifier instead of the account number, so account vs project numbering isn\'t mixed.',
    changes: [
      'lane-warroom.jsx: JOURNEY_PHASES back to 8 lanes (Configure & QA + Launch restored); removed account number from cards, project_name shown as the project id; legend trimmed.',
      'Added a "Source: CRM database" note at the top of the board (single source of truth; sheet is just an input view).',
      'Data: seeded journey_stage for all 27 projects from their notes/dates/milestones so every lane is populated; drag to fine-tune.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.33.1',
  },
  {
    version: '1.33.0',
    date: '2026-06-09T11:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey reframed as a project-stage board',
    summary:
      'Reframed the Customer-journey board around projects (operational), not the commercial funnel. Now 6 lanes: Preparing for Launch (first) → Survey live → Close & results rollout → Insights review & action → Enablement & embedding → Off Rails (last). All projects are listed (no completed filter); churn/platform-risk projects auto-land in Off Rails; cards are bigger and more readable. Drag still persists to journey_stage.',
    changes: [
      'lane-warroom.jsx: 6-stage project board with Preparing for Launch + Off Rails; inference includes off-rails (Qualtrics/Workday) and prep; all projects shown (removed include-completed toggle); larger cards + wider lanes for readability.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.33.0',
  },
  {
    version: '1.32.1',
    date: '2026-06-09T10:55:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Gantt: contractor initials inline in brackets behind the client name',
    summary:
      'In the War room Projects Gantt, the CS·PS·support initials now sit in brackets behind the client name on one line (e.g. "Trane Technologies (HM·PM)") instead of a second line; rows tightened.',
    changes: [
      'lane-warroom.jsx ProjectsGantt: initials as an inline tspan after the name; single-line rows (rowH 21 → 17).',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.32.1',
  },
  {
    version: '1.32.0',
    date: '2026-06-09T10:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Customer journey board: 7 phases, CS/PS lanes, drag-to-move, equal cards',
    summary:
      'Reworked the War room Customer-journey board to the 7-phase Viva Glint loop (Strategy & design → Configure & QA → Launch → Survey live → Close & results rollout → Insights review & action → Enablement & embedding), colour-coded by who leads (CS technical / PS advisory). Cards are now uniform size and can be dragged between lanes; the placement persists in glint_delivery.journey_stage (overrides the inferred stage). Playbook doc refreshed with the exact MS cadence + dormancy argument.',
    changes: [
      'lane-warroom.jsx: 7-phase JOURNEY_PHASES with lead split + LEAD_COLOR; phaseOfProject honours journey_stage; equal-height draggable cards; lanes are drop targets; moveJourney persists to glint_delivery.',
      'glint_delivery: new journey_stage column (backup _dq_backup_glint_delivery_20260609); not written by the sync, so it survives re-syncs.',
      'docs + public glint-customer-journey-playbook refreshed (MS staged-comms cadence, CS/PS streams, between-cycle/dormancy strategy).',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'public/glint-customer-journey-playbook-2026-06-07.md',
      'docs/glint-customer-journey-playbook-2026-06-07.md',
      'sql/schema_glint_delivery_journey_stage_2026-06-09.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.32.0',
  },
  {
    version: '1.31.0',
    date: '2026-06-09T12:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room: Customer journey playbook (planning board)',
    summary:
      'New War room tab "Customer journey" — a planning board that places each operational Glint ' +
      'client into the Viva Glint listening loop (Vision & Design → Launch → Insight Review → ' +
      'Manager enablement → Action → Sustain/Pulse), with the next best action and cross-sell SKU ' +
      'per phase, plus churn/expansion flags from the project notes. (Re-applied on top of v1.30.1 ' +
      'after the original v1.23.0 was superseded by concurrent work.)',
    changes: [
      'lane-warroom.jsx: JourneyBoard component + "Customer journey" tab; stage inferred from project status/milestone; "include completed (between-cycle)" toggle.',
      'Cards link to the Account 360, show the account number, milestone, and risk/expansion badges (e.g. Qualtrics/Workday = churn risk, bucket/optimisation = expansion).',
      'Empty Sustain column intentionally highlights the retainer gap.',
      'Links to the grounding doc, served at /glint-customer-journey-playbook-2026-06-07.md (also in docs/).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'public/glint-customer-journey-playbook-2026-06-07.md', 'docs/glint-customer-journey-playbook-2026-06-07.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.31.0',
  },
  {
    version: '1.30.1',
    date: '2026-06-09T09:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Waterfall: editable minimum, aligned axis + matching size',
    summary:
      'The minimum-per-quarter is now editable (input in the panel header, default €120k). The waterfall uses the same axis and dimensions as the charts above, so quarters line up column-for-column and the size matches.',
    changes: [
      'lane-reporting.jsx: minQ state + Min €k/q input; MinWaterfallChart uses the shared axis/CHART dims and takes a min prop.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.30.1',
  },
  {
    version: '1.30.0',
    date: '2026-06-09T08:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Reporting: cumulative waterfall vs €120k/quarter minimum',
    summary:
      'Removed the flat €120k min line from the won-revenue chart and added a proper waterfall chart below it: the running balance steps by (won − €120k) each quarter (Q1 82k → −38k, then −72k, … turning green once cumulatively ahead of the floor). Red = behind the minimum, green = ahead; the dashed line is "on minimum".',
    changes: [
      'lane-reporting.jsx: removed min line/points from WonByQuarterChart; added MinWaterfallChart + its panel.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.30.0',
  },
  {
    version: '1.29.4',
    date: '2026-06-09T07:55:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Won revenue chart: €120k/quarter minimum line',
    summary:
      'Added a red dotted minimum line at €120k/quarter on the Won-revenue-by-quarter chart. Quarters whose total falls below the minimum get a red point (with a tooltip), so you can see at a glance which quarters are under the floor.',
    changes: [
      'lane-reporting.jsx: MIN_Q = 120000; red dotted min line + below-minimum red points + legend entry.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.29.4',
  },
  {
    version: '1.29.3',
    date: '2026-06-09T07:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Gantt: smaller text',
    summary:
      'Further reduced the Gantt text and widened the viewBox so labels render smaller and in line with the rest of the lane (client 8, initials 6.5, months 7).',
    changes: [
      'lane-warroom.jsx ProjectsGantt: smaller fonts, wider viewBox, tighter rows.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.29.3',
  },
  {
    version: '1.29.2',
    date: '2026-06-08T23:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Gantt: smaller fonts in line with the rest of the lane',
    summary:
      'Reduced the Gantt font sizes and tightened the rows so it matches the surrounding War room typography (client 9.5, initials 7.5, month labels 8).',
    changes: [
      'lane-warroom.jsx ProjectsGantt: smaller fonts, tighter rowH/barH.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.29.2',
  },
  {
    version: '1.29.1',
    date: '2026-06-08T23:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'New vs recurring chart: stack the Q3 forecast + YoY indicators',
    summary:
      'The next-quarter (Q3 26) forecast in the New-vs-recurring chart is now a single stacked outlined bar (Glint + ROI) matching the historical bars, instead of two side-by-side bars. Added ▲/▼ YoY % above each quarter vs the same quarter last year.',
    changes: [
      'lane-reporting.jsx NewRecurringChart: stacked outlined proposal bar; per-quarter YoY % indicator.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.29.1',
  },
  {
    version: '1.29.0',
    date: '2026-06-08T23:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room Projects: in-progress Gantt timeline',
    summary:
      'Added a Gantt chart at the top of the Projects tab showing the in-progress projects on a month axis: a delivery-window bar per project, a KO marker, a today line, the client name (click to open the 360) and the CS · PS · support initials.',
    changes: [
      'lane-warroom.jsx: ProjectsGantt (SVG) over the in-progress rows; parseAnyDate() shared with the week labels.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.29.0',
  },
  {
    version: '1.28.9',
    date: '2026-06-08T22:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'War room dates: handle Excel serial numbers (KO/Start/End were showing 46235 etc.)',
    summary:
      'The Graph sync was storing date cells as raw Excel serial numbers (e.g. Trane Start = 46235 = 2026-08-01), which the week parser could not read. glint-sync now converts Excel serials to ISO dates, the week display also decodes serials defensively, and the existing serial values in glint_delivery were converted in place (backup _dq_backup_glint_delivery_20260608b).',
    changes: [
      'glint-sync.js: convert Excel serial date numbers to ISO on read.',
      'lane-warroom.jsx: dateLabel() decodes Excel serials too.',
      'Data: converted serial KO/Start/End/Survey/Insight-review values to ISO dates.',
    ],
    files: [
      'api/glint-sync.js',
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.9',
  },
  {
    version: '1.28.8',
    date: '2026-06-08T22:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room Projects: Milestone → Delivery; fuzzy dates → weeks/months',
    summary:
      'Renamed the Milestone column to Delivery. The Delivery/KO/Start/End columns now show a week number or a month for fuzzy entries too - "End of Feb 2026", "beginning of march", "Mid June-26", "First week of June", "w/c 13 July", "3rd June" all resolve to a week; bare months show as e.g. "May ’26".',
    changes: [
      'lane-warroom.jsx: dateLabel() parses fuzzy month phrases to ISO weeks (or a month label); Milestone column renamed Delivery.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.8',
  },
  {
    version: '1.28.7',
    date: '2026-06-08T21:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room Projects: KO / Start / End / survey shown as week numbers',
    summary:
      'The KO, Start and End columns (and the survey/milestone date) now display as ISO week numbers, e.g. "wk 32 ’26", instead of raw dates. Real dates are converted; vague free-text values ("Mid June-26") are left as-is.',
    changes: [
      'lane-warroom.jsx: weekLabel()/weekifyLabel() convert KO, delivery start/end and the next-milestone date to ISO week numbers.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.7',
  },
  {
    version: '1.28.6',
    date: '2026-06-08T21:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'FX correction note: show source + rate date',
    summary:
      'The Q-forecast FX correction note now states the source and the rate date, e.g. "source ECB via frankfurter.dev (rate date 2026-06-08)".',
    changes: [
      'lane-reporting.jsx: fx state + proposal.fx carry the ECB rate date; appended source + rate date to the chart note.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.6',
  },
  {
    version: '1.28.5',
    date: '2026-06-08T21:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'FX rates: fetch server-side (rates were stuck at 1:1)',
    summary:
      'The live FX lookup failed because api.frankfurter.app now redirects to api.frankfurter.dev, which the browser fetch could not follow — so rates fell back to 1:1 (USD 1.00 / GBP 1.00, +€0). Added a server-side /api/fx-rates route (frankfurter.dev / ECB) that the Reporting lane calls same-origin, so conversion actually applies.',
    changes: [
      'api/fx-rates.js: new server-side endpoint returning EUR-per-USD/GBP (cached 1h), 1:1 fallback on failure.',
      'lane-reporting.jsx: fetch /api/fx-rates instead of the third-party URL directly.',
    ],
    files: [
      'api/fx-rates.js',
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.5',
  },
  {
    version: '1.28.4',
    date: '2026-06-08T20:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Account 360: industry dropdown on the actual (inline) account panel',
    summary:
      'The industry sector dropdown was added to the wrong account component in 1.28.0. Added it to the inline Account 360 panel (InlineAccountDetails) that the workspace actually uses, replacing the free-text Industry field. The current value is preserved as an option.',
    changes: [
      'inline-details.jsx (InlineAccountDetails): Industry is now a sector dropdown (shared SECTOR_OPTIONS), keeping any current raw value as an option.',
    ],
    files: [
      'src/bd/inline-details.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.4',
  },
  {
    version: '1.28.3',
    date: '2026-06-08T20:25:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Won-revenue chart: note the FX correction applied to the Q3 forecast',
    summary:
      'The won-revenue panel hint now states the currency correction applied to the next-quarter weighted forecast: how many USD/GBP deals were converted to EUR, the rates used, and the net euro shift vs treating the raw numbers as euros.',
    changes: [
      'lane-reporting.jsx: proposal.fx (count, deltaEur, rates); chart hint shows the FX correction for the forecast quarter.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.3',
  },
  {
    version: '1.28.2',
    date: '2026-06-08T20:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Currency picker also on the inline deal detail',
    summary:
      'The EUR/USD/GBP currency picker was only on the full DealDetailModal; added it to the inline deal detail (the expand used in the workspace and Account 360) under the Value/Probability/Close grid, so it is actually reachable.',
    changes: [
      'inline-details.jsx (InlineDealDetail): added a Currency select writing opportunities.currency.',
    ],
    files: [
      'src/bd/inline-details.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.2',
  },
  {
    version: '1.28.1',
    date: '2026-06-08T19:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Reporting: revert to single total revenue line',
    summary:
      'Reverted the won-revenue chart back to the single total (actual) line; the separate Glint/ROI lines added in 1.28.0 were not useful. Currency conversion and the industry dropdown from 1.28.0 are unchanged.',
    changes: [
      'lane-reporting.jsx: restored the single black total line + points; removed the per-line Glint/ROI lines.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.1',
  },
  {
    version: '1.28.0',
    date: '2026-06-08T19:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Deal currency + live FX in weighted forecast, Glint/ROI lines, industry dropdown',
    summary:
      'Deals can be set to EUR (default), USD or GBP (currency picker in the deal detail). In the weighted next-quarter forecast, USD/GBP amounts are converted to EUR at the live ECB rate before weighting. The won-revenue chart now shows two thin lines (Glint and ROI) instead of a single total. The Account 360 Industry field is now a dropdown of the broad sectors, with extra logical sectors added.',
    changes: [
      'Deal currency: EUR/USD/GBP picker (deal detail), threaded through the adapter chain (usePipelineData + adapters).',
      'Reporting: weighted proposal forecast + Pipeline-weighted KPI convert USD/GBP to EUR via live frankfurter.app (ECB) rates.',
      'Reporting chart: single total line replaced by thin Glint and ROI lines.',
      'Account 360: Industry is a sector dropdown (shared SECTOR_OPTIONS); added Media & Entertainment, Telecommunications, Transport & Logistics, Automotive, Construction & Engineering.',
      'Industry breakdown honours any sector chosen directly on an account.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/deal-detail-modal.jsx',
      'src/bd/adapters.js',
      'src/hooks/usePipelineData.js',
      'src/bd/industry-breakdown.jsx',
      'src/components/accounts/AccountDetail.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.28.0',
  },
  {
    version: '1.27.4',
    date: '2026-06-08T18:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Reporting: honour sector set directly on an account',
    summary:
      'If an account\'s industry is set to a broad sector name in the Account 360 (e.g. Douglas → "Consumer & Retail"), the industry breakdown now groups it under that sector instead of "Other". The section reads company industry live from the database.',
    changes: [
      'industry-breakdown.jsx: sectorOf() recognises when industry already holds a sector name.',
    ],
    files: [
      'src/bd/industry-breakdown.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.27.4',
  },
  {
    version: '1.27.3',
    date: '2026-06-08T18:25:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Reporting: sort industry breakdown by client count',
    summary:
      'The "Industries · clients vs prospects" section now orders sectors by number of clients (descending), with prospects as the tiebreaker, instead of by combined total.',
    changes: [
      'industry-breakdown.jsx: sort sectors by clients desc, then prospects desc.',
    ],
    files: [
      'src/bd/industry-breakdown.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.27.3',
  },
  {
    version: '1.27.2',
    date: '2026-06-08T18:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room Projects: KO/Start/End columns, details on a second line, all clients clickable',
    summary:
      'Split the Timeline into separate KO, Start and End columns. Long project notes now render on their own full-width line under each project row (the top line keeps the markers). Also linked every delivery row to its CRM account so each client name opens its Account 360 (fixed a fuzzy-match that linked PIMCO Prima Real Estate to IMC).',
    changes: [
      'lane-warroom.jsx: separate KO / Start / End date columns (replacing the combined Timeline column).',
      'lane-warroom.jsx: removed the inline Details column; notes shown on a second full-width line beneath each row.',
      'Data: all 26 glint_delivery rows linked to CRM accounts; PIMCO Prima Real Estate corrected from IMC to PIMCO Prime Real Estate.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'sql/data_glint_delivery_rebuild_2026-06-08.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.27.2',
  },
  {
    version: '1.27.1',
    date: '2026-06-08T17:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'War room Projects: order by status (Not started → running → Completed)',
    summary:
      'The Projects table now sorts by project status - Not started first, In progress (running) next, Completed last - then by next milestone within each group.',
    changes: [
      'lane-warroom.jsx: 3-tier status ranking for the delivery table sort.',
    ],
    files: [
      'src/bd/lane-warroom.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.27.1',
  },
  {
    version: '1.27.0',
    date: '2026-06-08T17:15:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room sync reads MASTER + Old Projects tabs',
    summary:
      'Rewired glint-sync to read the actual workbook tabs - "MASTER – Project Overview" (current) and "Old Projects" (previous, shown Completed) - instead of a non-existent "Sheet1". Captures Expected delivery start, combines project + service type, and does a full refresh. Also rebuilt glint_delivery from the current master sheet (26 projects: 16 current + 10 previous).',
    changes: [
      'glint-sync.js: discovers worksheets and reads MASTER + Old Projects (ignores Contract durations); maps all five fields incl. delivery start; full-refresh upsert that drops rows no longer in the sheet.',
      'Data: glint_delivery rebuilt from Master_Project_Overview.xlsx (backup _dq_backup_glint_delivery_20260608).',
      'Note: the in-app Update button pulls live only once GRAPH_* credentials are set in Vercel.',
    ],
    files: [
      'api/glint-sync.js',
      'sql/data_glint_delivery_rebuild_2026-06-08.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.27.0',
  },
  {
    version: '1.26.0',
    date: '2026-06-08T16:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'War room Projects: KO date + delivery window from the master sheet',
    summary:
      'Added Expected delivery start to the glint_delivery schema + sync, and surfaced KO date, delivery start and delivery end as a new Timeline column in the War room Projects tab (project name and notes were already shown). Field guide updated.',
    changes: [
      'glint_delivery: new delivery_start column (backup _dq_backup_glint_delivery_20260608).',
      'glint-sync.js: now maps the sheet Expected delivery start column.',
      'War room Projects: new Timeline column showing KO date and the delivery start to end window.',
      'Field guide: documented Expected delivery start and the Timeline column.',
    ],
    files: [
      'api/glint-sync.js',
      'src/bd/lane-warroom.jsx',
      'public/warroom-projects-field-guide.md',
      'sql/schema_glint_delivery_delivery_start_2026-06-08.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.26.0',
  },
  {
    version: '1.25.0',
    date: '2026-06-08T15:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Product line: add Seer, rename ROE to Insights',
    summary:
      'Added Seer as a product-line classification and renamed ROE to Insights across every deal/lead/account picker and filter, plus the Reporting Win/loss-by-line table. Behaves like Glint and ROI; the two quarterly charts stay Glint vs ROI.',
    changes: [
      'Product-line tag set is now Glint, ROI, Seer, Insights, Other - updated in the deal-detail picker, new-deal modal, convert/disqualify modal, lead modal, account new-opp form, item detail (multiselect + convert), funnel filter and swimlane filter.',
      'Reporting: lineOf() recognises Seer and Insights; both appear in the Win/loss-by-line table; the new-vs-recurring chart is guarded to stay Glint/ROI only.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/deal-detail-modal.jsx',
      'src/bd/new-deal-modal.jsx',
      'src/bd/convert-disqualify-modal.jsx',
      'src/bd/lane-funnel.jsx',
      'src/bd/lane-accounts.jsx',
      'src/components/detail/ItemDetail.jsx',
      'src/components/accounts/AccountDetail.jsx',
      'src/components/forms/AddLeadModal.jsx',
      'src/components/views/SwimlaneView.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.25.0',
  },
  {
    version: '1.24.0',
    date: '2026-06-08T14:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Reporting: expandable industry sectors',
    summary:
      'Industry breakdown sectors are now clickable - expanding a sector lists the client and prospect account names underneath, alphabetically.',
    changes: [
      'Reporting: click a sector row in the industry breakdown to reveal its client + prospect account names.',
    ],
    files: [
      'src/bd/industry-breakdown.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.24.0',
  },

  {
    version: '1.23.0',
    date: '2026-06-08T13:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feat',
    title: 'Reporting: industries of clients vs prospects',
    summary:
      'New Reporting section breaking down accounts by broad industry sector, split into clients (type = Customer) and prospects (type = Prospect). Backfilled the missing companies.industry values so the breakdown has near-complete coverage (112 to 180 accounts with an industry).',
    changes: [
      'Reporting: added an "Industries - clients vs prospects" section grouped into 10 broad sectors, reading live company type + industry.',
      'Data: backfilled industry for 6 clients, 39 prospects and 24 partners that previously had none; 5 small/unknown partners left blank by design.',
      'Sector mapping kept as a single constant in industry-breakdown.jsx.',
    ],
    files: [
      'src/bd/industry-breakdown.jsx',
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
      'sql/data_fill_company_industries_2026-06-08.sql',
    ],
    gitTag: 'v1.23.0',
  },

  {
    version: '1.22.3',
    date: '2026-06-07T14:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'docs',
    title: 'README + CLAUDE.md brought fully up to date',
    summary:
      'Documentation refresh: README and CLAUDE.md now cover the War room (Projects/Insights/' +
      'Coverage), Reporting, the AI Account 360 brief, SharePoint document links, the A-####/D-#### ' +
      'numbering, the People Science cross-DB read and the new env vars — plus a "Conventions & ' +
      'learned protocols" section (versioning discipline, Supabase MCP backup-first flow, sandbox ' +
      'build workaround, region-field gotcha).',
    changes: [
      'README.md: refreshed features, API routes, DB/schema, env vars (PS_* + GRAPH_* app-only), project layout, Teams note; new Conventions & learned protocols section.',
      'CLAUDE.md: DB-via-MCP protocol, versioning discipline, region/numbering domain notes, People Science service_role + quarter-math gotchas, updated feature map.',
      '.gitignore: ignore throwaway dist_* / dist_check build dirs.',
    ],
    files: ['README.md', 'CLAUDE.md', '.gitignore', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.22.3',
  },
  {
    version: '1.22.2',
    date: '2026-06-07T13:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'improve',
    title: 'Reporting: average deal size in Win / loss by line',
    summary:
      'The Win / loss by line table now has an "Avg deal" column — average won deal size ' +
      '(won value ÷ won count) per product line, placed between Won value and Lost est.',
    changes: [
      'lane-reporting.jsx: Avg deal column added to the Win / loss by line table.',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.22.2',
  },
  {
    version: '1.22.1',
    date: '2026-06-07T13:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'improve',
    title: 'Numbering: all accounts get an A-#### number',
    summary:
      'Per standard CRM practice, the account number is no longer limited to Customers/Partners — ' +
      'every account is numbered. Existing A-0001..A-0081 unchanged; the remaining 105 accounts ' +
      'were backfilled chronologically as A-0082..A-0186, and the trigger now numbers every new account.',
    changes: [
      'Migration number_all_accounts: trigger condition dropped, remaining accounts backfilled, sequence advanced.',
      'sql/schema_numbering_2026-06-07.sql updated to match.',
      'War room Projects grid: account number (A-####) next to the client name and running deal number(s) (D-####) next to the deal value; same on the "in CRM but not in the sheet" block.',
    ],
    files: ['sql/schema_numbering_2026-06-07.sql', 'src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.22.1',
  },
  {
    version: '1.22.0',
    date: '2026-06-07T12:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Account & deal numbering (A-#### / D-####) + Phase A dedupe + Pepkor deal move',
    summary:
      'Automatic numbering: every deal gets a D-#### number on creation (one sequence across ' +
      'opportunities and leads), and every account that is or becomes Customer/Partner gets an ' +
      'A-#### number — assigned by database triggers, so it works no matter where a row is created. ' +
      'Existing rows backfilled chronologically (A-0001..A-0081, D-0001..D-0175). Also: merged ' +
      'duplicate companies INTWO→Intwo and KMPG→KPMG (data-quality Phase A, with backups), and ' +
      'moved the "Glint | eNPS conversion" deal from Pep core group to PEPKOR.',
    changes: [
      'DB migration account_and_deal_numbering: sequences, unique columns (companies.account_no, opportunities.deal_no, leads.deal_no), triggers on insert/update, chronological backfill — saved as sql/schema_numbering_2026-06-07.sql.',
      'usePipelineData/adapters: dealNo and accountNo threaded through.',
      'UI: deal number on funnel cards, inline deal detail and the deal modal (with account number); account number in the Account 360 hero and the accounts grid.',
      'Phase A dedupe executed with backups (_dq_backup_companies_20260607 / _dq_backup_contacts_20260607): all child tables repointed, losers deleted (188→186 companies), INTWO company_name snapshots fixed.',
      'Pepkor: Glint | eNPS conversion repointed from Pep core group to PEPKOR.',
    ],
    files: ['sql/schema_numbering_2026-06-07.sql', 'src/hooks/usePipelineData.js', 'src/bd/adapters.js', 'src/bd/lane-funnel.jsx', 'src/bd/inline-details.jsx', 'src/bd/deal-detail-modal.jsx', 'src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.22.0',
  },
  {
    version: '1.21.0',
    date: '2026-06-07T11:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room: Client coverage tab (moved from Reporting) + CS/PS initials in Insights review',
    summary:
      'The "Client coverage · Eclectik team" matrix moved from the Reporting page to its own ' +
      'War room tab (Projects | Insights review | Client coverage). The Insights review matrix ' +
      'gained a CS · PS column right after the client name showing the initials of the CS (green) ' +
      'and PS (purple) contractors covering that account.',
    changes: [
      'lane-reporting.jsx: exported useReportingData, computeMetrics, TeamCoverageMatrix; ROLE_OVERRIDE lifted to module scope and exported (roleOverrideFor / normLinkRole) as the single source of truth for roles; coverage Panel removed from the Reporting page.',
      'lane-warroom.jsx: new Client coverage tab rendering TeamCoverageMatrix via the shared reporting hook/model; click-through to the 360 kept.',
      'lane-warroom.jsx: eclectik_team fetch now also reads the link role and builds teamByAccount (CSM + PSC members, deduped, CS first) using the shared role override.',
      'InsightsMatrix: "CS · PS" initials column after Client (hover shows the full name + role); region header spans adjusted.',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.21.0',
  },
  {
    version: '1.20.0',
    date: '2026-06-06T16:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Account 360: SharePoint document links (account-level + per deal)',
    summary:
      'The Account 360 now has a Documents section for SharePoint links (SOWs, proposals, …): ' +
      'add a link with a name + URL, delete it, and click to open the document in a new browser ' +
      'window. Each deal also gets its own Documents block in the inline deal detail.',
    changes: [
      'New document_links table in Supabase (account-level: account_id; per-deal: deal_table + deal_id), RLS for authenticated users — applied as migration create_document_links and saved as sql/schema_document_links.sql.',
      'New doc-links-section.jsx: reusable DocLinksSection (list, add label+URL form, delete with confirm, opens links target=_blank); URLs without a scheme get https:// prefixed.',
      'lane-accounts.jsx: Documents section in the 360 below Eclectik team.',
      'inline-details.jsx: compact "Documents (SOW, proposal, …)" block inside InlineDealDetail.',
    ],
    files: ['sql/schema_document_links.sql', 'src/bd/doc-links-section.jsx', 'src/bd/lane-accounts.jsx', 'src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.20.0',
  },
  {
    version: '1.19.4',
    date: '2026-06-06T15:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'data',
    title: 'Normalize companies.country to full country names',
    summary:
      'One-time data cleanup applied to the CRM: every country value normalized to a consistent ' +
      'full English name. All US variants (US, USA, United States) unified to "United States" (46), ' +
      'and ISO codes (CH, NL, GB, DE, …) collapsed into their full names so Reporting, Insights ' +
      'review and the funnel region stripe all agree. NULL countries (40) left untouched.',
    changes: [
      'Applied UPDATE on companies.country mapping variants → canonical full names.',
      'Saved the migration as sql/data_normalize_country_2026-06-06.sql for the record.',
    ],
    note: 'Data-only change (no app code). 40 companies still have no country and remain EMEA by the binary US/EMEA rule.',
    files: ['sql/data_normalize_country_2026-06-06.sql', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.19.4',
  },
  {
    version: '1.19.3',
    date: '2026-06-06T15:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Region detection: read account.region (country) + include USA',
    summary:
      'US deal cards showed no red stripe because the adapter stores the country string on ' +
      'account.region, not account.country, so every account read as EMEA. Fixed the funnel ' +
      'stripe and the Insights review US/EMEA grouping to read the right field, and added "USA" ' +
      '(1 company) to the US match set alongside "US" / "United States".',
    changes: [
      'lane-funnel.jsx: DealCard region reads account.region (fallback country); US set now US / United States / USA.',
      'lane-warroom.jsx: regionFor() reads account.region (fallback country); same US set — fixes Insights review grouping that previously put everyone under EMEA.',
    ],
    note: 'Verified against the DB: US clients are stored as US (33), United States (12) and USA (1). Companies with no country (40) still fall under EMEA by design.',
    files: ['src/bd/lane-funnel.jsx', 'src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.19.3',
  },
  {
    version: '1.19.2',
    date: '2026-06-06T14:50:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: remove People scientist column',
    summary:
      'Dropped the People scientist column from the Insights review matrix — Client now leads ' +
      'straight into the Previous / quarter columns.',
    changes: [
      'lane-warroom.jsx: removed the PS header and per-row cell, removed the PS sort toggle, and adjusted the region section header to a single leading column.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.19.2',
  },
  {
    version: '1.19.1',
    date: '2026-06-06T14:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Funnel: region stripe on deal cards (red = US, blue = EMEA)',
    summary:
      'Every deal card in the funnel now has a colored left stripe by region — red for US, ' +
      'blue for EMEA — derived from the linked account country (missing country → EMEA), ' +
      'matching the Reporting / Insights review region split.',
    changes: [
      'lane-funnel.jsx: DealCard gets a 3px left border, red (#E24B4A) for US accounts, blue (#3B82F6) for EMEA, with a US/EMEA tooltip.',
    ],
    files: ['src/bd/lane-funnel.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.19.1',
  },
  {
    version: '1.19.0',
    date: '2026-06-06T14:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: grouped by region (US / EMEA) like Reporting',
    summary:
      'The Insights review matrix is now grouped by region — US and EMEA sections — the same way ' +
      'the Reporting view splits clients, instead of the People Science cohorts (Deeply analysed / ' +
      'Pre-IR / CLOSED). Region is taken from each client\'s matched CRM account country (US / United ' +
      'States = US, everything else = EMEA, missing country defaults to EMEA).',
    changes: [
      'lane-warroom.jsx: tbody now iterates US then EMEA, each with a count header.',
      'regionFor() derives region from the matched account country, mirroring the Reporting view.',
      'Rows sort alphabetically by name within each region (people-scientist sort still available).',
      'Removed the cohort-based section logic (sectionList/baseSections).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.19.0',
  },
  {
    version: '1.18.3',
    date: '2026-06-06T13:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'improve',
    title: 'Insights review forecast: season-aware (same quarter each year)',
    summary:
      'The forecast now locks onto the client\'s dominant survey season (the most common ' +
      'quarter-of-year across their past cycles) and predicts that same quarter annually — ' +
      'twice a year when the cadence is semi-annual — instead of stepping blindly from the ' +
      'last event, which could land a quarter off.',
    changes: [
      'predictFor(): compute the modal survey quarter (Q1–Q4) from past cycles and forecast that season each year within the 4-quarter horizon.',
      'Semi-annual clients get both seasons (the modal quarter and the one two quarters away).',
    ],
    note: 'Still a heuristic — assumes the client keeps surveying on their established annual beat.',
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.18.3',
  },
  {
    version: '1.18.2',
    date: '2026-06-06T13:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'improve',
    title: 'Insights review forecast: include CLOSED clients',
    summary:
      'Forecast diamonds are now shown for churned (CLOSED cohort) clients too — useful as ' +
      're-engagement / win-back prompts for when their next survey cycle would normally land.',
    changes: [
      'predictFor(): removed the CLOSED-cohort skip so closed clients also get cadence-based forecast diamonds.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.18.2',
  },
  {
    version: '1.18.1',
    date: '2026-06-06T13:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'improve',
    title: 'Insights review forecast: domain-aware engagement-survey cadence',
    summary:
      'The forecast diamonds now model an engagement-survey rhythm rather than raw event gaps. ' +
      'A survey, its readout and the deal signing are clustered into one cycle, the cadence ' +
      'defaults to annual (and drops to semi-annual only when cycles are consistently ~2 quarters ' +
      'apart), and a single readout (e.g. Alex Lee) now forecasts next year in the same season.',
    changes: [
      'predictFor(): cluster events <=1 quarter apart into one survey cycle (stops survey+readout looking like a quarterly cadence).',
      'Cadence snaps to annual (4q) by default, semi-annual (2q) only when cycle gaps are consistently ~2.',
      'Single-cycle clients now forecast (annual) instead of being skipped.',
      'Churned (CLOSED cohort) clients no longer get a forecast.',
    ],
    note: 'Still a heuristic anchored on engagement-survey norms, not a statistical model — verify against the real pipeline.',
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.18.1',
  },
  {
    version: '1.18.0',
    date: '2026-06-06T12:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: 4-quarter forecast (blue diamonds) + operational = blue square',
    summary:
      'The Insights review matrix now extends 4 quarters into the future and marks, per client, ' +
      'when the next deal or PSC readout is likely — a blue diamond — based on the historical ' +
      'cadence (median gap between past events). The operational marker (was an orange/yellow dot) ' +
      'is now a blue square.',
    changes: [
      'lane-warroom.jsx: added forecast horizon (4 future quarters past the latest actual quarter) shown as italic blue headers behind a dashed divider.',
      'predictFor(): collects each client\'s past events (PSC readouts + signed deals), takes the median quarter-gap, and projects the rhythm forward; needs ≥2 past events.',
      'Predicted quarters render a blue diamond (rotate-45 square).',
      'Operational row marker changed from yellow dot (#EAB308) to blue square.',
      'Legend updated for both new markers.',
    ],
    note: 'The forecast is a naive cadence extrapolation, not a statistical model — a planning prompt, not a probability.',
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.18.0',
  },
  {
    version: '1.17.6',
    date: '2026-06-06T12:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: "Previous" column for pre-2024-Q4 history',
    summary:
      'Added a "Previous" column to the Insights review matrix that collapses all ' +
      'PSC history from before 2024-Q4 into a single dot (plus deal-signed marker). ' +
      'It only appears when at least one client actually has pre-2024-Q4 data.',
    changes: [
      'lane-warroom.jsx: new prevFor()/hasPrevious logic aggregates pre-2024-Q4 cells.',
      'Renders a "Previous" column (header, section labels, per-client dot) left of the dated quarters, separated by a divider.',
      'Green/red dot follows the same rule as quarter cells; ❊ shown if a deal was signed before 2024-Q4.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.6',
  },
  {
    version: '1.17.5',
    date: '2026-06-07T09:50:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: matrix uses full available width',
    summary:
      'The Insights review matrix table now stretches to the full available width ' +
      'like the other pages, instead of sizing to its content.',
    changes: [
      'lane-warroom.jsx: matrix table set to width 100%.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.5',
  },
  {
    version: '1.17.4',
    date: '2026-06-07T09:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: remove the Note column',
    summary:
      'Removed the per-line Note column from the Insights review matrix (added no ' +
      'value there) and reclaimed the width. The account note is still editable in ' +
      'the Account 360 ("Notes (account)").',
    changes: [
      'lane-warroom.jsx: dropped the Note column (header, cells, section placeholder) and its load/save code from the matrix.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.4',
  },
  {
    version: '1.17.3',
    date: '2026-06-07T09:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: drop duplicate quarter labels in top header',
    summary:
      'Removed the year-Qx labels from the top header row (now that each section ' +
      'header repeats them) to avoid the doubling. Client / People scientist / ' +
      'Note labels stay in the top row.',
    changes: [
      'lane-warroom.jsx: top header quarter cells are now blank.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.3',
  },
  {
    version: '1.17.2',
    date: '2026-06-07T08:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: repeat quarter labels on each section header',
    summary:
      'The cohort section header rows (Deeply analysed, Pre-IR / pre-contract, ' +
      'CLOSED) now repeat the year-Qx quarter labels across their columns, so you ' +
      'can read which column is which quarter without scrolling back to the top.',
    changes: [
      'lane-warroom.jsx: section header row shows the quarter labels per column (label spans the Client + People-scientist columns).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.2',
  },
  {
    version: '1.17.1',
    date: '2026-06-07T08:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: matrix starts at 2024-Q4',
    summary:
      'The Insights review matrix now starts its quarter columns at 2024-Q4 — the ' +
      'old 2022/2023 baseline quarters are hidden to keep it readable. Data is ' +
      'unchanged; just the visible column range.',
    changes: [
      'lane-warroom.jsx: filter matrix quarter columns to 2024-Q4 onward.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.1',
  },
  {
    version: '1.17.0',
    date: '2026-06-06T23:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: ★ marks the quarter a deal was signed',
    summary:
      'The Insights review matrix now shows a ❊ (black, white in dark mode) in the ' +
      'quarter a deal was signed (from the CRM funnel, by close date) — alongside ' +
      'the analysis dots. ' +
      'Quarter columns are extended to include any quarter a deal was signed, even ' +
      'if there was no survey that quarter, so the star always has a column.',
    changes: [
      'lane-warroom.jsx: signedByAccount map (won opps → signed quarters per account); ★ rendered per client × quarter; columns = PS quarters ∪ signed quarters; legend updated.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.17.0',
  },
  {
    version: '1.16.3',
    date: '2026-06-06T23:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Insights review: operational marker is now a yellow dot',
    summary:
      'The "still operational in projects" dot in front of a client name in ' +
      'Insights review is now yellow instead of green, so it does not clash with ' +
      'the green analysis dots in the quarter cells.',
    changes: [
      'lane-warroom.jsx: operational dot colour green → yellow (#EAB308).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.16.3',
  },
  {
    version: '1.16.2',
    date: '2026-06-06T22:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Reporting: YoY split per region (US, EMEA) + total',
    summary:
      'The YoY row in the All clients · US & EMEA table is now split — a YoY line ' +
      'under the US subtotal and under the EMEA subtotal (each vs its own same-' +
      'quarter-last-year), plus the overall one under All clients.',
    changes: [
      'lane-reporting.jsx: reusable yoyRow helper; YoY line under US subtotal, EMEA subtotal, and the grand total.',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.16.2',
  },
  {
    version: '1.16.1',
    date: '2026-06-06T22:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Reporting: YoY row under the All-clients subtotal',
    summary:
      'Added a year-over-year row beneath the "All clients" subtotal in the All ' +
      'clients · US & EMEA table — each quarter vs the same quarter last year ' +
      '(green ▲ / red ▼ %), matching the Won-revenue-by-quarter chart.',
    changes: [
      'lane-reporting.jsx: YoY % row under the grand-total row in the clients table (from colTotals).',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.16.1',
  },
  {
    version: '1.16.0',
    date: '2026-06-06T22:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: operational green dot + Projects field-guide link',
    summary:
      'In Insights review, a green dot now sits in front of any client that is ' +
      'still operational (has a delivery project that is not Completed). And the ' +
      'Projects tab header has a "📄 Field guide" link to the usage instructions ' +
      'for the project sheet (served at /warroom-projects-field-guide.md).',
    changes: [
      'lane-warroom.jsx: green dot before operational clients (operationalAccIds from non-Completed glint_delivery projects).',
      'lane-warroom.jsx: Projects header link to the field guide; guide copied to public/ so it is served.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'public/warroom-projects-field-guide.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.16.0',
  },
  {
    version: '1.15.2',
    date: '2026-06-06T21:35:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Meetings: remove the "synced from" initials (the M) from rows',
    summary:
      'The leading "M" on Account 360 meeting rows was the "synced from" owner-' +
      'initials badge (e.g. Marco = M on every Boskalis meeting). Removed it so ' +
      'meeting rows are just title · green dot (if note/transcript) · date.',
    changes: [
      'lane-accounts.jsx: removed the owner-initials "synced from" badge from meeting rows.',
    ],
    files: ['src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.15.2',
  },
  {
    version: '1.15.1',
    date: '2026-06-06T21:15:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'YoY below the quarter labels + drop meeting icon on the calendar',
    summary:
      'Moved the YoY delta to a row below the Qx-yy labels on the Won-revenue-by-' +
      'quarter chart (clearer to read). Also removed the Teams channel icon from ' +
      'the Meetings calendar agenda rows (same redundant marker as in the 360).',
    changes: [
      'lane-reporting.jsx: YoY % now sits below the quarter labels (added a bottom band; plot area unchanged).',
      'lane-calendar.jsx: removed the channel icon from calendar agenda event rows.',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/lane-calendar.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.15.1',
  },
  {
    version: '1.15.0',
    date: '2026-06-06T20:55:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Reporting: YoY delta on won revenue by quarter',
    summary:
      'The "Won revenue by quarter" chart now shows a year-over-year delta above ' +
      'each quarter\'s total point — comparing it to the same quarter the previous ' +
      'year (Q1 2026 vs Q1 2025, Q4 2025 vs Q4 2024, …). Green ▲ up / red ▼ down ' +
      'with the % change. Shown only where the prior-year quarter is in range.',
    changes: [
      'lane-reporting.jsx QuarterBars: YoY % label per quarter (vs same quarter last year); panel hint updated.',
    ],
    files: ['src/bd/lane-reporting.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.15.0',
  },
  {
    version: '1.14.3',
    date: '2026-06-06T20:35:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Meetings list: drop the redundant channel icon',
    summary:
      'Removed the per-row channel icon (the Teams "M") from the Account 360 ' +
      'Meetings list — redundant, since everything in that section is a meeting.',
    changes: [
      'lane-accounts.jsx: removed ChannelIcon from meeting rows.',
    ],
    files: ['src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.14.3',
  },
  {
    version: '1.14.2',
    date: '2026-06-06T20:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Meetings: green dot instead of 📝 for stored notes/transcript',
    summary:
      'In the Account 360 Meetings list, a meeting that has a note/transcript ' +
      'stored now shows a small green dot instead of the 📝 emoji (count kept ' +
      'when more than one).',
    changes: [
      'lane-accounts.jsx: replaced the 📝 meeting-note indicator with a green dot.',
    ],
    files: ['src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.14.2',
  },
  {
    version: '1.14.1',
    date: '2026-06-06T20:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Deal notes: delete a note from the history',
    summary:
      'Each note in a deal\'s Notes history now has a × to delete it (e.g. a ' +
      'duplicate added twice). It rebuilds the deal notes field without that ' +
      'entry. Asks for confirmation first.',
    changes: [
      'inline-details.jsx InlineDealDetail: per-entry delete (×) — removes the entry and writes back the remaining dated notes.',
    ],
    files: ['src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.14.1',
  },
  {
    version: '1.14.0',
    date: '2026-06-06T19:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Account-level notes — editable in Insights review + the 360',
    summary:
      'Added an editable, persisted account-level note (stored on companies.notes). ' +
      'In the War room → Insights review there is now a "Note" column on every ' +
      'line you can type into; the same note shows and edits in the Account 360 ' +
      '("Notes (account)"). One note per client, visible in both the portfolio ' +
      'overview and on the client side.',
    changes: [
      'lane-warroom.jsx InsightsMatrix: editable Note column per row, auto-saves (debounced while typing + immediately on blur / moving to the next) to companies.notes for the matched account; loads existing notes on open.',
      'inline-details.jsx: "Notes (account)" field added to the Account 360 detail panel (same companies.notes field).',
      'Reuses existing companies.notes column — no schema change.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.14.0',
  },
  {
    version: '1.13.3',
    date: '2026-06-06T18:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights: CRM customers not yet in People Science + Reporting tab first',
    summary:
      'Insights review now appends CRM customers (type Customer, Adecco excluded) ' +
      'that are not yet in the People Science database under the "Pre-IR / ' +
      'pre-contract" section, marked "· CRM" with no analysis dots and clickable ' +
      'to their 360 — so the gap between served clients and analysed clients is ' +
      'visible. Also moved the Reporting tab to first (before Funnel).',
    changes: [
      'lane-warroom.jsx InsightsMatrix: append CRM customers missing from People Science to the Pre-IR cohort (count includes them); "· CRM" tag; 360 click + PS column still resolve.',
      'topbar.jsx + BDApp.jsx: Reporting moved to the first tab.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/topbar.jsx', 'src/bd/BDApp.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.13.3',
  },
  {
    version: '1.13.2',
    date: '2026-06-06T18:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Insights review: people scientist from the 360 Eclectik team',
    summary:
      'The "People scientist" column now resolves from each account\'s 360 ' +
      'Eclectik-team links (the team member whose name is a PSC role — Avneeta, ' +
      'Kirsty, Pablo, Paul Mastrangelo, Kate Feeney), instead of the delivery ' +
      'sheet PS owner. So it reflects who covers the client per the 360.',
    changes: [
      'lane-warroom.jsx: fetch eclectik_team links, pick the PSC member per account (PSC_NAMES, mirroring reporting ROLE_OVERRIDE); matrix resolves PS via matched account → 360 team.',
      'Name matching keeps parenthetical acronyms so e.g. "ETF" matches "European Training Foundation (ETF)" (client now links to its 360).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.13.2',
  },
  {
    version: '1.13.1',
    date: '2026-06-06T17:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: People scientist column (sortable)',
    summary:
      'Added a "People scientist" column next to Client in the Insights review ' +
      'matrix, resolved from the delivery sheet PS owner (matched by client name). ' +
      'Both the Client and People scientist column headers are clickable to sort ' +
      'rows (within each cohort section); click again to clear back to section order.',
    changes: [
      'lane-warroom.jsx: psByName map (client → PS owner) passed into InsightsMatrix; new People scientist column; click-to-sort on Client / People scientist headers.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.13.1',
  },
  {
    version: '1.13.0',
    date: '2026-06-06T16:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Insights review: meta-page cohorts + click client → 360',
    summary:
      'Matched the Insights-review matrix to the People Science meta page: clients ' +
      'are grouped under the same three section headers — "Deeply analysed — IR ' +
      'read end-to-end", "Pre-IR / pre-contract — predictive framing", and ' +
      '"CLOSED — relationship-closed clients" — in the same order/names (cohort ' +
      'from client status; the meta pseudo-client excluded). Clicking a client ' +
      'name opens that account\'s 360 on the right.',
    changes: [
      'api/insights-review.js: returns three cohort sections with counts — deep (active), pre (pre-ir/pre-contract), closed (status closed); excludes the meta pseudo-client.',
      'lane-warroom.jsx InsightsMatrix: renders section headers + counts; client name matched to the CRM account and clickable → opens Account 360.',
    ],
    files: ['api/insights-review.js', 'src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.13.0',
  },
  {
    version: '1.12.1',
    date: '2026-06-06T16:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'insights-review: stop crashing, report config errors clearly',
    summary:
      'The /api/insights-review function 500-crashed (FUNCTION_INVOCATION_FAILED) ' +
      'when PS_SUPABASE_URL/KEY were malformed, because the Supabase client was ' +
      'created outside the try block. Now it validates the URL, trims the values, ' +
      'and returns a clear JSON error instead of crashing.',
    changes: [
      'api/insights-review.js: createClient moved inside try; URL format validated + values trimmed; clearer error messages.',
    ],
    files: ['api/insights-review.js', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.12.1',
  },
  {
    version: '1.12.0',
    date: '2026-06-06T15:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room: Insights review matrix (clients × quarters)',
    summary:
      'Added an "Insights review" sub-tab to the War room (beside Projects): a ' +
      'matrix of clients × quarters with a green dot where an analysis is on record ' +
      'in the People Science meta and red where a survey cycle exists but has no ' +
      'analysis yet. Sub-clients (e.g. Sage Product / GTM) are nested under their ' +
      'parent. Data comes from the People Science project via /api/insights-review.',
    changes: [
      'War room split into Projects | Insights review sub-tabs (lane-warroom.jsx).',
      'New /api/insights-review.js reads the People Science Supabase (clients/cycles/analyses) and returns the client × quarter matrix. GATED on PS_SUPABASE_URL / PS_SUPABASE_KEY env (returns 503 until set).',
      'Added docs/warroom-projects-field-guide.md — the field reference for Yarmilla (incl. how to mark a project finished).',
    ],
    files: ['src/bd/lane-warroom.jsx', 'api/insights-review.js', 'docs/warroom-projects-field-guide.md', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.12.0',
  },
  {
    version: '1.11.4',
    date: '2026-06-06T14:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Reorder tabs: Funnel · War room · Tasks · Reporting first',
    summary:
      'Reordered the top navigation to Funnel, War room, Tasks, Reporting, then ' +
      'the rest (Meetings, Comms, Marketing, Playbooks, Admin, Log).',
    changes: [
      'topbar.jsx: nav button order updated.',
      'BDApp.jsx: NAV_VIEWS reordered to match.',
    ],
    files: ['src/bd/topbar.jsx', 'src/bd/BDApp.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.11.4',
  },
  {
    version: '1.11.3',
    date: '2026-06-06T13:30:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Status bar: world clock inline (flat) instead of a block',
    summary:
      'Changed the status-bar world clock from a bordered block to inline ' +
      'dot-separated segments, matching the "Eclectik BD · <user> · <date>" style ' +
      '— e.g. "… · Amsterdam 08:02 ±0 · New York 02:02 -6h · …". Amsterdam is ' +
      'emphasised as home.',
    changes: [
      'statusbar.jsx: render each location as a flat "City HH:MM offset" segment separated by ·, instead of the tz-strip cell block.',
    ],
    files: ['src/bd/statusbar.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.11.3',
  },
  {
    version: '1.11.2',
    date: '2026-06-06T13:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'Status bar: show date + world clock (moved from meetings page)',
    summary:
      'Replaced the "unread / open / pipeline value" stats in the bottom status ' +
      'bar (shown on every page) with the current date and the time-zone world ' +
      'clock (Los Angeles → Sydney). The clock was removed from the meetings page ' +
      'since it now lives globally in the status bar.',
    changes: [
      'statusbar.jsx: now renders "Eclectik BD · <user> · <date>" + the 8-city live world clock (updates every 30s).',
      'lane-calendar.jsx: removed the TimezoneFooter (and getOffset) — relocated to the status bar.',
    ],
    files: ['src/bd/statusbar.jsx', 'src/bd/lane-calendar.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.11.2',
  },
  {
    version: '1.11.1',
    date: '2026-06-06T12:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Tasks "With" picker: dedupe roster + drop email-as-name junk',
    summary:
      'The "With (Eclectik)" dropdown showed duplicate and malformed entries (e.g. ' +
      '"Heidi@eclectik.co" alongside "Heidi Muhle", a duplicate Kirsty). It now ' +
      'dedupes people by name and skips entries whose name is blank or just an ' +
      'email address. Applied in all three task forms (detail modal, inline panel, ' +
      'quick-add). NOTE: Olivier still won\'t appear until he is tagged as an ' +
      'Eclectik-team contact (he currently has no eclectik_team link).',
    changes: [
      'Roster build dedupes by normalized name and filters out email-as-name / blank entries (task-detail-modal.jsx, inline-details.jsx, lane-accounts.jsx).',
    ],
    files: ['src/bd/task-detail-modal.jsx', 'src/bd/inline-details.jsx', 'src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.11.1',
  },
  {
    version: '1.11.0',
    date: '2026-06-06T11:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Clients: add State field + backfill US states from location',
    summary:
      'Added a "State" field to clients (companies), editable in the Account 360 ' +
      'detail panel next to City. Backfilled the state for all 46 US clients from ' +
      'their city/address/postal code (schema_companies_state.sql, run in ' +
      'Supabase). Non-US clients left blank.',
    changes: [
      'New companies.state column + one-time backfill of US clients (schema_companies_state.sql).',
      'Editable "State" field in InlineAccountDetails (inline-details.jsx), after City.',
    ],
    files: ['schema_companies_state.sql', 'src/bd/inline-details.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.11.0',
  },
  {
    version: '1.10.3',
    date: '2026-06-06T10:00:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Tasks: "With" picker also on the new-task quick-add',
    summary:
      'The "With (Eclectik)" selector was only on the task editors, not the ' +
      'Account 360 quick-add form, so you could not set it when creating a task. ' +
      'Added it there (next to For), saving with_contact_id on insert.',
    changes: [
      'AddTaskInline (lane-accounts.jsx): added the eclectik_team "With" select + with_contact_id on insert; form grid reflowed to 2×2 (Due / For / With / Priority).',
    ],
    files: ['src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.10.3',
  },
  {
    version: '1.10.2',
    date: '2026-06-05T16:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room: per-column hour totals + used/remaining hour bars',
    summary:
      'Each people column header now shows the total allocated hours across all ' +
      'projects in brackets — CS (Xh) / PS (Yh) / Support (Zh). Under each ' +
      'person, a small hour bar shows used (green) vs remaining (red) of their ' +
      'allocated hours. The "used hours" source is not wired yet (placeholder = 0, ' +
      'so bars read all-remaining for now) — to be pointed at the right field later.',
    changes: [
      'Column headers sum allocated hours: CS / PS / Support (Xh).',
      'HourBar under each name: green blocks = used, red = remaining (~10h per block).',
      'Reads cs_used_hours / ps_used_hours / other_used_hours — currently undefined (0) pending the chosen used-hours field.',
      'Deal value shown after the project name, from the company\'s RUNNING (active/onboarding) CRM deal(s) only — fixes inflated values (e.g. IMC) caused by counting past/lost deals.',
      'Deal value followed by an effective rate in brackets: (€deal-value / total allocated hours per hour).',
      'Top banner lists CRM "active"/onboarding deals whose company has no row in the delivery sheet — the missing projects.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.10.2',
  },
  {
    version: '1.10.1',
    date: '2026-06-05T15:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'War room: delivery-focused grid with split people + details',
    summary:
      'Reworked the War room to focus on running Glint delivery. Removed the ' +
      'commercial-pipeline section and the Service and Health columns. People are ' +
      'now split into their own columns — CS · PS · Support (Eclectik owners + ' +
      'hours from the sheet) — and the operational detail (survey-live dates, ' +
      'dependencies) shows in a Details column. Columns: Client · project · CS · ' +
      'PS · Support · Milestone · Details · Status. Rows still order by urgency ' +
      '(Not started first, then soonest milestone).',
    changes: [
      'Removed the Commercial pipeline table (and deals dependency) from lane-warroom.jsx.',
      'Split "Who\'s on it" into CS / PS / Support columns; removed Service and Health columns.',
      'Added a Details column showing the project notes (e.g. survey-live / close dates).',
      'Kept urgency ordering: Not started pinned, then soonest next-milestone date.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.10.1',
  },
  {
    version: '1.10.0',
    date: '2026-06-05T15:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room — pipeline + running Glint projects on one screen',
    summary:
      'New "War room" tab: the commercial pipeline (from the CRM) and the running ' +
      'Glint delivery projects on one grid. Delivery rows are synced from ' +
      'Yarmilla\'s Master Project Overview into glint_delivery (CS/PS owner + hours, ' +
      'status, priority, milestone dates, notes, follow-up). Health is auto-derived ' +
      '(status + priority + milestone proximity + follow-up/blocked signals) and ' +
      'rows sort by urgency. Header shows the source file, when the sheet was last ' +
      'edited, when we last synced, and an Update button. Delivery rows link to the ' +
      'Account 360 by company match.',
    changes: [
      'New War-room tab (src/bd/lane-warroom.jsx) wired into BDApp NAV_VIEWS + Topbar; reads glint_delivery + open pipeline deals.',
      'New table public.glint_delivery (schema_glint_delivery.sql) + one-time seed of current rows (seed_glint_delivery.sql). RUN BOTH in Supabase.',
      'New /api/glint-sync.js: reads the Master Project Overview workbook via Microsoft Graph (app-only) and upserts rows; the Update button triggers it. GATED on Graph Files.Read.All consent + GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET env — returns 503 until configured, seeded data shows meanwhile.',
      'Auto-health + soonest-of-three milestone (survey / insight-review / delivery-end) logic.',
    ],
    files: [
      'src/bd/lane-warroom.jsx', 'src/bd/BDApp.jsx', 'src/bd/topbar.jsx',
      'api/glint-sync.js', 'schema_glint_delivery.sql', 'seed_glint_delivery.sql',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.10.0',
  },
  {
    version: '1.9.0',
    date: '2026-06-05T14:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Funnel: moving a deal to active/onboarding records it as Won',
    summary:
      'Dragging a deal to active or onboarding (an existing-customer / new-project ' +
      'win) now also marks it status=Won with a close (won) date of today, instead ' +
      'of leaving status empty. This makes new-project wins appear in the quarterly ' +
      'Won + new/recurring reporting — previously they fell into an "unstatused-' +
      'active" bucket excluded from the quarter breakdown, so a win like Alex Lee\'s ' +
      'July 2026 project never scored. The deal still sits in the active/onboarding ' +
      'funnel column (the funnel keys off stage, not status); the close date is ' +
      'editable afterwards if the win belongs in a different quarter.',
    changes: [
      'stageUpdates() in adapters.js: for active/onboarding, set status=Won + close_date/actual_close_date=today (opportunities only) instead of clearing status.',
      'No funnel change — display column still derives from stage, so won-active deals stay in the active column (matches existing active+Won deals).',
      'Data: existing Alex Lee 2026 deal patched separately via SQL (db_revert_alexlee_active_won_2026-06-05.sql for rollback).',
    ],
    files: [
      'src/bd/adapters.js',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.9.0',
  },
  {
    version: '1.8.1',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Tasks: make "With" editable in the inline task panel too',
    summary:
      'v1.8.0 added the "With" field to the task modal, but the inline task panel ' +
      '(opened when you click a task in the all-tasks list or calendar) had no ' +
      '"With" selector. Added an editable single-select "With" there as well, next ' +
      'to "For", so the field can be set wherever a task opens.',
    changes: [
      'inline-details.jsx (InlineTaskDetail): added the eclectik_team roster fetch and an editable "With" single-select next to "For"; widened the field grid to 5 columns.',
    ],
    files: [
      'src/bd/inline-details.jsx',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.8.1',
  },
  {
    version: '1.8.0',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Tasks: "With" field — an Eclectik member on the task',
    summary:
      'Tasks now have a "With" field: a single Eclectik team member who joins or ' +
      'collaborates on the task, separate from the owner (the "For" person). The ' +
      'picker lists contacts tagged as Eclectik team (account_links link_type=' +
      'eclectik_team). In the all-tasks list the "With" column sits next to "For" ' +
      'and is sortable. Stored as a contact reference so names stay consistent.',
    changes: [
      'Added with_contact_id column to tasks (FK to contacts) — see schema_tasks_with_member.sql (run in Supabase).',
      'task-detail-modal.jsx: new single-select "With (Eclectik)" dropdown, roster = distinct eclectik_team contacts; writes with_contact_id.',
      'tasks-view.jsx: new sortable "With" column placed right after "For" (owner), resolving with_contact_id to the contact name.',
      'Threaded withContactId through both task adapters (usePipelineData + adapters.js) for app-wide use.',
    ],
    files: [
      'schema_tasks_with_member.sql',
      'src/bd/task-detail-modal.jsx',
      'src/bd/tasks-view.jsx',
      'src/hooks/usePipelineData.js',
      'src/bd/adapters.js',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.8.0',
  },
  {
    version: '1.7.0',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Account 360 — AI Summary brief + internal Teams channel stream',
    summary:
      'New "Summary" section at the top of every Account 360, above Meetings: ' +
      'stat pills (last touch, interaction count, team-channel-linked, items ' +
      'needing attention), an AI-written brief of what has happened across every ' +
      'channel, and a "Needs attention" list. Merges meetings, email, LinkedIn, ' +
      'notes, tasks and deal-stage changes, plus — per client — a linked internal ' +
      'Teams channel (IMC Trading seeded). Generated on demand via the new ' +
      '/api/account-summary endpoint (Claude Sonnet), optional caching to account_briefs.',
    changes: [
      'Collapsible "Summary" Section above Meetings in AccountDetail with the AccountBrief component (stat pills, brief paragraphs, Needs-attention list, Generate/Refresh).',
      'New /api/account-summary.js endpoint: assembles the normalized interaction list and returns a structured JSON brief via Claude Sonnet; best-effort persistence to an optional account_briefs table (ephemeral fallback).',
      'Per-client internal Teams channel via ACCOUNT_TEAMS_CHANNELS (seeded with IMC Trading) using getChannelMessages(); guarded — silently skipped until Graph channel scopes are admin-consented, so login is unaffected.',
      'Added schema_account_briefs.sql (optional caching table).',
    ],
    files: [
      'api/account-summary.js', 'schema_account_briefs.sql',
      'src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.7.0',
  },
  {
    version: '1.6.2',
    date: '2026-06-03T18:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'feature',
    title: 'Marketing-tab UX: sticky panels, opt-out toggle, + tag/status',
    summary:
      'Marketing-tab krijgt meerdere kwaliteits-aanpassingen voor lange ' +
      'contact-lijsten en beter segmenteren. Sticky linker filter-panel + ' +
      'sticky top-toolbar blijven in beeld bij scrollen. Per contact een ' +
      'klik-toggle "wel mailen / niet mailen" (groen envelope / rood circled-' +
      'slash), persistent in DB. Plus + knoppen om direct nieuwe tags of ' +
      'account-statussen toe te voegen vanuit de filter-sidebar.',
    changes: [
      'Sticky filter-sidebar (TAGS / DEALS / ACCOUNT STATUS / STATUS) blijft in beeld tijdens scroll. maxHeight 100vh-80px met eigen overflow-y voor lange filter-lijsten.',
      'Sticky top-toolbar (search-input + select-all + bulk-acties) blijft bovenaan tijdens scrollen door contact-lijst.',
      'Per-contact opt-out toggle: groen envelope (✉) = wel mailen, rood circled-slash (⊘) = niet mailen. Tekst-Unicode i.p.v. emoji zodat CSS-color werkt. Optimistic local-state voor directe visuele feedback; async DB-write met rollback bij error.',
      'Visuele indicator: email-tekst strikethrough + opacity 0.5 wanneer opt-out actief.',
      'Send-campaign filtert do_not_email=true contacten automatisch uit recipients. Confirm-dialog ("X contacten op opt-out — door met overige Y?") als er geskipped worden.',
      '+ knop naast TAGS-header: inline input voor nieuwe tag-naam, persist in tags-tabel met random pastel-kleur.',
      '+ knop naast ACCOUNT STATUS-header: inline input voor nieuwe status, lokaal opgeslagen in localStorage (marketing_extra_statuses) zodat filter-optie zichtbaar wordt. Persistent in DB pas wanneer toegewezen aan een account via account-detail.',
      'Vereist eenmalige SQL: ALTER TABLE contacts ADD COLUMN do_not_email boolean NOT NULL DEFAULT false (door Olivier handmatig).',
    ],
    files: [
      'src/bd/marketing-contacts.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.2',
  },
  {
    version: '1.6.1',
    date: '2026-06-03T16:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'fix',
    title: 'Playbooks v2 — last-mile fixes voor signals + suggesties + cron',
    summary:
      'Zes opvolg-fixes na productie-deploy van 1.6.0. Volledige eind-tot-eind ' +
      'loop bewezen: signaal-poll detecteert LinkedIn-posts, Claude scoort, ' +
      'auto-suggesties verschijnen, gebruiker start, cron genereert tasks. ' +
      'Plus seed van een Warm Company Outreach playbook (internal task ' +
      'voor account-eigenaar bij score >= 0.6 op company-posts).',
    changes: [
      'Unipile 422 fix: signals-poll resolvet eerst de LinkedIn-slug naar internal provider_id (persons) of numeric company-id (via /linkedin/company/{slug}) voordat /users/{id}/posts wordt aangeroepen. Volgt zelfde patroon als api/unipile.js get-posts.',
      'Relative timestamp parsing: Unipile levert posted_at als "5h"/"1d"/"1w"/"1mo" strings. parsePostedAt converteert naar absolute ISO-strings (anders weigert Postgres timestamptz).',
      'Trigger-type prefix mismatch: signalSuggestionRules matchte signal.source naar "trigger_<source>" maar playbooks.trigger_type is unprefixed. Convention nu expliciet: playbook_nodes.node_type prefixed, playbooks.trigger_type unprefixed.',
      'Cron FK-join fix: playbook-execute.js JOIN op opportunities faalde omdat playbook_enrollments geen opportunity_id heeft. Vervangen door contacts(*, companies(*)) join + best-effort deal-lookup via company_id.',
      'SuggestionsTab FK-join fix: PostgREST kon opportunities-relatie niet auto-inferren via deal_id-kolom. Join verwijderd. Fallback-tekst toont nu signal_topics i.p.v. "Onbekend doelwit".',
      'playbook_enrollments.source_context kolom toegevoegd (was vergeten in Plan 1 schema) zodat suggestion-Start enrollment-creatie niet meer silently faalt.',
      'Warm Company Outreach playbook geseed: trigger_linkedin_company_post -> action_internal_task -> end. Genereert task "Reageer op company-nieuws: {{signal_context}}" voor account-eigenaar met due-date +3d.',
    ],
    files: [
      'api/signals-poll.js',
      'api/playbook-execute.js',
      'src/components/playbooks/lib/signalSuggestionRules.js',
      'src/components/playbooks/tabs/SuggestionsTab.jsx',
      'schema_playbooks_v2_warm_company_outreach_seed.sql (ad-hoc, niet in repo)',
      'ALTER playbook_enrollments ADD COLUMN source_context jsonb (ad-hoc, niet in repo)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.1',
  },
  {
    version: '1.6.0',
    date: '2026-06-03T10:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'feature',
    title: 'Playbooks v2 — visual workflow builder + execution engine + AI + signals',
    summary:
      'Compleet nieuwe Playbooks-feature: graph-gebaseerd ontwerp met drag-drop ' +
      'visuele builder (React Flow), conditional branching, AI-gegenereerde drafts ' +
      'via Claude Haiku, en automatische suggesties op basis van stage-changes en ' +
      'LinkedIn-post signalen. Oude lineaire playbook-systeem volledig vervangen. ' +
      'Nu beschikbaar via Playbooks-tab in topbar.',
    changes: [
      'Datamodel: 7 nieuwe tabellen (playbook_versions/nodes/edges, signals, signal_subjects, playbook_suggestions, playbook_drafts) + RLS-policies. Oude playbook_steps tabel gemigreerd naar nieuwe graph-structuur en gedropt na 24u stable.',
      'Visual builder (PlaybookFlowBuilder): React Flow canvas met drag-drop palette van 14 node-types (4 triggers, 6 actions, 4 logic), dynamic property panel per node-type, edge-creation + branch-labels, real-time validatie (6 regels), save-draft + publish-met-versionering (snapshots in playbook_versions).',
      'Execution engine (api/playbook-execute.js): graph-traversal cron die enrollments door playbook-graph laat lopen. Genereert drafts (email/LinkedIn/WhatsApp/Instagram), creëert internal tasks, update stages. Per draft-action: manual body OR AI-gegenereerde tekst via Claude Haiku met merge-fields ({{first_name}}, {{signal_context}}, etc.). System-prompt voorkomt em-dashes en andere AI-tells.',
      'Drafts hub (Playbooks → Drafts): two-pane preview + inline-edit + verzend via MS Graph (email) of Unipile (LinkedIn/WA/IG). Reply-detection voor LI/WA/IG via Unipile-webhook (markeert enrollment.replied_at).',
      'Test-run mode in builder: simulate playbook met test-contact, toont AI-output via /api/anthropic-generate endpoint.',
      'Signals (api/signals-poll.js): dagelijkse cron pollt Unipile voor LinkedIn-posts per signal_subject (auto-tracked: contacten + companies van active/sleeping deals). Two-step ID-resolution (slug → provider_id → posts). Claude Haiku scoort relevance 0-1 met JSON-output. Score > 0.6 → automatische suggestion.',
      'Suggesties UI: SuggestionsTab (filter pending/started/dismissed/expired + Start/Niet-nu acties), TopbarSuggestions badge met dropdown van top-5 (Supabase Realtime), pink card-pills op funnel-deal-cards, bell-icon (🔔) signal-follow toggle op contact panels.',
      'Stage-change suggesties: PL/pgSQL DB-trigger op opportunities.stage UPDATE → automatic playbook_suggestions insert voor matching playbooks. Instant (zelfde transactie).',
      'Warm Outreach seed-playbook: 3-node graph (trigger_linkedin_user_post → AI LinkedIn-draft → end) geseed via SQL, klaar voor signal-driven outreach.',
      'Content rules (CLAUDE.md §2b + system-prompt in cron): geen em-dashes, geen markdown-headers, geen bullet lists, geen filler-openingen in client-facing AI-gegenereerde tekst.',
      'Twee nieuwe Vercel cron-entries: signals-poll dagelijks 7u werkdagen, suggestions-expire weekly maandag 6u.',
    ],
    files: [
      'schema_playbooks_v2.sql',
      'schema_playbooks_v2_verify.sql',
      'schema_playbooks_v2_cleanup.sql',
      'schema_playbooks_v2_rollback.sql',
      'schema_playbooks_v2_stage_trigger.sql',
      'schema_playbooks_v2_signal_subjects_backfill.sql',
      'schema_playbooks_v2_warm_outreach_seed.sql',
      'api/playbook-execute.js',
      'api/signals-poll.js',
      'api/suggestions-expire.js',
      'api/anthropic-generate.js',
      'api/unipile-webhook.js',
      'src/components/playbooks/PlaybooksHub.jsx',
      'src/components/playbooks/PlaybookFlowBuilder.jsx',
      'src/components/playbooks/nodes/NodeTypes.js',
      'src/components/playbooks/nodes/NodeCard.jsx',
      'src/components/playbooks/panels/NodePalette.jsx',
      'src/components/playbooks/panels/PropertyPanel.jsx',
      'src/components/playbooks/panels/BuilderToolbar.jsx',
      'src/components/playbooks/builder/TestRunModal.jsx',
      'src/components/playbooks/tabs/DraftsTab.jsx',
      'src/components/playbooks/tabs/RunningTab.jsx',
      'src/components/playbooks/tabs/CompletedTab.jsx',
      'src/components/playbooks/tabs/SuggestionsTab.jsx',
      'src/components/playbooks/lib/playbookGraphIO.js',
      'src/components/playbooks/lib/playbookValidation.js',
      'src/components/playbooks/lib/playbookVersioning.js',
      'src/components/playbooks/lib/playbookGraphTraversal.js',
      'src/components/playbooks/lib/draftGeneration.js',
      'src/components/playbooks/lib/sendChannels.js',
      'src/components/playbooks/lib/signalScoring.js',
      'src/components/playbooks/lib/signalSuggestionRules.js',
      'src/bd/topbar-suggestions.jsx',
      'src/bd/signal-follow-toggle.jsx',
      'src/bd/topbar.jsx',
      'src/bd/lane-funnel.jsx',
      'src/bd/inline-details.jsx',
      'src/bd/BDApp.jsx',
      'src/bd/changelog.js',
      'CLAUDE.md',
      'vercel.json',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.0',
  },
  {
    version: '1.5.4',
    date: '2026-06-01T21:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Coverage matrix — Kate Feeney mapped to PSC',
    summary:
      'Kate Feeney (no role in the CRM, was showing under leadership/other) is a ' +
      'people scientist, grouped under PSC in the coverage matrix.',
    changes: [
      'Added "kate feeney": "PSC" to ROLE_OVERRIDE in src/bd/lane-reporting.jsx.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.4',
  },
  {
    version: '1.5.3',
    date: '2026-06-01T21:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Reporting: only flag won deals with no revenue at all',
    summary:
      'The "won with no/zero actual revenue" data warning was misleading — it fired ' +
      'for deals that are won on an estimate (real revenue), e.g. Breitling and ' +
      'BioMarin. It now fires only when a won deal has no revenue at all (no actual ' +
      'AND no estimate), so estimate-based wins no longer raise a flag.',
    changes: [
      'Changed the warning rule in src/bd/lane-reporting.jsx from "actual_revenue is null/0" to "revenue (COALESCE actual, est, 0) = 0".',
      'Reworded the warning to "won deal(s) with no revenue at all (no actual or estimate)".',
      'Effect: Breitling (€14,700 est) and BioMarin (€33,250 est) no longer appear in the warnings panel.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.3',
  },
  {
    version: '1.5.2',
    date: '2026-06-01T20:55:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Coverage matrix — authoritative team role mapping',
    summary:
      'The Reporting coverage matrix now uses an explicit role map for the Eclectik ' +
      'team instead of inferring purely from account_links. Eric Quintane and Manish ' +
      'Goel are now ROI (were "leadership/other"); everyone else is unchanged. The ROI ' +
      'group now appears in the column order (CSM → PSC → ROI → rest) and the legend.',
    changes: [
      'Added ROLE_OVERRIDE map (by name) in src/bd/lane-reporting.jsx; falls back to account_links.role for anyone not listed.',
      'Eric Quintane → ROI, Manish Goel → ROI. Angela/Ezra/Heidi/Ivan/Steph = CSM; Avneeta/Kirsty/Pablo/Paul = PSC; Simon/Yarmilla = leadership/other.',
      'ROI added to the matrix legend.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.2',
  },
  {
    version: '1.5.1',
    date: '2026-06-01T20:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'data',
    title: 'CRM data-quality corrections surfaced by the Reporting tab',
    summary:
      'Cleaned up the data-quality flags the new Reporting tab exposed. Two ' +
      'in-delivery deals that were never marked Won are now Won; two prospects ' +
      'that had actually bought are now Customers; and a customer with no country ' +
      'was placed in the US. Applied live to the database (with a snapshot + revert ' +
      'script); no code logic changed.',
    changes: [
      'Breitling: active deal marked Won (€14,700 estimate).',
      'BioMarin Pharmaceutical Inc: active deal marked Won; the €0 actual was cleared so the €33,250 estimate counts; account reclassified Prospect → Customer.',
      'European Training Foundation (ETF) and PIMCO Prime Real Estate: reclassified Prospect → Customer (they carry won revenue). Microsoft Corp intentionally left as Partner.',
      'BMC Software: country set to US (was blank, previously defaulting to EMEA).',
      'Effect: won revenue €1,113,770 → €1,161,720, won deals 44 → 46, customers (excl. Adecco) 32 → 35. Breitling & BioMarin now appear under the (informational) "won on estimate, no actual booked" flag — actuals were deliberately not faked.',
      'Snapshots: public._dq_backup_opps_20260601 and public._dq_backup_companies_20260601.',
    ],
    files: [
      'db_revert_dataquality_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Data: run db_revert_dataquality_2026-06-01.sql in the Supabase SQL Editor (restores from the _dq_backup_*_20260601 snapshots). This was a DB-only change — git checkout does not undo it.',
    gitTag: 'v1.5.1',
  },
  {
    version: '1.5.0',
    date: '2026-06-01T20:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Reporting tab — BD revenue & pipeline dashboard',
    summary:
      'New Reporting tab (after Comms) that reads live from Supabase and derives ' +
      'every figure from queries at load time — no hardcoded numbers. Won revenue ' +
      'by quarter with target + linear trend, new vs recurring by line, win/loss by ' +
      'line, and an all-clients US/EMEA matrix. Clicking a client name opens that ' +
      "account's 360 in the right pane. Follows the app's light/dark theme.",
    changes: [
      'Added the "Reporting" view to NAV_VIEWS (after Comms) + a topbar nav button; registered in SCROLL_VIEWS.',
      'New src/bd/lane-reporting.jsx: fetches opportunities + companies via the existing supabase client and computes all metrics in one place (revenue = COALESCE(actual, est, 0); quarter = quarter of actual/expected close; Won/Lost/Open; weighted = Σ(est × probability); Customer excl. Adecco; region US vs EMEA; new vs recurring by close-date rank).',
      'KPI row (won revenue, win rate, open + weighted pipeline, active/dormant clients), data-quality warnings panel, and a methodology footer.',
      'Charts are hand-rolled inline SVG (no new dependency) and theme via CSS variables; trend line shows R² and the illustrative target-crossing quarter.',
      'All-clients table groups US/EMEA with per-quarter columns, subtotals and a grand total that reconciles to total won; client-name click calls the existing pickAccount() so the persistent right pane shows the Account 360.',
      'Client-coverage matrix: clients (rows) × Eclectik team members (columns, grouped CSM → PSC → ROI → leadership/other from account_links), a colored dot marks each covered client; client name opens the 360.',
      'Config toggles: count unstatused-active deals as won (off by default) and new-vs-recurring at relationship vs product-line level.',
      'Read-only feature — no database change, so no snapshot/revert required.',
    ],
    files: [
      'src/bd/lane-reporting.jsx (new)',
      'src/bd/BDApp.jsx',
      'src/bd/topbar.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.0',
  },
  {
    version: '1.4.1',
    date: '2026-06-01T20:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'chore',
    title: 'Add change & release procedure (PROCEDURE.md)',
    summary:
      'Documented the full workflow for this project: how to version a change, ' +
      'write a changelog entry, run the GitHub push, handle database changes safely, ' +
      'and roll back. Includes a reusable prompt for Cowork/Claude sessions.',
    changes: [
      'Added PROCEDURE.md at the repo root covering: the working model, semver rules (keep VERSION + package.json + changelog.js + git tag in sync), the changelog entry shape, a pre-push checklist, database-change rules (snapshot → apply → verify → revert script), the exact push command, git/macOS gotchas, and rollback.',
      'Included a copy-paste prompt to drive future change sessions.',
    ],
    files: [
      'PROCEDURE.md (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.4.1',
  },
  {
    version: '1.4.0',
    date: '2026-06-01T17:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Stage-driven win probability on the funnel',
    summary:
      'Each funnel stage now carries a fixed win probability. The app sets it ' +
      'automatically whenever a deal moves stage (including lead→opportunity ' +
      'promotion), and existing deals were backfilled to match. Percentages are ' +
      'configurable in one place (STAGE_PROBABILITY in src/bd/adapters.js).',
    changes: [
      'Probabilities: qualify 20% · develop 40% · proposal 60% · close 0% · onboarding 80% · active 100% · sleeping 100%.',
      'Added STAGE_PROBABILITY map (src/bd/adapters.js) as the single source of truth.',
      'Wired it into stageUpdates so every stage move (and the lead→opp promote path) writes the right probability automatically.',
      'Backfilled probability on all 52 leads and 122 opportunities to match their current stage (DATABASE change, already applied live).',
      'Snapshot taken first (public._probability_backup_20260601) for reversibility.',
    ],
    files: [
      'src/bd/adapters.js',
      'db_revert_probability_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Data: run db_revert_probability_2026-06-01.sql in the Supabase SQL Editor (restores from the _probability_backup_20260601 snapshot). Code: git checkout v1.4.0 (or revert) to stop auto-setting probability on stage moves.',
    gitTag: 'v1.4.0',
  },
  {
    version: '1.3.0',
    date: '2026-06-01T17:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'data',
    title: 'Owner field normalized to canonical full names (data migration)',
    summary:
      'Cleaned up the free-text `owner` field, which stored the same person under ' +
      'several spellings. Every owner in companies, contacts, leads, opportunities ' +
      'and tasks is now one of three canonical full names. This was a DATABASE change ' +
      '(already applied live) — to undo it, run the revert SQL, not git.',
    changes: [
      'Normalized owner to: Marco van Gelder / Olivier Arnolds / Yarmilla Koenders across companies, contacts, leads, opportunities, tasks.',
      'Collapsed spelling variants: "MVG"/"Marco" → Marco van Gelder; "Olivier" → Olivier Arnolds; "Yarmilla" → Yarmilla Koenders.',
      'Reassigned legacy Dynamics owners (Jonathan Khongwir — 54 opps + 63 contacts, Desiree Cisneros) to Marco van Gelder.',
      'Filled empty owners (3 companies, 10 contacts, 3 leads, 5 opps, 9 tasks) with Marco van Gelder.',
      'Left comms.owner untouched — it stores the external counterparty name, not a team owner.',
      'Took a full snapshot first (public._owner_backup_20260601) for reversibility.',
    ],
    files: [
      'db_revert_owner_normalization_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Run db_revert_owner_normalization_2026-06-01.sql in the Supabase SQL Editor (restores from the _owner_backup_20260601 snapshot). git checkout will NOT undo a database change.',
    gitTag: 'v1.3.0',
  },
  {
    version: '1.2.0',
    date: '2026-06-01T16:56:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'New layout: persistent Account 360 on the right, single view-switcher on the left',
    summary:
      'Reworked the app shell into a consistent two-pane model. The Account 360 ' +
      '"database" pane now stays on the right in every view, and the left pane ' +
      'switches between Funnel, Meetings, Tasks, Comms, Marketing, Playbooks and Admin. ' +
      'Also removed the "BabyDee 1.0" badge from the top-left. No Supabase data touched.',
    changes: [
      'Removed the "BabyDee 1.0" badge next to the Eclectik BD wordmark (top-left).',
      'Top nav is now a single flat view-switcher: Funnel · Meetings · Tasks · Comms · Marketing · Playbooks · Admin (+ Log). Replaced the old Workspace/Funnel split that toggled the left lane.',
      'Account 360 is now rendered as a persistent right-hand pane across ALL views (previously Marketing, Playbooks and Admin took the full width and hid it).',
      'Each view now occupies the left pane: Funnel (pipeline), Meetings (calendar/agenda), Tasks, Comms (email/Teams/LinkedIn), Marketing, Playbooks, Admin, Log.',
      'Collapsed the duplicated per-view render blocks in BDApp.jsx into one unified shell (single Topbar / Statusbar / modal set).',
      'Repurposed the lane "expand" toggle: expanding the left pane now hides the 360 for full-width focus (Funnel, Meetings, Tasks).',
      'Added migration for the old persisted "workspace" view so existing users land on Meetings (or Funnel) instead of a blank screen.',
    ],
    files: [
      'src/bd/BDApp.jsx',
      'src/bd/topbar.jsx',
      'VERSION',
      'package.json',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.2.0',
  },
  {
    version: '1.1.0',
    date: '2026-06-01T16:43:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'In-app Log / version-history tab + project metadata cleanup',
    summary:
      'Added a Log tab so the team can see, in the app, exactly what changed and when — ' +
      'with date-time stamps, per-version detail, and git-based rollback instructions. ' +
      'Also corrected stale project metadata. No Supabase data was touched.',
    changes: [
      'New "Log" tab in the top navigation (between Marketing and Admin).',
      'Added src/bd/changelog.js as the single source of truth for version history.',
      'Added src/bd/log-view.jsx — renders the changelog as a timeline (newest first) with version badge, UTC + local date-time stamp, author, detailed change list, files touched, and the exact rollback command per version.',
      'Added a "history" icon to the shared icon set (src/bd/atoms.jsx).',
      'Wired the Log view into BDApp.jsx (view === "log") and the Topbar nav button.',
      'package.json: removed "type": "commonjs" (this is an ESM Vite app) and the stray "main": "index.js"; bumped version 1.0.0 → 1.1.0 to match this entry.',
      'Added a VERSION file (1.1.0) so the deployed build can report its version.',
    ],
    files: [
      'VERSION (new)',
      'src/bd/changelog.js (new)',
      'src/bd/log-view.jsx (new)',
      'src/bd/atoms.jsx',
      'src/bd/topbar.jsx',
      'src/bd/BDApp.jsx',
      'package.json',
    ],
    gitTag: 'v1.1.0',
  },
];
