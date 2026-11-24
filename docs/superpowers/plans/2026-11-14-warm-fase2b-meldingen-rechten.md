# Warm fase 2b: meldingen, rechten per persoon en beheer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each family member gets push notifications about the rooms that concern them (still on at 9:00, on for a long time, a planned start that failed), sees only the rooms the administrator allows, and the administrator manages all of this in a protected settings screen.

**Architecture:** Rights live on `personen` (sees everything or only own rooms) and in a new table `kamer_bewoners`; every room endpoint filters on them. Push subscriptions are stored per device (`push_aanmeldingen`) and resolved to the person who is logged in on that device at send time. The existing 5-minute cron (`wachtpost`) gets a watchdog step that decides which notifications are due and a log table that prevents duplicates. A settings screen behind an administrator code edits rights, residents and the long-on threshold.

**Tech Stack:** existing repo `~/Desktop/warm-app`: React 19 + Vite, Vercel Node functions (ESM, Node 24), Supabase Postgres through `SUPABASE_SERVICE_KEY`, Vitest 5. One new dependency: `web-push` (VAPID signing and payload encryption).

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md` (sections 2.2, 2.5, 2.6, "Wie ziet en mag wat", 3, 6 and 9; section 9 wins where they differ).

## Global Constraints

- Work in `/Users/olivierarnolds/Desktop/warm-app`, branch `main`. Do not push; the controller pushes after all tasks.
- All user-facing text is Dutch. No em-dash character (U+2014) anywhere: not in UI text, notification text, comments, tests or commit messages.
- Commit message: a short descriptive Dutch subject, a blank line, then `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. `git add` only the files of your own task, by name.
- Never read, print or commit `.env`. Tests never call the real Tuya API, the real database or a real push service: `fetch`, `api/_lib/tuya.js`, `api/_lib/opslag.js` and `web-push` are mocked. Never send a real on/off command to a thermostat.
- Vitest 5 without globals: import `describe, it, expect, vi` explicitly. Component tests start with `// @vitest-environment jsdom` and call `cleanup()` in `afterEach`. `npx vitest run` stays green with pristine output (no warnings; expected `console.error` calls are silenced with a spy).
- Every API response sets `Cache-Control: no-store` (`geenCache(res)`). A database failure is a 500 with `FOUT_STORING`, never a 401 or 403. State-changing methods check `zelfdeHerkomst(req)` and answer 403 otherwise.
- All database access goes through `api/_lib/opslag.js`; every function there throws on a database error and is a single query or rpc. Handlers never import `supabaseAdmin` directly.
- All clock times and calendar days are Europe/Amsterdam, including summer and winter time.
- A person may never see, switch, plan or be notified about a room they are not allowed to see. The administrator (`rol === 'beheerder'`) always sees and may do everything.
- Sending a notification never throws into its caller and never stops the wachtpost from executing planned actions.
- Installing a package in this sandbox needs a clean cache directory: `npm install <pkg> --cache "$(mktemp -d)"`. After any install, check that every entry in `package-lock.json` under `packages` (except the root) has a `version`; a missing one breaks the Vercel build.
- TDD: write each test first, see it fail, then implement.

## Review Focus

- A restricted person calls `POST /api/rooms/{id}/power` or `/plan` with the id of a room they may not see: 404, and Tuya is never called (Task 1 tests).
- A push subscription that the push service reports as gone (404 or 410) is removed and the other devices still get the notification; a push failure never changes what the wachtpost answers or executes (Task 2 and Task 4 tests).
- A long-on notification outside 9:00 to 23:00, or for a room that went on yesterday, is never sent (Task 4 tests).
- The 9:00 check when the status read fails that round: not marked done, retried the next round within the hour; and two overlapping cron runs never send twice (Task 4 tests).
- A phone on which someone logs out or picks another person: notifications go to whoever is logged in on that device now, and to nobody after logout (Task 2 tests).
- A non-administrator, or an administrator on a device that has not entered the administrator code, calls a settings endpoint: 403 (Task 5 tests).

---

## Task 1: Database and rights on the room endpoints

**Files:**
- Create: `supabase/migrations/0004_meldingen_rechten.sql`, `api/_lib/rechten.js`
- Modify: `api/_lib/opslag.js`, `api/_lib/guard.js`, `api/rooms/index.js`, `api/rooms/[id]/power.js`, `api/rooms/[id]/plan.js`
- Test: `tests/rechten.test.js` (new), `tests/rooms-api.test.js`, `tests/plan-api.test.js`, `tests/guard.test.js` (extend)

**Interfaces:**
- Produces (`api/_lib/opslag.js`):
  - `vindToestel(tokenHash)` now selects `id, persoon_id, foute_pogingen, beheer, persoon:personen(id, naam, rol, ziet_alles)`.
  - `leesKamerIdsVanBewoner(persoonId): Promise<string[]>` (rows of `kamer_bewoners` for that person).
- Produces (`api/_lib/guard.js`): `requireUser` returns `{ persoonId, naam, rol, toestelId, zietAlles, beheer }` where `zietAlles` is `true` for a `beheerder` and otherwise `persoon.ziet_alles !== false`, and `beheer` is `toestel.beheer === true`.
- Produces (`api/_lib/rechten.js`): `zichtbareKamerIds(user): Promise<Set<string> | null>`: `null` means every room (when `user.zietAlles`), otherwise the set from `leesKamerIdsVanBewoner(user.persoonId)`.
- Produces (API):
  - `GET /api/rooms` returns only visible rooms.
  - `POST /api/rooms/{id}/power`, `POST` and `DELETE /api/rooms/{id}/plan`: a room outside the visible set answers `404 { ok: false, error: 'Kamer niet gevonden' }`, the same as an unknown id, before any Tuya or planning call.
  - A database error while reading the visible set: 500 with `FOUT_STORING`.

- [ ] **Step 1: Write `supabase/migrations/0004_meldingen_rechten.sql` with exactly this content** (the controller applies it; the implementer only writes the file)

```sql
-- Fase 2b: rechten per persoon, bewoners per kamer, push-aanmeldingen en het meldingenlogboek.

alter table public.personen
  add column ziet_alles boolean not null default true,
  add column meldingen_aan boolean not null default true,
  add column meldingen_alle_kamers boolean not null default false;

update public.personen set meldingen_alle_kamers = true where rol = 'beheerder';

-- Wie woont in welke kamer. Een kamer kan meerdere bewoners hebben.
create table public.kamer_bewoners (
  kamer_id uuid not null references public.rooms(id) on delete cascade,
  persoon_id uuid not null references public.personen(id) on delete cascade,
  primary key (kamer_id, persoon_id)
);
create index kamer_bewoners_persoon_idx on public.kamer_bewoners (persoon_id);

insert into public.kamer_bewoners (kamer_id, persoon_id)
select r.id, p.id
from public.rooms r
join public.personen p
  on r.naam = p.naam or (r.naam = 'SasOlle' and p.naam in ('Saskia', 'Olivier'))
on conflict do nothing;

-- Dit toestel heeft de beheerderscode ingevoerd.
alter table public.toestellen add column beheer boolean not null default false;

-- Een push-aanmelding hoort bij een toestel. Voor wie een melding is, volgt uit
-- wie er op dat moment op het toestel is ingelogd (toestellen.persoon_id).
create table public.push_aanmeldingen (
  id uuid primary key default gen_random_uuid(),
  toestel_id uuid not null unique references public.toestellen(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Voorkomt dubbele meldingen. sleutel: bij lang_aan '<kamer-id>:<aan_sinds als ISO>',
-- bij ochtend de Amsterdamse datum 'JJJJ-MM-DD', bij start_mislukt het id van de actie.
create table public.meldingen_logboek (
  id bigint generated always as identity primary key,
  soort text not null check (soort in ('lang_aan', 'ochtend', 'start_mislukt')),
  sleutel text not null,
  created_at timestamptz not null default now(),
  unique (soort, sleutel)
);

alter table public.kamer_bewoners enable row level security;
alter table public.push_aanmeldingen enable row level security;
alter table public.meldingen_logboek enable row level security;

insert into public.instellingen (sleutel, waarde) values ('lang_aan_minuten', '360')
on conflict (sleutel) do nothing;
```

