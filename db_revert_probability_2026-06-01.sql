-- ─────────────────────────────────────────────────────────────────────────
-- REVERT: stage-driven probability backfill applied 2026-06-01 (v1.4.0)
--
-- What the change did: set `probability` on every lead and opportunity to a
-- fixed value derived from its funnel stage —
--   qualify 20 · develop 40 · proposal 60 · close 0 ·
--   onboarding 80 · active 100 · sleeping 100.
-- Going forward the app also sets this automatically on every stage move
-- (STAGE_PROBABILITY in src/bd/adapters.js → stageUpdates).
--
-- To UNDO the data backfill, run this script in the Supabase SQL Editor. It
-- restores each row's original probability from the snapshot taken just
-- before the change. Requires public._probability_backup_20260601 to exist.
-- (Note: this only reverts the DATA. To also stop the app auto-setting
--  probability on stage moves, revert the code via git: git checkout <tag>.)
-- ─────────────────────────────────────────────────────────────────────────

update leads         c set probability = b.probability from public._probability_backup_20260601 b where b.tbl = 'leads'         and b.id = c.id;
update opportunities c set probability = b.probability from public._probability_backup_20260601 b where b.tbl = 'opportunities' and b.id = c.id;

-- Once you're confident, drop the snapshot table:
--   drop table public._probability_backup_20260601;
