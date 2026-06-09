import { requireCron } from './_lib/guard.js';
// Weekly cron - markeert oude pending suggestions als 'expired'.
// Trigger: vercel.json cron, 0 6 * * 1 (6u maandag).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EXPIRY_DAYS = 14;

export default async function handler(req, res) {
  // Auth guard (v1.39.0): Vercel cron invocations only.
  if (!requireCron(req, res)) return;

  try {
    const cutoff = new Date(Date.now() - EXPIRY_DAYS * 86400 * 1000).toISOString();

    const { data, error } = await supabase
      .from('playbook_suggestions')
      .update({ status: 'expired', resolved_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .select('id');

    if (error) throw new Error(error.message);

    res.status(200).json({ status: 'ok', expired_count: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}
