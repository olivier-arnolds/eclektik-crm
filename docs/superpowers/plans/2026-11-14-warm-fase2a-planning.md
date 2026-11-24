# Warm fase 2a: timer, starttijd en wachtpost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A room can be switched on for a chosen number of hours and then switches off by itself, and a room can be planned to switch on at a time within the next 24 hours, optionally with an automatic off.

**Architecture:** Planned actions live in a new table `geplande_acties`. A Vercel cron (`/api/cron/wachtpost`, every 5 minutes) reads the on/off state of all rooms in one Tuya request, executes due actions and records per room whether it is on and since when. The browser plans and cancels through one new endpoint per room; the room list shows what is planned.

**Tech Stack:** existing repo `~/Desktop/warm-app`: React 19 + Vite, Vercel Node functions (ESM, Node 24), Supabase Postgres through `SUPABASE_SERVICE_KEY`, Vitest 5, own Tuya client (fetch + HMAC). No new dependencies.

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md` (sections 2.3, 2.4, 6 and 9; section 9 wins where they differ).

## Global Constraints

- Work in `/Users/olivierarnolds/Desktop/warm-app`, branch `main`. Do not push; the controller pushes after all tasks.
- All user-facing text is Dutch. No em-dash character (U+2014) anywhere: not in UI text, comments, tests or commit messages.
- Commit message: a short descriptive Dutch subject, a blank line, then `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Never read, print or commit `.env`. Never call the real Tuya API or the real database from tests; `fetch`, `api/_lib/tuya.js` and `api/_lib/opslag.js` are mocked the way the existing tests do it. Never send a real on/off command to a thermostat. Never send the Tuya codes `factory_reset` or `Reset`.
- Vitest 5 without globals: import `describe, it, expect, vi` explicitly. Component tests start with `// @vitest-environment jsdom` and call `cleanup()` in `afterEach`. `npx vitest run` must stay green with pristine output (no warnings).
- Every API response sets `Cache-Control: no-store` (`geenCache(res)`). A database failure is a 500 with `FOUT_STORING`, never a 401 or 403. State-changing methods check `zelfdeHerkomst(req)` and answer 403 otherwise.
- All database access goes through `api/_lib/opslag.js`; every function there throws on a database error. Handlers never import `supabaseAdmin` directly.
- All clock times a person types or reads are Europe/Amsterdam, including summer and winter time. The database and the API carry ISO timestamps in UTC.
- Timer and plan durations are whole minutes from 15 up to and including 720. The UI offers exactly 60, 120, 180, 240, 360 and 480 minutes, labelled `1 uur`, `2 uur`, `3 uur`, `4 uur`, `6 uur`, `8 uur`.
- TDD: write each test first, see it fail, then implement.

## Review Focus

- The cron runs late or skips rounds: an overdue `uit` is still executed; an `aan` that is more than 60 minutes overdue is marked `mislukt` and never executed (Task 3 test "te laat aanzetten").
- Tuya fails while executing an action: `uit` stays `gepland` and is retried every round without limit; `aan` gets at most 3 attempts, then `mislukt` (Task 3 tests).
- Two people plan for the same room at the same moment: the database function replaces instead of duplicating, the last one wins (Task 1 SQL: partial unique index plus `plan_actie`).
- A start time typed around a clock change, or a time that has already passed today: `volgendeMoment` returns the right instant (Task 1 tests).
- Someone switches a room off by hand while a timer runs: the pending `uit` is cancelled, a pending `aan` stays (Task 2 tests).

---

## Task 1: Database, time helper and storage functions

**Files:**
- Create: `supabase/migrations/0003_planning.sql`
- Create: `api/_lib/tijd.js`
- Modify: `api/_lib/opslag.js`
- Test: `tests/tijd.test.js`

