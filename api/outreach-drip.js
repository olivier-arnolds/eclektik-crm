import { requireCron } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { runOutreachBatch } from './_lib/outreach-runner.js';
import {
  planDrip, slotsRemaining, inSendWindow, DRIP_MAX_PER_RUN, DRIP_START_HOUR, DRIP_END_HOUR,
} from './_lib/outreach-drip-lib.js';

// GET /api/outreach-drip - cron. Smeert de dagcap uit over de dag.
//
// WAAROM
//   Een klik op 'verstuur batch' haalt de dagcap niet: bij LinkedIn zit er 12 tot
//   25 seconden tussen twee berichten, dus 30 stuks is ruim negen minuten en een
//   functie mag er vijf draaien. Zonder deze cron moet iemand de hele dag zelf
//   bijhouden wanneer er weer ruimte is.
//
// WAT HET WEL EN NIET DOET
//   Het verstuurt alleen voor campagnes die EXPLICIET op automatisch staan
//   (auto_send) en die actief zijn. Zet je een campagne op paused, dan stopt dit
//   onmiddellijk mee: dat is dezelfde killswitch als bij de knop.
//
//   Alle veiligheidskleppen zijn die van de knop, want het is letterlijk dezelfde
//   code: dagcap, weekcap, spreiding over bedrijven, harde stopdatum, en de
//   claim-dan-verstuur-volgorde die een dubbel bericht onmogelijk maakt. Deze
//   cron voegt daar alleen een portiegrootte aan toe.
//
// WANNEER
//   Werkdagen tussen 09:00 en 17:00 AMSTERDAMSE tijd. Geen berichten 's avonds of
//   in het weekend, want dat valt op.
//
//   Vercel-cron kent alleen UTC, dus het rooster in vercel.json is bewust ruimer
//   (*/20 tussen 06:00 en 16:59 UTC) en inSendWindow() trimt het naar het echte
//   venster. Een vast UTC-rooster zou met de zomertijd een uur verschuiven en in
//   de winter vanaf acht uur 's ochtends gaan sturen.

export const config = { maxDuration: 300 };

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

export default async function handler(req, res) {
  if (!requireCron(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: camps, error } = await supabase
    .from('outreach_campaign')
    .select('id,name,channel,status,daily_cap,weekly_cap,auto_send,hard_stop_at')
    .eq('status', 'active')
    .eq('auto_send', true);
  if (error) return res.status(500).json({ error: 'campagnes ophalen: ' + error.message });

  const now = new Date();

  // De cron draait ruimer dan het venster; hier valt alles buiten 09:00-17:00 af.
  if (!inSendWindow(now)) {
    return res.status(200).json({
      ok: true, skipped: `buiten het verzendvenster (${DRIP_START_HOUR}:00-${DRIP_END_HOUR}:00 Amsterdam, werkdagen)`,
    });
  }

  const slotsLeft = slotsRemaining(now);
  const runs = [];

  for (const camp of (camps || [])) {
    // Harde stopdatum geldt ook hier, en hier zelfs voor bericht 1: na die datum
    // heeft een uitnodiging voor het event geen zin meer.
    if (camp.hard_stop_at && now.getTime() > new Date(camp.hard_stop_at).getTime()) {
      runs.push({ campaign: camp.name, sent: 0, reason: 'harde stopdatum voorbij' });
      continue;
    }

    const dayAgo = new Date(now.getTime() - 86400000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const [{ count: sentToday }, { count: sentThisWeek }] = await Promise.all([
      supabase.from('outreach_message').select('id', { count: 'exact', head: true })
        .eq('campaign_id', camp.id).eq('direction', 'outbound').gte('sent_or_received_at', dayAgo),
      supabase.from('outreach_message').select('id', { count: 'exact', head: true })
        .eq('campaign_id', camp.id).eq('direction', 'outbound').gte('sent_or_received_at', weekAgo),
    ]);

    const { count, reason } = planDrip({
      roomToday: (camp.daily_cap || 0) - (sentToday || 0),
      roomWeek: camp.weekly_cap == null ? null : camp.weekly_cap - (sentThisWeek || 0),
      slotsLeft,
      maxPerRun: DRIP_MAX_PER_RUN,
    });

    if (count <= 0) {
      runs.push({ campaign: camp.name, sent: 0, reason });
      continue;
    }

    // Vanaf hier exact de weg van de knop, inclusief alle kleppen. De caps worden
    // daar nog een keer gecontroleerd; dat is bewust dubbelop, want deze telling
    // is een momentopname en de verzending kan minuten duren.
    const { status, body } = await runOutreachBatch({ campaign_id: camp.id, limit: count });
    if (status !== 200) {
      console.error('[outreach-drip] verzenden faalde', camp.name, body?.error);
      runs.push({ campaign: camp.name, sent: 0, error: body?.error || `HTTP ${status}` });
      continue;
    }
    runs.push({
      campaign: camp.name,
      gepland: count,
      sent: body?.stats?.sent || 0,
      failed: body?.stats?.failed || 0,
      reason,
    });
  }

  const totaal = runs.reduce((n, r) => n + (r.sent || 0), 0);
  console.log('[outreach-drip] klaar', { slotsLeft, campagnes: runs.length, verstuurd: totaal });
  return res.status(200).json({ ok: true, slots_left: slotsLeft, runs });
}
