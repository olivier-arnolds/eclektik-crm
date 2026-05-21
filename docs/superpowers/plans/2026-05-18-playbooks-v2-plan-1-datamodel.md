# Playbooks v2 — Plan 1: Datamodel & migratie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg het nieuwe graph-gebaseerde datamodel voor Playbooks v2 toe aan Supabase: 7 nieuwe tabellen, 3 uitgebreide tabellen, en converteer bestaande `playbook_steps`-data naar `playbook_nodes` + `playbook_edges`. Eindstand: alle nieuwe tabellen draaien, lopende enrollments hebben `current_node_id` gevuld, bestaande Playbooks-UI blijft tijdelijk werken op de oude `playbook_steps` tabel (die pas in cleanup-script wordt gedropt).

**Architecture:** Pure SQL-migratie in 4 files aan repo-root (consistent met bestaande `schema_bd_dashboard.sql`):
1. `schema_playbooks_v2.sql` — schema-creatie + ALTERs + data-conversie (run NU)
2. `schema_playbooks_v2_verify.sql` — verificatie-queries (read-only)
3. `schema_playbooks_v2_cleanup.sql` — drop `playbook_steps` na 24h stable (run LATER)
4. `schema_playbooks_v2_rollback.sql` — emergency undo (alleen bij ramp)

Migratie is **additief**: bestaande tabellen + kolommen worden niet gedropt in dit plan, zodat de huidige Playbooks-UI blijft werken tijdens de overgang. Code-wijzigingen volgen in Plan 2 (builder) en Plan 3 (engine).

**Tech Stack:** Supabase (PostgreSQL 15), `gen_random_uuid()`, jsonb, PL/pgSQL DO-blocks, partial indexes.

---

## File Structure

Files created in dit plan:
- `schema_playbooks_v2.sql` — main migratie
- `schema_playbooks_v2_verify.sql` — verificatie-queries
- `schema_playbooks_v2_cleanup.sql` — cleanup (run later)
- `schema_playbooks_v2_rollback.sql` — emergency rollback

Files modified in dit plan: **geen** (geen code-wijzigingen, alleen DB-schema).

Out-of-scope voor dit plan:
- Frontend Playbooks-UI wijzigingen → Plan 2
- Backend execution-engine wijzigingen → Plan 3
- Signal-system auto-fill van `signal_subjects` → Plan 4
- Seeding van Sleeping Reactivation playbook → Plan 5

---

## Task 1: Schrijf main migratie-script

**Files:**
- Create: `schema_playbooks_v2.sql` (repo root)

- [ ] **Step 1: Maak `schema_playbooks_v2.sql` aan met dit volledige content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 datamodel migratie
-- Datum: 2026-05-18
-- ============================================================
-- Dit script:
--   1. Creëert 7 nieuwe tabellen voor het graph-gebaseerde playbook-systeem
--   2. Breidt 3 bestaande tabellen uit (playbooks, playbook_enrollments, playbook_executions)
--   3. Converteert bestaande playbook_steps data naar playbook_nodes + edges
--   4. Voegt indexen toe
--
-- LET OP: dit script is ADDITIEF — bestaande tabellen worden NIET gedropt.
-- Drop van playbook_steps gebeurt in een aparte cleanup-script na 24h stable run.
-- ============================================================

-- =====================
-- STAP 1: Nieuwe tabellen
-- =====================

-- 1a. playbook_versions — graph-snapshot per published version
create table public.playbook_versions (
  id              uuid primary key default gen_random_uuid(),
  playbook_id     uuid not null references public.playbooks(id) on delete cascade,
  version         int not null,
  graph_snapshot  jsonb not null,
  published_at    timestamptz default now(),
  published_by    text
);
comment on table public.playbook_versions is 'Immutable graph-snapshot per published playbook-version. Lopende enrollments lezen vanaf hier.';
create index idx_playbook_versions_playbook on public.playbook_versions(playbook_id, version);

