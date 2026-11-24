# Warm energie stap 3: bedragen in euro's Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het scherm Energie toont per periode wat stroom en gas kostten (dynamische uurprijs plus tarieven uit Beheer) en wat stroom nu per kWh kost.

**Architecture:** Een uurlijkse cron haalt openbare uurprijzen op en legt per afgerond uur het verbruik vast (`energie_uren`). Tarieven staan als sets met een ingangsdatum in `energie_tarieven`. Een SQL-functie telt per tariefset de ruwe sommen van een periode op; de formules staan in een pure JS-module en worden bij het tonen toegepast, zodat een verbeterd tarief terugwerkt.

**Tech Stack:** React 19 + Vite, Vercel Node-functies (ESM, Node 24), Supabase Postgres via de service-sleutel, Vitest 5 (geen globals; jsdom voor componenten). Geen nieuwe npm-pakketten.

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md`, hoofdstuk 12 (hoofdstuk 10 en 11 voor het bestaande energiescherm).

**Repo:** `/Users/olivierarnolds/Desktop/warm-app` (branch main, niet pushen; de controller pusht aan het eind).

## Global Constraints

- Alle tekst (scherm, commentaar, commits, testnamen) in het Nederlands. NOOIT een em-dash (U+2014), nergens. Gebruik een komma, een punt of ` - `.
- Geen nieuwe npm-pakketten. Geen wijziging aan bestaande migraties; alleen `0011_kosten.sql` erbij. De implementer voert GEEN migratie uit en praat niet met de echte database; de controller past de migratie toe.
- Tests en code sturen nooit een echt commando naar een thermostaat en doen geen echt netwerkverzoek; `fetch` en de database zijn in tests altijd nagebootst.
- Geheimen, tokens en antwoorden van externe diensten komen nooit in een logregel of een antwoord van de API. Log alleen wat er mislukte.
- Naar de prijsbronnen gaat alleen land (NL) en periode. Geen kopregels met gegevens van de gebruiker.
- Bedragen in de API zijn getallen in euro's, afgerond op centen (`Math.round(x * 100) / 100`). Tarieven zijn zonder btw.
- Elk nieuw bestand onder `api/` moet echt laden: `tests/laden.test.js` dekt dat vanzelf, draai die mee.
- Tests draaien met `npx vitest run --maxWorkers=3`; kijk naar de exitcode van dat commando zelf, niet naar een gefilterde uitvoer.
- Stijl: volg de bestaande bestanden (geen puntkomma's, enkele aanhalingstekens, 2 spaties, commentaar boven een functie legt het waarom uit).
- Commit per taak, bericht in het Nederlands, eindigend op de regel `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Een storing in het kostendeel mag het scherm Energie of Beheer nooit laten omvallen: dan komt het antwoord zonder kosten.

## Review Focus

1. Een uur waarvan het eindpunt nog niet gemeten is (NAS even stil) mag niet als leeg uur worden vastgelegd, anders is dat verbruik voorgoed kwijt. Verwacht: de cron stopt bij dat uur en probeert het de volgende ronde opnieuw (taak 3).
2. De prijzen van morgen zijn er voor ongeveer 13:00 uur niet (bron geeft 404 of een lege lijst). Verwacht: geen fout, geen melding op het scherm, en de bedragen van vandaag blijven kloppen (taak 2 en 3).
3. Een periode die begint voor het eerste uur met bedragen, of die helemaal ervoor ligt. Verwacht: een duidelijke regel "Bedragen vanaf ..." of "Bedragen zijn er vanaf ...", nooit een misleidend totaal van nul (taak 4 en 5).
4. Invoer in Beheer met een komma ("0,09161"), een punt, een leeg veld of tekst. Verwacht: komma en punt werken, de rest geeft een melding en er wordt niets verstuurd (taak 6); de server weigert alles buiten het bereik (taak 1).
5. Een negatieve uurprijs. Verwacht: afname wordt goedkoper, teruglevering zonder salderen kost geld, en "Stroom kost nu" toont een min-bedrag zonder te breken (taak 1 en 5).

---

### Task 1: Database, opslagfuncties en rekenregels

**Files:**
- Create: `supabase/migrations/0011_kosten.sql`
- Create: `api/_lib/kosten.js`
- Modify: `api/_lib/opslag.js` (nieuw blok `// ---- Kosten ----` onderaan)
- Test: `tests/kosten-lib.test.js`, `tests/kosten-opslag.test.js`

**Interfaces:**
- Consumes: `amsterdamDelen` uit `api/_lib/tijd.js`; in `opslag.js` de bestaande hulpjes `db()`, `check()`, `getalOfNull()`, `isoOfNull()`, `naarIso()`.
- Produces (de volgende taken leunen hierop, namen exact zo):

```js
// api/_lib/kosten.js
export const UREN_PER_JAAR = 8760
// [sleutel, min, max, decimalen]
export const TARIEF_VELDEN = [
  ['opslagKwh', 0, 1, 5], ['ebStroomKwh', 0, 1, 5], ['afslagTerugKwh', 0, 1, 5],
  ['gasLeveringM3', 0, 10, 5], ['ebGasM3', 0, 10, 5], ['btwPct', 0, 30, 2],
  ['vastStroomJaar', 0, 5000, 2], ['netbeheerStroomJaar', 0, 5000, 2],
  ['vastGasJaar', 0, 5000, 2], ['netbeheerGasJaar', 0, 5000, 2], ['verminderingEbJaar', 0, 5000, 2],
]
export function geldigeDatum(tekst)            // 'JJJJ-MM-DD', echte kalenderdag, 2020-01-01 t/m 2100-01-01 -> boolean
export function valideerTarief(invoer)         // -> { ok: true, tarief } | { ok: false }
export function tariefVoor(tarieven, moment)   // set die geldt op de Amsterdamse dag van moment; voor de eerste set: de eerste; leeg: null
export function prijsAllIn(eurKwh, tarief)     // (eurKwh + opslagKwh + ebStroomKwh) * (1 + btwPct / 100); null als iets ontbreekt
export function berekenKosten({ delen, tarieven }) // -> { stroom, terug, gas, vast, totaal, uren, onvolledig, laatsteUur }
export function maakKosten({ begin, tarieven, delen, van }) // deel `kosten` van GET /api/energie, of null

// api/_lib/opslag.js
export async function leesKostenBegin()            // Date | null (instellingen, sleutel 'kosten_vanaf')
export async function leesLaatsteEnergieUur()      // ISO | null
export async function bewaarEnergieUren(rijen)     // [{ tijd, netImportKwh, netExportKwh, gasM3, samengevoegd }] -> aantal
export async function leesLaatsteStroomprijs()     // ISO | null
export async function telStroomprijzen(van, tot)   // aantal rijen met van <= tijd < tot
export async function bewaarStroomprijzen(rijen, bron) // [{ tijd, eurKwh }] -> aantal
export async function leesStroomprijs(tijd)        // getal | null, exact dat uur
export async function leesTarieven()               // oplopend op vanaf, camelCase, getallen; vanaf als 'JJJJ-MM-DD'
export async function bewaarTarief(tarief)         // upsert op vanaf, zet bijgewerkt_op
export async function verwijderTarief(vanaf)       // true als er een rij weg is
export async function leesKostenDelen(van, tot)    // rpc energie_kosten -> [{ vanaf, uren, importKwh, exportKwh, importPrijs, exportPrijs, gasM3, zonderPrijs, laatsteUur }]
```

