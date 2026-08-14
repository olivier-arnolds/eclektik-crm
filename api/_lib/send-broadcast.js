// Gedeelde Resend-broadcast-logica (segment aanmaken -> contacten koppelen ->
// broadcast versturen), met de hard-won rate-limit- en eventual-consistency-
// afhandeling. Gebruikt door zowel het user-endpoint (api/resend-broadcast.js)
// als de content-kalender-cron (api/content-calendar-execute.js). Zie CLAUDE.md §5.
//
// sendBroadcast(opts) doet GEEN auth en GEEN res.*; het geeft een resultaat terug:
//   { ok: true,  status: 200, result: { broadcast_id, segment_id, recipients, ... } }
//   { ok: false, status: 4xx/5xx, error: '...', detail?: ... }
import { createClient } from '@supabase/supabase-js';
import { toResendContacts } from '../../src/lib/broadcast-recipients.js';

const RESEND = 'https://api.resend.com';
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resend limiteert per seconde. Bij 429/5xx opnieuw proberen met backoff, anders
// vallen bij het vullen van een groot segment de meeste contacten stil weg.
async function rs(path, method, body, { retries = 4 } = {}) {
  let attempt = 0;
  for (;;) {
    const resp = await fetch(`${RESEND}${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
      const retryAfter = Number(resp.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(5000, 500 * 2 ** attempt);
      await sleep(wait);
      attempt++;
      continue;
    }
    return { ok: resp.ok, status: resp.status, data };
  }
}

function toResendMergeTags(html) {
  return String(html || '').replaceAll('{{first_name}}', '{{{FIRST_NAME}}}');
}

// Resend voegt GEEN afmeldlink automatisch toe; de HTML moet
// {{{RESEND_UNSUBSCRIBE_URL}}} bevatten (wettelijk verplicht). Footer als de tag ontbreekt.
function ensureUnsubscribe(html) {
  const h = String(html || '');
  if (h.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) return h;
  const footer = '<p style="font-size:12px;color:#888888;text-align:center;margin:28px 0 0">'
    + 'You are receiving this email because you are in contact with Eclectik. '
    + '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888888">Unsubscribe</a>.'
    + '</p>';
  return /<\/body>/i.test(h) ? h.replace(/<\/body>/i, footer + '</body>') : h + footer;
}

export async function sendBroadcast({ subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by }) {
  if (!supabase) return { ok: false, status: 500, error: 'Supabase not configured' };
  if (!process.env.RESEND_API_KEY) return { ok: false, status: 500, error: 'RESEND_API_KEY not configured' };
  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0)
    return { ok: false, status: 400, error: 'subject, html_body en recipients[] vereist' };

  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return { ok: false, status: 500, error: 'from_email/MARKETING_FROM_EMAIL ontbreekt' };
  const from = `${from_name || process.env.MARKETING_FROM_NAME || 'Marketing'} <${fromEmail}>`;

  const contacts = toResendContacts(recipients).filter(c => !c.unsubscribed);
  if (contacts.length === 0) return { ok: false, status: 400, error: 'geen verzendbare ontvangers' };

  // 1) Segment voor deze verzending = de selectie (statische lijst).
  const segName = `${campaign_name || subject} (${new Date().toISOString().slice(0, 10)})`.slice(0, 100);
  const seg = await rs('/segments', 'POST', { name: segName });
  if (!seg.ok || !seg.data?.id) {
    console.error('[send-broadcast] segment aanmaken faalde', seg.status, JSON.stringify(seg.data));
    return { ok: false, status: 502, error: 'segment aanmaken faalde', detail: seg.data };
  }
  const segmentId = seg.data.id;

  // 2) Contacten in het segment: bestaand koppelen, nieuw aanmaken; globaal-afgemeld overslaan.
  const unsubscribedEmails = [];
  const placed = [];

  async function ensureInSegment(c) {
    const enc = encodeURIComponent(c.email);
    const got = await rs(`/contacts/${enc}`, 'GET');
    if (got.ok && got.data?.id) {
      if (got.data.unsubscribed) { unsubscribedEmails.push(c.email); return 'unsub'; }
      const add = await rs(`/contacts/${enc}/segments/${segmentId}`, 'POST');
      if (add.ok) { placed.push({ email: c.email, contact_id: c.contact_id }); return 'ok'; }
      console.error('[send-broadcast] koppelen faalde', add.status, c.email, JSON.stringify(add.data));
      return 'fail';
    }
    if (got.status === 404) {
      const post = await rs('/contacts', 'POST',
        { email: c.email, first_name: c.first_name, segments: [{ id: segmentId }] });
      if (post.ok) { placed.push({ email: c.email, contact_id: c.contact_id }); return 'ok'; }
      console.error('[send-broadcast] aanmaken faalde', post.status, c.email, JSON.stringify(post.data));
      return 'fail';
    }
    console.error('[send-broadcast] ophalen faalde', got.status, c.email, JSON.stringify(got.data));
    return 'fail';
  }

  const CONCURRENCY = 4;
  let todo = contacts.slice();
  for (let sweep = 0; sweep < 3 && todo.length; sweep++) {
    const retryable = [];
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const chunk = todo.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.all(chunk.map(ensureInSegment));
      outcomes.forEach((o, j) => { if (o === 'fail') retryable.push(chunk[j]); });
      await sleep(250);
    }
    todo = retryable;
    if (todo.length) await sleep(1000);
  }
  const failedEmails = todo.map((c) => c.email);
  const inSeg = placed.length;
  const skipped = unsubscribedEmails.length;

  // Pull-sync: afgemelde contacten ook in de CRM op do_not_email zetten.
  if (unsubscribedEmails.length) {
    await supabase.from('contacts').update({ do_not_email: true }).in('email', unsubscribedEmails);
  }
  if (inSeg === 0) return { ok: false, status: 400, error: 'geen verzendbare ontvangers (allen afgemeld of opt-out)' };
  if (failedEmails.length) {
    console.error('[send-broadcast] niet alle contacten in segment', { total: contacts.length, inSeg, failed: failedEmails.length });
  }

  // 2b) Wacht tot Resend het segment gevuld heeft (eventual consistency).
  const asArray = (d) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.data?.data) ? d.data.data : null));
  let confirmed = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const chk = await rs(`/segments/${segmentId}/contacts`, 'GET');
    const rows = asArray(chk.data);
    confirmed = rows ? rows.length : 0;
    if (confirmed > 0) break;
    await sleep(1000);
  }
  console.log('[send-broadcast] segment gevuld', { segmentId, inSeg, skipped, confirmed });

  // 3) Broadcast naar het segment.
  const bc = await rs('/broadcasts', 'POST', {
    segment_id: segmentId, from, reply_to: reply_to || undefined,
    subject, name: campaign_name || subject, html: ensureUnsubscribe(toResendMergeTags(html_body)),
  });
  if (!bc.ok || !bc.data?.id) {
    console.error('[send-broadcast] broadcast aanmaken faalde', bc.status, JSON.stringify(bc.data));
    return { ok: false, status: 502, error: 'broadcast aanmaken faalde', detail: bc.data };
  }
  const send = await rs(`/broadcasts/${bc.data.id}/send`, 'POST', {});
  if (!send.ok) {
    console.error('[send-broadcast] broadcast versturen faalde', send.status, 'broadcastId=' + bc.data.id, JSON.stringify(send.data));
    return { ok: false, status: 502, error: 'broadcast versturen faalde', detail: send.data };
  }

  // 4) Log in campaigns (+ id terug voor per-ontvanger campaign_sends-rijen).
  const sentAt = new Date().toISOString();
  const { data: camp, error: campErr } = await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: from_name || null, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: inSeg, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id, resend_audience_id: segmentId,
    sent_at: sentAt,
  }).select('id').single();
  if (campErr) console.error('[send-broadcast] campaigns insert faalde', campErr.message);

  // 5) Per ontvanger een campaign_sends-rij.
  if (camp?.id && placed.length) {
    const rows = placed.map((p) => ({
      campaign_id: camp.id,
      contact_id: p.contact_id || null,
      recipient_email: p.email,
      status: 'sent',
      sent_at: sentAt,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('campaign_sends').insert(rows.slice(i, i + 500));
      if (error) console.error('[send-broadcast] campaign_sends insert faalde', error.message);
    }
  }

  return {
    ok: true, status: 200,
    result: {
      broadcast_id: bc.data.id, segment_id: segmentId,
      recipients: inSeg, skipped_unsubscribed: skipped,
      failed: failedEmails.length, failed_emails: failedEmails.slice(0, 50),
      campaign_id: camp?.id || null,
    },
  };
}
