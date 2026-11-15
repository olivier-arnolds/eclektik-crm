# Laadwacht - Ontwerp

Datum: 2026-11-15
Status: goedgekeurd door Olivier op 2026-11-15

## 1. Waarom / intentie

Olivier laadt zijn auto aan publieke laadpalen in de buurt van zijn huis
(Santpoorterplein, Haarlem). Dichtbij zijn de palen vaak allemaal bezet. Nu
betekent dat herhaaldelijk een laad-app openen of naar buiten lopen om te
kijken. Laadwacht lost dat op: een knop "ik wil laden", je ziet meteen welke
palen vrij zijn, en als alles bezet is krijg je vanzelf een melding zodra er
eentje vrijkomt. Zo kun je rustig thuis wachten en pas naar buiten als er echt
plek is.

Inferentie van mij (niet expliciet door Olivier gezegd): hij heeft geen eigen
laadpunt bij huis en is afhankelijk van publieke palen. De kern is vertrouwen:
geen vrije paal missen, en niet voor niets gaan kijken.

## 2. Doelen (versie 1)

- Een knop die meteen de status van zijn vaste set palen rond huis toont
  (vrij/bezet, met aantal vrije plekken).
- Als alles bezet is: een push-melding op de telefoon zodra er een paal
  vrijkomt. Hij kan kiezen waarop de wachter let: op de eerste de beste vrije
  paal, of alleen op zijn prio 1 (of een andere specifiek gekozen paal).
- Hij kan zijn palen een eigen volgorde/prioriteit geven. Prijs per paal wordt
  getoond waar bekend, om die keuze te helpen.
- Kaartweergave van de palen met hun status.
- Op het beginscherm te zetten als PWA, net als Warm.

## 3. Geen doel nu (expliciet later / versie 2)

- Reis-modus / op basis van je locatie (bestemming zoals Nijmegen, onderweg
  statuswijzigingen zien, navigeren naar de dichtstbijzijnde vrije paal bij je
  bezoekadres). Het datamodel houdt hier rekening mee, maar het wordt nu niet
  gebouwd.
- Meerdere gebruikers, accounts of login. Dit is een persoonlijke app.
- Een laadsessie starten, reserveren of betalen. Alleen informeren.
- Historische statistieken.

## 4. Anti-doelen (wanneer is het mislukt, ook als het technisch werkt)

- Een gemiste vrije paal: als de melding niet of te laat komt terwijl er plek
  was, is het vertrouwen weg. Betrouwbaarheid van de wachter is het
  belangrijkst.
- Melden over een paal die hij toch nooit gebruikt (verkeerde set of volgorde).
- Spam: meer pushen dan nodig.
- Traag op de knop: hij staat op het punt te beslissen of hij nu naar buiten
  loopt.

## 5. Databron (getest op 2026-11-15)

NDW open data, gratis, geen inlog nodig:

- Locaties + live status:
  `https://opendata.ndw.nu/charging_point_locations_ocpi.json.gz`
  (OCPI 2.2.1, circa 19 MB ingepakt / 200 MB JSON, 84.851 locaties,
  212.614 laadpunten). Per laadpunt (EVSE) een `status`
  (AVAILABLE, CHARGING, enzovoort). Het bestand wordt ongeveer elke minuut
  opnieuw gemaakt (Last-Modified bevestigd, circa 1 minuut oud bij ophalen).
- Tarieven:
  `https://opendata.ndw.nu/charging_point_tariffs_ocpi.json.gz`
  (107.150 tarieven, 102.399 met een ENERGY-prijs per kWh). Te koppelen via
  `connector.tariff_ids` plus de sleutel (country_code, party_id, id).

Gevolg: "zodra vrij" betekent in de praktijk binnen circa 1 tot 2 minuten.
Let op (uit de NDW-docs): deze API is nog in ontwikkeling, dus defensief
parsen.

## 6. Prijs: wat wel en niet kan (van belang voor de prioriteit-functie)

Getest op Oliviers eigen palen binnen 400 m:

- De Vattenfall-palen geven een prijs: 0,29 EUR/kWh.
- De TotalEnergies-palen (de meerderheid rond zijn huis) publiceren geen tarief
  in de open data (geen tariff_ids), dus daar is geen prijs beschikbaar.
