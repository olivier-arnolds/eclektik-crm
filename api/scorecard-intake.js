// POST /api/scorecard-intake — intake van afgeronde scorecards vanaf de website.
// Payload: { source:'website', form_type:'scorecard', email, consent, door,
//            answers: {V1..R4, P1..P3 als optie-indexen}, src? }
// met header x-webhook-secret (zelfde secret als website-signal).
//
// Splitst volgens de privacyregel (scorecard-spec §9):
//   ruwe antwoorden → form_responses (RLS zonder policies, service-only)
//   samenvatting (scores/banden/kwadrant/route) → marketing lead activiteit
// Scores worden hier HERBEREKEND uit de ruwe antwoorden; client-scores worden
// nooit vertrouwd. Notificatie naar Marco bij route=assessment of index>=70.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateScorecardAnswers, computeScorecard } from './_lib/scorecard-lib.js';
import { upsertMarketingLead } from './_lib/marketing-lead-store.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function notifyHotLead({ email, computed, door, src }) {
  const to = process.env.SCORECARD_NOTIFY_TO;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SCORECARD_NOTIFY_FROM || 'Eclectik CRM <marketing@eclektik.co>';
  if (!to || !key) { console.warn('[scorecard-intake] notify overgeslagen (env ontbreekt)'); return; }
  const s = computed.scores;
  const lines = [
    `Scorecard ingevuld: ${email}`,
    `Route: ${computed.route} · Kwadrant: ${computed.quadrant}`,
    `Scores — value ${s.value}, change ${s.change}, readiness ${s.readiness}, index ${s.index}`,
    `Profiel: ${computed.profile.role} · ${computed.profile.org_size} · renewal ${computed.profile.renewal_window}`,
    `Deur: ${door}${src ? ` · bron: ${src}` : ''}`,
    '', 'Zie Marketing → Leads in de CRM.',
  ];
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to,
        subject: `Scorecard: ${email} — ${computed.route} (index ${s.index})`,
        text: lines.join('\n'),
      }),
    });
    if (!resp.ok) console.error('[scorecard-intake] notify mislukt:', resp.status, await resp.text().catch(() => ''));
  } catch (e) {
    console.error('[scorecard-intake] notify error:', e?.message || e);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (body.form_type !== 'scorecard') return res.status(400).json({ error: 'Unsupported form_type' });
  const door = body.door === 'change' ? 'change' : 'value';
  const { error: ansErr } = validateScorecardAnswers(body.answers);
  if (ansErr) return res.status(400).json({ error: ansErr });
  const consent = body.consent === true;
  const src = typeof body.src === 'string' ? body.src.slice(0, 100) : null;

  try {
    const computed = computeScorecard(body.answers);

    const { error: insErr } = await supabase.from('form_responses').insert({
      form_type: 'scorecard',
      email,
      consent,
      entry_meta: { door, src },
      answers: body.answers,
      computed: {
        scores: computed.scores, bands: computed.bands,
        quadrant: computed.quadrant, route: computed.route,
        readiness_overlay: computed.readiness_overlay,
        role_label: computed.profile.role,           // voor scorecard_stats_by_role
        org_size: computed.profile.org_size,
        renewal_window: computed.profile.renewal_window,
        bank_version: '1.0',
      },
    });
    if (insErr) throw insErr;

    await upsertMarketingLead(supabase, {
      email, role: computed.profile.role, src,
    }, {
      event: 'scorecard_completed',
      payload: {                                     // GEEN ruwe antwoorden (privacyregel)
        scores: computed.scores, bands: computed.bands,
        quadrant: computed.quadrant, route: computed.route,
        door, org_size: computed.profile.org_size,
        renewal_window: computed.profile.renewal_window,
      },
      src,
    });

    if (computed.route === 'assessment' || computed.scores.index >= 70) {
      await notifyHotLead({ email, computed, door, src });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[scorecard-intake] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
