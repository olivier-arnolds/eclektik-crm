import { requireUser, requireQueueSecret } from './_lib/guard.js';
// GET  /api/next-feature-request          → returns the oldest 'approved' row
// POST /api/next-feature-request           → marks a request as in_progress
//   Body: { id }
// POST /api/next-feature-request?done=1    → marks a request as done with a commit
//   Body: { id, commit_sha?, notes? }
//
// Designed to be called from a Claude Code session via curl — Claude
// fetches the next approved request, implements it, then marks it done.
import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  // Auth guard (v1.39.0): either the automation queue secret
  // (x-feature-queue-secret, for Claude's feature-pull workflow) or a
  // logged-in CRM user.
  if (!requireQueueSecret(req)) {
    const authedUser = await requireUser(req, res);
    if (!authedUser) return;
  }

  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(200).json({ empty: true, message: 'No approved requests in the queue.' });
    return res.status(200).json({ request: data });
  }

  if (req.method === 'POST') {
    const { id, commit_sha, notes } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const isDone = req.query?.done === '1';

    const patch = isDone
      ? { status: 'done', done_at: new Date().toISOString(), commit_sha: commit_sha || null, decision_notes: notes || null }
      : { status: 'in_progress', claude_started_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('feature_requests').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ request: data });
  }

  return res.status(405).json({ error: 'GET or POST required' });
}
