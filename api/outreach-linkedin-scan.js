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
// IDEMPOTENT, MAAR ALLEEN MET EEN PROVIDER_MESSAGE_ID
//   outreach_message_inbound_provider_uniq is een partiele unieke index op
//   provider_message_id waar direction='inbound' EN provider_message_id niet
//   null is. Een rij zonder id botst dus nergens op en zou bij elke scan
//   opnieuw worden weggeschreven. Daarom slaat deze scan een antwoord zonder
//   id over in plaats van het vast te leggen.
//   De echte dedup gebeurt vooraf: we halen de al bekende inbound-ids van deze
//   contacten in een keer op en slaan die contacten over, zodat er geen tweede
//   keer voor een Claude-classificatie betaald wordt. De unieke index is nog
//   het vangnet voor gelijktijdige scans.
//
// DE HELE DRAAD, NIET ALLEEN HET LAATSTE BERICHT
//   De eerste echte scan pakte alleen het laatste inkomende bericht. Josja van
//   der Maas antwoordde met twee berichten; het laatste was alleen haar
//   e-mailadres. Zonder het bericht ervoor zag de classificatie een kaal adres
//   en kwam uit op 'other' met 0.30 zekerheid, dus een hold. Daarom gaat nu de
//   volledige tekst van alle inkomende berichten sinds onze verzending naar de
//   classificatie, chronologisch en gescheiden door een regeleinde.
//   Het provider_message_id blijft dat van het LAATSTE bericht: komt er later
//   een antwoord bij, dan is dat een nieuw id en dus een nieuwe rij. Dat is wat
//   de idempotentie draagt.
//
// HERSCAN-STAND
//   Contacten die al met alleen het laatste bericht verwerkt zijn, moeten
//   opnieuw beoordeeld kunnen worden op de volledige tekst. Met body-vlag
//   herscan:true slaan we de dedup over en werken we een bestaande inbound-rij
//   met hetzelfde provider_message_id BIJ in plaats van er een toe te voegen.
//   Gebruik dit alleen bewust en eenmalig na een wijziging in wat we aan de
//   classificatie voeren; een gewone scan hoort hem uit te laten. dry_run blijft
//   leidend, dus een herscan zonder dry_run:false laat alleen zien wat er zou
//   veranderen.
//
// VOLGORDE VAN SCHRIJVEN
//   Eerst de status van het contact, dan het bericht. Faalt de berichtinsert,
//   dan klopt de status en ontbreekt alleen de bijlage; dat herstelt een
//   volgende scan. Andersom (bericht eerst) zou een mislukte status-update
//   voorgoed blijven staan, want de volgende scan ziet het bericht als bekend.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

// Per aanroep, om binnen de Vercel-tijdslimiet te blijven. 151 contacten zijn
// vier aanroepen. De client loopt door zolang volgende_offset niet null is.
const BATCH = 40;

