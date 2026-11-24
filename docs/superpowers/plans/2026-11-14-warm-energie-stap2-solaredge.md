# Warm energietab stap 2 (SolarEdge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De opwek van de zonnepanelen (SolarEdge) komt in het scherm Energie, zodat Zon, Huis en "eigen stroom" gevuld worden, live en voor de hele geschiedenis.

**Architecture:** De beheerder koppelt SolarEdge een keer via OAuth (Site Access) vanuit Beheer. Een nieuwe crontaak haalt elk kwartier de opwek per kwartier op bij de SolarEdge Monitoring API v2 en bewaart die in een eigen tabel; dezelfde taak haalt in stappen de dagopwek van eerdere jaren op. `GET /api/energie` telt de opwek per vak op en rekent daarmee het huisverbruik en het aandeel eigen stroom uit.

**Tech Stack:** bestaande Warm-stack (React 19 + Vite, Vercel Node-functies ESM, Supabase via service-key, Vitest 5). Geen nieuwe pakketten.

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md`, hoofdstuk 10 (stap 2) en hoofdstuk 11.

**Repo:** `/Users/olivierarnolds/Desktop/warm-app` (branch `main`). Alle paden hieronder zijn relatief aan die map.

## Global Constraints

- Alle tekst (UI, commentaar, commits, logregels) in het Nederlands. NOOIT een em-dash (U+2014) of en-dash als gedachtestreep. Gebruik een komma, een punt of ` - `.
- Geen nieuwe npm-pakketten.
- Geheimen (Client Secret, tokens, autorisatiecode) staan nooit in code, tests, commits, logregels, foutmeldingen of antwoorden van de API. Een logregel over een fout bij SolarEdge noemt alleen de soort fout en de HTTP-status, nooit de inhoud van een antwoord.
- Tests raken geen echte database en geen netwerk (ook SolarEdge niet): alles via nagebootste afhankelijkheden, in de stijl van de bestaande tests (Vitest 5 zonder globals; componenttests beginnen met `// @vitest-environment jsdom` en ruimen op met `cleanup()`). Testuitvoer is schoon.
- Elk bestand onder `api/` moet echt laden in Node (`tests/laden.test.js`). Alle databasevragen via `api/_lib/opslag.js` (functies gooien bij een fout). Antwoorden van `api/` krijgen `geenCache(res)`.
- Tijdrekenen in Europe/Amsterdam met `api/_lib/tijd.js`, zonder datumbibliotheek.
- Geen lichtgele of pastelkleurige tekst op een witte achtergrond. Getallen in Nederlandse notatie met een vaste spatie voor de eenheid (zoals `src/lib/energie.js` al doet).
- Het scherm Energie en het kamerscherm moeten elk op 375 x 647 zonder scrollen blijven passen.
- Het maandtegoed bij SolarEdge is 2000 verzoeken en 10 per minuut. De code doet per cronronde hooguit 2 verzoeken naar de meetgegevens en stopt in een maand bij 1900.
- Commit per taak met een beschrijvende Nederlandse boodschap, afgesloten met de regel `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Niet pushen. Geen database aanraken, geen `vercel`-opdracht draaien, `.env` niet lezen, geen dev-server of browser starten.

## Vaste waarden (SolarEdge Monitoring API v2, uit de officiële handleiding)

- Toestemming vragen: de browser gaat naar `https://connect.solaredge.com/authorize?client_id=<CLIENT_ID>&external_id=<eigen waarde>`. Na akkoord stuurt SolarEdge de browser naar de vastgelegde Redirect URI met `code`, `site_id` en `external_id` (dezelfde waarde terug).
- Redirect URI van deze app, exact: `https://warm-app-flax.vercel.app/api/zon/terug`.
- Code inwisselen: `POST https://monitoringapi.solaredge.com/v2/oauth2/token`, `Content-Type: application/json`, body `{"grant_type":"authorization_code","code":"...","client_id":"...","client_secret":"...","redirect_uri":"https://warm-app-flax.vercel.app/api/zon/terug"}`. Antwoord 200: `{"access_token":"...","token_type":"Bearer","expires_in":7200,"refresh_token":"..."}`.
- Verversen: zelfde adres, body `{"grant_type":"refresh_token","refresh_token":"...","client_id":"...","client_secret":"..."}`. Het antwoord bevat een NIEUW refresh-token; het oude werkt daarna niet meer. Een refresh-token verloopt na 14 dagen zonder gebruik.
- Fouten van het tokenadres: HTTP 400 met `{"error":"...","error_description":"..."}` (niet opnieuw proberen). 5xx en netwerkfouten zijn tijdelijk: het bewaarde refresh-token blijft dan staan.
- Meetgegevens: `GET https://monitoringapi.solaredge.com/v2/sites/<site_id>/energy?from=<ISO met tijdzone>&to=<ISO met tijdzone>&resolution=<QUARTER_HOUR|DAY>&unit=WH` met `Authorization: Bearer <access_token>`. Antwoord: `{ "period": {...}, "unit": "WH", "resolution": "...", "values": [...] }`. Elk element van `values` heeft een veld `value` (getal of null). De naam van het tijdveld per element is niet met zekerheid bekend; tijden komen in de lokale tijd van de installatie met een UTC-verschil. `unit` kan `WH`, `KWH` of `MWH` zijn, in hoofd- of kleine letters.
- Fouten van de meetadressen: 401 (token verlopen of ingetrokken), 403 (geen toegang), 429 met header `x-ratelimit-remaining-minute: 0` (te veel per minuut, later opnieuw) of 429 met die header boven 0 (maandtegoed op, stoppen tot de volgende maand). Alleen een 200 kost tegoed.
- Omgevingsvariabelen: `SOLAREDGE_CLIENT_ID`, `SOLAREDGE_CLIENT_SECRET` (door Olivier gezet met `scripts/zet-solaredge.mjs`, dat bestaat al).