**Interfaces:**
- Produces (`api/_lib/tijd.js`): `volgendeMoment(hhmm: string, nu?: Date): Date | null` and `DUUR_MIN = 15`, `DUUR_MAX = 720`, `geldigeDuur(waarde: unknown): boolean` (true only for an integer from 15 up to and including 720).
- Produces (`api/_lib/opslag.js`), all async and throwing on a database error:
  - `leesKamers()` now selects `id, naam, tuya_device_id, staat_aan, aan_sinds`.
  - `vindKamer(id)` now selects `id, naam, tuya_device_id, staat_aan, aan_sinds`.
  - `leesGeplandeActies(): Promise<Array<{ id, kamer_id, soort, uitvoeren_op, duur_minuten, pogingen }>>`: rows with status `gepland`, ordered by `uitvoeren_op` ascending.
  - `planActie({ kamerId, soort, uitvoerenOp, duurMinuten, persoonId }): Promise<string>`: calls rpc `plan_actie` with `p_kamer, p_soort, p_op (ISO string), p_duur, p_door`; returns the new id. `soort` is `'aan'` or `'uit'`.
  - `annuleerActie(kamerId, soort): Promise<number>`: sets status `geannuleerd` and `afgehandeld_op` to now on `gepland` rows of that room and kind; returns how many rows changed.
  - `rondActieAf(id, status): Promise<boolean>`: `status` is `'uitgevoerd'` or `'mislukt'`; updates only where the row is still `gepland`, sets `afgehandeld_op`; returns whether a row changed.
  - `noteerActiePoging(id): Promise<number>`: rpc `verhoog_actie_pogingen`, returns the new count (`Number.MAX_SAFE_INTEGER` when the row is gone).
  - `zetKamerStand(kamerId, aan: boolean, nu?: Date): Promise<void>`: rpc `zet_kamer_stand` with `p_kamer, p_aan, p_nu (ISO string)`.

- [ ] **Step 1: Write `supabase/migrations/0003_planning.sql` with exactly this content**

```sql
-- Fase 2a: geplande acties (timer en starttijd) en de laatst bekende stand per kamer.

alter table public.rooms
  add column staat_aan boolean,
  add column aan_sinds timestamptz,
  add column stand_bijgewerkt timestamptz;

create table public.geplande_acties (
  id uuid primary key default gen_random_uuid(),
  kamer_id uuid not null references public.rooms(id) on delete cascade,
  soort text not null check (soort in ('aan', 'uit')),
  uitvoeren_op timestamptz not null,
  -- Alleen bij soort 'aan': na het aanzetten vanzelf weer uit na zoveel minuten.
  duur_minuten int check (duur_minuten between 15 and 720),
  aangemaakt_door uuid references public.personen(id) on delete set null,
  status text not null default 'gepland'
    check (status in ('gepland', 'uitgevoerd', 'mislukt', 'geannuleerd')),
  pogingen int not null default 0,
  created_at timestamptz not null default now(),
  afgehandeld_op timestamptz
);

-- Hooguit een openstaande actie per kamer en soort: een nieuwe vervangt de oude.
create unique index geplande_acties_open_idx
  on public.geplande_acties (kamer_id, soort) where status = 'gepland';
create index geplande_acties_status_op_idx
  on public.geplande_acties (status, uitvoeren_op);

alter table public.geplande_acties enable row level security;

-- Vervang de openstaande actie van dezelfde kamer en soort door een nieuwe.
create function public.plan_actie(
  p_kamer uuid, p_soort text, p_op timestamptz, p_duur int, p_door uuid
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  nieuw uuid;
begin
  -- Een slot per kamer en soort, zodat twee gelijktijdige aanvragen op elkaar wachten.
  perform pg_advisory_xact_lock(hashtext(p_kamer::text || ':' || p_soort));
  update public.geplande_acties
    set status = 'geannuleerd', afgehandeld_op = now()
    where kamer_id = p_kamer and soort = p_soort and status = 'gepland';
  insert into public.geplande_acties (kamer_id, soort, uitvoeren_op, duur_minuten, aangemaakt_door)
    values (p_kamer, p_soort, p_op, p_duur, p_door)
    returning id into nieuw;
  return nieuw;
end;
$$;

create function public.verhoog_actie_pogingen(p_actie uuid) returns int
language sql
set search_path = public
as $$
  update public.geplande_acties
  set pogingen = pogingen + 1
  where id = p_actie
  returning pogingen;
$$;

-- Leg de stand van een kamer vast. Aan-sinds verandert alleen bij de overgang
-- naar aan; staat de kamer al aan, dan blijft het oude tijdstip staan.
create function public.zet_kamer_stand(p_kamer uuid, p_aan boolean, p_nu timestamptz)
returns void
language sql
set search_path = public
as $$
  update public.rooms
  set aan_sinds = case
        when p_aan and staat_aan is true and aan_sinds is not null then aan_sinds
        when p_aan then p_nu
        else null
      end,
      staat_aan = p_aan,
      stand_bijgewerkt = p_nu
  where id = p_kamer;
$$;

revoke all on function public.plan_actie(uuid, text, timestamptz, int, uuid) from public, anon, authenticated;
revoke all on function public.verhoog_actie_pogingen(uuid) from public, anon, authenticated;
revoke all on function public.zet_kamer_stand(uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_actie(uuid, text, timestamptz, int, uuid) to service_role;
grant execute on function public.verhoog_actie_pogingen(uuid) to service_role;
grant execute on function public.zet_kamer_stand(uuid, boolean, timestamptz) to service_role;
```

