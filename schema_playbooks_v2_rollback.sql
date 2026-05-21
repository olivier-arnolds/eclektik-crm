-- ============================================================
-- Eclektik CRM — Playbooks v2 rollback (EMERGENCY ONLY)
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
