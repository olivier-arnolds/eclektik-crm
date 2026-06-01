-- Revert script — data-quality corrections applied 2026-06-01 (v1.5.1)
-- Run in the Supabase SQL Editor to undo the change. Restores opportunity
-- status/actual_revenue and company type/country from the snapshot tables
-- taken immediately before the change.
--
-- What this reverts:
--   • Breitling + BioMarin active deals: status was set to 'Won'
--     (BioMarin's actual_revenue 0 was cleared to NULL so the estimate counted).
--   • European Training Foundation (ETF), PIMCO Prime Real Estate, BioMarin:
--     type Prospect → Customer.
--   • BMC Software: country '' → 'US'.
--
-- (Microsoft Corp was intentionally left as Partner and is NOT affected.)

BEGIN;

UPDATE opportunities o
   SET status         = b.status,
       actual_revenue = b.actual_revenue
  FROM public._dq_backup_opps_20260601 b
 WHERE o.id = b.id;

UPDATE companies c
   SET type    = b.type,
       country = b.country
  FROM public._dq_backup_companies_20260601 b
 WHERE c.id = b.id;

COMMIT;

-- Verify the revert, then (only once confirmed good) drop the snapshots:
--   DROP TABLE IF EXISTS public._dq_backup_opps_20260601;
--   DROP TABLE IF EXISTS public._dq_backup_companies_20260601;