Een tarief in JS: `{ vanaf, opslagKwh, ebStroomKwh, salderen, afslagTerugKwh, gasLeveringM3, ebGasM3, btwPct, vastStroomJaar, netbeheerStroomJaar, vastGasJaar, netbeheerGasJaar, verminderingEbJaar }`. Kolommen in de database: dezelfde namen in snake_case (`opslag_kwh`, `eb_stroom_kwh`, `salderen`, `afslag_terug_kwh`, `gas_levering_m3`, `eb_gas_m3`, `btw_pct`, `vast_stroom_jaar`, `netbeheer_stroom_jaar`, `vast_gas_jaar`, `netbeheer_gas_jaar`, `vermindering_eb_jaar`).

- [ ] **Step 1: Schrijf `supabase/migrations/0011_kosten.sql`** (stijl van `0009_zon.sql`: commentaar in het Nederlands, `set search_path = public`, RLS aan zonder policies).

```sql
create table public.stroomprijzen (
  tijd timestamptz primary key,
  eur_kwh numeric(10,6) not null check (eur_kwh > -1 and eur_kwh < 5),
  bron text not null
);

create table public.energie_uren (
  tijd timestamptz primary key,
  net_import_kwh numeric(12,3) check (net_import_kwh >= 0),
  net_export_kwh numeric(12,3) check (net_export_kwh >= 0),
  gas_m3 numeric(12,3) check (gas_m3 >= 0),
  samengevoegd boolean not null default false
);

create table public.energie_tarieven (
  vanaf date primary key,
  opslag_kwh numeric(10,5) not null,
  eb_stroom_kwh numeric(10,5) not null,
  salderen boolean not null,
  afslag_terug_kwh numeric(10,5) not null,
  gas_levering_m3 numeric(10,5) not null,
  eb_gas_m3 numeric(10,5) not null,
  btw_pct numeric(5,2) not null,
  vast_stroom_jaar numeric(10,2) not null,
  netbeheer_stroom_jaar numeric(10,2) not null,
  vast_gas_jaar numeric(10,2) not null,
  netbeheer_gas_jaar numeric(10,2) not null,
  vermindering_eb_jaar numeric(10,2) not null,
  bijgewerkt_op timestamptz not null default now()
);

alter table public.stroomprijzen enable row level security;
alter table public.energie_uren enable row level security;
alter table public.energie_tarieven enable row level security;

insert into public.energie_tarieven
  (vanaf, opslag_kwh, eb_stroom_kwh, salderen, afslag_terug_kwh, gas_levering_m3, eb_gas_m3, btw_pct,
   vast_stroom_jaar, netbeheer_stroom_jaar, vast_gas_jaar, netbeheer_gas_jaar, vermindering_eb_jaar)
values
  ('2026-01-01', 0.01027, 0.09161, true,  0.02280, 0.53584, 0.60066, 21, 79.00, 395.08, 79.00, 220.35, 519.80),
  ('2027-01-01', 0.01027, 0.08802, false, 0.02280, 0.53584, 0.61628, 21, 79.00, 395.08, 79.00, 220.35, 519.58);

insert into public.instellingen (sleutel, waarde)
values ('kosten_vanaf', '2026-11-14T12:00:00Z')
on conflict (sleutel) do nothing;

-- Per tariefset de ruwe sommen van de uren in [p_van, p_tot). Een uur hoort bij de set met de
-- laatste ingangsdatum op of voor zijn Amsterdamse dag; uren van voor de eerste set bij de eerste.
create function public.energie_kosten(p_van timestamptz, p_tot timestamptz)
returns table (
  vanaf date, uren integer, import_kwh numeric, export_kwh numeric,
  import_prijs numeric, export_prijs numeric, gas_m3 numeric, zonder_prijs integer, laatste_uur timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    t.vanaf,
    count(*)::integer,
    coalesce(sum(u.net_import_kwh) filter (where p.tijd is not null), 0),
    coalesce(sum(u.net_export_kwh) filter (where p.tijd is not null), 0),
    coalesce(sum(u.net_import_kwh * p.eur_kwh), 0),
    coalesce(sum(u.net_export_kwh * p.eur_kwh), 0),
    coalesce(sum(u.gas_m3), 0),
    (count(*) filter (where p.tijd is null))::integer,
    max(u.tijd)
  from public.energie_uren u
  left join public.stroomprijzen p on p.tijd = u.tijd
  cross join lateral (
    select coalesce(
      (select max(t1.vanaf) from public.energie_tarieven t1
        where t1.vanaf <= (u.tijd at time zone 'Europe/Amsterdam')::date),
      (select min(t2.vanaf) from public.energie_tarieven t2)
    ) as vanaf
  ) t
  where u.tijd >= p_van and u.tijd < p_tot and t.vanaf is not null
  group by t.vanaf
  order by t.vanaf;
$$;
```

- [ ] **Step 2: Schrijf de falende tests in `tests/kosten-lib.test.js`**

Vaste gegevens voor de tests:

```js
const T2026 = { vanaf: '2026-01-01', opslagKwh: 0.01027, ebStroomKwh: 0.09161, salderen: true, afslagTerugKwh: 0.0228,
  gasLeveringM3: 0.53584, ebGasM3: 0.60066, btwPct: 21, vastStroomJaar: 79, netbeheerStroomJaar: 395.08,
  vastGasJaar: 79, netbeheerGasJaar: 220.35, verminderingEbJaar: 519.8 }
const T2027 = { ...T2026, vanaf: '2027-01-01', ebStroomKwh: 0.08802, ebGasM3: 0.61628, verminderingEbJaar: 519.58, salderen: false }
const DEEL = { uren: 24, importKwh: 10, exportKwh: 4, importPrijs: 1.5, exportPrijs: 0.2, gasM3: 3, zonderPrijs: 0, laatsteUur: '2026-11-15T22:00:00.000Z' }
```