- De Shell/Ubitricity-paal heeft wel een tariff_id, maar die was niet te
  koppelen.
- Belangrijker nog: de prijs die je echt betaalt hangt af van je laadpas (de
  mobility service provider), niet van het CPO-tarief in deze data.

Gevolg voor het ontwerp: prijs is een hint, geen betrouwbare sorteersleutel
voor zijn palen. Daarom:

- Prioriteit is primair handmatig: Olivier zet zelf de volgorde van zijn palen
  (1, 2, 3, ...).
- Waar een prijs bekend is tonen we die erbij ("0,29/kWh"); waar niet, tonen we
  "prijs onbekend". We bieden "sorteer op prijs" als hulpmiddel (onbekende prijs
  achteraan).
- Besloten: Olivier vult per paal eenmalig zelf de prijs in die hij met zijn
  laadpas betaalt (betrouwbaar en privé, werkt voor alle palen). Waar de open
  data een prijs geeft, bieden we die als voorzet aan om over te nemen of aan
  te passen.

## 7. Hoofdstroom (gedrag)

1. Knop "Ik wil laden" -> de app vraagt de huidige status van zijn palen op.
2. Is er minstens een paal vrij (minimaal een plek AVAILABLE): toon de lijst,
   in zijn prioriteit-volgorde, de vrije bovenaan, met "Navigeer".
3. Is alles bezet: toon "ik hou het in de gaten". Hij kiest waarop de wachter
   let: op elke vrije paal (de eerste die vrijkomt), of alleen op zijn prio 1
   (of een andere gekozen paal). Registreer de wacht-opdracht. Zodra de
   gevolgde paal vrijkomt, stuur een push-melding (die de vrije paal noemt) en
   stop de wacht. Auto-stop na 2 uur.
4. "Navigeer" opent de kaart-app naar de paal.

Definitie "vrij": een paal is vrij als minstens een van zijn laadpunten de
status AVAILABLE heeft. UNKNOWN telt niet als vrij.

## 8. Schermen

- Start: logo, locatie, grote knop "Ik wil laden", "X palen in de gaten".
- Resultaat (lijst): palen in prioriteit-volgorde met rangnummer, prijs waar
  bekend, status-pill en "Navigeer"; de vrije bovenaan.
- Resultaat (kaart): dezelfde palen als pins, kleur per status (groen vrij,
  grijs bezet), tik voor details. Echte app: Leaflet plus OpenStreetMap,
  gratis, geen sleutel.
- Wachten: "ik hou het in de gaten" met de keuze (elke paal / alleen prio 1)
  en een stop-knop.
- Instellen (eenmalig): huisadres of postcode prikken -> palen in een straal ->
  aanvinken welke je volgt -> volgorde zetten -> per paal je prijs invullen
  (met een voorzet uit de open data waar beschikbaar).

## 9. Architectuur (mijn invulling; Olivier gaf de "hoe" uit handen, zoals bij Warm)

- Losse PWA in een eigen repo (voorstel: `~/Desktop/laadwacht`, net als
  warm-app), gedeployed op Vercel. Specs en plannen in de CRM-repo onder
  `docs/superpowers/` (zoals bij Warm).
- Frontend: PWA met service worker, op het beginscherm te zetten.
- Meldingen: Web Push (VAPID). iOS 16.4+ ondersteunt dit voor PWA's op het
  beginscherm; vereist eenmalig toestemming van de gebruiker.
