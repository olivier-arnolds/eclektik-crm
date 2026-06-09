-- data_glint_delivery_deal_link_2026-06-09.sql
-- Links every delivery project to its funnel deal (opportunities/leads.deal_no, D-####)
-- so the journey board is consistent with the sales funnel. project_no (P-####)
-- stays as the per-project unique id; deal_no is the cross-reference (not unique:
-- e.g. PIMCO's 3 projects all map to its single deal D-0091).
-- Also repoints the 3 PIMCO Prime Real Estate projects that were mislinked to IMC's
-- company record back to the correct company.
-- Applied via Supabase MCP 2026-06-09; backup: _dq_backup_glint_delivery_20260609e.

alter table public.glint_delivery add column if not exists deal_no text;

update glint_delivery set company_id = '09ff4099-9ef5-4931-9890-84a14d5103fa'
where project_no in ('P-0026','P-0027','P-0028');

update glint_delivery set deal_no = (regexp_match(sheet_key, 'D-[0-9]+'))[1] where manual is true;

update glint_delivery g set deal_no = m.dn
from (values
  ('P-0001','D-0018'),('P-0002','D-0097'),('P-0003','D-0095'),('P-0004','D-0165'),
  ('P-0006','D-0109'),('P-0007','D-0012'),('P-0009','D-0036'),('P-0010','D-0118'),
  ('P-0011','D-0094'),('P-0012','D-0046'),('P-0015','D-0089'),('P-0016','D-0015'),
  ('P-0017','D-0093'),('P-0018','D-0075'),('P-0023','D-0062'),('P-0024','D-0058'),
  ('P-0026','D-0091'),('P-0027','D-0091'),('P-0028','D-0091'),('P-0030','D-0057'),
  ('P-0031','D-0023'),('P-0032','D-0030'),('P-0033','D-0037'),('P-0034','D-0085'),
  ('P-0035','D-0082'),('P-0037','D-0102'),('P-0038','D-0150')
) as m(pn, dn)
where g.project_no = m.pn;
