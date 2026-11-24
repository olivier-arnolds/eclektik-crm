# Ontwerp: thuisverwarming-app (werktitel: Warm)

Datum: 2026-11-03
Status: ter goedkeuring
Opdrachtgever: Olivier

Dit document beschrijft wat we gaan bouwen en waarom, zodat een bouwer het kan
plannen zonder terug te hoeven vragen. Het is bewust in gewone taal geschreven,
met de technische keuzes erbij.

---

## 1. Waarom

Olivier stuurt de elektrische verwarming in de slaapkamers aan via de bestaande
"Warmme"-app. Die app kan alleen het botte werk: zien of een kamer aan staat en
hem aan/uit zetten. Wat ontbreekt en wat pijn doet:

- Je komt er pas achter dat de verwarming de hele dag aan stond als je toevallig
  in de app kijkt.
- Je kan niet zeggen "doe 4 uur aan en ga dan vanzelf uit".
- Je kan niet instellen dat een kamer op een bepaald tijdstip warm wordt.
- Er is geen seintje als iets te lang aan blijft staan.

Het echte doel is dus niet "Warmme namaken", maar er slimheid bovenop zetten:
op tijd een seintje krijgen, en de verwarming vooruit kunnen plannen.

Technisch is dit haalbaar omdat de Warmme-thermostaten onder de motorkap
**Tuya**-apparaten zijn (hetzelfde platform als de "Smart Life"-app). Tuya heeft
een officiele, gedocumenteerde cloud-koppeling (API) waarmee we de verwarming
kunnen uitlezen en aansturen. Dit is bevestigd door gebruikers die hun
Warmme-thermostaat in de Tuya-app en in Home Assistant hebben gekoppeld.

## 2. Wat de app moet kunnen

1. **Kamer-overzicht.** Per kamer zien of de verwarming aan of uit staat
   (en de huidige temperatuur tonen als die beschikbaar is), met een knop om
   aan of uit te zetten en een knop "alles uit". Dit scherm is meteen het
   vangnet: mocht een melding ooit niet aankomen, dan kan je hier altijd zelf
   zien wat er aan staat. Met "aan" bedoelen we de aan/uit-stand die je nu in de
   Warmme-app ook ziet.

2. **Ochtendmelding om 9:00.** Elke dag om 9:00 kijkt de app of er ergens nog
   verwarming aan staat. Zo ja, dan gaat er een melding uit. Staat alles uit,
   dan geen melding. De melding is tikbaar en opent de app op het
   kamer-overzicht.

3. **Timer: X uur aan, dan vanzelf uit.** Je zet een kamer aan voor een
   gekozen duur; de app zet hem na die tijd automatisch weer uit.

4. **Geplande starttijd (eenmalig, vandaag).** Je stelt in dat een kamer later
   vandaag op een bepaald tijdstip automatisch aangaat (kind komt om 16:30
   thuis, zet aan op 16:00). Dit geldt alleen voor die dag, niet herhalend.
   Punt 3 en 4 mogen combineren: "aan om 16:00, en na 3 uur weer uit".

5. **Lang-aan-seintje, alleen overdag.** Staat een kamer onafgebroken te lang
   aan (standaard 6 uur, instelbaar) en valt dat tussen 9:00 en 23:00, dan een
   melding "staat al 6 uur aan, aan laten of uitzetten?". 's Nachts niet, want
   dan wil je de slaapkamers juist warm hebben. De nacht-situatie (de hele
   nacht aan gebleven) wordt opgevangen door de ochtendmelding van 9:00.

6. **Instellingen (alleen de beheerder).** Olivier koppelt kamers aan personen
   en zet per persoon de kijk-rechten.

### Wie ziet en mag wat

- **Olivier (beheerder)** ziet en bedient altijd alle kamers, beheert de
  personen en de instellingen, en krijgt meldingen over alle kamers.
- **Gezinsleden** zien wat Olivier per persoon instelt: alleen hun eigen kamer,
  of alle kamers. Zij krijgen een ochtend- en lang-aan-melding alleen over de
  kamer(s) die bij hen horen.
- **Iedere gebruiker** (dus ook gezinsleden) mag voor de kamers die hij ziet de
  verwarming aan/uit zetten, een timer zetten en een starttijd plannen.

## 3. Doelen, niet-doelen, anti-doelen

**Doelen**
- Betrouwbaar seintje als verwarming (ongewenst) aan staat.
- Verwarming vooruit kunnen plannen (starttijd + auto-uit).
- Werkt als een app op de iPhone van Olivier en de gezinsleden.
- Per persoon instelbaar wat men ziet en waarover men meldingen krijgt.

**Niet-doelen (voor deze eerste versie)**
- Geen temperatuur-instellen. We werken met aan/uit; de temperatuur tonen we
  alleen ter info (als Tuya die geeft).
- Geen herhalende schema's. Starttijden gelden eenmalig voor vandaag.
- Geen automatisch uitzetten bij de ochtend- of lang-aan-melding; die melden
  alleen, de gebruiker beslist zelf.
- Geen App Store-app en geen Android-specifiek werk; het is een web-app.
- Niet ingebouwd in de bestaande BD-CRM; dit wordt een losse app.

