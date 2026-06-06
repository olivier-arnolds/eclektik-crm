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

  try {
    const url = (PS_URL || '').trim();
    const key = (PS_KEY || '').trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
      return res.status(500).json({ error: `PS_SUPABASE_URL looks wrong: "${url.slice(0, 40)}". Expected https://<ref>.supabase.co` });
    }
    const ps = createClient(url, key);
    const [{ data: clients, error: e1 }, { data: cycles, error: e2 }, { data: analyses, error: e3 }] = await Promise.all([
      ps.from('clients').select('id, name, slug, parent_slug, display_order, status, meta'),
      ps.from('cycles').select('id, client_id, label, survey_date'),
      ps.from('analyses').select('cycle_id'),
    ]);
    if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);

    const analysedCycle = new Set((analyses || []).map(a => a.cycle_id));

    // Cohorts mirror the People Science meta page: active/closed = deeply
    // analysed, pre-ir/pre-contract = predictive framing. Exclude the
    // "meta-analysis" pseudo-client. Children inherit their parent's cohort.
    const real = (clients || []).filter(c => c.slug !== 'meta' && c?.meta?.kind !== 'meta');
    const bySlug = new Map(real.map(c => [c.slug, c]));
    const parentSlugs = new Set(real.filter(c => c.parent_slug).map(c => c.parent_slug));
    const cohortOf = (c) => {
      const base = c.parent_slug ? (bySlug.get(c.parent_slug) || c) : c;
      return ['pre-ir', 'pre-contract'].includes(base.status) ? 'pre' : 'deep';
    };
    const orderKey = (c) => c.parent_slug
      ? (bySlug.get(c.parent_slug)?.display_order ?? 999) + c.display_order / 1000
      : c.display_order;

    const SECTIONS = [
      { key: 'deep', label: 'Deeply analysed — IR read end-to-end' },
      { key: 'pre', label: 'Pre-IR / pre-contract — predictive framing' },
    ];
    const rows = [];
    SECTIONS.forEach(s => {
      real.filter(c => cohortOf(c) === s.key).sort((a, b) => orderKey(a) - orderKey(b))
        .forEach(c => rows.push({ id: c.id, name: c.name, isSub: !!c.parent_slug, cohort: s.key }));
    });
    const sections = SECTIONS.map(s => ({
      key: s.key, label: s.label,
      count: real.filter(c => cohortOf(c) === s.key && !parentSlugs.has(c.slug)).length,
    }));

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

    return res.status(200).json({ clients: rows, sections, quarters: quarterList, cells });
  } catch (err) {
    console.error('insights-review error:', err);
    return res.status(502).json({ error: 'Failed to read People Science data: ' + (err?.message || String(err)) });
  }
}
