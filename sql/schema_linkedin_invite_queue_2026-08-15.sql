-- Wachtrij voor de connectie-drip: geselecteerde niet-verbonden contacten worden
-- 'aangezet' (status queued) en een cron stuurt gedoseerd (dagcap per account,
-- verspreid over de dag, werkdagen) connectieverzoeken via een persoonlijk account.
-- Optioneel bericht per inschrijving. Uniek per contact+account (geen dubbele
-- inschrijving). Toegepast via Supabase MCP apply_migration (create_linkedin_invite_queue) op 2026-08-15.
create table public.linkedin_invite_queue (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  account_id   text not null,                        -- Unipile account dat stuurt
  status       text not null default 'queued',       -- queued | sent | failed
  message      text,                                  -- optioneel invite-bericht
  attempts     integer not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  updated_at   timestamptz not null default now(),
  unique (contact_id, account_id)
);
comment on table public.linkedin_invite_queue is
  'Wachtrij connectie-drip: gedoseerd connectieverzoeken sturen via een persoonlijk account.';
create index idx_invite_queue_account_status on public.linkedin_invite_queue(account_id, status);
create index idx_invite_queue_sent_at on public.linkedin_invite_queue(sent_at);

alter table public.linkedin_invite_queue enable row level security;
create policy "auth users full access on linkedin_invite_queue"
  on public.linkedin_invite_queue for all to authenticated
  using (true) with check (true);

-- Terugdraaien: drop table public.linkedin_invite_queue;
