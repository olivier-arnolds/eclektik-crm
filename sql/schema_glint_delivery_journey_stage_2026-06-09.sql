-- schema_glint_delivery_journey_stage_2026-06-09.sql
-- Adds journey_stage to glint_delivery so the War-room Customer-journey board can
-- persist a manually-placed stage (drag-and-drop) that overrides the inferred one.
-- The glint-sync upsert does not write this column, so it survives re-syncs.
-- Applied to CRM project (ref jdzaypckluncdwsoxurs) via Supabase MCP on 2026-06-09,
-- backup-first. Backup table: _dq_backup_glint_delivery_20260609.

create table if not exists _dq_backup_glint_delivery_20260609 as
  select * from glint_delivery;

alter table public.glint_delivery
  add column if not exists journey_stage text;   -- one of: design|configure|launch|live|rollout|review|embed
