-- Marketing leads: website-aanmeldingen (waitlist, straks scorecards) die
-- BUITEN de sales-funnel leven tot iemand ze bewust promoveert.
-- Spec: docs/superpowers/specs/2026-07-08-marketing-leads-pipeline-design.md
-- Bewust GEEN foreign keys naar bestaande tabellen; converted_lead_id is een
-- soft reference naar leads.id.

create table public.marketing_leads (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  full_name          text,
  company            text,
  role               text,
  sector             text,
  first_src          text,
  status             text not null default 'active'
                     check (status in ('active','converted','archived')),
  converted_lead_id  uuid,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_activity_at   timestamptz
);
comment on table public.marketing_leads is
  'Website-aanmeldingen (marketing leads). Losstaand van de sales-funnel; promoveren is een handmatige actie in Marketing → Leads.';

create table public.marketing_lead_activity (
  id                 uuid primary key default gen_random_uuid(),
  marketing_lead_id  uuid not null references public.marketing_leads(id) on delete cascade,
  event              text not null,
  payload            jsonb,
  src                text,
  occurred_at        timestamptz not null default now()
);
comment on table public.marketing_lead_activity is
  'Eén rij per website-interactie (waitlist_joined, scorecard_*, ...). Payload = vrije JSON zodat nieuwe formuliervragen geen schemawijziging vragen.';
create index idx_mla_lead on public.marketing_lead_activity(marketing_lead_id);

-- RLS volgens huis-stijl (RLS zelf wordt auto-enabled door de
-- rls_auto_enable trigger; expliciet enablen is harmless en zeker).
alter table public.marketing_leads enable row level security;
alter table public.marketing_lead_activity enable row level security;

create policy "auth users full access on marketing_leads"
  on public.marketing_leads for all to authenticated
  using (true) with check (true);

create policy "auth users full access on marketing_lead_activity"
  on public.marketing_lead_activity for all to authenticated
  using (true) with check (true);
