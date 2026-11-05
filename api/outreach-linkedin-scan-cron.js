import { requireCron } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { scanBatch, BATCH } from './_lib/outreach-linkedin-scan-lib.js';

// GET /api/outreach-linkedin-scan-cron - de ochtendscan van de LinkedIn-inbox.
//
// WAAROM DIT BESTAAT
//   Bericht 2 wordt geweigerd zolang de inboxscan ouder is dan twaalf uur
//   (STALE_HOURS in api/_lib/outreach-send-lib.js). Die scan hing aan een knop,
//   dus elke ochtend stond de campagne stil tot iemand eraan dacht. Op 5
//   november stond hij de hele ochtend stil met 101 klaarstaande herinneringen
//   en een stopdatum van 16 november.
//
//   De scan zelf had nooit een ingelogde gebruiker nodig: Unipile, Claude en
//   Supabase draaien alle drie op serversleutels. Alleen het slot op de deur
//   stond op requireUser.
//
// WAAROM 06:00 UTC
//   Het verzendvenster gaat om 09:00 Nederlandse tijd open (inSendWindow in
//   outreach-drip-lib.js). Cron draait op UTC, dus 06:00 is 07:00 in de winter
//   en 08:00 in de zomer: in allebei de gevallen ruim op tijd. Met de
//   twaalfuursgrens is een scan van 07:00 geldig tot 19:00, dus de hele
//   verzenddag is gedekt.
//
// WAAROM EEN TIJDSBUDGET EN GEEN VASTE LUS
//   151 chats zijn vier porties van 40, en elke chat is een aanroep naar
//   Unipile. Hoe lang dat duurt hangt van Unipile af, niet van ons. Het budget
//   hieronder stopt netjes voordat de functie wordt afgekapt; wat blijft liggen
//   is er de volgende ochtend nog, en de knop in de tab blijft gewoon werken.
//
// DE SCANTIJD WORDT PAS BIJ DE LAATSTE PORTIE GESCHREVEN
//   Dat zit in scanBatch. Een half afgemaakte ronde bestempelt de campagne dus
//   niet als vers, en dat is de goede kant om op te falen: liever een dag niet
//   versturen dan een herinnering naar iemand die al geantwoord heeft.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

// Vercel kapt de functie af; wij stoppen ruim daarvoor zelf.
export const config = { maxDuration: 300 };
const TIJDSBUDGET_MS = 240000;

export default async function handler(req, res) {
  if (!requireCron(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const start = Date.now();

  // Alleen actieve LinkedIn-campagnes. Een gepauzeerde campagne hoeft niet
  // gescand te worden: er gaat toch niets uit, en elke chat is een aanroep.
  const { data: camps, error: cErr } = await supabase
    .from('outreach_campaign')
    .select('id,name,hard_stop_at')
    .eq('channel', 'linkedin')
    .eq('status', 'active');
  if (cErr) return res.status(500).json({ error: 'campagnes ophalen: ' + cErr.message });

  const nu = new Date();
  const runs = [];

  for (const camp of camps || []) {
    // Na de stopdatum gaat er niets meer uit, dus hoeft er ook niets gescand.
    if (camp.hard_stop_at && nu.getTime() > new Date(camp.hard_stop_at).getTime()) {
      runs.push({ campagne: camp.name, reden: 'harde stopdatum voorbij' });
      continue;
    }

    let offset = 0;
    let porties = 0;
    let metAntwoord = 0;
    let geschreven = 0;
    let fouten = 0;
    let afgemaakt = false;
    let fout = null;

    while (offset !== null) {
      if (Date.now() - start > TIJDSBUDGET_MS) break;
      const uit = await scanBatch(supabase, {
        campaign_id: camp.id, offset, dryRun: false, herscan: false,
      });
      if (uit.fout) { fout = uit.fout.error; break; }
      porties += 1;
      metAntwoord += uit.payload.met_antwoord;
      geschreven += uit.payload.geschreven;
      fouten += uit.payload.fouten;
      offset = uit.payload.volgende_offset;
      if (offset === null) afgemaakt = true;
    }

    runs.push({
      campagne: camp.name,
      porties,
      contacten: porties * BATCH,
      met_antwoord: metAntwoord,
      geschreven,
      fouten,
      afgemaakt,
      ...(fout ? { fout } : {}),
    });
  }

  // Altijd loggen, ook bij nul. Juist 'er gebeurde niets' is wat je wilt kunnen
  // terugzien als de campagne de volgende ochtend weer stilstaat.
  console.log('[outreach-linkedin-scan-cron] klaar', JSON.stringify(runs));
  return res.status(200).json({ seconden: Math.round((Date.now() - start) / 1000), runs });
}
