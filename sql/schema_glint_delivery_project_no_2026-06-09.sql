-- schema_glint_delivery_project_no_2026-06-09.sql
-- Gives every delivery project its own unique, CRM-assigned project id (P-####),
-- in the same spirit as companies.account_no (A-####) and the D-#### deal numbers.
-- Backfills existing rows (ordered by client, project name) and assigns new ones
-- via a before-insert trigger, so sheet syncs and manual/Graveyard rows all get one.
-- Applied via Supabase MCP 2026-06-09; backup: _dq_backup_glint_delivery_20260609d.

alter table public.glint_delivery add column if not exists project_no text;
create sequence if not exists glint_project_no_seq;

with ordered as (
  select id, row_number() over (order by client_name, project_name nulls last, id) rn
  from glint_delivery where project_no is null
)
update glint_delivery g set project_no = 'P-' || lpad(o.rn::text, 4, '0')
from ordered o where g.id = o.id;

select setval('glint_project_no_seq', (select count(*) from glint_delivery), true);

create or replace function set_glint_project_no() returns trigger as $$
begin
  if new.project_no is null then
    new.project_no := 'P-' || lpad(nextval('glint_project_no_seq')::text, 4, '0');
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_glint_project_no on glint_delivery;
create trigger trg_glint_project_no before insert on glint_delivery
  for each row execute function set_glint_project_no();
