-- Outreach-module: e-mailoutreach voor het event Amsterdam 6 oktober 2026.
-- Ontwerp + besluiten: docs/outreach-handover.md (§4 en het addendum §9).
--
-- Drie tabellen plus sync-state, omdat verzenden en ontvangen los van elkaar staan:
--   outreach_campaign   - een rij per campagne (caps, vensters, harde stop)
--   outreach_contact    - een rij per prospect (statemachine + teksten)
--   outreach_message    - elke verzonden en ontvangen mail (audit + reply-matching)
--   outreach_sync_state - deltaLink van de Graph-inboxscan
--
-- Afwijkingen t.o.v. handover §4, conform addendum §9.1:
--   * outbound gaat via Resend, niet via Graph. Daarom `provider_message_id`
--     (Resend-id bij outbound, Graph-id bij inbound) i.p.v. `graph_message_id`.
--   * `conversation_id` wordt alleen voor INBOUND gevuld; matching is tweetraps
--     (afzenderadres, dan domein-flag).
--   * Extra: koppeling naar de CRM via contact_id/company_id, gevuld door de
--     cross-match bij import, zodat bestaande klantrelaties automatisch op
--     'paused' kunnen en do_not_email gerespecteerd wordt.
--
-- Nieuwe tabellen, dus niets te backuppen; bestaande data wordt niet aangeraakt.
-- Toegepast via Supabase MCP apply_migration (outreach_module) op 2026-09-09.

-- ── 1. Campagne ────────────────────────────────────────────────────────────
create table if not exists public.outreach_campaign (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  sender_mailbox           text not null,                    -- afzenderadres (marco@eclectik.co)
  daily_cap                int  not null default 60,         -- ramp: 60 -> 120 (addendum §9.4)
  followup_delay_days_min  int  not null default 5,
  followup_delay_days_max  int  not null default 7,
  max_per_company_per_week int  not null default 2,
  send_windows             jsonb not null default '["08:30","11:30","15:00"]'::jsonb,
  hard_stop_at             timestamptz,                      -- 2026-10-02: geen bericht 2 meer
  status                   text not null default 'draft',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint outreach_campaign_status_chk
    check (status in ('draft','active','paused','finished'))
);
comment on table public.outreach_campaign is
  'Outreach-campagne: caps, verzendvensters en harde stopdatum. Killswitch = status paused.';

-- ── 2. Prospect ────────────────────────────────────────────────────────────
create table if not exists public.outreach_contact (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.outreach_campaign(id) on delete cascade,

  -- Cross-match met de CRM (gevuld bij import). NULL = koude prospect, niet bekend.
  contact_id      uuid references public.contacts(id)  on delete set null,
  company_id      uuid references public.companies(id) on delete set null,

  first_name      text,
  last_name       text,
  title           text,
  email           text not null,
  email_domain    text,                                      -- afgeleid; matching + per-bedrijf-regel

  company         text,
  company_linkedin text,
  website         text,
  industry        text,
  location        text,
  employee_count  text,
  size_bucket     text,
  linkedin_url    text,

  priority_label  text,                                      -- label met kleurprefix uit de lijst
  priority_tier   text,                                      -- top / good / medium
  outreach_prio   int,                                       -- NULL als de rij 'Reserve' is
  is_reserve      boolean not null default false,

  hook_note       text,
  frontline_note  text,
  source          text,

  msg1_subject    text,
  msg1_body       text,
  msg2_subject    text,
  msg2_body       text,

  status          text not null default 'queued',
  next_action_at  timestamptz,                               -- de scheduler draait hierop
  paused_reason   text,
  last_reply_summary text,

  -- Afmelden (addendum: List-Unsubscribe-header + menselijke regel onderaan).
  -- Token staat in de afmeld-URL; het endpoint zet status='opted_out' en
  -- contacts.do_not_email. Bewust per prospect, niet per e-mailadres, zodat een
  -- token nooit iets over een ander contact prijsgeeft.
  unsubscribe_token uuid not null default gen_random_uuid(),
  opted_out_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- E-mail uniek binnen de campagne: maakt de import idempotent (upsert op conflict).
  constraint outreach_contact_campaign_email_uniq unique (campaign_id, email),
  constraint outreach_contact_unsub_token_uniq unique (unsubscribe_token),
  constraint outreach_contact_status_chk check (status in (
    'queued','msg1_sent','msg2_sent','replied','bounced','ooo','referred','opted_out','paused','done')),
  constraint outreach_contact_tier_chk
    check (priority_tier is null or priority_tier in ('top','good','medium'))
);
comment on table public.outreach_contact is
  'Prospect in een outreach-campagne, met eigen bericht 1/2-teksten en statemachine.';
comment on column public.outreach_contact.is_reserve is
  'True = rij had ''Reserve'' in Outreach-prio (extra contact bij een bedrijf), niet in golf 1.';

-- Scheduler: selecteer op campagne + status + tijd, sorteer op tier en prio.
create index if not exists idx_outreach_contact_due
  on public.outreach_contact(campaign_id, status, next_action_at);
create index if not exists idx_outreach_contact_order
  on public.outreach_contact(campaign_id, priority_tier, outreach_prio);
