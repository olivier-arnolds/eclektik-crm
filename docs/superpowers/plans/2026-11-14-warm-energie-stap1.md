# Warm energietab stap 1 (net, batterij, gas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een scherm "Energie" in Warm dat de stand van het stroomnet, de thuisbatterij en het gas toont, gevoed door een uitleesprogramma op de Synology NAS.

**Architecture:** Een Python-programma op de NAS leest de HomeWizard P1-meter en Plug-In Battery uit via de lokale API v2 en stuurt elke 30 seconden een meting naar `POST /api/energie/meting` (eigen geheim). De server bewaart de laatste stand plus een momentopname per 5 minuten in Supabase. `GET /api/energie` levert de stand van nu en een reeks per periode; het scherm `Energie.jsx` toont die.

**Tech Stack:** bestaande Warm-stack (React 19 + Vite, Vercel Node-functies ESM, Supabase via service-key, Vitest 5). NAS-programma: Python 3.8+ met alleen de standaardbibliotheek.

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md`, hoofdstuk 10 (hoofdstuk 9 en 10 winnen van oudere hoofdstukken).

**Repo:** `/Users/olivierarnolds/Desktop/warm-app` (branch `main`). Alle paden hieronder zijn relatief aan die map.

## Global Constraints

- Alle tekst (UI, commentaar, commits, logregels) in het Nederlands. NOOIT een em-dash (U+2014) of en-dash als gedachtestreep, nergens. Gebruik een komma, een punt of ` - `.
- Geen nieuwe npm-pakketten. Het NAS-programma gebruikt alleen de Python-standaardbibliotheek.
- Geheimen staan nooit in code, tests, commits of uitvoer. Scripts tonen hooguit de naam en lengte van een geheim.
- Het NAS-programma leest alleen. Het stuurt nooit `PUT` of `DELETE` naar een HomeWizard-apparaat. De enige `POST` naar een apparaat is `POST /api/user` om een token te krijgen.
- Tests raken geen echte database, geen echt apparaat en geen echt netwerk. Alles via nagebootste afhankelijkheden, in de stijl van de bestaande tests (Vitest 5 zonder globals; componenttests beginnen met `// @vitest-environment jsdom` en ruimen op met `cleanup()`).
- Elk bestand onder `api/` moet echt laden in Node (bewaakt door `tests/laden.test.js`).
- Alle databasevragen lopen via `api/_lib/opslag.js`; elke functie daar gooit bij een fout (bestaand patroon met `check`).
- Antwoorden van `api/` krijgen `geenCache(res)` uit `api/_lib/guard.js`.
- Tijdrekenen gebeurt in Europe/Amsterdam met de hulpfuncties in `api/_lib/tijd.js`, zonder datumbibliotheek.
- Geen lichtgele of pastelkleurige tekst op een witte achtergrond.
- Het hoofdscherm met de kamers moet op 375 x 647 zonder scrollen blijven passen (er komt dus geen tabbalk bij).
- Getallen op het scherm in Nederlandse notatie (komma als decimaalteken).
- Commit per taak met een beschrijvende Nederlandse boodschap, afgesloten met de regel `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Niet pushen.

## Vaste waarden

- Apparaten: net = soort `p1dongle`, serie `3c39e72cab62`, laatst bekende adres `192.168.2.5`. Batterij = soort `battery`, serie `5c2faf3f2308`, adres `192.168.2.4`.
- De naam in het certificaat van een apparaat is `appliance/<soort>/<serie>`, uitgegeven door "Appliance Access CA" van HomeWizard (sha256-vingerafdruk `4E:C2:77:E6:20:33:FA:E8:BC:37:3E:3F:2A:97:66:76:D3:F6:65:68:38:73:F1:EA:8E:3B:DF:78:AC:68:00:03`). Het PEM-bestand staat klaar op `/private/tmp/claude-501/-Users-olivierarnolds-Desktop-eclektik-crm/cd801e0f-8493-4a97-95c6-df172006b3b6/scratchpad/hw/homewizard-ca.pem`; kopieer het naar `nas/homewizard-ca.pem`.
- HomeWizard API v2 (alle verzoeken HTTPS op poort 443, header `X-Api-Version: 2`):
  - Token vragen: `POST /api/user`, `Content-Type: application/json`, body `{"name": "local/warm"}`. Voor de knopdruk: HTTP 403 met `{"error": "user:creation-not-enabled"}`. Na de knopdruk (venster 30 seconden): HTTP 200 met `{"token": "<32 tekens A-F0-9>", "name": "local/warm"}`.
  - Daarna: header `Authorization: Bearer <token>`. Ongeldig token: HTTP 401 met `{"error": "user:unauthorized"}`.
  - `GET /api/measurement` op de P1-meter: `power_w` (negatief is terugleveren), `energy_import_kwh`, `energy_export_kwh` (kunnen ontbreken; dan de som van `energy_import_t1_kwh` tot en met `t4` respectievelijk `energy_export_t1_kwh` tot en met `t4`), `external` (lijst met `{type, value, unit}`; gas is `type == "gas_meter"` met `unit == "m3"`). Alle velden zijn optioneel.
  - `GET /api/measurement` op de batterij: `power_w` (positief is laden), `state_of_charge_pct`, `energy_import_kwh` (geladen), `energy_export_kwh` (ontladen).
- Meting zoals de NAS hem naar Warm stuurt (`POST /api/energie/meting`, header `Authorization: Bearer <ENERGIE_GEHEIM>`, JSON):
  ```json
  {
    "net": { "vermogen_w": 1008, "import_kwh": 24730.858, "export_kwh": 9149.807, "gas_m3": 4740.277 },
    "batterij": { "vermogen_w": -400, "lading_pct": 64, "import_kwh": 123.456, "export_kwh": 120.1 }
  }
  ```
  `net` en `batterij` mogen elk `null` zijn of ontbreken (apparaat niet bereikbaar), maar niet allebei. Elk veld binnen een deel mag `null` zijn.
- Grenzen voor de controle op de server: `vermogen_w` eindig getal tussen -100000 en 100000 (wordt afgerond op een geheel getal); `*_kwh` en `gas_m3` eindig getal tussen 0 en 10000000; `lading_pct` tussen 0 en 100. Een waarde buiten de grenzen of van het verkeerde type maakt de hele meting ongeldig (HTTP 400).
- "Vers" betekent: de laatste meting is minder dan 5 minuten oud.
- Momentopnames per vak van 5 minuten (de tijd van ontvangst op de server, naar beneden afgerond op 5 minuten).

## Review Focus

- Een apparaat is tijdelijk onbereikbaar: de meting bevat dan alleen het andere deel. De opgeslagen stand van het ontbrekende deel mag niet stilzwijgend als vers worden getoond en de momentopname van dat vak mag later nog worden aangevuld.
- De NAS heeft uren of dagen niets gestuurd: de reeks mag geen negatieve of verzonnen waarden tonen; vakken zonder gegevens zijn `null` en het scherm zegt sinds wanneer de gegevens stilstaan.
- Dagen met 23 of 25 uur (zomer- en wintertijd) in de dagreeks, en de jaarwisseling in de week- en maandreeks.
- Een teller die lager is dan de vorige (nieuwe meter of batterij): dat vak wordt `null`, niet negatief.
- Een meting zonder of met een fout geheim, met een veel te grote body of met tekst waar een getal hoort: geweigerd zonder iets op te slaan.

---

### Task 1: Database, opslag en rekenlogica

**Files:**
- Create: `supabase/migrations/0007_energie.sql`
- Create: `api/_lib/energie.js`
- Modify: `api/_lib/opslag.js` (drie functies erbij, onderaan)
- Modify: `api/_lib/tijd.js` (exporteer een hulpfunctie)
- Test: `tests/energie-lib.test.js`, `tests/tijd.test.js` (aanvullen)

**Interfaces:**
- Consumes: `supabaseAdmin()` via het bestaande `db()` en `check()` in `opslag.js`; `amsterdamDelen` en de interne `momentVoorKlok` in `tijd.js`.
- Produces (exacte namen, latere taken rekenen hierop):
  - `tijd.js`: `export function amsterdamMiddernacht(jaar, maand, dag)` geeft de `Date` waarop de Amsterdamse klok op die datum 00:00 toont (`maand` 1..12; `dag` mag buiten de maand vallen en rolt dan door, zoals `Date.UTC`).
  - `energie.js`:
    - `export const VERS_MS = 5 * 60 * 1000`
    - `export const PERIODES = ['dag', 'week', 'maand', 'jaar']`
    - `export function valideerMeting(body)` geeft `{ ok: true, meting }` of `{ ok: false }`. `meting` heeft precies deze sleutels, elk een getal of `null`: `netVermogenW`, `netImportKwh`, `netExportKwh`, `gasM3`, `batVermogenW`, `batLadingPct`, `batImportKwh`, `batExportKwh`, plus de booleans `heeftNet` en `heeftBatterij` (waar als dat deel een object was).
    - `export function periodeGrenzen(periode, nu = new Date())` geeft `{ grenzen: Date[], labels: string[] }` met `grenzen.length === labels.length + 1`.
    - `export function maakReeks({ grenzen, labels, punten, stand, nu })` geeft `{ vakken, totaal }`.
    - `export function maakNu(stand, nu = new Date())` geeft het `nu`-deel van het antwoord van `GET /api/energie` (zie Task 2).
  - `opslag.js`:
    - `export async function bewaarEnergieMeting(meting)` (roept de databasefunctie `bewaar_energiemeting` aan).
    - `export async function leesEnergieStand()` geeft de ene rij uit `energie_stand` of `null`, met sleutels in camelCase: `ontvangenOp` (ISO-tekst), `netOntvangenOp`, `batOntvangenOp`, en dezelfde acht meetsleutels als `meting`.
    - `export async function leesEnergieOpGrenzen(grenzen)` neemt `Date[]` en geeft een lijst van dezelfde lengte en volgorde met per grens `null` of `{ tijd, netImportKwh, netExportKwh, gasM3, batImportKwh, batExportKwh }` (getallen of `null`; `tijd` ISO-tekst): de eerste momentopname op of na die grens.

**Databaseontwerp (`0007_energie.sql`):**
- Tabel `energie_stand`: `id smallint primary key default 1 check (id = 1)`, `ontvangen_op timestamptz not null`, `net_ontvangen_op timestamptz`, `bat_ontvangen_op timestamptz`, `net_vermogen_w integer`, `net_import_kwh numeric(12,3)`, `net_export_kwh numeric(12,3)`, `gas_m3 numeric(12,3)`, `bat_vermogen_w integer`, `bat_lading_pct numeric(5,1)`, `bat_import_kwh numeric(12,3)`, `bat_export_kwh numeric(12,3)`.
- Tabel `energie_metingen`: `tijd timestamptz primary key` (begin van het vak van 5 minuten), `net_import_kwh`, `net_export_kwh`, `gas_m3`, `bat_import_kwh`, `bat_export_kwh` (alle `numeric(12,3)`), `bat_lading_pct numeric(5,1)`.
- Op beide tabellen `enable row level security`, zonder policies (zoals alle tabellen in dit project).
- Functie `bewaar_energiemeting(p_heeft_net boolean, p_heeft_bat boolean, p_net_vermogen_w integer, p_net_import_kwh numeric, p_net_export_kwh numeric, p_gas_m3 numeric, p_bat_vermogen_w integer, p_bat_lading_pct numeric, p_bat_import_kwh numeric, p_bat_export_kwh numeric) returns void`, `language plpgsql`, `security invoker`, `set search_path = public`. In een transactie:
  1. Upsert van rij 1 in `energie_stand`: `ontvangen_op = now()`. Is `p_heeft_net` waar, dan de vier netvelden overschrijven en `net_ontvangen_op = now()`; anders die velden en `net_ontvangen_op` ongemoeid laten. Hetzelfde voor de batterij met `p_heeft_bat`.
  2. Insert in `energie_metingen` met `tijd` = `now()` naar beneden afgerond op 5 minuten, met de tellerstanden uit deze meting. Bij een bestaande rij: elk veld dat nog `null` is aanvullen (`coalesce(bestaand, nieuw)`), gevulde velden niet overschrijven.
- Functie `energie_op_grenzen(p_grenzen timestamptz[]) returns table (volgnr integer, tijd timestamptz, net_import_kwh numeric, net_export_kwh numeric, gas_m3 numeric, bat_import_kwh numeric, bat_export_kwh numeric)`, `language sql stable`, `set search_path = public`: voor elke grens (met `unnest ... with ordinality`) de eerste rij uit `energie_metingen` met `tijd >= grens` (lateral, `order by tijd limit 1`); geen rij gevonden geeft `tijd` en de rest `null`. Gesorteerd op `volgnr`.
- `revoke all` op beide functies van `public`, `anon` en `authenticated`; `grant execute` aan `service_role`.
- De controller past de migratie zelf toe op de database. De implementer schrijft alleen het bestand.

**Rekenregels:**
- `valideerMeting`: `body` moet een object zijn. `net` en `batterij` zijn elk een object, `null` of afwezig; iets anders is ongeldig. Beide afwezig of `null` is ongeldig. Binnen een deel: een veld is een getal binnen de grenzen (zie Vaste waarden), `null` of afwezig (wordt `null`); iets anders maakt de meting ongeldig. Onbekende sleutels worden genegeerd. `vermogen_w` wordt afgerond met `Math.round`.
- `periodeGrenzen` (alle grenzen op Amsterdamse middernacht of een heel uur):
  - `dag`: van middernacht vandaag tot middernacht morgen in stappen van precies 3600 seconden vanaf de eerste grens, zodat een dag 23, 24 of 25 vakken heeft; de laatste grens is middernacht morgen. Label = het Amsterdamse uur van het begin van het vak als tekst (`"0"` tot `"23"`).
  - `week`: de laatste 7 dagen tot en met vandaag (8 grenzen op middernacht). Labels `ma di wo do vr za zo` naar de weekdag van het begin van het vak.
  - `maand`: elke dag van de lopende maand. Label = dagnummer als tekst.
  - `jaar`: elke maand van het lopende jaar (13 grenzen). Labels `jan feb mrt apr mei jun jul aug sep okt nov dec`.
  - Een onbekende periode geeft `null`.
- `maakReeks`: `punten` is de uitvoer van `leesEnergieOpGrenzen` voor `grenzen`. Voor vak `i` (van `grenzen[i]` tot `grenzen[i + 1]`):
  - begin = `punten[i]`. Is er geen begin, of ligt `begin.tijd` op of na `grenzen[i + 1]` (er is in dit vak nog niets gemeten), of ligt `grenzen[i]` na `nu`, dan zijn alle waarden van dit vak `null`.
  - eind = `punten[i + 1]` als dat bestaat; anders de tellerstanden uit `stand` (het vak loopt nog of de gegevens houden hier op). Is er ook geen `stand`, dan `null`.
  - per teller: `eind - begin`, afgerond op 3 decimalen; `null` als een van beide `null` is of het verschil negatief is.
  - een vak is `{ label, netImport, netExport, batLaden, batOntladen, gas }` (`batLaden` uit `batImportKwh`, `batOntladen` uit `batExportKwh`).
  - `totaal` heeft dezelfde vijf sleutels: de som van de niet-lege vakken, afgerond op 3 decimalen, of `null` als alle vakken voor die sleutel `null` zijn.
- `maakNu(stand, nu)`: zie het antwoordformaat in Task 2. `vers` is waar als `stand.ontvangenOp` minder dan `VERS_MS` voor `nu` ligt. `net` is `null` als `netOntvangenOp` ontbreekt of ouder is dan `VERS_MS`; hetzelfde voor `batterij` met `batOntvangenOp`.

- [ ] **Step 1: Schrijf de falende tests** in `tests/energie-lib.test.js` en vul `tests/tijd.test.js` aan. Minimaal:
  - `amsterdamMiddernacht(2026, 11, 14)` is `2026-11-13T23:00:00.000Z`; `amsterdamMiddernacht(2026, 7, 1)` is `2026-06-30T22:00:00.000Z`; `amsterdamMiddernacht(2026, 12, 32)` is gelijk aan `amsterdamMiddernacht(2027, 1, 1)`.
  - `valideerMeting`: het voorbeeld uit Vaste waarden geeft `ok: true` met `netVermogenW: 1008`, `batVermogenW: -400`, `heeftNet: true`, `heeftBatterij: true`; alleen `net` geeft `heeftBatterij: false` en vier `null`-batterijvelden; `{}`, `null`, `{ net: null, batterij: null }`, `{ net: 5 }`, `{ net: { vermogen_w: '1008' } }`, `{ net: { import_kwh: -1 } }`, `{ batterij: { lading_pct: 101 } }`, `{ net: { vermogen_w: Infinity } }` geven `ok: false`; `vermogen_w: 12.6` wordt `13`.
  - `periodeGrenzen('dag', new Date('2026-11-14T10:24:00Z'))`: 25 grenzen, eerste `2026-11-13T23:00:00.000Z`, laatste `2026-11-14T23:00:00.000Z`, labels `"0"` tot `"23"`.
  - `periodeGrenzen('dag', new Date('2026-10-25T10:00:00Z'))` (wintertijd gaat in): 26 grenzen en 25 labels, met `"2"` twee keer; `periodeGrenzen('dag', new Date('2026-03-29T10:00:00Z'))`: 24 grenzen en 23 labels zonder `"2"`.
  - `periodeGrenzen('week', new Date('2026-11-14T10:24:00Z'))`: 8 grenzen, laatste label `za`, eerste `zo`; `periodeGrenzen('week', new Date('2027-01-02T12:00:00Z'))` begint op `2026-12-26T23:00:00.000Z`.
  - `periodeGrenzen('maand', ...)` in november 2026: 31 grenzen, labels `"1"` tot `"30"`; `periodeGrenzen('jaar', ...)`: 13 grenzen, labels `jan` tot `dec`; `periodeGrenzen('eeuw')` is `null`.
  - `maakReeks` met drie grenzen: gewone verschillen; een vak zonder begin is `null`; een begin dat op of na de volgende grens ligt geeft `null`; het lopende vak gebruikt `stand`; een lagere eindstand geeft `null`; `totaal` telt alleen niet-lege vakken en is `null` als alles leeg is; een vak dat na `nu` begint is `null`; afronding (`0.1 + 0.2` geeft `0.3`).
  - `maakNu`: verse stand geeft `vers: true` met `net` en `batterij` gevuld; een stand van 6 minuten oud geeft `vers: false`; een verse stand waarvan `batOntvangenOp` 10 minuten oud is geeft `batterij: null` en `net` gevuld; `stand === null` geeft `bijgewerkt: null`, `vers: false`, `net: null`, `batterij: null`.
- [ ] **Step 2: Draai de tests en zie ze falen.** Run: `npx vitest run tests/energie-lib.test.js tests/tijd.test.js`. Expected: FAIL (functies bestaan niet).
- [ ] **Step 3: Schrijf `0007_energie.sql`, `api/_lib/energie.js`, de export in `tijd.js` en de drie functies in `opslag.js`.** De opslagfuncties zetten snake_case-kolommen om naar de camelCase-sleutels hierboven en `numeric`-waarden (die als tekst kunnen binnenkomen) naar getallen. `bewaarEnergieMeting` roept `db().rpc('bewaar_energiemeting', {...})` aan; `leesEnergieOpGrenzen` roept `db().rpc('energie_op_grenzen', { p_grenzen: [...ISO-teksten] })` aan en zet het antwoord op volgorde van `volgnr` om naar een lijst van dezelfde lengte als de invoer.
- [ ] **Step 4: Voeg tests toe voor de opslagfuncties** in de stijl van de bestaande opslagtests in dit project (zoek hoe andere tests `supabaseAdmin` nabootsen en volg dat): de juiste rpc-naam en parameters, omzetting naar camelCase en getallen, `null` bij een grens zonder rij, en gooien bij een databasefout.
- [ ] **Step 5: Draai alle tests.** Run: `npm test`. Expected: alles groen, inclusief `tests/laden.test.js`.
- [ ] **Step 6: Commit.**

### Task 2: De twee eindpunten

**Files:**
- Create: `api/energie/meting.js`, `api/energie/index.js`
- Modify: `api/_lib/cron.js` (algemene vergelijking erbij)
- Test: `tests/energie-api.test.js`

**Interfaces:**
- Consumes: uit Task 1 `valideerMeting`, `periodeGrenzen`, `maakReeks`, `maakNu`, `PERIODES`, `bewaarEnergieMeting`, `leesEnergieStand`, `leesEnergieOpGrenzen`; bestaand `geenCache`, `requireUser`, `FOUT_STORING` uit `guard.js`.
- Produces:
  - `cron.js`: `export function bearerKlopt(req, geheim)` (waar als `geheim` een niet-lege tekst is en de header `authorization` precies `Bearer <geheim>` is, vergeleken met `timingSafeEqual` na een lengtecontrole). `cronGeheimKlopt` gaat deze functie gebruiken; het gedrag van `cronGeheimKlopt` verandert niet.
  - `POST /api/energie/meting`: geheim uit `process.env.ENERGIE_GEHEIM`.
    - andere methode: 405 `{ ok: false }` met header `Allow: POST`.
    - geheim ontbreekt in de env of klopt niet: 401 `{ ok: false }`. Er wordt dan niets gevalideerd of opgeslagen.
    - `valideerMeting(req.body)` faalt: 400 `{ ok: false }`.
    - opslaan lukt: 200 `{ ok: true }`. Databasefout: 500 `{ ok: false }` en een `console.error` zonder de inhoud van de meting.
  - `GET /api/energie?periode=dag|week|maand|jaar` (zonder of met een onbekende `periode`: `dag`): eerst `requireUser(req, res)` zoals de andere eindpunten (kijk in `api/rooms/index.js` hoe dat patroon met de vroege `return` werkt). Andere methode: 405 met `Allow: GET`. Antwoord 200:
    ```json
    {
      "nu": {
        "bijgewerkt": "2026-11-14T10:24:05.000Z",
        "vers": true,
        "net": { "vermogenW": 1008 },
        "batterij": { "vermogenW": -400, "ladingPct": 64 },
        "zon": null,
        "huis": null
      },
      "periode": "dag",
      "vakken": [{ "label": "0", "netImport": 0.31, "netExport": 0, "batLaden": 0, "batOntladen": 0.2, "gas": 0.05 }],
      "totaal": { "netImport": 3.2, "netExport": 1.4, "batLaden": 2.1, "batOntladen": 1.9, "gas": 1.25 }
    }
    ```
    `zon` en `huis` zijn in deze stap altijd `null`. Databasefout: 500 `{ error: FOUT_STORING }`.
- De stand en de grenspunten worden gelijktijdig opgehaald (`Promise.all`).

- [ ] **Step 1: Schrijf de falende tests** in `tests/energie-api.test.js` (bootst `opslag.js` en waar nodig `guard.js` na zoals `tests/rooms-api.test.js` dat doet). Minimaal voor `meting`: 405 bij GET; 401 zonder header, met fout geheim, met een geheim van andere lengte en als `ENERGIE_GEHEIM` niet gezet is, telkens zonder aanroep van `bewaarEnergieMeting`; 400 bij een ongeldige body zonder opslaan; 200 met de juiste `meting` doorgegeven; 500 bij een gooiende opslag. Voor `index`: niet ingelogd geeft het antwoord van `requireUser` en geen databasevraag; standaardperiode `dag`; `periode=jaar` geeft 12 vakken; onbekende periode valt terug op `dag`; `nu` volgt `maakNu`; 500 bij een gooiende opslag; 405 bij POST. Voor `bearerKlopt`: goed, fout, andere lengte, leeg geheim, ontbrekende header.
- [ ] **Step 2: Draai en zie falen.** Run: `npx vitest run tests/energie-api.test.js`.
- [ ] **Step 3: Schrijf de twee handlers en `bearerKlopt`.**
- [ ] **Step 4: Draai alle tests.** Run: `npm test`. Expected: alles groen (ook `tests/laden.test.js` en de bestaande crontests).
- [ ] **Step 5: Commit.**

### Task 3: Uitleesprogramma voor de NAS en het pakketscript

**Files:**
- Create: `nas/warm_energie.py`, `nas/homewizard-ca.pem`, `nas/test_warm_energie.py`, `nas/LEESMIJ.txt`
- Create: `scripts/maak-nas-pakket.mjs`
- Modify: `.gitignore` (regel `nas-pakket/`)
- Test: `nas/test_warm_energie.py` (unittest) en `tests/nas-script.test.js` (draait de Python-tests vanuit Vitest)

**Interfaces:**
- Consumes: het formaat van de meting en de HomeWizard-verzoeken uit Vaste waarden; `scripts/env-regel.mjs` (`zetEnvRegel`) en `scripts/schrijf-atomair.mjs` (`schrijfAtomair`) voor het pakketscript.
- Produces: het bestand `instellingen.json` (naast het programma) met deze vorm:
  ```json
  {
    "warm_url": "https://warm-app-flax.vercel.app/api/energie/meting",
    "geheim": "<ENERGIE_GEHEIM>",
    "interval_seconden": 30,
    "apparaten": {
      "net": { "soort": "p1dongle", "serie": "3c39e72cab62", "adres": "192.168.2.5" },
      "batterij": { "soort": "battery", "serie": "5c2faf3f2308", "adres": "192.168.2.4" }
    }
  }
  ```

**Gedrag van `nas/warm_energie.py`** (Python 3.8+, alleen standaardbibliotheek, een bestand; start met `python3 warm_energie.py`):
- Bij de start: controleer de Python-versie (onder 3.8: duidelijke melding en stoppen); lees `instellingen.json` uit de map van het programma (ontbreekt het of is het ongeldig: duidelijke melding en stoppen met exitcode 1); neem een exclusief slot (`fcntl.flock` op `warm_energie.lock`) zodat er nooit twee tegelijk draaien (tweede start: melding en exitcode 0).
- Toestand in `toestand.json` naast het programma (rechten 600, atomair geschreven): per apparaat het token en het laatst werkende adres.
- Logboek `warm_energie.log` naast het programma via `logging.handlers.RotatingFileHandler` (200 kB, 2 oude bestanden) en ook naar stdout. Tokens en het geheim komen nooit in het logboek.
- Verbinden met een apparaat: TLS met alleen `homewizard-ca.pem` als vertrouwde uitgever (`ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)`, `load_verify_locations`, `check_hostname = False`, `verify_mode = CERT_REQUIRED`), en daarna zelf controleren dat de `commonName` van het certificaat precies `appliance/<soort>/<serie>` is. Klopt dat niet, dan wordt er niets verstuurd (ook geen token) en geldt het adres als fout. Tijdslimiet 5 seconden per verzoek.
- Adres zoeken: eerst het adres uit de toestand, dan dat uit de instellingen. Werkt geen van beide, dan hooguit eens per 10 minuten het eigen /24-subnet doorzoeken (eigen adres bepalen met een UDP-socket naar een extern adres zonder iets te versturen; poort 443 proberen met een korte tijdslimiet, met een `ThreadPoolExecutor`) en het apparaat herkennen aan de `commonName`. Een gevonden adres gaat in de toestand.
- Token: is er geen token, dan `POST /api/user`. Bij 403 `user:creation-not-enabled`: eenmaal per minuut loggen dat de knop op dat apparaat ingedrukt moet worden (met de naam "P1-meter" of "batterij") en het volgende rondje opnieuw proberen. Bij 200: token bewaren. Geeft een later verzoek 401, dan het token weggooien en opnieuw koppelen.
- Zolang een apparaat nog geen token heeft, duurt een rondje 5 seconden in plaats van `interval_seconden` (het venster na de knopdruk is 30 seconden).
- Meten: `GET /api/measurement` per apparaat en omzetten naar het formaat van de meting. Een apparaat dat niet lukt levert `null` voor zijn deel. Zijn beide `null`, dan wordt er niets verstuurd.
- Versturen: `POST` naar `warm_url` met `Authorization: Bearer <geheim>` en `Content-Type: application/json`, tijdslimiet 10 seconden, met de gewone systeemcertificaten. Een fout wordt gelogd (hooguit eens per minuut dezelfde melding) en het programma gaat door. Het programma stopt nooit door een netwerkfout of een onverwachte uitzondering in een rondje; die wordt gelogd met de soort fout.
- `SIGTERM` en `SIGINT` stoppen het programma netjes.
- Het programma stuurt alleen `GET /api/measurement` en `POST /api/user` naar een apparaat. Nooit iets anders.
- Bouw het zo dat de rekenfuncties los te testen zijn, met minstens deze functies op moduleniveau: `lees_instellingen(pad)`, `verwachte_naam(soort, serie)`, `naam_uit_certificaat(cert_dict)`, `net_uit_meting(data)`, `batterij_uit_meting(data)`, `maak_meting(net, batterij)` (geeft `None` als beide `None` zijn), `subnet_adressen(eigen_adres)` (de 253 andere adressen in het /24).

**`scripts/maak-nas-pakket.mjs`** (Node, draait op de Mac in de map van de repo: `node scripts/maak-nas-pakket.mjs`):
- Leest `.env`. Staat `ENERGIE_GEHEIM` er niet in, dan maakt het er een (`crypto.randomBytes(32).toString('hex')`) en zet die met `zetEnvRegel` en `schrijfAtomair` in `.env`.
- Zet `ENERGIE_GEHEIM` in het Vercel-project voor production met `vercel env add ENERGIE_GEHEIM production --force --yes --sensitive` en de waarde via stdin (`spawnSync`, zoals hieronder). Een vlag `--zonder-vercel` slaat deze stap over (voor de test).
  ```js
  const r = spawnSync('vercel', ['env', 'add', 'ENERGIE_GEHEIM', 'production', '--force', '--yes', '--sensitive'], { cwd: root, input: waarde, encoding: 'utf8' })
  ```
- Maakt de map `nas-pakket/` opnieuw aan met daarin `warm_energie.py`, `homewizard-ca.pem`, `LEESMIJ.txt` (kopieën uit `nas/`) en een `instellingen.json` (rechten 600) met de vorm hierboven en het echte geheim.
- Toont alleen: of het geheim nieuw is of al bestond, de lengte ervan, het resultaat van de Vercel-stap en het pad van de map. Nooit de waarde.
- De kern staat in een geëxporteerde functie `maakPakket({ root, zonderVercel })` zodat de test hem in een tijdelijke map kan draaien; het bestand voert die alleen uit als het direct gestart is.

**`nas/LEESMIJ.txt`:** korte stappen in gewone taal voor iemand die niet technisch is: de map `nas-pakket` naar een gedeelde map op de NAS kopiëren (via Finder of File Station), in DSM onder Configuratiescherm, Taakplanner een "Geactiveerde taak, door gebruiker gedefinieerd script" maken die bij het opstarten draait als gebruiker root met de opdracht `python3 /volume1/<gedeelde map>/nas-pakket/warm_energie.py`, de taak een keer met de hand uitvoeren, en daarna een keer op de knop van de P1-meter en een keer op de knop van de batterij drukken. Ook: waar het logboek staat en wat erin hoort te verschijnen.

- [ ] **Step 1: Schrijf de falende Python-tests** in `nas/test_warm_energie.py` (unittest, geen netwerk). Minimaal:
  - `net_uit_meting` met `{"power_w": 1008, "energy_import_kwh": 24730.858, "energy_export_kwh": 9149.807, "external": [{"type": "water_meter", "value": 1.0, "unit": "m3"}, {"type": "gas_meter", "value": 4740.277, "unit": "m3"}]}` geeft `{"vermogen_w": 1008, "import_kwh": 24730.858, "export_kwh": 9149.807, "gas_m3": 4740.277}`.
  - zonder totalen maar met `energy_import_t1_kwh: 10830.511`, `energy_import_t2_kwh: 2948.827`, `energy_export_t1_kwh: 1285.951`, `energy_export_t2_kwh: 2876.51` worden de totalen `13779.338` en `4162.461` (op 3 decimalen).
  - een lege meting `{}` geeft vier keer `None`; gas met een andere eenheid dan `m3` telt niet.
  - `batterij_uit_meting({"energy_import_kwh": 123.456, "energy_export_kwh": 120.1, "power_w": -400, "state_of_charge_pct": 64})` geeft `{"vermogen_w": -400, "lading_pct": 64, "import_kwh": 123.456, "export_kwh": 120.1}`.
  - een waarde die geen getal is (tekst, `True`) wordt `None`.
  - `verwachte_naam("p1dongle", "3c39e72cab62")` is `"appliance/p1dongle/3c39e72cab62"`; `naam_uit_certificaat({"subject": ((("commonName", "appliance/battery/5c2faf3f2308"),),)})` geeft die naam; zonder commonName `None`.
  - `maak_meting(None, None)` is `None`; met alleen `net` heeft het resultaat `batterij: None`.
  - `subnet_adressen("192.168.2.37")` heeft 253 adressen, zonder `.37`, zonder `.0` en `.255`.
  - `lees_instellingen` op een geldig bestand, op een ontbrekend bestand, op ongeldige JSON en op een bestand zonder `geheim` (de drie foute gevallen gooien een `ValueError` met een Nederlandse melding).
- [ ] **Step 2: Draai en zie falen.** Run: `python3 -m unittest discover -s nas -p 'test_*.py'`.
- [ ] **Step 3: Schrijf `nas/warm_energie.py`** en kopieer het CA-bestand naar `nas/homewizard-ca.pem`. Controleer de vingerafdruk met `openssl x509 -in nas/homewizard-ca.pem -noout -fingerprint -sha256` tegen de waarde in Vaste waarden.
- [ ] **Step 4: Voeg tests toe voor het koppelen en meten met een nagebootste verbinding** (een klein nepobject in plaats van het netwerk): 403 `user:creation-not-enabled` laat het token leeg; 200 bewaart het token; 401 op een meting gooit het token weg; een certificaat met een andere naam leidt tot geen enkel verzoek; het geheim en het token komen niet in de loguitvoer.
- [ ] **Step 5: Schrijf `tests/nas-script.test.js`:** draait `python3 -m unittest discover -s nas -p 'test_*.py'` met `execFileSync` en verwacht exitcode 0 (sla de test over met een duidelijke melding als `python3` ontbreekt); test `maakPakket({ root: <tijdelijke map met kopie van nas/ en scripts/ en een .env>, zonderVercel: true })`: de map `nas-pakket` bevat de vier bestanden, `instellingen.json` heeft rechten 600 en hetzelfde geheim als `.env`, een tweede run houdt hetzelfde geheim, en de uitvoer bevat het geheim niet.
- [ ] **Step 6: Schrijf `scripts/maak-nas-pakket.mjs`, `nas/LEESMIJ.txt` en de regel in `.gitignore`.** Draai het script zelf NIET zonder `--zonder-vercel` (de controller doet de echte run).
- [ ] **Step 7: Draai alle tests.** Run: `npm test`. Expected: alles groen.
- [ ] **Step 8: Commit** (controleer met `git status` dat `nas-pakket/` en `.env` niet meegaan).

### Task 4: Het scherm Energie

**Files:**
- Create: `src/components/Energie.jsx`, `src/components/EnergieGrafiek.jsx`, `src/lib/energie.js`
- Modify: `src/App.jsx`, `src/components/RoomList.jsx`, `src/components/Iconen.jsx`, `src/index.css`, `.superpowers/preview/mock-api.mjs` (niet in git; alleen aanpassen als het bestand bestaat)
- Test: `tests/energie-scherm.test.jsx`, `tests/energie-client.test.js`, aanvullingen in `tests/app.test.jsx` en `tests/roomlist.test.jsx`

**Interfaces:**
- Consumes: `GET /api/energie?periode=...` met het antwoordformaat uit Task 2; `apiFetch` uit `src/lib/apiFetch.js`; het bestaande patroon in `Beheer.jsx` voor een scherm met een terugknop en voor het afhandelen van 401 (`onStap`).
- Produces:
  - `Iconen.jsx`: `IconEnergie` (bliksem) en `IconTerug` (pijl naar links), in dezelfde stijl als de bestaande pictogrammen. Bestaat er al een terugpictogram, gebruik dat.
  - `RoomList` krijgt een prop `onEnergie`; in de kop komt links van de uitlogknop een `icoon-knop` met `aria-label="Energie"` en `title="Energie"`, zichtbaar voor iedereen.
  - `App.jsx`: `scherm` kan ook `'energie'` zijn en toont dan `<Energie onTerug={() => setScherm('kamers')} onStap={bijStap} />`.
  - `src/lib/energie.js`: `formatVermogen(w)` (onder 1000 W: `"640 W"`; vanaf 1000 W: `"1,0 kW"` met een decimaal en komma; altijd de absolute waarde; `null` geeft `"-"`), `formatKwh(v)` (`"3,2 kWh"`, een decimaal; `null` geeft `"-"`), `formatGas(v)` (`"1,25 m³"`, twee decimalen; `null` geeft `"-"`), `netTekst(w)` (`"neemt af"` bij w > 0, `"levert terug"` bij w < 0, `"in balans"` bij 0), `batterijTekst(w)` (`"laadt met 0,9 kW"` bij w >= 10, `"ontlaadt met 400 W"` bij w <= -10, anders `"in rust"`), `tijdTekst(iso)` (Amsterdamse kloktijd `"11:24"`).

**Het scherm:**
- Kop: terugknop (`aria-label="Terug"`), titel "Energie", rechts de tijd van de laatste meting.
- Blok "Nu": vier vakjes in een raster van twee kolommen: Zon ("volgt nog" in gedempte tekst), Huis ("volgt nog"), Batterij (lading in procenten als hoofdgetal, daaronder `batterijTekst`), Net (`formatVermogen` als hoofdgetal, daaronder `netTekst`). Is `nu.batterij` of `nu.net` `null`, dan toont dat vakje `"-"` met daaronder "geen gegevens".
- Is `nu.bijgewerkt` `null`: in plaats van de vakjes een melding "Nog geen gegevens ontvangen. De koppeling met de meter staat nog niet aan." Is `nu.vers` onwaar maar `bijgewerkt` gevuld: boven de vakjes een melding `role="status"` "Geen verse gegevens sinds <tijdTekst>."
- Periodekeuze: vier knoppen Dag, Week, Maand, Jaar (`aria-pressed`), standaard Dag. Wisselen haalt de nieuwe reeks op; een trager antwoord van een vorige keuze mag de nieuwe niet overschrijven.
- Totalen van de gekozen periode: Van het net, Teruggeleverd, Batterij geladen, Batterij ontladen (alle `formatKwh`) en Gas (`formatGas`).
- Grafiek (`EnergieGrafiek`, inline SVG, geen bibliotheek): per vak een staaf omhoog voor `netImport` en een staaf omlaag voor `netExport` rond een nullijn in het midden, een gezamenlijke schaal, hooguit zeven labels op de x-as, een legenda in HTML ("Van het net" boven de lijn, "Teruggeleverd" onder de lijn), en `role="img"` met een `aria-label` dat de periode en beide totalen noemt. Vakken met `null` krijgen geen staaf. Zijn alle vakken leeg: de tekst "Nog geen gegevens voor deze periode."
- Verversen: bij openen, daarna elke 30 seconden zolang het document zichtbaar is, en meteen bij terugkeer naar de app (`visibilitychange`). Opruimen bij verlaten van het scherm (interval, listener, lopend verzoek).
- Fouten: 401 met een `stap` in het antwoord gaat via `onStap` terug naar het inlogscherm (zoals in `Beheer.jsx`); een andere fout of een netwerkfout toont `role="alert"` "De gegevens konden niet geladen worden." met een knop "Opnieuw proberen", en de laatst getoonde gegevens blijven staan.
- Opmaak in `src/index.css` met de bestaande kleuren en variabelen van de app; raak de regels onder `.hoofd` voor het kamerscherm niet aan behalve voor de nieuwe knop in de kop. Controleer dat het kamerscherm niet hoger wordt.
- `mock-api.mjs`: voeg een route `GET /api/energie` toe met voorbeeldgegevens voor alle vier de periodes.

- [ ] **Step 1: Schrijf de falende tests.** `tests/energie-client.test.js` voor elke functie in `src/lib/energie.js` met de voorbeelden hierboven plus `formatVermogen(-624)` is `"624 W"`, `formatVermogen(1049)` is `"1,0 kW"`, `formatVermogen(1050)` is `"1,1 kW"`, `batterijTekst(5)` is `"in rust"`. `tests/energie-scherm.test.jsx`: toont de vier vakjes met de waarden uit een nagebootst antwoord; "volgt nog" bij Zon en Huis; melding bij `vers: false`; melding bij `bijgewerkt: null`; periodeknop haalt `periode=week` op en zet `aria-pressed`; een laat antwoord van de vorige periode wordt genegeerd; foutmelding met "Opnieuw proberen" en behoud van oude gegevens; 401 roept `onStap`; terugknop roept `onTerug`; de grafiek heeft `role="img"` en de tekst bij lege gegevens; het interval wordt opgeruimd bij unmount (nep-timers). `tests/roomlist.test.jsx`: de knop Energie staat er en roept `onEnergie`. `tests/app.test.jsx`: klikken op Energie toont het scherm en Terug brengt de kamers terug.
- [ ] **Step 2: Draai en zie falen.** Run: `npx vitest run tests/energie-client.test.js tests/energie-scherm.test.jsx`.
- [ ] **Step 3: Bouw de onderdelen.**
- [ ] **Step 4: Draai alle tests en de build.** Run: `npm test` en daarna `npx vite build --outDir "dist_v$(date +%s)"` (verwacht "built"), en ruim de map `dist_v*` weer op. Expected: alles groen.
- [ ] **Step 5: Commit.**
