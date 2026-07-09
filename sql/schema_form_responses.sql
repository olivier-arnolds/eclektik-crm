-- Generieke opslag van ruwe formulier-invoer (scorecard nu; latere formulieren
-- zijn een nieuwe form_type). BEWUST afgeschermd: RLS aan, GEEN policies —
-- alleen de service key (API-endpoints) kan lezen/schrijven. Ruwe antwoorden
-- horen niet zichtbaar te zijn in de CRM-UI (privacyregel scorecard-spec §9).
-- Spec: eclectik-website docs/superpowers/specs/2026-07-09-scorecard-fase1-design.md

create table public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_type    text not null,
  email        text,          -- scorecard vult dit altijd; nullable voor toekomstige form_types
  consent      boolean not null default false,
  entry_meta   jsonb,         -- {door, src}
  answers      jsonb not null,
  computed     jsonb,         -- server-side: {scores, bands, quadrant, route}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.form_responses is
  'Ruwe formulier-invoer (afgeschermd; alleen service key). Samenvattingen leven als marketing_lead_activity.';
create index idx_form_responses_type_created on public.form_responses(form_type, created_at desc);

alter table public.form_responses enable row level security;
-- geen policies: authenticated heeft geen toegang (bewust)

-- Weekstatistiek voor content/mailing (raadpleging via SQL/service; publicatie extern pas bij n >= 30)
create view public.scorecard_weekly_stats as
select
  date_trunc('week', created_at)::date as week,
  count(*) as n,
  round(avg((computed->'scores'->>'value')::numeric))     as avg_value,
  round(avg((computed->'scores'->>'change')::numeric))    as avg_change,
  round(avg((computed->'scores'->>'readiness')::numeric)) as avg_readiness,
  round(avg((computed->'scores'->>'index')::numeric))     as avg_index,
  round(100.0 * avg(((computed->'bands'->>'value') = 'blind_spot')::int))     as pct_blind_value,
  round(100.0 * avg(((computed->'bands'->>'change') = 'blind_spot')::int))    as pct_blind_change,
  round(100.0 * avg(((computed->'bands'->>'readiness') = 'blind_spot')::int)) as pct_blind_readiness,
  count(*) filter (where computed->>'quadrant' = 'flying_blind')             as q_flying_blind,
  count(*) filter (where computed->>'quadrant' = 'spreadsheet_confident')    as q_spreadsheet_confident,
  count(*) filter (where computed->>'quadrant' = 'people_aware_value_blind') as q_people_aware,
  count(*) filter (where computed->>'quadrant' = 'audit_ready')              as q_audit_ready
from public.form_responses
where form_type = 'scorecard'
group by 1 order by 1 desc;

-- Split per rol (P1) — zelfde bron, andere as
create view public.scorecard_stats_by_role as
select
  computed->>'role_label' as role,
  count(*) as n,
  round(avg((computed->'scores'->>'index')::numeric)) as avg_index,
  count(*) filter (where computed->>'route' = 'assessment') as route_assessment
from public.form_responses
where form_type = 'scorecard'
group by 1 order by n desc;