Tests met deze uitkomsten:
- `berekenKosten` met `[{ ...DEEL, vanaf: '2026-01-01' }]` en `[T2026, T2027]` geeft `{ stroom: 3.05, terug: -0.74, gas: 4.13, vast: 0.84, totaal: 7.28, uren: 24, onvolledig: false, laatsteUur: '2026-11-15T22:00:00.000Z' }`.
- Met `vanaf: '2027-01-01'`: `stroom: 3`, `terug: -0.11`, `gas: 4.18`, `vast: 0.84`, `totaal: 7.92` (3.004309 - 0.1088 + 4.1821956 + 0.8415315).
- Zonder salderen en een negatieve uurprijs (`exportPrijs: -0.3`, `exportKwh: 4`): `terug` is `0.39` (terugleveren kost geld).
- Twee delen (2026 en 2027) tellen op: `uren: 48`, `totaal: 15.2`, `laatsteUur` is de laatste van de twee.
- `zonderPrijs: 2` in een deel geeft `onvolledig: true`.
- Een deel met een `vanaf` die in geen enkele set voorkomt wordt overgeslagen en geeft `onvolledig: true`.
- Lege `delen` geeft allemaal 0, `uren: 0`, `onvolledig: false`, `laatsteUur: null`.
- `totaal` is de afronding van de som van de onafgeronde delen, niet de som van afgeronde delen (kies waarden waar dat een cent scheelt).
- `prijsAllIn(0.10, T2026)` is `toBeCloseTo(0.2442748, 7)`; `prijsAllIn(-0.25, T2026)` is negatief; `prijsAllIn(null, T2026)`, `prijsAllIn(NaN, T2026)` en `prijsAllIn(0.1, null)` zijn `null`.
- `tariefVoor([T2026, T2027], new Date('2026-12-31T22:59:00Z'))` is T2026 en met `'2026-12-31T23:00:00Z'` (middernacht in Amsterdam) T2027; een moment in 2025 geeft T2026; `tariefVoor([], x)` is `null`; de volgorde van de invoer maakt niet uit.
- `geldigeDatum`: `'2027-01-01'` waar; `'2027-02-30'`, `'27-01-01'`, `'2019-12-31'`, `'2100-01-02'`, `20270101` en `null` onwaar.
- `valideerTarief(T2026)` geeft `{ ok: true, tarief }` met exact dezelfde waarden; rondt `opslagKwh: 0.0102749` af op 5 decimalen; weigert (`{ ok: false }`): ontbrekend veld, tekst `'0,01'`, `NaN`, negatief, boven het maximum, `salderen: 'ja'`, ongeldige `vanaf`, `null`, een array. Onbekende extra velden komen niet in `tarief`.
- `maakKosten`: `begin` null of lege `tarieven` geeft `null`; anders het resultaat van `berekenKosten` zonder `laatsteUur`, plus `begin` (ISO), `deels` (`van < begin`) en `tot` (ISO van `laatsteUur` plus een uur, of `null` zonder uren). Test: `van` voor en na `begin`, en `tot` bij `laatsteUur: '2026-11-15T22:00:00.000Z'` is `'2026-11-15T23:00:00.000Z'`.

- [ ] **Step 3: Draai `npx vitest run tests/kosten-lib.test.js --maxWorkers=3`.** Verwacht: FAIL, module bestaat niet.

- [ ] **Step 4: Schrijf `api/_lib/kosten.js`** met de signaturen uit Interfaces. Formules, met `f = 1 + btwPct / 100`:
  - `stroom = (importPrijs + importKwh * (opslagKwh + ebStroomKwh)) * f`
  - `terug` met salderen `= -(exportPrijs + exportKwh * (opslagKwh + ebStroomKwh)) * f`; zonder salderen `= -(exportPrijs - exportKwh * afslagTerugKwh)`
  - `gas = gasM3 * (gasLeveringM3 + ebGasM3) * f`
  - `vast = uren / UREN_PER_JAAR * (vastStroomJaar + netbeheerStroomJaar + vastGasJaar + netbeheerGasJaar - verminderingEbJaar) * f`
  - Afronden op centen gebeurt pas na het optellen over de delen. Maak van `-0` een gewone `0`.

- [ ] **Step 5: Draai de test opnieuw.** Verwacht: PASS.

- [ ] **Step 6: Schrijf de falende tests in `tests/kosten-opslag.test.js`** (nabootsing van Supabase zoals in `tests/energie-opslag.test.js`; breid de keten uit met wat je nodig hebt, zoals `upsert`, `delete`, `gte`, `lt`, `select` met `count`). Per functie minstens: de juiste tabel of rpc-naam en parameters, de omzetting naar camelCase en getallen (numeric komt als tekst binnen: `'0.09161'` wordt `0.09161`), en dat een databasefout wordt gegooid als `Error` met `Database:` vooraan. Verder:
  - `leesKostenBegin`: `'2026-11-14T12:00:00Z'` geeft een Date met die tijd; ontbrekende rij of onleesbare waarde geeft `null`.
  - `bewaarEnergieUren([])` en `bewaarStroomprijzen([], 'x')` raken de database niet en geven 0.
  - `bewaarStroomprijzen` schrijft `{ tijd: ISO, eur_kwh, bron }` met `onConflict: 'tijd'`; `bewaarEnergieUren` schrijft `{ tijd, net_import_kwh, net_export_kwh, gas_m3, samengevoegd }`, `null` blijft `null`.
  - `leesTarieven` sorteert oplopend op `vanaf` en geeft `vanaf` als `'JJJJ-MM-DD'`.
  - `verwijderTarief` geeft `true` bij een verwijderde rij en `false` bij geen.
  - `leesKostenDelen` roept `energie_kosten` aan met `{ p_van: ISO, p_tot: ISO }` en geeft `laatsteUur` als ISO.

- [ ] **Step 7: Draai, zie falen, voeg de functies toe aan `api/_lib/opslag.js`, draai tot PASS.**

