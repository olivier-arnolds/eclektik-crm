# Herinnering versturen via LinkedIn

Ontwerp, 25 september 2026. Goedgekeurd door Olivier.

Vervolg op `2026-09-25-linkedin-outreach-conversatie-design.md`. Dat ontwerp
leverde de kolom Herinnering op, met advies en zonder handeling. Dit ontwerp
voegt de handeling toe.

## Wat Olivier wil

Filteren op advies "kan", voor die selectie een herinnering klaarzetten, en die
vervolgens mondjesmaat laten uitgaan.

## Wat er al is, en waarom dat goed nieuws is

De verzendkant kent "mondjesmaat" al en heeft het op bericht 1 bewezen:

```
12 tot 25 seconden tussen elke LinkedIn-DM   (outreach-runner.js, gejitterd)
dagcap 30, weekcap 150                       (op de campagne)
maximaal 10 per batch bij LinkedIn           (in de tab afgedwongen)
groepering per bedrijf                       (geen drie collega's achter elkaar)
```

Er hoeft dus geen enkele rem bijgebouwd te worden. De enige reden dat er nu geen
tweede LinkedIn-bericht uitgaat is een harde regel in
`api/_lib/outreach-send-lib.js`:

```js
if (isLinkedIn && step === 2) { bump('geen opvolgbericht via LinkedIn'); continue; }
```

Met de reden erbij: een ongevraagd tweede DM aan iemand die niet reageerde is
precies het gedrag waar LinkedIn accounts op beperkt.

## De kern van dit ontwerp: wie mag die regel opheffen

`selectSendable` wordt gedeeld door twee aanroepers, en dat onderscheid is het
hele ontwerp:

* `api/outreach-send.js` is de knop **Verstuur batch** in de tab.
* `api/outreach-drip.js` is een **cron**, elke 20 minuten tussen 6 en 16 uur op
  werkdagen. Die verstuurt zonder dat iemand kijkt.

Olivier koos: eerst de knop, later de cron. Dat vertaalt zich naar een parameter
in plaats van een verwijdering:

```js
if (isLinkedIn && step === 2 && !linkedInStep2) { bump('geen opvolgbericht via LinkedIn'); continue; }
```

Wie geeft hem mee:

| Aanroeper | Waarde | Gevolg |
|---|---|---|
| `outreach-send.js` (knop) | `onlyStep === 2` | Alleen als je in de tab expliciet om bericht 2 vraagt |
| `outreach-drip.js` (cron) | `campaign.linkedin_followup === true` | Standaard false, dus de cron doet niets tot je hem aanzet |

Twee sloten dus, en ze staan los van elkaar. De knop werkt meteen. De cron blijft
stil tot iemand een schakelaar omzet, en die schakelaar is een kolom die nu nog
niet bestaat.

## Datamodel

Een migratie:

```sql
alter table public.outreach_campaign
  add column linkedin_followup boolean not null default false;
```

`default false` is hier de hele veiligheid: bestaande campagnes veranderen niet
van gedrag door deze release.

De tekst zelf heeft geen nieuwe kolom nodig. `outreach_contact.msg2_subject` en
`msg2_body` bestaan al en zijn voor deze campagne bij alle 154 contacten leeg.

## Hoe de tekst klaargezet wordt

**Per contact uitgeschreven, niet als sjabloon bewaard.** Zo doet bericht 1 het
ook: in `msg1_body` staat de volledige tekst met de naam en het bedrijf er al in,
niet `{{first_name}}`. De verzender leest dat veld letterlijk. Wijkt de
herinnering daarvan af, dan krijg je twee soorten records in dezelfde kolom.

### Klikken op "kan" zet die ene persoon aan

De hoofdweg, op voorstel van Olivier. In de kolom Herinnering is het woord "kan"
een knop. Klikken schrijft de tekst weg voor dat ene contact en het woord
verandert in "klaargezet". Nog een keer klikken maakt het ongedaan.

Dit is beter dan een bulkactie en niet alleen uit voorzichtigheid. Bij een
bulkactie zie je de namen wel maar bekijk je ze niet; een klik per persoon dwingt
een blik af en kost bij twintig mensen een halve minuut.

Het maakt het ontwerp bovendien eenvoudiger. **Een gevulde `msg2_body` is de
aan-stand.** Er is geen extra kolom voor nodig, en de bestaande controle in
`selectSendable` is daarmee meteen het slot:

```js
if (!body || (!isLinkedIn && !subject)) { bump('tekst ontbreekt'); continue; }
```

Wie niet is aangeklikt heeft geen tekst en krijgt dus niets, ook niet als de cron
ooit aangezet wordt. Dat is een derde slot naast de twee uit de vorige paragraaf,
en het is er een die per persoon geldt in plaats van per campagne.

### En een bulkknop ernaast

Voor als het er niet twintig maar zeventig zijn. De knop **Herinnering
klaarzetten** werkt op *precies de selectie die de lijst op dat moment toont*,
een bewuste keuze van Olivier boven "iedereen met advies kan". Hij schrijft
hetzelfde veld als de klik, dus de twee wegen kunnen niet uit elkaar lopen.

