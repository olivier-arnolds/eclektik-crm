-- Ontvanger voor een linkedin_dm content-item: één CRM-contact. De cron gebruikt
-- diens linkedin_url om via het gekozen account een DM te sturen.
-- Toegepast via Supabase MCP apply_migration (add_recipient_contact_id_to_content_calendar) op 2026-08-14.
alter table public.content_calendar_items
  add column if not exists recipient_contact_id uuid references public.contacts(id) on delete set null;
comment on column public.content_calendar_items.recipient_contact_id is
  'Ontvanger van een linkedin_dm (CRM-contact). Cron stuurt via diens linkedin_url + het gekozen account.';

-- Terugdraaien: alter table public.content_calendar_items drop column recipient_contact_id;
