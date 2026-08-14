-- Content Calendar: gedrafte content-items per kanaal (GLINT/SEER/ROI/ROE) met
-- verplichte menselijke goedkeuring. Na goedkeuring + geplande datum/tijd
-- publiceert een cron automatisch (email via Resend, linkedin_post/dm via Unipile).
-- Bewust een APARTE tabel (niet playbook_drafts): deze content komt niet uit een
-- playbook-run, dus geen enrollment_id/current_node_id-FK's forceren. Handoff-spec:
-- ~/Downloads/content-calendar-handoff-spec.md
-- Toegepast via Supabase MCP apply_migration (create_content_calendar_items) op 2026-08-14.

create table public.content_calendar_items (
  id                  uuid primary key default gen_random_uuid(),
  channel             text not null,                       -- glint | seer | roi | roe
  type                text not null,                       -- email | linkedin_post | linkedin_dm
  subject             text,                                -- alleen email (nullable)
  body                text not null,
  status              text not null default 'draft',       -- draft | approved | scheduled | published
  scheduled_at        timestamptz,                         -- gevuld bij goedkeuren
  published_at        timestamptz,                         -- gevuld door de cron bij succes
  target_tag          text,                                -- tag-segment voor email-targeting; ontvangers zijn contacten met
                                                           -- deze tag EN globale opt-in (contacts.marketing_content_opt_in, stap 2)
  external_message_id text,                                -- Unipile post/message-id of Resend-id (traceerbaarheid)
  source_note         text,                                -- bv. "HBS AI Institute artikel + Copilot case study"
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),  -- app houdt dit bij (geen DB-trigger)
  constraint content_calendar_channel_chk check (channel in ('glint','seer','roi','roe')),
  constraint content_calendar_type_chk    check (type in ('email','linkedin_post','linkedin_dm')),
  constraint content_calendar_status_chk  check (status in ('draft','approved','scheduled','published'))
);
comment on table public.content_calendar_items is
  'Gedrafte content-items (Content Calendar-tab). Menselijke goedkeuring verplicht; cron publiceert na scheduled_at.';

-- Cron-query: status='approved' and scheduled_at <= now()
create index idx_content_calendar_status_sched  on public.content_calendar_items(status, scheduled_at);
-- Week/maand-view: items per kanaal in tijd
create index idx_content_calendar_channel_sched on public.content_calendar_items(channel, scheduled_at);

-- RLS volgens huis-stijl (rls_auto_enable zet RLS aan; expliciet is harmless en zeker;
-- de standaardpolicy moet wel expliciet aangemaakt worden).
alter table public.content_calendar_items enable row level security;
create policy "auth users full access on content_calendar_items"
  on public.content_calendar_items for all to authenticated
  using (true) with check (true);

-- Terugdraaien:
-- drop table public.content_calendar_items;
