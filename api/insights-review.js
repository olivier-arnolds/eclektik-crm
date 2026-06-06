import { createClient } from '@supabase/supabase-js';

// Builds the Insights-review matrix for the War room: clients (rows) × quarters
// (columns), green where a survey cycle has an analysis on record, red where a
// cycle exists but has no analysis yet. Data comes from the People Science
// project (peoplescience.eclectik-insights.co / its Supabase), which is a
// SEPARATE database from the CRM.
//
// ── PREREQUISITE ───────────────────────────────────────────────────────────
// Set two Vercel env vars pointing at the People Science project:
//   PS_SUPABASE_URL  = https://yvhiowhiertndhyahvgh.supabase.co
//   PS_SUPABASE_KEY  = a key with read access to clients / cycles / analyses
// Until those exist the endpoint returns 503 and the tab shows an empty matrix.

const PS_URL = process.env.PS_SUPABASE_URL;
const PS_KEY = process.env.PS_SUPABASE_KEY;

function quarterOf(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

export default async function handler(req, res) {
  if (!PS_URL || !PS_KEY) {
    return res.status(503).json({ error: 'People Science source not configured (PS_SUPABASE_URL / PS_SUPABASE_KEY).' });
  }
  const ps = createClient(PS_URL, PS_KEY);

  try {
    const [{ data: clients, error: e1 }, { data: cycles, error: e2 }, { data: analyses, error: e3 }] = await Promise.all([
      ps.from('clients').select('id, name, slug, parent_slug, display_order'),
      ps.from('cycles').select('id, client_id, label, survey_date'),
      ps.from('analyses').select('cycle_id'),
    ]);
    if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);

    const analysedCycle = new Set((analyses || []).map(a => a.cycle_id));

    // Rows = clients ordered by display_order, with sub-clients (parent_slug) kept
    // directly under their parent.
    const bySlug = new Map((clients || []).map(c => [c.slug, c]));
    const rows = [...(clients || [])].sort((a, b) => {
      const ra = a.parent_slug ? `${(bySlug.get(a.parent_slug)?.display_order ?? 999)}.${a.display_order}` : `${a.display_order}.0`;
      const rb = b.parent_slug ? `${(bySlug.get(b.parent_slug)?.display_order ?? 999)}.${b.display_order}` : `${b.display_order}.0`;
      return parseFloat(ra) - parseFloat(rb);
    }).map(c => ({ id: c.id, name: c.name, isSub: !!c.parent_slug }));

    // Cells: per client, per quarter → 'green' (any analysed cycle) | 'red' (cycle, none analysed).
    const quarters = new Set();
    const cells = {};
    (cycles || []).forEach(cy => {
      const q = quarterOf(cy.survey_date);
      if (!q) return;
      quarters.add(q);
      cells[cy.client_id] = cells[cy.client_id] || {};
      const cur = cells[cy.client_id][q];
      const val = analysedCycle.has(cy.id) ? 'green' : 'red';
      // green wins if any cycle in that client+quarter has an analysis
      if (cur !== 'green') cells[cy.client_id][q] = val;
    });

    const quarterList = [...quarters].sort((a, b) => {
      const [ya, qa] = a.split('-Q').map(Number);
      const [yb, qb] = b.split('-Q').map(Number);
      return ya - yb || qa - qb;
    });

    return res.status(200).json({ clients: rows, quarters: quarterList, cells });
  } catch (err) {
    console.error('insights-review error:', err);
    return res.status(502).json({ error: 'Failed to read People Science data: ' + err.message });
  }
}
