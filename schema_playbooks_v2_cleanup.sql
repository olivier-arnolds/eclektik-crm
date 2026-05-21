-- ============================================================
-- Eclektik CRM — Playbooks v2 cleanup (run LATER)
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
