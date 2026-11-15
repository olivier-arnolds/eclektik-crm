# Laadwacht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een persoonlijke PWA die publieke laadpalen rond Oliviers huis checkt via de NDW open data, ze op zijn prioriteit toont (lijst en kaart), en een push-melding stuurt zodra er een paal vrijkomt.

**Architecture:** Losse Vite + React PWA op Vercel. Een Vercel-cron (elke minuut) haalt het NDW OCPI-bestand op, filtert al streamend op een bounding box rond huis, en schrijft een slanke snapshot van de gevolgde palen naar Upstash Redis. De "Ik wil laden"-knop leest die snapshot (dus snel), en als alles bezet is zet hij een wacht; de cron stuurt dan via Web Push een melding zodra de gevolgde paal vrijkomt. Alle zware logica (filteren, prijs koppelen, vrij-bepaling, sorteren, wacht-conditie) zit in pure functies met tests; de endpoints en frontend zijn dunne lijm met verificatiestappen.

**Tech Stack:** Node 20+, Vite 8, React 19, Leaflet 1.9.4 (kaart, OpenStreetMap-tegels), `stream-json` (streaming parse), `web-push` 3.6.7 (VAPID), `@upstash/redis` 1.x (opslag). Vercel serverless functions in `/api`, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-11-15-laadwacht-design.md` (de plan-taken argumenteren vanuit deze spec; lees beide).

## Global Constraints

- Losse repo `~/Desktop/laadwacht`, gedeployed onder hetzelfde Vercel Pro-team als de CRM (minuut-cron vereist Pro). Spec deelt dit expliciet.
- Databron (vast, getest 2026-11-15): locaties+status `https://opendata.ndw.nu/charging_point_locations_ocpi.json.gz`, tarieven `https://opendata.ndw.nu/charging_point_tariffs_ocpi.json.gz`. OCPI 2.2.1, geen auth.
- "Vrij" = minstens een EVSE met `status === "AVAILABLE"`. `UNKNOWN` telt niet als vrij.
- Palen-sleutel = OCPI location `id`; fallback-match op coordinaten + `evse_id` als ids blijken te wijzigen.
- Wacht verloopt na 2 uur (7200 s). Na de eerste vrij-melding stopt de wacht.
- Prijs: handmatig per paal ingevuld; open-data ENERGY-prijs alleen als voorzet.
- Gebruiker-zichtbare tekst is Nederlands en bevat GEEN em-dashes (gebruik `-`, komma of korte zinnen). Geen markdown-headers of bullet-opsommingen in push-teksten.
- Secrets via Vercel env: `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`. Frontend krijgt alleen de publieke VAPID-sleutel.

## Review Focus

- **NDW-ophalen faalt of time-out** (netwerk/404/kapot gzip): de cron mag de bestaande snapshot en de actieve wacht NIET wissen; de knop toont een nette melding. Getest in Taak 6.
- **Melding-toestemming geweigerd of niet-ondersteunde telefoon**: de app blijft werken als kijk-app (knop + lijst), legt uit dat zonder toestemming geen melding komt, en laat geen wacht beloven die niet kan afgaan. Getest in Taak 9.
- **Paal met meerdere EVSE's / dubbele of 0 EVSE's**: `freeCount`/`total` kloppen, een locatie zonder EVSE's crasht niet en telt als niet-vrij. Getest in Taak 2.
- **Wacht-verloop en tijdzone**: `expiresAt` wordt in UTC/ms gerekend; een verlopen wacht vuurt niet meer en wordt opgeruimd. Getest in Taak 4.
- **Prijs onbekend / niet-koppelbare tariff_id** (zijn TotalEnergies-palen): `price` wordt `null` en de UI toont "prijs onbekend", nooit `NaN` of `0`. Getest in Taak 3.

---

### Task 1: Project-scaffold (Vite React PWA + Vercel)

