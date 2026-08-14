-- Cache van LinkedIn-connectiestatus per contact per Unipile-account (Marco/
-- Yarmilla/Olivier). Gevuld door de bulk-check (api/linkedin-connections.js), zodat
-- je niet steeds opnieuw hoeft te checken (LinkedIn rate-limits). status:
-- 'connected' (1e-graads) | 'not_connected' | 'error'.
-- Toegepast via Supabase MCP apply_migration (create_contact_connections) op 2026-08-14.
create table public.contact_connections (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid not null references public.contacts(id) on delete cascade,
  account_id        text not null,                        -- Unipile account-id
  status            text not null,                        -- connected | not_connected | error
  network_distance  text,                                 -- FIRST_DEGREE, DISTANCE_2, ...
  checked_at        timestamptz not null default now(),
  unique (contact_id, account_id)
);
comment on table public.contact_connections is
  'LinkedIn-connectiestatus per contact per Unipile-account (cache voor DM-targeting).';
create index idx_contact_connections_contact on public.contact_connections(contact_id);
create index idx_contact_connections_account_status on public.contact_connections(account_id, status);

alter table public.contact_connections enable row level security;
create policy "auth users full access on contact_connections"
  on public.contact_connections for all to authenticated
  using (true) with check (true);

-- Terugdraaien: drop table public.contact_connections;