- [ ] **Step 2: Write the failing tests**
  - `tests/rechten.test.js`: `zichtbareKamerIds({ zietAlles: true, persoonId: 'p1' })` is `null` and does not call `leesKamerIdsVanBewoner`; with `zietAlles: false` it returns a `Set` of the ids from `leesKamerIdsVanBewoner('p1')`; a throwing `leesKamerIdsVanBewoner` rejects.
  - `tests/guard.test.js`: `requireUser` returns `zietAlles: true` for a beheerder whose `ziet_alles` is false; `zietAlles: false` for a lid with `ziet_alles: false`; `zietAlles: true` for a lid whose `ziet_alles` is true or missing; `beheer` true only when `toestel.beheer === true`.
  - `tests/rooms-api.test.js`: a lid with `ziet_alles: false` and `leesKamerIdsVanBewoner` giving `['r2']` gets only r2 in the list; `POST power` on r1 gives 404 and `setPower` is not called; `POST power` on r2 works; a beheerder gets both rooms without `leesKamerIdsVanBewoner` being called; `leesKamerIdsVanBewoner` throwing gives 500 with `FOUT_STORING` on the list and on power.
  - `tests/plan-api.test.js`: the same lid gets 404 on `POST plan` (timer and start) and `DELETE plan` for r1, with `setPower`, `planActie` and `annuleerActie` not called; r2 works.

- [ ] **Step 3: Run the changed test files and see the new tests fail.**
- [ ] **Step 4: Implement** the opslag changes, `guard.js`, `rechten.js`, then the three room handlers.
- [ ] **Step 5: Run `npx vitest run`**: all green, pristine.
- [ ] **Step 6: Commit.**

---

## Task 2: Push on the server

**Files:**
- Create: `api/_lib/push.js`, `api/push/index.js`, `api/push/test.js`
- Modify: `api/_lib/opslag.js`, `package.json`, `package-lock.json`, `.env.example`
- Test: `tests/push-lib.test.js`, `tests/push-api.test.js` (new)

**Interfaces:**
- Consumes: `requireUser` (Task 1), existing `zelfdeHerkomst`, `geenCache`, `FOUT_STORING`.
- Produces (`api/_lib/opslag.js`):
  - `bewaarAanmelding({ toestelId, endpoint, p256dh, auth }): Promise<void>`: upsert on `toestel_id`.
  - `verwijderAanmeldingVanToestel(toestelId): Promise<void>`.
  - `heeftAanmelding(toestelId): Promise<boolean>`.
  - `leesAanmeldingenVoorPersonen(persoonIds: string[]): Promise<Array<{ id, endpoint, p256dh, auth }>>`: subscriptions of devices whose `toestellen.persoon_id` is in the list (an empty list returns `[]` without a query).
  - `leesAanmeldingVanToestel(toestelId): Promise<{ id, endpoint, p256dh, auth } | null>`.
  - `verwijderAanmelding(id): Promise<void>`.
- Produces (`api/_lib/push.js`):
  - `pushPubliekeSleutel(): string | null` (`process.env.VAPID_PUBLIC_KEY`).
  - `stuurNaarAanmeldingen(aanmeldingen, melding): Promise<{ verstuurd: number, verwijderd: number, mislukt: number }>` where `melding` is `{ titel: string, tekst: string }`. Payload is `JSON.stringify({ titel, tekst })`, sent with `webpush.sendNotification(subscription, payload, { TTL: 3600, timeout: 5000, vapidDetails: { subject, publicKey, privateKey } })`. Environment: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (default `https://warm-app-flax.vercel.app`). A rejection with `statusCode` 404 or 410 removes that subscription (`verwijderAanmelding`) and counts as `verwijderd`; any other rejection is logged and counts as `mislukt`. All subscriptions are sent in parallel. Missing VAPID keys: log once, send nothing, return all zeros. The function never rejects.
  - `stuurNaarPersonen(persoonIds: string[], melding): Promise<{ verstuurd, verwijderd, mislukt }>`: de-duplicates the ids, reads the subscriptions and calls `stuurNaarAanmeldingen`. Never rejects (a database error is logged and gives all zeros).
- Produces (API, all behind `requireUser`):
  - `GET /api/push` -> `200 { publicKey: string | null, aangemeld: boolean }`.
  - `POST /api/push` with `{ endpoint, keys: { p256dh, auth } }` -> stores it for this device, `200 { ok: true }`. `endpoint` must be a string starting with `https://` of at most 1000 characters; `p256dh` and `auth` non-empty strings of at most 200 characters; otherwise `400 { ok: false, error: 'Ongeldige aanmelding.' }`.
  - `DELETE /api/push` -> removes this device's subscription, `200 { ok: true }`.
  - `POST /api/push/test` -> sends `{ titel: 'Warm', tekst: 'Dit is een testmelding. Het werkt!' }` to this device only. No subscription: `400 { ok: false, error: 'Dit toestel heeft meldingen nog niet aan staan.' }`. Sent: `200 { ok: true }`. Not sent (`verstuurd === 0`): `502 { ok: false, error: 'De testmelding kon niet verstuurd worden.' }`.
  - 403 on a failed `zelfdeHerkomst` for POST and DELETE; 405 for other methods; 500 with `FOUT_STORING` on a database error.

- [ ] **Step 1: Install** `web-push` (see Global Constraints for the cache flag and the lockfile check) and add the three `VAPID_*` names without values to `.env.example`.
- [ ] **Step 2: Write the failing tests**
  - `tests/push-lib.test.js` (mock `web-push` and `opslag.js`; set the env vars in the test): two subscriptions, both resolve: `{ verstuurd: 2, verwijderd: 0, mislukt: 0 }` and each call got the JSON payload and `TTL: 3600`; one rejects with `{ statusCode: 410 }`: `verwijderAanmelding` called with its id, result `{ verstuurd: 1, verwijderd: 1, mislukt: 0 }`; one rejects with `{ statusCode: 500 }`: not removed, `mislukt: 1`; the subscription passed to `web-push` has the shape `{ endpoint, keys: { p256dh, auth } }`; without `VAPID_PRIVATE_KEY`: nothing sent, all zeros; `stuurNaarPersonen(['p1','p1','p2'], m)` calls `leesAanmeldingenVoorPersonen(['p1','p2'])`; `stuurNaarPersonen` with a throwing `leesAanmeldingenVoorPersonen` resolves to all zeros; `stuurNaarPersonen([], m)` sends nothing.
  - `tests/push-api.test.js`: GET gives the public key and `aangemeld` from `heeftAanmelding('t1')`; POST stores `{ toestelId: 't1', endpoint, p256dh, auth }`; POST with `http://` endpoint, missing keys, or a 1001 character endpoint gives 400 and stores nothing; DELETE calls `verwijderAanmeldingVanToestel('t1')`; test endpoint: no subscription 400, sent 200, zero sent 502; no cookie 401; wrong Origin 403 on POST, DELETE and test; `bewaarAanmelding` throwing gives 500; every answer has `cache-control: no-store`.
