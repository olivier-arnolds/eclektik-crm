# Eclectik BD CRM

Custom Business-Development CRM the Eclectik team uses instead of Microsoft Dynamics —
funnel, comms, calendar, accounts, marketing, playbooks and admin in one app.
Production URL: **https://crm.eclectik-insights.co** (Vercel, auto-deploys from `origin/main`).

Stack: React 19 · Vite 8 · Supabase (Postgres + Auth + Storage) · Microsoft SSO (Entra ID, via Supabase Azure OAuth) · Vercel serverless functions · Anthropic SDK · `@xyflow/react` (playbook builder).

> **Team & working style:** small team — Olivier (owner/admin), Marco, Yarmilla — all `@eclectik.co`.
> Day-to-day conventions, the domain model in depth, and hard-won gotchas live in [`CLAUDE.md`](./CLAUDE.md); read it before debugging. House rules: commit each step separately, **always confirm before `git push`**, and never run destructive git/DB ops automatically.

---

## What's live today

- **Microsoft SSO sign-in** — Azure/Entra OAuth through Supabase, `@eclectik.co` accounts (`src/lib/auth.jsx`, `src/components/auth/LoginScreen.jsx`).
- **Funnel** — 7-stage drag-and-drop pipeline (`qualify → develop → proposal → close → onboarding → active → sleeping`); dragging a lead onto an opportunity-only stage auto-promotes it from `leads` to `opportunities` (`lane-funnel.jsx`, `adapters.js`, `lead-promote.js`).
- **Account 360** — open / active / sleeping projects per company, with tasks and owners (`lane-accounts.jsx`).
- **Comms** — unified email / Microsoft Teams / LinkedIn, threaded chat view; LinkedIn is fetched **live** from Unipile per user (`lane-comms.jsx`, `api/unipile.js`, `api/unipile-webhook.js`).
- **Calendar / agenda** — meetings and tasks for the current owner (`lane-calendar.jsx`), synced from Microsoft Graph (`sync-events.js`, `src/lib/graph.js`).
- **Marketing** — contacts, tags, CSV export, campaign composer and per-recipient send via Resend (`marketing-*.jsx`, `api/marketing-send.js`, `api/marketing-webhook.js`).
- **Playbooks** — visual workflow builder on React Flow, with versioning/validation (`src/components/playbooks/**`); scheduled execution via a weekday cron (`api/playbook-execute.js`).
- **Admin** — weekly database export emailed to recipients (`api/admin-weekly-export.js`), plus the Feedback inbox (`admin-view.jsx`).
- **Feedback workflow** — in-app 💡 button queues feature requests that Claude can pull and work through (`feedback-modal.jsx`, `api/next-feature-request.js`; see below).

---

## Architecture

```
useBDData (src/bd/useBDData.js)
  └─ usePipelineData (src/hooks/usePipelineData.js)   ← raw Supabase fetches
       └─ adapters.js  (two-level adapter chain)       ← row→shape, then BD-display mapping
            └─ Lanes (src/bd/lane-*.jsx)               ← UI
```

- **Frontend** is a Vite single-page app. `BDApp.jsx` switches between views: workspace (3-lane), Tasks, Marketing, Admin, Playbooks. Each view branch renders its own `<Topbar>` + modals.
- **Backend** is Vercel serverless functions in `/api/*.js`. They use `SUPABASE_SERVICE_KEY` (bypasses RLS); the frontend uses the anon key + the user's auth session (the `authenticated` role).
- **Two-level adapter chain:** when you add a field, thread it through *both* `usePipelineData` (first-pass) and `adapters.js` (BD-display). `stageUpdates()` in `adapters.js` is the single source of truth for what a drag-drop writes to the DB.

---

## Environment variables (Vercel)

Set in Vercel → Project Settings → Environment Variables (Production + Preview). Locally, put the `VITE_*` pair in a `.env.local` (git-ignored).

