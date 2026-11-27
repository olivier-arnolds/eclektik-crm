import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { verwerkKandidaten } from './_lib/outreach-classify-apply.js';

// POST /api/outreach-classify - job B, tweede helft.
//
// De tab leest Marco's inbox in de browser (src/lib/graph.js getFolderEmails) en
// matcht met src/bd/outreach-match.js. Die kandidaten komen hierheen, want de
// Anthropic-key staat server-side. Dit endpoint classificeert, legt de inkomende
// mail vast in outreach_message en werkt de status van de prospect bij.
// Ontwerp: docs/outreach-handover.md §5 en addendum §9.
//
// Bewust GEEN client-facing tekst (§2b geldt hier niet): alles is intern.
//
// Drie paden per kandidaat:
//   bounce       -> deterministisch, geen AI-call (goedkoper en betrouwbaarder)
//   domain_flag  -> alleen vastleggen voor handwerk, NOOIT een status wijzigen
//   sender match -> Claude classificeert, dan de statusregels uit outreach-match
//
// Idempotent: berichten waarvan het Graph-id al in outreach_message staat worden
// overgeslagen, zodat een tweede scan niets dubbel doet of terugdraait.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const MAX_CANDIDATES = 25;



export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { campaign_id, candidates } = req.body || {};
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id is verplicht' });
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'candidates[] is verplicht' });
  }
  if (candidates.length > MAX_CANDIDATES) {
    return res.status(400).json({ error: `max ${MAX_CANDIDATES} kandidaten per aanroep` });
  }

  // Het eigenlijke werk staat in _lib/outreach-classify-apply.js, want de cron
  // doet precies hetzelfde zonder ingelogde gebruiker.
  const uitkomst = await verwerkKandidaten({ supabase, campaignId: campaign_id, candidates });
  if (uitkomst.fout) return res.status(500).json({ error: uitkomst.fout });
  const { stats, details } = uitkomst;

  return res.status(200).json({ ok: true, stats, details });
}
