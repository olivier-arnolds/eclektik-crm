-- Outreach: bijhouden of WIJ al gereageerd hebben op een binnengekomen antwoord.
-- Zie docs/outreach-handover.md §5 (job B, stap 1: Sent Items meenemen).
--
-- Bewust GEEN nieuwe status-waarde. 'heeft geantwoord' en 'wij moeten nog terug'
-- zijn twee onafhankelijke feiten; in een enkel status-veld gepropt zou je er een
-- van kwijtraken. Daarom twee tijdstempels, en de UI leidt de weergave
-- 'Onbeantwoord' daaruit af:
--
--   onbeantwoord = last_inbound_at is not null
--                  and (answered_at is null or answered_at < last_inbound_at)
--
-- Dat blijft ook kloppen als iemand twee keer achter elkaar antwoordt.
--
-- Additief en niet-destructief. Toegepast via Supabase MCP apply_migration
-- (outreach_answered) op 2026-09-09.

alter table public.outreach_contact
  add column if not exists last_inbound_at timestamptz,
  add column if not exists answered_at     timestamptz;

comment on column public.outreach_contact.last_inbound_at is
  'Laatste binnengekomen antwoord van deze prospect (gezet door de inboxscan).';
comment on column public.outreach_contact.answered_at is
  'Laatste keer dat WIJ deze prospect iets stuurden na zijn antwoord: een reply uit
   de app, of een mail van Marco zelf die de Sent-Items-scan oppikte.';

-- Filter "onbeantwoord" in het overzicht.
create index if not exists idx_outreach_contact_awaiting
  on public.outreach_contact(campaign_id, last_inbound_at, answered_at);

-- Een handmatige reply is outbound zonder stapnummer (het is geen bericht 1 of 2).
-- De oude constraint eiste 1 of 2 voor elke outbound; die moet null toestaan.
-- De unieke index op (contact_id, sequence_step) blijft werken: Postgres ziet
-- NULLs als onderling verschillend, dus meerdere handmatige replies mogen wel,
-- terwijl bericht 1 en 2 nog steeds maar een keer kunnen.
alter table public.outreach_message
  drop constraint if exists outreach_message_step_chk;
alter table public.outreach_message
  add constraint outreach_message_step_chk check (
    direction <> 'outbound' or sequence_step is null or sequence_step in (1, 2)
  );

-- Terugdraaien:
-- alter table public.outreach_message drop constraint outreach_message_step_chk;
-- alter table public.outreach_message add constraint outreach_message_step_chk
--   check (direction <> 'outbound' or sequence_step in (1,2));
-- drop index if exists idx_outreach_contact_awaiting;
-- alter table public.outreach_contact drop column if exists answered_at,
--   drop column if exists last_inbound_at;
