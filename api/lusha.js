// Lusha email-finder proxy.
// Action: find-email per contact_id. Lookup via LinkedIn URL.
// Vereist LUSHA_API_KEY env var (door Olivier in Vercel gezet).

import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const LUSHA_API_KEY = process.env.LUSHA_API_KEY;
const LUSHA_BASE = 'https://api.lusha.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!LUSHA_API_KEY) return res.status(500).json({ error: 'LUSHA_API_KEY not configured in Vercel env vars' });

  const { action } = req.query;

  if (action === 'find-email') {
    const { contact_id } = req.body || {};
    if (!contact_id) return res.status(400).json({ error: 'contact_id required' });

    const { data: contact, error: getErr } = await supabase
      .from('contacts')
      .select('id, email, linkedin_url, first_name, last_name, company_name, companies(name)')
      .eq('id', contact_id)
      .single();
    if (getErr || !contact) return res.status(404).json({ error: 'contact not found' });
    if (contact.email) return res.status(200).json({ success: false, reason: 'already-has-email' });
    if (!contact.linkedin_url) return res.status(200).json({ success: false, reason: 'no-linkedin-url' });

    try {
      const resp = await fetch(`${LUSHA_BASE}/v3/contacts/search-and-enrich`, {
        method: 'POST',
        headers: {
          'api_key': LUSHA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: [{ linkedinUrl: contact.linkedin_url }],
          revealEmail: true,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return res.status(400).json({ error: data.message || data.error || `Lusha ${resp.status}`, lusha_response: data });
      }

      // Lusha v3 response — defensief over de shape (kan items[]/contacts[]/results[]/data[] zijn)
      const items = data.contacts || data.results || data.items || data.data || [];
      const first = Array.isArray(items) ? items[0] : items;
      const email =
        first?.emails?.[0]?.email
        || first?.emails?.[0]?.address
        || first?.email
        || first?.emailAddress
        || (Array.isArray(first?.email_addresses) && (first.email_addresses[0]?.email || first.email_addresses[0]))
        || '';

      if (!email) {
        return res.status(200).json({
          success: false,
          reason: 'no-email-in-lusha-response',
          lusha_raw_keys: first ? Object.keys(first) : [],
        });
      }

      const { error: updErr } = await supabase.from('contacts').update({ email }).eq('id', contact_id);
      if (updErr) return res.status(500).json({ error: updErr.message });

      return res.status(200).json({ success: true, contact_id, email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'unknown action' });
}
