-- Organogram: per-account org-charts met contactpersonen.
-- Twee tabellen, gekoppeld via company_id. Nodes verwijzen naar een contact;
-- edges leggen relaties (reports_to = hiërarchie, peer = gelijk niveau).
-- Deal-koppelingen leven puur visueel in deal_refs (jsonb), geen FK naar deals.
--
-- Additief en niet-destructief. RLS wordt automatisch aangezet door de
-- bestaande rls_auto_enable event trigger (uniforme auth-users-full-access policy).
-- Toegepast via Supabase MCP apply_migration op 2026-06-29.

create table if not exists public.organogram_nodes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  pos_x        numeric not null default 0,
  pos_y        numeric not null default 0,
  deal_refs    jsonb   not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.organogram_edges (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  source_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  target_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  rel_type       text not null default 'reports_to',
  created_at     timestamptz not null default now()
);

create index if not exists organogram_nodes_company_idx on public.organogram_nodes (company_id);
create index if not exists organogram_edges_company_idx on public.organogram_edges (company_id);
