# Warm Fase 1: Fundament en go/no-go Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een werkende, ingelogde PWA die de echte slaapkamer-thermostaten toont met live aan/uit-status en kamertemperatuur, en ze aan/uit kan zetten via de Tuya-cloud.

**Architecture:** Losse web-app (React 19 + Vite, als PWA) met Vercel serverless functies als achterkant. De achterkant praat met de Tuya Cloud API via een eigen, afhankelijkheidsvrije client (fetch + HMAC-ondertekening) met een enkel huishoud-account. Een Supabase-project levert inloggen en een kleine database (`rooms`, `gebruikers`). De frontend praat nooit rechtstreeks met Tuya; dat loopt altijd via onze eigen API met een ingelogde sessie.

**Tech Stack:** React 19, Vite, Vercel functions (Node, ESM), Supabase (Auth + Postgres), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md` (in de CRM-repo, `/Users/olivierarnolds/Desktop/eclektik-crm/`)

**Repo:** `/Users/olivierarnolds/Desktop/warm-app` (eigen git-repo). Alle paden in de taken hieronder zijn relatief aan die map.

**Fasering:** Dit plan dekt bewust alleen Fase 1. Meldingen (Web Push, de 9:00-check, de lang-aan-wachthond), timers, geplande starttijden, en het volledige gebruikers-/rechtenmodel komen in opvolgende plannen.

**Herzien op 2026-11-13** na de geslaagde go/no-go: de taken gebruiken nu de echte Tuya-codes, een eigen client in plaats van de connector-bibliotheek, en een toegangslijst (`gebruikers`) zodat niet iedereen met de URL de verwarming kan bedienen.

## Global Constraints

- Aansturing is **aan/uit**; temperatuur wordt alleen ter info getoond (read-only), nooit ingesteld.
- De frontend roept de verwarming nooit rechtstreeks aan; alles loopt via onze eigen API achter een ingelogde Supabase-sessie.
- Alleen e-mailadressen die in de tabel `gebruikers` staan krijgen toegang. Een geldige Supabase-sessie alleen is niet genoeg.
- Het is een **apart project** (eigen repo, eigen database), gehost onder het bestaande Vercel **Pro**-account.
- De app is een **PWA** die op het iPhone-beginscherm gezet kan worden; geen App Store.
- Alle tekst die een gebruiker ziet is **Nederlands**. Gebruik nergens een em-dash (U+2014), ook niet in code-commentaar of commit-berichten.
- Sleutels en geheimen komen alleen uit env-variabelen; `.env` staat in `.gitignore` en wordt nooit gecommit of in uitvoer getoond.
- Stuur nooit het Tuya-commando `factory_reset` of `Reset`.
- Stuur in tests en scripts nooit een echt aan/uit-commando naar een thermostaat; live controles zijn alleen-lezen.
- ESM overal (`"type": "module"`), Node 24.
- Commit-berichten: een korte Nederlandse beschrijvende regel, afgesloten met de regel `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

- Een thermostaat is offline/onbereikbaar bij het ophalen van de lijst: de lijst rendert gewoon met status "onbekend" voor die kamer, zonder te crashen of de hele lijst leeg te maken. (Task 3)
- Een aan/uit-commando mislukt of loopt in een time-out: de API geeft een foutstatus terug en de UI meldt dat het mislukte, in plaats van stilletjes "gelukt" te claimen. (Task 3 + Task 5)
- De aan/uit- en temperatuurcodes verschillen per thermostaat-model: de codes komen uit env-variabelen met de bewezen waarden als default, nooit hardgecodeerd in de logica. (Task 1)
- Een niet-ingelogde aanroep van de API levert 401 op, een ingelogde gebruiker die niet in `gebruikers` staat 403, en geen van beide lekt kamer- of apparaatgegevens. (Task 3)
- Een kapotte thermostaat tussen meerdere: de andere kamers blijven zichtbaar en bedienbaar. (Task 3)

---

## Uitkomst go/no-go (2026-11-13): GO

Getest op de echte thermostaat "SasOlle" met `scripts/tuya-probe.mjs`: uitlezen werkt, aan en weer uit werkt, de status verandert mee.

- Het Warmme-account is afgeschermd en kan niet aan een Tuya-project gekoppeld worden. Alle vijf de thermostaten zijn verhuisd naar de gewone Tuya-app; dat account is aan het project gekoppeld. Warmme wordt niet meer gebruikt.
- Apparaten: SasOlle `41006001a4e57c0b5d0b`, Nine `22800203a4e57c88dac2`, Luka `41006001a4e57c0b5d17`, Britt `41006001a4e57c0b9a65`, Anouk `84022858e868e7666125`. Categorie `wk`.
- Apparatenlijst: GET `/v2.0/cloud/thing/device?page_size=20` geeft een array met per apparaat o.a. `id`, `name` (fabrieksnaam), `customName` (de naam die Olivier gaf) en `isOnline`.
- Status: GET `/v2.0/cloud/thing/{id}/shadow/properties` geeft `{ properties: [{ code, value, ... }] }` met o.a. `power1` (boolean, aan/uit), `RoomTemper` (kamertemperatuur maal 10: 170 = 17,0 graden), `SetTemp`, `ControlMode`, `work_status`.
- Aan/uit: POST `/v1.0/devices/{id}/commands` met `{ "commands": [{ "code": "switch", "value": true }] }`.
- De ondertekening van aanroepen staat werkend in `scripts/tuya-probe.mjs` (functie `call` en `getToken`).

---

## Task 1: Tuya-client met tests

**Files:**
- Create: `package.json` (minimaal: `"name": "warm-app"`, `"private": true`, `"type": "module"`, script `"test": "vitest run"`, devDependency `vitest`)
- Create: `api/_lib/tuya.js`
- Test: `tests/tuya.test.js`
- Modify: `.env.example` (de drie optionele code-variabelen erbij, als commentaar met hun default)

**Interfaces:**
- Consumes: env `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, `TUYA_BASE_URL` (default `https://openapi.tuyaeu.com`); globale `fetch`.
- Produces (named exports van `api/_lib/tuya.js`):
  - `tuyaRequest(method: string, path: string, body?: object): Promise<any>` - ondertekent de aanroep, geeft `result` terug. Gooit `Error` met de Tuya-`code` en `msg` in de tekst als `success` false is. Het token wordt in de module bewaard en hergebruikt tot 60 seconden voor `expire_time` (seconden) verloopt. Elke fetch heeft een time-out van 10 seconden (`AbortSignal.timeout(10000)`).
  - `listDevices(): Promise<{ id: string, name: string, online: boolean }[]>` - `name` is `customName`, of `name` als `customName` leeg is; `online` is `isOnline === true`.
  - `getDeviceStatus(deviceId: string): Promise<Record<string, unknown>>` - map van `code` naar `value` uit de shadow-properties.
  - `isPoweredOn(status): boolean | null` - leest code `process.env.TUYA_POWER_STATUS_CODE` (default `"power1"`); geeft `null` als de waarde ontbreekt of geen boolean is.
  - `getTemperature(status): number | null` - leest code `process.env.TUYA_TEMP_CODE` (default `"RoomTemper"`), gedeeld door 10; `null` als de waarde ontbreekt of geen getal is.
  - `setPower(deviceId: string, on: boolean): Promise<void>` - stuurt `{ commands: [{ code: process.env.TUYA_POWER_COMMAND_CODE || "switch", value: on }] }`.

