import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { classifyWithClaude } from './_lib/outreach-classify-run.js';
import { kort } from '../src/lib/mail-body.js';

// POST /api/outreach-reclassify - herstelactie voor afgekapte antwoorden.
//
// AANLEIDING
//   De inboxscan bewaarde wat Graph in de lijstopvraag teruggeeft: bodyPreview,
//   per definitie de eerste 255 tekens. Van de 78 binnengekomen antwoorden
//   stonden er 49 op exact die grens. Diezelfde afgekapte tekst ging naar de
//   classificatie die bepaalt of iemand nog een opvolgmail krijgt, dus van die
//   49 weten we niet zeker of ze goed beoordeeld zijn.
//
// De browser haalt de volledige tekst op (daar zit het Graph-token) en stuurt
// die hierheen; de Anthropic-key staat server-side.
//
// WAT DIT BEWUST NIET DOET: een status omzetten.
//   Een deel van deze antwoorden is inmiddels met de hand afgehandeld. Een
//   classificatie die twee weken later verandert mag dat werk niet overschrijven,
//   want dan zet de computer iemand terug in de wachtrij die Olivier al gesproken
//   heeft. Bij een afwijkende uitkomst markeren we de prospect voor handwerk en
//   melden we het terug; de beslissing blijft menselijk.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const MAX_PER_CALL = 25;

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is verplicht' });
  }
  if (messages.length > MAX_PER_CALL) {
    return res.status(400).json({ error: `Maximaal ${MAX_PER_CALL} per aanroep` });
  }

  const stats = { bekeken: 0, tekst_bijgewerkt: 0, opnieuw_beoordeeld: 0, veranderd: 0, niet_gevonden: 0, fouten: 0 };
  const veranderingen = [];

  for (const m of messages) {
    stats.bekeken++;
    if (!m?.id) { stats.fouten++; continue; }

    // Geen volledige tekst gevonden: het bericht staat niet meer in de mailbox.
    // De afgekorte tekst laten staan is dan beter dan hem wissen, maar we
    // markeren wel dat we het geprobeerd hebben, zodat een volgende ronde niet
    // eindeloos dezelfde berichten opnieuw opvraagt.
    if (!m.bodyFull) {
      stats.niet_gevonden++;
      await supabase.from('outreach_message')
        .update({ body_fetched_at: new Date().toISOString() }).eq('id', m.id);
      continue;
    }

    const { data: rij, error: leesErr } = await supabase
      .from('outreach_message')
      .select('id, contact_id, from_address, subject, classification, body_preview')
      .eq('id', m.id).single();
    if (leesErr || !rij) { stats.fouten++; continue; }

    let cls = null;
    try {
      cls = await classifyWithClaude({
        fromAddress: rij.from_address, subject: rij.subject, bodyFull: m.bodyFull,
      });
      stats.opnieuw_beoordeeld++;
    } catch (e) {
      console.error('[outreach-reclassify] classificatie faalde', m.id, e.message);
      stats.fouten++;
      // De tekst wel bewaren: die is sowieso beter dan wat er stond.
      await supabase.from('outreach_message').update({
        body_full: m.bodyFull, body_fetched_at: new Date().toISOString(),
      }).eq('id', m.id);
      continue;
    }

    const anders = cls?.classification && cls.classification !== rij.classification;
    const { error: updErr } = await supabase.from('outreach_message').update({
      body_full: m.bodyFull,
      body_fetched_at: new Date().toISOString(),
      classification: cls?.classification || rij.classification,
      classification_confidence: cls?.confidence ?? null,
    }).eq('id', m.id);
    if (updErr) { stats.fouten++; continue; }
    stats.tekst_bijgewerkt++;

    if (rij.contact_id) {
      const upd = {
        last_reply_summary: kort(m.bodyFull, 500),
        updated_at: new Date().toISOString(),
      };
      // Alleen bij een afwijkende uitkomst de aandacht vragen. De status zelf
      // blijft staan: zie de kop van dit bestand.
      if (anders) {
        upd.paused_reason = `check handmatig: antwoord was afgekapt, nieuwe beoordeling `
          + `'${cls.classification}' in plaats van '${rij.classification || 'onbekend'}'`;
      }
      await supabase.from('outreach_contact').update(upd).eq('id', rij.contact_id);
    }

    if (anders) {
      stats.veranderd++;
      veranderingen.push({
        id: m.id, from: rij.from_address,
        was: rij.classification, wordt: cls.classification,
        confidence: cls.confidence,
      });
    }
  }

  return res.status(200).json({ stats, veranderingen });
}
