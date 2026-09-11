import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import {
  selectSendable, statusAfterSend, outreachTextToHtml, companyKey, STALE_HOURS,
} from './_lib/outreach-send-lib.js';
import { senderNameFor } from '../src/lib/senders.js';
import { sendLinkedInDM } from './_lib/unipile-dm.js';

// POST /api/outreach-send - job A. Verstuurt de volgende batch outreach-mails.
// Ontwerp: docs/outreach-handover.md §5 (job A) en §6, plus addendum §9.
//
// Elke prospect heeft zijn EIGEN subject en body (met de hand geschreven), dus
// dit is geen broadcast. We gebruiken Resend's transactionele /emails, een mail
// per persoon, vanaf de campagne-afzender met reply-to op datzelfde adres zodat
// antwoorden in zijn inbox landen (waar job B ze leest).
//
// Bewust NIET api/marketing-send.js hergebruikt: die heeft geen 429-afhandeling
// (een 429 wordt daar als permanente fout weggeschreven) en we willen de
// campagne-weg die Marco dagelijks gebruikt niet aanraken.
//
// IDEMPOTENTIE (het belangrijkste hier): we CLAIMEN eerst een rij in
// outreach_message en versturen daarna. De unieke index op
// (contact_id, sequence_step) voor outbound maakt een tweede claim onmogelijk,
// ook bij twee gelijktijdige runs. Mislukt het versturen, dan halen we de claim
// weg zodat het opnieuw geprobeerd kan worden. Andersom (eerst sturen, dan
// vastleggen) zou bij een crash een dubbele mail kunnen opleveren, en dat is
// erger dan een gemiste mail: een gemiste zie je, een dubbele niet.

// TWEE KANALEN (sinds v1.95.0)
// camp.channel bepaalt de weg: 'email' via Resend, 'linkedin' via een DM met
// Unipile vanaf Marco's account. Alles eromheen is gedeeld, want daar zit de
// veiligheid: de killswitch, de dagcap, de harde stop en vooral de claim-dan-
// verstuur-volgorde. Een tweede endpoint zou die allemaal moeten kopieren.
//
// Het echte verschil zit in het tempo. Een LinkedIn-account dat in een paar
// minuten tien DM's afvuurt ziet er niet uit als een mens, en een beperking op
// Marco's account is niet terug te draaien met een nieuwe API-key. Vandaar een
// pauze van tientallen seconden in plaats van een halve, een kleinere batch, en
// een tijdsbudget zodat de functie netjes stopt in plaats van halverwege af te
// breken (een afgebroken run laat claims achter zonder verstuurd bericht).
const RESEND = 'https://api.resend.com';
const APP_URL = process.env.PUBLIC_APP_URL || 'https://crm.eclectik-insights.co';
const SEND_GAP_MS = 600;          // circa 1,6 per seconde, ruim onder de rate limit
const MAX_BATCH = 200;            // bovengrens per aanroep (timeout-veiligheid)
const LINKEDIN_MAX_BATCH = 10;    // past binnen maxDuration bij de pauze hieronder
const LINKEDIN_GAP_MIN_MS = 12000;
const LINKEDIN_GAP_MAX_MS = 25000;
const TIME_BUDGET_MS = 240000;    // 4 van de 5 minuten; de rest is marge
export const config = { maxDuration: 300 };