- [ ] **Step 3: Run and see them fail.**
- [ ] **Step 4: Implement** the opslag functions, `api/_lib/push.js`, the two handlers.
- [ ] **Step 5: Run `npx vitest run`**: all green, pristine. Run `npx vite build --outDir "dist_v$(date +%s)"` (must print `built`), then `rm -rf dist_v*`.
- [ ] **Step 6: Commit.**

---

## Task 3: Push on the phone

**Files:**
- Create: `src/lib/push.js`, `src/components/Meldingen.jsx`
- Modify: `public/sw.js`, `src/components/RoomList.jsx`, `src/index.css`
- Test: `tests/push-client.test.js`, `tests/meldingen.test.jsx` (new), `tests/sw.test.js` (new), `tests/roomlist.test.jsx` (extend)

**Interfaces:**
- Consumes: `GET`, `POST`, `DELETE /api/push` and `POST /api/push/test` from Task 2; existing `apiFetch`.
- Produces (`src/lib/push.js`):
  - `pushOndersteund(): boolean`: true only when `'serviceWorker' in navigator`, `'PushManager' in window` and `'Notification' in window`.
  - `sleutelNaarBytes(base64url: string): Uint8Array` (the VAPID public key for `applicationServerKey`).
  - `async meldingenStand(): Promise<'niet-ondersteund' | 'geblokkeerd' | 'uit' | 'aan'>`: `geblokkeerd` when `Notification.permission === 'denied'`; `aan` when permission is `granted`, the service worker registration has a push subscription and `GET /api/push` says `aangemeld: true`; otherwise `uit`.
  - `async zetMeldingenAan(): Promise<{ ok: true } | { ok: false, reden: 'geweigerd' | 'geen-sleutel' | 'fout' }>`: asks permission (must be called from a tap), reads the public key from `GET /api/push`, subscribes with `{ userVisibleOnly: true, applicationServerKey }`, posts `subscription.toJSON()` to `POST /api/push`.
  - `async zetMeldingenUit(): Promise<boolean>`: unsubscribes locally and calls `DELETE /api/push`.
  - `async stuurTestmelding(): Promise<{ ok: boolean, error?: string }>`.
- Produces (`public/sw.js`): keeps the existing install and activate handlers and the no-cache rule, and adds:
  - `push`: parses the JSON payload `{ titel, tekst }` (a payload that is missing or not JSON falls back to titel `Warm` and tekst `Er is een melding.`) and shows `self.registration.showNotification(titel, { body: tekst, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'warm' })` inside `event.waitUntil`.
  - `notificationclick`: closes the notification and focuses an open window of the app if there is one, otherwise opens `/`.
