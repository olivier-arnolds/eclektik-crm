-- schema_glint_delivery_delivery_start_2026-06-08.sql
-- Adds Expected delivery start to the War-room delivery layer so glint-sync can
-- capture it from Yarmilla's Master Project Overview sheet and the War room can
-- show the KO / delivery-window Timeline column.
-- Already applied to CRM project (ref jdzaypckluncdwsoxurs) via Supabase MCP on
-- 2026-06-08, backup-first. Backup table: _dq_backup_glint_delivery_20260608.

create table if not exists _dq_backup_glint_delivery_20260608 as
  select * from glint_delivery;

alter table public.glint_delivery
  add column if not exists delivery_start text;