- [ ] **Step 1: Write the failing tests** in `tests/tuya.test.js`. Mock `fetch` met `vi.stubGlobal`; zet de env-variabelen in de test; importeer de module vers per test waar het token-geheugen ertoe doet (`vi.resetModules()`).
  - `isPoweredOn leest power1`: `{ power1: true }` geeft `true`, `{ power1: false }` geeft `false`.
  - `isPoweredOn gebruikt een afwijkende code`: met `TUYA_POWER_STATUS_CODE="switch_1"` en `{ switch_1: true }` geeft `true`.
  - `isPoweredOn geeft null als de code ontbreekt`: `{}` geeft `null`.
  - `getTemperature deelt door 10`: `{ RoomTemper: 170 }` geeft `17`.
  - `getTemperature geeft null als de code ontbreekt`: `{}` geeft `null`.
  - `getDeviceStatus maakt een map van de properties`: antwoord `{ success: true, result: { properties: [{ code: "power1", value: true }, { code: "RoomTemper", value: 185 }] } }` geeft `{ power1: true, RoomTemper: 185 }`, en de aangeroepen URL eindigt op `/v2.0/cloud/thing/dev1/shadow/properties`.
  - `listDevices gebruikt customName en isOnline`: `[{ id: "a", name: "WIFI thermostat 7", customName: "SasOlle", isOnline: true }, { id: "b", name: "WIFI thermostat 3", customName: "", isOnline: false }]` geeft `[{ id: "a", name: "SasOlle", online: true }, { id: "b", name: "WIFI thermostat 3", online: false }]`.
  - `setPower stuurt het juiste commando`: `setPower("dev1", true)` doet een POST naar een URL die eindigt op `/v1.0/devices/dev1/commands` met body `{"commands":[{"code":"switch","value":true}]}`.
  - `tuyaRequest gooit bij success false`: antwoord `{ success: false, code: 1106, msg: "permission deny" }` gooit een Error waarvan de tekst `1106` en `permission deny` bevat.
  - `het token wordt hergebruikt`: twee opeenvolgende `getDeviceStatus`-aanroepen doen samen precies 1 aanroep naar `/v1.0/token`.
  - `ondertekende headers zijn aanwezig`: een aanroep bevat de headers `client_id`, `sign` (64 hoofdletter-hextekens), `t`, `nonce`, `sign_method: "HMAC-SHA256"` en `access_token`.
- [ ] **Step 2: Run tests to verify they fail.** Run: `npm install && npx vitest run tests/tuya.test.js`. Expected: FAIL (module bestaat nog niet).
- [ ] **Step 3: Implement `api/_lib/tuya.js`.** Neem de ondertekening over uit `scripts/tuya-probe.mjs` (`call` en `getToken`): `sign = HMAC-SHA256(client_id + access_token + t + nonce + stringToSign, secret)` in hoofdletter-hex, met `stringToSign = [METHOD, sha256(body of ""), "", path].join("\n")`. Lees de env-variabelen bij elke aanroep (niet bij het laden van de module), zodat tests ze kunnen zetten.
- [ ] **Step 4: Run tests to verify they pass.** Run: `npx vitest run tests/tuya.test.js`. Expected: PASS, uitvoer zonder waarschuwingen.
- [ ] **Step 5: Alleen-lezen controle tegen de echte Tuya-cloud.** Run: `node --env-file=.env -e "import('./api/_lib/tuya.js').then(async m => { const d = await m.listDevices(); console.log(d.length, d.map(x => x.name).join(',')); const s = await m.getDeviceStatus(d[0].id); console.log(m.isPoweredOn(s), m.getTemperature(s)); })"`. Expected: `5` gevolgd door de vijf namen (SasOlle, Nine, Luka, Britt, Anouk in willekeurige volgorde), en daarna een boolean en een temperatuur tussen 5 en 35. Roep hier `setPower` NIET aan.
- [ ] **Step 6: Commit.** `git add package.json package-lock.json api/_lib/tuya.js tests/tuya.test.js .env.example`

---

## Task 2: Projectskelet en databaseschema

**Files:**
- Modify: `package.json` (React 19, Vite, `@supabase/supabase-js`, scripts `dev`, `build`, `test`; testhulpen `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`)
- Create: `vite.config.js` (React-plugin; Vitest-config met `environmentMatchGlobs` of per-bestand `// @vitest-environment jsdom` zodat `.jsx`-tests in jsdom draaien en de rest in node)
- Create: `index.html`, `src/main.jsx`, `src/App.jsx` (placeholder die de tekst "Warm" toont), `src/index.css` (basisstijl, mobiel eerst)
- Create: `supabase/migrations/0001_init.sql`
- Create: `api/_lib/supabase.js`
- Modify: `.env.example` (Supabase-variabelen erbij)
- Test: `tests/app.test.jsx`

