-- data_glint_delivery_pimco_relink_2026-06-10.sql
-- The 3 "PIMCO Prima Real Estate" delivery projects were mislinked to IMC's
-- company record because glint-sync matched the substring "imc" inside "pIMCo".
-- Root cause fixed in api/glint-sync.js (matchCompany: no short reverse-substring
-- match + explicit alias). This repoints the existing rows to the correct company.
-- Applied via Supabase MCP 2026-06-10; backup: _dq_backup_glint_delivery_20260610.

update glint_delivery
set company_id = '09ff4099-9ef5-4931-9890-84a14d5103fa'   -- PIMCO Prime Real Estate
where project_no in ('P-0026','P-0027','P-0028') and client_name ilike 'PIMCO Prima%';
