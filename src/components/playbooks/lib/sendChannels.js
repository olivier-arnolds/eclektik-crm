// Browser-side send helpers per channel.
// Email: MS Graph via localStorage graph_token
// LinkedIn / WhatsApp / Instagram: via bestaande /api/unipile endpoint

import { supabase } from '../../../supabase';

export async function sendDraft(draft) {
  const fn = {
    email: sendEmail,
    linkedin: sendLinkedIn,
    whatsapp: sendWhatsApp,
    instagram: sendInstagram,
  }[draft.channel];
  if (!fn) throw new Error(`Unknown channel: ${draft.channel}`);
  await fn(draft);
  await supabase.from('playbook_drafts')
    .update({ status: 'sent', resolved_at: new Date().toISOString() })
    .eq('id', draft.id);
  await supabase.from('playbook_enrollments')
    .update({ status: 'active', next_action_at: new Date().toISOString() })
    .eq('id', draft.enrollment_id);
}

async function sendEmail(draft) {
  const token = localStorage.getItem('graph_token');
  if (!token) throw new Error('Niet ingelogd bij Microsoft (graph_token mist) — heraanmelden');

  const { data: contact } = await supabase
    .from('contacts')
    .select('email')
    .eq('id', draft.to_contact_id)
    .single();
  if (!contact?.email) throw new Error('Contact heeft geen email-adres');

  const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: draft.subject || '',
        body: { contentType: 'Text', content: draft.body || '' },
        toRecipients: [{ emailAddress: { address: contact.email } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Graph sendMail failed (${resp.status}): ${err.slice(0, 200)}`);
  }
}

async function sendLinkedIn(draft) {
  return sendViaUnipile(draft, 'linkedin');
}

async function sendWhatsApp(draft) {
  return sendViaUnipile(draft, 'whatsapp');
}

async function sendInstagram(draft) {
  return sendViaUnipile(draft, 'instagram');
}

async function sendViaUnipile(draft, providerType) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('linkedin_url, phone, instagram_username')
    .eq('id', draft.to_contact_id)
    .single();

  const identifier = providerType === 'linkedin' ? contact?.linkedin_url
                   : providerType === 'whatsapp' ? contact?.phone
                   : contact?.instagram_username;
  if (!identifier) throw new Error(`Contact heeft geen ${providerType} identifier`);

  const resp = await fetch('/api/unipile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send_message',
      provider: providerType,
      identifier,
      text: draft.body,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Unipile send failed (${resp.status}): ${err.slice(0, 200)}`);
  }
}
