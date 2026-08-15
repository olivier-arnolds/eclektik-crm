import { requireCron } from './_lib/guard.js';
import { sendLinkedInInvite } from './_lib/unipile-invite.js';
import { createClient } from '@supabase/supabase-js';

// Connectie-drip-cron: stuurt gedoseerd connectieverzoeken uit de wachtrij
// (linkedin_invite_queue). Per account een harde DAGCAP; per run een klein aantal
// (PER_RUN) zodat het over de dag verspreid wordt. Draait op werkdagen tijdens
// kantooruren (zie vercel.json). Bij een fout: retry tot MAX_ATTEMPTS, daarna
// status 'failed'. Al-verbonden contacten worden 'skipped'.

export const config = { maxDuration: 60 };

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAILY_CAP = Number(process.env.INVITE_DAILY_CAP) || 15;  // per account per dag
const PER_RUN = Number(process.env.INVITE_PER_RUN) || 2;       // per account per cron-run (spreiding)
const PACE_MS = 1500;
const MAX_ATTEMPTS = 2;

export default async function handler(req, res) {
  if (!requireCron(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  // Vandaag (UTC-middernacht) — grove dag-grens voor de cap.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Accounts met werk in de wachtrij.
  const { data: accRows, error: accErr } = await supabase
    .from('linkedin_invite_queue').select('account_id').eq('status', 'queued');
  if (accErr) return res.status(500).json({ error: accErr.message });
  const accounts = [...new Set((accRows || []).map(r => r.account_id))];

  const stats = { accounts: accounts.length, sent: 0, skipped: 0, failed: 0, capped: 0 };
  const details = [];

  for (const account_id of accounts) {
    // Al verstuurd vandaag voor dit account?
    const { count: sentToday } = await supabase
      .from('linkedin_invite_queue')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account_id).eq('status', 'sent').gte('sent_at', todayIso);
    const remaining = Math.max(0, DAILY_CAP - (sentToday || 0));
    if (remaining === 0) { stats.capped++; continue; }
    const toSend = Math.min(PER_RUN, remaining);

    // Oudste queued items voor dit account, met contact-URL.
    const { data: rows, error } = await supabase
      .from('linkedin_invite_queue')
      .select('id, contact_id, message, attempts, contacts(linkedin_url, full_name)')
      .eq('account_id', account_id).eq('status', 'queued')
      .order('created_at', { ascending: true }).limit(toSend);
    if (error) { details.push({ account_id, error: error.message }); continue; }

    for (const row of (rows || [])) {
      const url = row.contacts?.linkedin_url;
      if (!url) {
        await supabase.from('linkedin_invite_queue').update({ status: 'failed', error: 'geen linkedin_url', updated_at: new Date().toISOString() }).eq('id', row.id);
        stats.failed++; continue;
      }
      let out;
      try {
        out = await sendLinkedInInvite({ accountId: account_id, linkedinUrl: url, message: row.message });
      } catch (e) { out = { ok: false, error: e.message }; }

      if (out.ok) {
        await supabase.from('linkedin_invite_queue').update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', row.id);
        stats.sent++; details.push({ account_id, contact: row.contacts?.full_name, status: 'sent' });
      } else if (out.alreadyConnected) {
        await supabase.from('linkedin_invite_queue').update({ status: 'skipped', error: 'al verbonden', updated_at: new Date().toISOString() }).eq('id', row.id);
        stats.skipped++; details.push({ account_id, contact: row.contacts?.full_name, status: 'skipped (al verbonden)' });
      } else {
        const attempts = (row.attempts || 0) + 1;
        const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'queued';
        await supabase.from('linkedin_invite_queue').update({ status, attempts, error: out.error || 'onbekende fout', updated_at: new Date().toISOString() }).eq('id', row.id);
        if (status === 'failed') { stats.failed++; details.push({ account_id, contact: row.contacts?.full_name, status: 'failed', error: out.error }); }
        console.warn('[linkedin-invite-drip] invite mislukt', account_id, row.contact_id, out.error);
      }
      await sleep(PACE_MS);
    }
  }

  return res.status(200).json({ ok: true, at: new Date().toISOString(), cap: DAILY_CAP, per_run: PER_RUN, stats, details });
}