- [ ] **Step 8: Draai alles: `npx vitest run --maxWorkers=3`.** Verwacht: exitcode 0.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/0011_kosten.sql api/_lib/kosten.js api/_lib/opslag.js tests/kosten-lib.test.js tests/kosten-opslag.test.js
git commit -m "Kosten: tabellen, opslagfuncties en rekenregels voor bedragen in euro's"
```

---

### Task 2: Uurprijzen ophalen

**Files:**
- Create: `api/_lib/prijzen.js`
- Test: `tests/prijzen.test.js`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces:

```js
export const PRIJS_MIN = -1
export const PRIJS_MAX = 5
// Tijdstempels in seconden en prijzen in EUR per MWh -> [{ tijd: Date, eurKwh }] per heel uur.
export function kwartierenNaarUren(unixSeconden, prijzenMwh)
// Antwoord van EnergyZero ({ Prices: [{ readingDate, price }] }, EUR per kWh) -> [{ tijd: Date, eurKwh }]
export function leesEnergyZero(body)
// Nooit een throw. -> { bron: 'energy-charts' | 'energyzero' | null, prijzen: [{ tijd: Date, eurKwh }] }
export async function haalUurprijzen(van, tot, { haal = globalThis.fetch } = {})
```

Gegevens over de bronnen (nagemeten op 2026-11-15):
- Eerste bron: `GET https://api.energy-charts.info/price?bzn=NL&start=<van.toISOString()>&end=<tot.toISOString()>`. Antwoord 200: `{ unix_seconds: [..], price: [..], unit: 'EUR / MWh' }` met een waarde per kwartier; `end` telt mee (de waarde op `tot` zelf komt ook terug). Zonder gegevens in de periode: HTTP 404 met de tekst `no content available`.
- Reserve: `GET https://api.energyzero.nl/v1/energyprices?fromDate=<ISO>&tillDate=<ISO>&interval=4&usageType=1&inclBtw=false` (bouw de query met `URLSearchParams`). Antwoord 200: `{ Prices: [{ readingDate: '2026-11-15T00:00:00Z', price: 0.16208 }] }`, per uur, in EUR per kWh zonder btw; zonder gegevens een lege `Prices`.
- Het gemiddelde van de vier kwartieren van de eerste bron is exact de uurprijs van de reserve.

Regels:
- `kwartierenNaarUren`: groepeer per heel uur (UTC). De stap is het kleinste verschil tussen opeenvolgende tijdstempels (bij een enkele waarde 3600). Een uur telt alleen mee met precies `3600 / stap` eindige waarden (4 bij kwartieren, 1 bij uren). `eurKwh` is het gemiddelde gedeeld door 1000, afgerond op 6 decimalen. Uren buiten `PRIJS_MIN < eurKwh < PRIJS_MAX` vallen weg. Ongelijke lengtes of geen arrays: lege lijst. Uitvoer oplopend op tijd.
- `leesEnergyZero`: alleen rijen met een `readingDate` op een heel uur en een eindige `price` binnen het bereik; afgerond op 6 decimalen; alles anders overslaan; geen geldige `Prices`: lege lijst.
- `haalUurprijzen`: eerst de eerste bron; geeft die geen enkele prijs in `van <= tijd < tot` (fout, 404, time-out, onleesbaar antwoord of leeg), dan de reserve; geeft die ook niets, dan `{ bron: null, prijzen: [] }`. Altijd filteren op `van <= tijd < tot`. Elk verzoek met `signal: AbortSignal.timeout(10000)`. Geen eigen kopregels. Log bij een mislukte bron alleen `Prijzen: <bron> gaf geen prijzen (<HTTP-status of 'fout'>)`, nooit de inhoud.

- [ ] **Step 1: Schrijf de falende tests in `tests/prijzen.test.js`** (geef `haal` mee als `vi.fn()`; nooit echt netwerk):
  - Acht kwartieren vanaf `1794697200` (2026-11-14T23:00Z) met prijzen `[166, 168, 167, 167.56, 160, 162, 163, 163.32]` geven twee uren: `0.16714` en `0.16208`.
  - Een uur met drie kwartieren valt weg; een uur met een `null` erin valt weg.
  - Uurwaarden (stap 3600) gaan een op een door: `[100, 250]` geeft `0.1` en `0.25`.
  - Een negatieve prijs blijft (`-50` per MWh wordt `-0.05`); `6000` per MWh valt weg.
  - `kwartierenNaarUren('x', [])`, ongelijke lengtes en lege arrays geven `[]`.
  - `leesEnergyZero` met twee geldige rijen, een rij op `00:30`, een rij met `price: 'duur'` en een rij met `price: 9` geeft alleen de twee geldige.
  - `haalUurprijzen`: eerste bron levert, dan `bron: 'energy-charts'`, de reserve wordt niet aangeroepen, en de eerste aanroep gaat naar een URL die begint met `https://api.energy-charts.info/price?` en `bzn=NL` bevat.
  - De waarde op `tot` zelf en waarden voor `van` komen niet in de uitvoer.
  - Eerste bron 404, reserve levert: `bron: 'energyzero'`, URL begint met `https://api.energyzero.nl/v1/energyprices?` en bevat `inclBtw=false`.
  - Eerste bron gooit (netwerkfout), reserve levert: `bron: 'energyzero'`.
  - Eerste bron geeft 200 met onleesbare JSON, reserve geeft lege `Prices`: `{ bron: null, prijzen: [] }` en er is niets gegooid.
  - In geen enkele logregel staat de inhoud van een antwoord (laat de bron een tekst `geheim-antwoord` teruggeven en controleer `console.error`).
  - Beide verzoeken krijgen een `signal` mee.

- [ ] **Step 2: Draai `npx vitest run tests/prijzen.test.js --maxWorkers=3`.** Verwacht: FAIL.
- [ ] **Step 3: Schrijf `api/_lib/prijzen.js`.**
- [ ] **Step 4: Draai tot PASS, daarna alles (`npx vitest run --maxWorkers=3`, exitcode 0).**
- [ ] **Step 5: Commit**

```bash
git add api/_lib/prijzen.js tests/prijzen.test.js
git commit -m "Kosten: openbare uurprijzen ophalen, met een reservebron"
```

---

### Task 3: De cron die prijzen en uren bijhoudt

**Files:**
- Create: `api/cron/kosten.js`
- Modify: `vercel.json` (vierde cron: `{ "path": "/api/cron/kosten", "schedule": "8 * * * *" }`)
- Test: `tests/cron-kosten.test.js`

