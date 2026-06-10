-- schema_opportunities_journey_stage_2026-06-10.sql
-- The Customer-journey board is now driven directly by CRM deals (single source
-- of truth) instead of the glint_delivery project sheet. A deal's manual lane
-- placement is saved here so it survives reloads.
-- Applied via Supabase MCP 2026-06-10.

alter table public.opportunities add column if not exists journey_stage text;
