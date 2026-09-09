import { createClient } from '@supabase/supabase-js';

// GET|POST /api/outreach-unsubscribe?t=<unsubscribe_token>
//
// Afmeldlink uit een outreach-mail. Zet de prospect op 'opted_out' en, als hij
// aan een CRM-contact gekoppeld is, ook do_not_email in de CRM.
//
// BEWUST PUBLIEK, GEEN GUARD. Deze URL wordt door een ontvanger geopend of door
// zijn mailclient aangeroepen (RFC 8058 one-click), dus er is geen sessie. De
// token uit outreach_contact.unsubscribe_token is de autorisatie: hij is een
// uuid, per prospect uniek, en kan alleen iemand UIT zetten. Een guard hier
// toevoegen breekt de afmeldlink, dus dat is geen 'fix'.
//
// POST is de one-click-variant die Gmail en Yahoo aanroepen; die verwacht geen
// pagina terug. GET is een mens die klikt en krijgt een korte bevestiging.
// De zichtbare tekst is Engels, want de mails zijn dat ook.

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f6f7f8;margin:0;padding:48px 20px;color:#1a1a1a">
<div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:10px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
${body}
<p style="font-size:12px;color:#8a949c;margin:22px 0 0">Eclectik</p>
</div></body></html>`;
}

export default async function handler(req, res) {
  const isPost = req.method === 'POST';
  if (!isPost && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(req.query?.t || '').trim();
  const respond = (status, title, body) => {
    // One-click verwacht alleen een status, geen pagina.
    if (isPost) return res.status(status).end();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).send(page(title, body));
  };

  if (!supabase) {
    return respond(500, 'Something went wrong',
      '<p style="font-size:15px;line-height:1.6">We could not process this right now. Reply to the email and we will take you off the list by hand.</p>');
  }

  // Ongeldige token: geen foutmelding die verklapt of een token bestaat, en geen
  // 404 die er als een defecte link uitziet. Wel een werkbare uitweg.
  if (!token || !UUID_RE.test(token)) {
    return respond(400, 'Link not valid',
      '<p style="font-size:15px;line-height:1.6">This opt-out link is not valid. Reply to the email and we will take you off the list.</p>');
  }

  const { data: contact, error } = await supabase
    .from('outreach_contact')
    .select('id, contact_id, status, email')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (error) {
    console.error('[outreach-unsubscribe] lookup faalde', error.message);
    return respond(500, 'Something went wrong',
      '<p style="font-size:15px;line-height:1.6">We could not process this right now. Reply to the email and we will take you off the list by hand.</p>');
  }
  if (!contact) {
    return respond(400, 'Link not valid',
      '<p style="font-size:15px;line-height:1.6">This opt-out link is not valid. Reply to the email and we will take you off the list.</p>');
  }

  const done = '<p style="font-size:16px;line-height:1.6;margin:0 0 10px"><strong>You are opted out.</strong></p>'
    + '<p style="font-size:15px;line-height:1.6;margin:0;color:#4a5560">You will not get any more messages from us about this event.</p>';

  // Al afgemeld: idempotent, dezelfde bevestiging.
  if (contact.status === 'opted_out') return respond(200, 'Opted out', done);

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase.from('outreach_contact').update({
    status: 'opted_out',
    opted_out_at: nowIso,
    next_action_at: null,
    paused_reason: 'afgemeld via de link in de mail',
    updated_at: nowIso,
  }).eq('id', contact.id);

  if (upErr) {
    console.error('[outreach-unsubscribe] update faalde', contact.id, upErr.message);
    return respond(500, 'Something went wrong',
      '<p style="font-size:15px;line-height:1.6">We could not process this right now. Reply to the email and we will take you off the list by hand.</p>');
  }

  // Ook in de CRM vastleggen als deze prospect aan een contact hangt, zodat
  // andere verzendwegen hem ook overslaan.
  if (contact.contact_id) {
    const { error: cErr } = await supabase.from('contacts')
      .update({ do_not_email: true }).eq('id', contact.contact_id);
    if (cErr) console.error('[outreach-unsubscribe] do_not_email zetten faalde', contact.contact_id, cErr.message);
  }

  console.log('[outreach-unsubscribe] afgemeld', contact.id);
  return respond(200, 'Opted out', done);
}