**Interfaces:**
- Consumes: `cronGeheimKlopt` (`api/_lib/cron.js`), `geenCache` (`api/_lib/guard.js`), `haalUurprijzen` (taak 2), `leesKostenBegin`, `leesLaatsteStroomprijs`, `telStroomprijzen`, `bewaarStroomprijzen`, `leesLaatsteEnergieUur`, `bewaarEnergieUren` (taak 1), de bestaande `leesEnergieOpGrenzen` (`opslag.js`) en `maakReeks` (`api/_lib/energie.js`), `amsterdamDelen` en `amsterdamMiddernacht` (`api/_lib/tijd.js`).
- Produces: `GET /api/cron/kosten` -> 200 `{ ok: true, prijzen: <aantal bewaard>, uren: <aantal bewaard> }`; 401 zonder geldig cron-geheim; 405 bij een andere methode; 500 `{ ok: false }` als het vastleggen van de uren faalt.

Kijk voor de opzet (methode, geheim, `geenCache`, logstijl) naar `api/cron/zon.js` en `tests/cron-zon.test.js`.

Gedrag, in deze volgorde:
1. `begin = await leesKostenBegin()`. Is die `null`: 200 met `prijzen: 0, uren: 0`, verder niets.
2. **Prijzen** (een fout hier wordt gelogd met alleen wat er mislukte en houdt stap 3 niet tegen):
   - `nodigTot` = Amsterdamse middernacht na vandaag; is het in Amsterdam 13:00 uur of later, dan de middernacht na morgen.
   - `dagBegin` = Amsterdamse middernacht van de dag van `begin`. `gisteren` = Amsterdamse middernacht van gisteren. `laatste = await leesLaatsteStroomprijs()`.
   - `vensterVan` = het vroegste van (`laatste` plus een uur, of `dagBegin` als er nog geen prijs is) en `gisteren`, maar nooit voor `dagBegin`.
   - Staan er in `[vensterVan, nodigTot)` al evenveel prijzen als er uren zijn (`telStroomprijzen`, uren = verschil in milliseconden gedeeld door 3 600 000), dan geen verzoek.
   - Anders `haalUurprijzen(vensterVan, tot)` met `tot` = `nodigTot` of, als dat eerder is, `vensterVan` plus 35 dagen; bewaar wat terugkomt met `bewaarStroomprijzen(prijzen, bron)`. Niets terug: niets bewaren, geen fout.
3. **Uren:**
   - `start` = `leesLaatsteEnergieUur()` plus een uur, of `begin` (naar beneden afgerond op een heel uur) als er nog geen uur is. `eind` = het begin van het lopende uur. Het aantal af te handelen uren is hooguit 100 per ronde; nul of minder: niets doen.
   - `grenzen` = `start`, `start` plus 1 uur, tot en met het eind van het laatste af te handelen uur (aantal plus een grenzen). `punten = await leesEnergieOpGrenzen(grenzen)`.
   - `maakReeks({ grenzen, labels, punten, stand: null, nu })` geeft per uur `netImport`, `netExport`, `gas` en `samengevoegd`. Geef nooit de laatste stand mee: alleen vastgelegde momentopnamen tellen.
   - Loop de uren op volgorde af en stop bij het eerste uur waarvan het eindpunt `punten[i + 1]` ontbreekt of geen `netTijd` heeft. Dat uur en alles erna wordt deze ronde niet bewaard (Review Focus 1).
   - `bewaarEnergieUren` met `{ tijd: grenzen[i], netImportKwh, netExportKwh, gasM3, samengevoegd }` voor de uren ervoor.

- [ ] **Step 1: Schrijf de falende tests in `tests/cron-kosten.test.js`** (bootst `opslag.js` en `prijzen.js` na, de echte `energie.js` en `tijd.js`; vaste klok met `vi.useFakeTimers` en `vi.setSystemTime`):
  - 405 bij POST; 401 zonder en met een fout geheim, en er is dan niets gelezen.
  - `leesKostenBegin` geeft `null`: 200 `{ ok: true, prijzen: 0, uren: 0 }`, geen prijsverzoek en geen uren.
  - Klok 2026-11-15T10:08Z (11:08 in Amsterdam), nog geen prijzen, `begin` 2026-11-14T12:00Z: `haalUurprijzen` wordt aangeroepen met `van` 2026-11-13T23:00Z en `tot` 2026-11-15T23:00Z.
  - Klok 2026-11-15T12:08Z (13:08 in Amsterdam): `tot` is 2026-11-16T23:00Z.
  - Alle prijzen aanwezig (`telStroomprijzen` geeft het verwachte aantal): geen verzoek.
  - `laatste` van drie dagen geleden: `van` is `laatste` plus een uur (aanvullen na een storing); `laatste` van vandaag: `van` is de middernacht van gisteren.
  - Een venster langer dan 35 dagen wordt afgekapt op `vensterVan` plus 35 dagen.
  - `haalUurprijzen` geeft `{ bron: null, prijzen: [] }`: niets bewaard, antwoord 200 met `prijzen: 0`.
  - `bewaarStroomprijzen` gooit: de uren worden toch vastgelegd en het antwoord is 200.
  - Uren, eerste keer: `begin` 12:00Z, klok 15:08Z, punten op 12:00, 13:00, 14:00 en 15:00 met oplopende tellers: drie rijen met de juiste verschillen (bijvoorbeeld import 100.000, 100.400, 101.000, 101.150 geeft 0.4, 0.6, 0.15) en `tijd` 12:00Z, 13:00Z, 14:00Z.
  - Vervolg: `leesLaatsteEnergieUur` 13:00Z, klok 15:08Z: grenzen 14:00Z, 15:00Z; een rij.
  - Geen afgerond uur sinds het laatste: `leesEnergieOpGrenzen` wordt niet aangeroepen.
  - Meer dan 100 uur achterstand: 101 grenzen en hooguit 100 rijen.
  - Eindpunt ontbreekt (punt van 14:00Z is `null`): alleen het uur van 12:00Z wordt bewaard; het uur van 13:00Z niet.
  - Eindpunt zonder `netTijd` (alleen batterij): zelfde uitkomst.
  - Een stilte: het punt van 13:00Z heeft `netTijd` 14:40Z: het uur van 12:00Z krijgt het hele verschil met `samengevoegd: true`, het uur van 13:00Z heeft `null` voor de tellers.
  - `stand` wordt nooit gelezen (`leesEnergieStand` niet aangeroepen).
  - `leesEnergieOpGrenzen` gooit: 500 `{ ok: false }`.
  - `vercel.json` bevat de cron `/api/cron/kosten` met schema `8 * * * *` (lees het bestand in de test).

