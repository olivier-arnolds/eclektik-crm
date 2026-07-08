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
import { validateSignal, activityPayload, profilePatch } from './_lib/website-signal-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('marketing_leads')
    .select('id, full_name, company, role, sector')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateSignal(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    const now = new Date().toISOString();
    let lead = await findByEmail(body.email);

    if (!lead) {
      const { data: created, error: insErr } = await supabase
        .from('marketing_leads')
        .insert({
          email: body.email,
          full_name: typeof body.name === 'string' ? body.name.trim() || null : null,
          company: typeof body.company === 'string' ? body.company.trim() || null : null,
          role: typeof body.role === 'string' ? body.role.trim() || null : null,
          sector: typeof body.sector === 'string' ? body.sector.trim() || null : null,
          first_src: typeof body.src === 'string' ? body.src.slice(0, 100) : null,
          consent_at: now,
          last_activity_at: now,
        })
        .select('id')
        .single();
      if (insErr && insErr.code === '23505') {
        // Race: tweede gelijktijdige aanmelding won de insert — pak die rij.
        lead = await findByEmail(body.email);
      } else if (insErr) {
        throw insErr;
      } else {
        lead = created;
      }
    } else {
      const patch = {
        ...profilePatch(lead, body),
        last_activity_at: now,
        updated_at: now,
      };
      const { error: updErr } = await supabase
        .from('marketing_leads').update(patch).eq('id', lead.id);
      if (updErr) throw updErr;
    }

    const { error: actErr } = await supabase.from('marketing_lead_activity').insert({
      marketing_lead_id: lead.id,
      event: body.event,
      payload: activityPayload(body),
      src: typeof body.src === 'string' ? body.src.slice(0, 100) : null,
    });
    if (actErr) throw actErr;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[website-signal] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
