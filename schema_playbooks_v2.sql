-- ============================================================
-- Eclectik CRM — Playbooks v2 datamodel migratie
-- Datum: 2026-05-18
-- ============================================================
-- Dit script:
--   1. Creëert 7 nieuwe tabellen voor het graph-gebaseerde playbook-systeem
--   2. Breidt 3 bestaande tabellen uit (playbooks, playbook_enrollments, playbook_executions)
--   3. Converteert bestaande playbook_steps data naar playbook_nodes + edges
--   4. Voegt indexen toe
--
-- LET OP: dit script is ADDITIEF — bestaande tabellen worden NIET gedropt.
-- Drop van playbook_steps gebeurt in een aparte cleanup-script na 24h stable run.
-- ============================================================

-- =====================
-- STAP 1: Nieuwe tabellen
-- =====================

-- 1a. playbook_versions — graph-snapshot per published version
create table public.playbook_versions (
  id              uuid primary key default gen_random_uuid(),
  playbook_id     uuid not null references public.playbooks(id) on delete cascade,
  version         int not null,
  graph_snapshot  jsonb not null,
  published_at    timestamptz default now(),
  published_by    text
);
comment on table public.playbook_versions is 'Immutable graph-snapshot per published playbook-version. Lopende enrollments lezen vanaf hier.';
create index idx_playbook_versions_playbook on public.playbook_versions(playbook_id, version);

-- 1b. playbook_nodes — graph nodes (vervangt playbook_steps na cleanup)
create table public.playbook_nodes (
  id            uuid primary key default gen_random_uuid(),
  playbook_id   uuid not null references public.playbooks(id) on delete cascade,
  node_type     text not null,
  config        jsonb not null default '{}'::jsonb,
  pos_x         numeric default 0,
  pos_y         numeric default 0,
  created_at    timestamptz default now()
);
comment on table public.playbook_nodes is 'Graph-nodes voor visual workflow builder. node_type bepaalt config-shape.';
create index idx_playbook_nodes_playbook on public.playbook_nodes(playbook_id);

-- 1c. playbook_edges — verbindingen tussen nodes, conditioneel
create table public.playbook_edges (
  id               uuid primary key default gen_random_uuid(),
  playbook_id      uuid not null references public.playbooks(id) on delete cascade,
  source_node_id   uuid not null references public.playbook_nodes(id) on delete cascade,
  target_node_id   uuid not null references public.playbook_nodes(id) on delete cascade,
  condition_label  text,
  condition_expr   jsonb,
  created_at       timestamptz default now()
);
comment on table public.playbook_edges is 'Directed edges in playbook graph. Branch-nodes hebben meerdere outgoing edges met condition_expr.';
create index idx_playbook_edges_source on public.playbook_edges(source_node_id);
create index idx_playbook_edges_target on public.playbook_edges(target_node_id);

-- 1d. signals — gedetecteerde externe events (LinkedIn posts in V1)
create table public.signals (
  id               uuid primary key default gen_random_uuid(),
  source           text not null,
  source_id        text not null,
  contact_id       uuid references public.contacts(id) on delete cascade,
  company_id       uuid references public.companies(id) on delete cascade,
  content          text,
  post_url         text,
  relevance_score  numeric check (relevance_score >= 0 and relevance_score <= 1),
  scoring_reason   text,
  topic_tags       text[],
  posted_at        timestamptz,
  detected_at      timestamptz default now(),
  resolved_at      timestamptz,
  unique (source, source_id)
);
comment on table public.signals is 'Externe signalen (LinkedIn posts, company news) gedetecteerd door daily cron.';
create index idx_signals_contact on public.signals(contact_id) where contact_id is not null;
create index idx_signals_company on public.signals(company_id) where company_id is not null;
create index idx_signals_unscored on public.signals(detected_at) where relevance_score is null;

-- 1e. signal_subjects — wie/wat pollen we
create table public.signal_subjects (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid references public.contacts(id) on delete cascade,
  company_id     uuid references public.companies(id) on delete cascade,
  source_type    text not null,
  enabled        boolean not null default true,
  last_polled_at timestamptz,
  auto_added     boolean not null default false,
  created_at     timestamptz default now(),
  check ((contact_id is not null and company_id is null) or (contact_id is null and company_id is not null))
);
comment on table public.signal_subjects is 'Configuratie: welke contacten/companies worden door signals-poll cron benaderd.';
create index idx_signal_subjects_enabled on public.signal_subjects(enabled, last_polled_at) where enabled = true;