The controller applies this migration to the real database; the implementer only writes the file.

- [ ] **Step 2: Write the failing tests in `tests/tijd.test.js`**

`volgendeMoment` returns the first instant strictly after `nu` at which a clock in Europe/Amsterdam shows `hhmm`:

```js
const iso = (d) => d.toISOString()
// winter (UTC+1): 11:00 in Amsterdam
expect(iso(volgendeMoment('16:00', new Date('2026-11-14T10:00:00Z')))).toBe('2026-11-14T15:00:00.000Z')
// already passed today: tomorrow
expect(iso(volgendeMoment('09:30', new Date('2026-11-14T10:00:00Z')))).toBe('2026-11-15T08:30:00.000Z')
// exactly now counts as passed
expect(iso(volgendeMoment('11:00', new Date('2026-11-14T10:00:00Z')))).toBe('2026-11-15T10:00:00.000Z')
// summer (UTC+2): 12:00 in Amsterdam
expect(iso(volgendeMoment('16:00', new Date('2026-07-01T10:00:00Z')))).toBe('2026-07-01T14:00:00.000Z')
// night the clock goes back (25 Oct 2026): 02:30 happens twice, take the first
expect(iso(volgendeMoment('02:30', new Date('2026-10-24T21:00:00Z')))).toBe('2026-10-25T00:30:00.000Z')
// night the clock goes forward (28 Mar 2027): 02:30 does not exist, take 03:30 summer time
expect(iso(volgendeMoment('02:30', new Date('2027-03-27T22:00:00Z')))).toBe('2027-03-28T01:30:00.000Z')
// one-digit hour is accepted
expect(iso(volgendeMoment('7:05', new Date('2026-11-14T10:00:00Z')))).toBe('2026-11-15T06:05:00.000Z')
// invalid input
for (const fout of ['24:00', '12:60', 'abc', '', null, undefined, 1200, '12:5']) {
  expect(volgendeMoment(fout, new Date('2026-11-14T10:00:00Z'))).toBeNull()
}
```

`geldigeDuur`: true for `15`, `60`, `720`; false for `14`, `721`, `60.5`, `'60'`, `null`, `undefined`, `NaN`.

- [ ] **Step 3: Run `npx vitest run tests/tijd.test.js` and see it fail** (module not found).

- [ ] **Step 4: Implement `api/_lib/tijd.js`**

Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Amsterdam'` to find the UTC offset; no date library. A workable approach: for the Amsterdam calendar day of `nu` and the two days after it, compute `Date.UTC(y, m, d, hh, mm)` minus the Amsterdam offset that applies at that guess, re-check the offset at the result (the two can differ across a clock change), and return the earliest candidate that is strictly after `nu`.