-- Reply-matching op afzenderadres, en de per-bedrijf-regel op domein.
create index if not exists idx_outreach_contact_email
  on public.outreach_contact(lower(email));
create index if not exists idx_outreach_contact_domain
  on public.outreach_contact(email_domain);

-- ── 3. Berichten (audit + reply-matching) ──────────────────────────────────
create table if not exists public.outreach_message (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.outreach_campaign(id) on delete cascade,
  -- NULL bij inkomende mail die we niet aan een prospect konden koppelen.
  contact_id      uuid references public.outreach_contact(id) on delete set null,

  direction       text not null,                             -- outbound | inbound
  sequence_step   int,                                       -- 1 of 2 bij outbound

  provider_message_id text,                                  -- Resend-id (out) / Graph-id (in)
  conversation_id text,                                      -- alleen inbound (Graph)
  internet_message_id text,

  from_address    text,
  to_address      text,
  subject         text,
  body_preview    text,
  sent_or_received_at timestamptz,

  classification  text,                                      -- alleen inbound
  classification_confidence numeric,
  summary         text,
  match_method    text,
  raw             jsonb,                                     -- payload minus body, voor debuggen

  -- Tracking van de Resend-webhook op outbound (gekoppeld op provider_message_id).
  -- delivered/bounce/complaint zijn de bruikbare signalen; open/click staan voor
  -- deze campagne bewust uit (pixel + herschreven links maken een persoonlijke
  -- mail juist herkenbaar als marketing). Kolommen staan er wel, voor later.
  delivered_at    timestamptz,
  bounced_at      timestamptz,
  bounce_reason   text,
  complained_at   timestamptz,
  first_opened_at timestamptz,
  open_count      int not null default 0,
  first_clicked_at timestamptz,
  click_count     int not null default 0,

  created_at      timestamptz not null default now(),

  constraint outreach_message_direction_chk check (direction in ('outbound','inbound')),
  constraint outreach_message_class_chk check (classification is null or classification in (
    'interested','declined','ooo','referral','bounce','other')),
  constraint outreach_message_match_chk check (match_method is null or match_method in (
    'conversation_id','sender_email','domain_flag','none')),
  constraint outreach_message_step_chk check (
    direction <> 'outbound' or sequence_step in (1,2))
);
comment on table public.outreach_message is
  'Elke verzonden en ontvangen mail van een outreach-campagne. Basis voor reply-matching.';

-- IDEMPOTENTIE (handover §6): maakt het op DB-niveau onmogelijk om dezelfde stap
-- twee keer naar dezelfde prospect te sturen, ook bij een dubbele cron-run.
create unique index if not exists outreach_message_outbound_step_uniq
  on public.outreach_message(contact_id, sequence_step)
  where direction = 'outbound' and contact_id is not null;

-- Inbound niet dubbel verwerken bij een overlappende delta-sync.
create unique index if not exists outreach_message_inbound_provider_uniq
  on public.outreach_message(provider_message_id)
  where direction = 'inbound' and provider_message_id is not null;

-- De Resend-webhook zoekt de outbound-rij op het message-id.
create index if not exists idx_outreach_message_provider
  on public.outreach_message(provider_message_id) where provider_message_id is not null;

create index if not exists idx_outreach_message_conversation
  on public.outreach_message(conversation_id) where conversation_id is not null;
create index if not exists idx_outreach_message_contact
  on public.outreach_message(contact_id);
-- Dagcap: tel outbound van vandaag per campagne.
create index if not exists idx_outreach_message_daycount
  on public.outreach_message(campaign_id, direction, sent_or_received_at);

-- ── 4. Sync-state voor de Graph delta-query ────────────────────────────────
create table if not exists public.outreach_sync_state (
  id              text primary key,                          -- 'inbox' | 'sentitems'
  delta_link      text,
  last_synced_at  timestamptz,
  updated_at      timestamptz not null default now()
);
comment on table public.outreach_sync_state is
  'deltaLink per Graph-map, zodat de inboxscan incrementeel is.';

-- ── 5. RLS (huisstijl: uniforme policy voor authenticated) ─────────────────
alter table public.outreach_campaign   enable row level security;
alter table public.outreach_contact    enable row level security;
alter table public.outreach_message    enable row level security;
alter table public.outreach_sync_state enable row level security;

drop policy if exists "auth users full access on outreach_campaign" on public.outreach_campaign;
create policy "auth users full access on outreach_campaign"
  on public.outreach_campaign for all to authenticated using (true) with check (true);

drop policy if exists "auth users full access on outreach_contact" on public.outreach_contact;
create policy "auth users full access on outreach_contact"
  on public.outreach_contact for all to authenticated using (true) with check (true);

drop policy if exists "auth users full access on outreach_message" on public.outreach_message;
create policy "auth users full access on outreach_message"
  on public.outreach_message for all to authenticated using (true) with check (true);

drop policy if exists "auth users full access on outreach_sync_state" on public.outreach_sync_state;
create policy "auth users full access on outreach_sync_state"
  on public.outreach_sync_state for all to authenticated using (true) with check (true);

-- Terugdraaien:
-- drop table if exists public.outreach_message, public.outreach_contact,
--   public.outreach_sync_state, public.outreach_campaign cascade;