## Review Focus

- De naam van het tijdveld in `values` wijkt af van wat de code verwacht: er mag dan niets fout worden opgeslagen, en de logregel noemt alleen de sleutelnamen zodat het te herstellen is.
- Het verversen van het token lukt half (SolarEdge heeft het nieuwe paar uitgegeven, het opslaan mislukt), of twee rondes verversen tegelijk: het oude refresh-token is dan dood. Het nieuwe paar moet meteen en als eerste worden bewaard, en een tweede ronde mag het niet overschrijven met een ouder paar.
- Het maandtegoed raakt op, of SolarEdge geeft dagenlang fouten: de app blijft werken, toont de stand eerlijk en hamert niet.
- Dagrijen (geschiedenis) en kwartierrijen van dezelfde dag mogen nooit dubbel tellen.
- De terugkeer van SolarEdge (`/api/zon/terug`) wordt aangeroepen door iemand anders dan de beheerder die de koppeling startte, met een verzonnen `code` of `site_id`, of twee keer achter elkaar.

---

### Task 1: Database, SolarEdge-client en rekenlogica

**Files:**
- Create: `supabase/migrations/0009_zon.sql`, `api/_lib/solaredge.js`, `api/_lib/zon.js`
- Modify: `api/_lib/opslag.js` (functies erbij, onderaan)
- Test: `tests/solaredge.test.js`, `tests/zon-lib.test.js`, `tests/zon-opslag.test.js`

**Interfaces (Produces, exacte namen):**

`0009_zon.sql` (de implementer schrijft alleen het bestand; de controller past het toe):
- Tabel `zon_koppeling`: `id smallint primary key default 1 check (id = 1)`, `site_id text not null`, `access_token text`, `access_verloopt_op timestamptz`, `refresh_token text not null`, `status text not null default 'actief' check (status in ('actief','verlopen'))`, `gekoppeld_op timestamptz not null default now()`, `laatste_poll_op timestamptz`, `laatste_vermogen_w integer`, `donker boolean not null default false`, `maand text`, `verzoeken integer not null default 0`, `historie_jaar integer`, `historie_klaar boolean not null default false`.
- Tabel `zon_opwek`: `tijd timestamptz primary key`, `wh numeric(12,1) not null check (wh >= 0)`, `stap text not null check (stap in ('kwartier','dag'))`.
- Beide tabellen `enable row level security`, geen policies.
- Functie `bewaar_zon_kwartieren(p_rijen jsonb) returns integer` (plpgsql, `set search_path = public`): `p_rijen` is een lijst `[{"tijd": "<ISO>", "wh": <getal>}]`. In een transactie: verwijder elke rij met `stap = 'dag'` waarvan de Amsterdamse datum gelijk is aan de Amsterdamse datum van een van de kwartieren; voeg de kwartieren toe met `stap = 'kwartier'` en overschrijf bij een bestaande `tijd` de `wh` en de `stap`. Geeft het aantal kwartieren terug.
- Functie `bewaar_zon_dagen(p_rijen jsonb) returns integer`: zelfde vorm, `tijd` is middernacht Amsterdam. Voegt een rij met `stap = 'dag'` toe voor elke dag waarvoor nog GEEN kwartierrij bestaat (vergelijk op Amsterdamse datum); een bestaande dagrij krijgt de nieuwe `wh`; een bestaande kwartierrij op dat tijdstip blijft ongemoeid. Geeft het aantal geschreven dagrijen terug.
- Functie `zon_per_vak(p_grenzen timestamptz[]) returns table (volgnr integer, wh numeric, heeft_dag boolean)` (`language sql stable`): voor elk paar opeenvolgende grenzen `i` (1 tot en met aantal - 1) de som van `wh` van de rijen met `tijd >= grens[i]` en `tijd < grens[i+1]`; zonder rijen `wh` null en `heeft_dag` false; `heeft_dag` is waar als een van de rijen `stap = 'dag'` heeft. Gesorteerd op `volgnr`.
- Functie `verhoog_zon_verzoeken(p_maand text) returns integer`: zet in een opdracht `maand = p_maand` en `verzoeken = (bij dezelfde maand verzoeken + 1, anders 1)` en geeft de nieuwe stand terug.
- `revoke all` op de vier functies van `public`, `anon`, `authenticated`; `grant execute` aan `service_role`.