- [ ] **Step 5: Add the storage functions to `api/_lib/opslag.js`** per the Interfaces block, in the style of the existing functions (`check(r, '...')`). `opslag.js` has no unit tests (it is mocked everywhere); keep each function a single query or rpc.

- [ ] **Step 6: Run `npx vitest run`**: everything passes, output pristine.

- [ ] **Step 7: Commit** `supabase/migrations/0003_planning.sql`, `api/_lib/tijd.js`, `api/_lib/opslag.js`, `tests/tijd.test.js`.

---

## Task 2: API for planning, cancelling and showing what is planned

**Files:**
- Create: `api/rooms/[id]/plan.js`
- Modify: `api/rooms/[id]/power.js`, `api/rooms/index.js`
- Test: `tests/plan-api.test.js` (new), `tests/rooms-api.test.js` (extend; extend its `opslag` mock with the new functions)

**Interfaces:**
- Consumes: from Task 1 `volgendeMoment`, `geldigeDuur`, `leesGeplandeActies`, `planActie`, `annuleerActie`, `zetKamerStand`, `vindKamer`, `leesKamers`; existing `requireUser`, `geenCache`, `FOUT_STORING`, `zelfdeHerkomst`, `setPower`.
- Produces:
  - `POST /api/rooms/{id}/plan` with JSON body, one of:
    - `{ "soort": "timer", "duurMinuten": 180 }`: switches the room on now (`setPower(device, true)`), then `zetKamerStand(id, true)`, then plans `uit` at now + duration. Answer `200 { ok: true, timer: { uitOm: ISO } }`. Tuya failure: `502 { ok: false, error: 'De verwarming reageert niet. Probeer het opnieuw.' }` and nothing is planned.
    - `{ "soort": "start", "tijd": "16:00", "duurMinuten": 180 | null }` (`duurMinuten` may be absent): plans `aan` at `volgendeMoment(tijd)` with that duration. Sends no Tuya command. Answer `200 { ok: true, start: { aanOm: ISO, duurMinuten: number | null } }`.
  - `DELETE /api/rooms/{id}/plan?soort=timer` cancels the pending `uit`; `?soort=start` cancels the pending `aan`. Answer `200 { ok: true }` also when nothing was pending.
  - Errors on both methods: 401 from `requireUser`; 403 when `zelfdeHerkomst` fails; 400 `{ ok: false, error }` for an unknown `soort` (`'Onbekende keuze.'`), an invalid duration (`'Kies een duur tussen een kwartier en 12 uur.'`), an invalid time (`'Vul een tijd in, bijvoorbeeld 16:00.'`); 404 `{ ok: false, error: 'Kamer niet gevonden' }`; 405 for other methods; 500 `{ ok: false, error: FOUT_STORING }` on a database error.
  - `POST /api/rooms/{id}/power` keeps its contract and adds, after a successful `setPower`: `zetKamerStand(id, on)`, and when `on === false` also `annuleerActie(id, 'uit')`. A failure in these follow-up writes is logged with `console.error` and does not change the 200 answer (the heating did switch).
  - `GET /api/rooms`: every room object gains `aanSinds: ISO | null` (the stored `aan_sinds`, only when the live state is `on === true`, else `null`), `timer: { uitOm: ISO } | null` and `start: { aanOm: ISO, duurMinuten: number | null } | null`, taken from `leesGeplandeActies()`. If `leesGeplandeActies` throws, the answer is 500 with `FOUT_STORING`.

- [ ] **Step 1: Write the failing tests**