**Anti-doelen (dit zou een mislukking zijn, ook al "werkt" het technisch)**
- Een lang-aan-melding midden in de nacht sturen.
- Iemand een melding sturen over, of een kamer laten bedienen die, hij niet
  zou mogen zien.
- Een kamer die echt aan staat tijdens de ochtendcheck missen. Liever een keer
  te veel een seintje dan een gemiste "stond de hele dag aan".

## 4. Hoe het onder de motorkap werkt (keuzes die ik maak)

Deze keuzes maak ik als bouwer; ze staan open voor bijstelling.

- **Vorm: een web-app die je op het iPhone-beginscherm zet (PWA).** Krijgt een
  eigen icoon, opent schermvullend, voelt als een echte app. Geen App Store,
  geen Apple-kosten, geen goedkeuringsronde.
- **Techniek:** dezelfde vertrouwde stack als de CRM: React + Vite aan de
  voorkant, Supabase (database + inloggen) en Vercel (hosting + achtergrondtaken
  via cron) aan de achterkant. Zo kan er vlot op gebouwd worden. Het wordt een
  **apart project** met een eigen database, maar het draait onder hetzelfde
  Vercel Pro-account als de CRM, zodat de achtergrondtaak elke 5 minuten mag
  draaien (dat kan niet op een gratis account).
- **Verbinding met de verwarming:** onze achterkant praat via de **Tuya Cloud
  API** met een enkel huishoud-account. Gezinsleden hoeven zelf niets met Tuya
  te doen; zij gebruiken onze app, en onze achterkant regelt de verbinding.
- **Meldingen:** via Web Push (de standaard voor web-apps). De melding is
  tikbaar en opent de app op het kamer-overzicht. Op de iPhone werkt dit alleen
  als de app op het beginscherm staat en de gebruiker eenmalig toestemming voor
  meldingen geeft. Voor deze eerste versie is push het enige meldingskanaal
  (bewuste keuze: geen e-mail-back-up); het kamer-overzicht dient als vangnet om
  zelf te checken.
- **Inloggen gezinsleden (voorstel):** Olivier nodigt mensen uit; zij loggen in
  via een inlog-link of e-mail + wachtwoord (Supabase Auth). Elk persoon heeft
  een eigen account, want de meldingen zijn persoonlijk.

### Allereerste stap: een hardware-test (go/no-go)

Voordat er iets gebouwd wordt, doen we een kleine test op de echte thermostaten:
account koppelen, de status uitlezen, en een kamer een keer aan- en uitzetten via
de Tuya-koppeling. Dat de koppeling kan *uitlezen* is aannemelijk; dat ze deze
specifieke apparaten ook kan *aansturen* weet ik pas 100% zeker na die test.
Lukt het aansturen onverhoopt niet, dan kan de app nog steeds de meldingen geven,
maar vervalt het op afstand aan/uit zetten, de timer en de starttijd. Daarom is
dit de eerste stap: eerst zekerheid, dan pas de rest.

## 5. Datamodel (schets)

- **gebruikers**: id, naam, e-mail, rol (beheerder of lid), kijk-bereik
  (eigen kamer of alle kamers; alleen van toepassing op leden).
- **kamers**: id, naam, Tuya-apparaat-id, eigenaar (verwijst naar een
  gebruiker), laatst bekende status (aan/uit), aan-sinds (tijdstip waarop hij
  aanging), laatst bekende temperatuur (optioneel). Een persoon kan eigenaar van
  meerdere kamers zijn.
- **push-aanmeldingen**: id, gebruiker, apparaat-gegevens voor Web Push
  (een gebruiker kan meerdere apparaten hebben).
- **geplande-acties**: id, kamer, type (aan of uit), uitvoeren-op (tijdstip),
  aangemaakt-door, status (gepland / uitgevoerd / mislukt / geannuleerd). Dit
  dekt zowel de auto-uit-timer (punt 3), de geplande starttijd (punt 4) als de
  combinatie.
- **meldingen-logboek**: om dubbele meldingen te voorkomen (per kamer bijhouden
  of/wanneer een lang-aan- of ochtendmelding al verstuurd is voor de huidige
  aan-periode).

## 6. Achtergrondtaken (cron op Vercel)

Alle tijden (de 9:00-check en het 9:00-23:00-venster) rekenen we in Nederlandse
tijd (Europe/Amsterdam, inclusief zomer- en wintertijd), ook al draait de cron
intern op UTC.

1. **Status-poller (voorstel: elke 5 minuten).** Haalt voor elke kamer de
   Tuya-status op en werkt "status" en "aan-sinds" bij (van uit naar aan zet
   aan-sinds op nu; van aan naar uit wist het). Deze taak doet meteen drie
   dingen:
   - **Geplande acties uitvoeren:** alle acties waarvan het tijdstip is bereikt
     (aan/uit-commando naar Tuya sturen, status bijwerken).
   - **Lang-aan-wachthond:** als een kamer vandaag aanging, nu tussen 9:00 en
     23:00 valt, en onafgebroken langer dan de drempel (standaard 6 uur) aan
     staat, en er voor deze aan-periode nog geen lang-aan-melding is verstuurd,
     dan een melding naar de eigenaar (en naar de beheerder). Een aan-periode
     die gisteravond begon telt hier bewust niet mee; die wordt door de
     ochtendmelding opgevangen.
   - De poll-frequentie bepaalt de nauwkeurigheid van starttijd en auto-uit
     (ongeveer plus/min 5 minuten). Dat is voor dit doel ruim voldoende.

