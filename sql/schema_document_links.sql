-- Document links (SharePoint SOWs, proposals, …) for accounts and deals.
-- account-level link: account_id set, deal_id/deal_table null.
-- per-deal link:      deal_table + deal_id set (account_id also set when known).
-- Applied to the CRM Supabase on 2026-06-06 (migration: create_document_links).

create table if not exists document_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references companies(id) on delete cascade,
  deal_table text check (deal_table in ('leads','opportunities')),
  deal_id uuid,
  label text not null,
  url text not null,
  created_by text,
  created_at timestamptz not null default now(),
  constraint document_links_target check (account_id is not null or deal_id is not null),
  constraint document_links_deal_pair check ((deal_id is null) = (deal_table is null))
);
create index if not exists idx_document_links_account on document_links(account_id);
create index if not exists idx_document_links_deal on document_links(deal_table, deal_id);

alter table document_links enable row level security;
create policy "auth users full access on document_links" on document_links
  for all to authenticated using (true) with check (true);