// Herkent een paused_reason die door een scan is gezet, en niet door een mens.
const REVIEW_PREFIX = 'check handmatig:';

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { campaign_id, offset = 0 } = req.body || {};
  // Schrijven moet expliciet aangezet worden. Alles behalve false is een droge run.
  const dryRun = (req.body || {}).dry_run !== false;
  // Herscan moet net zo expliciet aangezet worden: alleen een echte true telt.
  const herscan = (req.body || {}).herscan === true;
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id is verplicht' });

  const { count: totaal } = await supabase
    .from('outreach_contact')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null);

  const { data: contacten, error: selErr } = await supabase
    .from('outreach_contact')
    .select('id,first_name,last_name,company,status,linkedin_chat_id,last_inbound_at,next_action_at,paused_reason')
    .eq('campaign_id', campaign_id)
    .not('linkedin_chat_id', 'is', null)
    // id als tweede sorteersleutel: de contacten van deze campagne delen maar
    // een handvol created_at-waarden, en Postgres mag rijen met gelijke sleutel
    // per query in willekeurige volgorde teruggeven. Zonder tiebreaker vallen
    // er contacten tussen de paginagrenzen door.
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(Number(offset), Number(offset) + BATCH - 1);
  if (selErr) return res.status(500).json({ error: selErr.message });

  const ids = (contacten || []).map(c => c.id);

  // Onze eigen laatste verzending per contact. outreach_contact heeft geen
  // last_sent_at-kolom; dat moment leeft in outreach_message.
  const laatsteVerzending = new Map();
  if (ids.length) {
    const { data: uit, error: uitErr } = await supabase
      .from('outreach_message')
      .select('contact_id,sent_or_received_at')
      .in('contact_id', ids)
      .eq('direction', 'outbound');
    if (uitErr) return res.status(500).json({ error: 'verzendmomenten ophalen: ' + uitErr.message });
    for (const m of uit || []) {
      const vorige = laatsteVerzending.get(m.contact_id);
      if (!vorige || new Date(m.sent_or_received_at) > new Date(vorige)) {
        laatsteVerzending.set(m.contact_id, m.sent_or_received_at);
      }
    }
  }

  // Al bekende inkomende berichten, in een query vooraf. Zo slaan we een contact
  // over VOOR de Claude-aanroep in plaats van pas bij de insert; dat scheelt
  // kosten bij elke herhaalde (droge) run. Bij een herscan slaan we niets over,
  // maar dezelfde set bepaalt dan of het een update of een insert wordt.
  const bekendeIds = new Set();
  if (ids.length) {
    const { data: bekend, error: bekendErr } = await supabase
      .from('outreach_message')
      .select('provider_message_id')
      .in('contact_id', ids)
      .eq('direction', 'inbound');
    if (bekendErr) return res.status(500).json({ error: 'bestaande berichten ophalen: ' + bekendErr.message });
    for (const m of bekend || []) {
      if (m.provider_message_id) bekendeIds.add(m.provider_message_id);
    }
  }

  const resultaten = [];
  let metAntwoord = 0;
  let geschreven = 0;
  let fouten = 0;
  let overgeslagen = 0;

  for (const c of contacten || []) {
    const naam = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.id;
    // Zonder bekend verzendmoment valt de drempel weg en zou ELK inkomend
    // bericht in de chat als antwoord tellen, ook een gesprek van jaren terug.
    // Dat zet iemand ten onrechte op 'replied', dus slaan we over.
    const laatsteVerzendingISO = laatsteVerzending.get(c.id) || null;
    if (!laatsteVerzendingISO) {
      resultaten.push({ id: c.id, naam, uitkomst: 'verzendmoment onbekend' });
      overgeslagen += 1;
      continue;
    }

    const chat = await haalChatBerichten(c.linkedin_chat_id);
    if (!chat.ok) {
      resultaten.push({ id: c.id, naam, uitkomst: 'fout', detail: chat.error });
      fouten += 1;
      continue;
    }

    const antwoorden = inkomendNaVerzending(chat.items, { laatsteVerzendingISO });
    if (antwoorden.length === 0) {
      resultaten.push({ id: c.id, naam, uitkomst: 'geen antwoord' });
      continue;
    }

    metAntwoord += 1;
    const laatste = antwoorden[antwoorden.length - 1];
    // De hele draad sinds onze verzending, chronologisch. Een los laatste
    // bericht ("josjavandermaas@gmail.com") mist de context van het bericht
    // ervoor en kreeg daardoor een lage zekerheid.
    const tekst = antwoorden
      .map(m => String(m.text || '').trim())
      .filter(Boolean)
      .join('\n');

    // Zonder provider-id kunnen we niet garanderen dat een volgende scan dit
    // bericht herkent; de unieke index is partieel en negeert null. Overslaan.
    if (!laatste.id) {
      resultaten.push({ id: c.id, naam, uitkomst: 'geen bericht-id', ontvangen_op: laatste.timestamp });
      overgeslagen += 1;
      continue;
    }

    const alBekend = bekendeIds.has(laatste.id);
    if (!herscan && alBekend) {
      resultaten.push({ id: c.id, naam, uitkomst: 'al bekend', ontvangen_op: laatste.timestamp });
      overgeslagen += 1;
      continue;
    }

    let classificatie = null;
    try {
      classificatie = await classifyWithClaude({
        fromAddress: naam,
        subject: null,
        bodyPreview: tekst,
        bodyFull: tekst,
      });
    } catch (e) {
      // Een 429 of 529 van Anthropic mag niet de hele batch omgooien. Niets
      // wijzigen, melden, door met de rest. De volgende scan probeert opnieuw.
      console.error('[outreach-linkedin-scan] classificatie faalde', c.id, e.message);
      resultaten.push({ id: c.id, naam, uitkomst: 'fout', detail: 'classificatie: ' + e.message });
      fouten += 1;
      continue;
    }

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
      // Ruim, want dit is het scherm waarop een mens beoordeelt of de
      // classificatie klopt. Op 200 tekens viel juist het deel weg waar het om
      // ging. De korte versie is voor de kolom Toelichting in de lijst.
      tekst: kort(tekst, 2000),
      ontvangen_op: laatste.timestamp,
      classificatie: classificatie?.classification || null,
      confidence: classificatie?.confidence ?? 0,
      status_nu: c.status,
      status_straks: next.status,
      beoordeling_nodig: next.needs_review,
      ...(herscan ? { herscan: true } : {}),
    });

    if (dryRun) continue;

    const rij = resultaten[resultaten.length - 1];
    const ontvangen = laatste.timestamp || new Date().toISOString();

    // Eerst de status van het contact. Faalt dit, dan schrijven we het bericht
    // bewust NIET weg: anders zou de volgende scan het als bekend overslaan en
    // bleef dit contact voorgoed zonder last_inbound_at staan.
    const upd = {
      last_inbound_at: ontvangen,
      status: next.status,
      next_action_at: next.next_action_at,
      last_reply_summary: kort(tekst, 200),
    };
    // Zelfde patroon als de mailscan: maak zichtbaar dat er een mens naar moet
    // kijken, anders is needs_review alleen in dit rapport te zien.
    if (next.needs_review) {
      // Twee verschillende dingen, en dat verschil moet leesbaar blijven. Een
      // laag percentage betekent dat het model twijfelde. Geen classificatie
      // betekent dat er niets bruikbaars terugkwam, en dat is een storing, geen
      // oordeel. Allebei 'onbekend (0%)' noemen maakte een kapotte aanroep
      // ononderscheidbaar van een moeilijk antwoord.
      upd.paused_reason = classificatie?.classification
        ? `check handmatig: ${classificatie.classification} (${Math.round((classificatie.confidence || 0) * 100)}%)`
        : 'check handmatig: classificatie mislukt, geen leesbaar antwoord van het model';
    } else if (String(c.paused_reason || '').startsWith(REVIEW_PREFIX)) {
      // De beoordeling is niet meer nodig, dus het vlaggetje weg. Zonder dit
      // bleef een opgelost geval eeuwig 'check handmatig' tonen: na de herscan
      // stonden vier mensen met een keurige classificatie nog steeds als
      // handwerk in de lijst.
      //
      // Alleen wat de scan zelf schreef wordt gewist. Een reden die een mens
      // heeft ingetypt, zoals 'Niet meer werkzaam bij TNO', blijft staan.
      upd.paused_reason = null;
    }

    const { error: updErr } = await supabase.from('outreach_contact').update(upd).eq('id', c.id);
    if (updErr) {
      console.error('[outreach-linkedin-scan] status-update faalde', c.id, updErr.message);
      rij.uitkomst = 'fout';
      rij.detail = 'status-update: ' + updErr.message;
      fouten += 1;
      continue;
    }
    geschreven += 1;

    // Dan pas het bericht. Bij een herscan van een al vastgelegd bericht werken
    // we de bestaande rij bij; anders zou de unieke index de nieuwe tekst
    // weigeren en bleef de oude classificatie staan.
    let insErr = null;
    if (herscan && alBekend) {
      const { error: updBerErr } = await supabase
        .from('outreach_message')
        .update({
          body_preview: kort(tekst, 500),
          body_full: tekst,
          classification: classificatie?.classification || null,
          classification_confidence: classificatie?.confidence ?? null,
          sent_or_received_at: ontvangen,
        })
        .eq('provider_message_id', laatste.id)
        .eq('direction', 'inbound');
      insErr = updBerErr || null;
    } else {
      // 23505 is de unieke index: een gelijktijdige scan was ons voor. Elke
      // andere fout is een echte fout en moet zichtbaar zijn.
      const { error: insertErr } = await supabase.from('outreach_message').insert({
        campaign_id,
        contact_id: c.id,
        channel: 'linkedin',
        direction: 'inbound',
        provider_message_id: laatste.id,
        conversation_id: c.linkedin_chat_id,
        match_method: 'conversation_id',
        from_address: naam,
        body_preview: kort(tekst, 500),
        body_full: tekst,
        sent_or_received_at: ontvangen,
        classification: classificatie?.classification || null,
        classification_confidence: classificatie?.confidence ?? null,
      });
      insErr = insertErr || null;
    }
    if (insErr) {
      if (insErr.code === '23505') {
        rij.uitkomst = 'al bekend';
      } else {
        console.error('[outreach-linkedin-scan] insert faalde', c.id, insErr.message);
        rij.uitkomst = 'fout';
        rij.detail = `bericht vastleggen (${insErr.code || 'geen code'}): ${insErr.message}`;
        fouten += 1;
      }
    }
  }

  const volgende = Number(offset) + BATCH;
  return res.status(200).json({
    dry_run: dryRun,
    herscan,
    totaal: totaal ?? 0,
    verwerkt: (contacten || []).length,
    met_antwoord: metAntwoord,
    geschreven,
    fouten,
    overgeslagen,
    volgende_offset: volgende < (totaal ?? 0) ? volgende : null,
    resultaten,
  });
}
