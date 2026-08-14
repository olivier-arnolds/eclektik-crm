import { requireUser } from './_lib/guard.js';
import { checkRelation } from './_lib/unipile-relation.js';
import { createClient } from '@supabase/supabase-js';

// Bulk LinkedIn-connectiecheck: check per geselecteerd contact of het gekozen
// Unipile-account 1e-graads verbonden is, en cache de uitkomst in
// contact_connections. Bewust gedoseerd (LinkedIn rate-limits): max 25 per ronde,
// met een pauze tussen calls en een tijd-budget zodat de functie binnen de
// serverless-timeout blijft (reeds gecheckte contacten zijn dan al gecached).
//
// POST { account_id, contact_ids: [uuid] }  (auth: ingelogde CRM-gebruiker)

export const config = { maxDuration: 60 };

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_PER_ROUND = 25;
const PACE_MS = 900;          // pauze tussen profiel-checks (account-veiligheid)
const TIME_BUDGET_MS = 48000; // stop met nieuwe checks na ~48s (timeout-marge)

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { account_id, contact_ids } = req.body || {};
  if (!account_id || !Array.isArray(contact_ids) || contact_ids.length === 0) {
    return res.status(400).json({ error: 'account_id en contact_ids[] vereist' });
  }
  const ids = contact_ids.slice(0, MAX_PER_ROUND);

  const { data: contacts, error } = await supabase
    .from('contacts').select('id, linkedin_url').in('id', ids);
  if (error) return res.status(500).json({ error: error.message });

  const start = Date.now();
  const stats = { checked: 0, connected: 0, not_connected: 0, no_url: 0, errors: 0, skipped_time: 0 };
  const results = [];

  for (const c of (contacts || [])) {
    if (!c.linkedin_url) { stats.no_url++; results.push({ contact_id: c.id, status: 'no_url' }); continue; }
    if (Date.now() - start > TIME_BUDGET_MS) { stats.skipped_time++; continue; }

    const r = await checkRelation({ accountId: account_id, linkedinUrl: c.linkedin_url });
    const status = r.status; // connected | not_connected | error
    // Cache-upsert (ook 'error' bewaren we zodat je ziet dat het gecheckt is).
    const { error: upErr } = await supabase.from('contact_connections').upsert({
      contact_id: c.id, account_id, status,
      network_distance: r.networkDistance || null,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'contact_id,account_id' });
    if (upErr) console.error('[linkedin-connections] upsert faalde', c.id, upErr.message);

    stats.checked++;
    if (status === 'connected') stats.connected++;
    else if (status === 'not_connected') stats.not_connected++;
    else stats.errors++;
    results.push({ contact_id: c.id, status, error: r.error });

    await sleep(PACE_MS);
  }

  return res.status(200).json({ ok: true, account_id, stats, results });
}
