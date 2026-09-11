-- Outreach via LinkedIn-DM naast e-mail (campagne "Amsterdam 2026 LinkedIn").
-- Ontwerp: docs/outreach-handover.md addendum. Toegepast 2026-09-11.
--
-- WAAROM DEZELFDE TABELLEN EN GEEN NIEUWE
--   De statemachine, de dagcap, de harde stop, de claim-dan-verstuur-idempotentie
--   en de Outreach-tab werken al. Het enige dat echt verschilt is het kanaal waar
--   een bericht doorheen gaat. Een tweede set tabellen zou al die logica moeten
--   dupliceren, inclusief de veiligheidskleppen, en dat is precies waar fouten
--   ontstaan.
--
-- WAT ER VERSCHILT BIJ LINKEDIN
--   * Geen e-mailadres. De 154 prospects zijn bestaande connecties van Marco en
--     staan alleen met een profiel-URL in de lijst.
--   * Geen subject, geen bericht 2 (voorlopig), geen bounces.
--   * Veel strengere dagcap: LinkedIn beperkt accounts die in korte tijd veel
--     DM's sturen, en het account van Marco is niet vervangbaar.
--
-- Veiligheid: alleen kolommen toevoegen en een NOT NULL laten vallen. Bestaande
-- rijen krijgen channel='email' via de default en veranderen verder niet.

-- ── 1. Kanaal op de campagne ───────────────────────────────────────────────
alter table public.outreach_campaign
  add column if not exists channel text not null default 'email',
  add column if not exists linkedin_account_id text;

do $$ begin
  alter table public.outreach_campaign
    add constraint outreach_campaign_channel_chk check (channel in ('email','linkedin'));
exception when duplicate_object then null; end $$;

comment on column public.outreach_campaign.channel is
  'email = via Resend, linkedin = DM via Unipile. Bepaalt welke verzendweg api/outreach-send gebruikt.';
comment on column public.outreach_campaign.linkedin_account_id is
  'Unipile-account waar de DM vandaan komt. NULL = env CONTENT_LINKEDIN_ACCOUNT_ID (Marco).';

-- ── 2. Kanaal op de prospect ───────────────────────────────────────────────
-- Ook hier en niet alleen op de campagne, want de uniciteitsindex hieronder moet
-- per kanaal kunnen verschillen zonder een join.
alter table public.outreach_contact
  add column if not exists channel text not null default 'email',
  add column if not exists linkedin_provider_id text,
  add column if not exists linkedin_chat_id text;

do $$ begin
  alter table public.outreach_contact
    add constraint outreach_contact_channel_chk check (channel in ('email','linkedin'));
exception when duplicate_object then null; end $$;

comment on column public.outreach_contact.linkedin_provider_id is
  'Unipile provider_id van het profiel, gecachet bij de eerste verzending. Elke profielopvraag is een echte profielweergave op het account, dus die doen we per persoon maximaal een keer.';
comment on column public.outreach_contact.linkedin_chat_id is
  'Unipile chat-id na het eerste bericht, zodat een antwoord aan de prospect te koppelen is.';

-- ── 3. E-mail mag leeg zijn bij een LinkedIn-prospect ──────────────────────
-- De unieke constraint (campaign_id, email) blijft staan: Postgres beschouwt
-- NULL-waarden als onderling verschillend, dus meerdere LinkedIn-rijen zonder
-- adres botsen niet.
alter table public.outreach_contact alter column email drop not null;

do $$ begin
  alter table public.outreach_contact
    add constraint outreach_contact_reachable_chk
    check (channel <> 'email' or email is not null);
exception when duplicate_object then null; end $$;

-- Idempotente import: een profiel komt binnen een LinkedIn-campagne maar een keer voor.
create unique index if not exists outreach_contact_campaign_linkedin_uniq
  on public.outreach_contact(campaign_id, lower(linkedin_url))
  where channel = 'linkedin' and linkedin_url is not null;

-- ── 4. Kanaal op het bericht ───────────────────────────────────────────────
-- to_address bevat bij LinkedIn de profiel-URL in plaats van een e-mailadres.
alter table public.outreach_message
  add column if not exists channel text not null default 'email';

do $$ begin
  alter table public.outreach_message
    add constraint outreach_message_channel_chk check (channel in ('email','linkedin'));
exception when duplicate_object then null; end $$;

-- De bestaande unieke index outreach_message_outbound_step_uniq op
-- (contact_id, sequence_step) where direction='outbound' blijft ongewijzigd: die
-- doet ook voor LinkedIn precies wat hij moet doen, namelijk een tweede claim
-- voor dezelfde stap onmogelijk maken.