2. **Ochtend-check (dagelijks om 9:00).** Verzamelt alle kamers die aan staan,
   groepeert ze per persoon, en stuurt elke persoon een melding over zijn
   kamer(s); de beheerder krijgt de volledige lijst. Alles uit betekent geen
   melding.

### Regels bij timers en geplande acties

Om verrassend gedrag te voorkomen (een kamer die zichzelf onverwacht weer
uitzet):
- Een nieuwe timer of starttijd voor een kamer vervangt een eventuele vorige van
  hetzelfde type voor die kamer.
- Zet iemand een kamer handmatig uit, dan vervalt een lopende auto-uit-timer voor
  die kamer (die is niet meer nodig). Een nog niet uitgevoerde starttijd blijft
  wel staan.
- Bij de combinatie "aan om 16:00, 3 uur lang" wordt het uitzetten gerekend vanaf
  het echte aan-moment (dus uit om 19:00), niet vanaf een vast kloktijdstip.
- Zetten twee mensen (eigenaar en beheerder) iets tegenstrijdigs, dan wint de
  laatste instelling.

Dit zijn mijn keuzes; ze staan open voor bijstelling.

## 7. Randvoorwaarden en risico's (eerlijk vooraf)

- **Eenmalige Tuya-opzet.** Er moet een gratis Tuya IoT-ontwikkelaarsaccount
  worden aangemaakt en aan het Warmme/Tuya-account gekoppeld. Dit is wat
  klikwerk; Olivier wordt er stap voor stap doorheen geloodst. Let op dat het
  Tuya-project/tegoed actief blijft (een proef-tegoed kan verlopen).
- **Datapunt-codes verschillen per model.** Bij Tuya heet de aan/uit-schakelaar
  per thermostaat-model anders (een zogenaamde dp-code). De bouwer moet eerst de
  status van een echte thermostaat opvragen om de juiste code te vinden.
- **iPhone-meldingen vereisen beginscherm-installatie.** Elk gezinslid moet de
  app eenmalig op het beginscherm zetten en toestemming voor meldingen geven,
  anders komt de push niet binanen.
- **Afhankelijk van de Tuya-cloud.** Als Tuya tijdelijk traag of onbereikbaar
  is, kan een actie vertragen. De app moet daar netjes mee omgaan (opnieuw
  proberen, niet stilletjes falen).

## 8. Wat ik aan de bouwer overlaat

- De exacte Tuya dp-codes per thermostaat (uit te zoeken op het echte apparaat).
- De precieze inlogmethode voor gezinsleden (voorstel: inlog-link of
  e-mail + wachtwoord via Supabase).
- De exacte poll-frequentie (voorstel: 5 minuten).
- Alle UI-details: kleuren, namen, exacte tekst van de meldingen.
- Hoe de "eigenaar" van een kamer gekozen wordt als er meerdere bewoners zijn
  (voor v1: een enkele eigenaar per kamer).

---

## 9. Bijgewerkt op 2026-11-14 (na fase 1)

Dit hoofdstuk gaat voor op de tekst hierboven waar die elkaar tegenspreken.

**Stand.** Fase 1 staat online (kamer-overzicht, aan/uit, alles uit, inloggen,
app op het beginscherm). De go/no-go is geslaagd. De thermostaten zijn verhuisd
van de afgeschermde Warmme-app naar de gewone Tuya-app; dat account is gekoppeld.

**Inloggen (keuze van Olivier, vervangt het voorstel in hoofdstuk 4 en 8).**
Geen e-mail en geen Supabase Auth. Elke telefoon voert eenmalig een gedeelde
huiscode in. Daarna kiest de gebruiker een vaste combinatie van cijfer en kleur:
1 rood Saskia, 2 geel Britt, 3 blauw Nine, 4 roze Anouk, 5 kobalt Olivier
(beheerder), 6 cyaan Luka. Cijfer plus kleur is herkenning, geen slot: binnen
het gezin kan iemand een andere combinatie kiezen.

**Datamodel (vervangt hoofdstuk 5 waar het afwijkt).** Tabel `personen` in
plaats van `gebruikers`; `toestellen` per telefoon; een kamer kan meerdere
bewoners hebben (SasOlle is van Saskia en Olivier samen).

**Keuzes voor fase 2 (door de bouwer gemaakt, Olivier zei "go" zonder de
vragen te beantwoorden; alles is later bij te stellen).**
- Fase 2 wordt in twee stappen opgeleverd. 2a: timer, starttijd en de
  achtergrondtaak. 2b: meldingen, rechten per persoon en het beheerscherm.
- Starttijd: een tijdstip binnen de komende 24 uur. Is het tijdstip vandaag al
  voorbij, dan geldt het voor morgen (handig voor "morgenochtend 6:30 warm").
  Nog steeds eenmalig, niet herhalend.
- Timerduur: 1, 2, 3, 4, 6 of 8 uur.
- De achtergrondtaak draait elke 5 minuten en haalt de aan/uit-stand van alle
  kamers in een enkel Tuya-verzoek op (zuinig met het Tuya-tegoed).
