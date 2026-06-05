-- War-room delivery layer: rows synced from Yarmilla's "Master Project
-- Overview.xlsx" (the operational source of truth for Glint delivery).
-- /api/glint-sync reads the sheet via Graph and upserts here; the War-room tab
-- reads this table. Date fields are kept as TEXT because the sheet uses free
-- text ("Mid June-26", "w/c 13 July"); next_milestone_date holds a parsed date
-- where one could be derived (for sorting / health), next_milestone_label is
-- the human label shown.
--
-- Run in the Supabase SQL editor. RLS auto-enables; uniform policy added below.

create table if not exists public.glint_delivery (
  id                   uuid primary key default gen_random_uuid(),
  -- natural key for upsert from the sheet (client + project name)
  sheet_key            text unique,
  client_name          text not null,
  project_name         text,
  service_type         text,
  region               text,
  status               text,            -- In progress | Not started | Completed
  priority             text,            -- Low | Medium | High
  cs_owner             text,
  cs_hours             numeric,
  ps_owner             text,
  ps_hours             numeric,
  other_contractors    text,
  other_hours          numeric,
  ko_date              text,
  survey_date          text,
  insight_review_date  text,
  delivery_end         text,
  next_milestone_label text,
  next_milestone_date  date,
  notes                text,
  follow_up            text,
  company_id           uuid references public.companies(id) on delete set null,
  source_modified_at   timestamptz,     -- when Yarmilla's sheet was last edited (from Graph)
  synced_at            timestamptz default now()
);

create index if not exists idx_glint_delivery_company on public.glint_delivery(company_id);

drop policy if exists "auth users full access on glint_delivery" on public.glint_delivery;
create policy "auth users full access on glint_delivery"
  on public.glint_delivery for all to authenticated
  using (true) with check (true);
