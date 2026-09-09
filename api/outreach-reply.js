import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { outreachTextToHtml } from '../src/lib/outreach-html.js';
import { senderNameFor } from '../src/lib/senders.js';

// POST /api/outreach-reply - handmatig antwoord op een binnengekomen reactie.
//
// Vanuit de detailpagina van een prospect. Verstuurt vanaf de campagne-afzender
// (marco@) met reply-to op datzelfde adres, zodat een vervolgreactie weer in zijn
// inbox landt waar de scan hem oppikt.
//
// Twee dingen die dit endpoint bewust doet:
//   1. next_action_at op null: de geautomatiseerde opvolging (bericht 2) stopt,
//      want een mens heeft het overgenomen.
//   2. answered_at zetten: daarmee verdwijnt de prospect uit de weergave
//      'Onbeantwoord'. Nodig omdat dit bericht via Resend gaat en dus NIET in
//      Marco's Sent Items komt, waardoor de Sent-Items-scan het niet zou zien.
//
// De regel wordt vastgelegd als outbound zonder sequence_step: het is geen
// bericht 1 of 2 uit de reeks. De unieke index op (contact_id, sequence_step)
// blokkeert dat niet, omdat Postgres NULLs als verschillend behandelt.

const RESEND = 'https://api.resend.com';
const APP_URL = process.env.PUBLIC_APP_URL || 'https://crm.eclectik-insights.co';
const MAX_BODY = 20000;

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Zelfde backoff als het verzend-endpoint: een 429 mag geen verloren antwoord zijn.
async function rs(path, method, body, { retries = 3 } = {}) {
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
      await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(8000, 500 * 2 ** attempt));
      attempt++;
      continue;
    }
    return { ok: resp.ok, status: resp.status, data };
  }
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { contact_id, subject, body } = req.body || {};
  if (!contact_id) return res.status(400).json({ error: 'contact_id is verplicht' });
  if (!subject || !String(subject).trim()) return res.status(400).json({ error: 'onderwerp is verplicht' });
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'bericht is verplicht' });
  if (String(body).length > MAX_BODY) return res.status(400).json({ error: 'bericht is te lang' });

  const { data: c, error: cErr } = await supabase
    .from('outreach_contact')
    .select('id, campaign_id, email, status, unsubscribe_token, outreach_campaign(sender_mailbox, name)')
    .eq('id', contact_id).single();
  if (cErr || !c) return res.status(404).json({ error: 'prospect niet gevonden' });
  if (!c.email) return res.status(400).json({ error: 'prospect heeft geen e-mailadres' });

  // Afgemeld is afgemeld: daar sturen we niets meer heen, ook niet handmatig.
  if (c.status === 'opted_out') {
    return res.status(400).json({ error: 'deze prospect heeft zich afgemeld' });
  }

  const sender = c.outreach_campaign?.sender_mailbox;
  if (!sender) return res.status(500).json({ error: 'campagne heeft geen afzender' });
  const name = senderNameFor(sender);
  const from = name && name !== sender ? `${name} <${sender}>` : sender;

  const unsubscribeUrl = `${APP_URL}/api/outreach-unsubscribe?t=${c.unsubscribe_token}`;
  const send = await rs('/emails', 'POST', {
    from,
    to: c.email,
    reply_to: sender,
    subject: String(subject).trim(),
    html: outreachTextToHtml(String(body), { unsubscribeUrl }),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (!send.ok) {
    console.error('[outreach-reply] versturen faalde', c.id, send.status, JSON.stringify(send.data || {}).slice(0, 300));
    return res.status(502).json({
      error: 'versturen mislukt: ' + (send.data?.message || `HTTP ${send.status}`),
    });
  }

  const nowIso = new Date().toISOString();

  const { error: msgErr } = await supabase.from('outreach_message').insert({
    campaign_id: c.campaign_id,
    contact_id: c.id,
    direction: 'outbound',
    sequence_step: null,                 // handmatig antwoord, geen stap uit de reeks
    provider_message_id: send.data?.id || null,
    from_address: sender,
    to_address: c.email,
    subject: String(subject).trim(),
    body_preview: String(body).replace(/\s+/g, ' ').trim().slice(0, 500),
    sent_or_received_at: nowIso,
  });
  if (msgErr) {
    // De mail is de deur uit; dat niet kunnen vastleggen is luidruchtig loggen
    // waard, maar geen reden om de gebruiker een fout te geven.
    console.error('[outreach-reply] VERSTUURD maar vastleggen faalde', c.id, msgErr.message);
  }

  const { error: upErr } = await supabase.from('outreach_contact').update({
    answered_at: nowIso,
    next_action_at: null,                // stopt de geautomatiseerde opvolging
    updated_at: nowIso,
  }).eq('id', c.id);
  if (upErr) console.error('[outreach-reply] contact bijwerken faalde', c.id, upErr.message);

  return res.status(200).json({
    ok: true,
    sent_to: c.email,
    provider_message_id: send.data?.id || null,
    followup_stopped: true,
  });
}
