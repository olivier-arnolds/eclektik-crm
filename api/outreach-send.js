import { requireUser } from './_lib/guard.js';
import { runOutreachBatch } from './_lib/outreach-runner.js';

// POST /api/outreach-send - job A, handmatig: de knop 'verstuur batch' in de
// Outreach-tab. Ontwerp: docs/outreach-handover.md §5 (job A) en §6.
//
// De kern staat in api/_lib/outreach-runner.js, want de cron
// (api/outreach-drip.js) gebruikt precies dezelfde logica. Daar zit de
// claim-dan-verstuur-volgorde die dubbele berichten onmogelijk maakt, en die
// hoort maar op een plek te staan.
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { campaign_id, limit, onlyStep = null, dry_run = false } = req.body || {};
  const { status, body } = await runOutreachBatch({ campaign_id, limit, onlyStep, dry_run });
  return res.status(status).json(body);
}