Voordat er iets wordt weggeschreven: een venster met het sjabloon, twee
voorbeelden met echte namen ingevuld, en het aantal. Pas na bevestiging.

Het sjabloon kent `{{first_name}}` en `{{company}}`, die bij het klaarzetten
worden ingevuld. Daarna staat er gewone tekst in de database.

### De taal

**De campagne is Engelstalig.** `msg1_body` begint met "Hi Mark, The use of AI is
expanding rapidly in organizations, and I assume within Arcadis as well." Een
Nederlandse herinnering op een Engelse uitnodiging leest als een ander gesprek.
Het standaardsjabloon is dus Engels.

Het standaardsjabloon, aangeleverd door Olivier:

> Just a friendly reminder. Have you been able to consider attending our session
> on the 6th?

Kort, en dat is hier juist goed. Dit is een DM-draad, dus het eerste bericht
staat er letterlijk boven. De uitnodiging opnieuw uitleggen klinkt alsof je
vergeten bent dat je hem al stuurde. Bij e-mail zou dat anders liggen.

Het venster laat de tekst bewerken en kent `{{first_name}}` en `{{company}}` voor
wie er toch een aanhef bij wil. Standaard staat er geen naam in: in een lopend
gesprek leest een aanhef als een sjabloon.

Dit valt onder §2b van CLAUDE.md: geen em-dashes, geen opsommingen, geen
markdown-koppen, hooguit een emoji, en eindigen met een open vraag of een
call-to-action maar niet allebei.

## De filters

Twee opties in het bestaande statusfilter, naast Onbeantwoord en Aangemeld:
"Herinnering kan" en "Herinnering klaargezet". De eerste filtert op
`reminderAdvies(...).advies === HERINNERING_KAN`, de functie die er sinds 1.126.0
al is. De tweede op een gevulde `msg2_body`, zodat je kunt nalopen wie je hebt
aangeklikt voordat je op versturen drukt.

Samen met het locatiefilter uit 1.128.0 is de selectie die Olivier wil dan twee
keuzes ver: Regio Amsterdam plus Herinnering kan.

## Het versturen

De tab stuurt nu geen `onlyStep` mee. Er komt een stapkeuze bij, zichtbaar zodra
er contacten met een klaargezette herinnering zijn. De knop Verstuur batch stuurt
dan `onlyStep: 2`, en daarmee gaat het eerste slot open.

Alle bestaande remmen blijven ongemoeid: maximaal 10 per batch bij LinkedIn, de
dag- en weekcap, de pauzes, de groepering per bedrijf, en de guard die iedereen
overslaat die inmiddels geantwoord heeft.

Die laatste is hier belangrijker dan ooit. Tussen het klaarzetten en het
versturen kan iemand alsnog reageren, en dan moet de herinnering vervallen. Dat
werkt al: `last_inbound_at` gevuld zonder `next_action_at` betekent stop.

## Wat bewust niet gebeurt

* **De cron aanzetten.** De kolom komt er, op false. Het omzetten is een aparte
  handeling van Olivier, later, als de eerste lichtingen goed zijn gegaan.
* **Een sjabloon bewaren op de campagne.** Nog geen tweede gebruiker van dat
  idee. Het venster onthoudt de laatste tekst binnen de sessie, meer niet.
* **Bericht 2 voor e-mailcampagnes aanpassen.** Daar loopt msg2 al en er verandert
  niets aan.

## Testen

Vitest, op de pure logica, zoals de rest van deze tab:

* `selectSendable` met `linkedInStep2` aan en uit, voor beide kanalen. Dit is de
  belangrijkste test van dit ontwerp, want hij bewaakt het verschil tussen de
  knop en de cron.
* Het aan- en uitzetten per contact: schrijven vult `msg2_body`, nog een keer
  klikken maakt hem weer leeg.
* Dat een LinkedIn-contact zonder `msg2_body` ook met de vlag aan niet verstuurd
  wordt, want de bestaande controle op ontbrekende tekst blijft gelden.
* Dat iemand met een binnengekomen antwoord overgeslagen blijft worden, ook bij
  stap 2.
* Het invullen van `{{first_name}}` en `{{company}}`, inclusief een ontbrekende
  waarde.

Let op: vier tests in `src/lib/broadcast-recipients.test.js` falen al en staan
los van dit werk.

## Volgorde van bouwen

1. De migratie, met de kolom op false. Verandert niets aan het gedrag.
2. `selectSendable` en de twee aanroepers, met de tests erbij. Nog steeds
   verandert er niets, want de knop vraagt nog nergens om stap 2.
3. De filters op "kan" en "klaargezet".
4. Het sjabloon en het klikbaar maken van "kan", plus de bulkknop.
5. De stapkeuze bij Verstuur batch. Pas hier gaat er daadwerkelijk iets uit.