- Een automatisch uitzetten dat mislukt wordt elke ronde opnieuw geprobeerd tot
  het lukt of iemand het annuleert. Een automatisch aanzetten wordt hooguit
  drie rondes geprobeerd en niet meer uitgevoerd als het meer dan een uur te
  laat is (liever niet aan dan uren te laat aan).
- Standaard ziet iedereen alle kamers (zoals in fase 1); Olivier kan dat per
  persoon beperken tot de eigen kamer.
- Meldingen over een kamer gaan naar de bewoners van die kamer en naar de
  beheerder. Per persoon aan en uit te zetten in het beheerscherm.
- Het beheerscherm vraagt eenmalig per telefoon om een beheerderscode, die
  Olivier bij het eerste gebruik in de app zelf kiest.

---

## 10. Energietab (toegevoegd 2026-11-14, akkoord van Olivier op het voorbeeldscherm)

**Waarom.** Olivier vindt het overzicht in de HomeWizard-app onhandig en wil in
Warm een rustiger overzicht van net, zonnepanelen en thuisbatterij.

**Wat er thuis staat.** P1-meter HWE-P1 (serie 3c39e72cab62, 3 fasen, met
gasmeter) en een Plug-In Battery HWE-BAT (serie 5c2faf3f2308). De opwek van de
panelen komt van SolarEdge en zit niet in de HomeWizard-apparaten. Een Synology
NAS staat altijd aan.

**Stap 1 (dit hoofdstuk): net, batterij en gas.**
- Een klein Python-programma op de NAS leest elke 30 seconden de meter en de
  batterij uit via de officiële lokale HomeWizard-koppeling v2 (HTTPS, token
  per apparaat na een druk op de knop) en stuurt de standen naar Warm.
- Warm bewaart de laatste stand en elke 5 minuten een momentopname van de
  tellerstanden. De geschiedenis begint op de dag van de koppeling.
- Scherm "Energie", bereikbaar met een pictogram op het hoofdscherm (geen
  tabbalk, zodat het hoofdscherm op een telefoonscherm blijft passen): vier
  vakjes Nu (Zon, Huis, Batterij, Net), totalen van de gekozen periode en een
  staafgrafiek per uur, dag of maand met de keuze Dag, Week, Maand, Jaar.
- Zon en Huis tonen "volgt nog" tot SolarEdge gekoppeld is.
- Iedereen die is ingelogd mag het scherm zien.
- Komt er 5 minuten niets binnen, dan zegt het scherm sinds wanneer de
  gegevens stilstaan.

**Stap 2 (later): SolarEdge.** Via de nieuwe SolarEdge-koppeling (v2, toegang
per eigenaar). Daarna worden Zon, Huis en "eigen stroom gebruikt" gevuld.

**Stap 3 (later): bedragen in euro's.** Tarieven vult Olivier zelf in Beheer
in; er wordt niet ingelogd bij de energieleverancier.

**Niet doen.** Niet inloggen op het HomeWizard-account of namaken van de app.
Het programma op de NAS stuurt de batterij nooit aan (alleen lezen, nooit een
PUT naar `/api/batteries` of `/api/system`). De sleutel waarmee de NAS naar
Warm schrijft mag alleen metingen aanleveren en niets anders.

**Keuzes van de bouwer.**
- Teken van het batterijvermogen: positief is laden (afgeleid uit de
  voorbeelden in de HomeWizard-documentatie, daar niet uitdrukkelijk
  vastgelegd). Na de koppeling controleren met echte waarden.
- Het programma zoekt een apparaat zelf opnieuw op in het thuisnetwerk als het
  adres verandert, en herkent het aan het serienummer in het certificaat.
- De gasstand wordt meegestuurd en als regel in de totalen getoond.

---

## 11. SolarEdge (toegevoegd 2026-11-14, Olivier: "start stap 2, SolarEdge koppelen")

**Wat.** De opwek van de zonnepanelen komt uit SolarEdge. Daarmee worden in het
scherm Energie de vakjes Zon en Huis gevuld en komen er totalen bij: Verbruikt,
Opgewekt en Eigen stroom (het deel van het verbruik dat niet van het net kwam).
De grafiek toont dan verbruik boven en opwek onder de nullijn.

**Hoe.** SolarEdge heeft sinds 3 november 2026 alleen nog de Monitoring API v2.
Een huiseigenaar maakt op developer.solaredge.com een eigen app (Site Access)
en geeft die met zijn SolarEdge-inlog toestemming. Olivier doet dat zelf; Warm
krijgt alleen een toegangsbewijs dat het zelf ververst. Het gratis pakket geeft
2000 verzoeken per maand en 10 per minuut.

**Gevolgen van dat tegoed.** De opwek ververst overdag elk kwartier (in het
donker en vroeg in de ochtend minder vaak of niet), niet per seconde. "Huis nu"
is daardoor een benadering: net en batterij zijn live, de zon is het gemiddelde
van het laatste kwartier.

**Geschiedenis.** De dagopwek van eerdere jaren wordt in de dagen na het
koppelen jaar voor jaar opgehaald (een verzoek per kwartier), zodat ook het
verbruik van voor de koppeling klopt.

