// POST /api/marketing-webhook
// Receives Resend events and updates campaign_sends rows.
//
// Resend signs each request with HMAC-SHA256 over the raw body, sent in the
// 'svix-signature' header (Resend uses Svix for webhook delivery). We must
// verify before trusting the payload.
//
// Events handled (per spec §5):
//   email.sent      → set status='sent', sent_at
//   email.delivered → set status='delivered', delivered_at
//   email.opened    → bump open_count, set first_opened_at + last_opened_at
//   email.clicked   → bump click_count, set first_clicked_at + last_clicked_at
//   email.bounced   → set status='bounced', bounced_at, bounce_reason
//   email.complained → set complained_at
//
// Unknown messageId → log and 200 (Resend retries on non-2xx — we don't want
// loops for messages that aren't ours).
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Vercel parses JSON bodies by default; we need the raw body for signature
// verification. Disable the parser via the route config.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Svix signature header looks like 'v1,abc123 v1,def456'. We compute v1 for
// our secret and check at least one matches.
function verifySvixSignature(rawBody, headers, secret) {
  if (!secret) return false;
  // Normaliseer: strip omringende quotes en whitespace/newlines die bij het
  // plakken in Vercel per ongeluk meekomen (veel voorkomende oorzaak van 401).
  secret = String(secret).trim().replace(/^["']|["']$/g, '').trim();
  const svixId = headers['svix-id'];
  const svixTimestamp = headers['svix-timestamp'];
  const svixSignature = headers['svix-signature'];
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Resend secrets are prefixed 'whsec_'; the actual key is base64 after the prefix.
  const keyB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key;
  try { key = Buffer.from(keyB64, 'base64'); } catch { return false; }

  const expected = crypto.createHmac('sha256', key).update(signedPayload).digest('base64');
  const sigList = String(svixSignature).split(' ').map(s => s.split(',')[1]).filter(Boolean);
  return sigList.some(sig => {
    try { return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(expected, 'base64')); }
    catch { return false; }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch (e) { return res.status(400).json({ error: 'cannot read body: ' + e.message }); }

  const ok = verifySvixSignature(rawBody, req.headers, process.env.RESEND_WEBHOOK_SECRET);
  if (!ok) {
    // Diagnostiek zonder de secret te lekken: helpt onderscheiden tussen een
    // ontbrekende/malformed secret en een echte mismatch.
    const s = String(process.env.RESEND_WEBHOOK_SECRET || '');
    console.error('[marketing-webhook] signature check failed', {
      secretPresent: !!s, secretLen: s.length, startsWhsec: s.startsWith('whsec_'),
      hasId: !!req.headers['svix-id'], hasTs: !!req.headers['svix-timestamp'], hasSig: !!req.headers['svix-signature'],
      bodyLen: rawBody ? rawBody.length : 0,
    });
    return res.status(401).json({ error: 'invalid signature' });
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: 'invalid json' }); }

  const type = event?.type;

  // Afmelden vanuit een Broadcast: Resend stuurt contact.updated met
  // unsubscribed=true. Reflecteer dat naar de CRM (do_not_email) zodat we deze
  // persoon niet opnieuw mailen. Match op e-mailadres (case-insensitive).
  if (type === 'contact.updated' && event?.data?.unsubscribed === true) {
    const email = String(event?.data?.email || '').trim().toLowerCase();
    if (email) {
      await supabase.from('contacts').update({ do_not_email: true }).ilike('email', email);
    }
    return res.status(200).json({ ok: true, handled: 'contact.updated' });
  }

  const messageId = event?.data?.email_id || event?.data?.id;
  if (!messageId) return res.status(200).json({ ignored: 'no message id' });

  const { data: row } = await supabase
    .from('campaign_sends')
    .select('id, open_count, click_count')
    .eq('resend_message_id', messageId)
    .maybeSingle();
  if (!row) return res.status(200).json({ ignored: 'unknown message id' });

  const nowIso = new Date().toISOString();
  const updates = {};
  switch (type) {
    case 'email.sent':       updates.status = 'sent';      updates.sent_at = nowIso; break;
    case 'email.delivered':  updates.status = 'delivered'; updates.delivered_at = nowIso; break;
    case 'email.opened': {
      updates.open_count = (row.open_count || 0) + 1;
      updates.last_opened_at = nowIso;
      // first_opened_at only on the first event
      const { data: cur } = await supabase.from('campaign_sends').select('first_opened_at').eq('id', row.id).single();
      if (!cur?.first_opened_at) updates.first_opened_at = nowIso;
      break;
    }
    case 'email.clicked': {
      updates.click_count = (row.click_count || 0) + 1;
      updates.last_clicked_at = nowIso;
      const { data: cur } = await supabase.from('campaign_sends').select('first_clicked_at').eq('id', row.id).single();
      if (!cur?.first_clicked_at) updates.first_clicked_at = nowIso;
      break;
    }
    case 'email.bounced':
      updates.status = 'bounced'; updates.bounced_at = nowIso;
      updates.bounce_reason = (event?.data?.bounce?.message || event?.data?.reason || '').slice(0, 500);
      break;
    case 'email.complained':
      updates.complained_at = nowIso;
      break;
    default:
      return res.status(200).json({ ignored: 'unhandled event type: ' + type });
  }

  const { error } = await supabase.from('campaign_sends').update(updates).eq('id', row.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