-- 1b. playbook_nodes — graph nodes (vervangt playbook_steps na cleanup)
create table public.playbook_nodes (
  id            uuid primary key default gen_random_uuid(),
  playbook_id   uuid not null references public.playbooks(id) on delete cascade,
  node_type     text not null,
  config        jsonb not null default '{}'::jsonb,
  pos_x         numeric default 0,
  pos_y         numeric default 0,
  created_at    timestamptz default now()
);
comment on table public.playbook_nodes is 'Graph-nodes voor visual workflow builder. node_type bepaalt config-shape.';
create index idx_playbook_nodes_playbook on public.playbook_nodes(playbook_id);

-- 1c. playbook_edges — verbindingen tussen nodes, conditioneel
create table public.playbook_edges (
  id               uuid primary key default gen_random_uuid(),
  playbook_id      uuid not null references public.playbooks(id) on delete cascade,
  source_node_id   uuid not null references public.playbook_nodes(id) on delete cascade,
  target_node_id   uuid not null references public.playbook_nodes(id) on delete cascade,
  condition_label  text,
  condition_expr   jsonb,
  created_at       timestamptz default now()
);
comment on table public.playbook_edges is 'Directed edges in playbook graph. Branch-nodes hebben meerdere outgoing edges met condition_expr.';
create index idx_playbook_edges_source on public.playbook_edges(source_node_id);
create index idx_playbook_edges_target on public.playbook_edges(target_node_id);

-- 1d. signals — gedetecteerde externe events (LinkedIn posts in V1)
create table public.signals (
  id               uuid primary key default gen_random_uuid(),
  source           text not null,
  source_id        text not null,
  contact_id       uuid references public.contacts(id) on delete cascade,
  company_id       uuid references public.companies(id) on delete cascade,
  content          text,
  post_url         text,
  relevance_score  numeric check (relevance_score >= 0 and relevance_score <= 1),
  scoring_reason   text,
  topic_tags       text[],
  posted_at        timestamptz,
  detected_at      timestamptz default now(),
  resolved_at      timestamptz,
  unique (source, source_id)
);
comment on table public.signals is 'Externe signalen (LinkedIn posts, company news) gedetecteerd door daily cron.';
create index idx_signals_contact on public.signals(contact_id) where contact_id is not null;
create index idx_signals_company on public.signals(company_id) where company_id is not null;
create index idx_signals_unscored on public.signals(detected_at) where relevance_score is null;

-- 1e. signal_subjects — wie/wat pollen we
create table public.signal_subjects (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid references public.contacts(id) on delete cascade,
  company_id     uuid references public.companies(id) on delete cascade,
  source_type    text not null,
  enabled        boolean not null default true,
  last_polled_at timestamptz,
  auto_added     boolean not null default false,
  created_at     timestamptz default now(),
  check ((contact_id is not null and company_id is null) or (contact_id is null and company_id is not null))
);
comment on table public.signal_subjects is 'Configuratie: welke contacten/companies worden door signals-poll cron benaderd.';
create index idx_signal_subjects_enabled on public.signal_subjects(enabled, last_polled_at) where enabled = true;

-- 1f. playbook_suggestions — pending suggesties wachtend op user-confirm
create table public.playbook_suggestions (
  id             uuid primary key default gen_random_uuid(),
  playbook_id    uuid not null references public.playbooks(id) on delete cascade,
  contact_id     uuid references public.contacts(id) on delete cascade,
  deal_id        uuid references public.opportunities(id) on delete cascade,
  source         text not null,
  source_context jsonb,
  status         text not null default 'pending',
  enrollment_id  uuid references public.playbook_enrollments(id) on delete set null,
  resolved_by    text,
  created_at     timestamptz default now(),
  resolved_at    timestamptz
);
comment on table public.playbook_suggestions is 'Pending playbook-suggesties. Status: pending/started/dismissed/expired.';
create index idx_playbook_suggestions_pending on public.playbook_suggestions(created_at) where status = 'pending';

