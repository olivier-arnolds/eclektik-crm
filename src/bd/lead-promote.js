// Promote a `leads` row to an `opportunities` row.
//
// Called from doMove when a user drags a lead onto a stage that only
// opportunities can occupy (develop/proposal/onboarding/active/sleeping).
//
// Steps (best-effort, NOT a SQL transaction — Supabase JS client does not
// expose transactions; we order operations so a failure halfway leaves the
// data in a recoverable state):
//   1. Read the lead row
//   2. Insert a new opportunity row using shared columns + the target stage
//   3. Reparent child rows (tasks/follow_ups/comms/calendar_events) from
//      lead_id → opportunity_id
//   4. Delete the original lead row
//
// On any error, throws — caller should alert() and refetch.
import { supabase } from '../supabase';
import { stageUpdates } from './adapters';

// Columns that exist on BOTH leads and opportunities and should be carried
// over directly. Verified against information_schema (May 2026).
const SHARED_COLUMNS = [
  'dynamics_id',
  'topic',
  'company_id',
  'company_name',
  'description',
  'notes',
  'owner',
  'team',
  'probability',
  'close_date',
  'product_line',
  'est_revenue',
  'created_on',
];

// Child tables that reference lead_id / opportunity_id and need reparenting.
const CHILD_TABLES = ['tasks', 'follow_ups', 'comms', 'calendar_events'];

export async function promoteLeadToOpportunity(leadId, targetStage) {
  // 1. Fetch the lead
  const { data: lead, error: fetchErr } = await supabase
    .from('leads').select('*').eq('id', leadId).single();
  if (fetchErr) throw new Error(`Read lead failed: ${fetchErr.message}`);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  // 2. Build opportunity row from shared columns + stage updates
  const oppRow = {};
  for (const col of SHARED_COLUMNS) {
    if (lead[col] !== undefined && lead[col] !== null) oppRow[col] = lead[col];
  }
  // Lead-specific fields that map to opportunity equivalents
  if (lead.parent_contact) oppRow.contact_id = lead.parent_contact;
  if (lead.full_name) oppRow.contact_name = lead.full_name;
  // Apply target stage (sets stage / sub_status / status / status_reason)
  Object.assign(oppRow, stageUpdates(targetStage, 'opportunities'));

  const { data: newOpp, error: insErr } = await supabase
    .from('opportunities').insert(oppRow).select('id').single();
  if (insErr) throw new Error(`Insert opportunity failed: ${insErr.message}`);
  const newOppId = newOpp.id;

  // 3. Reparent child rows. We do these sequentially and ignore errors that
  // indicate the column doesn't exist on a given table (PostgREST 42703) —
  // some child tables may not actually carry both FKs.
  for (const tbl of CHILD_TABLES) {
    const { error: updErr } = await supabase
      .from(tbl)
      .update({ opportunity_id: newOppId, lead_id: null })
      .eq('lead_id', leadId);
    if (updErr && !/column .* does not exist/i.test(updErr.message)) {
      // Non-schema errors: surface them, but don't roll back — the new opp
      // already exists, child rows are partially migrated. User can re-run.
      throw new Error(`Reparent ${tbl} failed: ${updErr.message}`);
    }
  }

  // 4. Delete the original lead
  const { error: delErr } = await supabase
    .from('leads').delete().eq('id', leadId);
  if (delErr) throw new Error(`Delete lead failed: ${delErr.message}`);

  return newOppId;
}