**Files:**
- Create: `package.json`, `vite.config.js`, `vercel.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `public/manifest.webmanifest`
- Test: `tests/smoke.test.js`

**Interfaces:**
- Produces: een draaiende Vite-app met React 19, een geldige PWA-manifest, en `vercel.json` met een cron-stub op `/api/cron-refresh` elke minuut. `vitest` draait.

- [ ] **Step 1: Init project** - `npm create vite@latest . -- --template react`, voeg `vitest` toe, en een `manifest.webmanifest` (naam "Laadwacht", `display: "standalone"`, themekleur). `vercel.json` met `{ "crons": [{ "path": "/api/cron-refresh", "schedule": "* * * * *" }] }`.
- [ ] **Step 2: Write smoke test** `tests/smoke.test.js`: `expect(1+1).toBe(2)` plus importeer `manifest.webmanifest` en assert `name === "Laadwacht"` en `display === "standalone"`.
- [ ] **Step 3: Run** `npx vitest run` → PASS. En `npm run dev` serveert zonder fouten (handmatig).
- [ ] **Step 4: Commit** (`chore: scaffold Laadwacht PWA`).

### Task 2: NDW-datamodule (streaming filter + vrij-bepaling)

**Files:**
- Create: `api/_lib/ndw.js`, `tests/ndw.test.js`, `tests/fixtures/ndw-sample.json`
**Interfaces:**
- Consumes: niets.
- Produces:
  - `inBbox(location, bbox) -> boolean` (bbox = `{minLat,maxLat,minLon,maxLon}`)
  - `isFree(location) -> boolean`
  - `toPaal(location) -> Paal` met `Paal = { id:string, name:string, address:string, operator:string, lat:number, lon:number, total:number, freeCount:number, free:boolean, lastUpdated:string }`
  - `async fetchAndFilter(bbox, fetchImpl=fetch) -> Paal[]` (download + gunzip + streaming parse via `stream-json`, past `inBbox` toe, mapt met `toPaal`)

- [ ] **Step 1: Fixture** `tests/fixtures/ndw-sample.json`: een array van 4 echte-achtige OCPI-locaties, ontleend aan de spec-test: (a) Santpoorterplein, 6 EVSE's waarvan 2 `AVAILABLE` 4 `CHARGING`; (b) een paal met 2 EVSE's beide `CHARGING`; (c) een paal met 1 EVSE `UNKNOWN`; (d) een paal met `evses: []`. Elk met `coordinates`, `id`, `name`, `address`, `operator`.
- [ ] **Step 2: Write failing tests** `tests/ndw.test.js`:
  - `isFree` true voor (a), false voor (b), false voor (c) (UNKNOWN telt niet), false voor (d).
  - `toPaal(a)` → `total===6`, `freeCount===2`, `free===true`.
  - `toPaal(d)` → `total===0`, `freeCount===0`, `free===false` (geen crash).
  - `inBbox` true voor een punt binnen, false buiten.
- [ ] **Step 3: Run** `npx vitest run tests/ndw.test.js` → FAIL.
- [ ] **Step 4: Implement** `inBbox`, `isFree`, `toPaal` in `api/_lib/ndw.js`. `freeCount` = aantal EVSE's met status AVAILABLE; `free = freeCount>0`.
- [ ] **Step 5: Run** → PASS.
- [ ] **Step 6: Implement `fetchAndFilter`** met `stream-json` (StreamArray) over de gegunzipte respons; alleen locaties binnen bbox door `toPaal`. Geen volledige `JSON.parse` van 200 MB.
- [ ] **Step 7: Verify streaming op echte data** - Run een los scriptje dat `fetchAndFilter` aanroept met een bbox rond Santpoorterplein (52.3949, 4.6305; straal 600 m) en print het aantal palen + geheugengebruik. Verwacht: ~30 palen, piekgeheugen ruim onder 512 MB.
- [ ] **Step 8: Commit** (`feat: NDW streaming filter + vrij-bepaling`).

### Task 3: Prijs koppelen (tarieven)

**Files:**
- Create: `api/_lib/price.js`, `tests/price.test.js`, `tests/fixtures/tariffs-sample.json`
**Interfaces:**
- Produces:
  - `buildTariffIndex(tariffs) -> Map<string,{energy:number|null, currency:string}>` sleutel `` `${country_code}|${party_id}|${id}` ``, `energy` = eerste ENERGY-`price` in de elementen.
  - `priceForLocation(location, index) -> number|null` (laagste ENERGY-prijs over de tariff_ids van de connectors, via location `country_code`+`party_id`; `null` als niets koppelt).

- [ ] **Step 1: Fixture** `tariffs-sample.json`: twee tarieven: `NUO` id `x` met ENERGY 0.29; `TCB` id `y` met ENERGY 0.41. Plus in `ndw-sample.json` een locatie met party `NUO` en connector `tariff_ids:["x"]`, en Santpoorterplein (party `TCB`) met connectors ZONDER `tariff_ids` (zoals in de echte data).
- [ ] **Step 2: Write failing tests** `tests/price.test.js`:
  - `priceForLocation(nuoPaal, idx) === 0.29`.
  - `priceForLocation(santpoorterplein, idx) === null` (geen tariff_ids → onbekend).
  - `buildTariffIndex` levert de juiste map.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** → PASS.
- [ ] **Step 6: Verify op echte data** - script dat de prijs voor de 400m-palen print; verwacht Vattenfall 0.29, TotalEnergies `null`.
- [ ] **Step 7: Commit** (`feat: tarief-koppeling met null bij onbekend`).

### Task 4: Status-logica (prioriteit sorteren + wacht-conditie)

**Files:**
- Create: `api/_lib/status.js`, `tests/status.test.js`
**Interfaces:**
- Consumes: `Paal` (Taak 2), `Config`/`Watch` (Taak 5 definieert vorm; hier als gewone objecten).
- Produces:
  - `sortByPriority(palen, order) -> Paal[]` (`order` = array van ids; vrije palen eerst, daarbinnen op `order`-index, onbekende ids achteraan).
  - `watchSatisfied(palen, watch, now) -> Paal|null`: `null` als `now >= watch.expiresAt`; mode `"single"` → de paal met `id===watch.targetId` als die `free`, anders `null`; mode `"any"` → de eerste `free` paal in prioriteitsvolgorde, anders `null`.

- [ ] **Step 1: Write failing tests** `tests/status.test.js`:
  - `sortByPriority`: een vrije paal die laag in `order` staat komt boven een bezette die hoog staat; twee vrije palen behouden onderling de `order`.
  - `watchSatisfied` mode `single` target bezet → `null`; target vrij → die paal.
  - `watchSatisfied` mode `any`, alles bezet → `null`; een vrij → de hoogst geprioriteerde vrije.
  - `watchSatisfied` met `now >= expiresAt` → `null` ook al is er iets vrij.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** (`feat: prioriteit-sortering en wacht-conditie`).

### Task 5: Opslagmodule (Upstash Redis)

**Files:**
- Create: `api/_lib/store.js`, `tests/store.test.js`
**Interfaces:**
- Produces (eenvoudige vaste sleutels, een gebruiker):
  - `Config = { home:{lat,lon,label}, palen:[{id,name,price:number|null}], order:string[] }`
  - `Watch = { mode:"any"|"single", targetId?:string, startedAt:number, expiresAt:number }`
  - `Snapshot = { at:number, palen:[{id,free:boolean,freeCount:number,total:number,lastUpdated:string}] }`
  - functies: `getConfig/setConfig`, `getSnapshot/setSnapshot`, `getWatch/setWatch/clearWatch`, `getSubscription/setSubscription`. Alle `get*` geven `null` als leeg.
  - De module leest de Upstash-client lazily uit env, zodat tests een injecteerbare client/fake kunnen gebruiken: `createStore(client)`.

- [ ] **Step 1: Write failing tests** `tests/store.test.js` met een in-memory fake client (Map): set→get rondrit voor config, watch, snapshot, subscription; `clearWatch` → `getWatch()===null`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `createStore(client)` + default export die een echte `@upstash/redis` client uit env maakt. JSON serialiseren. **Step 4: Run** → PASS. **Step 5: Commit** (`feat: Upstash-opslag voor config, snapshot, wacht, subscription`).

### Task 6: Cron-refresh (snapshot verversen + melden)

**Files:**
- Create: `api/cron-refresh.js`, `api/_lib/push.js`, `tests/cron.test.js`
**Interfaces:**
- Consumes: `fetchAndFilter` (T2), `sortByPriority`/`watchSatisfied` (T4), store (T5), `sendPush` (hier).
- Produces:
  - `api/_lib/push.js`: `async sendPush(subscription, payload)` via `web-push` met VAPID-env.
  - `api/cron-refresh.js`: default handler. Logica uitgesplitst als pure/injecteerbare functie `runRefresh({store, fetchPalen, sendPush, now}) -> {wrote:boolean, pushed:boolean}` zodat die testbaar is.

- [ ] **Step 1: Write failing tests** `tests/cron.test.js` met fakes (fake store met config van 2 palen, stub `fetchPalen`, stub `sendPush`):
  - Alles bezet, geen wacht → schrijft snapshot, `pushed===false`.
  - Actieve wacht mode `any`, een paal wordt vrij → `sendPush` 1x aangeroepen, `clearWatch` gebeurd, `pushed===true`.
  - `fetchPalen` gooit een error → snapshot NIET overschreven, wacht NIET gewist, functie gooit niet (Review Focus: fetch faalt).
  - Wacht verlopen (`now>=expiresAt`) → geen push, wacht opgeruimd.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `runRefresh` + de handler die hem met echte deps aanroept en de cron-secret checkt (`CRON_SECRET` of `x-vercel-cron`). **Step 4: Run** → PASS.
- [ ] **Step 5: Verify** lokaal met echte NDW-fetch en een testconfig; log of de snapshot verschijnt.
- [ ] **Step 6: Commit** (`feat: cron verses snapshot en stuurt push bij vrij`).

### Task 7: API-endpoints (status, watch, subscribe, config, nearby)

**Files:**
- Create: `api/status.js`, `api/watch.js`, `api/subscribe.js`, `api/config.js`, `api/nearby.js`, `api/vapid-public.js`, `tests/endpoints.test.js`
**Interfaces:**
- `GET /api/status` → `{ at, palen:[{id,name,price,order-index,lat,lon,free,freeCount,total}], watch }` (combineert snapshot + config, gesorteerd via `sortByPriority`).
- `POST /api/watch` `{mode,targetId?}` → zet wacht (expiry now+7200s) alleen als nu alles bezet is; `{stop:true}` → `clearWatch`. 409 als er al iets vrij is.
- `POST /api/subscribe` `{subscription}` → `setSubscription`.
- `GET/POST /api/config` → lezen/zetten `Config`.
- `GET /api/nearby?lat&lon&radius` → live `fetchAndFilter` + `priceForLocation`, voor de instel-picker.
- `GET /api/vapid-public` → `{ key: VAPID_PUBLIC }`.

- [ ] **Step 1: Write failing tests** `tests/endpoints.test.js`: importeer elke handler, roep met gefakete req/res + fake store aan; assert status-samenstelling (sortering klopt), `watch` 409 bij een vrije paal, `config` rondrit, `nearby` roept `fetchAndFilter` met de juiste bbox.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** de handlers als dunne lijm over T2/T3/T4/T5. **Step 4: Run** → PASS. **Step 5: Verify** lokaal via `vercel dev` een `GET /api/status`. **Step 6: Commit** (`feat: API-endpoints status/watch/subscribe/config/nearby`).

### Task 8: Service worker + push-aanmelding (frontend-lib)

**Files:**
- Create: `public/sw.js`, `src/lib/push.js`, `src/lib/api.js`
**Interfaces:**
- `src/lib/api.js`: fetch-helpers `getStatus()`, `startWatch(mode,targetId)`, `stopWatch()`, `getConfig()`, `setConfig(c)`, `getNearby(lat,lon,radius)`.
- `src/lib/push.js`: `registerServiceWorker()`, `async ensurePushPermission() -> "granted"|"denied"`, `async subscribePush() -> boolean` (haalt VAPID-public op, `pushManager.subscribe`, POST `/api/subscribe`). Werkt alleen na een gebruikersklik.
- `public/sw.js`: `push` event toont notificatie (titel/body uit payload); `notificationclick` opent de navigatie-URL of de app.

- [ ] **Step 1: Implement** SW + lib. Geen unit-test (browser-lijm); verificatie in Taak 9/10.
- [ ] **Step 2: Commit** (`feat: service worker en push-aanmelding`).

### Task 9: Instel-scherm (huis, palen kiezen, volgorde, prijs, toestemming)

**Files:**
- Create: `src/screens/Setup.jsx`
**Interfaces:**
- Consumes: `getNearby`, `setConfig`, `src/lib/push.js`.
- Produces: slaat `Config` op (home-coords via client-side geocode van postcode met Nominatim, of pin op de kaart; aangevinkte palen met prijs-voorzet uit `nearby`; sleep-volgorde; prijs per paal invulbaar). Vraagt melding-toestemming met uitleg.

- [ ] **Step 1: Build** het scherm; prijs-voorzet komt uit `nearby.price` maar is overschrijfbaar (handmatige prijs is leidend).
- [ ] **Step 2: Verify** - toestemming geweigerd → app toont uitleg en belooft geen melding (Review Focus). Niet-ondersteunde browser → kijk-modus blijft werken.
- [ ] **Step 3: Commit** (`feat: instel-scherm met palen, volgorde en prijs`).

### Task 10: Hoofdschermen (knop, lijst, kaart, wachten)

**Files:**
- Create: `src/screens/Home.jsx`, `src/screens/Result.jsx`, `src/screens/MapView.jsx`, `src/screens/Waiting.jsx`, `src/styles.css`; Modify: `src/App.jsx`
**Interfaces:**
- Consumes: `getStatus`, `startWatch`, `stopWatch`. UI volgt de goedgekeurde mockup (`claude.ai` Artifact "Laadwacht"): groene knop, resultaat met rangnummers en prijs, Lijst/Kaart-toggle (Leaflet + OpenStreetMap), wacht-kaart met keuze "elke paal / alleen prio 1" en "Navigeer" (opent maps-deeplink naar de paal-coords).
- Produces: de complete app-stroom; `App.jsx` routeert start → resultaat → (wachten).

- [ ] **Step 1: Build** de schermen; "Ik wil laden" → `getStatus`; alles bezet → toon wacht-keuze → `startWatch`. Kaart met pins gekleurd op status.
- [ ] **Step 2: Verify** lokaal met een gezaaide config en een echte snapshot: knop toont de lijst, kaart toont pins, wacht-knop registreert een wacht.
- [ ] **Step 3: Commit** (`feat: hoofdschermen knop, lijst, kaart, wachten`).

### Task 11: Deploy en end-to-end op de live PWA

**Files:** Modify: `vercel.json` (cron bevestigd), README met env-lijst.
- [ ] **Step 1:** Zet env in Vercel (VAPID-paar genereren met `web-push generate-vapid-keys`, Upstash-db aanmaken, `CRON_SECRET`). Deploy onder het Pro-team.
- [ ] **Step 2:** Op de telefoon: app op het beginscherm zetten, melding-toestemming geven, instel-scherm doorlopen met Santpoorterplein.
- [ ] **Step 3: End-to-end verify:** druk de knop (lijst verschijnt), forceer een wacht, en controleer dat een melding binnenkomt zodra een gevolgde paal vrij is (eventueel met een tijdelijk verlaagde drempel om te testen). Controleer de Vercel runtime-logs van `cron-refresh`.
- [ ] **Step 4: Commit** (`chore: deploy-config en env-documentatie`).

---

## Zelf-review (uitgevoerd door de planner)

- **Spec-dekking:** knop+directe status (T7/T10), melden bij vrij (T6), keuze elke paal/prio 1 (T4/T6/T10), prioriteit+volgorde (T4/T9/T10), prijs handmatig met voorzet (T3/T9), kaart (T10), PWA op beginscherm+push (T1/T8/T9/T11), databron+tarieven (T2/T3), snelle knop via snapshot (T5/T6/T7), veiligheidskleppen (Review Focus → T2/T3/T4/T6/T9). Reis-modus v2 bewust buiten scope.
- **Review Focus:** elk van de vijf punten heeft een eigenaar-taak met test/verificatie (fetch-faalt T6, toestemming geweigerd T9, meerdere/0 EVSE's T2, verloop/tijdzone T4, prijs onbekend T3).
- **Type-consistentie:** `Paal`, `Config`, `Watch`, `Snapshot` zijn een keer gedefinieerd (T2/T5) en overal hergebruikt; `sortByPriority(palen, order)` en `watchSatisfied(palen, watch, now)` consistent aangeroepen in T6/T7.
- **Proportie:** het plan beslist interfaces, namen en tests; de implementatie (bodies, React-JSX, SW) blijft aan de bouwer.
