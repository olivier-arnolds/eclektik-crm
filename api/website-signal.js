// POST /api/website-signal — intake van website-aanmeldingen (waitlist nu,
// scorecard-events straks). De website (eclectik-website-h2) stuurt:
//   { source:'website', event:'waitlist_joined', email, name, company,
//     role, sector, src? }
// met header x-webhook-secret. Zie docs/superpowers/specs/
// 2026-07-08-marketing-leads-pipeline-design.md.
//
// Schrijft naar marketing_leads (find-or-create op e-mail, lege
// profielvelden aanvullen) + altijd één marketing_lead_activity-rij.
// Raakt bewust géén contacts/leads — promoveren gebeurt handmatig in
// Marketing → Leads.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateSignal, activityPayload } from './_lib/website-signal-lib.js';
import { upsertMarketingLead } from './_lib/marketing-lead-store.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateSignal(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    await upsertMarketingLead(supabase, {
      email: body.email, name: body.name, company: body.company,
      role: body.role, sector: body.sector, src: body.src, consent: true,
    }, {
      event: body.event, payload: activityPayload(body), src: body.src,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[website-signal] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
