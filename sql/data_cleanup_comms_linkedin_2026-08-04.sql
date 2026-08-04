-- data_cleanup_comms_linkedin_2026-08-04.sql
--
-- Opschoning: verwijder de oude LinkedIn-rijen uit de `comms`-tabel.
--
-- Context: LinkedIn wordt in de app LIVE uit Unipile opgehaald (zie
-- src/bd/lane-comms.jsx), niet uit deze DB-cache. Sinds v1.55.6 sluit de
-- comms-fetch channel='linkedin' al uit (usePipelineData.js). Deze 1064
-- rijen waren dus dode data die enkel de tabel opblies.
--
-- Uitgevoerd via Supabase MCP op 2026-08-04. Backup vooraf gemaakt.
--   comms voor:  1066 (1064 linkedin + 2 email)
--   comms na:       2 (0 linkedin + 2 email)

-- 1) Backup van de te verwijderen rijen (rollback-bron)
create table if not exists _dq_backup_comms_linkedin_20260804 as
  select * from comms where channel = 'linkedin';

-- 2) Verwijderen
delete from comms where channel = 'linkedin';

-- 3) Verificatie
-- select count(*) from comms;                        -- verwacht: 2
-- select count(*) from comms where channel='linkedin'; -- verwacht: 0

-- Rollback (indien nodig):
--   insert into comms select * from _dq_backup_comms_linkedin_20260804;
--
-- Backuptabel opruimen zodra bevestigd (bv. na 30 dagen):
--   drop table _dq_backup_comms_linkedin_20260804;
