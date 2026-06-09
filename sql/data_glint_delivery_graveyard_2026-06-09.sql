-- data_glint_delivery_graveyard_2026-06-09.sql
-- Adds a `manual` flag to glint_delivery and seeds the "Graveyard" journey lane
-- with Won/active Glint engagements that have no delivery-project row (so they
-- weren't on the journey board). manual=true protects them from the glint-sync
-- cleanup (which only deletes non-manual rows not present in the sheet).
-- Applied via Supabase MCP 2026-06-09; backup: _dq_backup_glint_delivery_20260609c.

alter table public.glint_delivery add column if not exists manual boolean default false;

insert into glint_delivery (sheet_key, client_name, project_name, company_id, journey_stage, status, manual, synced_at)
select 'gy|'||o.deal_no, c.name, o.topic||' · '||o.deal_no, o.company_id, 'graveyard', 'Completed', true, now()
from opportunities o join companies c on c.id = o.company_id
where o.deal_no in ('D-0009','D-0064','D-0014','D-0013','D-0010','D-0108','D-0072','D-0022','D-0027','D-0068','D-0035','D-0073','D-0091')
on conflict (sheet_key) do update set
  journey_stage = 'graveyard', manual = true,
  client_name = excluded.client_name, project_name = excluded.project_name, company_id = excluded.company_id;