`api/_lib/solaredge.js` (alle netwerkverzoeken via een meegegeven `haal`, standaard `fetch`; tijdslimiet 10 seconden per verzoek met `AbortSignal.timeout`):
- `export const REDIRECT_URI = 'https://warm-app-flax.vercel.app/api/zon/terug'`
- `export class SolarEdgeFout extends Error` met veld `soort`: `'ongeldig'` (tokenadres 400 of 401: opnieuw koppelen nodig), `'verlopen'` (meetadres 401), `'geweigerd'` (403), `'limiet'` (429 met `x-ratelimit-remaining-minute` gelijk aan 0 of zonder die header), `'tegoed'` (429 met die header boven 0), `'vorm'` (antwoord niet te lezen), `'tijdelijk'` (netwerkfout, tijdslimiet, 5xx, andere status), en veld `status` (HTTP-status of null). De `message` bevat nooit inhoud van een antwoord, behalve bij `'vorm'` de sleutelnamen.
- `export function ingesteld()` geeft waar als beide omgevingsvariabelen een niet-lege tekst zijn.
- `export function autorisatieUrl(externId)` geeft de URL uit Vaste waarden (met `encodeURIComponent`).
- `export async function wisselCode(code, { haal } = {})` en `export async function ververs(refreshToken, { haal } = {})`: geven `{ accessToken, refreshToken, verlooptOp }` (`verlooptOp` is een `Date`: nu plus `expires_in` seconden; ontbreekt `expires_in` of is het geen positief getal, dan 7200). Ontbreekt een van beide tokens in een 200-antwoord: `SolarEdgeFout` met soort `'vorm'`.
- `export async function haalEnergie({ accessToken, siteId, van, tot, resolutie }, { haal } = {})`: `van` en `tot` zijn `Date` (verstuurd als `toISOString()`), `resolutie` is `'QUARTER_HOUR'` of `'DAY'`. Geeft `{ waarden: [{ tijd: Date, wh: number }] }`: alleen elementen met een getal als `value` (0 telt mee, null en ontbrekend niet), omgerekend naar Wh volgens `unit` van het antwoord (`WH` maal 1, `KWH` maal 1000, `MWH` maal 1000000, zonder `unit` Wh), negatieve waarden worden overgeslagen. Het tijdveld per element is het eerste aanwezige van `timestamp`, `time`, `date`, `dateTime`, `from`, `start`. Heeft `values` elementen met een getal maar geen enkel leesbaar tijdveld, of is `values` geen lijst: `SolarEdgeFout` met soort `'vorm'` en een `message` met de sleutelnamen van het antwoord en van het eerste element (geen waarden).

`api/_lib/zon.js` (zuivere functies, geen netwerk, geen database):
- `export const TEGOED_STOP = 1900`, `export const TEMPO_PER_DAG = 60`, `export const VERS_ZON_MS = 40 * 60 * 1000`
- `export function maandSleutel(nu)` geeft `'JJJJ-MM'` op de Amsterdamse kalender.
- `export function magPollen({ koppeling, nu })` geeft `true` of `false`. `koppeling` heeft de camelCase-velden van `leesZonKoppeling` (hieronder). Regels, in deze volgorde:
  1. `status` is niet `'actief'`: nee.
  2. Het Amsterdamse uur ligt niet tussen 5 en 22 (5:00 tot en met 22:59): nee.
  3. `verzoeken` in de lopende maand (`maand === maandSleutel(nu)`, anders telt het als 0) is `TEGOED_STOP` of meer: nee.
  4. `donker` is waar, `laatstePollOp` valt op dezelfde Amsterdamse dag als `nu` en het uur is 15 of later: nee (klaar voor vandaag).
  5. Halve snelheid (alleen als de Amsterdamse minuut onder de 15 ligt of van 30 tot en met 44): als `laatsteVermogenW` niet groter is dan 0 (nog geen opwek gezien), of als de verzoeken van deze maand hoger zijn dan `TEMPO_PER_DAG` maal de dag van de maand. Anders: ja.
