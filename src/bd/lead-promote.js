// Promote a `leads` row to an `opportunities` row.
//
// Called from doMove when a user drags a lead onto a stage that only
// opportunities can occupy (develop/proposal/onboarding/active/sleeping).
//
// Since v1.36.0 this is a single ATOMIC call to the Postgres function
// promote_lead_to_opportunity (sql/schema_promote_lead_atomic_2026-06-09.sql):
// insert opp → reparent child rows (tasks/follow_ups/comms/calendar_events)
// → delete lead, all in one transaction. Any failure rolls back everything —
// no more orphaned child rows or half-promoted leads.
//
// The lead's deal_no (D-####) is carried over, so a deal keeps its number
// across promotion.
//
// On any error, throws — caller should alert() and refetch.
import { supabase } from '../supabase';
import { stageUpdates } from './adapters';

export async function promoteLeadToOpportunity(leadId, targetStage) {
  // stageUpdates(target, 'opportunities') is the single source of truth for
  // what fields a stage move writes (stage / sub_status / status /
  // status_reason / probability / close_date / actual_close_date).
  const updates = stageUpdates(targetStage, 'opportunities');

  const { data: newOppId, error } = await supabase.rpc('promote_lead_to_opportunity', {
    p_lead_id: leadId,
    p_updates: updates,
  });
  if (error) throw new Error(`Promote lead failed: ${error.message}`);
  return newOppId;
}
