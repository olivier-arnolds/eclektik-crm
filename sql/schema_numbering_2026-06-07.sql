-- ── Numbering system (applied 2026-06-07, migrations: account_and_deal_numbering
--    + number_all_accounts)
-- Accounts: A-#### — EVERY account gets a number automatically on insert
--           (trigger). Permanent; never reused.
-- Deals:    D-#### — one shared sequence across opportunities AND leads, so a
--           deal number is unique CRM-wide. Assigned automatically on insert.
-- Backfill history: Customers/Partners first (A-0001..A-0081, by creation
-- date), then all remaining accounts (A-0082..A-0186). Deals D-0001..D-0175
-- chronological across both tables.

create sequence if not exists account_no_seq;
create sequence if not exists deal_no_seq;

alter table companies add column if not exists account_no text unique;
alter table opportunities add column if not exists deal_no text unique;
alter table leads add column if not exists deal_no text unique;

create or replace function assign_account_no() returns trigger language plpgsql as $fn$
begin
  if new.account_no is null then
    new.account_no := 'A-' || lpad(nextval('account_no_seq')::text, 4, '0');
  end if;
  return new;
end $fn$;

drop trigger if exists trg_account_no on companies;
create trigger trg_account_no before insert or update on companies
  for each row execute function assign_account_no();

create or replace function assign_deal_no() returns trigger language plpgsql as $fn$
begin
  if new.deal_no is null then
    new.deal_no := 'D-' || lpad(nextval('deal_no_seq')::text, 4, '0');
  end if;
  return new;
end $fn$;

drop trigger if exists trg_deal_no_opp on opportunities;
create trigger trg_deal_no_opp before insert on opportunities
  for each row execute function assign_deal_no();
drop trigger if exists trg_deal_no_lead on leads;
create trigger trg_deal_no_lead before insert on leads
  for each row execute function assign_deal_no();