-- 1f. playbook_suggestions — pending suggesties wachtend op user-confirm
create table public.playbook_suggestions (
  id             uuid primary key default gen_random_uuid(),
  playbook_id    uuid not null references public.playbooks(id) on delete cascade,
  contact_id     uuid references public.contacts(id) on delete cascade,
  deal_id        uuid references public.opportunities(id) on delete cascade,
  source         text not null,
  source_context jsonb,
  status         text not null default 'pending',
  enrollment_id  uuid references public.playbook_enrollments(id) on delete set null,
  resolved_by    text,
  created_at     timestamptz default now(),
  resolved_at    timestamptz
);
comment on table public.playbook_suggestions is 'Pending playbook-suggesties. Status: pending/started/dismissed/expired.';
create index idx_playbook_suggestions_pending on public.playbook_suggestions(created_at) where status = 'pending';

-- 1g. playbook_drafts — klaar-voor-review berichten
create table public.playbook_drafts (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null references public.playbook_enrollments(id) on delete cascade,
  node_id             uuid not null references public.playbook_nodes(id) on delete cascade,
  channel             text not null,
  to_contact_id       uuid references public.contacts(id) on delete cascade,
  subject             text,
  body                text,
  body_original       text,
  status              text not null default 'pending',
  external_message_id text,
  generated_at        timestamptz default now(),
  edited_at           timestamptz,
  resolved_at         timestamptz
);
comment on table public.playbook_drafts is 'Email/LinkedIn/WhatsApp/Instagram drafts wachtend op review en verzending.';
create index idx_playbook_drafts_pending on public.playbook_drafts(generated_at) where status = 'pending';
create index idx_playbook_drafts_enrollment on public.playbook_drafts(enrollment_id);

-- =====================
-- STAP 2: Uitbreidingen bestaande tabellen
-- =====================

-- 2a. playbooks — trigger configuratie + version-tracking
alter table public.playbooks
  add column if not exists trigger_type   text,
  add column if not exists trigger_config jsonb default '{}'::jsonb,
  add column if not exists version        int default 1;

-- 2b. playbook_enrollments — graph-state i.p.v. linear step
alter table public.playbook_enrollments
  add column if not exists current_node_id  uuid references public.playbook_nodes(id) on delete set null,
  add column if not exists version_at_start int,
  add column if not exists replied_at       timestamptz,
  add column if not exists next_action_at   timestamptz;

-- 2c. playbook_executions — voeg node_id toe naast step_id (additief)
alter table public.playbook_executions
  add column if not exists node_id uuid references public.playbook_nodes(id) on delete cascade;

-- =====================
-- STAP 3: Convert bestaande playbook_steps → playbook_nodes + edges
-- =====================

do $$
declare
  pb record;
  st record;
  prev_id uuid;
  new_id uuid;
  total_converted int := 0;
begin
  for pb in select id from public.playbooks loop
    prev_id := null;
    for st in select * from public.playbook_steps
              where playbook_id = pb.id
              order by step_number loop
      new_id := gen_random_uuid();

      -- Map old step_type to new node_type
      insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
      values (
        new_id,
        pb.id,
        case st.step_type
          when 'email' then 'action_email_draft'
          when 'linkedin_invite' then 'action_linkedin_draft'
          when 'call' then 'action_internal_task'
          when 'wait' then 'logic_wait'
          else 'action_internal_task'
        end,
        jsonb_build_object(
          'subject', st.subject,
          'body', st.body,
          'delay_days', coalesce(st.delay_days, 0),
          'migrated_from_step_id', st.id::text
        ),
        0,
        st.step_number * 120
      );

      -- Linear edge van vorige node naar deze
      if prev_id is not null then
        insert into public.playbook_edges (playbook_id, source_node_id, target_node_id)
        values (pb.id, prev_id, new_id);
      end if;

      prev_id := new_id;
      total_converted := total_converted + 1;
    end loop;
  end loop;

  raise notice 'Converted % step(s) into playbook_nodes', total_converted;
end $$;

-- Update lopende enrollments: current_step → current_node_id (best-effort match)
update public.playbook_enrollments e
set current_node_id = n.id
from public.playbook_nodes n
where n.config->>'migrated_from_step_id' = e.current_step::text
  and e.current_step is not null
  and e.current_node_id is null;
