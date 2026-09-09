# Handover: e-mailoutreach event Amsterdam 6 oktober 2026

Context voor het bouwen van een outreach-module in de BD-applicatie. Opgesteld na een brainstorm met Olivier op 9 september 2026. Beslissingen zijn genomen, ontwerp staat op hoofdlijnen, code moet nog geschreven worden.

## 1. Wat er moet gebeuren

Eclectik organiseert op 6 oktober 2026 een invite-only middag bij Zoom (Zuidas, Amsterdam) voor HR- en communicatieleiders, over de rol van HR in AI-transformatie. Programma: eclectik.co/events/amsterdam-2026. Afzender van alle mails is Marco (CSO). Marco's mailbox is al via Microsoft Graph gekoppeld aan de BD-app.

Elke prospect krijgt maximaal twee mails:

- Bericht 1: persoonlijke uitnodiging ("the gap + peer afternoon").
- Bericht 2: alleen aan wie niet reageerde, 5 tot 7 dagen na bericht 1, verzonden als reply in dezelfde thread ("programme + link").

Het versturen is simpel. Het lastige deel is betrouwbaar weten wie gereageerd heeft, zodat bericht 2 niet bij mensen landt die al ja of nee hebben gezegd.

## 2. De lijst (masterlijstfinalaangevuld.xlsx, Olivier levert die aan in de repo)

- 967 prospects bij 576 bedrijven, allemaal met e-mailadres.
- 481 hebben beide berichtteksten ingevuld, 486 nog niet. Die laatste groep wél importeren, met status `paused`, zodat ze klaarstaan zodra teksten er zijn.
- Meerdere contacten per bedrijf komt veel voor: ING 17, Philips 16, ASML 13, Booking 11, Capgemini 10, Achmea 10.
- Kolommen: Voornaam, Achternaam, Contactpersoon, Titel, LinkedIn, Find work email, Prioriteit, Outreach-prio, Bron, Uitnodigingshaak / Notitie, Bedrijf, Website, Locatie, Employee Count, Size, Industry, Company Linkedin, Message 1, Message 2, Frontline workers?
- Prioriteit heeft 9 waarden met kleurprefix. Verdeling: 🟢 Top 310 (C-level + Frontline 124, C-level 98, Director + Frontline 88), 🟡 Goed 171 (Manager + Frontline 109, Director 62), 🟠 Matig 486 (Comms/EX + Frontline 177, Comms/EX specialist 142, Communicatie 86, Manager 81).
- Outreach-prio is een oplopend nummer (1 = eerst).
- De berichtkolommen bevatten `Subject: ...` op de eerste regel, dan een lege regel, dan de body. Bij import splitsen in subject en body.

## 3. Beslissingen

1. Bouwen als module van de BD-app, niet als losstaand ding. Zelfde Supabase, bestaande Graph-koppeling op Marco's mailbox.
2. De agent verstuurt en volgt, maar antwoordt nooit zelf. Marco antwoordt vanuit Outlook.
3. Verzenden in golven op prioriteit: eerst groen, dan geel, dan oranje. Als groen genoeg aanmeldingen oplevert, hoeft oranje niet.
4. Bericht 2 gaat als reply op bericht 1 (Graph `createReply` op het verzonden bericht), zodat het bij de ontvanger één thread blijft.
5. Harde stopdatum: na 2 oktober gaat geen bericht 2 meer uit.

## 4. Datamodel (Supabase)

Drie tabellen, omdat verzenden en ontvangen los van elkaar staan.

### outreach_campaign

Eén rij per campagne. Maakt de logica herbruikbaar zonder codewijziging.

| kolom | type | opmerking |
|---|---|---|
| id | uuid pk | |
| name | text | "Amsterdam 2026" |
| sender_mailbox | text | Marco's UPN |
| daily_cap | int | zie regels, begint laag |
| followup_delay_days_min / _max | int | 5 en 7 |
| max_per_company_per_week | int | 2 |
| send_windows | jsonb | bijv. werkdagen 08:30, 11:30, 15:00 (Europe/Amsterdam) |
| hard_stop_at | timestamptz | 2026-10-02 |
| status | text | draft / active / paused / finished |

