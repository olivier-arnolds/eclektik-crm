-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: Stage-change DB trigger
-- Datum: 2026-05-18
-- ============================================================
-- Detecteert UPDATEs op opportunities.stage en creëert
-- playbook_suggestions voor matching playbooks met trigger_type='stage_change'.
-- ============================================================

-- =====================
-- STAP 1: Helper-functie
-- =====================

create or replace function public.create_stage_change_suggestions()
returns trigger
language plpgsql
security definer
as $$
declare
  pb record;
begin
  if NEW.stage is null or (OLD.stage is not distinct from NEW.stage) then
    return NEW;
  end if;

  for pb in
    select id from public.playbooks
     where status = 'active'
       and trigger_type = 'stage_change'
       and (trigger_config->>'to_stage') = NEW.stage
  loop
    if not exists (
      select 1 from public.playbook_suggestions
       where playbook_id = pb.id
         and deal_id = NEW.id
         and status = 'pending'
    ) then
      insert into public.playbook_suggestions
        (playbook_id, deal_id, source, source_context, status)
      values (
        pb.id,
        NEW.id,
        'stage_change',
        jsonb_build_object(
          'from_stage', OLD.stage,
          'to_stage', NEW.stage,
          'opportunity_name', NEW.name,
          'opportunity_value', NEW.value
        ),
        'pending'
      );
    end if;
  end loop;

  return NEW;
end $$;

comment on function public.create_stage_change_suggestions is
  'Trigger: creeert playbook_suggestions bij stage-changes op opportunities. Dedupes per deal+playbook.';

-- =====================
-- STAP 2: Trigger op opportunities
-- =====================

drop trigger if exists trg_opportunities_stage_suggestions on public.opportunities;

create trigger trg_opportunities_stage_suggestions
after update on public.opportunities
for each row
when (NEW.stage is distinct from OLD.stage)
execute function public.create_stage_change_suggestions();

-- =====================
-- STAP 3: Verify
-- =====================

select
  exists (select 1 from pg_proc where proname = 'create_stage_change_suggestions') as fn_exists,
  exists (select 1 from pg_trigger where tgname = 'trg_opportunities_stage_suggestions') as trg_exists;
-- Expected: beide true