`tests/plan-api.test.js`, same harness style as `tests/rooms-api.test.js` (fake req/res, mocked `tuya.js` and `opslag.js`, the real guard, `vi.useFakeTimers()` with `vi.setSystemTime(new Date('2026-11-14T10:00:00Z'))` where a time matters):
  - timer 180: `setPower('dev1', true)` called once, `planActie` called with `{ kamerId: 'r1', soort: 'uit', duurMinuten: null, persoonId: 'p5' }` and `uitvoerenOp` equal to `2026-11-14T13:00:00.000Z`; body `{ ok: true, timer: { uitOm: '2026-11-14T13:00:00.000Z' } }`.
  - timer while Tuya throws: 502, `planActie` not called.
  - timer with `duurMinuten` 10, 721, `'60'` or missing: 400, `setPower` not called.
  - start `'16:00'` with 120: `setPower` not called, `planActie` called with `soort: 'aan'`, `duurMinuten: 120`, `uitvoerenOp` `2026-11-14T15:00:00.000Z`; body `{ ok: true, start: { aanOm: '2026-11-14T15:00:00.000Z', duurMinuten: 120 } }`.
  - start without `duurMinuten`: planned with `duurMinuten: null`.
  - start with tijd `'25:00'`: 400. Start with `duurMinuten: 5`: 400.
  - unknown soort: 400. Unknown room (`vindKamer` gives null): 404.
  - DELETE `soort=timer` calls `annuleerActie('r1', 'uit')`; `soort=start` calls `annuleerActie('r1', 'aan')`; other soort 400.
  - no cookie: 401; wrong Origin: 403; GET: 405; `planActie` throws: 500 with `FOUT_STORING`.
  - every answer has `cache-control: no-store`.

`tests/rooms-api.test.js` additions:
  - power off succeeds: `zetKamerStand('r1', false)` and `annuleerActie('r1', 'uit')` are called.
  - power on succeeds: `zetKamerStand('r1', true)` is called and `annuleerActie` is not.
  - `zetKamerStand` throws after a successful switch: still 200 `{ ok: true, on }`.
  - `setPower` throws: neither follow-up function is called.
  - list: with `leesGeplandeActies` returning one `uit` for r1 (`2026-11-14T13:00:00+00:00`) and one `aan` for r2 (`duur_minuten: 120`), r1 has `timer: { uitOm: '2026-11-14T13:00:00.000Z' }` and `start: null`, r2 has `start: { aanOm: ..., duurMinuten: 120 }` and `timer: null`.
  - list: `aanSinds` is the stored value (as ISO string ending in `Z`) for a room that is live on, and `null` for a room that is live off or unknown even if the database still has a value.
  - list: `leesGeplandeActies` throws: 500 with `FOUT_STORING`.

- [ ] **Step 2: Run the two test files and see the new tests fail.**

- [ ] **Step 3: Implement** `api/rooms/[id]/plan.js`, then the changes in `power.js` and `index.js`. Normalise database timestamps with `new Date(x).toISOString()` before sending them out.

- [ ] **Step 4: Run `npx vitest run`**: all green, pristine.

- [ ] **Step 5: Commit.**

---

## Task 3: The wachtpost (cron every 5 minutes)

**Files:**
- Create: `api/_lib/cron.js`, `api/cron/wachtpost.js`
- Modify: `api/_lib/tuya.js` (add `getPowerStates`), `api/cron/wakker.js` (use `api/_lib/cron.js`), `vercel.json`
- Test: `tests/wachtpost.test.js` (new), `tests/tuya.test.js` (extend), `tests/cron-wakker.test.js` (must stay green unchanged)

**Interfaces:**
- Consumes: from Task 1 `leesKamers`, `leesGeplandeActies`, `planActie`, `rondActieAf`, `noteerActiePoging`, `zetKamerStand`; existing `setPower`, `tuyaRequest`.
- Produces:
  - `api/_lib/cron.js`: `cronGeheimKlopt(req): boolean`, the function now private in `wakker.js`, moved unchanged; `wakker.js` imports it.
  - `api/_lib/tuya.js`: `getPowerStates(deviceIds: string[]): Promise<Map<string, boolean>>`. One request: `GET /v1.0/iot-03/devices/status?device_ids=<ids joined by a comma>`. The result is an array of `{ id, status: [{ code, value }] }`; the on/off value is the entry whose code is `process.env.TUYA_POWER_COMMAND_CODE || 'switch'`. A device that is missing from the answer, or whose value is not a boolean, is left out of the map. An empty `deviceIds` returns an empty map without a request.
  - `GET /api/cron/wachtpost`, protected by `cronGeheimKlopt` (401 `{ ok: false }` otherwise). Answer `200 { ok: true, uitgevoerd: n, mislukt: n, wachtend: n }` where `wachtend` counts actions that stay `gepland` after a failed attempt. A database error while reading rooms or actions: 500 `{ ok: false }`.
  - `vercel.json` crons gains `{ "path": "/api/cron/wachtpost", "schedule": "*/5 * * * *" }`; the existing `wakker` entry stays.

