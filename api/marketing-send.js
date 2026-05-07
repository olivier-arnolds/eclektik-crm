// POST /api/marketing-send
// Body: { campaign_id?, name, subject, preheader, html_body, from_name?, from_email?, reply_to?, audience_filter, recipients: [{contact_id, email, vars}] }
// On success: returns { campaign_id, sent: N, failed: M, status: 'sent' | 'failed' }
//
// Sends per-recipient via Resend's POST /emails endpoint with HTML pre-rendered
// from the template (variable substitution happens client-side and the final
// HTML is passed in directly). Per-recipient send is sequential with a small
// gap to avoid burst-pattern detection.
//
// Error handling matches §5 of the spec:
//   - Per-recipient 4xx → mark that send 'failed', continue
//   - 2 consecutive server (5xx) errors → abort, mark campaign 'failed'
//   - 401/403 → abort immediately
import { createClient } from '@supabase/supabase-js';

const RESEND_API = 'https://api.resend.com/emails';
const PER_SEND_DELAY_MS = 250;
const MAX_CONSECUTIVE_SERVER_ERRORS = 2;

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function resendSend({ from, to, subject, html, headers }) {
  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, headers }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const {
    campaign_id, name, subject, preheader, html_body,
    from_name, from_email, reply_to, audience_filter, recipients,
    sent_by,
  } = req.body || {};

  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'subject, html_body and recipients[] are required' });
  }

  const fromName = from_name || process.env.MARKETING_FROM_NAME || 'Marketing';
  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'MARKETING_FROM_EMAIL not configured' });
  const fromHeader = `${fromName} <${fromEmail}>`;

  // Upsert the campaign row first so campaign_sends has a parent
  let cid = campaign_id;
  if (!cid) {
    const { data, error } = await supabase.from('campaigns').insert({
      name: name || subject,
      subject, preheader, html_body,
      from_name: fromName, from_email: fromEmail, reply_to: reply_to || null,
      audience_filter: audience_filter || null,
      status: 'sending',
      recipient_count: recipients.length,
      sent_by: sent_by || null,
    }).select('id').single();
    if (error) return res.status(500).json({ error: 'campaign insert: ' + error.message });
    cid = data.id;
  } else {
    await supabase.from('campaigns').update({ status: 'sending', recipient_count: recipients.length }).eq('id', cid);
  }

  let consecutiveServerErrors = 0;
  let succeeded = 0;
  let failed = 0;
  let aborted = false;
  let abortReason = null;

  for (const r of recipients) {
    const recipientHtml = r.html || html_body;
    const headers = reply_to ? { 'Reply-To': reply_to } : undefined;
    const result = await resendSend({
      from: fromHeader, to: r.email, subject, html: recipientHtml, headers,
    });

    if (result.ok) {
      consecutiveServerErrors = 0;
      succeeded++;
      const messageId = result.data?.id || null;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid,
        contact_id: r.contact_id || null,
        recipient_email: r.email,
        resend_message_id: messageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } else if (result.status === 401 || result.status === 403) {
      aborted = true;
      abortReason = 'auth';
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `auth ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`,
      });
      break;
    } else if (result.status >= 500) {
      consecutiveServerErrors++;
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `server ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`,
      });
      if (consecutiveServerErrors >= MAX_CONSECUTIVE_SERVER_ERRORS) {
        aborted = true;
        abortReason = 'resend-down';
        break;
      }
      await sleep(2000);
    } else {
      // 4xx per-recipient — log and continue
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `${result.status}: ${(result.data?.message || JSON.stringify(result.data)).slice(0, 200)}`,
      });
    }

    await sleep(PER_SEND_DELAY_MS);
  }

  const finalStatus = aborted ? 'failed' : 'sent';
  await supabase.from('campaigns').update({
    status: finalStatus,
    sent_at: new Date().toISOString(),
  }).eq('id', cid);

  return res.status(200).json({
    campaign_id: cid,
    sent: succeeded,
    failed,
    aborted,
    abortReason,
    status: finalStatus,
  });
}