- [ ] **Step 2: Draai `npx vitest run tests/cron-kosten.test.js --maxWorkers=3`.** Verwacht: FAIL.
- [ ] **Step 3: Schrijf `api/cron/kosten.js` en pas `vercel.json` aan.**
- [ ] **Step 4: Draai tot PASS, daarna alles (exitcode 0; `tests/laden.test.js` laadt het nieuwe bestand echt).**
- [ ] **Step 5: Commit**

```bash
git add api/cron/kosten.js vercel.json tests/cron-kosten.test.js
git commit -m "Kosten: uurlijkse cron voor uurprijzen en verbruik per uur"
```

---

### Task 4: Kosten in de API (energie en beheer)

**Files:**
- Modify: `api/energie/index.js`, `api/beheer/index.js`
- Test: `tests/energie-api.test.js`, `tests/beheer-api.test.js` (bestaande bestanden uitbreiden; hun nabootsing van `opslag.js` aanvullen)

**Interfaces:**
- Consumes: `leesKostenBegin`, `leesTarieven`, `leesKostenDelen`, `leesStroomprijs`, `bewaarTarief`, `verwijderTarief` (opslag, taak 1); `maakKosten`, `prijsAllIn`, `tariefVoor`, `valideerTarief`, `geldigeDatum` (kosten, taak 1).
- Produces:
  - `GET /api/energie` krijgt twee velden erbij:
    - `prijsNu`: wat stroom nu per kWh kost, alles inbegrepen, afgerond op 4 decimalen, of `null`.
    - `kosten`: `null`, of `{ stroom, terug, gas, vast, totaal, uren, onvolledig, begin, deels, tot }` (zie `maakKosten`).
  - `GET /api/beheer` krijgt `tarieven: [tarief, ...]` erbij (oplopend op `vanaf`; bij een storing `[]`).
  - `POST /api/beheer` met `{ soort: 'tarief', tarief: {...} }`: geldig -> bewaren -> 200 `{ ok: true, tarieven }` (vers gelezen); ongeldig -> 400 met de bestaande `ONGELDIG`.
  - `POST /api/beheer` met `{ soort: 'tariefWeg', vanaf: 'JJJJ-MM-DD' }`: 400 `ONGELDIG` bij een ongeldige datum, bij een datum die niet bestaat en als het de enige set is; anders verwijderen -> 200 `{ ok: true, tarieven }`.

Regels voor `GET /api/energie`:
- Lees het kostendeel naast de rest (`Promise.all`), met een eigen `catch` zoals het zondeel: bij een fout loggen (`Energie: kosten lezen mislukt` plus alleen de melding) en verder met `kosten: null` en `prijsNu: null`.
- Kostendeel: `leesKostenBegin()`, `leesTarieven()`, `leesKostenDelen(grenzen[0], grenzen[grenzen.length - 1])` en `leesStroomprijs(<begin van het lopende uur>)`.
- `kosten = maakKosten({ begin, tarieven, delen, van: grenzen[0] })`. `prijsNu` = `prijsAllIn(prijs, tariefVoor(tarieven, nu))`, afgerond op 4 decimalen, of `null`.
- De bestaande velden en hun gedrag veranderen niet.

- [ ] **Step 1: Schrijf de falende tests.** In `tests/energie-api.test.js`:
  - Met begin, twee tarieven, een deel en een prijs van 0.10: `kosten` heeft de bedragen uit taak 1 (`totaal: 7.28` voor het voorbeelddeel met de set van 2026), `begin` als ISO, `deels` en `tot`; `prijsNu` is `0.2443`.
  - `leesKostenDelen` krijgt de eerste en de laatste grens van de periode (controleer voor `periode=dag` dat het verschil 24 uur is en voor `periode=jaar&terug=1` dat het jaar 2025 is).
  - `leesStroomprijs` krijgt het begin van het lopende uur (minuten, seconden en milliseconden 0).
  - `leesKostenBegin` geeft `null`: `kosten: null`, de rest van het antwoord is er gewoon.
  - `leesTarieven` gooit: status 200, `kosten: null`, `prijsNu: null`, de bestaande velden kloppen, en de fout is gelogd zonder stacktrace-object.
  - Geen prijs voor dit uur: `prijsNu: null`, `kosten` blijft gevuld.
  - Een negatieve prijs van -0.25: `prijsNu` is negatief (`-0.1792`).
  - Zonder inlog blijft het 401 en wordt er geen kostendeel gelezen.

  In `tests/beheer-api.test.js`:
  - GET bevat `tarieven`; als `leesTarieven` gooit is het `[]` en de rest komt gewoon.
  - `soort: 'tarief'` met een geldige set: `bewaarTarief` krijgt het gevalideerde tarief (afgerond, zonder extra velden) en het antwoord bevat de vers gelezen lijst.
  - Ongeldig (ontbrekend veld, tekst als bedrag, `vanaf: '2027-02-30'`, geen `tarief`): 400 en `bewaarTarief` niet aangeroepen.
  - `soort: 'tariefWeg'`: bestaande datum bij twee sets -> `verwijderTarief('2027-01-01')` en 200 met de lijst; onbekende datum -> 400; enige set -> 400; ongeldige datum -> 400. In de 400-gevallen is `verwijderTarief` niet aangeroepen.
  - Zonder beheerrecht en bij een andere herkomst gelden de bestaande weigeringen ook voor deze twee soorten.

- [ ] **Step 2: Draai de twee testbestanden.** Verwacht: FAIL op de nieuwe tests.
- [ ] **Step 3: Pas `api/energie/index.js` en `api/beheer/index.js` aan.**
- [ ] **Step 4: Draai tot PASS, daarna alles (exitcode 0).**
- [ ] **Step 5: Commit**

```bash
git add api/energie/index.js api/beheer/index.js tests/energie-api.test.js tests/beheer-api.test.js
git commit -m "Kosten: bedragen en de prijs van nu in de energie-API, tarieven in de beheer-API"
```

---

### Task 5: Bedragen op het scherm Energie

**Files:**
- Create: `src/components/EnergieKosten.jsx`
- Modify: `src/lib/energie.js` (`formatEuro`), `src/components/Energie.jsx`, `src/index.css`
- Test: `tests/energie-client.test.js` (formatEuro), `tests/energie-kosten.test.jsx` (nieuw), `tests/energie-scherm.test.jsx` (uitbreiden)