- Produces (`Meldingen` component, no props), shown in `RoomList` between the toolbar and the room list:
  - `niet-ondersteund`: text `Zet Warm op je beginscherm om meldingen te kunnen krijgen.`
  - `geblokkeerd`: text `Meldingen zijn geblokkeerd. Zet ze aan in de instellingen van je telefoon.`
  - `uit`: button `Meldingen aanzetten`. After a tap: success switches to `aan`; `geweigerd` shows `Je hebt geen toestemming gegeven.`; other failures show `Meldingen aanzetten is niet gelukt. Probeer het opnieuw.` (role `alert`).
  - `aan`: text `Meldingen staan aan.` with two buttons: `Testmelding` (success shows `Testmelding verstuurd.`; failure shows the server's `error` text or `De testmelding kon niet verstuurd worden.`) and `Uitzetten` (back to `uit`).
  - While the stand is being determined the component renders nothing.
- `RoomList` shows `Er zijn geen kamers voor jou ingesteld.` when the list loaded successfully and is empty (and hides the `Alles uit` button in that case).

- [ ] **Step 1: Write the failing tests**
  - `tests/push-client.test.js` (jsdom; stub `navigator.serviceWorker`, `window.PushManager`, `window.Notification` and `fetch`): `sleutelNaarBytes('AQAB')` equals `Uint8Array [1, 0, 1]` and handles `-` and `_` and missing padding; `pushOndersteund` false when `PushManager` is missing; `meldingenStand` for each of the four outcomes; `zetMeldingenAan` posts the subscription JSON and returns `{ ok: true }`; permission `denied` gives `{ ok: false, reden: 'geweigerd' }` and does not subscribe; `publicKey: null` gives `geen-sleutel`; a failing POST gives `fout`; `zetMeldingenUit` calls `unsubscribe()` and sends DELETE.
  - `tests/sw.test.js` (node; load `public/sw.js` with `vm` or `new Function` into a fake `self` that records `addEventListener` calls, `registration.showNotification` and `clients`): a push with JSON `{ titel: 'Warm', tekst: 'Britt staat nog aan.' }` shows that title and body with `tag: 'warm'`; a push without data shows the fallback text; `notificationclick` closes the notification, focuses an existing client when there is one and otherwise calls `clients.openWindow('/')`; the file still registers no `fetch` handler.
  - `tests/meldingen.test.jsx` (mock `../src/lib/push.js`): each of the four stands renders its text or button; tapping `Meldingen aanzetten` with success shows `Meldingen staan aan.`; with `geweigerd` shows that text; `Testmelding` success and failure texts; `Uitzetten` returns to the button.
  - `tests/roomlist.test.jsx`: an empty list shows `Er zijn geen kamers voor jou ingesteld.` and no `Alles uit` button. Existing tests must keep passing; mock `../src/lib/push.js` (or the `Meldingen` component) in this file so they do not depend on push.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** Buttons at least 44px high; readable text colours (no pale text on the light background).
- [ ] **Step 4: Run `npx vitest run`** (all green, pristine) and the build check (`npx vite build --outDir "dist_v$(date +%s)"` prints `built`; `rm -rf dist_v*`).
- [ ] **Step 5: Commit.**

---

## Task 4: The watchdog (which notifications are due)

**Files:**
- Create: `api/_lib/wachthond.js`
- Modify: `api/_lib/tijd.js`, `api/_lib/opslag.js`, `api/cron/wachtpost.js`
- Test: `tests/wachthond.test.js` (new), `tests/tijd.test.js`, `tests/wachtpost.test.js` (extend)

**Interfaces:**
- Consumes: `stuurNaarPersonen(persoonIds, { titel, tekst })` from Task 2 (never rejects); `leesKamers()` (returns `id, naam, tuya_device_id, staat_aan, aan_sinds`); the wachtpost of fase 2a.
- Produces (`api/_lib/tijd.js`): `amsterdamDelen(datum: Date): { datum: string, uur: number, minuut: number }` with `datum` as `JJJJ-MM-DD` on the Amsterdam calendar (`amsterdamDelen(new Date('2026-11-14T08:05:00Z'))` is `{ datum: '2026-11-14', uur: 9, minuut: 5 }`; `new Date('2026-07-01T22:30:00Z')` is `{ datum: '2026-07-02', uur: 0, minuut: 30 }`).
- Produces (`api/_lib/opslag.js`):
  - `leesOntvangers(): Promise<{ personen: Array<{ id, meldingen_aan, meldingen_alle_kamers }>, bewoners: Array<{ kamer_id, persoon_id }> }>` (two selects is acceptable here; this is the one exception to "single query").
  - `noteerMelding(soort, sleutel): Promise<boolean>`: inserts into `meldingen_logboek`; returns `true` when the row is new and `false` when it already existed (unique violation, Postgres code `23505`); any other error throws.
  - `leesLangAanMinuten(): Promise<number>`: `instellingen` key `lang_aan_minuten`, default `360` when missing or not a number.
  - `leesGeplandeActies()` additionally selects `aangemaakt_door`.
- Produces (`api/_lib/wachthond.js`):
  - `ontvangersVoorKamer(kamerId, ontvangers): string[]`: residents of that room plus everyone with `meldingen_alle_kamers`, without duplicates, minus everyone whose `meldingen_aan` is false.
  - `langAanKandidaten(kamers, nu, drempelMinuten): Array<kamer>`: rooms with `staat_aan === true` and an `aan_sinds`, where all hold: the Amsterdam hour of `nu` is 9 up to and including 22; `aan_sinds` falls on the same Amsterdam calendar day as `nu`; `nu - aan_sinds >= drempelMinuten` minutes.
  - `urenTekst(minuten): string`: `360 -> '6 uur'`, `90 -> '1,5 uur'`, `60 -> '1 uur'`.
  - `opsomming(namen: string[]): string`: `['Britt'] -> 'Britt'`, `['Britt','Nine'] -> 'Britt en Nine'`, `['Anouk','Britt','Nine'] -> 'Anouk, Britt en Nine'`.
  - `async draaiWachthond({ kamers, nu, statusGelezen, misluktAan }): Promise<{ langAan: number, ochtend: number, startMislukt: number }>` (counts notifications handed to `stuurNaarPersonen`); never rejects.
- Changes in `api/cron/wachtpost.js`: `verwerkKamer` collects every `aan` it finishes as `mislukt` into a list `{ actieId, kamerNaam, aangemaaktDoor }`. After the room-state step the handler reads the rooms again (`leesKamers()`, fresh `staat_aan` and `aan_sinds`) and calls `draaiWachthond` with them, with `statusGelezen` (true when the status read this round gave a non-empty map) and the collected list. The answer becomes `{ ok: true, uitgevoerd, mislukt, wachtend, meldingen: { langAan, ochtend, startMislukt } }`. If the second `leesKamers()` or the watchdog fails, the answer is still 200 with `meldingen: { langAan: 0, ochtend: 0, startMislukt: 0 }`.

**Behaviour of `draaiWachthond`:**
1. **Start failed.** For each entry in `misluktAan` with an `aangemaaktDoor`: if `noteerMelding('start_mislukt', actieId)` is true, `stuurNaarPersonen([aangemaaktDoor], { titel: 'Warm', tekst: 'Aanzetten van <kamernaam> is niet gelukt.' })`. This one ignores `meldingen_aan` settings of other people but still respects the creator's own `meldingen_aan` (read through `leesOntvangers`).
2. **Long on.** `drempel = await leesLangAanMinuten()`. For each room from `langAanKandidaten`: `sleutel = '<kamer.id>:' + new Date(kamer.aan_sinds).toISOString()`; if `noteerMelding('lang_aan', sleutel)` is true and `ontvangersVoorKamer` is not empty, `stuurNaarPersonen(ontvangers, { titel: 'Warm', tekst: '<kamernaam> staat al <urenTekst(drempel)> aan. Aan laten of uitzetten?' })`.
3. **Morning.** Only when the Amsterdam hour of `nu` is exactly 9 and `statusGelezen` is true: if `noteerMelding('ochtend', <Amsterdamse datum>)` is true: take the rooms with `staat_aan === true`; for every person who is a recipient of at least one of them (`ontvangersVoorKamer` per room), send ONE notification listing that person's rooms in name order: one room `'<naam> staat nog aan.'`, more rooms `'Nog aan: <opsomming>.'`. No room on: nothing is sent, the day still counts as done.
4. Each of the three parts runs in its own try/catch; a failure in one is logged and does not stop the others. `leesOntvangers` is read once per round, lazily (only when a part needs it).

- [ ] **Step 1: Write the failing tests**
  - `tests/tijd.test.js`: the two `amsterdamDelen` examples above plus `new Date('2026-11-14T22:59:00Z')` -> `{ datum: '2026-11-14', uur: 23, minuut: 59 }`.
  - `tests/wachthond.test.js` (mock `opslag.js` and `push.js`), with rooms r1 "Britt" (resident p2), r2 "SasOlle" (residents p1 and p5), and persons p1 (lid), p2 (lid), p5 (`meldingen_alle_kamers: true`):
    - `ontvangersVoorKamer('r1', ...)` is `['p2','p5']` in any order; with p2 `meldingen_aan: false` it is `['p5']`; for r2 it is p1 and p5 without a duplicate p5.
    - `langAanKandidaten` at `2026-11-14T13:00:00Z` (14:00) with threshold 360: on since 06:59Z (7:59) is a candidate; on since 07:01Z is not (under 6 hours); at `2026-11-14T22:30:00Z` (23:30) nothing is a candidate; at `2026-11-14T07:30:00Z` (8:30) nothing; at `2026-11-14T08:00:00Z` (9:00) a room on since `2026-11-13T20:00:00Z` (yesterday 21:00) is NOT a candidate; at `2026-11-14T21:59:00Z` (22:59) a room on since 09:00 is; a room with `staat_aan: false` or without `aan_sinds` never is.
    - `urenTekst` and `opsomming` examples above.
    - `draaiWachthond` long on: first round sends to p2 and p5 with text `Britt staat al 6 uur aan. Aan laten of uitzetten?` and `noteerMelding('lang_aan', 'r1:2026-11-14T06:00:00.000Z')`; when `noteerMelding` returns false nothing is sent.
    - Morning at `2026-11-14T08:05:00Z` with r1 and r2 on: p2 gets `Britt staat nog aan.`, p1 gets `SasOlle staat nog aan.`, p5 gets `Nog aan: Britt en SasOlle.`; `noteerMelding('ochtend', '2026-11-14')` called once. With nothing on: `noteerMelding` still called, nothing sent. With `statusGelezen: false`: `noteerMelding('ochtend', ...)` NOT called and nothing sent. At 08:05 local (hour 8) or 10:05 local: no morning check. Already noted (returns false): nothing sent.
    - Start failed: `stuurNaarPersonen(['p2'], { titel: 'Warm', tekst: 'Aanzetten van Britt is niet gelukt.' })`; an entry without `aangemaaktDoor` sends nothing; creator with `meldingen_aan: false` gets nothing.
    - `noteerMelding` throwing in the long-on part: the morning part still runs; `draaiWachthond` resolves.
  - `tests/wachtpost.test.js`: existing assertions on the body change from exact equality to containing `uitgevoerd`, `mislukt`, `wachtend` (adjust with `toMatchObject`), and add: the answer contains `meldingen`; an `aan` finished as `mislukt` (too late) appears in the `misluktAan` argument of `draaiWachthond` with the room name and `aangemaakt_door`; `draaiWachthond` gets `statusGelezen: false` when `getPowerStates` throws; `draaiWachthond` rejecting (mock it) still gives 200 with zero counts; the second `leesKamers` throwing still gives 200. Mock `../api/_lib/wachthond.js` in this file for those handler tests.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npx vitest run`**: all green, pristine.
- [ ] **Step 5: Commit.**

---

## Task 5: Settings API behind the administrator code

**Files:**
- Create: `api/beheer/code.js`, `api/beheer/index.js`
- Modify: `api/_lib/opslag.js`, `api/_lib/guard.js`
- Test: `tests/beheer-api.test.js` (new)

**Interfaces:**
- Consumes: `requireUser` with `rol` and `beheer` (Task 1); existing `hashHuiscode`, `controleerHuiscode`, `normaliseerHuiscode`, `ipVan`, `zelfdeHerkomst` from `api/_lib/toegang.js`; existing `telMisluktePogingen(ip)`, `noteerPoging(ip)`, `verwijderPoging(id)` (same limits and same order as `api/toegang/huiscode.js`: note the attempt first, then count; more than 30 in total or more than 10 for this IP in the last 60 minutes answers 429; a correct code removes the noted attempt). Read `api/toegang/huiscode.js` and mirror it.
- Produces (`api/_lib/opslag.js`):
  - `leesBeheerderscodeHash(): Promise<string | null>` and `bewaarBeheerderscode(hash): Promise<void>` (`instellingen` key `beheerderscode`, upsert).
  - `zetToestelBeheer(toestelId, aan: boolean): Promise<void>`.
  - `leesBeheerGegevens(): Promise<{ personen: Array<{ id, naam, rol, ziet_alles, meldingen_aan, meldingen_alle_kamers }>, kamers: Array<{ id, naam }>, bewoners: Array<{ kamer_id, persoon_id }> }>` (persons ordered by `cijfer`, rooms by `naam`; three selects is acceptable here).
  - `werkPersoonBij(id, velden): Promise<boolean>` where `velden` holds any of `ziet_alles`, `meldingen_aan`, `meldingen_alle_kamers`; returns whether a row changed.
  - `zetBewoners(kamerId, persoonIds): Promise<void>` (replace the residents of one room: delete, then insert).
  - `bewaarLangAanMinuten(minuten): Promise<void>`.
- Produces (`api/_lib/guard.js`): `requireBeheer(req, res)`: `requireUser`, then 403 `{ ok: false, error: 'Alleen voor de beheerder.' }` when `rol !== 'beheerder'`, then 403 `{ ok: false, error: 'Voer eerst de beheerderscode in.', stap: 'code' }` when the device is not unlocked. Returns the user or null.
- Produces (API):
  - `GET /api/beheer/code` (user must be beheerder, else 403) -> `200 { ingesteld: boolean, ontgrendeld: boolean }`.
  - `POST /api/beheer/code` with `{ code }` (beheerder only, `zelfdeHerkomst`):
    - no code set yet: the normalised code must have at least 8 characters, else `400 { ok: false, error: 'Kies een code van minimaal 8 tekens.' }`; stores the hash, unlocks this device, `200 { ok: true, nieuw: true }`.
    - code set: attempt limit as described; wrong code `401 { ok: false, error: 'Die code klopt niet.' }`; too many attempts `429 { ok: false, error: 'Te veel pogingen. Probeer het over een uur opnieuw.' }`; right code unlocks this device, `200 { ok: true }`.
  - `DELETE /api/beheer/code` (beheerder, `zelfdeHerkomst`): locks this device again, `200 { ok: true }`.
  - `GET /api/beheer` (`requireBeheer`) -> `200 { personen: [{ id, naam, rol, zietAlles, meldingenAan, meldingenAlleKamers }], kamers: [{ id, naam, bewoners: [persoonId] }], langAanMinuten }`.
  - `POST /api/beheer` (`requireBeheer`, `zelfdeHerkomst`) with one of:
    - `{ soort: 'persoon', id, zietAlles?, meldingenAan?, meldingenAlleKamers? }`: every given field must be a boolean and at least one must be given; unknown id 404.
    - `{ soort: 'bewoners', kamerId, persoonIds }`: `persoonIds` an array of at most 10 strings; `kamerId` must be an existing room and every id an existing person (checked against `leesBeheerGegevens()`), otherwise 400.
    - `{ soort: 'langAan', minuten }`: an integer from 60 up to and including 1440.
    - Success `200 { ok: true }`; invalid input `400 { ok: false, error: 'Ongeldige invoer.' }`.
  - 405 for other methods; 500 with `FOUT_STORING` on a database error.

- [ ] **Step 1: Write the failing tests** (`tests/beheer-api.test.js`, same harness as `tests/toegang-api.test.js`): a lid gets 403 on every endpoint; a beheerder on a locked device gets 403 with `stap: 'code'` on `GET` and `POST /api/beheer`; `GET code` reports `ingesteld` and `ontgrendeld`; first `POST code` with 7 characters 400, with 8 stores a hash (not the plain code), calls `zetToestelBeheer('t1', true)` and answers `nieuw: true`; with a code set: right code unlocks and removes the noted attempt; wrong code 401 and keeps it; 31 attempts in total or 11 for this IP gives 429 without checking the code; `DELETE code` locks; `GET /api/beheer` maps the rows to the camelCase shape with `bewoners` per room and `langAanMinuten`; `POST persoon` with a non-boolean, no fields, or an unknown id (400, 400, 404); `POST bewoners` with an unknown room or person 400, valid replaces; `POST langAan` with 59, 1441, 90.5 or a string 400, 360 stores; wrong Origin 403; database error 500; `cache-control: no-store` everywhere.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npx vitest run`**: all green, pristine.
- [ ] **Step 5: Commit.**

---

## Task 6: The settings screen

**Files:**
- Create: `src/components/Beheer.jsx`
- Modify: `src/App.jsx`, `src/components/RoomList.jsx`, `src/index.css`
- Test: `tests/beheer.test.jsx` (new), `tests/app.test.jsx`, `tests/roomlist.test.jsx` (extend)

**Interfaces:**
- Consumes: `GET /api/toegang/ik` (`rol`), the settings API of Task 5, existing `apiFetch`.
- Produces: `App` keeps `rol` in state and passes `rol` and `onBeheer` to `RoomList`; a state `scherm` (`'kamers' | 'beheer'`) switches between `RoomList` and `<Beheer onTerug={...} onStap={bijStap} />`. `RoomList` shows a button `Beheer` in the header only when `rol === 'beheerder'`.

**What the administrator sees** (exact Dutch copy):
- Header `Beheer` with a button `Terug`.
- On opening, `GET /api/beheer/code`:
  - not `ingesteld`: heading `Kies een beheerderscode`, text `Deze code vraagt de app eenmalig per telefoon voordat je instellingen kunt wijzigen. Minimaal 8 tekens.`, two password fields labelled `Code` and `Nog een keer`, button `Opslaan`. Unequal fields: `De twee codes zijn niet gelijk.` (role `alert`, nothing is sent).
  - `ingesteld` and not `ontgrendeld`: heading `Beheerderscode`, one password field labelled `Code`, button `Verder`. Server errors are shown with their `error` text.
  - unlocked: the settings below, loaded with `GET /api/beheer`.
- Section `Personen`: per person the name and three switches (`role="switch"`, same look as the room switch):
  - `Ziet alle kamers` (for the beheerder this switch is on and disabled, with the text `De beheerder ziet altijd alles.`)
  - `Krijgt meldingen`
  - `Meldingen over alle kamers`
  Each has `aria-label` `<label> <naam>`, for example `Ziet alle kamers Britt`.
- Section `Bewoners per kamer`: per room its name and one checkbox per person, `aria-label` `<persoonnaam> woont in <kamernaam>`.
- Section `Lang aan`: a select labelled `Seintje als een kamer zo lang aan staat` with options `2 uur`, `3 uur`, `4 uur`, `6 uur`, `8 uur`, `10 uur`, `12 uur` (values in minutes). A stored value that is not in the list is shown as an extra option with its own label (`urenTekst`-style: `90 -> '1,5 uur'`).
- A button `Beheer vergrendelen op dit toestel` (calls `DELETE /api/beheer/code`, then shows the code form).
- Every change is saved immediately: the control shows the new value at once; on failure it returns to the old value and `Opslaan is niet gelukt. Probeer het opnieuw.` appears (role `alert`). While one request for a control is in flight, that control is disabled.
- A 401 from any request calls `onStap(stap)` like the room list does; a 403 with `stap: 'code'` shows the code form again.

- [ ] **Step 1: Write the failing tests**
  - `tests/beheer.test.jsx` (mock `fetch` like `tests/roomlist.test.jsx`): the three opening states; choosing a code with unequal fields sends nothing; equal fields post `{ code }` and then load the settings; a wrong code shows `Die code klopt niet.`; toggling `Ziet alle kamers Britt` posts `{ soort: 'persoon', id, zietAlles: false }`; the beheerder's `Ziet alle kamers` switch is disabled; ticking `Saskia woont in Britt` posts `{ soort: 'bewoners', kamerId, persoonIds }` with the new complete list for that room; changing the select posts `{ soort: 'langAan', minuten: 480 }`; a failing save restores the old value and shows the error text; `Terug` calls `onTerug`; a 401 calls `onStap`; vergrendelen sends DELETE and shows the code form.
  - `tests/app.test.jsx` and `tests/roomlist.test.jsx`: the `Beheer` button is there for `rol: 'beheerder'` and absent for `rol: 'lid'`; tapping it shows the settings screen and `Terug` returns to the rooms.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** Keep `Beheer.jsx` focused: if it grows past roughly 300 lines, split the code form into `src/components/BeheerCode.jsx`. Touch sizes at least 44px; readable colours.
- [ ] **Step 4: Run `npx vitest run`** (all green, pristine) and the build check.
- [ ] **Step 5: Commit.**

---

## Task 7: The main screen fits on one phone screen

Requested by Olivier on 2026-11-14 while fase 2b was being built: "kun je ervoor zorgen dat ik als gebruiker niet hoef te scrollen. ik denk dat alles wel op een scherm past".

**Files:**
- Modify: `src/components/RoomList.jsx`, `src/components/RoomCard.jsx`, `src/components/PlanPaneel.jsx`, `src/components/Meldingen.jsx`, `src/index.css`
- Test: `tests/roomlist.test.jsx`, `tests/plan-paneel.test.jsx`, `tests/meldingen.test.jsx` (adjust and extend)

**Goal:** With five rooms and no plan panel open, the main screen needs no vertical scrolling in the home-screen app on an iPhone, down to a viewport of 375 by 647 CSS pixels, also when every room shows a line with what is planned. Opening a plan panel may make the page scroll; that is fine.

**Interfaces:**
- Consumes: everything `RoomList`, `RoomCard`, `PlanPaneel` and `Meldingen` already get; no API change.
- Produces: `PlanPaneel` gains props `onAnnuleer(soort: 'timer' | 'start')` (and reads `room.timer` and `room.start`).

**Layout (top to bottom), exact Dutch copy unchanged unless stated:**
1. Header, one row, about 44px high: `Warm` (h1, 1.5rem) on the left; on the right `Hoi <naam>` (0.9rem) and the button `Uitloggen`.
2. Toolbar, one row: `Alles uit`; a square button showing `\u21bb` with `aria-label="Vernieuwen"` (replaces the text button `Vernieuwen`); and, pushed to the right edge, `Beheer` (only for the beheerder).
3. The room list. Each room card is ONE row of 44px plus at most one small info line:
   - Row: on the left the name (bold, 1.05rem) followed on the same line by the state badge (`Aan`, `Uit`, `Onbekend`) and the temperature; on the right the button `Plannen` (compact: 0.9rem, horizontal padding 10px, 44px high, `aria-expanded` as before) and the switch. A room with unknown state has no `Plannen` button, as before.
   - Info line (0.85rem, only when there is something to show): the parts that apply, joined with ` · ` (space, middle dot U+00B7, space), in this order: `Aan sinds 14:05`, then `Gaat uit om 19:00` (or the overdue text `Uitzetten is nog niet gelukt, wordt opnieuw geprobeerd.`), then `Gaat aan om 16:00` or `Gaat aan om 16:00, 3 uur lang` (or the overdue text `Aanzetten is nog niet gelukt, wordt opnieuw geprobeerd.`). The line may wrap when it does not fit.
   - The `Annuleer` buttons leave the card. They move into the plan panel (next point). Exception: a room with unknown state that has a timer or start keeps its `Annuleer` buttons on the card, on a second row, because it has no panel.
   - Card padding 10px 12px; gap between cards 8px. The error line (`role="alert"`) of a card stays below the row.
4. The plan panel (`PlanPaneel`), when open, starts with what is currently planned, if anything: a line `Timer loopt tot 19:00` with the button `Annuleer` (`aria-label="Annuleer timer <kamernaam>"`), and a line `Gaat aan om 16:00` (with `, 3 uur lang` when a duration is set) with the button `Annuleer` (`aria-label="Annuleer starttijd <kamernaam>"`). Each calls `onAnnuleer('timer')` or `onAnnuleer('start')`. After a successful cancel the panel stays open. The rest of the panel is unchanged.
5. The notifications strip (`Meldingen`) moves BELOW the room list and becomes one compact row: the text at 0.85rem, the buttons compact (0.9rem, horizontal padding 10px, 44px high). Texts and behaviour unchanged.
6. Page padding: 12px 16px, plus `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` added to the top and bottom padding. Vertical gaps between the blocks 8px.

**Height budget to respect** (CSS pixels, at 375 wide): padding 24, header 44, toolbar 44, five cards of at most 82 each (44 row plus one info line plus padding), the notifications strip 48, gaps 56: at most 626, under 647. Do not add margins that break this budget.

- [ ] **Step 1: Adjust and extend the tests first**
  - `tests/roomlist.test.jsx`: the refresh control is found by its accessible name `Vernieuwen` and shows `\u21bb`; a room with `aanSinds` and a `timer` shows ONE info line containing `Aan sinds`, ` · ` and `Gaat uit om`; a room with a timer has no `Annuleer timer <naam>` button until `Plannen` is tapped, and then the panel shows `Timer loopt tot` with that button; tapping it sends `DELETE /api/rooms/<id>/plan?soort=timer`, the list reloads and the panel is still open; same for `Annuleer starttijd <naam>`; a room with unknown state and a timer still shows `Annuleer timer <naam>` on the card; the `Meldingen` strip (mocked) is rendered after the room list in document order; existing behaviour tests (switching, planning, errors, overdue texts, empty list, `Beheer` button for the beheerder only) keep passing, adjusted only where the layout moved a control.
  - `tests/plan-paneel.test.jsx`: with `room.timer` the panel shows `Timer loopt tot` and `Annuleer` calls `onAnnuleer('timer')`; with `room.start` and a duration it shows `Gaat aan om` with `3 uur lang` and `Annuleer` calls `onAnnuleer('start')`; without either, neither line is there; with `bezig` the `Annuleer` buttons are disabled too.
  - `tests/meldingen.test.jsx`: unchanged assertions must keep passing.
- [ ] **Step 2: Run and see the new and changed tests fail.**
- [ ] **Step 3: Implement** the layout in the four components and `src/index.css`. No new dependencies, no icon library (the refresh symbol is the character U+21BB).
- [ ] **Step 4: Run `npx vitest run`** (all green, pristine) and the build check (`npx vite build --outDir "dist_v$(date +%s)"` prints `built`; `rm -rf dist_v*`).
- [ ] **Step 5: Commit.**

The controller checks the real height in the preview at 375 by 647 and at 390 by 760 after this task.

---

## Task 8: Profile photos on the server

Requested by Olivier on 2026-11-14: "ik wil dat een gebruiker z'n eigen foto kan toevoegen ergens. en ik als beheerder voor allemaal." Built and shipped after fase 2b is live.

**Files:**
- Create: `supabase/migrations/0006_fotos.sql`, `api/_lib/foto.js`, `api/profiel/foto.js`, `api/beheer/foto.js`
- Modify: `api/_lib/opslag.js`, `api/toegang/ik.js`, `api/toegang/persoon.js`, `api/beheer/index.js`
- Test: `tests/foto-lib.test.js`, `tests/foto-api.test.js` (new), `tests/toegang-api.test.js`, `tests/beheer-api.test.js` (extend)

**Interfaces:**
- Produces (`api/_lib/foto.js`):
  - `leesFotoInvoer(waarde: unknown): string | null`: accepts only a string that starts with `data:image/jpeg;base64,` followed by at most 200000 characters of valid base64 whose decoded bytes start with `FF D8 FF` and end with `FF D9`. Returns the base64 part (re-encoded from the decoded bytes, so it is canonical), otherwise `null`.
  - `fotoDataUrl(base64: string | null | undefined): string | null`: `data:image/jpeg;base64,<base64>` or `null`.
- Produces (`api/_lib/opslag.js`):
  - `leesFoto(persoonId): Promise<string | null>` (the stored base64), `leesFotos(): Promise<Array<{ persoon_id, foto }>>`, `bewaarFoto(persoonId, base64): Promise<void>` (upsert on `persoon_id`, sets `bijgewerkt` to now), `verwijderFoto(persoonId): Promise<void>`.
  - `vindToestel` additionally selects `kleur` of the person; `vindPersoon(cijfer, kleur)` already knows the colour. `leesBeheerGegevens().personen` rows additionally carry `kleur`.
- Produces (API):
  - `GET /api/toegang/ik` in step `binnen` additionally returns `kleur: string` and `foto: string | null` (a data URL). If reading the photo fails, `foto` is `null` and the error is logged; the answer stays 200.
  - `POST /api/toegang/persoon` on success additionally returns `kleur` and `foto` in the same way.
  - `POST /api/profiel/foto` with `{ foto: <data URL> }` (`requireUser`, `zelfdeHerkomst`): stores it for the logged-in person, `200 { ok: true, foto: <data URL> }`. Invalid: `400 { ok: false, error: 'Die foto kan niet gebruikt worden.' }`.
  - `DELETE /api/profiel/foto`: removes the own photo, `200 { ok: true }`.
  - `POST /api/beheer/foto` with `{ persoonId, foto }` and `DELETE /api/beheer/foto?persoonId=<id>` (`requireBeheer`, `zelfdeHerkomst`): the same for any person. An id that is not in `leesBeheerGegevens().personen`: `404 { ok: false, error: 'Persoon niet gevonden' }`.
  - `GET /api/beheer`: every person additionally has `kleur` and `foto: string | null` (from `leesFotos()`; if that read fails, every `foto` is `null`, the error is logged and the answer stays 200).
  - 405 for other methods, 403 on a failed `zelfdeHerkomst`, 500 with `FOUT_STORING` on a database error while writing.

- [ ] **Step 1: Write `supabase/migrations/0006_fotos.sql` with exactly this content** (the controller applies it)

```sql
-- Profielfoto per persoon: een kleine JPEG (hooguit 256 bij 256), als base64.
create table public.persoon_fotos (
  persoon_id uuid primary key references public.personen(id) on delete cascade,
  foto text not null check (length(foto) <= 200000),
  bijgewerkt timestamptz not null default now()
);

alter table public.persoon_fotos enable row level security;
```

- [ ] **Step 2: Write the failing tests**
  - `tests/foto-lib.test.js`: a tiny valid JPEG (build the bytes in the test: `FF D8 FF E0`, a few filler bytes, `FF D9`) as data URL is accepted and returns its base64; rejected: a PNG data URL, `data:image/jpeg;base64,` with non-base64 characters, bytes without the `FF D9` ending, a base64 part of 200001 characters, an empty string, a number, `null`, a plain `https://` URL; `fotoDataUrl('abc')` is `data:image/jpeg;base64,abc` and `fotoDataUrl(null)` is `null`.
  - `tests/foto-api.test.js` (harness as `tests/beheer-api.test.js`): own photo POST stores `bewaarFoto('p5', <base64>)` and answers with the data URL; invalid photo 400 and nothing stored; own DELETE calls `verwijderFoto('p5')`; a lid can set the own photo; `POST /api/beheer/foto` by an unlocked beheerder stores for `p2`; unknown person 404; a lid gets 403; a beheerder on a locked device gets 403 with `stap: 'code'`; DELETE with `persoonId` removes; no cookie 401; wrong Origin 403; `bewaarFoto` throwing 500; `cache-control: no-store` everywhere.
  - `tests/toegang-api.test.js`: `GET ik` in step `binnen` includes `kleur` and `foto` (data URL when `leesFoto` gives base64, `null` when it gives null, `null` with status 200 when `leesFoto` throws); `POST persoon` success includes `kleur` and `foto`.
  - `tests/beheer-api.test.js`: `GET /api/beheer` persons carry `kleur` and `foto`; with `leesFotos` throwing the answer is still 200 with `foto: null`.
- [ ] **Step 3: Run and see them fail.**
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run `npx vitest run`**: all green, pristine.
- [ ] **Step 6: Commit.**

---

## Task 9: Profile photos on the phone

**Files:**
- Create: `src/lib/foto.js`, `src/components/Avatar.jsx`, `src/components/FotoKiezer.jsx`
- Modify: `src/App.jsx`, `src/components/RoomList.jsx`, `src/components/Beheer.jsx`, `src/components/Toegang.jsx` (only if needed to pass `kleur` and `foto` on), `src/index.css`
- Test: `tests/foto-client.test.js`, `tests/avatar.test.jsx`, `tests/fotokiezer.test.jsx` (new), `tests/app.test.jsx`, `tests/roomlist.test.jsx`, `tests/beheer.test.jsx` (extend)

**Interfaces:**
- Consumes: Task 8's API; `KLEUREN` from `src/lib/personen-kleuren.js` (colour name to hex).
- Produces (`src/lib/foto.js`):
  - `uitsnede(breedte, hoogte): { sx, sy, zijde }`: the largest centred square (`uitsnede(400, 300)` is `{ sx: 50, sy: 0, zijde: 300 }`; `uitsnede(300, 500)` is `{ sx: 0, sy: 100, zijde: 300 }`).
  - `async verkleinFoto(bestand: File | Blob): Promise<string>`: decodes the image (respecting its orientation), draws the centred square onto a 256 by 256 canvas and returns `canvas.toDataURL('image/jpeg', 0.8)`. Rejects when the file is not an image or cannot be decoded.
- Produces (`Avatar` props `{ naam, kleur, foto, grootte = 36 }`): with `foto` an `<img>` with `alt="Foto van <naam>"`, round, `grootte` pixels; without, a round element in the person's colour (hex from `KLEUREN`, grey `#8a8378` for an unknown colour) showing the first letter of the name in upper case, with `aria-label="<naam>"`. The letter is white on rood, blauw and kobalt and dark (`#2b1d12`) on geel, roze and cyaan.
- Produces (`FotoKiezer` props `{ naam, kleur, foto, bezig, fout, onKies(dataUrl), onVerwijder() }`): the avatar at 64 pixels; a button `Foto kiezen` (`Andere foto` when there is one) that opens a hidden `<input type="file" accept="image/*">` with `aria-label="Foto kiezen voor <naam>"`; a button `Verwijder foto` only when there is one. Choosing a file calls `verkleinFoto` and then `onKies(dataUrl)`; if `verkleinFoto` rejects it shows `Die foto kan niet gebruikt worden.` (role `alert`) and calls nothing. `fout` (a text from the parent) is shown the same way. While `bezig` both buttons are disabled. The input is reset after every choice so the same file can be chosen again.
- `App` keeps `kleur` and `foto` next to `naam` and `rol` (from `GET /api/toegang/ik` and from the `info` of `onStap`), passes them to `RoomList`, and gives it `onFoto(nieuw: string | null)` to update the photo.
- `RoomList` header: the text `Hoi <naam>` becomes a button with `aria-label="Profiel van <naam>"` and `aria-expanded`, containing the avatar (36 pixels) and the text `Hoi <naam>`. Tapping it opens a profile panel directly under the header with `FotoKiezer` and a button `Sluiten`. `onKies` posts `{ foto }` to `POST /api/profiel/foto`; on success the avatar updates through `onFoto` and the panel stays open; failure shows the server's `error` or `Dat is niet gelukt. Probeer het opnieuw.` in the kiezer. `onVerwijder` sends `DELETE /api/profiel/foto`. A 401 calls `onStap` as elsewhere. The header row stays 44 pixels high and the main screen still fits without scrolling while the panel is closed.
- `Beheer`: every person card starts with a `FotoKiezer` for that person (avatar at 48 pixels there; pass a `grootte` prop if you need it). `onKies` posts `{ persoonId, foto }` to `POST /api/beheer/foto`; `onVerwijder` sends `DELETE /api/beheer/foto?persoonId=<id>`. Only that person's kiezer is `bezig` meanwhile; failure shows the error in that kiezer and keeps the old photo. When the administrator changes the own photo here, `App` is told too (a prop `onEigenFoto(nieuw)` on `Beheer`, called when the changed person is the logged-in one; `Beheer` learns who that is from a prop `eigenNaam`).

- [ ] **Step 1: Write the failing tests**
  - `tests/foto-client.test.js`: the two `uitsnede` examples plus a square input; `verkleinFoto` with stubs for image decoding and canvas (jsdom has no canvas: stub `document.createElement('canvas')` to return an object with `getContext` and `toDataURL`, and stub `createImageBitmap`) draws with the `uitsnede` values onto 256 by 256 and returns the canvas data URL; a decode failure rejects.
  - `tests/avatar.test.jsx`: with a photo an image with the alt text; without, the first letter and the `aria-label`; the background colour for `kobalt` and the grey fallback for an unknown colour.
  - `tests/fotokiezer.test.jsx` (mock `../src/lib/foto.js`): choosing a file calls `onKies` with the data URL; a rejecting `verkleinFoto` shows the alert and does not call `onKies`; `Verwijder foto` only with a photo and calls `onVerwijder`; label `Andere foto` with a photo; `bezig` disables the buttons; a `fout` prop is shown.
  - `tests/roomlist.test.jsx`: the profile button shows the avatar and `Hoi <naam>`; opening the panel and choosing a file posts `{ foto }` to `/api/profiel/foto` and calls `onFoto` with the answer's data URL; `Verwijder foto` sends DELETE and calls `onFoto(null)`; a failing upload shows the error and does not call `onFoto`; `Sluiten` closes the panel.
  - `tests/beheer.test.jsx`: a person with `foto` shows it; choosing a file for Britt posts `{ persoonId, foto }` to `/api/beheer/foto`; removing sends the DELETE with the id; changing the own person calls `onEigenFoto`; a failure keeps the old photo and shows the error.
  - `tests/app.test.jsx`: `kleur` and `foto` from `GET /api/toegang/ik` reach the room list; after login through the person step the values from that answer are used.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** No new dependencies. Buttons at least 44 pixels high; readable colours.
- [ ] **Step 4: Run `npx vitest run`** (all green, pristine) and the build check.
- [ ] **Step 5: Commit.**

---

## Afronding (controller, na de taken)

1. Migratie `0004_meldingen_rechten.sql` toepassen na de review van Task 1 (alleen toevoegingen). Controleren: zes bewoner-rijen in totaal (vier kinderkamers plus SasOlle met Saskia en Olivier), RLS aan zonder policies op de drie nieuwe tabellen, `lang_aan_minuten` staat op 360.
2. VAPID-sleutelpaar maken, in `.env` en in Vercel (production) zetten zonder ze te tonen.
3. Eindreview over het geheel, een herstelronde, schermen bekijken met de nep-API.
4. Pushen, daarna controleren zonder iets te schakelen: `/api/push` en `/api/beheer` zonder cookie 401, wachtpost met sleutel 200 met `meldingen` in het antwoord.
5. Olivier: beheerderscode kiezen, meldingen aanzetten en een testmelding sturen op zijn iPhone; daarna de rest van het gezin.