**Niet doen.** Warm vraagt alleen leestoegang tot de installatie (scope
SITE_DATA) en stuurt niets aan. Het Client Secret en de tokens staan alleen in
Vercel, in `.env` en in de database achter de service-sleutel, en komen nooit
in een antwoord van de app of in een logregel.

**Keuzes van de bouwer.**
- Koppelen gebeurt vanuit Beheer in een gewone browser (niet vanuit de app op
  het beginscherm van een iPhone, die deelt zijn inlog niet met Safari).
- Huisverbruik = van het net - teruggeleverd + opwek - batterij geladen +
  batterij ontladen. De thuisbatterij hangt aan de wisselstroomkant, dus dat
  klopt.
- De naam van het tijdveld in het antwoord van SolarEdge stond niet in de
  openbare handleiding; de code probeert de gangbare namen en slaat niets op als
  geen ervan past.

---

## 12. Bedragen in euro's (toegevoegd 2026-11-15, Olivier: "start stap 3, bedragen in euro's")

**Wat.** Het scherm Energie toont per gekozen periode wat stroom en gas hebben
gekost: stroom van het net, teruglevering, gas, vaste kosten en het totaal. Bij
Nu staat wat stroom op dit moment per kWh kost. De bedragen zijn een indicatie;
de factuur van de leverancier blijft leidend.

**Contract (opgegeven door Olivier op 2026-11-14).** Innova Energie. Stroom
dynamisch: de uurprijs van de beurs plus een inkoopvergoeding. Gas "3 jaar vast"
van 2 mei 2025 tot 2 mei 2028. Bedragen zonder btw: inkoopvergoeding 0,01027 per
kWh, afslag bij teruglevering 0,02280 per kWh, gas 0,53584 per m3, vaste
leveringskosten 79,00 per jaar voor stroom en 79,00 voor gas, netbeheer Liander
395,08 (stroom) en 220,35 (gas) per jaar.

**Belasting (opgezocht 2026-11-15).** 2026: energiebelasting stroom 0,09161 per
kWh, gas 0,60066 per m3, vermindering energiebelasting 519,80 per jaar, btw 21%.
Controle: (0,53584 + 0,60066) x 1,21 = 1,37517, precies het gasbedrag "incl. btw
en heffingen" dat Olivier opgaf. 2027 (voorstel Belastingplan, nog niet door de
Eerste Kamer, bronnen spreken elkaar tegen): stroom 0,08802, gas 0,61628,
vermindering 519,58. Salderen stopt op 1 januari 2027.

**Uurprijzen.** Openbaar en zonder inlog: de day-ahead prijzen voor Nederland
via api.energy-charts.info (Fraunhofer ISE, gegevens van Bundesnetzagentur |
SMARD.de, licentie CC BY 4.0, kwartierwaarden) met api.energyzero.nl als
reserve (uurwaarden). Nagemeten op 15-11-2026: het gemiddelde van de vier
kwartieren is exact de uurprijs van de reserve. Innova rekent per uur (eigen
uitleg op innovaenergie.nl), dus Warm rekent met het uurgemiddelde. De prijzen
van morgen komen rond 13:00 uur.

**Rekenregels.** Per uur, met de tarieven die op die dag gelden:
- Stroom van het net: kWh x (uurprijs + inkoopvergoeding + energiebelasting) x
  (1 + btw).
- Teruglevering met salderen (tot en met 2026): dezelfde prijs per kWh als
  afname, als min-bedrag.
- Teruglevering zonder salderen (vanaf 2027): kWh x (uurprijs - afslag), zonder
  btw. Bij een negatieve uurprijs kost terugleveren dus geld.
- Gas: m3 x (leveringstarief + energiebelasting gas) x (1 + btw).
- Vaste kosten: (vaste leveringskosten en netbeheer van stroom en gas, min de
  vermindering energiebelasting) x (1 + btw), gelijk verdeeld over de uren van
  het jaar.

**Vanaf wanneer.** Bedragen zijn er vanaf het eerste hele uur met metingen per
5 minuten: 14 november 2026 13:00 uur. Van de periode daarvoor zijn alleen
dagstanden bekend en is niet zeker welk contract er gold; daar toont het scherm
geen bedragen. Een uur telt mee zodra het voorbij is; het lopende uur nog niet.

**Tarieven beheren.** In Beheer staat een onderdeel Energietarieven. Een set
tarieven geldt vanaf een datum; er staan er twee klaar (1 januari 2026 en
1 januari 2027, de tweede zonder salderen en met het belastingvoorstel voor
2027). Olivier kan een set aanpassen, een nieuwe ingangsdatum toevoegen en een
set verwijderen. Bedragen worden bij het tonen uitgerekend, dus een verbeterd
tarief werkt ook terug op eerdere dagen. Alle invoer is zonder btw, zoals op
het tarievenblad van de leverancier.

**Niet doen.** Niet inloggen bij Innova. Geen persoonsgegevens meesturen naar
de prijsbronnen (alleen land en periode).

**Keuzes van de bouwer.**
- Vanaf 2027 krijgt teruglevering geen btw-opslag (gangbaar voor particulieren);
  te controleren op de eerste factuur van 2027.