### outreach_contact

Eén rij per prospect.

| kolom | type | opmerking |
|---|---|---|
| id | uuid pk | |
| campaign_id | fk | |
| first_name, last_name, title | text | |
| email | text | uniek binnen campagne |
| email_domain | text | afgeleid, geïndexeerd, voor matching en per-bedrijf-regel |
| company, company_linkedin, website, industry, location, employee_count, size_bucket | | uit de lijst |
| linkedin_url | text | |
| priority_label | text | de 9 waarden uit de lijst |
| priority_tier | text | afgeleid: top / good / medium |
| outreach_prio | int | sorteervolgorde |
| hook_note, frontline_note, source | text | |
| msg1_subject, msg1_body, msg2_subject, msg2_body | text | |
| status | text | zie statussen |
| next_action_at | timestamptz | de scheduler draait hierop |
| paused_reason | text | |
| last_reply_summary | text | één zin van Claude |
| created_at, updated_at | | |

Statussen: `queued`, `msg1_sent`, `msg2_sent`, `replied`, `bounced`, `ooo`, `referred`, `opted_out`, `paused`, `done`.

Overgangen:
- import: `queued` (als beide teksten aanwezig) of `paused` (als teksten ontbreken). `next_action_at` = nu.
- bericht 1 verzonden: `msg1_sent`, `next_action_at` = nu + random(5..7) dagen.
- bericht 2 verzonden: `msg2_sent`, `next_action_at` = null.
- inkomende reply geclassificeerd als interested of declined: `replied`, `next_action_at` = null.
- referral: `referred`, `next_action_at` = null (nieuwe contactpersoon handmatig toevoegen).
- ooo: status blijft, `next_action_at` + 7 dagen (of de terugkeerdatum uit de OOO als die te lezen is).
- bounce: `bounced`, `next_action_at` = null.
- handmatig pauzeren (per contact of per bedrijf): `paused`, `paused_reason` gevuld.

### outreach_message

Elke verzonden én ontvangen mail. Audit trail en basis voor het koppelen van replies.

| kolom | type | opmerking |
|---|---|---|
| id | uuid pk | |
| contact_id | fk, nullable | null bij ongematchte inkomende mail |
| campaign_id | fk | |
| direction | text | outbound / inbound |
| sequence_step | int | 1 of 2 bij outbound |
| graph_message_id | text | uniek |
| conversation_id | text | geïndexeerd |
| internet_message_id | text | |
| from_address, to_address | text | |
| subject | text | |
| body_preview | text | |
| sent_or_received_at | timestamptz | |
| classification | text | inbound: interested / declined / ooo / referral / bounce / other |
| classification_confidence | numeric | |
| summary | text | één zin van Claude |
| match_method | text | conversation_id / sender_email / domain_flag / none |
| raw | jsonb | Graph-payload minus body, voor debuggen |

Extra tabel of view voor de dagcap: `outreach_send_log` of gewoon een count op `outreach_message where direction = 'outbound' and date = today`.

## 5. De twee jobs

Beide als API-routes in de Vercel-app, aangeroepen door Vercel cron. Reden: de Graph-client leeft daar al, dan hoeven er geen tokens naar Supabase.

### Job A: verzenden

Draait op werkdagen op de tijden in `send_windows`, dus niet één batch om 9:00.

