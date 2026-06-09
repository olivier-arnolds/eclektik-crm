-- data_glint_delivery_contractor_fallback_2026-06-09.sql
-- Fills contractor names on the journey cards that have no sheet CS/PS owner
-- (the 13 Graveyard rows built from funnel deals + BMC, which has no owner on the
-- master sheet). Source = the account team in account_links, limited to Eclektik
-- consultants (email @eclectik.co) so client / Microsoft contacts are never shown.
-- Names are written into other_contractors; the card renders de-duplicated first
-- names. Graveyard rows are manual=true so the Graph sync won't overwrite them.
-- Eppendorf has no @eclectik.co contact linked, so it stays blank (fix by linking
-- the right consultant to the account in the CRM).
-- Applied via Supabase MCP 2026-06-09; backup: _dq_backup_glint_delivery_20260609f.

update glint_delivery g
set other_contractors = sub.names
from (
  select g2.id, string_agg(distinct ct.full_name, ', ') as names
  from glint_delivery g2
  join account_links al on al.account_id = g2.company_id
  join contacts ct on ct.id = al.contact_id and lower(ct.email) like '%@eclectik.co'
  where coalesce(g2.cs_owner,'')='' and coalesce(g2.ps_owner,'')='' and coalesce(g2.other_contractors,'')=''
  group by g2.id
) sub
where g.id = sub.id;