- De wettelijke ondergrens bij dynamische contracten (de gemiddelde vergoeding
  over een maand mag niet negatief zijn) zit er nog niet in. In de zomer van
  2027 opnieuw bekijken.
- Het jaar telt voor de vaste kosten 8760 uur, ook in een schrikkeljaar.
- Een uur zonder bekende prijs telt niet mee voor stroom; het scherm meldt dan
  dat een deel van de uren nog geen prijs heeft.
- Was de NAS een tijd stil, dan komt het verbruik van die stilte in het uur
  waarin de stilte begon, tegen de prijs van dat uur.
- Geen grafiek in euro's en geen overzicht van de prijzen van vandaag en
  morgen; dat kan een volgende stap zijn.

---

## 13. Vloerverwarming beneden (toegevoegd 2026-11-19, Olivier: "alleen zien voor nu is voldoende")

**Waarom.** Beneden ligt vloerverwarming op gas, geregeld door twee Honeywell
Home-thermostaten die Olivier nu via de Resideo-app bedient. Hij wil ze in Warm
zien ("handig en leuk") en vooral leren wat een nachttemperatuur kost: scheelt
een graad lager echt, of kost het juist meer omdat de vloer 's ochtends hard
moet bijstoken? Zijn voorwaarde: het kostenoverzicht is alleen iets waard met
de binnen- en de buitentemperatuur erbij, "dan kunnen we er echt iets uit
afleiden en eventueel op acteren".

**Wat er thuis staat.** Twee Lyric T6 (HomeKit-model T5/T6, firmware 6.0.1):
Keuken (`Tstat-5EA908`) en Zitkamer (`Tstat-951FE9`). Gas gaat in dit huis
alleen naar verwarming en warm water (koken is op inductie). Tussen 00:00 en
06:00 uur wordt er niet gedoucht, dus dan is al het gas verwarming.

**Welke koppeling, en waarom deze.** De officiële Honeywell-koppeling valt af:
de ontwikkelaarssite neemt geen nieuwe accounts meer aan (nagekeken op
2026-11-19) en de voorwaarden staan maar 10 dagen bewaren toe. De
niet-officiële koppelingen die de app nadoen werken niet in Europa of vragen
het Resideo-wachtwoord in een script. Wat wel werkt is HomeKit binnen het
thuisnetwerk, zonder account en zonder internet. Op 2026-11-19 zijn beide
thermostaten zo gekoppeld en uitgelezen met een proefprogramma op de Mac
(`warm-app/.superpowers/proef-homekit`, gebouwd op de bibliotheek aiohomekit).

**Wat een thermostaat geeft (gemeten in de proef).** Gemeten temperatuur in
stappen van een halve graad, doeltemperatuur (5 tot 35 graden), stand (uit of
verwarmen) en of hij op dit moment warmte vraagt ("stookt nu"). Geen
luchtvochtigheid en geen weekschema. In de proef stond de ene op "stookt" en
de andere op "rust" bij dezelfde gemeten en ingestelde temperatuur, dus
"stookt nu" is een eigen gegeven van de thermostaat.

**Doelen.**
- De twee thermostaten in Warm zien: gemeten temperatuur, doeltemperatuur en
  of ze stoken.
- Per etmaal vastleggen wat er binnen en buiten gebeurde en wat het aan gas
  kostte, zo dat nachten met een verschillende instelling eerlijk te
  vergelijken zijn.

**Niet-doelen.**
- Bedienen. De doeltemperatuur is via HomeKit in te stellen, maar Olivier wil
  voor nu alleen zien. Het programma krijgt er dus geen mogelijkheid voor.
- Het weekschema tonen of aanpassen (zit niet in HomeKit).
- De thermostaten in de Woning-app van Apple houden (zie Gevolgen).
- Gas per kamer uitsplitsen. Er is één gasmeter.

**Anti-doelen.**
- Een antwoord dat stelliger klinkt dan de metingen toelaten. Het scherm toont
  een vergelijking pas als er genoeg etmalen zijn en noemt het een indicatie.
- Een thermostaat die door Warm verandert zonder dat iemand dat vroeg.

**Hoe het uitlezen werkt.**
- Het programma op de NAS, dat al de P1-meter en de batterij uitleest, leest
  ook de twee thermostaten uit, elke ronde (30 seconden) en binnen het
  thuisnetwerk. Het praat HomeKit met de sleutels die bij het koppelen op de
  Mac zijn gemaakt. Koppelen zelf blijft een handeling op de Mac met het
  proefprogramma; de NAS hoeft dat niet te kunnen.
- De NAS houdt per thermostaat twee tellers bij die alleen oplopen, net als
  een meter: hoe lang hij de thermostaat heeft gezien, en hoe lang die in die
  tijd stookte. Tellers overleven een gemiste melding en een herstart. Een
  gat langer dan anderhalve minuut telt niet mee als gezien.
- De NAS stuurt per ronde de stand en de tellers naar Warm, via een eigen
  ingang naast die van de energiemetingen en met hetzelfde geheim. Valt het
  uitlezen van de thermostaten uit, dan gaan de energiemetingen gewoon door,
  en andersom.
