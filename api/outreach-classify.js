import { requireUser } from './_lib/guard.js';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { statusAfterClassification } from '../src/bd/outreach-match.js';
import { MODEL, SYSTEM, parseClassification } from './_lib/outreach-classify-lib.js';

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const MAX_CANDIDATES = 25;



export async function classifyWithClaude({ fromAddress, subject, bodyPreview }) {
  const prompt = `Afzender: ${fromAddress || 'onbekend'}
Onderwerp: ${subject || '(geen)'}
Bericht: ${String(bodyPreview || '').replace(/\s+/g, ' ').slice(0, 2000)}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = (message.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseClassification(text);
}

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

  // Al verwerkte berichten overslaan (idempotentie).
  const ids = candidates.map(c => c?.messageId).filter(Boolean);
  const { data: known, error: knownErr } = await supabase
    .from('outreach_message')
    .select('provider_message_id')
    .eq('direction', 'inbound')
    .in('provider_message_id', ids);
  if (knownErr) return res.status(500).json({ error: 'bestaande berichten ophalen: ' + knownErr.message });
  const seen = new Set((known || []).map(r => r.provider_message_id));

  const stats = { processed: 0, skipped_known: 0, bounces: 0, flagged: 0, classified: 0, status_changed: 0, errors: 0 };
  const details = [];

  for (const c of candidates) {
    if (!c?.messageId) { stats.errors++; continue; }
    if (seen.has(c.messageId)) { stats.skipped_known++; continue; }

    let cls = null;
    try {
      if (c.isBounce) {
        cls = { classification: 'bounce', confidence: 1, ooo_until: null, referral_name: null, referral_email: null };
        stats.bounces++;
      } else if (c.matchMethod === 'domain_flag') {
        // Onzeker wie dit is: alleen vastleggen, geen AI en geen statuswijziging.
        stats.flagged++;
      } else {
        cls = await classifyWithClaude(c);
        stats.classified++;
      }
    } catch (e) {
      console.error('[outreach-classify] classificatie faalde', c.messageId, e.message);
      stats.errors++;
      details.push({ messageId: c.messageId, error: e.message });
      continue; // niets wegschrijven: volgende scan probeert het opnieuw
    }

    const { error: insErr } = await supabase.from('outreach_message').insert({
      campaign_id,
      contact_id: c.contactId || null,
      direction: 'inbound',
      provider_message_id: c.messageId,
      from_address: c.fromAddress || null,
      subject: c.subject || null,
      body_preview: c.bodyPreview || null,
      sent_or_received_at: c.receivedAt || null,
      classification: cls?.classification || null,
      classification_confidence: cls ? cls.confidence : null,
      match_method: c.matchMethod || null,
      bounced_at: c.isBounce ? (c.receivedAt || new Date().toISOString()) : null,
    });
    if (insErr) {
      console.error('[outreach-classify] insert faalde', c.messageId, insErr.message);
      stats.errors++;
      details.push({ messageId: c.messageId, error: insErr.message });
      continue;
    }
    stats.processed++;

    // Status alleen bijwerken bij een zekere match. Een domain_flag raakt nooit
    // een prospect aan; die staat in de lijst voor handwerk.
    //
    // Een MISLUKTE classificatie (cls is null) stopt hier bewust NIET meer. Dat
    // deed het wel, en dat was fout: het antwoord werd wel vastgelegd maar de
    // prospect bleef onaangeraakt, dus zonder last_inbound_at, niet zichtbaar
    // als Onbeantwoord, en met de opvolgmail nog gewoon ingepland. Zo verdween
    // op 10 september een out-of-office van twee prospects uit beeld.
    // statusAfterClassification geeft bij een lege classificatie een 'hold':
    // status ongemoeid, geen vervolgactie, wel gemarkeerd voor handwerk. Dat is
    // de veilige kant: liever een opvolgmail te weinig dan een naar iemand die
    // al geantwoord heeft.
    if (!c.contactId) continue;

    const { data: cur } = await supabase
      .from('outreach_contact').select('status').eq('id', c.contactId).single();
    const next = statusAfterClassification({
      classification: cls?.classification ?? null,
      confidence: cls?.confidence ?? 0,
      currentStatus: cur?.status || 'msg1_sent',
      oooUntilISO: cls?.ooo_until ?? null,
    });

    const upd = {
      status: next.status,
      next_action_at: next.next_action_at,
      // Moment van het laatste binnengekomen antwoord. Samen met answered_at
      // bepaalt dit of wij nog moeten reageren (weergave 'Onbeantwoord').
      last_inbound_at: c.receivedAt || new Date().toISOString(),
      // De echte tekst van het antwoord, geen parafrase.
      last_reply_summary: (c.bodyPreview || '').replace(/\s+/g, ' ').trim().slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    };
    if (cls?.classification === 'bounce') upd.paused_reason = 'mail bouncede';
    if (next.needs_review) upd.paused_reason = `check handmatig: ${cls?.classification || 'onbekend'} (${Math.round((cls?.confidence || 0) * 100)}%)`;

    const { error: updErr } = await supabase.from('outreach_contact').update(upd).eq('id', c.contactId);
    if (updErr) {
      console.error('[outreach-classify] status-update faalde', c.contactId, updErr.message);
      stats.errors++;
    } else {
      stats.status_changed++;
      details.push({
        messageId: c.messageId, contactId: c.contactId,
        classification: cls?.classification ?? null, confidence: cls?.confidence ?? 0,
        status: next.status, needs_review: next.needs_review,
      });
    }
  }

  return res.status(200).json({ ok: true, stats, details });
}
