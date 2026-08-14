-- Aantal ontvangers op moment van publiceren (voor de statusregel "E-mail
-- gestuurd aan x contacten" in de detail-modal). Alleen relevant voor e-mail;
-- bij LinkedIn blijft dit leeg (account leiden we af uit linkedin_account_id).
-- Toegepast via Supabase MCP apply_migration (add_published_recipient_count) op 2026-08-14.
alter table public.content_calendar_items
  add column if not exists published_recipient_count integer;
comment on column public.content_calendar_items.published_recipient_count is
  'Aantal ontvangers bij publicatie (e-mail). Gevuld door de publish-cron.';

-- Terugdraaien: alter table public.content_calendar_items drop column published_recipient_count;