- Warm bewaart per thermostaat de laatste stand en elke 5 minuten een
  momentopname (gemeten, doel, stookt, stand, tellers).

**Buitentemperatuur.** Uit een openbare weerbron zonder inlog: Open-Meteo
(licentie CC BY 4.0), de temperatuur per uur. In Beheer vult Olivier één keer
een plaatsnaam in; Warm zoekt daar het middelpunt van die plaats bij en
gebruikt alleen dat. Elk uur haalt een cron de uren van vandaag en gisteren
op. Dit is een berekende temperatuur voor de plaats, geen meting in de tuin;
voor het vergelijken van nachten is dat ruim voldoende.

**Schermen.**
- Hoofdscherm: één extra regel "Beneden" met per thermostaat de naam, de
  gemeten temperatuur en een stipje als hij stookt. Geen schuif en geen knop
  Plannen. Het hoofdscherm moet op één telefoonscherm blijven passen. Een tik
  opent het scherm Vloerverwarming.
- Scherm Vloerverwarming, onderdeel Nu: per thermostaat gemeten temperatuur,
  doeltemperatuur ("ingesteld op 20°") en "stookt" of "in rust", plus de
  buitentemperatuur van dit uur.
- Onderdeel Laatste 24 uur: per thermostaat een grafiek met de gemeten
  temperatuur als lijn, de doeltemperatuur als trapjeslijn, de tijd dat hij
  stookte als balk onderin, en de buitentemperatuur als tweede lijn.
- Onderdeel Per etmaal: een lijst, nieuwste boven, met per etmaal de
  nachtinstelling van elke thermostaat, de gemiddelde buitentemperatuur, hoe
  lang elke thermostaat stookte, het gas en het bedrag.
- Onderdeel Vergelijken: de etmalen gegroepeerd per combinatie van de twee
  nachtinstellingen (bijvoorbeeld "Keuken 19°, Zitkamer 20°"; staan beide
  gelijk, dan kortweg "Nacht op 20°"), met per groep het aantal etmalen, de
  gemiddelde buitentemperatuur, het gemiddelde gas en het gas per graad
  verschil tussen binnen en buiten. Er is één gasmeter, dus alleen de
  combinatie zegt iets. Olivier (2026-11-19): "'s nachts kunnen ze dezelfde
  temperatuur hebben, overdag zullen ze wat verschillen". De gewone groep is
  dus "Nacht op 20°"; de vorm met twee namen is er voor de nachten dat ze toch
  verschillen.
- Iedereen die is ingelogd mag het scherm zien, zoals bij Energie.
- Komt er 5 minuten niets binnen van een thermostaat, dan zegt het scherm
  sinds wanneer die stilstaat.

**Waarom per etmaal en niet per nacht.** Vloerverwarming is traag. Een lagere
nachtstand bespaart gas in de nacht en kost gas in de ochtend, als de vloer
weer op temperatuur moet komen. Wie alleen de nacht telt, ziet altijd winst.
Daarom loopt een etmaal van 12:00 uur tot 12:00 uur de volgende dag: de avond,
de nacht en het bijstoken in de ochtend zitten dan in één blok. Het gas van
00:00 tot 06:00 staat er apart bij, omdat dat zeker alleen verwarming is.

**Rekenregels.**
- Nachtinstelling van een thermostaat: de doeltemperatuur die tussen 00:00 en
  06:00 het langst gold.
- Gas en bedrag van een etmaal: het verschil in gasstand, tegen het gastarief
  uit hoofdstuk 12 (zonder vaste kosten). Dit is al het gas, dus met warm
  water; het scherm zegt dat erbij.
- Warm water, geschat (toegevoegd 2026-11-24, Olivier: "Ja, zet erin"). Per
  vak van 5 minuten: gas dat verbruikt is terwijl geen van beide thermostaten
  stookte, in dat vak en in het vak ervoor, telt als warm water. Het vak
  ervoor telt mee omdat de ketel na een warmtevraag nog even kan doorbranden.
  Gas tussen 00:00 en 06:00 telt altijd als verwarming. De rest van het gas
  is verwarming. Per etmaal toont het scherm het totaal, met daaronder
  "waarvan warm water (schatting)" en "verwarming". Douchen terwijl de vloer
  stookt valt hierdoor onder verwarming, dus het warme water is eerder te
  laag dan te hoog geschat; het scherm noemt het een schatting.
  Achtergrond: een douche van 10 minuten kost ongeveer 0,3 m3 gas en een bad
  ongeveer 0,5 m3, tegenover ruim 1 m3 voor een nacht verwarmen. Zonder deze
  splitsing vertekent één bad de vergelijking tussen twee nachtstanden.
  De HomeWizard-watermeter zou het douchen tijdens het stoken ook kunnen
  splitsen, maar die werkt niet meer (Olivier, 2026-11-24). Komt er ooit een
  werkende watermeter, dan leest de NAS die uit zoals de P1-meter en wordt
  deze regel scherper; tot dan wordt er niets voor gebouwd.
- Gas per graad verschil: het verwarmingsgas van het etmaal (dus zonder het
  geschatte warme water) gedeeld door (gemiddelde gemeten temperatuur van
  beide thermostaten min gemiddelde buitentemperatuur). Zo wordt een koude
  nacht niet met een zachte vergeleken. Is het verschil kleiner dan 2
  graden, dan blijft het getal weg.
