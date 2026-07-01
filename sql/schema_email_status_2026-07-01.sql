-- Status Email: kolom voor de uitkomst van de laatste Surfe e-mailzoekpoging.
-- Toegepast via Supabase MCP apply_migration (add_email_status_to_contacts) op 2026-07-01.
alter table public.contacts add column if not exists email_status text;
comment on column public.contacts.email_status is
  'Uitkomst laatste Surfe e-mailzoekpoging: null=nog niet gezocht, found_surfe=gevonden, not_found_surfe=gezocht maar niets gevonden';

-- Waarden: null | 'found_surfe' | 'not_found_surfe'
-- Terugdraaien: alter table public.contacts drop column email_status;
