-- Eenmalige data-migratie: twee "develop-leads" promoveren naar opportunities.
--
-- Achtergrond: tot v1.84.2 kon je in de "New deal"-modal direct op Develop/
-- Proposal/Close aanmaken, wat een LEAD met sub_status='develop' opleverde
-- zonder promotie naar opportunities. Zulke records zijn zichtbaar in de BD-app
-- (die leads + opportunities samen toont) maar onzichtbaar voor alles wat alleen
-- de opportunities-tabel leest (Control Room, rapportages, externe checks).
--
-- Twee records staan in die halfstaat:
--   D-0167  Zurich  (ROI, develop, 100K, 40%)  lead 49f8b479-c7ad-4af7-9634-fd7bd18d51e0
--   D-0185  Sonova  (ROI, develop, 130K)        lead 462119f3-8739-4209-9d5a-a43f3f5cd8b1
--
-- We gebruiken exact dezelfde atomische promotie als de app (drag lead -> develop):
-- promote_lead_to_opportunity(lead_id, updates) — insert opp, child-rijen
-- (tasks/follow_ups/comms/calendar_events) reparenten, lead verwijderen, alles in
-- één transactie. deal_no blijft behouden. `updates` = stageUpdates('develop',
-- 'opportunities') uit src/bd/adapters.js.
--
-- Draai dit in de Supabase SQL Editor (project jdzaypckluncdwsoxurs).

-- 0) Backup (al aangemaakt op 2026-09-04; hier idempotent herhaald voor de zekerheid).
create table if not exists _dq_backup_leads_develop_20260904 as
  select * from leads where deal_no in ('D-0167','D-0185');

-- 1) Verifieer vooraf dat beide nog leads zijn met sub_status='develop'.
select 'before' as phase, id, deal_no, sub_status, status from leads
where id in ('49f8b479-c7ad-4af7-9634-fd7bd18d51e0','462119f3-8739-4209-9d5a-a43f3f5cd8b1')
order by deal_no;

-- 2) Promoveer beide (irreversible merge: verwijdert de lead-rij).
select 'D-0167' as deal, promote_lead_to_opportunity(
  '49f8b479-c7ad-4af7-9634-fd7bd18d51e0'::uuid,
  '{"sub_status":"develop","stage":"opportunity","status":null,"probability":40,"status_reason":null}'::jsonb) as new_opp_id
union all
select 'D-0185', promote_lead_to_opportunity(
  '462119f3-8739-4209-9d5a-a43f3f5cd8b1'::uuid,
  '{"sub_status":"develop","stage":"opportunity","status":null,"probability":40,"status_reason":null}'::jsonb);

-- 3) Verifieer achteraf: staan nu als opportunity (stage='opportunity',
--    sub_status='develop'), zijn weg uit leads, en de taak van D-0167 is
--    gereparenteerd (opportunity_id gevuld, lead_id leeg).
select 'after_opps' as phase, deal_no, stage, sub_status, status, probability
from opportunities where deal_no in ('D-0167','D-0185') order by deal_no;

select 'after_leads_should_be_empty' as phase, count(*) as remaining
from leads where deal_no in ('D-0167','D-0185');

select 'after_task_reparent' as phase, id, lead_id, opportunity_id
from tasks where lead_id = '49f8b479-c7ad-4af7-9634-fd7bd18d51e0'
   or opportunity_id in (select id from opportunities where deal_no = 'D-0167');

-- Terugdraaien (indien nodig): de originele lead-rijen staan in
-- _dq_backup_leads_develop_20260904. Neem contact op voordat je terugrolt — de
-- child-rijen zijn dan al gereparenteerd naar de nieuwe opportunity.