- Gezien tijd en stooktijd van een etmaal: de som van de stijgingen tussen
  opeenvolgende momentopnamen, niet "eindstand min beginstand". Een daling
  telt als 0. De tellers op de NAS kunnen namelijk terugvallen: na een
  stroomuitval of harde stop tot ruim 5 minuten, en naar nul als het
  toestandsbestand verdwijnt. Zo kost een terugval hooguit één vak van 5
  minuten in plaats van een onzinnig etmaal (eindreview stap 1, 2026-11-19).
- De momentopname bewaart ook de stand (verwarmen of uit). Stond een
  thermostaat tussen 00:00 en 06:00 het langst uit, dan is de nachtinstelling
  "uit" en niet de doeltemperatuur.
- Vergelijken toont een groep pas vanaf 5 etmalen en zet er altijd bij: "een
  indicatie; zon, wind en douchen tijdens het stoken tellen ook mee".
- Een etmaal met minder dan 90% gezien tijd of zonder buitentemperatuur telt
  niet mee in Vergelijken en staat in de lijst als onvolledig.

**Vanaf wanneer.** Vanaf de eerste hele 12:00 uur nadat de NAS de
thermostaten uitleest. Er is geen geschiedenis van voor die tijd.

**Gevolgen waar Olivier mee instemt door dit te bouwen.**
- HomeKit kent één eigenaar. De thermostaten kunnen niet tegelijk in de
  Woning-app van Apple. De Resideo-app blijft gewoon werken.
- Kiest iemand op een thermostaat opnieuw "Reset HomeKit", dan is de koppeling
  weg en moet er opnieuw gekoppeld worden met het proefprogramma op de Mac.
- De thermostaat laat zijn verbinding soms vallen als hij van wifi-punt
  wisselt (ervaring van een andere bouwer met dit model). Het programma
  verbindt dan vanzelf opnieuw; in de gezien-teller zit dan een klein gat.

**Niet doen.**
- Het NAS-programma stuurt nooit een instelling naar een thermostaat. Het mag
  alleen de drie verzoeken doen die nodig zijn om te lezen: de beveiligde
  verbinding opzetten, de lijst met gegevens ophalen en waarden opvragen.
  Schrijven wordt in de code geweigerd, net als nu bij de HomeWizard.
- De HomeKit-sleutels staan alleen in de proefmap op de Mac en in het
  NAS-pakket (beide buiten git). Nooit in de database, in Vercel, in een
  logregel of in de chat. Met die sleutels kan iemand in het thuisnetwerk de
  thermostaat bedienen.
- Niet inloggen op het Resideo-account en de Resideo-app niet namaken.
- Naar de weerbron gaat alleen het middelpunt van de plaats. Geen adres en
  geen postcode.
- Tests en controles sturen nooit een echte instelling naar een thermostaat.

**Volgorde.**
1. NAS leest uit, Warm bewaart, de regel op het hoofdscherm en het onderdeel
   Nu. Daarna controleren met echte waarden, vooral of "stookt nu" omslaat
   als de ketel aangaat en of de tellers kloppen.
2. Buitentemperatuur en de grafiek van 24 uur.
3. Per etmaal en Vergelijken.

**Keuzes van de bouwer (Claude), te herzien als ze tegenvallen.**
- Het NAS-programma blijft alleen de standaardbibliotheek van Python
  gebruiken (3.8 en hoger), zoals nu. HomeKit vraagt versleuteling die daar
  niet in zit (X25519, Ed25519, ChaCha20-Poly1305). Die wordt in gewone
  Python uitgeschreven en getest tegen de officiële testwaarden uit de
  standaarden (RFC 7748, 8032, 8439) en tegen een nagebootste thermostaat op
  de Mac. Het mag een tweede bestand naast `warm_energie.py` worden.
  Aiohomekit op de NAS zetten is afgewogen en afgevallen: het vraagt een
  nieuwere Python en gecompileerde onderdelen die op een Synology niet
  vanzelf beschikbaar zijn.
- De NAS vraagt de waarden elke ronde op en luistert niet naar meldingen van
  de thermostaat. Dat is eenvoudiger en een halve minuut is voor
  vloerverwarming nauwkeurig genoeg.
- Verandert het adres van een thermostaat, dan zoekt het programma hem
  opnieuw in het thuisnetwerk en herkent hem aan zijn HomeKit-sleutel.
- De namen Keuken en Zitkamer en hun volgorde staan vast in de database; er
  komt geen beheerscherm voor.
- De sleutels gaan met `scripts/maak-nas-pakket.mjs` mee in het NAS-pakket,
  dat nu ook al het geheim voor de energiemetingen bevat.

**Wat ik aan de bouwer overlaat.** De namen van tabellen, kolommen en
bestanden; de precieze vorm van het bericht van de NAS; hoe de grafiek
getekend wordt binnen de bestaande stijl van het scherm Energie; de teksten
van foutmeldingen.

---

## Bijlage: bronnen over de Tuya-koppeling

- Home Assistant forum, "WarmMe Intergration (Tuya?)":
  https://community.home-assistant.io/t/warmme-intergration-tuya/239238
