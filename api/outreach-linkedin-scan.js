import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { scanBatch } from './_lib/outreach-linkedin-scan-lib.js';

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
// DE LOGICA ZELF STAAT IN api/_lib/outreach-linkedin-scan-lib.js
//   Daar kan de ochtendcron er ook bij. Dit bestand is alleen nog het slot op
//   de deur plus het doorgeven van de parameters.
//
// VOLGORDE VAN SCHRIJVEN
//   Eerst de status van het contact, dan het bericht. Faalt de berichtinsert,
//   dan klopt de status en ontbreekt alleen de bijlage; dat herstelt een
//   volgende scan. Andersom (bericht eerst) zou een mislukte status-update
//   voorgoed blijven staan, want de volgende scan ziet het bericht als bekend.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

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

  const { fout, payload } = await scanBatch(supabase, { campaign_id, offset, dryRun, herscan });
  if (fout) return res.status(fout.status).json({ error: fout.error });
  return res.status(200).json(payload);
}
