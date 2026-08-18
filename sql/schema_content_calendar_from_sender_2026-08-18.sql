-- Content Calendar: per e-mail-item een afzender kunnen kiezen (from_email +
-- from_name). Leeg = de MARKETING_FROM_EMAIL/MARKETING_FROM_NAME-defaults uit
-- api/_lib/send-broadcast.js. Alleen zinvol voor type='email'.
-- Toegepast via Supabase MCP apply_migration (content_calendar_from_sender_2026_08_18) op 2026-08-18.

alter table public.content_calendar_items
  add column if not exists from_email text,
  add column if not exists from_name  text;

comment on column public.content_calendar_items.from_email is
  'Afzender-e-mail voor email-items (geverifieerd eclectik.co-adres). Leeg = MARKETING_FROM_EMAIL-default.';
comment on column public.content_calendar_items.from_name is
  'Afzender-weergavenaam voor email-items. Leeg = MARKETING_FROM_NAME-default.';

-- Terugdraaien:
-- alter table public.content_calendar_items drop column from_email, drop column from_name;
