import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event, account_id, account_type, message, message_id, chat_id, timestamp, sender, attendees, attachments } = req.body;

  console.log('Unipile webhook received:', event, message_id);

  try {
    // Only process LinkedIn messages
    if (event === 'message_received' && account_type === 'LINKEDIN') {
      const senderName = sender?.attendee_name || 'Unknown';
      const senderProviderId = sender?.attendee_provider_id || '';
      const senderProfileUrl = sender?.attendee_profile_url || '';
      const messageText = message || '';

      // Try to find the contact in Supabase by LinkedIn provider ID or name
      let contactId = null;

      // Match by LinkedIn URL (provider ID is often in the URL)
      if (senderProfileUrl) {
        const { data } = await supabase.from('contacts')
          .select('id')
          .ilike('linkedin_url', `%${senderProfileUrl.split('/in/')[1]?.split('/')[0] || ''}%`)
          .limit(1);
        if (data?.length > 0) contactId = data[0].id;
      }

      // Fallback: match by name
      if (!contactId && senderName) {
        const { data } = await supabase.from('contacts')
          .select('id')
          .ilike('full_name', `%${senderName}%`)
          .limit(1);
        if (data?.length > 0) contactId = data[0].id;
      }

      // Store in comms table. chat_id is the Unipile thread identifier so
      // multiple messages in the same conversation can be grouped in the UI.
      await supabase.from('comms').insert({
        contact_id: contactId,
        channel: 'linkedin',
        direction: 'inbound',
        subject: messageText.substring(0, 100),
        body_preview: messageText,
        is_read: false,
        sent_at: timestamp || new Date().toISOString(),
        external_id: message_id,
        chat_id: chat_id || null,
        owner: senderName,
      });

      // Also store in activity table for timeline
      if (contactId) {
        await supabase.from('activity').insert({
          contact_id: contactId,
          type: 'linkedin_message',
          note: `LinkedIn message from ${senderName}: ${messageText.substring(0, 200)}`,
          source: 'Unipile webhook',
        });
      }

      console.log(`Stored LinkedIn message from ${senderName} (contact: ${contactId || 'unknown'})`);
      return res.status(200).json({ success: true, contactId, sender: senderName });
    }

    // Acknowledge other events
    return res.status(200).json({ success: true, event, ignored: true });

  } catch (error) {
    console.error('Unipile webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
