-- ─────────────────────────────────────────────────────────────────────────
-- REVERT: owner normalization applied 2026-06-01 (v1.3.0)
--
-- What the change did: collapsed all `owner` values in companies, contacts,
-- leads, opportunities and tasks to the three canonical full names
-- (Marco van Gelder / Olivier Arnolds / Yarmilla Koenders). Legacy Dynamics
-- owners (Jonathan Khongwir, Desiree Cisneros) and NULL owners were assigned
-- to Marco van Gelder. `comms.owner` was intentionally NOT touched (it stores
-- the external counterparty name, not a team owner).
--
-- To UNDO it, run this whole script in the Supabase SQL Editor. It restores
-- every row's original owner from the snapshot table taken just before the
-- change. Requires public._owner_backup_20260601 to still exist.
-- ─────────────────────────────────────────────────────────────────────────

update companies     c set owner = b.owner from public._owner_backup_20260601 b where b.tbl = 'companies'     and b.id = c.id;
update contacts      c set owner = b.owner from public._owner_backup_20260601 b where b.tbl = 'contacts'      and b.id = c.id;
update leads         c set owner = b.owner from public._owner_backup_20260601 b where b.tbl = 'leads'         and b.id = c.id;
update opportunities c set owner = b.owner from public._owner_backup_20260601 b where b.tbl = 'opportunities' and b.id = c.id;
update tasks         c set owner = b.owner from public._owner_backup_20260601 b where b.tbl = 'tasks'         and b.id = c.id;

-- Once you're confident the normalization is good and no revert is needed,
-- drop the snapshot table to keep the schema clean:
--   drop table public._owner_backup_20260601;