**Behaviour of one round** (`nu` is taken once at the start):
1. Read rooms and the `gepland` actions. Read the states with one `getPowerStates` call; if that call throws, log it and continue with an empty map (planned actions must still run).
2. Due actions are those with `uitvoeren_op <= nu`. Group them per room; within a room handle them in order of `uitvoeren_op`; rooms run in parallel (`Promise.all`).
3. For a due `aan`: if it is more than 60 minutes overdue, `rondActieAf(id, 'mislukt')` and do not send a command. Otherwise `setPower(device, true)`. On success: `rondActieAf(id, 'uitgevoerd')`; if `duur_minuten` is set, `planActie({ kamerId, soort: 'uit', uitvoerenOp: nu + duur, duurMinuten: null, persoonId: null })`; the room counts as on for step 5. On failure: `noteerActiePoging(id)`; when the returned count is 3 or more, `rondActieAf(id, 'mislukt')`, else it stays `gepland`.
4. For a due `uit`: `setPower(device, false)`, however late. On success: `rondActieAf(id, 'uitgevoerd')`; the room counts as off for step 5. On failure: `noteerActiePoging(id)` and it stays `gepland`, without a limit.
5. For every room whose state is known (from step 1, overridden by a successful command in steps 3 and 4): `zetKamerStand(kamerId, state, nu)`. Rooms with an unknown state are left alone. A failure for one room is logged and does not stop the others.
6. An error inside one action (Tuya or database) never stops the other rooms; it is logged with `console.error`.

- [ ] **Step 1: Write the failing tests**

`tests/tuya.test.js`: `getPowerStates(['a','b','c'])` requests the path `/v1.0/iot-03/devices/status?device_ids=a,b,c` once and maps `a → true`, `b → false` when the answer holds `switch` true for a, false for b, and for c only other codes (c is absent from the map); `getPowerStates([])` makes no request and returns an empty map.

`tests/wachtpost.test.js` (mock `tuya.js` and `opslag.js`; fixed time `2026-11-14T10:00:00Z`; rooms r1/dev1 and r2/dev2):
  - no or wrong secret: 401, nothing is read.
  - no actions: `getPowerStates(['dev1','dev2'])` called once; with dev1 true and dev2 false, `zetKamerStand('r1', true, nu)` and `zetKamerStand('r2', false, nu)`; body `{ ok: true, uitgevoerd: 0, mislukt: 0, wachtend: 0 }`.
  - due `uit` for r1: `setPower('dev1', false)`, `rondActieAf(id, 'uitgevoerd')`, and `zetKamerStand('r1', false, nu)` even though the status read said true.
  - due `aan` with `duur_minuten: 180` for r2: `setPower('dev2', true)`, `rondActieAf(id, 'uitgevoerd')`, `planActie` with `soort: 'uit'`, `kamerId: 'r2'`, `uitvoerenOp` `2026-11-14T13:00:00.000Z`, `persoonId: null`; `zetKamerStand('r2', true, nu)`.
  - due `aan` without duration: no `planActie`.
  - an action in the future: untouched, no `setPower`.
  - "te laat aanzetten": `aan` due 61 minutes ago: no `setPower`, `rondActieAf(id, 'mislukt')`, counted in `mislukt`. `aan` due 59 minutes ago: executed.
  - `uit` due 5 hours ago: still executed.
  - `setPower` throws for an `uit`: `noteerActiePoging` called, `rondActieAf` not called, `wachtend: 1`; also when `noteerActiePoging` returns 99.
  - `setPower` throws for an `aan`: with `noteerActiePoging` returning 2 it stays (`wachtend: 1`); returning 3 gives `rondActieAf(id, 'mislukt')` (`mislukt: 1`).
  - `getPowerStates` throws: due actions are still executed, and only rooms with a successful command get `zetKamerStand`.
  - a room missing from the status map and without a command: no `zetKamerStand` for it.
  - `setPower` throws for r1 while r2 has a due action: r2 is still executed.
  - `leesKamers` throws: 500 `{ ok: false }`.
  - two due actions for the same room (`aan` at 09:50, `uit` at 09:55): executed in that order, final `zetKamerStand('r1', false, nu)`.

