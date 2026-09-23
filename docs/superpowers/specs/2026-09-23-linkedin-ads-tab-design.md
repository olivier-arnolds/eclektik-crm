# LinkedIn-advertentieresultaten in de Marketing-tab

Ontwerp, 23 september 2026. Goedgekeurd door Olivier.

## Waarom

Eclectik adverteert sinds 14 september op LinkedIn (campagne MSFT-Sellers, twee
advertentievarianten). De cijfers leven alleen in Campaign Manager. De vraag die
onbeantwoord blijft is niet "wat kost het" maar "welke tekst werkt": de twee
varianten verschillen alleen in boodschap, en dat verschil is pas zichtbaar als je
besteding, vertoningen en kliks naast de advertentietekst zet.

## Waarom geen automatische koppeling

Drie routes zijn afgewogen:

* **LinkedIn Marketing API.** De nette route, maar vereist een goedgekeurde app.
  Aanvraagprocedure van dagen tot weken. Later alsnog mogelijk bovenop dit
  datamodel, zonder de tab te verbouwen.
* **Agent die dagelijks inlogt.** Afgewezen. Vereist wachtwoorden, en LinkedIn
  gaat geautomatiseerd inloggen tegen. Het risico landt op het account waarmee
  Marco via Unipile de outreach-DM's verstuurt; een beperking daarop kost meer dan
  dit dashboard oplevert.
* **Periodiek gemailde export.** Zou ideaal zijn (we lezen al een mailbox voor de
  outreach-inboxscan), maar Campaign Manager biedt die optie niet, nagekeken door
  Olivier op 23 september.

Blijft over: handmatig uploaden. Bij een wekelijkse export is dat een handeling
van een halve minuut.

## Het bestandsformaat (uit twee echte exports)

Geen gewone CSV. Wat de parser moet weten:

* **UTF-16** met BOM, **tab**-gescheiden.
* Vier regels aanhef plus een lege regel; de kolomkoppen staan op regel 6.
* 81 kolommen met **Nederlandse** labels.
* Getallen met **komma** als decimaalteken en aanhalingstekens eromheen
  (`"9,36"`), percentages als tekst (`"0,341%"`). Uitzondering: `Gemiddelde
  kijktijd` staat met een punt (`6.2527773973`). Beide vormen moeten door.
* De bestandsnaam zegt niets betrouwbaars: `campaign_891312023_...` en
  `creative_1547643083_...` zijn allebei exports van dezelfde soort. De campagne-
  en advertentie-ID's staan in de rijen zelf, en daar halen we ze uit.

### Lege exports zijn normaal

De tweede export bevatte alleen de aanhef, geen kolomkoppen en geen rijen: 364
bytes. De export rapporteert **activiteit, niet instellingen**. Geen vertoning in
de gekozen periode betekent geen rij, of de campagne nu gepauzeerd is, nog moet
beginnen, of die dag niets uitleverde.

Twee gevolgen:

1. De importer moet "leeg rapport" en "onleesbaar bestand" uit elkaar houden.
   Zonder kolomkoppenregel valt er niets te herkennen, maar dat is een andere
   melding dan een bestand dat we niet begrijpen. Die twee door elkaar halen laat
   iemand zoeken naar een fout die er niet is.
2. De tab wordt een overzicht van wat besteed en geleverd is, **geen lijst van
   campagnes**. Een campagne die nooit iets uitleverde verschijnt er niet in.

## Datamodel

Tabel `linkedin_ad_stats`, sleutel `(stat_date, ad_id)`. Daarmee is opnieuw
uploaden of een overlappende periode exporteren ongevaarlijk: bestaande rijen
worden overschreven, nieuwe komen erbij. Zonder die sleutel telt een tweede
upload alles dubbel, en dat zie je pas als een bedrag niet klopt.

Uitgepakte kolommen (de twintig die het scherm gebruikt): datum, account, valuta,
campagne-ID en -naam en -status, advertentieset-ID en -naam en -doelstelling,
advertentie-ID en -naam en -status, inleidende tekst, kop, URL, besteding,
vertoningen, kliks, CTR, CPM, CPC, interacties, conversies, leads, kliks naar
bestemmingspagina.

De overige circa zestig kolommen gaan als `raw jsonb` mee in dezelfde rij. Dat
kost bijna niets en voorkomt dat een later gewenst cijfer een nieuwe upload van
alle historie vereist.

## Onderdelen

* `src/lib/linkedin-ads-parse.js` — puur: tekst in, rijen uit. Decoderen,
  aanhef overslaan, koppen vinden, Nederlandse getallen omzetten. Getest met
  vitest. Bewust los van het scherm: een verkeerd gelezen komma maakt van 9,36
  euro stilzwijgend 936.
* `src/bd/marketing-ads.jsx` — de subtab. Bestanden erin slepen, eerst tonen wat
  er gaat gebeuren (aantal rijen, periode, campagnes, nieuw tegenover
  bijgewerkt), pas daarna wegschrijven.
* `src/bd/marketing-view.jsx` — de knop Advertenties naast Analytics.
* `sql/schema_linkedin_ads_2026-09-23.sql` — de migratie.

## Het scherm

Kerncijfers over de gekozen periode bovenaan: besteed, vertoningen, kliks, CTR,
kosten per klik. Daaronder het verloop over tijd, inline SVG zonder
grafiekbibliotheek, zoals `marketing-analytics.jsx` het al doet. Onderaan een
tabel per advertentie met de kop en de inleidende tekst erbij, want de vraag is
welke boodschap werkt, niet welk volgnummer.

## Buiten scope

Geen koppeling met Google Analytics. Die heeft pas zin als de advertentie-URL's
UTM-tags dragen; ze eindigen nu op `?src=li-immersion` en `?src=li-cfo`, een
zelfbedachte parameter die GA niet herkent, waardoor dat verkeer op "Unassigned"
belandt. Omzetten naar `utm_source=linkedin&utm_medium=cpc` is losse winst en
levert pas data op vanaf het moment van omzetten.

Geen LinkedIn-API. Beide blijven mogelijk bovenop deze opslag.
