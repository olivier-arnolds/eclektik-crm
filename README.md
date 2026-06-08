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
- **Funnel** — 7-stage drag-and-drop pipeline (`qualify → develop → proposal → close → onboarding → active → sleeping`); dragging a lead onto an opportunity-only stage auto-promotes it from `leads` to `opportunities` (`lane-funnel.jsx`, `adapters.js`, `lead-promote.js`). Deal cards carry a **region stripe** (red = US, blue = EMEA) and their **deal number** (`D-####`).
- **Account 360** — open / active / sleeping projects per company, with tasks and owners (`lane-accounts.jsx`). Includes an **AI Summary brief** (`api/account-summary.js`, Anthropic), **SharePoint document links** general + per-deal (`doc-links-section.jsx`, `document_links` table), the linked Partners / Eclectik-team, and core fields incl. country + **state** and the **account number** (`A-####`).
- **Reporting** — revenue & pipeline dashboard (`lane-reporting.jsx`): KPIs, won-revenue-per-quarter chart with **YoY deltas**, **US/EMEA region split** with per-region subtotals, **Win/loss by line** (with average deal size), trend/crossing, dormant-client list. Reads live from the CRM.
- **War room** — three tabs (`lane-warroom.jsx`): **Projects** (running Glint delivery synced from Yarmilla's Master Project Overview into `glint_delivery` via `api/glint-sync.js`, with CS/PS/support hours and deal value), **Insights review** (clients × quarters matrix from the People Science DB — green = analysis on record, red = survey only, ❊ = deal signed, operational marker, a 4-quarter **forecast** of the next survey/deal, CS·PS contractor initials, grouped US/EMEA), and **Client coverage** (Eclectik-team × client matrix).
- **Comms** — unified email / Microsoft Teams / LinkedIn, threaded chat view; LinkedIn is fetched **live** from Unipile per user (`lane-comms.jsx`, `api/unipile.js`, `api/unipile-webhook.js`).
- **Calendar / agenda** — meetings and tasks for the current owner (`lane-calendar.jsx`), synced from Microsoft Graph (`sync-events.js`, `src/lib/graph.js`); a world-clock/date status bar (`statusbar.jsx`).
- **Tasks** — task list with a **"With"** field (the Eclectik-team member involved) alongside "For", sortable and editable everywhere (`tasks-view.jsx`, `task-detail-modal.jsx`, `inline-details.jsx`).
- **Marketing** — contacts, tags, CSV export, campaign composer and per-recipient send via Resend (`marketing-*.jsx`, `api/marketing-send.js`, `api/marketing-webhook.js`).
- **Playbooks** — visual workflow builder on React Flow, with versioning/validation (`src/components/playbooks/**`); scheduled execution via a weekday cron (`api/playbook-execute.js`).
- **Signals** — daily LinkedIn-post polling for tracked subjects (`api/signals-poll.js`), surfaced as follow-up suggestions.
- **Admin** — weekly database export emailed to recipients (`api/admin-weekly-export.js`), plus the Feedback inbox (`admin-view.jsx`).
- **Feedback workflow** — in-app 💡 button queues feature requests that Claude can pull and work through (`feedback-modal.jsx`, `api/next-feature-request.js`; see below).
- **Numbering** — every deal gets a `D-####` number on creation (one sequence across opportunities + leads) and every account an `A-####` number — assigned by DB triggers, shown on funnel cards, deal detail, the Account 360 and the accounts grid. See [Conventions](#conventions--learned-protocols).

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

# People Science DB (read-only cross-project, for the War room Insights review)
PS_SUPABASE_URL=https://yvhiowhiertndhyahvgh.supabase.co
PS_SUPABASE_KEY=<service_role key>              # MUST be service_role — anon is blocked by PS RLS

# Microsoft Graph app-only (for /api/glint-sync — reading Yarmilla's xlsx)
GRAPH_TENANT_ID=<tenant id>
GRAPH_CLIENT_ID=<app registration id>
GRAPH_CLIENT_SECRET=<client secret>             # needs Files.Read.All (admin consent)
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

Schema is tracked as SQL files (repo root for older ones, `sql/` for newer). Claude can apply migrations/data-fixes directly via the **Supabase MCP** (CRM project ref `jdzaypckluncdwsoxurs`) — see [Conventions](#conventions--learned-protocols) for the backup-first protocol — or hand the SQL to the team for the Supabase SQL Editor.

```
schema_bd_dashboard.sql            # core CRM tables (companies, contacts, leads, opportunities, activity, …)
schema_playbooks_v2*.sql           # playbook graph tables + verify/cleanup/rollback
schema_account_briefs.sql          # account_briefs — cached AI Summary briefs
schema_tasks_with_member.sql       # tasks.with_contact_id ("With" field)
schema_glint_delivery.sql          # glint_delivery — War room Projects rows (synced)
schema_companies_state.sql         # companies.state
sql/schema_document_links.sql      # document_links — SharePoint links (account + per-deal)
sql/schema_numbering_2026-06-07.sql# A-#### / D-#### sequences + triggers + backfill
sql/data_normalize_country_*.sql   # one-time: companies.country → full English names
```

Notable columns added over time: `companies.{country (normalized full names), state, account_no, teams_url}`, `opportunities.deal_no`, `leads.deal_no`, `tasks.with_contact_id`. Backups from data-quality passes are kept as `_dq_backup_*` / `_*_backup_*` tables and dropped after they're confirmed good.

The People Science **Insights review** matrix reads a *separate* Supabase project (`yvhiowhiertndhyahvgh`, tables `clients` / `cycles` / `analyses`) via `api/insights-review.js` using `PS_SUPABASE_KEY` (service_role — anon is blocked by PS RLS).

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
| `account-summary.js` | AI Account 360 brief from assembled interactions (Anthropic) |
| `suggest-task.js` | AI task suggestion from an email (Anthropic) |
| `anthropic-generate.js` | Generic Anthropic generation helper |
| `glint-sync.js` | App-only Graph read of Yarmilla's Master Project Overview.xlsx → `glint_delivery` (needs `GRAPH_*` + Files.Read.All) |
| `insights-review.js` | Reads the People Science DB (separate Supabase) → War room Insights matrix |
| `signals-poll.js` | Daily LinkedIn-post polling for tracked subjects → `signals` |
| `suggestions-expire.js` | Ages out stale playbook suggestions |
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
│   ├── company-insights.js  account-summary.js  suggest-task.js  anthropic-generate.js
│   ├── glint-sync.js  insights-review.js        # War room data sources
│   ├── signals-poll.js  suggestions-expire.js
│   ├── playbook-execute.js  admin-weekly-export.js
│   └── feedback-notify.js  next-feature-request.js
├── src/
│   ├── main.jsx  App.jsx  supabase.js
│   ├── bd/                           # the BD workspace — lanes, modals, adapters
│   │   ├── BDApp.jsx                 # view switcher (Reporting/War room/Tasks/workspace/Marketing/Admin/Playbooks)
│   │   ├── lane-funnel.jsx  lane-comms.jsx  lane-calendar.jsx  lane-accounts.jsx
│   │   ├── lane-reporting.jsx  lane-warroom.jsx          # Reporting + War room (Projects/Insights/Coverage)
│   │   ├── doc-links-section.jsx  account-links-section.jsx  statusbar.jsx
│   │   ├── adapters.js  useBDData.js  lead-promote.js  sync-events.js  changelog.js
│   │   ├── marketing-*.jsx           # contacts, campaigns, composer, tags
│   │   ├── admin-view.jsx  tasks-view.jsx  feedback-modal.jsx  inline-details.jsx
│   │   └── *-modal.jsx               # deal/contact/task/meeting/etc. modals
│   ├── components/
│   │   ├── auth/  accounts/  contacts/  inbox/  detail/  forms/  layout/  views/  atoms/  cards/
│   │   └── playbooks/                # React-Flow builder: nodes/, panels/, lib/
│   ├── hooks/                        # usePipelineData, useEmailComms, useLinkedIn*, useTeams*, …
│   └── lib/                          # auth.jsx, graph.js, constants.js, template-vars.js
├── schema_*.sql  sql/*.sql           # DB schema/migrations (root = older, sql/ = newer)
├── docs/                             # data-quality reports, runbooks, field guides
├── public/warroom-projects-field-guide.md   # Yarmilla's project-sheet usage guide
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

> Note: Microsoft Teams **1:1/group chats** work. **Workspace channels** stayed blocked for a long time (protected-API tenant gate → 403); per-account channel reading was wired behind the `GRAPH_*` app-only credentials + Files.Read.All admin consent — only active once those env vars are set. See `CLAUDE.md` §8–§9.

---

## Conventions & learned protocols

Hard-won rules from working on this repo. The deep version lives in [`CLAUDE.md`](./CLAUDE.md); this is the short list.

**Versioning — every change.** Bump `VERSION` and `package.json` `version`, add a matching entry to `src/bd/changelog.js` (rendered in the in-app Log tab), and tag the commit `v<version>`. semver: patch = fix, minor = feature, major = big. Keep the three in lockstep.

**Git workflow.** Commit each step separately; **always ask before `git push`**. Olivier pushes concurrently — if `main` diverges, reconcile (fetch + rebase) on a real machine, not in the sandbox (the sandbox can't reliably unlink/rename working-tree files, which leaves a stuck `index.lock`). Never force-move tags or run destructive git in the sandbox.

**Build verification.** `npm run build` in the sandbox fails to wipe the existing `dist/` (EPERM unlink). Build to a throwaway dir instead — `npx vite build --outDir "dist_v$(date +%s)"` — confirm "✓ built", then `rm -rf dist_v*`. These dirs are git-ignored (`dist_*`, `dist_check`).

**Database (Supabase MCP).** Claude has MCP access to the CRM project (`jdzaypckluncdwsoxurs`) and the read-only People Science project (`yvhiowhiertndhyahvgh`). Protocol for any data change: (1) take a backup table first — `create table _dq_backup_<t>_YYYYMMDD as select * from <t>`; (2) apply via `apply_migration` (DDL) or `execute_sql` (data); (3) verify counts/samples before and after; (4) still confirm with the team before irreversible deletes. Save the SQL into `sql/` for the record.

**Two-level adapter chain.** New fields must be threaded through *both* `usePipelineData` (row→shape) and `adapters.js` (BD-display). `stageUpdates()` in `adapters.js` is the single source of truth for what a drag-drop writes.

**Region detection gotcha.** The adapter exposes a company's country on **`account.region`**, not `account.country`. Region = US for country in `US / United States / USA`, else EMEA, missing → EMEA. `companies.country` is normalized to full English names; the canonical role assignment for the team lives once in `lane-reporting.jsx` (`ROLE_OVERRIDE`, exported) — don't fork it.

**Numbering.** `A-####` (accounts, all of them) and `D-####` (deals — one shared sequence across `opportunities` + `leads`) are assigned by DB triggers, so they work no matter where a row is created. Numbers are permanent: never reused, never reassigned, kept if a customer churns.

**Reports & docs.** Data-quality findings and runbooks go in `docs/` (e.g. `docs/data-quality-report-*.md`). The War room Projects sheet usage guide is `public/warroom-projects-field-guide.md` (served at `/warroom-projects-field-guide.md`).

---

## Security notes

- Sign-in is gated to `@eclectik.co` Microsoft accounts via Supabase Azure OAuth.
- `SUPABASE_SERVICE_KEY` and all other server keys are **server-only** — never commit them, never expose to the browser. Only `VITE_*` vars reach the client, and those are the anon key + URL.
- RLS is on for all tables (uniform authenticated-access policy by design for this team; the boundary is "must be a signed-in Eclectik user," not per-row ownership).
- The `feature-requests` Storage bucket is public-read with authenticated insert.
- Data lives in Supabase Postgres (EU region) with encryption at rest enabled by default.
