# Eclectik CRM — Project Context for Claude Code

This file is auto-loaded every Claude Code session in this repo. It carries the
project knowledge, conventions, and hard-won gotchas so any teammate (or a fresh
session after an account switch) starts with full context.

---

## 1. What this is

Eclectik BD (Business Development) CRM. A custom React app the team uses instead
of Dynamics for funnel, comms, calendar, accounts, marketing and admin.

- **Stack**: React 19 + Vite 8 + Supabase (Postgres + Auth + Storage) + Vercel
- **Repo**: `eclektik-crm` (GitHub: `olivier-arnolds/eclektik-crm`)
- **Live**: https://crm.eclectik-insights.co (Vercel, auto-deploys from `origin/main`)
- **Users**: small team — Olivier (olivier@eclectik.co), Marco (marco@eclectik.co),
  Yarmilla (yarmilla@eclectik.co). Olivier is the de-facto owner/admin.

## 2. Working style — IMPORTANT

- **Communicate in Dutch.** Olivier is hands-on but not deeply technical;
  explain trade-offs in plain language.
- **Commit each refactor/step separately** with a descriptive message.
- **Always ask before `git push`.** Never push unprompted.
- **Verify in the browser before moving on.** Production testing is via the
  live Vercel deploy; hard refresh (Cmd+Shift+R) after deploy (~1-2 min).
- Never run destructive git/DB ops without explicit confirmation.
- Claude must not perform permanent deletions (DB rows, files) itself —
  hand the user the SQL/command to run.
- The team uses an in-app **💡 Feedback** workflow (see §6) to queue feature
  requests; Claude pulls them via `/api/next-feature-request`.

## 3. Architecture

```
useBDData (src/bd/useBDData.js)
  └─ usePipelineData (src/hooks/usePipelineData.js)   ← raw Supabase fetches
       └─ adapters.js / usePipelineData adapters       ← two-level adapter chain
            └─ Lanes (src/bd/lane-*.jsx)               ← UI
```

- **Two-level adapter chain**: `usePipelineData` does first-pass row→shape
  mapping (adaptLead, adaptOpportunity, adaptComm, adaptTask, …); `adapters.js`
  does the BD-display mapping (adaptDeal, adaptComm, adaptTask, …). When adding
  a field you usually have to thread it through BOTH levels.
- **Lanes**: `lane-funnel.jsx` (deal pipeline), `lane-comms.jsx` (email/Teams/
  LinkedIn), `lane-calendar.jsx` (agenda), `lane-accounts.jsx` (Account 360).
- **Views** in `BDApp.jsx`: workspace (3-lane), Tasks, Marketing, Admin,
  Playbooks. Each view branch renders its own `<Topbar>` + modals — when adding
  a global modal/prop you must add it to EVERY branch (this bit us with the
  Feedback button).
- **API** in `/api/*.js` (Vercel serverless). All use `SUPABASE_SERVICE_KEY`
  (bypasses RLS). Frontend uses the anon key + auth session (`authenticated`
  role).

## 4. Domain model

### Funnel: 7-stage model
Order (drives column layout in `adapters.js` STAGES + `atoms.jsx` STAGE_TINT):

```
qualify → develop → proposal → close (lost) → onboarding → active → sleeping
```

- `qualify` lives in the **`leads`** table. `develop`+ are **`opportunities`**.
- DB encoding: opportunities have `stage` + `sub_status` + `status`.
  - `close`   = stage `past`  + status `Lost`
  - `sleeping`= stage `past`  + status `Won`   (finished, revivable project)
  - onboarding/active = stage = that value
  - qualify/develop/proposal = stage `opportunity` + sub_status = that value
- **`leads` has NO `stage` column** — only `sub_status` + `status`. Dragging a
  lead onto an opp-only stage auto-promotes it to `opportunities`
  (`src/bd/lead-promote.js`), migrating child rows (tasks/follow_ups/comms/
  calendar_events) and deleting the lead.
- `stageUpdates(targetStage, dealTable)` in `adapters.js` is the single source
  of truth for what DB fields a drag-drop writes.