- [ ] **Step 2: Run and see them fail.**

- [ ] **Step 3: Implement** `api/_lib/cron.js` (move), `getPowerStates`, `api/cron/wachtpost.js`, the `vercel.json` entry.

- [ ] **Step 4: Run `npx vitest run`**: all green, pristine.

- [ ] **Step 5: Commit.**

---

## Task 4: Planning in the room list, and a clearer switch

**Files:**
- Create: `src/components/PlanPaneel.jsx`, `src/lib/planning.js`
- Modify: `src/components/RoomCard.jsx`, `src/components/RoomList.jsx`, `src/index.css`
- Test: `tests/planning.test.js` (new), `tests/plan-paneel.test.jsx` (new), `tests/roomlist.test.jsx` (extend)

**Interfaces:**
- Consumes: the API from Task 2 (`timer`, `start`, `aanSinds` on each room; `POST` and `DELETE /api/rooms/{id}/plan`), existing `apiFetch`.
- Produces:
  - `src/lib/planning.js`: `DUUR_KEUZES = [60, 120, 180, 240, 360, 480]`; `duurLabel(minuten): string` (`60 → '1 uur'`, `480 → '8 uur'`); `tijdLabel(iso: string, nu?: Date): string` gives the Amsterdam clock time as `HH:MM`, prefixed with `morgen ` when that instant falls on the next Amsterdam calendar day (`tijdLabel('2026-11-14T15:00:00.000Z', new Date('2026-11-14T10:00:00Z')) === '16:00'`, `tijdLabel('2026-11-15T05:30:00.000Z', new Date('2026-11-14T22:30:00Z')) === 'morgen 06:30'`).
  - `PlanPaneel` props: `{ room, bezig: boolean, onTimer(minuten), onStart(tijd, minutenOfNull), onSluit() }`.
  - `RoomCard` gains props `onPlan(room, body)` and `onAnnuleer(room, soort)`; `RoomList` implements them.

**What the person sees** (exact Dutch copy):
- Under the state line of a room, when the API gives them:
  - `aanSinds` and the room is on: `Aan sinds 14:05`.
  - `timer`: `Gaat uit om 19:00` followed by a button `Annuleer` with `aria-label="Annuleer timer <kamernaam>"`.
  - `start` without duration: `Gaat aan om 16:00`; with duration: `Gaat aan om 16:00, 3 uur lang`; followed by a button `Annuleer` with `aria-label="Annuleer starttijd <kamernaam>"`.
- Every room with a known state has a button `Plannen` (`aria-expanded` reflects open or closed). It opens `PlanPaneel` inside the card:
  - Heading `Timer`, helper text `Aan voor een aantal uur, daarna vanzelf uit.`, six buttons `1 uur` to `8 uur`. Tapping one calls `onTimer(minuten)`.
  - Heading `Later aan`, a time field `<input type="time">` with label `Tijd`, a select with label `Daarna uit na` and options `Niet vanzelf uit` (value empty, the default) plus the six durations, and a button `Plan`. `Plan` calls `onStart(tijd, minutenOfNull)`; with an empty time field it shows `Vul een tijd in.` (role `alert`) and calls nothing.
  - A button `Sluiten`.
  - While `bezig` is true all buttons in the panel are disabled.
