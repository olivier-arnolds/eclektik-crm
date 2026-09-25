# LinkedIn-antwoorden zichtbaar maken in cold outreach

Ontwerp, 25 september 2026. Goedgekeurd door Olivier.

## Waarom

Op 25 september staat dit in de database:

```
Amsterdam 2026          e-mail     1813 contacten    29 met antwoord
Amsterdam 2026 LinkedIn LinkedIn    154 contacten     0 met antwoord   (151 met chat)
Glint Prioriteit A      e-mail      146 contacten     nog niets verstuurd
```

De LinkedIn-DM's gingen tussen 11 en 22 september de deur uit. Nul van 151 staat
geregistreerd als beantwoord, en alle 151 staan nog op `msg1_sent`.

Dat is geen laag responspercentage, dat is een blinde vlek. `last_inbound_at`
wordt maar op één plek gezet, in `api/outreach-classify.js`, en dat is de
mailboxscan via Microsoft Graph. **Er bestaat geen LinkedIn-inboxscan.** De
campagne verstuurt DM's via Unipile en niemand kijkt ooit of er antwoord kwam.
Antwoorden zitten in Marco's LinkedIn-inbox en bereiken het CRM nooit.

Het is dezelfde soort fout als de `hold`-bug van 21 september: het ziet er
werkend uit en doet stilletjes niets.

## Wat Olivier wil zien

In het cold outreach-overzicht, per contact:

1. Of er een conversatie is geweest.
2. Of we een gentle reminder zouden kunnen sturen.

Punt 1 is voor de LinkedIn-campagne onmogelijk te tonen zolang er geen scan is.
De scan is daarom geen bijzaak maar de voorwaarde voor de rest van dit ontwerp.

## De vondst die het eenvoudig maakt

De juiste matchlogica staat al in de codebase, in `api/unipile-webhook.js`. Die
pakt `attendee_profile_url`, knipt de slug achter `/in/` eruit en matcht daarop.

De Comms-tab doet het in `src/bd/lane-comms.jsx:241` fout:

```js
contacts.find(x => x.linkedin_url && x.linkedin_url.includes(providerId))
```

`attendee_provider_id` is de interne LinkedIn-id (`ACoAAAM8V9wBqh0bXsiaho1KRs3...`),
`linkedin_url` bevat de publieke slug (`linkedin.com/in/clare-dunn`). Twee
verschillende nummersystemen. Getest op acht echte records: nul treffers. Die
match kan per definitie nooit slagen.

Voor dit ontwerp is dat grotendeels irrelevant, want `outreach_contact` heeft al
`linkedin_chat_id` (gevuld voor 151) en dat is een **exacte** sleutel. Er hoeft
niets geraden te worden.

## Deel 1: de LinkedIn-inboxscan

Nieuw endpoint `api/outreach-linkedin-scan.js`, gebouwd als spiegelbeeld van de
mailscan.

```
selecteer outreach_contact waar linkedin_chat_id is not null
  voor elk:  GET /chats/{chat_id}/messages   (via api/unipile.js)
             zoek inkomende berichten (is_sender !== 1)
             nieuwer dan onze eigen laatste verzending
  bij een treffer:
             classifyWithClaude()          -> api/_lib/outreach-classify-run.js
             statusAfterClassification()   -> src/bd/outreach-match.js
             schrijf last_inbound_at + status
```

Twee dingen bewust hergebruikt in plaats van nagebouwd:

* **`classifyWithClaude` uit `api/_lib/outreach-classify-run.js`.** Dat bestand
  is op 23 september juist gemaakt zodat de scan en het reparatie-endpoint niet
  uit elkaar konden groeien. Een derde kopie van de prompt zou dat ongedaan
  maken.
* **`statusAfterClassification` uit `src/bd/outreach-match.js`.** Eén
  statusmachine voor beide kanalen. Een LinkedIn-antwoord betekent hetzelfde als
  een e-mailantwoord.

Geen nieuwe matchlogica, geen naamvergelijking, geen fuzzy zoeken. Het chat-id is
exact.

**Rate limits spelen hier niet.** De beperking waar de bulk-connectiecheck
rekening mee houdt geldt voor profielweergaven en uitnodigingen. Je eigen inbox
lezen is geen profielweergave.

De 3 contacten zonder `linkedin_chat_id` (154 minus 151) vallen buiten de scan.
Daar is de DM niet aangekomen; die horen in de foutafhandeling van het versturen
thuis, niet hier.

### Waarom dit veilig is

De verzendguard doet het werk al. Zodra de scan `last_inbound_at` zet zonder
`next_action_at`, valt het contact in de hold die op 23 september is ingebouwd in
`api/_lib/outreach-send-lib.js`:

```js
if (c?.last_inbound_at && !c?.next_action_at) {
  bump('antwoord binnen, wacht op beoordeling'); continue;
}
```

En via LinkedIn gaat er sowieso nooit een tweede bericht uit; `isLinkedIn && step === 2`
wordt geweigerd. Het ergste gevolg van een verkeerde herkenning is dat iemand
onterecht als beantwoord wordt gemarkeerd en een mens ernaar kijkt. Er gaat niets
verkeerds de deur uit.

## Deel 2: twee kolommen in het cold outreach-overzicht