const DEFAULT_LINKEDIN_ACCOUNT = process.env.CONTENT_LINKEDIN_ACCOUNT_ID || 'KYq2oN8JSPiAQSrcIfT5Ew';
const jitter = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Resend-call met backoff op 429 en 5xx, Retry-After respecterend. Zelfde
// patroon als api/_lib/send-broadcast.js; dit is precies wat marketing-send.js
// mist.
async function rs(path, method, body, { retries = 4 } = {}) {
  let attempt = 0;
  for (;;) {
    const resp = await fetch(`${RESEND}${path}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
      const ra = Number(resp.headers.get('retry-after'));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(8000, 500 * 2 ** attempt);
      await sleep(wait);
      attempt++;
      continue;
    }
    return { ok: resp.ok, status: resp.status, data };
  }
}

const domainOf = (email) => {
  const e = String(email || '').toLowerCase();
  const at = e.lastIndexOf('@');
  return at === -1 ? null : (e.slice(at + 1) || null);
};

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { campaign_id, limit, onlyStep = null, dry_run = false } = req.body || {};
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id is verplicht' });

  const { data: camp, error: cErr } = await supabase
    .from('outreach_campaign').select('*').eq('id', campaign_id).single();
  if (cErr || !camp) return res.status(404).json({ error: 'campagne niet gevonden' });

  const isLinkedIn = camp.channel === 'linkedin';
  if (!dry_run) {
    if (isLinkedIn && !(process.env.UNIPILE_API_KEY && (process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN))) {
      return res.status(500).json({ error: 'Unipile is niet geconfigureerd (UNIPILE_API_KEY / UNIPILE_BASE_URL)' });
    }
    if (!isLinkedIn && !process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }
  }

  // Killswitch (handover §6): alleen een actieve campagne verstuurt.
  if (camp.status !== 'active' && !dry_run) {
    return res.status(400).json({
      error: `campagne staat op '${camp.status}'. Zet hem op 'active' om te versturen.`,
    });
  }

  const now = new Date();

  // Dagcap over een rollend etmaal. Strenger dan een kalenderdag en het voorkomt
  // 120 mails om 23:00 gevolgd door 120 om 01:00.
  const dayAgo = new Date(now.getTime() - 86400000).toISOString();
  const { count: sentToday } = await supabase
    .from('outreach_message').select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id).eq('direction', 'outbound')
    .gte('sent_or_received_at', dayAgo);

  // Weekcap over een rollende week, met dezelfde redenering als de dagcap:
  // strenger dan een kalenderweek, en het voorkomt 150 op zondagavond gevolgd
  // door 150 op maandagochtend.
  const weekAgoIso = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { count: sentThisWeek } = await supabase
    .from('outreach_message').select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id).eq('direction', 'outbound')
    .gte('sent_or_received_at', weekAgoIso);

  // Kandidaten: alles wat aan de beurt is. Reserves doen niet mee.
  const { data: due, error: dErr } = await supabase
    .from('outreach_contact')
    .select('id,email,email_domain,company,status,next_action_at,priority_tier,outreach_prio,unsubscribe_token,msg1_subject,msg1_body,msg2_subject,msg2_body,linkedin_url,linkedin_provider_id')
    .eq('campaign_id', campaign_id)
    .eq('is_reserve', false)
    .in('status', ['queued', 'msg1_sent'])
    .or(`next_action_at.is.null,next_action_at.lte.${now.toISOString()}`)
    .limit(1000);
  if (dErr) return res.status(500).json({ error: 'kandidaten ophalen: ' + dErr.message });

  // Per-bedrijf-regel. Bij e-mail leiden we het bedrijf af uit het adresdomein en
  // tellen we over 7 dagen. Bij LinkedIn bestaat er geen domein, dus tellen we op
  // de bedrijfsnaam, en dan over een ROLLEND ETMAAL in plaats van een week.
  //
  // Waarom korter: het doel hier is spreiding, niet een weeklimiet. KPN heeft 13
  // mensen in de lijst; met 2 per week zouden er maar 6 van hen voor het event
  // bereikt worden. Met 2 per dag is KPN in een week rond en krijgen er nooit
  // drie op dezelfde dag een bericht van Marco, wat het punt was.
  const groupSince = isLinkedIn
    ? dayAgo
    : new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: recent } = await supabase
    .from('outreach_message').select('to_address,contact_id')
    .eq('campaign_id', campaign_id).eq('direction', 'outbound')
    .gte('sent_or_received_at', groupSince);
  const domainCounts = {};
  const companyCounts = {};
  if (isLinkedIn) {
    const ids = [...new Set((recent || []).map(r => r.contact_id).filter(Boolean))];
    if (ids.length) {
      const { data: prev } = await supabase
        .from('outreach_contact').select('id,company').in('id', ids);
      const companyById = Object.fromEntries((prev || []).map(r => [r.id, r.company]));
      for (const r of (recent || [])) {
        const k = companyKey(companyById[r.contact_id]);
        if (k) companyCounts[k] = (companyCounts[k] || 0) + 1;
      }
    }
  } else {
    for (const r of (recent || [])) {
      const d = domainOf(r.to_address);
      if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
  }

  // Scantijd per campagne: een scan van een andere campagne mag hier niet als
  // vers gelden, want die keek naar andere contacten.
  const { data: sync } = await supabase
    .from('outreach_sync_state').select('last_synced_at')
    .eq('id', `inbox:${campaign_id}`).maybeSingle();

  // Bij LinkedIn staat er altijd een bovengrens op de batch, ook als de gebruiker
  // er geen opgeeft: tien DM's met een menselijke pauze vullen de functietijd al.
  const cap = isLinkedIn ? LINKEDIN_MAX_BATCH : MAX_BATCH;
  const askedLimit = Number.isFinite(Number(limit))
    ? Math.min(cap, Number(limit))
    : (isLinkedIn ? cap : null);

  const { batch, skipped, remainingCap } = selectSendable(due || [], {
    now,
    channel: camp.channel || 'email',
    dailyCap: camp.daily_cap,
    sentToday: sentToday || 0,
    weeklyCap: camp.weekly_cap ?? null,
    sentThisWeek: sentThisWeek || 0,
    batchLimit: askedLimit,
    maxPerCompanyPerWeek: camp.max_per_company_per_week,
    domainCounts,
    companyCounts,
    hardStopAt: camp.hard_stop_at,
    lastScanISO: sync?.last_synced_at || null,
    staleHours: STALE_HOURS,
    onlyStep,
  });

  const plan = {
    campaign: camp.name,
    channel: camp.channel || 'email',
    sent_last_24h: sentToday || 0,
    daily_cap: camp.daily_cap,
    sent_last_7d: sentThisWeek || 0,
    weekly_cap: camp.weekly_cap ?? null,
    would_send: batch.length,
    batch_limit: askedLimit,
    by_step: { 1: batch.filter(b => b.step === 1).length, 2: batch.filter(b => b.step === 2).length },
    skipped,
    remaining_cap: remainingCap,
    last_scan_at: sync?.last_synced_at || null,
  };
  if (dry_run) return res.status(200).json({ ok: true, dry_run: true, plan });

  // Weergavenaam erbij, zodat het niet als een kaal adres in de inbox landt.
  const senderName = senderNameFor(camp.sender_mailbox);
  const fromHeader = senderName && senderName !== camp.sender_mailbox
    ? `${senderName} <${camp.sender_mailbox}>`
    : camp.sender_mailbox;
  const linkedinAccount = camp.linkedin_account_id || DEFAULT_LINKEDIN_ACCOUNT;
  const stats = { sent: 0, claimed_elsewhere: 0, failed: 0, out_of_time: 0 };
  const failures = [];
  const startedAt = Date.now();

  for (const item of batch) {
    const c = item.contact;

    // Tijdsbudget. Beter netjes stoppen en de rest overlaten aan de volgende
    // klik dan halverwege een verzending afgekapt worden door de platformlimiet.
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stats.out_of_time = batch.length - stats.sent - stats.failed - stats.claimed_elsewhere;
      break;
    }

    // 1. Claim. Lukt dit niet door de unieke index, dan heeft een andere run
    //    deze stap al gedaan of gestart: overslaan, nooit alsnog sturen.
    const { data: claim, error: claimErr } = await supabase
      .from('outreach_message')
      .insert({
        campaign_id, contact_id: c.id, direction: 'outbound', sequence_step: item.step,
        channel: camp.channel || 'email',
        // Bij LinkedIn staat hier de profiel-URL: dat is het adres waar het
        // bericht heen ging, en er is geen e-mailadres.
        to_address: isLinkedIn ? c.linkedin_url : c.email,
        from_address: camp.sender_mailbox, subject: item.subject,
      })
      .select('id').single();
    if (claimErr) {
      stats.claimed_elsewhere++;
      continue;
    }

    // 2. Versturen, langs de weg die bij het kanaal hoort.
    let ok, providerMessageId = null, chatId = null, providerId = null, errText = '', errStatus = null;
    if (isLinkedIn) {
      const dm = await sendLinkedInDM({
        accountId: linkedinAccount,
        linkedinUrl: c.linkedin_url,
        providerId: c.linkedin_provider_id || null,
        text: item.body,                 // een DM is platte tekst, geen HTML
      });
      ok = dm.ok;
      providerMessageId = dm.messageId || null;
      chatId = dm.chatId || null;
      providerId = dm.providerId || null;
      errText = dm.error || '';
      errStatus = dm.status || null;
    } else {
      const unsubscribeUrl = `${APP_URL}/api/outreach-unsubscribe?t=${c.unsubscribe_token}`;
      const send = await rs('/emails', 'POST', {
        from: fromHeader,
        to: c.email,
        reply_to: camp.sender_mailbox,
        subject: item.subject,
        html: outreachTextToHtml(item.body, { unsubscribeUrl }),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      ok = send.ok;
      providerMessageId = send.data?.id || null;
      errText = send.data?.message || JSON.stringify(send.data || {});
      errStatus = send.status;
    }

    if (!ok) {
      // 3a. Mislukt: claim weghalen zodat het opnieuw geprobeerd kan worden.
      await supabase.from('outreach_message').delete().eq('id', claim.id);
      stats.failed++;
      failures.push({
        contact_id: c.id, to: isLinkedIn ? c.linkedin_url : c.email, step: item.step,
        status: errStatus, error: String(errText).slice(0, 200),
      });
      // Na een fout even wachten: bij LinkedIn is een fout vaak een signaal van
      // het platform zelf en is doorrammen precies het verkeerde antwoord.
      if (isLinkedIn) await sleep(jitter(LINKEDIN_GAP_MIN_MS, LINKEDIN_GAP_MAX_MS));
      continue;
    }

    // 3b. Gelukt: claim afmaken en de prospect doorzetten.
    const sentAt = new Date().toISOString();
    await supabase.from('outreach_message').update({
      provider_message_id: providerMessageId,
      conversation_id: chatId,           // bij LinkedIn de chat, voor reply-koppeling
      sent_or_received_at: sentAt,
    }).eq('id', claim.id);

    const next = statusAfterSend(item.step, {
      now: new Date(sentAt),
      channel: camp.channel || 'email',
      delayMinDays: camp.followup_delay_days_min,
      delayMaxDays: camp.followup_delay_days_max,
    });
    const contactUpdate = {
      status: next.status, next_action_at: next.next_action_at, updated_at: sentAt,
    };
    if (isLinkedIn) {
      // Cachen zodat een volgende actie geen nieuwe profielweergave kost.
      if (providerId) contactUpdate.linkedin_provider_id = providerId;
      if (chatId) contactUpdate.linkedin_chat_id = chatId;
    }
    await supabase.from('outreach_contact').update(contactUpdate).eq('id', c.id);

    stats.sent++;
    await sleep(isLinkedIn ? jitter(LINKEDIN_GAP_MIN_MS, LINKEDIN_GAP_MAX_MS) : SEND_GAP_MS);
  }

  if (failures.length) console.error('[outreach-send] mislukte verzendingen', failures.length, failures.slice(0, 5));

  return res.status(200).json({ ok: true, plan, stats, failures: failures.slice(0, 25) });
}