- `RoomList`: `onPlan` posts to `/api/rooms/{id}/plan` (same time-out and 401 handling as `schakel`); on success it closes the panel and reloads the list (`laad()`); on failure it shows the server's `error` text, or `Dat is niet gelukt. Probeer het opnieuw.`, in the card's existing alert line. `onAnnuleer` sends `DELETE /api/rooms/{id}/plan?soort=timer|start` and reloads; failure shows the same message. A room with a plan request in flight is `bezig` (its switch is disabled too).
- The switch: off shows a grey track (`#d8d2c8`) with a white knob; on shows an orange track (`#e8590c`) with a white knob on the right; the disabled state keeps its colour at 55% opacity. Do not use pale yellow or pastel text on white anywhere.

- [ ] **Step 1: Write the failing tests**
  - `tests/planning.test.js`: the `duurLabel` and `tijdLabel` examples above, plus `tijdLabel` for a summer date (`'2026-07-01T14:00:00.000Z'` with `nu` `2026-07-01T10:00:00Z` gives `'16:00'`).
  - `tests/plan-paneel.test.jsx`: tapping `3 uur` calls `onTimer(180)`; filling time `16:00` and choosing `2 uur` then `Plan` calls `onStart('16:00', 120)`; time `06:30` with `Niet vanzelf uit` calls `onStart('06:30', null)`; `Plan` with an empty time shows `Vul een tijd in.` and calls nothing; with `bezig` all buttons are disabled; `Sluiten` calls `onSluit`.
  - `tests/roomlist.test.jsx`: a room with `timer` shows `Gaat uit om` with the formatted time and an `Annuleer timer <naam>` button; tapping it sends `DELETE /api/rooms/<id>/plan?soort=timer` and reloads the list; a room with `start` and `duurMinuten: 180` shows `3 uur lang`; `Plannen` opens the panel, choosing `2 uur` posts `{ soort: 'timer', duurMinuten: 120 }` to `/api/rooms/<id>/plan`, the panel closes and the list reloads; a 502 with `{ ok: false, error: 'De verwarming reageert niet. Probeer het opnieuw.' }` shows that text; a 401 with `stap: 'persoon'` calls `onStap('persoon')`; a room with `aanSinds` that is on shows `Aan sinds`.

- [ ] **Step 2: Run and see them fail.**

- [ ] **Step 3: Implement** `src/lib/planning.js`, `PlanPaneel.jsx`, the `RoomCard` and `RoomList` changes and the CSS. Keep `RoomList.jsx` readable: put the shared request logic (time-out, JSON parsing, 401 handling) in one helper that `schakel`, `onPlan` and `onAnnuleer` use, without changing what the existing tests assert.

- [ ] **Step 4: Run `npx vitest run`** (all green, pristine) and `npx vite build --outDir "dist_v$(date +%s)"` (must print `built`), then `rm -rf dist_v*`.

- [ ] **Step 5: Commit.**

---

## Afronding (controller, na de taken)

1. Migratie `0003_planning.sql` toepassen op project `tzryfdmtnwssrezsxobi` (alleen toevoegingen; de draaiende versie merkt er niets van). Controleren: kolommen op `rooms`, tabel `geplande_acties` met RLS aan en zonder policies, de drie functies alleen voor `service_role`.
2. Schermen bekijken met de nep-API (`.superpowers/preview`), telefoonbreedte.
3. Pushen naar `main` (Vercel deployt), daarna controleren zonder iets te schakelen: `/api/cron/wachtpost` zonder sleutel 401, met sleutel 200 en `uitgevoerd: 0`; `rooms.stand_bijgewerkt` is gevuld.
4. Olivier test op zijn iPhone: timer van 1 uur zetten en annuleren, starttijd plannen en annuleren, en een echte korte proef (starttijd over 10 minuten).
