-- Optioneel per-item LinkedIn-account voor content-posts/DM's. Leeg = default
-- (CONTENT_LINKEDIN_ACCOUNT_ID, Marco); gevuld = post via dat Unipile-account.
-- Handig voor tests (posten via je eigen account) en toekomstige flexibiliteit.
-- Toegepast via Supabase MCP apply_migration (add_linkedin_account_id_to_content_calendar) op 2026-08-14.
alter table public.content_calendar_items
  add column if not exists linkedin_account_id text;
comment on column public.content_calendar_items.linkedin_account_id is
  'Optioneel Unipile-account-id voor linkedin_post/linkedin_dm. Leeg = default (env CONTENT_LINKEDIN_ACCOUNT_ID, Marco).';

-- Terugdraaien: alter table public.content_calendar_items drop column linkedin_account_id;