1. Bepaal hoeveel er vandaag nog mag: `daily_cap` minus al verzonden vandaag. Verdeel over het aantal resterende windows van de dag.
2. Selecteer contacten met `status in (queued, msg1_sent)` en `next_action_at <= now()`, gesorteerd op `priority_tier`, dan `outreach_prio`.
3. Filter op de per-bedrijf-regel: max `max_per_company_per_week` outbound berichten (stap 1) per `email_domain` in de afgelopen 7 dagen. Hoogste prio per bedrijf eerst.
4. Controleer `hard_stop_at`: geen stap 2 meer na die datum.
5. Verzend:
   - stap 1: Graph `POST /users/{marco}/sendMail` met `saveToSentItems: true`. Daarna het verzonden bericht ophalen uit Sent Items (op internetMessageId of subject + ontvanger) om `graph_message_id` en `conversation_id` vast te leggen. Alternatief dat dit in één keer oplost: eerst `POST /messages` (draft), id en conversationId bewaren, dan `POST /messages/{id}/send`.
   - stap 2: `POST /messages/{msg1_id}/createReply`, body vervangen door msg2_body, subject laten staan of vervangen door msg2_subject, dan `send`. Let op: `createReply` neemt de originele mail als quote mee; beslis of dat gewenst is of dat je de body volledig overschrijft.
6. Schrijf `outreach_message`, update status en `next_action_at`.
7. Wacht een paar seconden tussen mails (jitter), stuur niet als één burst.

### Job B: inbox scannen

Draait elk uur.

1. Delta query op Marco's Inbox: `GET /users/{marco}/mailFolders/inbox/messages/delta`, deltaLink opslaan in een `outreach_sync_state`-tabel. Ook Marco's Sent Items meenemen, zodat een antwoord van Marco zelf de thread als "beantwoord door ons" markeert.
2. Per nieuw inkomend bericht, matchen in drie stappen:
   - `conversation_id` gelijk aan een outbound bericht → zekere match.
   - anders afzenderadres gelijk aan een `outreach_contact.email` → match.
   - anders afzenderdomein gelijk aan een `email_domain` in de campagne → alleen flaggen (`match_method = domain_flag`), niet automatisch koppelen. Bij ING met 17 contacten wil je niet de verkeerde persoon op `replied` zetten.
   - geen match → opslaan met `contact_id = null`, negeren.
3. Bounces herkennen vóór de classificatie: afzender `postmaster@`, `mailer-daemon@`, of Graph-header `X-Failed-Recipients`, of subject met "Undeliverable" / "Delivery has failed". Het gebouncede adres uit de body halen en aan het contact koppelen.
4. Gematchte mails door Claude laten classificeren (zie prompt hieronder). Output: classificatie, confidence, één zin samenvatting, eventueel terugkeerdatum bij OOO, eventueel naam en adres van doorverwijzing bij referral.
5. Status van het contact bijwerken volgens de overgangen in paragraaf 4. Bij confidence onder 0.7: status niet wijzigen maar wel `next_action_at` op null zetten en flaggen voor handmatige check. Liever een bericht 2 te weinig dan één te veel.
6. Dagelijks overzicht (mail naar Marco of pagina in de BD-app): wie reageerde, wat zeiden ze, wie wacht op antwoord van Marco, wat is geflagd.

### Classificatieprompt (kern)

Systeem: je classificeert antwoorden op een persoonlijke uitnodiging voor een zakelijk event. Geef JSON terug met `classification` (interested / declined / ooo / referral / bounce / other), `confidence` (0 tot 1), `summary` (één zin, Nederlands), `ooo_until` (ISO-datum of null), `referral_name` en `referral_email` (of null). Invoer: subject, afzender, body zonder quote van de originele mail. Regels: een vraag over datum, programma of plek is `interested`. "Stuur het naar X" is `referral`. Automatische antwoorden zonder mens erachter zijn `ooo` of `bounce`. Twijfel is `other` met lage confidence.

## 6. Regels en veiligheidskleppen

