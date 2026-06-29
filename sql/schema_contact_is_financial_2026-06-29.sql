-- Add a "financial contact" flag to contacts, alongside the existing is_primary
-- (primary contact) flag. Both are independent booleans: a contact can be primary,
-- financial, both, or neither, and multiple contacts per account may carry each flag.
--
-- Rendered in Account 360 (lane-accounts.jsx): primary => green avatar ring + ★,
-- financial => blue avatar ring + $. Both => layered green-inner/blue-outer ring.
--
-- Applied via Supabase MCP apply_migration on 2026-06-29 (additive, non-destructive).
alter table public.contacts
  add column if not exists is_financial boolean not null default false;
