-- ── Atomic lead→opportunity promotion (applied 2026-06-09, migration:
--    promote_lead_to_opportunity_atomic, v1.36.0)
--
-- Replaces the 4-step best-effort JS flow in src/bd/lead-promote.js
-- (insert opp → reparent tasks/follow_ups/comms/calendar_events → delete
-- lead) with ONE transactional Postgres function. Any failure rolls back
-- everything — no more orphaned child rows or half-promoted leads.
--
-- Called from the frontend via supabase.rpc('promote_lead_to_opportunity',
-- { p_lead_id, p_updates }) where p_updates is the output of
-- stageUpdates(targetStage, 'opportunities') from src/bd/adapters.js.
--
-- Behavior change vs the old JS flow: the lead's deal_no (D-####) is carried
-- over to the new opportunity, so a deal KEEPS its number across promotion.
-- (The assign_deal_no trigger only fires when deal_no is null, and the
-- numbering sequence is CRM-wide unique — see schema_numbering_2026-06-07.sql.)
--
-- Type note: leads.parent_contact is text, opportunities.contact_id is uuid —
-- the regex guard below skips non-uuid values instead of erroring.

create or replace function public.promote_lead_to_opportunity(
  p_lead_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_new_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead % not found', p_lead_id;
  end if;

  insert into public.opportunities (
    dynamics_id, topic, company_id, company_name, description, notes,
    owner, team, probability, close_date, product_line, est_revenue,
    created_on, contact_id, contact_name, deal_no,
    stage, sub_status, status, status_reason, actual_close_date
  ) values (
    v_lead.dynamics_id,
    v_lead.topic,
    v_lead.company_id,
    v_lead.company_name,
    v_lead.description,
    v_lead.notes,
    v_lead.owner,
    v_lead.team,
    coalesce((p_updates->>'probability')::numeric, v_lead.probability),
    coalesce((p_updates->>'close_date')::date, v_lead.close_date),
    v_lead.product_line,
    v_lead.est_revenue,
    v_lead.created_on,
    case when v_lead.parent_contact ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
         then v_lead.parent_contact::uuid end,
    v_lead.full_name,
    v_lead.deal_no,
    coalesce(p_updates->>'stage', 'opportunity'),
    p_updates->>'sub_status',
    p_updates->>'status',
    p_updates->>'status_reason',
    (p_updates->>'actual_close_date')::date
  ) returning id into v_new_id;

  update public.tasks           set opportunity_id = v_new_id, lead_id = null where lead_id = p_lead_id;
  update public.follow_ups      set opportunity_id = v_new_id, lead_id = null where lead_id = p_lead_id;
  update public.comms           set opportunity_id = v_new_id, lead_id = null where lead_id = p_lead_id;
  update public.calendar_events set opportunity_id = v_new_id, lead_id = null where lead_id = p_lead_id;

  delete from public.leads where id = p_lead_id;

  return v_new_id;
end $$;

grant execute on function public.promote_lead_to_opportunity(uuid, jsonb) to authenticated;
