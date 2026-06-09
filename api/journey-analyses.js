import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';

// Returns the set of People Science client names that have at least one analysis
// on record, for the War-room Customer-journey board (green/red dot per project).
// Reads the SEPARATE People Science Supabase project (same creds as
// insights-review.js: PS_SUPABASE_URL / PS_SUPABASE_KEY, service_role).
// Returns an empty list (not an error) when PS isn't configured, so the board
// degrades gracefully.

const PS_URL = process.env.PS_SUPABASE_URL;
const PS_KEY = process.env.PS_SUPABASE_KEY;

export default async function handler(req, res) {
  // Auth guard (v1.39.0): only logged-in CRM users may call this endpoint.
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (!PS_URL || !PS_KEY) return res.status(200).json({ analysed: [], note: 'PS not configured' });
  try {
    const ps = createClient(PS_URL.trim(), PS_KEY.trim());
    const [{ data: clients, error: e1 }, { data: cycles, error: e2 }, { data: analyses, error: e3 }] = await Promise.all([
      ps.from('clients').select('id, name, slug'),
      ps.from('cycles').select('id, client_id'),
      ps.from('analyses').select('cycle_id'),
    ]);
    if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);
    const analysedCycle = new Set((analyses || []).map(a => a.cycle_id));
    const clientHas = new Set();
    (cycles || []).forEach(cy => { if (analysedCycle.has(cy.id)) clientHas.add(cy.client_id); });
    const analysed = (clients || []).filter(c => clientHas.has(c.id)).map(c => c.name);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({ analysed });
  } catch (err) {
    return res.status(200).json({ analysed: [], error: err?.message || String(err) });
  }
}