-- 1g. playbook_drafts — klaar-voor-review berichten
create table public.playbook_drafts (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null references public.playbook_enrollments(id) on delete cascade,
  node_id             uuid not null references public.playbook_nodes(id) on delete cascade,
  channel             text not null,
  to_contact_id       uuid references public.contacts(id) on delete cascade,
  subject             text,
  body                text,
  body_original       text,
  status              text not null default 'pending',
  external_message_id text,
  generated_at        timestamptz default now(),
  edited_at           timestamptz,
  resolved_at         timestamptz
);
comment on table public.playbook_drafts is 'Email/LinkedIn/WhatsApp/Instagram drafts wachtend op review en verzending.';
create index idx_playbook_drafts_pending on public.playbook_drafts(generated_at) where status = 'pending';
create index idx_playbook_drafts_enrollment on public.playbook_drafts(enrollment_id);

-- =====================
-- STAP 2: Uitbreidingen bestaande tabellen
-- =====================

-- 2a. playbooks — trigger configuratie + version-tracking
alter table public.playbooks
  add column if not exists trigger_type   text,
  add column if not exists trigger_config jsonb default '{}'::jsonb,
  add column if not exists version        int default 1;

-- 2b. playbook_enrollments — graph-state i.p.v. linear step
alter table public.playbook_enrollments
  add column if not exists current_node_id  uuid references public.playbook_nodes(id) on delete set null,
  add column if not exists version_at_start int,
  add column if not exists replied_at       timestamptz,
  add column if not exists next_action_at   timestamptz;

-- 2c. playbook_executions — voeg node_id toe naast step_id (additief)
alter table public.playbook_executions
  add column if not exists node_id uuid references public.playbook_nodes(id) on delete cascade;

-- =====================
-- STAP 3: Convert bestaande playbook_steps → playbook_nodes + edges
-- =====================

do $$
declare
  pb record;
  st record;
  prev_id uuid;
  new_id uuid;
  total_converted int := 0;
begin
  for pb in select id from public.playbooks loop
    prev_id := null;
    for st in select * from public.playbook_steps
              where playbook_id = pb.id
              order by step_number loop
      new_id := gen_random_uuid();

      -- Map old step_type to new node_type
      insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
      values (
        new_id,
        pb.id,
        case st.step_type
          when 'email' then 'action_email_draft'
          when 'linkedin_invite' then 'action_linkedin_draft'
          when 'call' then 'action_internal_task'
          when 'wait' then 'logic_wait'
          else 'action_internal_task'
        end,
        jsonb_build_object(
          'subject', st.subject,
          'body', st.body,
          'delay_days', coalesce(st.delay_days, 0),
          'migrated_from_step_id', st.id::text
        ),
        0,
        st.step_number * 120
      );

      -- Linear edge van vorige node naar deze
      if prev_id is not null then
        insert into public.playbook_edges (playbook_id, source_node_id, target_node_id)
        values (pb.id, prev_id, new_id);
      end if;

      prev_id := new_id;
      total_converted := total_converted + 1;
    end loop;
  end loop;

  raise notice 'Converted % step(s) into playbook_nodes', total_converted;
end $$;

-- Update lopende enrollments: current_step → current_node_id (best-effort match)
update public.playbook_enrollments e
set current_node_id = n.id
from public.playbook_nodes n
where n.config->>'migrated_from_step_id' = e.current_step::text
  and e.current_step is not null
  and e.current_node_id is null;
```

- [ ] **Step 2: Verifieer file syntax door 'm te openen in editor**

Open `schema_playbooks_v2.sql` en check:
- Geen rode squigglies (syntax errors) in je editor
- Eindigt op een ; per statement
- Geen merge-conflict markers (`<<<<<<<`)

- [ ] **Step 3: Commit**

```bash
git add schema_playbooks_v2.sql
git commit -m "$(cat <<'EOF'
feat(playbooks-v2): schema migration for graph datamodel

