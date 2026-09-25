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

  // Een tweede LinkedIn-bericht mag hier alleen als de gebruiker expliciet om
  // stap 2 vraagt. Dat hangt aan onlyStep en niet aan de knop als geheel, want
  // een gewone batch stuurt stap 1 en 2 door elkaar; dan zou een herinnering
  // meeliften zonder dat iemand dat bedoeld heeft. Stap 2 kiezen is een aparte
  // handeling van een mens die weet wat er uitgaat.
  const allowLinkedInStep2 = onlyStep === 2;

  const { status, body } = await runOutreachBatch({
    campaign_id, limit, onlyStep, dry_run, allowLinkedInStep2,
  });
  return res.status(status).json(body);
}