- `export function verwerkEnergie({ waarden, nu })` geeft `{ rijen, vermogenW, donker }`: `rijen` zijn alle waarden met `tijd <= nu` als `{ tijd: <ISO>, wh }`; `vermogenW` is `Math.round(wh * 4)` van het laatste kwartier waarvan het einde (tijd plus 15 minuten) hooguit 45 minuten voor `nu` ligt, anders 0; `donker` is waar als het Amsterdamse uur 15 of later is en er in het laatste uur voor `nu` geen kwartier met meer dan 0 Wh is.
- `export function verrijkMetZon({ grenzen, vakken, totaal, zon })`: `zon` is de uitvoer van `leesZonPerVak` (lijst van `{ wh, heeftDag } | null` per vak). Geeft nieuwe `{ vakken, totaal }` terug (invoer niet muteren). Per vak: `zon` (kWh, 3 decimalen, of null zonder gegevens) en `huis` = `netImport - netExport + zon - (batLaden ?? 0) + (batOntladen ?? 0)`, afgerond op 3 decimalen, minimaal 0, en null als `netImport`, `netExport` of `zon` null is. Een vak korter dan 23 uur met `heeftDag` waar krijgt `samengevoegd: true`. `totaal.zon` en `totaal.huis`: som van de niet-lege vakken of null. `totaal.eigenPct`: over de vakken waar `huis` niet null is, `Math.round((1 - somNetImport / somHuis) * 100)` begrensd tussen 0 en 100, of null als `somHuis` 0 of er geen zulke vakken zijn.
- `export function zonNu({ koppeling, stand, nu })` geeft `{ zon, huis, zonStatus }`: `zonStatus` is `'geen'` zonder koppeling, anders de `status`. `zon` is `{ vermogenW }` als de status actief is en (`laatstePollOp` minder dan `VERS_ZON_MS` geleden is, of `donker` waar is, dan 0), anders null. `huis` is `{ vermogenW }` = `Math.max(0, net + zon - (batterij ?? 0))` als `zon` niet null is en het net vers is (zelfde regel als `maakNu`: `stand.netOntvangenOp` minder dan `VERS_MS` uit `energie.js` geleden en `netVermogenW` een getal); de batterij telt alleen mee als die vers is.