Voegt 7 nieuwe tabellen toe (playbook_versions, playbook_nodes,
playbook_edges, signals, signal_subjects, playbook_suggestions,
playbook_drafts) en breidt 3 bestaande tabellen uit (playbooks,
playbook_enrollments, playbook_executions). Converteert bestaande
playbook_steps naar nodes + lineaire edges.

Additief: oude playbook_steps blijft staan tot cleanup-script
24h na stable run wordt uitgevoerd.

Plan 1, Task 1.
EOF
)"
```

Expected: commit success, working tree clean (één nieuwe file).

---

## Task 2: Schrijf verificatie-queries

**Files:**
- Create: `schema_playbooks_v2_verify.sql` (repo root)

- [ ] **Step 1: Maak `schema_playbooks_v2_verify.sql` aan met dit content:**

```sql
-- ============================================================
-- Verificatie-queries voor Playbooks v2 migratie
-- ============================================================
-- Run NA schema_playbooks_v2.sql. Elke sectie moet matchen aan expected.
-- ============================================================

-- ===== Section 1: Confirm new tables exist =====
select count(*) as new_tables_count
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'playbook_versions',
    'playbook_nodes',
    'playbook_edges',
    'signals',
    'signal_subjects',
    'playbook_suggestions',
    'playbook_drafts'
  );
-- Expected: 7

-- ===== Section 2: Confirm new columns =====
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'playbooks' and column_name in ('trigger_type', 'trigger_config', 'version'))
    or (table_name = 'playbook_enrollments' and column_name in ('current_node_id', 'version_at_start', 'replied_at', 'next_action_at'))
    or (table_name = 'playbook_executions' and column_name = 'node_id')
  )
order by table_name, column_name;
-- Expected: 8 rijen
--   playbook_enrollments | current_node_id
--   playbook_enrollments | next_action_at
--   playbook_enrollments | replied_at
--   playbook_enrollments | version_at_start
--   playbook_executions  | node_id
--   playbooks            | trigger_config
--   playbook             | trigger_type
--   playbooks            | version

-- ===== Section 3: Data conversion check =====
select
  (select count(*) from public.playbook_steps) as old_steps,
  (select count(*) from public.playbook_nodes) as new_nodes;
-- Expected: new_nodes >= old_steps (één-op-één conversie)

-- ===== Section 4: Edge-count check =====
-- Aantal edges = aantal nodes minus aantal playbooks-met-nodes
-- (eerste node per playbook heeft geen inkomende edge)
select
  (select count(*) from public.playbook_nodes) as nodes,
  (select count(distinct playbook_id) from public.playbook_nodes) as playbooks_with_nodes,
  (select count(*) from public.playbook_edges) as edges;
-- Expected: edges = nodes - playbooks_with_nodes

-- ===== Section 5: Active enrollments matched =====
-- Lopende enrollments moeten current_node_id hebben (tenzij current_step null was)
select count(*) as active_enrollments_missing_node_id
from public.playbook_enrollments
where status = 'active'
  and current_node_id is null
  and current_step is not null;
-- Expected: 0

-- ===== Section 6: Spot-check een paar node configs =====
select n.id, n.node_type, n.config->>'subject' as subject, n.config->>'migrated_from_step_id' as old_step_id
from public.playbook_nodes n
limit 5;
-- Expected: alle nodes hebben node_type beginning met action_ of logic_,
--   subject is gevuld voor email/linkedin nodes, migrated_from_step_id is gevuld

-- ===== Section 7: Indexes aangemaakt =====
select indexname from pg_indexes
where schemaname = 'public'
  and indexname like 'idx_playbook%' or indexname like 'idx_signal%';
