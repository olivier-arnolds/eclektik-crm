-- Rollback for the one-row data fix that marked the Alex Lee 2026 deal as Won.
-- Forward change (run in Supabase) was:
--   update public.opportunities
--   set status='Won', close_date='2026-06-05', actual_close_date='2026-06-05'
--   where id='c0e2fd26-a4ec-4697-9b57-2908c373f126';
--
-- This restores the exact prior values (status/close dates were all null).

update public.opportunities
set status = null,
    close_date = null,
    actual_close_date = null
where id = 'c0e2fd26-a4ec-4697-9b57-2908c373f126';