- Dagcap loopt op: dag 1 tot 3 circa 40, daarna 80, daarna 120, alleen als het bouncepercentage onder 2 à 3 procent blijft. Handmatig verhogen, niet automatisch.
- Maximaal 2 contacten per bedrijf per week, hoogste prio eerst.
- Testrun eerst: 5 tot 10 interne adressen (eigen mailboxen, een Gmail, een Outlook.com) als contacten in een testcampagne. Controleer threading, weergave, en of de inboxjob replies correct koppelt en classificeert. Pas daarna de eerste groene golf.
- Pauzeren per bedrijf met één actie (voor als er een lopende klantrelatie blijkt te zijn).
- Killswitch: `campaign.status = paused` stopt job A onmiddellijk; job B blijft draaien.
- Idempotentie: job A mag nooit twee keer hetzelfde bericht sturen. Zet de status en schrijf `outreach_message` in één transactie vóór of direct na het verzenden, en controleer bij start van de job op contacten met `msg1_sent` zonder bijbehorend outbound bericht.
- Alle tijden in Europe/Amsterdam; niet versturen in het weekend en niet vóór 08:00 of na 17:00.
- Logging van Graph-fouten (429 throttling: respecteer `Retry-After`).

## 7. Open punten voor in de repo

- Hoe verwerkt de bestaande Graph-koppeling authenticatie: delegated (Marco's token) of application permissions met een application access policy? Bepaalt of `createReply` en delta queries zonder tussenkomst van Marco kunnen draaien.
- Bestaat er al een contacts- of companies-tabel in de BD-app? Dan `outreach_contact` daaraan koppelen via fk in plaats van velden dupliceren, en na het event de replies als activiteit op het contact laten landen.
- Wil Marco een opt-out-regel onderaan de mail? De huidige teksten hebben er geen. Voor B2B-koude mail in NL is dat aan te raden en het houdt de deliverability gezond. Als ja: `opted_out`-status vullen bij een reply die daarom vraagt.
- `createReply` versus een nieuw bericht met `In-Reply-To`- en `References`-headers: de eerste is makkelijker, de tweede geeft volledige controle over de body. Uitzoeken wat de Graph-koppeling het makkelijkst ondersteunt.
- Wat gebeurt er met de 486 zonder teksten: worden die nog geschreven, en zo ja door wie en wanneer? Bepaalt of de oranje golf überhaupt haalbaar is vóór 2 oktober.

## 8. Volgorde van bouwen

1. Migratie: drie tabellen plus sync-state, indexen op `email`, `email_domain`, `conversation_id`, `next_action_at`.
2. Importscript voor de xlsx (subject/body splitsen, tier afleiden uit het kleurprefix, `paused` bij ontbrekende teksten).
3. Job B eerst (inbox scannen en matchen), testen op bestaande mails in Marco's inbox. Zonder betrouwbare replydetectie niet gaan versturen.
4. Job A met testcampagne op interne adressen.
5. Overzichtspagina of dagelijkse samenvatting.
6. Eerste groene golf, dagcap 40.

Tijdlijn: vandaag is 9 september. Als de eerste golf uiterlijk 16 september gaat, valt bericht 2 rond 21 tot 23 september en is er nog ruimte voor de gele en oranje golf vóór de stop op 2 oktober.

## 9. Addendum 9 september 2026: besluiten en nagemeten cijfers

Toegevoegd in de BD-repo na de open punten van §7 te hebben uitgezocht. **Waar dit
addendum afwijkt van §1 tot §8, geldt dit addendum.**

### 9.1 Verzendweg: optie A (besluit)

Er bestond al een werkende 1-op-1-verzendweg in de app: de transactionele modus van
de campaign-composer (`api/marketing-send.js`, Resend `POST /emails`, één mail per
ontvanger). Die is deze week twee keer gebruikt vanaf `marco@eclectik.co` met
reply-to `marco@`: 57 ontvangers op 8 sept en 32 op 7 sept. Ontvangers ervaren dat
als 1-op-1.

Belangrijk: dat endpoint ondersteunt **al** volledig unieke bodies per ontvanger
(`r.html ? r.html : renderTemplate(...)`), dus per-record teksten vragen geen nieuw
verzendmechanisme. Wel batchen; de code waarschuwt dat inline html bij 88+
ontvangers tegen de Vercel body-limiet loopt.

**Besluit: versturen via de transactionele Resend-weg, Graph alleen om de inbox te
lezen.** Gevolgen:

- **Beslissing 4 van §3 vervalt.** Bericht 1 staat niet in Marco's mailbox, dus
  `createReply` kan niet. Bericht 2 gaat als losse mail met "Re: " plus hetzelfde
  subject. Olivier accepteert dat er geen echte thread is en dat Marco geen kopie in
  zijn Sent Items heeft.
- **De matching van §5 wordt tweetraps in plaats van drietraps.** Er is geen Graph
  `conversation_id` voor outbound, dus: eerst afzenderadres gelijk aan
  `outreach_contact.email` (betrouwbaar), daarna domein-flag (handmatig). In
  `outreach_message` wordt `conversation_id` daarmee alleen voor inbound gevuld;
  outbound slaat het Resend-message-id op.

### 9.2 Graph: alleen leesrecht nodig, en welke admin-rol

Uitgezocht: de bestaande Graph-koppeling is **delegated en browser-side**
(`src/lib/auth.jsx` zet `session.provider_token` in `localStorage.graph_token`). Een
Vercel-cron kan daar niets mee. Het enige app-only pad is `api/glint-sync.js`
(client_credentials), gated op `GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET` met alleen
Files.Read.All consent.

Nodig voor job B: application permission **`Mail.Read`** plus een **application
access policy** die de app beperkt tot Marco's mailbox. Geen `Mail.Send` en geen
`Mail.ReadWrite`, want we versturen niet via Graph.

Twee verschillende admin-rollen, dat is de valkuil:

1. **Entra ID** (app registration, permission toevoegen + "Grant admin consent"):
   vraagt Global Administrator of Cloud Application Administrator. Exchange Admin
   Center dekt dit **niet**.
2. **Exchange Online** (`New-ApplicationAccessPolicy`, scope op Marco's mailbox):
   Exchange-admin, via Exchange Online PowerShell, geen knop in de EAC-GUI.

Doorlooptijd is kort (zelfde dag), de enige echte wachttijd is dat de access policy
tot circa een half uur nodig heeft; controleer met `Test-ApplicationAccessPolicy`.
Gebruik een **aparte backend-app**, niet de delegated login-app. Het
token-ophaalstuk staat werkend in `glint-sync.js`; diezelfde app activeert dan ook
de geparkeerde glint-sync.

### 9.3 De lijst, nagemeten

Bestand: `masterlijst-final-aangevuld.xlsx`. **Staat bewust NIET in git**: 960 met
naam genoemde personen met werk-e-mailadres, functie en werkgever hoort niet in een
permanente git-history. Importeren gaat rechtstreeks naar Supabase; het importscript
neemt een pad als argument. (Los punt: er staan al 10 `All *_Dynamics_*.xlsx`-exports
getrackt in deze repo. Aparte opruimbeslissing.)

Werkelijke cijfers (§2 wijkt licht af, deze gelden):

| | handover §2 | werkelijk |
|---|---|---|
| rijen | 967 | **960** |
| unieke bedrijven | 576 | **572** |
| met beide teksten | 481 | **477** |

De berichtkolommen heten in het bestand:
`Message 1: the gap + peer afternoon (test, 6 Oct)` en
`Message 2: programme + link (day 5-7, non-responders)`.

**Eerste golf = de 570 rijen met een nummer in `Outreach-prio`** (1 t/m 581, allemaal
uniek). De overige 390 hebben daar letterlijk `Reserve` staan.

Belangrijkste vondst: **die 570 nummers horen bij exact 570 unieke bedrijven, dus
één persoon per bedrijf.** De lijst is al zo samengesteld en de 390 `Reserve` zijn de
extra contacten bij bedrijven als ING (17) en Philips (16). Gevolg: de
per-bedrijf-regel (`max_per_company_per_week`) is voor golf 1 vrijwel irrelevant. Bouw
hem wel, maar hij bijt pas als de reserves in beeld komen.

Samenstelling van de 570: 🟢 Top 259, 🟡 Goed 98, 🟠 Matig 213. Alle 570 hebben een
e-mailadres. **357 hebben beide teksten en kunnen direct**; 213 missen teksten (dat is
open punt 5 van §7, nu concreet 213 en niet 486).

### 9.4 Resend-limieten (nagekeken 9 sept) en de dagcap

De transactionele meter stond op **Free**: 3.000 per maand en een hard plafond van
**100 per dag**. Op 9 september geüpgraded naar **transactioneel Pro** ($20/mnd):
**50.000 per maand, daglimiet Unlimited** (stand: 110 / 50.000, vernieuwt 12 sept).
Marketing is een **aparte** meter en stond al op Pro (495 / 5.000 contacten).

**Dagcap: doel 120**, met een ramp van circa 60 naar 120 over twee dagen zolang de
bounce onder 2 à 3 procent blijft. Reden voor de ramp is niet het plafond maar
reputatie: `eclectik.co` draagt ook de nieuwsbrief. Spreid over de drie
verzendvensters, dus ongeveer 40 per venster in plaats van één burst.

Doorrekening (alleen werkdagen, start woensdag 16 september):

| Dagcap | 357 mails klaar | alle 570 klaar | bericht 2 valt |
|---|---|---|---|
| 100 | ma 21 sept | wo 23 sept | 28 tot 30 sept |
| **120** | **vr 18 sept** | **di 22 sept** | **27 tot 29 sept** |

Totaalvolume 570 × 2 = 1.140 mails, dus de maandlimiet knelt niet.

### 9.5 Must-fix vóór productie: 429-afhandeling

`api/marketing-send.js` heeft **geen** 429- of `Retry-After`-logica. Een 429 valt daar
in de generieke 4xx-tak ("log and continue"): de prospect wordt als `failed` in
`campaign_sends` geschreven en **nooit opnieuw geprobeerd**. Bij honderden mails
verlies je zo stil prospects. De code wacht 250 ms tussen mails (4 requests per
seconde), wat boven sommige Resend-rate-limits ligt.

`api/_lib/send-broadcast.js` heeft het juiste patroon al: de `rs()`-helper probeert
opnieuw bij 429 en 5xx, respecteert `Retry-After` en doet exponentiële backoff.

**Besluit: de outreach-job krijgt zijn eigen verzendfunctie met die backoff en
hergebruikt de loop van `marketing-send.js` niet.** We hebben toch al per-record html,
een eigen statemachine en idempotentie nodig, en zo blijft de campagne-weg die Marco
dagelijks gebruikt ongemoeid.

### 9.6 Aangepaste bouwvolgorde

1. Azure: backend-app met `Mail.Read` + access policy op Marco's mailbox (parallel
   starten, het blokkeert job B).
2. Migratie: drie tabellen plus sync-state, indexen op `email`, `email_domain`,
   `conversation_id`, `next_action_at`.
3. Importscript (pad als argument, niet in git): subject/body splitsen, tier uit het
   kleurprefix, `Reserve` apart markeren, `paused` bij ontbrekende teksten, en
   **cross-match op e-mail en domein tegen `contacts` en `companies`** zodat bestaande
   klantrelaties automatisch op `paused` komen en `do_not_email` gerespecteerd wordt.
4. Job B (inbox scannen en matchen), testen op bestaande mails.
5. Job A met eigen verzendfunctie inclusief 429-backoff, eerst testcampagne op interne
   adressen.
6. Overzichtspagina of dagelijkse samenvatting.
7. Eerste golf van de 357, ramp naar 120 per dag.