In `src/bd/marketing-outreach.jsx`, naast de bestaande statuskolom.

### Kolom "conversatie"

Afgeleid, niet opgeslagen. Dezelfde redenering als bij `needsOurReply`: "heeft
geantwoord" en "wij moeten nog terug" zijn onafhankelijke feiten en blijven ook
kloppen als iemand twee keer achter elkaar antwoordt.

```
geen          last_inbound_at is leeg
antwoord      last_inbound_at gevuld, answered_at leeg of ouder
heen en weer  answered_at nieuwer dan last_inbound_at
```

Het bestaande label "wacht op ons" uit `needsOurReply` blijft ongewijzigd naast
deze kolom staan.

### Kolom "herinnering"

Een advies, geen knop. Komt uit één pure functie `reminderAdvies(contact, { now })`
naast `needsOurReply` in `src/bd/outreach-match.js`, met tests.

```
kan            geen reactie, laatste bericht >= 10 dagen geleden, status msg1_sent
nog te vroeg   idem maar te recent; toont de datum waarop het wel kan
al herinnerd   status msg2_sent
niet doen      replied / opted_out / bounced / paused, met de reden erbij
```

De wachttijd van tien dagen staat als benoemde constante bovenaan, niet verspreid
door de code.

**Let op waar "laatste bericht" vandaan komt.** `outreach_contact` heeft geen
`last_sent_at`-kolom. Het moment van onze laatste verzending komt uit
`outreach_message` met `direction = 'outbound'`, gegroepeerd per `contact_id`. Het
overzicht laadt die tabel al, dus er is geen extra query nodig, maar wie hier
`last_sent_at` verwacht loopt tegen een 42703 aan.

Elke uitkomst draagt zijn reden mee, zodat in de lijst zichtbaar is waaróm er niet
herinnerd kan worden. Een kolom die alleen "nee" zegt levert een vraag op in plaats
van een antwoord.

### Versturen blijft handmatig

Expliciet besloten. Een tweede LinkedIn-DM wordt op dit moment bewust geweigerd,
met deze reden in `api/_lib/outreach-send-lib.js`:

> Een ongevraagd tweede DM aan iemand die niet reageerde is precies het gedrag
> waar LinkedIn accounts op beperkt.

De gentle reminder is letterlijk dat tweede bericht. **Die blokkade blijft staan.**
De kolom toont alleen advies; Marco beslist en verstuurt zelf. Eén herinnering per
dag met de hand is iets anders dan een cron die er honderdvijftig achter elkaar
uitgooit, en dat tweede is wat een account kost.

Voor e-mail verandert er niets: msg2 is daar al onderdeel van de campagne en
blijft geautomatiseerd.

## Deel 3: de Comms-tab repareren

De kapotte match in `lane-comms.jsx:241` vervangen door twee stappen:

1. Exact op `linkedin_chat_id` uit `outreach_contact`.
2. Anders op de slug uit `attendee_profile_url`, zoals de webhook het al doet.

De chatlijst haalt de attendees toch al op (`get-chat-attendees` draait nu al per
chat), dus dit kost geen extra API-aanroep.

Voor het tonen van een naam wordt als laatste redmiddel ook `contacts`
geraadpleegd. Zonder dat blijft elk gesprek met een bestaande relatie "LinkedIn
user" heten terwijl van 1675 contacten de LinkedIn-url bekend is. Dat is één
extra query en verbreedt de functie niet: koppelen en terugkoppelen gebeurt
uitsluitend op `outreach_contact`.

## Bewust niet in dit ontwerp

* **Een koppelknop per gesprek.** Overwogen en laten vallen. Na deel 1 lost het
  overgrote deel vanzelf op via het chat-id. Pas bouwen als het gemist wordt.
* **`linkedin_provider_id` toevoegen aan `contacts`.** Alleen nodig voor die knop.
* **LinkedIn-antwoorden automatisch beantwoorden.** Buiten scope.

## Datamodel

Geen migratie nodig. Alle kolommen bestaan al: `outreach_contact.linkedin_chat_id`,
`linkedin_provider_id`, `last_inbound_at`, `answered_at`, `status`, `paused_reason`.

## Testen

Vitest, volgens de conventie in deze repo: pure functies apart testbaar zonder
Supabase- of Unipile-verbinding.

* `reminderAdvies`: alle vier uitkomsten, plus de grens op precies tien dagen,
  plus elke uitsluitingsstatus.
* Conversatie-afleiding: leeg, antwoord, heen en weer, en het geval waarin iemand
  twee keer achter elkaar antwoordt.
* De scan: berichtselectie (inkomend en nieuwer dan onze verzending) als pure
  functie, los van de API-aanroep.

Let op: vier bestaande tests in `src/lib/broadcast-recipients.test.js` falen al en
staan los van dit werk.

## Volgorde van bouwen

1. Inboxscan, eerst als droge run die alleen rapporteert wat hij zou doen. Bij 151
   contacten die twee weken onaangeraakt zijn wil je eerst zien wat eruit komt
   voordat er statussen wijzigen.
2. Scan echt laten schrijven, na goedkeuring van de uitkomst.
3. De twee kolommen in het overzicht.
4. De Comms-tab-reparatie.