-- Expected: 9 indexen
--   idx_playbook_drafts_enrollment
--   idx_playbook_drafts_pending
--   idx_playbook_edges_source
--   idx_playbook_edges_target
--   idx_playbook_nodes_playbook
--   idx_playbook_suggestions_pending
--   idx_playbook_versions_playbook
--   idx_signal_subjects_enabled
--   idx_signals_company
--   idx_signals_contact
--   idx_signals_unscored
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_verify.sql
git commit -m "$(cat <<'EOF'
feat(playbooks-v2): verification queries for migration

Read-only SQL met expected results per sectie. Te runnen na
schema_playbooks_v2.sql om migratie-correctheid te controleren.

Plan 1, Task 2.
EOF
)"
```

---

## Task 3: Schrijf cleanup-script (run later, na 24h stable)

**Files:**
- Create: `schema_playbooks_v2_cleanup.sql` (repo root)

- [ ] **Step 1: Maak `schema_playbooks_v2_cleanup.sql` aan met dit content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 cleanup (run LATER)
-- ============================================================
-- LET OP: alleen uitvoeren NADAT het nieuwe systeem 24h stable draait.
-- Dit script DROPT de oude playbook_steps tabel en current_step kolom.
-- Onomkeerbaar zonder backup.
-- ============================================================

-- =====================
-- STAP 1: Drop oude tabel (cascade verwijdert ook FK-references)
-- =====================
drop table if exists public.playbook_steps cascade;

-- =====================
-- STAP 2: Drop oude kolommen
-- =====================
alter table public.playbook_enrollments drop column if exists current_step;
alter table public.playbook_executions  drop column if exists step_id;

-- =====================
-- STAP 3: Verifieer
-- =====================
select
  not exists (select 1 from information_schema.tables
              where table_schema='public' and table_name='playbook_steps') as steps_table_dropped,
  not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='playbook_enrollments' and column_name='current_step') as current_step_dropped,
  not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='playbook_executions' and column_name='step_id') as step_id_dropped;
-- Expected: alle drie true
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_cleanup.sql
git commit -m "$(cat <<'EOF'
feat(playbooks-v2): cleanup script — drop old tables after stable run

Drop playbook_steps tabel, current_step en step_id kolommen.
Alleen uit te voeren NA 24h stable draaien op nieuwe schema.

Plan 1, Task 3.
EOF
)"
```

---

## Task 4: Schrijf rollback-script (emergency only)

**Files:**
- Create: `schema_playbooks_v2_rollback.sql` (repo root)

- [ ] **Step 1: Maak `schema_playbooks_v2_rollback.sql` aan met dit content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 rollback (EMERGENCY ONLY)
-- ============================================================
-- Alleen uitvoeren als er iets ernstigs misgaat met de migratie EN
-- voordat schema_playbooks_v2_cleanup.sql is uitgevoerd.
-- 
-- Bestaande playbook_steps en current_step blijven intact wanneer
-- cleanup nog niet draaide — rollback is dan veilig.
-- ============================================================

-- STAP 1: Drop nieuwe kolommen op bestaande tabellen
alter table public.playbook_executions drop column if exists node_id;
alter table public.playbook_enrollments
  drop column if exists current_node_id,
  drop column if exists version_at_start,
  drop column if exists replied_at,
  drop column if exists next_action_at;
alter table public.playbooks
  drop column if exists trigger_type,
  drop column if exists trigger_config,
  drop column if exists version;

-- STAP 2: Drop nieuwe tabellen (in reverse FK-dependency volgorde)
drop table if exists public.playbook_drafts cascade;
drop table if exists public.playbook_suggestions cascade;
drop table if exists public.signal_subjects cascade;
drop table if exists public.signals cascade;
drop table if exists public.playbook_edges cascade;
drop table if exists public.playbook_nodes cascade;
drop table if exists public.playbook_versions cascade;

