-- Content Calendar: drip-voortgang voor cold-outreach e-mail. sent_emails houdt
-- bij welke adressen al verstuurd zijn; de cron stuurt per run een klein aantal
-- (CONTENT_DRIP_PER_RUN, default 7 -> ~28/uur bij de */15-cron) tot alles gehad is.
-- Toegepast via Supabase MCP op 2026-08-19.
alter table public.content_calendar_items
  add column if not exists sent_emails jsonb not null default '[]'::jsonb;
-- Terugdraaien: alter table public.content_calendar_items drop column sent_emails;