- Backend (Vercel serverless plus cron):
  - Verse snapshot (cron, elke 1 tot 2 minuten): haalt het NDW-bestand op,
    filtert via streaming op een kleine bounding box rond huis (geheugen laag,
    niet de hele 200 MB in RAM) en schrijft een slanke snapshot van zijn palen
    naar de opslag. Draait doorlopend, zodat de knop altijd verse data heeft.
  - Directe check (knop): leest de laatste snapshot uit de opslag en antwoordt
    meteen, zonder zware download tijdens het drukken. Dit houdt de knop snel,
    zoals het anti-doel vraagt. (Mijn call n.a.v. de builder-check, die een
    spanning zag tussen "snelle knop" en per-druk 200 MB ophalen.)
  - Wachter: als er een actieve wacht is, vergelijkt de cron elke ronde de
    gevolgde palen; zodra er een vrijkomt, pusht hij en stopt de wacht.
    Verloopt na 2 uur.
  - Hosting: standaard onder hetzelfde Vercel Pro-team als de CRM, want een
    minuut-cron vereist Pro (Hobby staat alleen dagelijkse crons toe). Mocht
    Laadwacht op een Hobby-account komen, dan triggert een externe planner
    (GitHub Actions, cron-job.org of Upstash QStash) het snapshot-endpoint elke
    1 tot 2 minuten. (Bevestigd: Pro-team.)
- Opslag: een kleine key-value of tabel (bijvoorbeeld Vercel KV / Upstash, of
  een Supabase-tabel) voor: zijn palenlijst plus volgorde, de push-subscription,
  en de actieve wacht. Een gebruiker, dus geen auth- of DB-complexiteit nodig.
- Palen identificeren via het OCPI location-`id` als stabiele sleutel over
  refreshes heen.

## 10. Benaderingen (overwogen)

- A. PWA + Vercel cron + Web Push met een slanke NDW-pipeline (GEKOZEN). Past
  op het Warm-patroon, minimale infra, knop snel, wachter betrouwbaar.
- B. Puur in de telefoon (de app haalt NDW zelf op). Afgevallen: 19 MB / 200 MB
  is te zwaar voor de telefoon, en je kunt niet melden als de app dicht is.
- C. Native iOS-app. Afgevallen: zwaarder te bouwen en onderhouden, App
  Store-gedoe; hij wil een beginscherm-appje zoals Warm, en PWA-push volstaat.
- Data-detail: streaming-filter in plaats van het hele bestand in geheugen
  laden, om binnen de serverless-limieten te blijven.

## 11. Veiligheidskleppen en randgevallen

- NDW-ophalen faalt -> de knop toont een nette melding; de wachter probeert het
  de volgende ronde opnieuw.
- Dubbel melden voorkomen: na de eerste "vrij"-melding stopt de wacht.
- UNKNOWN-status telt niet als vrij.
- NDW-formaat kan wijzigen -> defensief parsen en loggen.
- Palen worden gevolgd op het OCPI location-id. Dat id moet stabiel zijn over
  refreshes; de bouwer verifieert dit tegen de live data en valt zo nodig terug
  op een match via coordinaten plus evse_id. (De NDW-API is nog in ontwikkeling,
  dus niet blind vertrouwen.)
- Melding-toestemming geweigerd -> de app legt uit dat er zonder toestemming
  geen melding kan komen.

## 12. Wat aan de bouwer wordt gelaten

- De exacte keuze van de opslag (Vercel KV, Upstash of een Supabase-tabel).
- Het cron-interval binnen 1 tot 2 minuten en de precieze streaming-parse.
- De kaart-details (Leaflet-versie, markerstijl).
- De precieze straal van de server-bounding-box (ruimer dan zijn palen, voor de
  instel-stap).
- UI-afwerking binnen de richting van de mockup.

## Open punten voor Olivier

1. Prijs: BESLOTEN (2026-11-15). Olivier vult per paal eenmalig zelf de prijs
   in die hij met zijn laadpas betaalt; waar de open data een prijs geeft,
   tonen we die als voorzet. Shell-login is afgevallen (geen publieke API,
   wachtwoord-opslag, waarschijnlijk tegen de voorwaarden).
2. Builder-check (2026-11-15) uitgevoerd. Zelf opgelost in dit document:
   - Snelle knop via een doorlopende snapshot in de opslag, in plaats van per
     druk 200 MB ophalen (loste de spanning met het anti-doel op).
   - Streaming-parse binnen de functielimieten; bouwer verifieert.
   - Id-stabiliteit als verificatiestap, met coordinaten-fallback.
   Bevestigd door Olivier (2026-11-15):
   - Hosting: Laadwacht onder hetzelfde Vercel Pro-team als de CRM; de
     minuut-cron mag dus draaien.
   - Telefoon: iPhone op recente iOS, akkoord met melding-toestemming.
