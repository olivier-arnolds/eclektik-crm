-- Contacts: last_email_date = datum van de laatst verstuurde marketing-mail.
-- Gezet door send-broadcast.js en marketing-send.js na verzending. 5-daagse
-- cooldown (EMAIL_COOLDOWN_DAYS, default 5): contacten die < 5 dagen geleden
-- gemaild zijn worden overgeslagen (anti-spam). Toegepast via Supabase MCP 2026-08-19.
alter table public.contacts
  add column if not exists last_email_date date;
-- Terugdraaien: alter table public.contacts drop column last_email_date;
