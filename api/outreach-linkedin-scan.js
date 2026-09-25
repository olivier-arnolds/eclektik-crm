import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { inkomendNaVerzending, statusAfterClassification } from '../src/bd/outreach-match.js';
import { classifyWithClaude } from './_lib/outreach-classify-run.js';
import { haalChatBerichten } from './_lib/unipile-chat.js';
import { kort } from '../src/lib/mail-body.js';

// POST /api/outreach-linkedin-scan - de LinkedIn-tegenhanger van de mailboxscan.
//
// WAAROM DIT BESTAAT
//   De campagne verstuurde 151 DM's via Unipile en registreerde nul antwoorden,
//   omdat last_inbound_at alleen door api/outreach-classify.js werd gezet en dat
//   is de mailboxscan. Antwoorden bleven in Marco's LinkedIn-inbox staan.
//
// WAAROM DIT SIMPELER IS DAN DE MAILSCAN
//   Daar moet op afzenderadres en domein gematcht worden, want het uitgaande
//   bericht staat niet in de mailbox. Hier is linkedin_chat_id een exacte
//   sleutel: de chat IS de conversatie. Geen naamvergelijking, geen domain_flag.
//
// IDEMPOTENT
//   outreach_message_inbound_provider_uniq is een unieke index op
//   provider_message_id waar direction='inbound'. Een tweede scan botst daarop
//   en doet niets dubbel.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

// Per aanroep, om binnen de Vercel-tijdslimiet te blijven. 151 contacten zijn
// vier aanroepen. De client loopt door zolang volgende_offset niet null is.
const BATCH = 40;

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { campaign_id, offset = 0 } = req.body || {};
  // Schrijven moet expliciet aangezet worden. Alles behalve false is een droge run.
  const dryRun = (req.body || {}).dry_run !== false;
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id is verplicht' });

  const { count: totaal } = await supabase
    .from('outreach_contact')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null);

  const { data: contacten, error: selErr } = await supabase
    .from('outreach_contact')
    .select('id,first_name,last_name,company,status,linkedin_chat_id,last_inbound_at,next_action_at')
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null)
    .order('created_at', { ascending: true })
    .range(Number(offset), Number(offset) + BATCH - 1);
  if (selErr) return res.status(500).json({ error: selErr.message });

  const ids = (contacten || []).map(c => c.id);

  // Onze eigen laatste verzending per contact. outreach_contact heeft geen
  // last_sent_at-kolom; dat moment leeft in outreach_message.
  const laatsteVerzending = new Map();
  if (ids.length) {
    const { data: uit } = await supabase
      .from('outreach_message')
      .select('contact_id,sent_or_received_at')
      .in('contact_id', ids)
      .eq('direction', 'outbound');
    for (const m of uit || []) {
      const vorige = laatsteVerzending.get(m.contact_id);
      if (!vorige || new Date(m.sent_or_received_at) > new Date(vorige)) {
        laatsteVerzending.set(m.contact_id, m.sent_or_received_at);
      }
    }
  }

  const resultaten = [];
  let metAntwoord = 0;
  let geschreven = 0;

  for (const c of contacten || []) {
    const naam = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.id;
    const chat = await haalChatBerichten(c.linkedin_chat_id);
    if (!chat.ok) {
      resultaten.push({ id: c.id, naam, uitkomst: 'fout', detail: chat.error });
      continue;
    }

    const antwoorden = inkomendNaVerzending(chat.items, {
      laatsteVerzendingISO: laatsteVerzending.get(c.id) || null,
    });
    if (antwoorden.length === 0) {
      resultaten.push({ id: c.id, naam, uitkomst: 'geen antwoord' });
      continue;
    }

    metAntwoord += 1;
    const laatste = antwoorden[antwoorden.length - 1];
    const tekst = String(laatste.text || '').trim();

    const classificatie = await classifyWithClaude({
      fromAddress: naam,
      subject: null,
      bodyPreview: tekst,
      bodyFull: tekst,
    });

    const next = statusAfterClassification({
      classification: classificatie?.classification,
      confidence: classificatie?.confidence,
      currentStatus: c.status,
      oooUntilISO: classificatie?.ooo_until,
    });

    resultaten.push({
      id: c.id,
      naam,
      bedrijf: c.company,
      uitkomst: 'antwoord',
      aantal: antwoorden.length,
      tekst: kort(tekst, 200),
      ontvangen_op: laatste.timestamp,
      classificatie: classificatie?.classification || null,
      confidence: classificatie?.confidence ?? 0,
      status_nu: c.status,
      status_straks: next.status,
      beoordeling_nodig: next.needs_review,
    });

    if (dryRun) continue;

    // Het bericht vastleggen. Botst het op de unieke index, dan is deze chat al
    // eerder gescand en hoeft de status niet opnieuw gezet te worden.
    const { error: insErr } = await supabase.from('outreach_message').insert({
      campaign_id,
      contact_id: c.id,
      channel: 'linkedin',
      direction: 'inbound',
      provider_message_id: laatste.id || null,
      conversation_id: c.linkedin_chat_id,
      match_method: 'conversation_id',
      from_address: naam,
      body_preview: kort(tekst, 500),
      body_full: tekst,
      sent_or_received_at: laatste.timestamp || new Date().toISOString(),
      classification: classificatie?.classification || null,
      classification_confidence: classificatie?.confidence ?? null,
    });
    if (insErr) {
      resultaten[resultaten.length - 1].uitkomst = 'al bekend';
      continue;
    }

    await supabase.from('outreach_contact').update({
      last_inbound_at: laatste.timestamp || new Date().toISOString(),
      status: next.status,
      next_action_at: next.next_action_at,
      last_reply_summary: kort(tekst, 200),
    }).eq('id', c.id);
    geschreven += 1;
  }

  const volgende = Number(offset) + BATCH;
  return res.status(200).json({
    dry_run: dryRun,
    totaal: totaal ?? 0,
    verwerkt: (contacten || []).length,
    met_antwoord: metAntwoord,
    geschreven,
    volgende_offset: volgende < (totaal ?? 0) ? volgende : null,
    resultaten,
  });
}
