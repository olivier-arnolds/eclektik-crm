import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { toResendContacts } from '../src/lib/broadcast-recipients.js';

const RESEND = 'https://api.resend.com';
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

async function rs(path, method, body) {
  const resp = await fetch(`${RESEND}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Zet de app-placeholder {{first_name}} om naar Resend's merge-tag {{{FIRST_NAME}}}.
function toResendMergeTags(html) {
  return String(html || '').replaceAll('{{first_name}}', '{{{FIRST_NAME}}}');
}

// Resend voegt GEEN afmeldlink automatisch toe: de HTML moet de merge-tag
// {{{RESEND_UNSUBSCRIBE_URL}}} bevatten, anders werkt afmelden niet (en het is
// wettelijk verplicht). Voeg een nette footer toe als de tag ontbreekt.
function ensureUnsubscribe(html) {
  const h = String(html || '');
  if (h.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) return h;
  const footer = '<p style="font-size:12px;color:#888888;text-align:center;margin:28px 0 0">'
    + 'You are receiving this email because you are in contact with Eclectik. '
    + '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888888">Unsubscribe</a>.'
    + '</p>';
  return /<\/body>/i.test(h) ? h.replace(/<\/body>/i, footer + '</body>') : h + footer;
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by } = req.body || {};
  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0)
    return res.status(400).json({ error: 'subject, html_body en recipients[] vereist' });

  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'from_email/MARKETING_FROM_EMAIL ontbreekt' });
  const from = `${from_name || process.env.MARKETING_FROM_NAME || 'Marketing'} <${fromEmail}>`;

  const contacts = toResendContacts(recipients).filter(c => !c.unsubscribed);
  if (contacts.length === 0) return res.status(400).json({ error: 'geen verzendbare ontvangers' });

  // 1) Segment voor deze verzending = jouw selectie (statische lijst).
  //    Sinds Resend "Audiences" hernoemde naar top-level "Segments" bestaat er
  //    geen audience_id meer; een segment maak je met alleen een naam. Afmelden
  //    is nu GLOBAAL per contact (unsubscribed=true => uit alle broadcasts),
  //    dus we hoeven geen vaste audience meer bij te houden om afmeldingen te
  //    onthouden: Resend slaat afgemelde contacten sowieso over.
  const segName = `${campaign_name || subject} (${new Date().toISOString().slice(0, 10)})`.slice(0, 100);
  const seg = await rs('/segments', 'POST', { name: segName });
  if (!seg.ok || !seg.data?.id) {
    console.error('[resend-broadcast] segment aanmaken faalde', seg.status, JSON.stringify(seg.data));
    return res.status(502).json({ error: 'segment aanmaken faalde', detail: seg.data });
  }
  const segmentId = seg.data.id;

  // 2) Zet de geselecteerde contacten in het segment.
  //    - BESTAAND contact: POST /contacts/{email}/segments/{segmentId} (koppelen,
  //      afmeld-status blijft behouden; we forceren nooit unsubscribed:false).
  //    - NIEUW contact: POST /contacts met segments:[{id}].
  //    Globaal-afgemelde contacten slaan we over en markeren we in de CRM als
  //    do_not_email (pull-sync, want Resend stuurt daar geen webhook voor).
  const unsubscribedEmails = [];
  let inSeg = 0, skipped = 0;
  const CONCURRENCY = 8;
  for (let i = 0; i < contacts.length; i += CONCURRENCY) {
    const chunk = contacts.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (c) => {
      const enc = encodeURIComponent(c.email);
      const got = await rs(`/contacts/${enc}`, 'GET');
      if (got.ok && got.data?.id) {
        if (got.data.unsubscribed) { unsubscribedEmails.push(c.email); skipped++; return; }
        const add = await rs(`/contacts/${enc}/segments/${segmentId}`, 'POST');
        if (add.ok) inSeg++;
        else console.error('[resend-broadcast] contact aan segment koppelen faalde', add.status, c.email, JSON.stringify(add.data));
      } else if (got.status === 404) {
        const post = await rs('/contacts', 'POST',
          { email: c.email, first_name: c.first_name, segments: [{ id: segmentId }] });
        if (post.ok) inSeg++;
        else console.error('[resend-broadcast] contact aanmaken faalde', post.status, c.email, JSON.stringify(post.data));
      } else {
        console.error('[resend-broadcast] contact ophalen faalde', got.status, c.email, JSON.stringify(got.data));
      }
    }));
  }

  // Pull-sync: afgemelde contacten ook in de CRM op do_not_email zetten.
  if (unsubscribedEmails.length) {
    await supabase.from('contacts').update({ do_not_email: true }).in('email', unsubscribedEmails);
  }
  if (inSeg === 0) return res.status(400).json({ error: 'geen verzendbare ontvangers (allen afgemeld of opt-out)' });

  // 2b) Wacht tot Resend het segment daadwerkelijk gevuld heeft. Segment-lidmaatschap
  //     is eventually consistent; direct versturen gaf eerder een 422 "audience has
  //     no contacts". We pollen de segment-inhoud kort; lukt bevestiging niet, dan
  //     versturen we alsnog (best-effort) - de koppeling zelf is dan al gelukt.
  const asArray = (d) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.data?.data) ? d.data.data : null));
  let confirmed = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const chk = await rs(`/segments/${segmentId}/contacts`, 'GET');
    const rows = asArray(chk.data);
    confirmed = rows ? rows.length : 0;
    if (confirmed > 0) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('[resend-broadcast] segment gevuld', { segmentId, inSeg, skipped, confirmed });

  // 3) Broadcast naar het segment; Resend slaat afgemelde contacten sowieso over.
  const bc = await rs('/broadcasts', 'POST', {
    segment_id: segmentId, from, reply_to: reply_to || undefined,
    subject, name: campaign_name || subject, html: ensureUnsubscribe(toResendMergeTags(html_body)),
  });
  if (!bc.ok || !bc.data?.id) {
    console.error('[resend-broadcast] broadcast aanmaken faalde', bc.status, JSON.stringify(bc.data));
    return res.status(502).json({ error: 'broadcast aanmaken faalde', detail: bc.data });
  }
  const send = await rs(`/broadcasts/${bc.data.id}/send`, 'POST', {});
  if (!send.ok) {
    console.error('[resend-broadcast] broadcast versturen faalde', send.status, 'broadcastId=' + bc.data.id, JSON.stringify(send.data));
    return res.status(502).json({ error: 'broadcast versturen faalde', detail: send.data });
  }

  // 4) Log in campaigns.
  await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: from_name || null, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: inSeg, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id, resend_audience_id: segmentId,
    sent_at: new Date().toISOString(),
  });

  return res.status(200).json({ broadcast_id: bc.data.id, segment_id: segmentId, recipients: inSeg, skipped_unsubscribed: skipped });
}
