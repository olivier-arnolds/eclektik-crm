-- Organogram: placeholder-nodes ("onbekend contact").
-- Je weet dat er bv. een teamlead boven een team zit maar nog niet wie. Dan zet
-- je alvast de structuur en vervang je het placeholder-blokje later door een
-- echt contact (slepen vanuit de linkerbalk).
--
-- Twee aanpassingen op organogram_nodes:
--   1. contact_id mag leeg zijn (placeholder zonder gekoppeld contact).
--   2. optioneel label (rolhint, bv. "Teamlead") om onbekenden te duiden.
--
-- Additief en niet-destructief. Toegepast via Supabase MCP apply_migration op 2026-06-29.

alter table public.organogram_nodes alter column contact_id drop not null;
alter table public.organogram_nodes add column if not exists label text;
