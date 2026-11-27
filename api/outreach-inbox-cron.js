// GET/POST /api/outreach-inbox-cron - de inboxscan zonder browser.
//
// HET PROBLEEM DAT DIT OPLOST
//   Bericht 2 en 3 gaan alleen uit als de inboxscan jonger is dan twaalf uur
//   (STALE_HOURS in api/_lib/outreach-send-lib.js). Die rem is er met reden: je
//   wilt niet opvolgen bij iemand die net geantwoord heeft. Maar de scan draaide
//   alleen in de browser, want het Graph-token hoort bij de ingelogde persoon.
//
//   Gevolg: de campagne staat stil op elke dag dat niemand de CRM openzet, en
//   wel zonder foutmelding. Op 27 november 2026 stonden zo 95 prospects in de
//   EMEA-campagne en 18 in de AE-campagne te wachten op een opvolging die niet
//   kwam. Niemand had het gemerkt.
//
// WAT DIT WEL EN NIET DOET
//   Wel: de mailbox van elke actieve e-mailcampagne lezen, antwoorden matchen,
//   classificeren, de status bijwerken en de scantijd wegschrijven. Daarmee is
//   de rem weg en kan de verzendcron zijn werk doen.
//
//   Niet: zelf verzenden. Dat blijft api/outreach-send.js. Scannen en versturen
//   gescheiden houden betekent dat een storing in het een het ander niet
//   meesleept, en dat je in de logs ziet welk van de twee het was.
//
// WAAROM DE SCANTIJD PAS AAN HET EIND WORDT WEGGESCHREVEN
//   Die tijd is wat de verzender als bewijs leest dat de inbox bekeken is.
//   Schrijf je hem weg voordat het werk klaar is en de classificatie valt
//   halverwege om, dan staat er 'net gescand' terwijl de helft van de antwoorden
//   nooit beoordeeld is. Dan gaat er een opvolgmail naar iemand die al nee heeft
//   gezegd. Dus: eerst verwerken, dan pas de tijd.
import { createClient } from '@supabase/supabase-js';
import { requireCron } from './_lib/guard.js';
import { appToken, mailboxSinds, berichtTekst } from './_lib/graph-app.js';
import { verwerkKandidaten } from './_lib/outreach-classify-apply.js';
import { scanInbox } from '../src/bd/outreach-match.js';
import { kiesBerichttekst } from '../src/lib/mail-body.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Dezelfde sleutel als de browserscan, anders telt de verzender de scan van de
// cron niet mee. Zie syncKey in src/bd/marketing-outreach.jsx.
const syncKey = (campaignId) => `inbox:${campaignId}`;

// Per aanroep begrensd. Een Vercel-functie heeft een tijdslimiet, en een
// campagne met 1813 contacten en honderden antwoorden zou daar overheen gaan.
// Liever elk uur een stuk dan een keer per dag niets.
const MAX_BERICHTEN = 400;
const MAX_KANDIDATEN = 25;

const CONTACT_COLS = 'id,email,first_name,last_name,company,status,next_action_at,'
  + 'last_inbound_at,answered_at,paused_reason';

export default async function handler(req, res) {
  if (!requireCron(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  let token;
  try {
    token = await appToken();
  } catch (e) {
    return res.status(502).json({ error: 'Graph-token mislukt: ' + e.message });
  }
  if (!token) {
    // Geen storing maar een ontbrekende instelling. 200 met een duidelijke
    // melding, zodat dit niet elk uur als fout in de Vercel-logs staat terwijl
    // er simpelweg nog niets is ingesteld.
    return res.status(200).json({
      ok: false,
      reden: 'GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET ontbreken. '
        + 'Zie de toelichting bovenin api/_lib/graph-app.js voor wat er in Azure moet gebeuren.',
    });
  }

  const { data: campagnes, error: cErr } = await supabase
    .from('outreach_campaign')
    .select('id,name,sender_mailbox,created_at,channel,status')
    .eq('status', 'active').eq('channel', 'email');
  if (cErr) return res.status(500).json({ error: 'campagnes ophalen: ' + cErr.message });

  const uitkomst = [];

  for (const camp of campagnes || []) {
    const regel = { campagne: camp.name, mailbox: camp.sender_mailbox };
    try {
      if (!camp.sender_mailbox) { regel.overgeslagen = 'geen afzendermailbox'; uitkomst.push(regel); continue; }

      const { data: contacten, error: ctErr } = await supabase
        .from('outreach_contact').select(CONTACT_COLS).eq('campaign_id', camp.id);
      if (ctErr) throw new Error('contacten ophalen: ' + ctErr.message);

      // Vanaf wanneer we kijken: het eerste uitgaande bericht. Daarvoor kan er
      // per definitie geen antwoord op deze campagne zijn.
      const { data: eerste } = await supabase
        .from('outreach_message').select('sent_or_received_at')
        .eq('campaign_id', camp.id).eq('direction', 'outbound')
        .order('sent_or_received_at', { ascending: true }).limit(1);
      const sinceISO = eerste?.[0]?.sent_or_received_at || camp.created_at;

      const berichten = await mailboxSinds(token, camp.sender_mailbox, sinceISO, MAX_BERICHTEN);
      const { candidates, stats } = scanInbox(berichten, contacten || [], { sinceISO });
      regel.gelezen = berichten.length;
      regel.kandidaten = candidates.length;

      // bodyPreview is bij Graph de eerste 255 tekens. Dat is te weinig om op te
      // classificeren: een antwoord als "ik kan zelf niet, maar mijn collega
      // wel" verliest juist het bruikbare deel. Alleen voor de herkende
      // antwoorden halen we de volledige tekst op.
      const teDoen = candidates.slice(0, MAX_KANDIDATEN);
      for (const k of teDoen) {
        const vol = await berichtTekst(token, camp.sender_mailbox, k.messageId);
        const tekst = vol ? kiesBerichttekst(vol) : null;
        if (tekst) k.bodyFull = tekst;
      }

      if (teDoen.length) {
        const verwerkt = await verwerkKandidaten({
          supabase, campaignId: camp.id, candidates: teDoen,
        });
        if (verwerkt.fout) throw new Error(verwerkt.fout);
        regel.verwerkt = verwerkt.stats;
      } else {
        regel.verwerkt = { processed: 0 };
      }
      regel.scan_stats = stats;

      // Pas nu de scantijd. Zie de toelichting bovenin.
      //
      // Alleen als ALLE kandidaten verwerkt zijn. Bleef er een rest over door de
      // begrenzing hierboven, dan is de inbox niet volledig beoordeeld en mag de
      // verzender daar niet op vertrouwen; de volgende ronde pakt de rest.
      if (candidates.length <= MAX_KANDIDATEN) {
        const nu = new Date().toISOString();
        const { error: sErr } = await supabase.from('outreach_sync_state')
          .upsert({ id: syncKey(camp.id), last_synced_at: nu, updated_at: nu });
        if (sErr) throw new Error('scantijd wegschrijven: ' + sErr.message);
        regel.scantijd_bijgewerkt = true;
      } else {
        regel.scantijd_bijgewerkt = false;
        regel.rest = candidates.length - MAX_KANDIDATEN;
      }
    } catch (e) {
      console.error('[outreach-inbox-cron]', camp.name, e.message);
      regel.fout = e.message;
    }
    uitkomst.push(regel);
  }

  return res.status(200).json({ ok: true, campagnes: uitkomst });
}
