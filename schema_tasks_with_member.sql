-- Adds the "With" field to tasks: a single Eclectik team member who joins /
-- collaborates on the task (distinct from `owner`, who the task is FOR).
-- The picker in the app lists contacts linked to any account as
-- link_type='eclectik_team'. Stored as a contact FK so names stay consistent
-- and the tasks list can sort on it.
--
-- Run in the Supabase SQL editor. `tasks` already has RLS + the uniform
-- "auth users full access" policy, so adding a column needs nothing further.

alter table public.tasks
  add column if not exists with_contact_id uuid
  references public.contacts(id) on delete set null;

-- Optional: index for sorting/filtering by the With member.
create index if not exists idx_tasks_with_contact on public.tasks(with_contact_id);