### Owner mapping
DB stores owner as a name string (sometimes just a first name). `ownerIdFromName`
in `adapters.js` maps both full and first names → MVG / OA / YK codes. Keep the
first-name aliases in OWNER_ID in sync (a mismatch silently hid Marco's tasks).

## 5. External integrations & env (Vercel env vars)

- **Supabase**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (anon, frontend),
  `SUPABASE_SERVICE_KEY` (API). RLS is **enabled on all public tables** with a
  uniform `auth users full access on <table>` policy (`FOR ALL TO authenticated
  USING(true) WITH CHECK(true)`). An event trigger `rls_auto_enable` turns RLS
  on for any new table automatically. Don't add Anon-* policies.
- **Microsoft Graph** via Supabase Azure OAuth (`src/lib/auth.jsx`). App
  Registration id `ad62ee9d-36aa-45ca-b68e-73d81d729864`, tenant
  `a51c76cb-f4a4-49c1-8fd9-6108278928d8`. Token cached in
  `localStorage.graph_token`. Scopes are in the `signInWithOAuth` calls.
- **Unipile** (LinkedIn): `UNIPILE_API_KEY` + `UNIPILE_BASE_URL`. The CORRECT
  workspace is **`api40.unipile.com:17050`** (an old workspace on :17065 caused
  401s). Three connected accounts mapped to emails — keep this map in sync in
  BOTH `api/unipile-webhook.js` (UNIPILE_ACCOUNT_OWNERS) and
  `src/bd/lane-comms.jsx` (USER_TO_UNIPILE_ACCOUNT):
  - `KYq2oN8JSPiAQSrcIfT5Ew` → marco@eclectik.co
  - `j9-n2jeNTtGUxemfjlBsZA` → yarmilla@eclectik.co
  - `tC2o50tiTBiRCt9xAnio3w` → olivier@eclectik.co
- **Resend** (transactional email): `RESEND_API_KEY`, `MARKETING_FROM_EMAIL`.
  `eclectik.co` DNS is on **Cloudflare** (not MijnDomein) — add DNS records
  there, DNS-only/grey-cloud.
- **Vercel**: now on **Pro** (was Hobby — that had a 12 serverless-function
  limit which forced removal of dead Surfe endpoints; Surfe was replaced by
  Unipile and is fully gone).

## 6. Feature Requests workflow (self-service queue)

- 💡 **Feedback** button in the Topbar → `feedback-modal.jsx` (type, title,
  description, screenshot via paste OR file → Supabase Storage bucket
  `feature-requests`). Inserts a `feature_requests` row, fires
  `/api/feedback-notify` (emails olivier@ only, sender "Eclectik CRM Feedback").
- **Admin tab → Feedback inbox** (`admin-view.jsx`): triage, approve/reject.
- **Claude pulls work**:
  - `GET  /api/next-feature-request` → oldest `approved` row
  - `POST /api/next-feature-request` `{id}` → marks `in_progress`
  - `POST /api/next-feature-request?done=1` `{id, commit_sha, notes}` → `done`
- Storage bucket `feature-requests` is public-read with authenticated insert.

## 7. Key features & where they live

| Feature | Files |
|---|---|
| Funnel (7-stage, drag-drop, lead→opp promote) | `lane-funnel.jsx`, `adapters.js`, `lead-promote.js` |
| Account 360 (open/active/**sleeping** projects, tasks with owner) | `lane-accounts.jsx` |
| Comms — email/Teams/LinkedIn, threaded chat view | `lane-comms.jsx` |
| LinkedIn live fetch + per-user inbox | `lane-comms.jsx` + `api/unipile.js` + `api/unipile-webhook.js` |
| Marketing — contacts, tags, CSV export, email filter/inline-edit | `marketing-contacts.jsx`, `marketing-view.jsx` |
| Feedback workflow | `feedback-modal.jsx`, `api/feedback-notify.js`, `api/next-feature-request.js`, `admin-view.jsx` |
| Calendar / agenda (tasks filtered to current owner here, NOT in Account 360) | `lane-calendar.jsx` |

## 8. Gotchas (hard-won — read before you debug)

- **Comms privacy filter** (`lane-comms.jsx`): the teammate-name filter applies
  to `email` ONLY. LinkedIn/Teams are shared team channels.
- **LinkedIn** is fetched LIVE from Unipile on channel-select (not the DB cache;
  the old `comms` LinkedIn rows were deleted). Per-user via the account map.
  Conversation names resolved via `get-chat-attendees`.
- **Teams threading**: `getChatMessages` (lib/graph.js) returns PRE-normalized
  `{id, from(str), body(str), date}` for both chats and channels — don't
  re-parse raw Graph shape.
- **Teams channels (workspace channels) are DISABLED**. The scopes
  (Channel.ReadBasic.All, ChannelMessage.Read.All) are granted in Azure AD but
  Microsoft's *protected APIs* tenant gate returns 403 on channel messages
  without a separate approval/licensing. Don't re-enable without sorting the
  Microsoft side first. (Reverted in commit `ef93c60`.)
- **Supabase JS client has no transactions** — multi-table ops
  (`lead-promote.js`) are best-effort and ordered for recoverable partial
  failure.
- **Account 360 tasks** are intentionally NOT owner-filtered (shows all users +
  done tasks + owner name) — opposite of the agenda Tasks-row.
- A deal moving to `sleeping` keeps its `company_id`; it's only invisible if a
  render path forgets the `sleeping` stage (was a bug; fixed with a dedicated
  Account-360 section).

## 9. Open queue / parked work

- **Teams workspace channels** via a separate MSAL auth path (parked — needs
  Microsoft protected-API approval first; not worth code work until then).
- Realtime updates on new inbound comms (currently refresh-on-click).
- Legacy LinkedIn "Marco self-chat" data artifact (only relevant if old DB
  comms ever resurface; current LinkedIn is live-fetch so moot).

## 10. Deployment & verification

1. Commit (separately per step), **ask before push**.
2. `git push origin main` → Vercel auto-deploys (~1-2 min).
3. User hard-refreshes (Cmd+Shift+R) and verifies in the browser.
4. SQL migrations are run by the user in the Supabase SQL Editor (Claude
   provides the SQL; never runs destructive DB ops itself).

Account/Anthropic-org migration steps are in `TEAM_SETUP.md`.