```
# Frontend (exposed to the browser — anon only)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_KEY=<supabase anon key>

# Server-only (API routes / scripts — never commit, never expose to browser)
SUPABASE_SERVICE_KEY=<supabase service_role key>
ANTHROPIC_API_KEY=<anthropic key>              # company-insights, suggest-task

# Email (Resend)
RESEND_API_KEY=<resend key>
RESEND_WEBHOOK_SECRET=<svix signing secret>    # verifies marketing-webhook
MARKETING_FROM_EMAIL=<from address>
MARKETING_FROM_NAME=<from display name>

# LinkedIn (Unipile)
UNIPILE_API_KEY=<unipile key>
UNIPILE_BASE_URL=<unipile dsn>                  # e.g. api40.unipile.com:17050
```

Exact Azure app-registration / tenant IDs, the correct Unipile workspace, and the per-user Unipile account map are documented in **`CLAUDE.md` §5** (kept there so there's a single source of truth). DNS for `eclectik.co` is on Cloudflare (DNS-only / grey-cloud).

---

## Local development

```bash
git clone https://github.com/olivier-arnolds/eclektik-crm.git
cd eclektik-crm
# create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_KEY (anon)
npm install
npm run dev            # http://localhost:5173
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

For SSO to work against the live Supabase project, your localhost callback must be in the Supabase **Authentication → URL Configuration** allowlist. Serverless `/api/*` routes don't run under `vite dev`; test those on a Vercel Preview deploy.

---

## Database

Postgres on Supabase. **RLS is enabled on every public table** with a uniform `auth users full access on <table>` policy (`FOR ALL TO authenticated USING (true) WITH CHECK (true)`) — a deliberate choice for a small trusted team where the frontend runs as `authenticated` and the API uses the service key. An event trigger, `rls_auto_enable`, turns RLS on for any new table automatically. Don't add `anon` policies.

Schema is tracked as SQL files at the repo root, applied by hand in the Supabase SQL Editor (Claude provides SQL; it never runs destructive DB ops itself):

```
schema_bd_dashboard.sql            # core CRM tables (companies, contacts, leads, opportunities, activity, …)
schema_playbooks_v2.sql            # playbook graph tables (versions, nodes, edges, drafts, suggestions)
schema_playbooks_v2_verify.sql     # post-apply checks
schema_playbooks_v2_cleanup.sql    # drop legacy playbook objects
schema_playbooks_v2_rollback.sql   # undo the v2 migration
```

The original Dynamics migration lives in `import_full.py` / `import_new_records.py` (the `*_Dynamics_*.xlsx` exports → Supabase).

---

## API routes (`/api/*.js`, Vercel serverless)

| Route | Purpose |
|---|---|
| `unipile.js` | LinkedIn proxy — `?action=send-message\|start-chat\|get-profile\|get-posts` |
| `unipile-webhook.js` | Inbound LinkedIn events → `comms` |
| `marketing-send.js` | Per-recipient campaign send via Resend |
| `marketing-webhook.js` | Resend delivery/open/click events → `campaign_sends` (Svix-signed) |
| `company-insights.js` | AI company insights (Anthropic) |
| `suggest-task.js` | AI task suggestion from an email (Anthropic) |
| `playbook-execute.js` | Runs due playbook steps — **cron: Mon–Fri 08:00** |
| `admin-weekly-export.js` | Markdown DB snapshot emailed to admins — **cron: Mon 06:00**; `POST` = "Run now" |
| `feedback-notify.js` | Emails Olivier when a new feature request is filed |
| `next-feature-request.js` | The Claude work queue (see below) |

Cron schedules are defined in `vercel.json`.

---

## Feedback → Claude work queue

A self-service loop so the team can queue work and Claude can pull it:

1. **💡 Feedback** button (Topbar) → `feedback-modal.jsx`. Captures type, title, description, optional screenshot (→ Supabase Storage bucket `feature-requests`), inserts a `feature_requests` row, and fires `api/feedback-notify.js` (emails Olivier).
2. **Admin → Feedback inbox** (`admin-view.jsx`): Olivier triages — approve / reject.
3. **Claude pulls work** via `api/next-feature-request.js`:
   - `GET  /api/next-feature-request` → oldest `approved` row
   - `POST /api/next-feature-request` `{id}` → mark `in_progress`
   - `POST /api/next-feature-request?done=1` `{id, commit_sha, notes}` → mark `done`

---

## Project layout

```
eclektik-crm/
├── api/                              # Vercel serverless functions (server-only env)
│   ├── unipile.js  unipile-webhook.js
│   ├── marketing-send.js  marketing-webhook.js
│   ├── company-insights.js  suggest-task.js
│   ├── playbook-execute.js  admin-weekly-export.js
│   └── feedback-notify.js  next-feature-request.js
├── src/
│   ├── main.jsx  App.jsx  supabase.js
│   ├── bd/                           # the BD workspace — lanes, modals, adapters
│   │   ├── BDApp.jsx                 # view switcher (workspace/Tasks/Marketing/Admin/Playbooks)
│   │   ├── lane-funnel.jsx  lane-comms.jsx  lane-calendar.jsx  lane-accounts.jsx
│   │   ├── adapters.js  useBDData.js  lead-promote.js  sync-events.js
│   │   ├── marketing-*.jsx           # contacts, campaigns, composer, tags
│   │   ├── admin-view.jsx  tasks-view.jsx  feedback-modal.jsx
│   │   └── *-modal.jsx               # deal/contact/task/meeting/etc. modals
│   ├── components/
│   │   ├── auth/  accounts/  contacts/  inbox/  detail/  forms/  layout/  views/  atoms/  cards/
│   │   └── playbooks/                # React-Flow builder: nodes/, panels/, lib/
│   ├── hooks/                        # usePipelineData, useEmailComms, useLinkedIn*, useTeams*, …
│   └── lib/                          # auth.jsx, graph.js, constants.js, template-vars.js
├── schema_*.sql                      # DB schema, run in Supabase SQL Editor
├── import_full.py  import_new_records.py   # Dynamics → Supabase migration
├── vercel.json                       # build config + cron schedules
├── deploy.sh                         # npx vercel --prod --yes
├── CLAUDE.md                         # full project context + gotchas (read this)
├── TEAM_SETUP.md                     # moving Claude Code to the Eclectik Team org
└── README.md
```

---

## Deployment & verification

1. Commit each step separately with a descriptive message.
2. **Ask before pushing.** Then `git push origin main` → Vercel auto-deploys (~1–2 min).
3. Hard-refresh the live site (`Cmd+Shift+R`) and verify in the browser.
4. For schema changes, run the SQL in the Supabase SQL Editor by hand — Claude provides it, never runs destructive DB ops itself.

`deploy.sh` (`npx vercel --prod --yes`) exists for a manual production deploy, but the normal path is push-to-`main`.

---

## Integrations at a glance

| Integration | Used for | Where |
|---|---|---|
| **Supabase** | Postgres, Auth, Storage | `src/supabase.js`, all `api/*` |
| **Microsoft Graph** (Azure OAuth) | SSO, Teams chats, calendar, email | `src/lib/auth.jsx`, `src/lib/graph.js` |
| **Unipile** | LinkedIn messaging & posts (live) | `api/unipile.js`, `lane-comms.jsx` |
| **Resend** | Transactional & marketing email | `api/marketing-send.js`, `api/marketing-webhook.js` |
| **Anthropic** | Company insights, task suggestions | `api/company-insights.js`, `api/suggest-task.js` |

> Note: Microsoft Teams **workspace channels** are currently disabled — Microsoft's protected-API tenant gate returns 403 without separate approval. 1:1/group Teams chats work. See `CLAUDE.md` §8–§9.

---

## Security notes

- Sign-in is gated to `@eclectik.co` Microsoft accounts via Supabase Azure OAuth.
- `SUPABASE_SERVICE_KEY` and all other server keys are **server-only** — never commit them, never expose to the browser. Only `VITE_*` vars reach the client, and those are the anon key + URL.
- RLS is on for all tables (uniform authenticated-access policy by design for this team; the boundary is "must be a signed-in Eclectik user," not per-row ownership).
- The `feature-requests` Storage bucket is public-read with authenticated insert.
- Data lives in Supabase Postgres (EU region) with encryption at rest enabled by default.