**Interfaces:**
- Produces:
  - DB-tabel `rooms(id uuid primary key default gen_random_uuid(), naam text not null, tuya_device_id text not null unique, created_at timestamptz not null default now())`.
  - DB-tabel `gebruikers(email text primary key, naam text not null, rol text not null default 'lid' check (rol in ('beheerder','lid')), created_at timestamptz not null default now())`.
  - SQL-functie `public.is_gebruiker() returns boolean` (`security definer`, `stable`, `set search_path = public`): waar als er een rij in `gebruikers` is met `lower(email) = lower(auth.jwt() ->> 'email')`.
  - RLS aan op beide tabellen. Policy op `rooms`: alleen `select`, `to authenticated`, `using (public.is_gebruiker())`. Policy op `gebruikers`: alleen `select`, `to authenticated`, `using (lower(email) = lower(auth.jwt() ->> 'email'))`. Geen insert/update/delete-policies.
  - De migratie voegt de vijf kamers toe (namen en device-id's uit de sectie "Uitkomst go/no-go"), met `on conflict (tuya_device_id) do nothing`.
  - `api/_lib/supabase.js` exporteert `supabaseForToken(token: string)`: een Supabase-client op `process.env.SUPABASE_URL` + `process.env.SUPABASE_ANON_KEY` met header `Authorization: Bearer <token>` en `auth: { persistSession: false, autoRefreshToken: false }`. Er is bewust geen service-key in Fase 1; de database wordt benaderd met de sessie van de gebruiker, zodat RLS blijft gelden.
  - Env-namen: server `SUPABASE_URL`, `SUPABASE_ANON_KEY`; browser `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Consumes: `package.json` uit Task 1 (uitbreiden, niet overschrijven; `tests/tuya.test.js` moet blijven slagen).

- [ ] **Step 1: Write the failing test** `tests/app.test.jsx`: `App toont de naam van de app` rendert `<App />` en verwacht de tekst "Warm" in het document.
- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/app.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Zet het skelet op met de hand (geen `npm create vite`, de map bevat al bestanden). Verifieer: `npx vitest run` (alle tests slagen) en `npx vite build --outDir "dist_v$(date +%s)"` meldt "built"; verwijder daarna die `dist_v*`-map.
- [ ] **Step 4: Schrijf de migratie** `supabase/migrations/0001_init.sql` volgens de Interfaces hierboven. De migratie wordt niet door jou toegepast; dat doet de controller via de Supabase-koppeling.
- [ ] **Step 5: Schrijf `api/_lib/supabase.js`.**
- [ ] **Step 6: Commit.** `git add -A` (controleer met `git status` dat `.env` en `node_modules` niet meegaan).

---

## Task 3: API - toegangscontrole, kamerstatus en aan/uit

**Files:**
- Create: `api/_lib/guard.js`
- Create: `api/rooms/index.js` (GET `/api/rooms`)
- Create: `api/rooms/[id]/power.js` (POST `/api/rooms/:id/power`, het id staat in `req.query.id`)
- Test: `tests/guard.test.js`, `tests/rooms-api.test.js`

**Interfaces:**
- Consumes: `listDevices`, `getDeviceStatus`, `isPoweredOn`, `getTemperature`, `setPower` (Task 1); `supabaseForToken` (Task 2).
- Produces:
  - `requireUser(req, res): Promise<{ userId: string, email: string, db: SupabaseClient } | null>`. Leest `Authorization: Bearer <token>`. Geen of ongeldig token (`db.auth.getUser(token)` geeft een fout of geen user): `res.status(401).json({ error: "Niet ingelogd" })`, geeft `null`. Geldige user zonder rij in `gebruikers` (`db.from("gebruikers").select("email").maybeSingle()` geeft geen rij): `res.status(403).json({ error: "Geen toegang" })`, geeft `null`. Anders `{ userId, email, db }` met `db = supabaseForToken(token)`.
  - Beide handlers zijn `export default async function handler(req, res)` en beginnen met `const user = await requireUser(req, res); if (!user) return;`. Een verkeerde HTTP-methode geeft 405.
  - GET `/api/rooms` geeft 200 `{ rooms: [{ id, naam, on: boolean | null, temp: number | null, status: "ok" | "onbekend" }] }`, gesorteerd op `naam`. Werkwijze: kamers uit `rooms`; een keer `listDevices()`; per kamer: staat het apparaat niet in de lijst of is het offline, dan `{ on: null, temp: null, status: "onbekend" }`; anders `getDeviceStatus` in een eigen try/catch (fout geeft "onbekend"); is `isPoweredOn` `null`, dan ook "onbekend". Gooit `listDevices()` zelf, dan zijn alle kamers "onbekend" (nog steeds 200). De statussen worden parallel opgehaald (`Promise.all`).
  - POST `/api/rooms/:id/power` met JSON-body `{ on: boolean }`: 400 `{ ok: false, error }` als `on` geen boolean is; 404 als de kamer niet bestaat; 200 `{ ok: true, on }` na een geslaagde `setPower`; 502 `{ ok: false, error: "De verwarming reageert niet. Probeer het opnieuw." }` als `setPower` gooit. De foutdetails van Tuya gaan naar `console.error`, niet naar de client.

- [ ] **Step 1: Write the failing tests** (Tuya-laag en `supabaseForToken` gemockt met `vi.mock`; `req`/`res` als eenvoudige nep-objecten met `status()` en `json()`):
  - `guard.test.js`: `geen Authorization-header geeft 401`; `ongeldig token geeft 401`; `geldige gebruiker buiten de lijst geeft 403`; `geldige gebruiker in de lijst geeft userId en email terug`.
  - `rooms-api.test.js`:
    - `GET geeft per kamer status en temperatuur terug`: twee kamers, beide online, statussen `{ power1: true, RoomTemper: 170 }` en `{ power1: false, RoomTemper: 195 }` geven `on: true, temp: 17` en `on: false, temp: 19.5`, beide `status: "ok"`.
    - `GET markeert een onbereikbare thermostaat als onbekend`: `getDeviceStatus` gooit voor kamer 2; kamer 1 blijft "ok", kamer 2 wordt `{ on: null, temp: null, status: "onbekend" }`, response 200 met beide kamers.
    - `GET markeert een offline thermostaat als onbekend`: `listDevices` geeft kamer 2 met `online: false`; `getDeviceStatus` wordt voor kamer 2 niet aangeroepen.
    - `GET geeft alle kamers als onbekend als de apparatenlijst faalt`: `listDevices` gooit; 200, alle kamers "onbekend".
    - `GET zonder login geeft 401 en geen kamers`: `requireUser` schrijft 401; de body bevat geen `rooms` en de Tuya-laag is niet aangeroepen.
    - `POST zet aan`: body `{ on: true }` roept `setPower(deviceId, true)` aan en geeft 200 `{ ok: true, on: true }`.
    - `POST meldt falen expliciet`: `setPower` gooit; 502 `{ ok: false, ... }`.
    - `POST weigert een body zonder boolean`: `{ on: "ja" }` geeft 400 en `setPower` is niet aangeroepen.
    - `POST op een onbekende kamer geeft 404`.
- [ ] **Step 2: Run tests to verify they fail.** Run: `npx vitest run tests/guard.test.js tests/rooms-api.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement `guard.js` en beide handlers.**
- [ ] **Step 4: Run tests to verify they pass.** Run: `npx vitest run`. Expected: alle tests PASS, uitvoer zonder waarschuwingen (een verwachte `console.error` in een test wordt met een spy opgevangen).
- [ ] **Step 5: Commit.** `git add api tests`

---

## Task 4: Inloggen in de app

**Files:**
- Create: `src/lib/supabase.js` (browser-client op `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)
- Create: `src/lib/apiFetch.js`
- Create: `src/components/Login.jsx`
- Modify: `src/App.jsx` (login-gate)
- Test: `tests/apifetch.test.js`, `tests/login.test.jsx`

**Interfaces:**
- Consumes: Supabase Auth (e-mail met eenmalige code).
- Produces:
  - `apiFetch(path: string, opts?: RequestInit): Promise<Response>` - haalt de sessie op met `supabase.auth.getSession()` en voegt `Authorization: Bearer <access_token>` toe; zonder sessie gaat de aanroep zonder die header door (de API antwoordt dan 401).
  - `Login`: stap 1 vraagt het e-mailadres en roept `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` aan; stap 2 toont een veld voor de 6-cijferige code en roept `supabase.auth.verifyOtp({ email, token, type: "email" })` aan. Fouten worden in het Nederlands getoond ("Die code klopt niet. Probeer het opnieuw." / "Versturen is niet gelukt. Probeer het zo nog eens."). Er is een knop "Ander e-mailadres" om terug te gaan naar stap 1.
  - `App`: luistert met `supabase.auth.onAuthStateChange`; geen sessie toont `Login`; met sessie toont de app-inhoud (voorlopig de tekst "Ingelogd" en een knop "Uitloggen" die `supabase.auth.signOut()` aanroept). Tijdens het ophalen van de sessie toont de app niets dat op een van beide lijkt (geen flits van het loginscherm).

- [ ] **Step 1: Write the failing tests** (de supabase-module gemockt met `vi.mock("../src/lib/supabase.js")`):
  - `apifetch.test.js`: `voegt het sessie-token toe`: met sessie `{ access_token: "tok" }` krijgt `fetch` de header `Authorization: "Bearer tok"`; `zonder sessie geen Authorization-header`.
  - `login.test.jsx`: `een e-mailadres versturen toont het codeveld`: e-mail invullen en versturen roept `signInWithOtp` aan met dat adres en toont daarna het codeveld; `een verkeerde code toont een foutmelding`: `verifyOtp` geeft `{ error: {...} }` en de tekst "Die code klopt niet" verschijnt; `versturen mislukt toont een foutmelding`: `signInWithOtp` geeft een fout en het codeveld verschijnt niet.
  - Pas `tests/app.test.jsx` aan aan de login-gate: `zonder sessie toont App het loginscherm`; `met sessie toont App de uitlogknop`.
- [ ] **Step 2: Run to verify they fail.** Run: `npx vitest run tests/apifetch.test.js tests/login.test.jsx tests/app.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass.** Run: `npx vitest run`. Expected: alle tests PASS, uitvoer zonder waarschuwingen (geen `act(...)`-meldingen).
- [ ] **Step 5: Commit.** `git add src tests`

---

## Task 5: Kamer-overzicht (het hoofdscherm)

**Files:**
- Create: `src/components/RoomList.jsx`, `src/components/RoomCard.jsx`
- Modify: `src/App.jsx` (toont `RoomList` als ingelogd, in plaats van de tekst "Ingelogd"), `src/index.css`
- Test: `tests/roomlist.test.jsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 4); GET `/api/rooms` en POST `/api/rooms/:id/power` (Task 3, vormen staan daar).

Gedrag:
- Haalt de kamers op bij laden, bij terugkomst op het scherm (`visibilitychange` naar zichtbaar) en via een knop "Vernieuwen".
- Per kamer een kaart met de naam, de stand ("Aan" / "Uit" / "Onbekend"), de temperatuur als die er is (een decimaal met komma, bv. "17,5°"), en een schakelaar. Bij `status: "onbekend"` is de schakelaar uitgeschakeld en staat er "Onbekend", zodat er geen misleidende stand zichtbaar is.
- Schakelen: de kaart toont direct de nieuwe stand en blokkeert de schakelaar tot het antwoord er is. Bij een antwoord dat niet ok is (of een netwerkfout) springt de stand terug en verschijnt een zichtbare melding met de `error`-tekst van de API, of anders "Dat is niet gelukt. Probeer het opnieuw."
- Knop "Alles uit": stuurt voor elke kamer die aan staat een uit-commando en toont per mislukte kamer een melding. De knop is uitgeschakeld als er niets aan staat.
- Antwoordt GET `/api/rooms` met 403, dan toont het scherm "Je hebt geen toegang tot deze app. Vraag Olivier om je toe te voegen." met de uitlogknop. Bij 401 wordt de gebruiker uitgelogd. Bij een andere fout: "De kamers konden niet geladen worden." met de knop "Vernieuwen".
- Vormgeving: mobiel eerst, rustig, grote tikbare schakelaars (minimaal 44 px), donkere tekst op lichte achtergrond met voldoende contrast (geen lichtgele of pastel tekst op wit). Als visuele referentie mag je `/Users/olivierarnolds/Desktop/eclektik-crm/.superpowers/brainstorm/76425-1793717236/content/flow-mockup.html` bekijken.

- [ ] **Step 1: Write the failing tests** in `tests/roomlist.test.jsx` (`apiFetch` gemockt):
  - `toont kamers met stand en temperatuur`: twee kamers (`on: true, temp: 17.5` en `on: false, temp: 19`) tonen beide namen, "Aan" en "Uit", en "17,5°".
  - `een onbekende kamer toont Onbekend en een uitgeschakelde schakelaar`.
  - `schakelen stuurt het commando en toont de nieuwe stand`: tikken op de schakelaar van een kamer die uit staat roept `apiFetch("/api/rooms/<id>/power", ...)` aan met methode POST en body `{"on":true}`, en de kaart toont "Aan".
  - `een mislukte schakelactie toont een foutmelding en zet de stand terug`: de POST geeft 502 `{ ok: false, error: "De verwarming reageert niet. Probeer het opnieuw." }`; die tekst verschijnt en de kaart toont weer "Uit".
  - `alles uit zet alleen de kamers uit die aan staan`: van drie kamers staan er twee aan; er gaan precies twee POST's met `{"on":false}` uit.
  - `403 toont het geen-toegang-scherm`.
- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/roomlist.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Implement `RoomList` + `RoomCard`** en pas `App.jsx` en `tests/app.test.jsx` aan (met sessie rendert App nu de kamerlijst; mock `apiFetch` daar).
- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run`. Expected: alle tests PASS, uitvoer zonder waarschuwingen. Run ook `npx vite build --outDir "dist_v$(date +%s)"` (verwacht "built") en verwijder de `dist_v*`-map.
- [ ] **Step 5: Commit.** `git add src tests`

---

## Task 6: PWA - op het beginscherm te zetten

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png` (180 px), `public/sw.js`
- Modify: `index.html` (manifest-link, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-capable`, `viewport` met `viewport-fit=cover`), `src/main.jsx` (service-worker-registratie, alleen in productie-build)
- Test: `tests/manifest.test.js`

**Interfaces:** geen; levert installeerbaarheid.

- [ ] **Step 1: Write the failing test** `tests/manifest.test.js`: leest `public/manifest.webmanifest` als JSON en verwacht `name: "Warm"`, `short_name: "Warm"`, `display: "standalone"`, `start_url: "/"`, `lang: "nl"`, en icons van 192x192 en 512x512 waarvan de bestanden bestaan; verwacht dat `index.html` naar het manifest en het apple-touch-icon verwijst.
- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/manifest.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** De iconen zijn echte PNG's op de genoemde afmetingen (maak ze met een lokaal beschikbaar hulpmiddel en controleer de afmetingen, bv. met `sips -g pixelWidth -g pixelHeight`): een eenvoudig, herkenbaar warm-gekleurd vlak met een wit vlam- of zonsymbool, zonder transparante rand. `sw.js` is minimaal: `install` roept `skipWaiting()` aan, `activate` roept `clients.claim()` aan, en er is geen caching van API-antwoorden (de status moet altijd vers zijn). Nog geen push; dat komt in de meldingen-fase.
- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run` en `npx vite build --outDir "dist_v$(date +%s)"` (controleer dat manifest, iconen en `sw.js` in de build-map staan; verwijder daarna de map).
- [ ] **Step 5: Commit.** `git add public index.html src tests`

---

## Nieuwe inlogmethode (besloten met Olivier op 2026-11-13, tijdens de bouw)

Olivier wil geen e-mail-login. Elke persoon heeft een vaste combinatie van een cijfer en een kleur: 1 rood Saskia, 2 geel Britt, 3 blauw Nine, 4 roze Anouk, 5 kobalt Olivier (beheerder), 6 cyaan Luka. Omdat 36 combinaties te raden zijn, komt er een tweede slot voor: een **huiscode** (een code voor het hele gezin) die je eenmalig per telefoon intypt. Daarna vraagt die telefoon alleen nog om cijfer en kleur, en blijft daarna ingelogd.

Gevolgen voor de techniek (keuzes van de bouwer):
- De browser praat alleen nog met onze eigen API. Supabase Auth en de Supabase-client in de browser vervallen. Task 7 en 8 vervangen de e-mail-login uit Task 4 en de `gebruikers`-controle uit Task 3.
- Een toegelaten telefoon krijgt een willekeurig toestel-token in een `HttpOnly`-cookie; de database bewaart alleen de hash ervan.
- De API benadert de database met de Supabase service-key (`SUPABASE_SERVICE_KEY`, alleen op de server). Alle tabellen staan op slot voor de publieke sleutel (RLS aan, geen policies).
- In de Global Constraints vervalt de regel over de tabel `gebruikers`; daarvoor in de plaats geldt: **alleen een toestel dat de huiscode heeft ingevoerd en waarop een geldige cijfer-kleur-combinatie is gekozen krijgt kamergegevens te zien of mag schakelen.**

---

## Task 7: Toegang met huiscode en cijfer plus kleur (achterkant)

**Files:**
- Create: `supabase/migrations/0002_toegang.sql`
- Create: `api/_lib/opslag.js` (alle databasevragen op een plek), `api/_lib/toegang.js` (tokens, hashes, cookies, herkomstcontrole)
- Create: `api/toegang/huiscode.js`, `api/toegang/persoon.js`, `api/toegang/ik.js`
- Create: `scripts/zet-huiscode.mjs`, `scripts/zet-sleutel.mjs`
- Modify: `api/_lib/supabase.js`, `api/_lib/guard.js`, `api/rooms/index.js`, `api/rooms/[id]/power.js`, `.env.example`
- Test: `tests/toegang.test.js`, `tests/toegang-api.test.js`; aanpassen: `tests/guard.test.js`, `tests/rooms-api.test.js`

**Interfaces:**
- Database (migratie `0002_toegang.sql`, wordt door de controller toegepast):
  - `personen(id uuid primary key default gen_random_uuid(), naam text not null unique, cijfer int not null check (cijfer between 0 and 9), kleur text not null, rol text not null default 'lid' check (rol in ('beheerder','lid')), created_at timestamptz not null default now(), unique (cijfer, kleur))`
  - `toestellen(id uuid primary key default gen_random_uuid(), token_hash text not null unique, persoon_id uuid references personen(id) on delete set null, foute_pogingen int not null default 0, created_at timestamptz not null default now())`
  - `instellingen(sleutel text primary key, waarde text not null)`
  - `toegangspogingen(id bigint generated always as identity primary key, ip text, created_at timestamptz not null default now())` (alleen mislukte huiscode-pogingen)
  - RLS aan op alle vier, zonder policies. Verwijder de policies `"gebruikers lezen kamers"` op `rooms` en `"gebruiker leest eigen rij"` op `gebruikers` (de tabel `gebruikers` en de functie `is_gebruiker()` blijven staan, ongebruikt).
  - Zes personen (naam, cijfer, kleur, rol), `on conflict (naam) do nothing`: Saskia 1 `rood` lid; Britt 2 `geel` lid; Nine 3 `blauw` lid; Anouk 4 `roze` lid; Olivier 5 `kobalt` beheerder; Luka 6 `cyaan` lid.
- `api/_lib/supabase.js`: vervang `supabaseForToken` door `supabaseAdmin()`: een Supabase-client op `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (`persistSession: false`, `autoRefreshToken: false`), een keer aangemaakt en hergebruikt. Ontbreekt een van beide env-variabelen, dan gooit hij `Error("SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt")`.
- `api/_lib/toegang.js` (pure functies, geen database):
  - `nieuwToken(): string` - 32 willekeurige bytes, base64url.
  - `hashToken(token: string): string` - sha256, hex.
  - `normaliseerHuiscode(code: string): string` - `trim()` en kleine letters.
  - `hashHuiscode(code: string): string` - `"scrypt:<salt hex>:<hash hex>"` (16 bytes salt, 32 bytes hash, `crypto.scryptSync`), op de genormaliseerde code.
  - `controleerHuiscode(code: string, opgeslagen: string): boolean` - vergelijkt met `crypto.timingSafeEqual`; een misvormde `opgeslagen` geeft `false`.
  - `leesToestelToken(req): string | null` - leest de cookie `warm_toestel` uit `req.headers.cookie`.
  - `zetToestelCookie(res, token)` - `Set-Cookie: warm_toestel=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=34560000`.
  - `wisToestelCookie(res)` - dezelfde cookie met een lege waarde en `Max-Age=0`.
  - `zelfdeHerkomst(req): boolean` - `true` als er geen `Origin`-header is of als de host van `Origin` gelijk is aan de `Host`-header.
  - `ipVan(req): string` - eerste adres uit `x-forwarded-for`, anders `"onbekend"`.
- `api/_lib/opslag.js` (dunne functies rond `supabaseAdmin()`; elke functie gooit bij een databasefout):
  - `leesHuiscodeHash(): Promise<string | null>` (rij `instellingen` met sleutel `huiscode`)
  - `telMisluktePogingen(ip: string): Promise<{ totaal: number, vanIp: number }>` (laatste 60 minuten)
  - `noteerMisluktePoging(ip: string): Promise<void>`
  - `maakToestel(tokenHash: string): Promise<void>`
  - `vindToestel(tokenHash: string): Promise<{ id, persoon_id, foute_pogingen, persoon: { id, naam, rol } | null } | null>`
  - `vindPersoon(cijfer: number, kleur: string): Promise<{ id, naam, rol } | null>`
  - `koppelPersoon(toestelId: string, persoonId: string | null): Promise<void>` (zet ook `foute_pogingen` op 0)
  - `verhoogFoutePogingen(toestelId: string): Promise<number>` (geeft de nieuwe stand terug)
  - `verwijderToestel(toestelId: string): Promise<void>`
  - `leesKamers(): Promise<{ id, naam, tuya_device_id }[]>` (gesorteerd op naam), `vindKamer(id: string): Promise<{ id, tuya_device_id } | null>`
- `api/_lib/guard.js`:
  - `requireToestel(req, res): Promise<toestel | null>` - geen of onbekend token: `res.status(401).json({ error: "Niet ingelogd", stap: "huiscode" })`, geeft `null`.
  - `requireUser(req, res): Promise<{ persoonId, naam, rol, toestelId } | null>` - als `requireToestel`, en een toestel zonder persoon geeft 401 `{ error: "Niet ingelogd", stap: "persoon" }`. Een databasefout geeft 500 `{ error: "Er ging iets mis. Probeer het opnieuw." }` en `null`.
- Handlers (allemaal `export default async function handler(req, res)`; verkeerde methode 405; een POST of DELETE waarvoor `zelfdeHerkomst(req)` `false` is geeft 403 `{ ok: false, error: "Niet toegestaan" }`):
  - POST `/api/toegang/huiscode` body `{ code: string }`. Volgorde: (1) `telMisluktePogingen`: bij `totaal >= 30` of `vanIp >= 10` 429 `{ ok: false, error: "Te veel pogingen. Probeer het over een uur opnieuw." }`; (2) geen hash ingesteld: 503 `{ ok: false, error: "De huiscode is nog niet ingesteld." }`; (3) `code` geen niet-lege string of fout: `noteerMisluktePoging`, 401 `{ ok: false, error: "Die huiscode klopt niet." }`; (4) goed: `nieuwToken`, `maakToestel(hashToken(token))`, `zetToestelCookie`, 200 `{ ok: true, stap: "persoon" }`.
  - POST `/api/toegang/persoon` body `{ cijfer: number, kleur: string }`, vereist `requireToestel`. Geen geheel getal of geen string: 400. Gevonden: `koppelPersoon`, 200 `{ ok: true, stap: "binnen", naam, rol }`. Niet gevonden: `verhoogFoutePogingen`; is de nieuwe stand 5 of hoger: `verwijderToestel`, `wisToestelCookie`, 401 `{ ok: false, error: "Te vaak fout. Vul de huiscode opnieuw in.", stap: "huiscode" }`; anders 401 `{ ok: false, error: "Die combinatie klopt niet.", stap: "persoon" }`.
  - GET `/api/toegang/ik`: altijd 200 met `{ stap: "huiscode" }` (geen of onbekend token), `{ stap: "persoon" }` (toestel zonder persoon) of `{ stap: "binnen", naam, rol }`. DELETE `/api/toegang/ik` (uitloggen): met een bekend toestel `koppelPersoon(toestelId, null)`, antwoord 200 `{ stap: "persoon" }`; zonder toestel 200 `{ stap: "huiscode" }`.
  - `api/rooms/index.js` en `api/rooms/[id]/power.js`: gebruiken de nieuwe `requireUser` en `leesKamers` / `vindKamer` uit `opslag.js`; hun antwoordvormen blijven gelijk. `power.js` controleert ook `zelfdeHerkomst`, en een databasefout bij het opzoeken van de kamer geeft 500 (niet 404).
  - Elk antwoord van elke handler onder `api/` (ook de foutantwoorden van de guard) krijgt de header `Cache-Control: no-store`, zodat een status nooit uit een cache komt.
  - Een storing is geen uitlog: alleen een ontbrekend of onbekend toestel-token geeft 401. Een databasefout geeft overal 500 `{ error: "Er ging iets mis. Probeer het opnieuw." }` (bij de toegang-handlers met `ok: false` erbij), nooit 401 of 403.
- Scripts (interactief, voor Olivier; lezen de invoer verborgen in, tonen of loggen de waarde nooit):
  - `scripts/zet-sleutel.mjs`: vraagt om de Supabase service-key en zet of vervangt de regel `SUPABASE_SERVICE_KEY=...` in `.env`. De pure functie `zetEnvRegel(tekst: string, sleutel: string, waarde: string): string` staat in `api/_lib/toegang.js` niet; zet hem in `scripts/env-regel.mjs` en test hem.
  - `scripts/zet-huiscode.mjs` (draaien met `node --env-file=.env`): vraagt twee keer om de huiscode, eist minimaal 8 tekens en twee gelijke invoeren, en schrijft `hashHuiscode(code)` naar `instellingen` (upsert op sleutel `huiscode`). Meldt alleen "De huiscode is ingesteld."

- [ ] **Step 1: Write the failing tests.**
  - `tests/toegang.test.js`: `hashToken is stabiel en 64 hextekens`; `nieuwToken geeft elke keer een andere waarde`; `controleerHuiscode accepteert de juiste code, ook met hoofdletters en spaties eromheen`; `controleerHuiscode weigert een foute code`; `controleerHuiscode geeft false bij een misvormde opgeslagen waarde`; `leesToestelToken vindt de cookie tussen andere cookies`; `zetToestelCookie zet HttpOnly, Secure en SameSite=Lax`; `zelfdeHerkomst: geen Origin is goed, zelfde host is goed, andere host is fout`; `zetEnvRegel vervangt een bestaande regel en voegt een ontbrekende toe`.
  - `tests/toegang-api.test.js` (`opslag.js` gemockt met `vi.mock`): `huiscode goed geeft cookie en stap persoon`; `huiscode fout geeft 401 en noteert de poging`; `huiscode geeft 429 bij 30 mislukte pogingen in totaal` en `bij 10 van hetzelfde ip`, en controleert de code dan niet; `huiscode geeft 503 als er geen huiscode is ingesteld`; `huiscode van een andere herkomst geeft 403`; `persoon goed koppelt en geeft naam en rol`; `persoon fout geeft 401 met stap persoon`; `persoon vijf keer fout verwijdert het toestel en wist de cookie`; `persoon zonder toestel geeft 401 met stap huiscode`; `persoon met een ongeldige body geeft 400`; `ik geeft huiscode, persoon of binnen`; `uitloggen ontkoppelt de persoon`.
  - Pas `tests/guard.test.js` en `tests/rooms-api.test.js` aan aan de nieuwe guard en `opslag.js` (alle bestaande gevallen blijven gedekt: status per kamer, onbereikbaar, offline, lijst faalt, zonder login 401 zonder kamers, POST aan, POST faalt 502, POST zonder boolean 400, onbekende kamer 404), plus: `een toestel zonder persoon krijgt 401 met stap persoon en geen kamers`; `POST power van een andere herkomst geeft 403`; `een databasefout bij het opzoeken van de kamer geeft 500`.
- [ ] **Step 2: Run tests to verify they fail.** Run: `npx vitest run tests/toegang.test.js tests/toegang-api.test.js tests/guard.test.js tests/rooms-api.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Schrijf eerst de tests, dan de code. Raak `api/_lib/tuya.js` niet aan.
- [ ] **Step 4: Run tests to verify they pass.** Run: `npx vitest run`. Expected: de vier genoemde testbestanden en `tests/tuya.test.js` en `tests/manifest.test.js` slagen. De frontend-tests (`app`, `login`, `apifetch`, `roomlist`) mogen in deze taak blijven slagen omdat de frontend nog niet is aangepast; raak `src/` niet aan.
- [ ] **Step 5: Commit.** `git add api scripts supabase tests .env.example`

---

## Task 8: Toegangsscherm met huiscode en cijfer plus kleur (voorkant)

**Files:**
- Create: `src/components/Toegang.jsx` (stap huiscode en stap cijfer plus kleur), `src/lib/personen-kleuren.js`
- Modify: `src/App.jsx`, `src/lib/apiFetch.js`, `src/components/RoomList.jsx`, `src/index.css`, `package.json` (niets verwijderen: `@supabase/supabase-js` blijft nodig voor de API)
- Delete: `src/lib/supabase.js`, `src/components/Login.jsx`, `tests/login.test.jsx`
- Test: `tests/toegang-scherm.test.jsx`; aanpassen: `tests/app.test.jsx`, `tests/apifetch.test.js`, `tests/roomlist.test.jsx`

**Interfaces:**
- Consumes (Task 7): GET `/api/toegang/ik` geeft `{ stap: "huiscode" | "persoon" | "binnen", naam?, rol? }`; DELETE `/api/toegang/ik` geeft `{ stap }`; POST `/api/toegang/huiscode` `{ code }` geeft 200 `{ ok: true, stap: "persoon" }` of 401/429/503 `{ ok: false, error }`; POST `/api/toegang/persoon` `{ cijfer, kleur }` geeft 200 `{ ok: true, stap: "binnen", naam, rol }` of 401 `{ ok: false, error, stap }`. De API-antwoorden van de kamers zijn ongewijzigd; een 401 daar heeft nu `{ error, stap }`.
- Produces:
  - `src/lib/personen-kleuren.js` exporteert `KLEUREN = [{ id: "rood", naam: "Rood", hex: "#E0312E" }, { id: "geel", naam: "Geel", hex: "#F5C518" }, { id: "blauw", naam: "Blauw", hex: "#2F7BE0" }, { id: "roze", naam: "Roze", hex: "#F48FB1" }, { id: "kobalt", naam: "Kobalt", hex: "#1E3FAE" }, { id: "cyaan", naam: "Cyaan", hex: "#22C7D6" }]` en `CIJFERS = [1, 2, 3, 4, 5, 6]`.
  - `apiFetch(path, opts)` wordt een dunne `fetch(path, { credentials: "same-origin", ...opts })` zonder Supabase en zonder Authorization-header.
  - `Toegang({ stap, onStap })`: bij `stap === "huiscode"` een formulier met het veld "Huiscode" (`type="password"`, `autoCapitalize="none"`, `autoComplete="off"`) en de knop "Verder"; bij `stap === "persoon"` de kop "Wie ben je?", de tekst "Kies je cijfer en je kleur", zes cijferknoppen en zes kleurknoppen (ronde vlakken, `aria-label` is de kleurnaam, `aria-pressed` voor de gekozen). Zodra een cijfer en een kleur gekozen zijn gaat de aanvraag vanzelf uit. De fouttekst komt uit `error` van de API, of anders "Dat is niet gelukt. Probeer het opnieuw."; na een fout zijn cijfer en kleur weer leeg. Na elk antwoord met een `stap` roept hij `onStap(stap, { naam, rol })` aan.
  - `App`: haalt bij het laden GET `/api/toegang/ik` op; toont niets tijdens het laden; bij een fout "De app kon niet geladen worden." met de knop "Opnieuw proberen"; `huiscode`/`persoon` tonen `Toegang`; `binnen` toont `RoomList` met de naam.
  - `RoomList({ naam, onStap })`: toont "Hoi <naam>" in de kop; de knop "Uitloggen" doet DELETE `/api/toegang/ik` en roept `onStap` aan met de stap uit het antwoord; een 401 op een van de kamer-aanroepen roept `onStap(stap uit de body, of "huiscode")` aan. De 403-tak ("Je hebt geen toegang tot deze app...") vervalt.
  - Uit de eindcontrole, ook in deze taak (`RoomList.jsx`, `src/index.css`):
    - Na elke mislukte schakelactie (antwoord niet ok, netwerkfout of time-out) haalt `RoomList` direct de echte stand opnieuw op (`laad()`), zodat de kaart niet de oude stand als feit toont terwijl het commando misschien toch is aangekomen. De foutmelding blijft staan.
    - De time-out op de schakel-aanroep werkt ook zonder `AbortSignal.timeout` (oudere iPhones): gebruik een `AbortController` met `setTimeout` van 15000 ms en ruim de timer op.
    - Een 500 op GET `/api/rooms` logt niet uit: de lijst blijft staan met de melding "De kamers konden niet geladen worden." (bestaand gedrag, moet blijven).
    - De pagina houdt rekening met de veilige zones van de iPhone: `padding` met `env(safe-area-inset-top)` en `env(safe-area-inset-bottom)` op de buitenste container.
- Vormgeving: zoals de schets die Olivier goedkeurde: cijfers in een raster van drie breed, daaronder de kleuren als ronde vlakken van minimaal 56 px, gekozen cijfer donker gevuld, gekozen kleur met een donkere ring. Tekst blijft donker op licht; de kleuren zelf zijn alleen vlakken, nooit tekstkleur.

- [ ] **Step 1: Write the failing tests** (`apiFetch` gemockt):
  - `tests/toegang-scherm.test.jsx`: `de huiscode versturen roept de API aan en meldt de nieuwe stap`; `een foute huiscode toont de fouttekst van de API`; `cijfer en kleur kiezen verstuurt de combinatie vanzelf` (POST naar `/api/toegang/persoon` met body `{"cijfer":3,"kleur":"blauw"}`); `een foute combinatie toont de fout en maakt de keuze leeg`; `te vaak fout brengt je terug naar de huiscode` (antwoord met `stap: "huiscode"` roept `onStap("huiscode")` aan); `een netwerkfout toont de standaardmelding en laat de knoppen weer werken`.
  - `tests/app.test.jsx`: `stap huiscode toont het huiscodeveld`; `stap persoon toont Wie ben je`; `stap binnen toont de kamers en de naam`; `een mislukte start toont Opnieuw proberen`; `tijdens het laden is er geen scherm`.
  - `tests/apifetch.test.js`: `stuurt cookies mee met same-origin` en `stuurt geen Authorization-header`.
  - `tests/roomlist.test.jsx`: vervang het 403-geval door `een 401 meldt de stap aan de app`, voeg toe `uitloggen roept de API aan en meldt de stap`; alle andere gevallen blijven.
- [ ] **Step 2: Run to verify they fail.** Run: `npx vitest run tests/toegang-scherm.test.jsx tests/app.test.jsx tests/apifetch.test.js tests/roomlist.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Raak `api/` niet aan.
- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run` (alles groen, uitvoer zonder waarschuwingen) en `npx vite build --outDir "dist_v$(date +%s)"` (verwacht "built"; map daarna verwijderen). Controleer met `grep -r "supabase" src` dat de browsercode geen Supabase meer gebruikt.
- [ ] **Step 5: Commit.** `git add -A` (controleer met `git status` dat `.env` niet meegaat).

---

## Task 9: Dagelijkse wektaak tegen het pauzeren van de database

Een gratis Supabase-database pauzeert na ongeveer een week zonder gebruik (bijvoorbeeld tijdens een vakantie). Een dagelijkse taak op Vercel doet daarom een kleine databasevraag, zodat de database actief blijft. In Fase 2 neemt de statuspoller (elke 5 minuten) dit vanzelf over.

**Files:**
- Create: `api/cron/wakker.js`
- Modify: `vercel.json` (cron erbij), `api/_lib/opslag.js` (functie `telKamers`), `.env.example` (`CRON_SECRET=`)
- Test: `tests/cron-wakker.test.js`

**Interfaces:**
- Consumes: `opslag.js` uit Task 7.
- Produces:
  - `telKamers(): Promise<number>` in `api/_lib/opslag.js` (aantal rijen in `rooms`; gooit bij een databasefout).
  - GET `/api/cron/wakker`: vereist de header `Authorization: Bearer <process.env.CRON_SECRET>` (Vercel stuurt die zelf mee bij cron-aanroepen). Ontbreekt `CRON_SECRET` in de env, of klopt de header niet (vergelijken met `crypto.timingSafeEqual` op even lange buffers): 401 `{ ok: false }`. Goed: `telKamers()`, 200 `{ ok: true, kamers: <aantal> }`. Databasefout: 500 `{ ok: false }` en de fout naar `console.error`. Elk antwoord heeft `Cache-Control: no-store`. De handler roept Tuya nooit aan.
  - `vercel.json` krijgt `"crons": [{ "path": "/api/cron/wakker", "schedule": "0 5 * * *" }]`; de bestaande `regions` en `functions` blijven staan.
  - De wektaak ruimt ook op: `ruimPogingenOp(): Promise<void>` in `api/_lib/opslag.js` verwijdert rijen uit `toegangspogingen` die ouder zijn dan 24 uur; de handler roept dat aan na `telKamers()`. Een fout bij het opruimen geeft ook 500.
  - Drie kleine punten uit de controle van Task 7, in dezelfde taak:
    - `api/toegang/persoon.js`: een `cijfer` dat geen geheel getal van 0 tot en met 9 is, of een `kleur` die leeg is of langer dan 20 tekens, geeft 400 `{ ok: false, error: "Die combinatie klopt niet." }` zonder de database te raken (nu geeft een te groot getal een 500).
    - `scripts/zet-sleutel.mjs`: schrijf `.env` atomair: eerst naar `.env.tmp` (mode 0600) in dezelfde map, dan `rename` naar `.env`, zodat een mislukte schrijfactie de bestaande sleutels niet kan wissen.
    - `scripts/env-regel.mjs` (`zetEnvRegel`): herkent ook een bestaande regel die met `export ` begint en vervangt die, en behoudt de regeleinden van het bestand.

- [ ] **Step 1: Write the failing tests** in `tests/cron-wakker.test.js` (`opslag.js` gemockt): `zonder Authorization geeft 401 en raakt de database niet`; `met een verkeerd geheim geeft 401`; `zonder CRON_SECRET in de env geeft 401, ook met een lege Bearer`; `met het juiste geheim telt de kamers, ruimt oude pogingen op en geeft 200`; `een databasefout geeft 500`; `vercel.json bevat de cron op /api/cron/wakker` (leest het bestand). Voeg toe aan `tests/toegang-api.test.js`: `persoon met een cijfer buiten 0 tot en met 9 geeft 400 zonder de database te raken` en `persoon met een te lange kleur geeft 400`. Voeg toe aan `tests/toegang.test.js`: `zetEnvRegel vervangt een regel die met export begint` en `zetEnvRegel behoudt CRLF-regeleinden`.
- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/cron-wakker.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run`. Expected: alles groen, uitvoer zonder waarschuwingen.
- [ ] **Step 5: Commit.** `git add api tests vercel.json .env.example`

---

## Deploy (afsluiting van Fase 1, door de controller samen met Olivier)

- [ ] Supabase: migratie `0002_toegang.sql` toepassen. Olivier zet de service-key in `.env` (`node scripts/zet-sleutel.mjs`) en kiest de huiscode (`node --env-file=.env scripts/zet-huiscode.mjs`).
- [ ] Nieuw Vercel-project onder het bestaande **Pro**-account, gekoppeld aan de nieuwe repo; env-vars (`TUYA_*`, `SUPABASE_*`, `VITE_SUPABASE_*`) in Vercel zetten.
- [ ] Verifieer met Olivier: de live-versie laadt, inloggen werkt, de vijf kamers verschijnen en een echte kamer kan aan en uit. Zet de app op het iPhone-beginscherm.

## Notities voor de uitvoering

- De spec en dit plan blijven in de CRM-repo staan als naslag; de code staat in `/Users/olivierarnolds/Desktop/warm-app`.
- Voor Fase 2 (achtergrondtaken zonder ingelogde gebruiker) is wel een Supabase service-key nodig; die zet Olivier dan in Vercel.
