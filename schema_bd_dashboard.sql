-- ============================================================
-- Eclectik CRM — Database uitbreiding voor BD Dashboard
-- Datum: 2026-04-10
-- ============================================================
-- Dit script:
--   1. Dropt de oude ongebruikte tasks/sequences/bookings tabellen
--   2. Maakt 5 nieuwe tabellen aan
--   3. Breidt 3 bestaande tabellen uit
--   4. Voegt indexen en triggers toe
--   5. Schakelt RLS uit (conform huidige setup)
-- ============================================================

-- =====================
-- STAP 1: Oude tabellen opruimen
-- =====================
drop table if exists public.tasks cascade;
drop table if exists public.sequences cascade;
drop table if exists public.bookings cascade;

-- =====================
-- STAP 2: Nieuwe tabellen
-- =====================

-- 2a. follow_ups — PEP follow-up systeem (Today-kolom)
create table public.follow_ups (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  title           text not null,
  description     text,
  priority        text default 'schedule',
  status          text default 'pending',
  due_date        date default current_date,
  snooze_until    date,
  owner           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
comment on table public.follow_ups is 'PEP follow-up systeem met prioriteit (do_now/schedule/done)';

-- 2b. tasks — Taakbeheer
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete set null,
  opportunity_id  uuid references public.opportunities(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  title           text not null,
  description     text,
  status          text default 'pending',
  due_date        date,
  owner           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
comment on table public.tasks is 'Taken gekoppeld aan contacts, opportunities of leads';

-- 2c. calendar_events — Meetings & afspraken
create table public.calendar_events (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete set null,
  opportunity_id  uuid references public.opportunities(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  title           text not null,
  description     text,
  start_at        timestamptz not null,
  end_at          timestamptz,
  location        text,
  attendees       text,
  ms_event_id     text unique,
  owner           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
comment on table public.calendar_events is 'Meetings en afspraken, sync-baar met Microsoft Calendar';

-- 2d. documents — Documenten per deal/project
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete set null,
  opportunity_id  uuid references public.opportunities(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  title           text not null,
  file_url        text,
  file_type       text,
  description     text,
  owner           text,
  created_at      timestamptz default now()
);
comment on table public.documents is 'Proposals, SOWs en andere documenten per deal';

-- 2e. comms — Communicatie-log (email + Teams + LinkedIn + telefoon)
create table public.comms (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete set null,
  opportunity_id  uuid references public.opportunities(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  channel         text default 'email',
  direction       text,
  subject         text,
  body_preview    text,
  is_read         boolean default false,
  sent_at         timestamptz,
  external_id     text unique,
  owner           text,
  created_at      timestamptz default now()
);
comment on table public.comms is 'Alle communicatie: email, Teams, LinkedIn, telefoon';

-- =====================
-- STAP 3: Bestaande tabellen uitbreiden
-- =====================

-- 3a. opportunities — BD funnel stages + sub-statuses
alter table public.opportunities add column if not exists sub_status text default 'qualify';
alter table public.opportunities add column if not exists stage text default 'lead';
alter table public.opportunities add column if not exists product_line text;
alter table public.opportunities add column if not exists close_date date;
alter table public.opportunities add column if not exists start_date date;
alter table public.opportunities add column if not exists end_date date;
alter table public.opportunities add column if not exists last_activity_at timestamptz default now();
alter table public.opportunities add column if not exists notes text;

-- 3b. contacts — activiteit tracking + event bron
alter table public.contacts add column if not exists last_activity_at timestamptz;
alter table public.contacts add column if not exists event_source text;

-- 3c. companies — type badge + adres
alter table public.companies add column if not exists type text;
alter table public.companies add column if not exists address text;

-- =====================
-- STAP 4: Indexen
-- =====================
create index if not exists idx_follow_ups_owner    on public.follow_ups(owner);
create index if not exists idx_follow_ups_due      on public.follow_ups(due_date);
create index if not exists idx_follow_ups_status   on public.follow_ups(status);
create index if not exists idx_tasks_owner         on public.tasks(owner);
create index if not exists idx_tasks_due           on public.tasks(due_date);
create index if not exists idx_tasks_status        on public.tasks(status);
create index if not exists idx_calendar_start      on public.calendar_events(start_at);
create index if not exists idx_comms_contact       on public.comms(contact_id);
create index if not exists idx_comms_opp           on public.comms(opportunity_id);
create index if not exists idx_documents_opp       on public.documents(opportunity_id);
create index if not exists idx_documents_company   on public.documents(company_id);

-- =====================
-- STAP 5: Updated_at triggers
-- =====================
create trigger trg_follow_ups_updated_at
  before update on public.follow_ups
  for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_calendar_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- =====================
-- STAP 6: RLS uitschakelen (conform huidige setup, klein intern team)
-- =====================
alter table public.follow_ups      disable row level security;
alter table public.tasks           disable row level security;
alter table public.calendar_events disable row level security;
alter table public.documents       disable row level security;
alter table public.comms           disable row level security;

-- =====================
-- KLAAR! Controleer met:
-- select tablename from pg_tables where schemaname = 'public' order by tablename;
-- Verwacht: activity, calendar_events, comms, companies, contacts, documents, emails, follow_ups, leads, opportunities, tasks
-- =====================
