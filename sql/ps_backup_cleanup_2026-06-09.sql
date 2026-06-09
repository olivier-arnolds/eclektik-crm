-- ============================================================================
-- People Science project (yvhiowhiertndhyahvgh) — backup-table cleanup
-- Date: 2026-06-09
-- Run in: People Science Supabase SQL Editor (NOT the CRM project)
--
-- Why: 15 tables (the *_backup_2026_06_04 set + analyses_v1_archive) have RLS
-- disabled, so anyone with the anon key can read/modify them. They duplicate
-- client data.
--
-- Verified before writing this script (2026-06-09):
--   * analyses_backup_2026_06_04 is 100% contained in analyses_v1_archive
--   * clients/cycles/benchmarks/benchmark_cohorts/change_log/version_log/
--     how_i_work/tools_sources/methodologies/analysis_queue backups: every row
--     still exists in the live table → safe to drop
--   * EXCEPTIONS — data that exists ONLY in backups (wiped in Phase 1 reset):
--       items_backup_2026_06_04      36 rows (pre-rebuild item scores)
--       documents_backup_2026_06_04  12 rows (pre-rebuild doc links)
--     These are preserved into RLS-protected v1 archive tables below.
-- ============================================================================

-- ── Step 1: preserve the only non-redundant data ───────────────────────────
create table if not exists items_v1_archive as
  select *, now() as archived_at from items_backup_2026_06_04;

create table if not exists documents_v1_archive as
  select *, now() as archived_at from documents_backup_2026_06_04;

-- ── Step 2: lock down the archives (RLS on; authenticated-only access) ─────
alter table analyses_v1_archive  enable row level security;
alter table items_v1_archive     enable row level security;
alter table documents_v1_archive enable row level security;

create policy "auth users full access on analyses_v1_archive"
  on analyses_v1_archive for all to authenticated using (true) with check (true);
create policy "auth users full access on items_v1_archive"
  on items_v1_archive for all to authenticated using (true) with check (true);
create policy "auth users full access on documents_v1_archive"
  on documents_v1_archive for all to authenticated using (true) with check (true);

-- ── Step 3: verify the archives before dropping anything ───────────────────
-- Expect: items 36/36, documents 12/12, analyses 35/35
select
  (select count(*) from items_v1_archive)     as items_archived,     -- expect 36
  (select count(*) from documents_v1_archive) as documents_archived, -- expect 12
  (select count(*) from analyses_v1_archive)  as analyses_archived;  -- expect 35

-- ── Step 4: drop the redundant backup tables ────────────────────────────────
-- ONLY run after Step 3 returns the expected counts.
drop table if exists clients_backup_2026_06_04;
drop table if exists cycles_backup_2026_06_04;
drop table if exists analyses_backup_2026_06_04;
drop table if exists items_backup_2026_06_04;
drop table if exists documents_backup_2026_06_04;
drop table if exists benchmarks_backup_2026_06_04;
drop table if exists benchmark_cohorts_backup_2026_06_04;
drop table if exists portfolio_content_backup_2026_06_04;
drop table if exists change_log_backup_2026_06_04;
drop table if exists version_log_backup_2026_06_04;
drop table if exists how_i_work_backup_2026_06_04;
drop table if exists tools_sources_backup_2026_06_04;
drop table if exists methodologies_backup_2026_06_04;
drop table if exists analysis_queue_backup_2026_06_04;

-- ── Step 5: confirm no RLS-disabled tables remain ───────────────────────────
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;
-- expect: 0 rows

-- ── Step 6: version + audit log (convention: every change is logged) ────────
-- Note: the v0.10.0 entry states "Backups: intact in *_backup_2026_06_04
-- tables." This entry supersedes that line.
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (
  'v0.10.1', 'version', now(),
  'Backup-table cleanup — RLS exposure closed',
  'Dropped the 14 `*_backup_2026_06_04` tables (RLS was disabled on all of them; '
  || 'anon-key exposure). Verified first: every backup row still existed in the live '
  || 'tables, EXCEPT 36 pre-Phase-1 item scores and 12 document links wiped in the '
  || 'Phase 1 reset — these were preserved into `items_v1_archive` and '
  || '`documents_v1_archive` (RLS enabled, authenticated-only), alongside the existing '
  || '`analyses_v1_archive` (RLS now also enabled). Supersedes the "Backups: intact" '
  || 'line in the v0.10.0 entry. Cleanup SQL: eclektik-crm `sql/ps_backup_cleanup_2026-06-09.sql`.',
  'peoplescience'
);

insert into change_log (table_name, action, note, actor_email)
values ('(schema)', 'DELETE',
  'v0.10.1 — dropped *_backup_2026_06_04 tables after archiving items (36) + documents (12) to v1 archive tables; RLS enabled on all three v1 archives.',
  'marco@eclectik.co');
