-- Rollback for setting IMC "Global Insight Review 2026" to active (so it values
-- the war-room delivery row). Forward change was:
--   update public.opportunities set stage='active', sub_status=null
--   where id='d8f41d34-5e74-414b-881f-c735ec64d404';
-- This restores its prior state (stage 'past', sub_status null; it was Won,
-- close_date 2026-02-09, which is unchanged).

update public.opportunities
set stage = 'past', sub_status = null
where id = 'd8f41d34-5e74-414b-881f-c735ec64d404';