-- Verifieer: oude tabellen onveranderd
select count(*) as old_steps_intact from public.playbook_steps;
-- Expected: zelfde aantal als vóór migratie
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_rollback.sql
git commit -m "$(cat <<'EOF'
feat(playbooks-v2): rollback script — emergency undo

Drop alle nieuwe tabellen en kolommen. Alleen uit te voeren als migratie
faalt en cleanup nog niet gedraaid is.

Plan 1, Task 4.
EOF
)"
```

---

## Task 5: Olivier — Supabase backup vóór migratie-run

- [ ] **Step 1: Open Supabase project dashboard**

Browser → https://supabase.com/dashboard → kies Eclectik CRM project.

- [ ] **Step 2: Maak handmatige backup**

Settings → Database → Backups → klik **"Create backup"** of **"Trigger backup now"**.

- [ ] **Step 3: Wacht tot backup voltooid is**

Status moet "Completed" tonen. Noteer datum + tijd voor referentie. Bewaar deze info — hier vallen we op terug als rollback nodig blijkt.

Expected: backup listed met status Completed, tijd binnen laatste 5 minuten.

---

## Task 6: Olivier — Run main migratie in Supabase SQL Editor

- [ ] **Step 1: Open SQL Editor**

Supabase Dashboard → SQL Editor → klik **"New query"** of **"+"**.

- [ ] **Step 2: Kopieer volledige content van `schema_playbooks_v2.sql`**

Vanuit je editor: open het file, select-all, copy.

- [ ] **Step 3: Plak in SQL Editor en run**

Plak in Supabase SQL Editor. Klik **"Run"** (of cmd+Enter).

Expected: 
- Output panel toont meerdere "Success" meldingen
- Bij STAP 3 zie je een NOTICE: "Converted N step(s) into playbook_nodes" (waarbij N = aantal bestaande steps; voor jullie codebase waarschijnlijk 0-10)
- Geen error-rode meldingen
- Run-tijd: < 30 seconden

Bij error:
- Lees de error-tekst — meestal een specifieke constraint of typo
- Stop met dit plan
- Run `schema_playbooks_v2_rollback.sql` om partial state op te ruimen
- Meld de error terug zodat we de migratie kunnen fixen

- [ ] **Step 4: Check Tables-view**

Sidebar → Table editor → links scrollen door tabellen-lijst.

Expected: nieuwe tabellen zichtbaar in alphabetical sort:
- `playbook_drafts`
- `playbook_edges`
- `playbook_nodes`
- `playbook_suggestions`
- `playbook_versions`
- `signal_subjects`
- `signals`

---

## Task 7: Olivier — Run verificatie-queries

- [ ] **Step 1: Open nieuw query-tabblad in SQL Editor**

- [ ] **Step 2: Kopieer volledige content van `schema_playbooks_v2_verify.sql`**

- [ ] **Step 3: Plak en run**

Bekijk de output per sectie. Run desnoods sectie-voor-sectie (selecteer alleen die query en run).

- [ ] **Step 4: Vergelijk results met expected per sectie**

| Sectie | Expected |
|---|---|
| 1 — new_tables_count | 7 |
| 2 — kolom-rijen | 8 |
| 3 — old_steps vs new_nodes | new_nodes >= old_steps |
| 4 — edges-count | edges = nodes - playbooks_with_nodes |
| 5 — missing node_id | 0 |
| 6 — node-spot-check | nodes hebben node_type, subject voor email-nodes |
| 7 — indexes | 11 indexen (lichte variatie OK) |

Bij mismatch: noteer welke sectie en wat je ziet. Geef het door zodat we kunnen diagnostiseren.

---

## Task 8: Smoke-test in browser

- [ ] **Step 1: Open de live Eclectik CRM**

https://crm.eclectik-insights.co — log in.

- [ ] **Step 2: Navigeer naar Playbooks-tab**

Topbar → klik op `Playbooks`-link (of via `?view=playbooks` URL).

- [ ] **Step 3: Verifieer dat de pagina laadt zonder errors**

Expected:
- Playbooks-lijst rendert (bestaande playbooks zichtbaar, of leeg als er geen waren)
- Geen console-errors in browser dev-tools
- Klikken op een bestaande playbook opent PlaybookDetail (toont steps)
- Steps zijn dezelfde als vóór de migratie (van `playbook_steps`, niet `playbook_nodes`)

Waarom werkt dit nog? De bestaande frontend leest `playbook_steps` — die tabel staat nog. De nieuwe `playbook_nodes` worden pas in Plan 2 (builder) gelezen.

- [ ] **Step 4: Klik door naar contact-detail-paneel**

Open een willekeurig contact (Funnel-view → klik op een deal → contact-card).

Expected: 
- "Enroll in playbook"-knop werkt (of toont geen actieve playbooks als er geen zijn)
- Geen errors in console

- [ ] **Step 5: Documenteer de uitkomst**

Maak een korte notitie in een chat-bericht of email aan jezelf: "Plan 1 uitgevoerd op [datum + tijd], migratie geslaagd, smoke-test groen. Cleanup script run-datum: [datum + 24h]."

---

## Task 9: Mark "cleanup pending" — wachten tot 24h stable

- [ ] **Step 1: Voeg een herinnering toe**

Persoonlijke kalender of TODO-app: "Run `schema_playbooks_v2_cleanup.sql` op [datum + 24h]". 

NIET nu runnen — als binnen 24h een issue blijkt met de nieuwe tabellen heeft rollback dan een schone undo-pad.

- [ ] **Step 2: Plan 1 is afgerond**

Eindstand:
- ✅ 7 nieuwe tabellen draaien
- ✅ 3 bestaande tabellen uitgebreid
- ✅ Bestaande playbook_steps geconverteerd naar nodes + edges
- ✅ Lopende enrollments hebben current_node_id
- ✅ Bestaande UI werkt nog op oude tabel
- ⏳ Cleanup-run scheduled voor +24h

Volgende: Plan 2 — Visuele builder (React Flow integration, node-palette, property panel, validatie, versioning).

---

## Plan 1 — Self-review notes

**Spec coverage** (uit `2026-05-18-playbooks-v2-design.md` sectie 4 + 9):
- ✅ playbook_nodes tabel — Task 1, Step 1
- ✅ playbook_edges tabel — Task 1, Step 1
- ✅ playbook_versions tabel — Task 1, Step 1
- ✅ signals tabel — Task 1, Step 1
- ✅ signal_subjects tabel — Task 1, Step 1
- ✅ playbook_suggestions tabel — Task 1, Step 1
- ✅ playbook_drafts tabel — Task 1, Step 1
- ✅ ALTER playbooks (trigger_type, trigger_config, version) — Task 1, Step 1
- ✅ ALTER playbook_enrollments (current_node_id, version_at_start, replied_at, next_action_at) — Task 1, Step 1
- ✅ ALTER playbook_executions (node_id) — Task 1, Step 1
- ✅ Data conversie playbook_steps → nodes + edges — Task 1, Step 1
- ✅ Verificatie-queries — Task 2
- ✅ Cleanup-script — Task 3
- ✅ Rollback-plan — Task 4
- ✅ Backup procedure — Task 5
- ✅ Smoke-test — Task 8
- ⏳ signal_subjects auto-fill — gedeferreerd naar Plan 4 (signals fase)

**Placeholder scan**: geen TBD/TODO. Alle SQL is concreet en runnable.

**Type consistency**: node_type strings (`action_email_draft`, `logic_wait` etc.) matchen exact wat in design-doc sectie 4 staat als `playbook_nodes.node_type` enum.

**Out-of-scope geverifieerd**: geen frontend-code-wijzigingen, geen JS/JSX files aangepast — pas in Plan 2.