`api/_lib/opslag.js`:
- `leesZonKoppeling()` geeft null of `{ siteId, accessToken, accessVerlooptOp, refreshToken, status, gekoppeldOp, laatstePollOp, laatsteVermogenW, donker, maand, verzoeken, historieJaar, historieKlaar }` (tijden als ISO-tekst of null).
- `bewaarZonKoppeling({ siteId, accessToken, accessVerlooptOp, refreshToken })`: upsert van rij 1 met `status = 'actief'`, `gekoppeld_op = now`, en de overige velden terug naar hun beginwaarde (`donker` false, `laatste_poll_op` null, `laatste_vermogen_w` null, `historie_jaar` null, `historie_klaar` false). `maand` en `verzoeken` blijven staan als de rij al bestond.
- `bewaarZonTokens({ oudRefreshToken, accessToken, accessVerlooptOp, refreshToken })`: update van rij 1 alleen als het bewaarde `refresh_token` nog gelijk is aan `oudRefreshToken`; geeft `true` als er een rij is bijgewerkt, anders `false`.
- `zetZonStatus(status)`, `werkZonPollBij({ laatstePollOp, laatsteVermogenW, donker })`, `zetZonHistorie({ historieJaar, historieKlaar })`, `verhoogZonVerzoeken(maand)` (rpc, geeft het getal terug), `zetZonVerzoeken(maand, verzoeken)`.
- `bewaarZonKwartieren(rijen)`, `bewaarZonDagen(rijen)` (rpc's; een lege lijst doet niets en geeft 0), `leesZonPerVak(grenzen)` (geeft per vak `null` zonder gegevens of `{ wh, heeftDag }`, lijst van lengte `grenzen.length - 1`).

- [ ] **Step 1: Schrijf de falende tests.** Minimaal:
  - `solaredge.test.js`: `autorisatieUrl('abc 1')` is `https://connect.solaredge.com/authorize?client_id=<id>&external_id=abc%201`; `wisselCode` stuurt de juiste methode, het adres, de JSON-body met `redirect_uri` en geeft het paar terug met `verlooptOp` twee uur later (nep-klok); `ververs` stuurt `grant_type: 'refresh_token'` zonder `redirect_uri`; 400 geeft soort `ongeldig`, 500 en een gooiende `haal` geven `tijdelijk`, een 200 zonder `refresh_token` geeft `vorm`; de `message` van een fout bevat de tekst van het antwoord niet. `haalEnergie`: het adres met `from`, `to`, `resolution` en `unit=WH` en de Bearer-header; waarden met `timestamp` worden gelezen, ook met `time` of `date`; `unit: 'kWh'` wordt maal 1000; null en negatieve waarden vallen weg, 0 blijft; `values` met getallen maar zonder tijdveld geeft `vorm` met de sleutelnamen in de `message` en zonder de waarden; 401 geeft `verlopen`, 403 `geweigerd`, 429 met `x-ratelimit-remaining-minute: 0` geeft `limiet`, met `5` geeft `tegoed`. `ingesteld()` volgt de omgevingsvariabelen.
  - `zon-lib.test.js`: elke regel van `magPollen` (status, uur 4 en 23 nee, uur 5 en 22 ja, tegoed 1900 nee en 1899 ja, een telling van een andere maand telt niet, donker om 16 uur dezelfde dag nee, donker van gisteren ja, halve snelheid op minuut 3 ja en minuut 18 nee bij vermogen 0, volle snelheid bij vermogen boven 0, halve snelheid bij te veel verzoeken voor de dag van de maand); `verwerkEnergie` (rijen na `nu` vallen weg; `vermogenW` van het laatste kwartier, 0 als het laatste kwartier te oud is; `donker` om 17 uur met alleen nullen, niet om 12 uur, niet met opwek in het laatste uur); `verrijkMetZon` (huisverbruik met en zonder batterij; null als de zon ontbreekt; nooit negatief; `eigenPct` 72 bij net 3,2 en huis 11,4; begrensd op 0 en 100; null zonder huis; een uurvak met `heeftDag` wordt samengevoegd, een dagvak niet; de invoer wordt niet gemuteerd); `zonNu` (geen koppeling, verlopen, vers, te oud, donker geeft 0, huis met en zonder verse batterij, huis null zonder vers net); `maandSleutel` rond de jaarwisseling op Amsterdamse tijd.
  - `zon-opslag.test.js`: de rpc-namen en parameters, de omzetting naar camelCase, `bewaarZonTokens` geeft `false` als er geen rij is bijgewerkt en gebruikt het oude refresh-token als voorwaarde, een lege lijst kwartieren doet geen rpc, `leesZonPerVak` geeft de juiste lengte met null waar geen gegevens zijn, en elke functie gooit bij een databasefout.
- [ ] **Step 2: Draai en zie falen.** Run: `npx vitest run tests/solaredge.test.js tests/zon-lib.test.js tests/zon-opslag.test.js`.
- [ ] **Step 3: Schrijf de migratie, de twee bibliotheken en de opslagfuncties.**
- [ ] **Step 4: Draai alle tests.** Run: `npm test`. Expected: alles groen, ook `tests/laden.test.js`.
- [ ] **Step 5: Commit.**

### Task 2: Koppelen, de crontaak en de uitbreiding van `/api/energie`

**Files:**
- Create: `api/zon/koppel.js`, `api/zon/terug.js`, `api/cron/zon.js`
- Modify: `api/energie/index.js`, `api/beheer/index.js` (alleen het GET-antwoord), `vercel.json`
- Test: `tests/zon-api.test.js`, `tests/cron-zon.test.js`, aanvullingen in `tests/energie-api.test.js` en `tests/beheer-api.test.js`

**Interfaces:**
- Consumes: alles uit Task 1; bestaand `requireBeheer`, `requireUser`, `geenCache`, `FOUT_STORING` (`guard.js`), `cronGeheimKlopt` (`cron.js`), `amsterdamMiddernacht`, `amsterdamDelen` (`tijd.js`).
- Produces:
  - `GET /api/zon/koppel`: eerst `requireBeheer`. Andere methode: 405. Is `ingesteld()` onwaar: 503 `{ ok: false, error: 'SolarEdge is nog niet ingesteld.' }`. Anders: maak 32 willekeurige hex-tekens, zet de cookie `warm_zon=<waarde>; Path=/api/zon; HttpOnly; Secure; SameSite=Lax; Max-Age=600` en antwoord 302 met `Location: autorisatieUrl(<waarde>)`.
  - `GET /api/zon/terug`: eerst `requireBeheer` (faalt dat, dan het gewone antwoord van de guard). Daarna, in deze volgorde, en bij elke afwijzing een 302 naar `/?zon=mislukt` zonder verdere uitleg en met het wissen van de cookie: de cookie `warm_zon` moet bestaan en gelijk zijn aan de queryparameter `external_id` (vergelijk met `timingSafeEqual` na een lengtecontrole); `code` is een tekst van 1 tot 512 tekens; `site_id` bestaat uit 1 tot 12 cijfers. Dan `wisselCode(code)` en `bewaarZonKoppeling(...)`; lukt dat: cookie wissen en 302 naar `/?zon=gekoppeld`. Een `SolarEdgeFout` of databasefout: log alleen de soort en de status, 302 naar `/?zon=mislukt`. Er wordt nooit iets van `code`, de tokens of het antwoord van SolarEdge gelogd of teruggegeven.
  - `GET /api/cron/zon`: `cronGeheimKlopt`, anders 401 `{ ok: false }`. Antwoordt altijd 200 `{ ok: true, ... }` met korte tellingen (zoals `gepold`, `kwartieren`, `historie`), behalve bij een databasefout (500 `{ ok: false }`). Verloop:
    1. Geen koppeling of `ingesteld()` onwaar: `{ ok: true, overgeslagen: 'geen koppeling' }`. Status `verlopen`: `{ ok: true, overgeslagen: 'verlopen' }`.
    2. Is het vandaag de eerste ronde na 5 uur en staat `donker` nog op waar van een eerdere dag, dan telt dat in `magPollen` al niet mee; er hoeft niets gewist te worden.
    3. Bepaal of er gepold gaat worden (`magPollen`) en of er geschiedenis opgehaald gaat worden (zie 6). Is geen van beide nodig: klaar, zonder een token te verversen.
    4. Token: ligt `accessVerlooptOp` minder dan 5 minuten in de toekomst of ontbreekt het access-token, dan `ververs(refreshToken)`. Het nieuwe paar wordt METEEN bewaard met `bewaarZonTokens` (met het oude refresh-token als voorwaarde) voordat er iets anders gebeurt. Geeft `bewaarZonTokens` `false` (een andere ronde was eerder), dan stopt deze ronde zonder verdere verzoeken. Een fout van soort `ongeldig`: `zetZonStatus('verlopen')` en stoppen. Soort `tijdelijk` of iets anders: stoppen, de koppeling blijft actief.
    5. Pollen: `haalEnergie` met `resolutie: 'QUARTER_HOUR'`, `van` = middernacht Amsterdam van gisteren, `tot` = nu. Na een geslaagd antwoord: `verhoogZonVerzoeken(maandSleutel(nu))`, `bewaarZonKwartieren(rijen)` en `werkZonPollBij(...)` met de uitkomst van `verwerkEnergie`.
    6. Geschiedenis, hooguit een verzoek per ronde en alleen als `historieKlaar` onwaar is, de status actief is en de verzoeken van deze maand onder `TEGOED_STOP - 200` liggen (in elk uur van de dag, ook als er niet gepold wordt): het op te halen jaar is `historieJaar` of, als dat null is, het lopende Amsterdamse jaar. `haalEnergie` met `resolutie: 'DAY'`, `van` = 1 januari van dat jaar (Amsterdamse middernacht), `tot` = 1 januari van het jaar erna of, voor het lopende jaar, middernacht van gisteren. De waarden worden dagrijen (tijd = Amsterdamse middernacht van de dag waarin de waarde valt) via `bewaarZonDagen`. Daarna `verhoogZonVerzoeken` en `zetZonHistorie`: had het jaar minstens een waarde boven 0, dan `historieJaar` een jaar lager; anders `historieKlaar: true`. Nooit verder terug dan het jaar 2010 (dan ook klaar).
    7. Fouten bij 5 of 6: soort `verlopen`: een keer verversen is niet nodig, de volgende ronde ververst vanzelf als het token verloopt; zet het access-token niet terug, log de soort. Soort `tegoed`: `zetZonVerzoeken(maandSleutel(nu), 2000)`. Soort `geweigerd`: `zetZonStatus('verlopen')`. Soort `limiet`, `tijdelijk` en `vorm`: alleen loggen (soort en status; bij `vorm` ook de `message` met de sleutelnamen). Na een fout bij 5 wordt 6 in die ronde niet meer gedaan.
  - `vercel.json`: een derde cron `{ "path": "/api/cron/zon", "schedule": "3-59/15 * * * *" }`.
  - `GET /api/energie`: haalt in dezelfde `Promise.all` ook `leesZonKoppeling()` en `leesZonPerVak(grenzen)` op; het antwoord krijgt `nu.zon`, `nu.huis` (uit `zonNu`, in plaats van de vaste null), een nieuw veld `zonStatus` op het hoogste niveau, en `vakken`/`totaal` uit `verrijkMetZon`. Het antwoord bevat nooit tokens of het `site_id`.
  - `GET /api/beheer`: het antwoord krijgt `zon: { ingesteld, status, gekoppeldOp, laatstePollOp, verzoeken }` (`status` is `'geen'` zonder koppeling; `verzoeken` is de telling van de lopende maand, anders 0). Geen tokens, geen `site_id`.

- [ ] **Step 1: Schrijf de falende tests** (opslag, `solaredge.js` en de guard nabootsen zoals de bestaande api-tests doen). Minimaal: voor `koppel`: niet-beheerder en niet-ontgrendeld toestel krijgen het antwoord van de guard, 503 zonder instellingen, 302 met de cookie en dezelfde waarde in `external_id`; voor `terug`: zonder cookie, met een andere `external_id`, zonder `code`, met een `site_id` met letters, bij een `SolarEdgeFout` en bij een databasefout telkens 302 naar `/?zon=mislukt` zonder opslaan; het goede pad bewaart de koppeling met het `site_id` en gaat naar `/?zon=gekoppeld`; de cookie wordt gewist; de loguitvoer bevat de code en de tokens niet. Voor de cron: 401 zonder geheim; geen koppeling; verlopen; buiten de uren wordt er niet gepold en niet ververst als er ook geen geschiedenis te halen is; verversen bewaart het nieuwe paar voor het meetverzoek (volgorde van aanroepen); `bewaarZonTokens` onwaar stopt de ronde; `ongeldig` zet de status op verlopen; het goede pad telt een verzoek, bewaart de kwartieren en werkt de poll bij; `tegoed` zet de verzoeken op 2000; `vorm` slaat niets op; geschiedenis: een jaar met opwek verlaagt `historieJaar`, een leeg jaar zet `historieKlaar`, het lopende jaar loopt tot gisteren, en na een pollfout wordt er geen geschiedenis gehaald. Voor `energie`: `nu.zon`, `nu.huis`, `zonStatus`, `zon` en `huis` in de vakken en `eigenPct` in het totaal; zonder koppeling `zonStatus: 'geen'` en `zon: null`; het antwoord bevat geen `refreshToken`, `accessToken` of `siteId`. Voor `beheer`: het veld `zon` in alle drie de toestanden.
- [ ] **Step 2: Draai en zie falen.**
- [ ] **Step 3: Schrijf de drie handlers en pas de twee bestaande en `vercel.json` aan.**
- [ ] **Step 4: Draai alle tests.** Run: `npm test`.
- [ ] **Step 5: Commit.**

### Task 3: Het scherm en Beheer

**Files:**
- Modify: `src/components/Energie.jsx`, `src/components/EnergieGrafiek.jsx`, `src/lib/energie.js`, `src/components/Beheer.jsx`, `src/App.jsx`, `src/index.css`, `.superpowers/preview/mock-api.mjs` (niet in git)
- Test: aanvullingen in `tests/energie-scherm.test.jsx`, `tests/energie-client.test.js`, `tests/beheer.test.jsx`, `tests/app.test.jsx`

**Interfaces:**
- Consumes: het antwoord van `GET /api/energie` met daarin nu ook `zonStatus` (`'geen' | 'actief' | 'verlopen'`), `nu.zon` (`{ vermogenW } | null`), `nu.huis` (`{ vermogenW } | null`), per vak `zon` en `huis` (kWh of null) en in `totaal` `zon`, `huis` en `eigenPct` (geheel getal of null); het veld `zon` van `GET /api/beheer` (`{ ingesteld, status, gekoppeldOp, laatstePollOp, verzoeken }`).

**Het scherm Energie:**
- Vakje Zon: bij `zonStatus` `'geen'`: "volgt nog" (zoals nu). Bij `'verlopen'`: hoofdgetal "-" en "koppeling verlopen". Bij `'actief'` met `nu.zon`: `formatVermogen` en "wekt op" bij meer dan 0 watt, anders "geen opwek"; zonder `nu.zon`: "-" en "geen gegevens".
- Vakje Huis: bij `'geen'`: "volgt nog". Anders met `nu.huis`: `formatVermogen` en "verbruikt"; zonder: "-" en "geen gegevens".
- Totalen: is `zonStatus` niet `'geen'`, dan acht waarden in drie kolommen, in deze volgorde: Verbruikt (`totaal.huis`), Opgewekt (`totaal.zon`), Eigen stroom (`eigenPct` als "72%", zonder waarde "-"), Van het net, Teruggeleverd, Batterij geladen, Batterij ontladen, Gas. Bij `'geen'` blijven de huidige vijf waarden.
- Grafiek: is `zonStatus` niet `'geen'`, dan toont de grafiek per vak het verbruik (`huis`) boven de nullijn en de opwek (`zon`) eronder, met de legenda "Verbruik boven de lijn" en "Opwek onder de lijn" en de tekst voor schermlezers `Staafgrafiek voor <titel>. Verbruikt <kWh>, opgewekt <kWh>.` Bij `'geen'` blijft de grafiek zoals nu (van het net en teruggeleverd). De lichte staaf voor `samengevoegd` en de derde legendaregel blijven werken in beide gevallen. Geef `EnergieGrafiek` daarvoor twee algemene reeksen mee (waarden boven, waarden onder, hun namen en hun totalen) in plaats van de logica te dupliceren.
- Het scherm blijft op 375 x 647 passen. De vakjes Zon en Huis hebben nu inhoud, dus maak alle vier de vakjes even hoog en compact (naam, hoofdgetal, een regel tekst) en houd de totalen op drie regels.

**Beheer:** een nieuwe sectie "Zonnepanelen" onder "Lang aan":
- `zon.ingesteld` onwaar: tekst "SolarEdge is nog niet ingesteld." en geen knop.
- Status `'geen'`: tekst "Nog niet gekoppeld." en een link in knopstijl "SolarEdge koppelen" naar `/api/zon/koppel` (een gewone `<a href>`, geen fetch: de browser moet naar SolarEdge kunnen doorgaan).
- Status `'actief'`: "Gekoppeld sinds <datum>." en, als er een laatste poll is, "Laatst opgehaald om <tijd>." plus "Deze maand <n> van 2000 verzoeken gebruikt." en een kleinere link "Opnieuw koppelen".
- Status `'verlopen'`: melding "De koppeling is verlopen." en de knop "SolarEdge koppelen".

**App:** bij het laden kijkt `App.jsx` een keer naar de queryparameter `zon`. Bij `gekoppeld` of `mislukt` verschijnt, zodra de gebruiker binnen is, bovenaan een melding (`role="status"`): "SolarEdge is gekoppeld. De eerste cijfers komen binnen een kwartier." of "Het koppelen met SolarEdge is niet gelukt. Probeer het opnieuw vanuit Beheer." met een knop "Sluiten". De parameter wordt meteen uit de adresbalk gehaald met `history.replaceState`, zodat een herlaadactie de melding niet opnieuw toont.

**`mock-api.mjs`:** laat `GET /api/energie` `zonStatus: 'actief'`, `nu.zon`, `nu.huis`, `zon`/`huis` per vak en `eigenPct` teruggeven, en `GET /api/beheer` een veld `zon`.

- [ ] **Step 1: Schrijf de falende tests.** Minimaal: de vier toestanden van het vakje Zon en de drie van Huis; acht totalen in de genoemde volgorde bij een actieve koppeling en vijf bij `'geen'`; "72%" en "-" bij Eigen stroom; de grafiek met verbruik en opwek (legenda en tekst voor schermlezers) en de oude grafiek bij `'geen'`; een samengevoegd vak geeft in beide gevallen een lichte staaf; Beheer in de vier toestanden met de juiste link; de melding in `App` bij `?zon=gekoppeld` en `?zon=mislukt`, het sluiten ervan, en dat `history.replaceState` de parameter weghaalt; zonder parameter geen melding.
- [ ] **Step 2: Draai en zie falen.**
- [ ] **Step 3: Bouw de onderdelen.**
- [ ] **Step 4: Draai alle tests en de build.** Run: `npm test` en `npx vite build --outDir "dist_v$(date +%s)"` (verwacht "built"), daarna de map `dist_v*` weer weg.
- [ ] **Step 5: Commit.**
