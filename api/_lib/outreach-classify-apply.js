// De verwerking van binnengekomen antwoorden: vastleggen, classificeren en de
// status van de prospect bijwerken.
//
// WAAROM DIT UIT api/outreach-classify.js IS GEHAALD
//   Die endpoint hoort bij de scan in de browser en hangt achter een ingelogde
//   gebruiker. De cron (api/outreach-inbox-cron.js) doet exact hetzelfde werk
//   maar wordt door Vercel aangeroepen, dus zonder sessie. Twee kopieen van deze
//   lus zouden uit elkaar lopen, en dan beoordeelt de nachtelijke scan antwoorden
//   anders dan de scan die jij met de hand start. Zelfde reden als
//   outreach-classify-run.js en outreach-runner.js.
//
// Puur in de zin dat hier geen HTTP in zit: alles komt binnen als argument en
// gaat terug als waarde. De aanroeper maakt er een respons van.
import { statusAfterClassification } from '../../src/bd/outreach-match.js';
import { classifyWithClaude } from './outreach-classify-run.js';
import { kort } from '../../src/lib/mail-body.js';

// Redenen die een scan zelf schrijft. Alleen deze mogen door een volgende scan
// worden weggehaald: een reden die een mens heeft ingetypt blijft staan.
const SCAN_REDEN = /^(check handmatig:|doorverwijzing:|mail bouncede)/;

/**
 * @param {object} o  supabase, campaignId, candidates
 * @returns {{fout: string}|{stats: object, details: Array}}
 */
export async function verwerkKandidaten({ supabase, campaignId, candidates }) {
  // Al verwerkte berichten overslaan (idempotentie).
  //
  // Op TWEE sleutels, en dat is wezenlijk: Graph geeft een bericht een nieuw id
  // zodra het naar een andere map verplaatst wordt. Sinds de scan de hele
  // mailbox leest, komt een antwoord dat inmiddels gearchiveerd is dus terug met
  // een ander provider_message_id en werd het een tweede keer weggeschreven.
  // internetMessageId ligt vast bij het opstellen van de mail en verandert nooit.
  const ids = candidates.map(c => c?.messageId).filter(Boolean);
  const internetIds = candidates.map(c => c?.internetMessageId).filter(Boolean);
  const knownRows = [];
  for (const [kolom, waarden] of [['provider_message_id', ids], ['internet_message_id', internetIds]]) {
    if (!waarden.length) continue;
    const { data, error } = await supabase
      .from('outreach_message')
      .select('provider_message_id,internet_message_id')
      .eq('direction', 'inbound')
      .in(kolom, waarden);
    if (error) return { fout: 'bestaande berichten ophalen: ' + error.message };
    knownRows.push(...(data || []));
  }
  const seen = new Set();
  for (const r of knownRows) {
    if (r.provider_message_id) seen.add(r.provider_message_id);
    if (r.internet_message_id) seen.add(r.internet_message_id);
  }

  const stats = { processed: 0, skipped_known: 0, bounces: 0, flagged: 0, classified: 0, status_changed: 0, errors: 0 };
  const details = [];

  for (const c of candidates) {
    if (!c?.messageId) { stats.errors++; continue; }
    if (seen.has(c.messageId) || (c.internetMessageId && seen.has(c.internetMessageId))) {
      stats.skipped_known++; continue;
    }
    // Binnen deze aanroep ook onthouden: dezelfde mail kan in twee mappen liggen.
    seen.add(c.messageId);
    if (c.internetMessageId) seen.add(c.internetMessageId);

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
      campaign_id: campaignId,
      contact_id: c.contactId || null,
      direction: 'inbound',
      provider_message_id: c.messageId,
      internet_message_id: c.internetMessageId || null,
      from_address: c.fromAddress || null,
      subject: c.subject || null,
      body_preview: c.bodyPreview || null,
      body_full: c.bodyFull || null,
      body_fetched_at: c.bodyFull ? new Date().toISOString() : null,
      sent_or_received_at: c.receivedAt || null,
      classification: cls?.classification || null,
      classification_confidence: cls ? cls.confidence : null,
      // Los van de classificatie opgeslagen, want een afwezigheidsbericht mag
      // tegelijk een collega noemen. Die twee stonden elkaar in de weg: een
      // antwoord kreeg een label en de doorverwijzing viel eruit.
      referral_name: cls?.referral_name || null,
      referral_email: cls?.referral_email || null,
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
      .from('outreach_contact').select('status,paused_reason').eq('id', c.contactId).single();
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
      last_reply_summary: kort(c.bodyFull || c.bodyPreview, 500),
      updated_at: new Date().toISOString(),
    };
    // De terugkeerdatum als los feit op het contact. Niet als status: de status
    // bepaalt WELK bericht iemand krijgt, en 'afwezig' zou hem uit de reeks
    // tillen. Zie de toelichting bij de migratie outreach_referral_en_ooo_bewaren.
    if (cls?.classification === 'ooo' && cls?.ooo_until) upd.ooo_until = cls.ooo_until;

    // EEN REDEN, IN EEN KEER SAMENGESTELD
    //   Dit waren drie losse toekenningen onder elkaar, en de laatste won. Toen
    //   de doorverwijzing erbij kwam viel die daardoor weg zodra het model ook
    //   maar een beetje twijfelde, precies in het geval waarin je hem het hardst
    //   nodig hebt. Vandaar een reden die alles meeneemt wat er te melden is.
    const redenen = [];
    if (cls?.referral_name || cls?.referral_email) {
      redenen.push(`doorverwijzing: ${cls.referral_name || cls.referral_email}`);
    }
    if (cls?.classification === 'bounce') redenen.push('mail bouncede');
    // Zie de toelichting in outreach-linkedin-scan.js: een laag percentage is
    // twijfel van het model, geen classificatie is een storing. Dat moet je uit
    // elkaar kunnen houden bij het nalopen.
    if (next.needs_review) {
      redenen.push(cls?.classification
        ? `check handmatig: ${cls.classification} (${Math.round((cls.confidence || 0) * 100)}%)`
        : 'check handmatig: classificatie mislukt, geen leesbaar antwoord van het model');
    }
    if (redenen.length) {
      upd.paused_reason = redenen.join(' | ');
    } else if (SCAN_REDEN.test(String(cur?.paused_reason || ''))) {
      // Niets meer te melden, dus het vlaggetje weg. Alleen wat een scan zelf
      // schreef; een door een mens ingetypte reden blijft staan.
      upd.paused_reason = null;
    }

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

  return { stats, details };
}
