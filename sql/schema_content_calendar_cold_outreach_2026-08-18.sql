-- Content Calendar: cold-outreach-schakelaar per e-mail-item. true = de publish-cron
-- negeert de marketing_content_opt_in-eis (voor koude prospects, bv. de Glint-lijst).
-- do_not_email, globaal afgemeld (Resend) en inactief/former blijven altijd uitgesloten.
-- Toegepast via Supabase MCP (content_calendar_cold_outreach_2026_08_18) op 2026-08-18.

alter table public.content_calendar_items
  add column if not exists cold_outreach boolean not null default false;

comment on column public.content_calendar_items.cold_outreach is
  'E-mail-items: true = koude outreach, negeert de marketing_content_opt_in-eis in de publish-cron. do_not_email, globaal afgemeld en inactief/former blijven altijd uitgesloten.';

-- Terugdraaien:
-- alter table public.content_calendar_items drop column cold_outreach;
