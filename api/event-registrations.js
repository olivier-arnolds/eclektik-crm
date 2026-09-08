// GET /api/event-registrations?event=amsterdam-2026 - deelnemerslijst van één
// event. Tegenhanger van het schrijfendpoint api/website-signal.js: de website
// POST daar elke inschrijving heen (event 'event_registered', eventSlug in de
// payload) en haalt de lijst hier weer op voor de wachtwoordbeveiligde
// overzichtspagina. Zie docs/superpowers/specs/
// 2026-09-08-event-amsterdam-2026-design.md, onderdeel 4.
//
// Zelfde guard als het schrijfendpoint: requireWebhookSecret met
// WEBSITE_WEBHOOK_SECRET. Puur lezend, raakt geen enkele rij aan.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateEventSlug, buildRegistrations } from './_lib/event-registrations-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Bovengrens op wat we ophalen. Een zaal telt geen duizenden mensen; deze
// limiet is er zodat een fout of een spamgolf de functie niet laat timeouten.
const MAX_ROWS = 2000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: eventSlug } = validateEventSlug(req.query?.event);
  if (valError) return res.status(400).json({ error: valError });

  try {
    // Geneste select over de bestaande foreign key
    // (marketing_lead_activity.marketing_lead_id -> marketing_leads.id), zoals
    // de rest van de repo joint. !inner omdat een activity-rij zonder lead
    // niet bestaat en niet in de lijst hoort.
    const { data, error } = await supabase
      .from('marketing_lead_activity')
      .select('occurred_at, payload, lead:marketing_leads!inner(email, full_name, company, role)')
      .eq('event', 'event_registered')
      .eq('payload->>eventSlug', eventSlug)
      .order('occurred_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) throw error;

    const registrations = buildRegistrations(data);
    // Namen, zakelijke e-mailadressen en werkgevers: nooit in een cache.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      event: eventSlug,
      count: registrations.length,
      registrations,
    });
  } catch (e) {
    console.error('[event-registrations] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
