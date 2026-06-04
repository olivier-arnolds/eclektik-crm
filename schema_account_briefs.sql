-- Optional: persist Account 360 AI briefs so they survive reloads and are
-- shared across users. The app works without this table (ephemeral briefs);
-- run this to enable caching + the "Generated <time> ago" timestamp.
--
-- Run in the Supabase SQL editor. RLS is auto-enabled by the rls_auto_enable
-- event trigger; the uniform "auth users full access" policy is added below.

create table if not exists public.account_briefs (
  company_id        uuid primary key references public.companies(id) on delete cascade,
  brief             jsonb not null,
  interaction_count integer,
  model             text,
  generated_at      timestamptz default now()
);

-- Uniform policy matching every other public table in this project.
drop policy if exists "auth users full access on account_briefs" on public.account_briefs;
create policy "auth users full access on account_briefs"
  on public.account_briefs for all to authenticated
  using (true) with check (true);