**Interfaces:**
- Consumes: de velden `kosten` en `prijsNu` van `GET /api/energie` (taak 4); `datumTekst`, `tijdTekst` uit `src/lib/energie.js`.
- Produces:
  - `formatEuro(v)`: `3.2` -> `'€ 3,20'`; `-0.74` -> `'-€ 0,74'`; `1234.5` -> `'€ 1234,50'`; `-0.004` en `0` -> `'€ 0,00'`; `null`, `undefined`, `NaN`, tekst -> `'-'`.
  - `<EnergieKosten kosten={...} huidig={boolean} />`.

Gedrag van `EnergieKosten`:
- `kosten` is `null` of ontbreekt: niets.
- `kosten.uren === 0` en `kosten.deels`: alleen de regel `Bedragen zijn er vanaf {datumTekst(kosten.begin)}.`
- `kosten.uren === 0` en niet `deels`: alleen de regel `Nog geen bedragen voor deze periode.`
- Anders een `<section aria-label="Kosten">` met kop `Kosten` (h2) en een `<dl>` met, in deze volgorde: `Stroom van het net` (`stroom`), `Teruglevering` (`terug`), `Gas` (`gas`), `Vaste kosten` (`vast`), `Totaal` (`totaal`), elk met `formatEuro`. De rij Totaal heeft de klasse `energie-kosten-totaal` (vet).
- Daaronder, als gedempte regels (`energie-gedempt`), elk alleen als het van toepassing is en in deze volgorde: `Bedragen vanaf {datumTekst(kosten.begin)}.` (bij `deels`); `Van een deel van de uren is de prijs nog niet bekend.` (bij `onvolledig`); `Bijgewerkt tot {tijdTekst(kosten.tot)}.` (bij `huidig` en een `tot`); altijd `Indicatie op basis van de tarieven in Beheer.`

In `Energie.jsx`:
- Onder `<EnergieNu>` (binnen dezelfde tak, dus alleen als er metingen zijn) een regel `Stroom kost nu {formatEuro(gegevens.prijsNu)} per kWh` met de klassen `energie-gedempt energie-prijs-nu`, alleen als `gegevens.prijsNu` een eindig getal is.
- `<EnergieKosten kosten={gegevens.kosten} huidig={gegevens.terug === 0} />` binnen het blok `energie-periode-deel`, direct na de sectie Totalen en voor de grafiek, zodat het meedimt bij een periodewissel.
- Een antwoord zonder de nieuwe velden (oude server) mag niets breken.

Stijl in `src/index.css`: sluit aan op `.energie-totalen` en `.energie-totaal` (zelfde lettergrootte en kleuren, ook in de donkere weergave); de bedragen rechts uitgelijnd in een kolom, het label links; geen lichtgele of pastelkleurige tekst op een lichte achtergrond; alles past op 375 px breed zonder horizontaal schuiven.

- [ ] **Step 1: Schrijf de falende tests.**
  - `tests/energie-client.test.js`: de gevallen van `formatEuro` hierboven.
  - `tests/energie-kosten.test.jsx`: niets bij `null`; de twee regels bij `uren: 0`; de vijf rijen met de juiste bedragen en volgorde (bijvoorbeeld `{ stroom: 3.05, terug: -0.74, gas: 4.13, vast: 0.84, totaal: 7.28 }` toont `€ 3,05`, `-€ 0,74`, `€ 4,13`, `€ 0,84`, `€ 7,28`); elke gedempte regel verschijnt alleen onder zijn voorwaarde; `Bijgewerkt tot` ontbreekt bij `huidig={false}`; de datum in `Bedragen vanaf` is `14 november 2026` bij `begin: '2026-11-14T12:00:00.000Z'`.
  - `tests/energie-scherm.test.jsx`: met `prijsNu: 0.2443` staat er `Stroom kost nu € 0,24 per kWh`; met `prijsNu: null` of zonder het veld niet; met `prijsNu: -0.02` staat er `-€ 0,02`; de sectie Kosten staat tussen de totalen en de grafiek; een antwoord zonder `kosten` toont geen sectie Kosten en geen fout; na terugbladeren (`terug` 1) ontbreekt `Bijgewerkt tot`.

- [ ] **Step 2: Draai de drie testbestanden.** Verwacht: FAIL op de nieuwe tests.
- [ ] **Step 3: Schrijf de code.**
- [ ] **Step 4: Draai tot PASS, daarna alles (exitcode 0) en een proefbouw:** `npx vite build --outDir "dist_v$(date +%s)"`, zie `built`, daarna `rm -rf dist_v*`.
- [ ] **Step 5: Commit**

```bash
git add src/components/EnergieKosten.jsx src/components/Energie.jsx src/lib/energie.js src/index.css tests/energie-client.test.js tests/energie-kosten.test.jsx tests/energie-scherm.test.jsx
git commit -m "Energie: kosten per periode en de stroomprijs van nu op het scherm"
```

---

### Task 6: Energietarieven in Beheer

**Files:**
- Create: `src/lib/tarieven.js`, `src/components/BeheerTarieven.jsx`
- Modify: `src/components/Beheer.jsx` (nieuwe sectie na Zonnepanelen), `src/index.css`
- Test: `tests/tarieven-client.test.js`, `tests/beheer-tarieven.test.jsx`, `tests/beheer.test.jsx` (uitbreiden)

**Interfaces:**
- Consumes: `tarieven` uit `GET /api/beheer` en de twee POST-soorten uit taak 4. Kijk in `Beheer.jsx` hoe `stuur` werkt en hoe `ZonSectie` en "Lang aan" gegevens krijgen en fouten tonen; sluit daarop aan.
- Produces:

```js
// src/lib/tarieven.js
export const TARIEF_VELDEN = [  // [sleutel, label, groep]
  ['opslagKwh', 'Inkoopvergoeding per kWh', 'Stroom'],
  ['ebStroomKwh', 'Energiebelasting stroom per kWh', 'Stroom'],
  ['afslagTerugKwh', 'Afslag bij teruglevering per kWh', 'Stroom'],
  ['vastStroomJaar', 'Vaste leveringskosten stroom per jaar', 'Stroom'],
  ['netbeheerStroomJaar', 'Netbeheer stroom per jaar', 'Stroom'],
  ['verminderingEbJaar', 'Vermindering energiebelasting per jaar', 'Stroom'],
  ['gasLeveringM3', 'Leveringstarief gas per m3', 'Gas'],
  ['ebGasM3', 'Energiebelasting gas per m3', 'Gas'],
  ['vastGasJaar', 'Vaste leveringskosten gas per jaar', 'Gas'],
  ['netbeheerGasJaar', 'Netbeheer gas per jaar', 'Gas'],
  ['btwPct', 'Btw in procenten', 'Btw'],
]
export function leesBedrag(tekst)        // '0,09161' of '0.09161' of ' 79 ' -> getal; leeg, negatief, tekst, twee scheidingstekens -> null
export function toonBedrag(getal)        // 0.09161 -> '0,09161'; 79 -> '79,00'; 0.0228 -> '0,0228'; 21 -> '21,00'; minstens 2 en hooguit 5 decimalen
export function datumLabel(vanaf)        // '2027-01-01' -> '1 januari 2027'
export function geldendeVanaf(tarieven, vandaag) // de vanaf van de set die vandaag ('JJJJ-MM-DD') geldt, anders de eerste; leeg: null
```

`<BeheerTarieven tarieven={[...]} stuur={fn} onTarieven={(lijst) => ...} />`: `stuur(pad, opts)` is de bestaande hulpfunctie van Beheer (geef hem door); na elk geslaagd antwoord roept het onderdeel `onTarieven(data.tarieven)` aan, zodat Beheer de lijst bijhoudt. Wijkt de werkelijke vorm van `stuur` af van wat je hier nodig hebt, pas dan de props aan en beschrijf dat in je rapport.

Scherm (teksten exact):
- Sectie met klasse `beheer-sectie`, kop (h2) `Energietarieven`.
- Uitleg: `Alle bedragen zonder btw, zoals op het tarievenblad van je leverancier. De app rekent de btw erbij.`
- Is `tarieven` leeg: alleen de regel `De tarieven konden niet geladen worden.` (geen formulier).
- Keuzelijst met label `Geldig vanaf`, een optie per set (`datumLabel`), bij openen gekozen: de set die vandaag geldt.
- Per veld uit `TARIEF_VELDEN` een tekstveld (`inputMode="decimal"`) met dat label, gevuld met `toonBedrag`, gegroepeerd onder de kopjes (h3) `Stroom`, `Gas` en `Btw`. Bij Stroom ook een aankruisvak met label `Salderen (teruglevering telt even zwaar als afname)`.
- Knop `Tarieven opslaan`: leest elk veld met `leesBedrag`. Is er een `null`: melding (`role="alert"`) `Vul bij elk veld een bedrag in, bijvoorbeeld 0,09161.` en geen verzoek. Anders `POST /api/beheer` met `{ soort: 'tarief', tarief: { vanaf, salderen, ...velden } }`. Gelukt: `Opgeslagen.` (`role="status"`). Mislukt: de melding van de server of `Opslaan is niet gelukt. Probeer het opnieuw.` De knoppen zijn uit zolang een verzoek loopt.
- Wisselen van set in de keuzelijst laadt de waarden van die set en haalt meldingen weg.
- Datumveld met label `Nieuwe ingangsdatum` en knop `Toevoegen`: zonder datum gebeurt er niets; bestaat de datum al: melding `Voor die datum bestaat al een set tarieven.`; anders een POST `soort: 'tarief'` met de waarden die nu in het formulier staan en de nieuwe `vanaf`; daarna is de nieuwe set gekozen.
- Knop `Verwijder deze set`, alleen bij meer dan een set. Eerste klik toont `Weet je het zeker?` met `Ja, verwijder` en `Annuleer`. `Ja, verwijder` stuurt `{ soort: 'tariefWeg', vanaf }`; daarna is de set gekozen die vandaag geldt.
- Onderaan, gedempt: `Uurprijzen: Bundesnetzagentur | SMARD.de via energy-charts.info (CC BY 4.0).` en `De tarieven voor 2027 zijn het voorstel uit het Belastingplan. Controleer ze in januari.`

Stijl: sluit aan op de bestaande secties van Beheer; label boven het veld, velden over de volle breedte op een telefoon (375 px), geen horizontaal schuiven, leesbaar in de lichte en de donkere weergave.

- [ ] **Step 1: Schrijf de falende tests.**
  - `tests/tarieven-client.test.js`: de voorbeelden bij `leesBedrag` (ook `'1.234,5'` -> `null`, `'-1'` -> `null`, `''` -> `null`, `'0'` -> `0`), `toonBedrag` (ook `0.123456789` -> `'0,12346'`), `datumLabel`, `geldendeVanaf` (2026-11-15 -> `'2026-01-01'`; 2027-01-01 -> `'2027-01-01'`; 2025-06-01 -> `'2026-01-01'`; leeg -> `null`).
  - `tests/beheer-tarieven.test.jsx`: de set van vandaag is gekozen en de velden tonen de waarden met een komma; opslaan stuurt het juiste lichaam (waarden als getallen, `salderen` als boolean) en toont `Opgeslagen.`; een leeg veld of `abc` geeft de melding en geen verzoek; een punt als decimaalteken werkt; wisselen van set toont de andere waarden (bijvoorbeeld `0,08802`); toevoegen met een nieuwe datum stuurt de huidige waarden met die datum en kiest hem daarna; toevoegen met een bestaande datum geeft de melding en geen verzoek; verwijderen vraagt eerst om bevestiging, `Annuleer` stuurt niets, `Ja, verwijder` stuurt `tariefWeg`; met een enkele set is er geen verwijderknop; een fout van de server toont de melding; lege `tarieven` toont `De tarieven konden niet geladen worden.`; `onTarieven` krijgt de lijst uit het antwoord.
  - `tests/beheer.test.jsx`: het scherm toont de sectie `Energietarieven` met de tarieven uit het antwoord van `GET /api/beheer`; een antwoord zonder `tarieven` (oude server) breekt het scherm niet.

- [ ] **Step 2: Draai de drie testbestanden.** Verwacht: FAIL op de nieuwe tests.
- [ ] **Step 3: Schrijf de code.**
- [ ] **Step 4: Draai tot PASS, daarna alles (exitcode 0) en een proefbouw zoals in taak 5.**
- [ ] **Step 5: Commit**

```bash
git add src/lib/tarieven.js src/components/BeheerTarieven.jsx src/components/Beheer.jsx src/index.css tests/tarieven-client.test.js tests/beheer-tarieven.test.jsx tests/beheer.test.jsx
git commit -m "Beheer: energietarieven bekijken, aanpassen, toevoegen en verwijderen"
```
