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
--   playbooks            | trigger_type
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
  and (indexname like 'idx_playbook%' or indexname like 'idx_signal%')
order by indexname;
-- Expected: 13 indexen (was 11 in plan; uitgebreid met idx_playbook_edges_playbook,
--   idx_playbook_suggestions_contact, idx_playbook_suggestions_deal in review-iteration)

-- ===== Section 8: RLS policies present =====
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'playbook_versions', 'playbook_nodes', 'playbook_edges',
    'signals', 'signal_subjects', 'playbook_suggestions', 'playbook_drafts'
  )
order by tablename;
-- Expected: 7 rijen, één policy per nieuwe tabel
--   policyname pattern: 'auth users full access on <table>'
