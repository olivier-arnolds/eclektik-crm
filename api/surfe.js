// Surfe email-finder proxy. Vervangt eerder Lusha-based finder vanwege
// Surfe's waterfall over 8 providers (hogere hit-rate).
//
// Action: find-emails (bulk).
// Input:  { contact_ids: [uuid, ...] }   max 25 per call
// Output: { found: N, no_email: N, failed: N, results: [...] }
//
// Flow: server-side async-naar-sync wrapper.
//   1. POST /v2/people/enrich met batch linkedinUrls (externalID = contact_id)
//   2. Poll GET /v2/people/enrich/{id} elke 2s tot COMPLETED of 50s timeout
//   3. Update contacts.email per match (alleen waar email VALID)
//
// Vereist: SURFE_API_KEY env var in Vercel.

import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';

const SURFE_API_KEY = process.env.SURFE_API_KEY;
const SURFE_BASE = 'https://api.surfe.com';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!await requireUser(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!SURFE_API_KEY) return res.status(500).json({ error: 'SURFE_API_KEY not configured in Vercel env vars' });

  const { action } = req.query;
  if (action !== 'find-emails') return res.status(400).json({ error: 'unknown action' });

  const { contact_ids } = req.body || {};
  if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
    return res.status(400).json({ error: 'contact_ids array required' });
  }
  if (contact_ids.length > 25) {
    return res.status(400).json({ error: 'max 25 contacten per call (server-poll timeout)' });
  }

  // Fetch contacts, filter alleen die zonder email maar mét linkedin_url.
  const { data: contacts, error: fetchErr } = await supabase
    .from('contacts')
    .select('id, email, linkedin_url, first_name, last_name, company_name')
    .in('id', contact_ids);
  if (fetchErr) return res.status(500).json({ error: 'fetch contacts: ' + fetchErr.message });

  const eligible = (contacts || []).filter(c => !c.email && c.linkedin_url);
  const skipped = (contacts || []).length - eligible.length;
  if (eligible.length === 0) {
    return res.status(200).json({ found: 0, no_email: 0, failed: 0, skipped, results: [] });
  }

  // 1. Start enrichment batch
  let startResp, startData;
  try {
    startResp = await fetch(`${SURFE_BASE}/v2/people/enrich`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURFE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        people: eligible.map(c => ({
          linkedinUrl: c.linkedin_url,
          externalID: c.id,
          firstName: c.first_name || undefined,
          lastName: c.last_name || undefined,
          companyName: c.company_name || undefined,
        })),
        include: { email: true, mobile: false },
      }),
    });
    startData = await startResp.json().catch(() => ({}));
  } catch (err) {
    return res.status(500).json({ error: 'Surfe start request failed: ' + err.message });
  }
  if (!startResp.ok) {
    // Geef de volledige Surfe response door zodat frontend de exacte
    // validation-error kan tonen (welk veld is fout).
    return res.status(400).json({
      error: startData?.message || startData?.code || `Surfe ${startResp.status}`,
      surfe_status: startResp.status,
      surfe_response: startData,
      sent_payload_sample: {
        first_person: eligible[0] ? { linkedinUrl: eligible[0].linkedin_url, first: eligible[0].first_name, last: eligible[0].last_name } : null,
        include: { email: true, mobile: false },
      },
    });
  }
  const enrichmentID = startData.enrichmentID || startData.enrichment_id || startData.id;
  if (!enrichmentID) {
    return res.status(500).json({ error: 'No enrichmentID returned', surfe_response: startData });
  }

  // 2. Poll tot COMPLETED — max ~50s
  const deadline = Date.now() + 50_000;
  let pollData = null;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const pollResp = await fetch(`${SURFE_BASE}/v2/people/enrich/${enrichmentID}`, {
      headers: { 'Authorization': `Bearer ${SURFE_API_KEY}` },
    });
    if (!pollResp.ok) continue;
    pollData = await pollResp.json().catch(() => null);
    if (pollData?.status === 'COMPLETED') break;
  }
  if (!pollData || pollData.status !== 'COMPLETED') {
    return res.status(504).json({ error: 'Surfe enrichment timed out (50s)', enrichmentID });
  }

  // 3. Apply results — pick eerste VALID email per person, update DB
  let found = 0, noEmail = 0, failed = 0;
  const results = [];
  for (const person of (pollData.people || [])) {
    const contactId = person.externalID;
    const validEmail = (person.emails || []).find(e => e.validationStatus === 'VALID')
                    || (person.emails || [])[0];
    if (!validEmail?.email) {
      noEmail++;
      results.push({ contact_id: contactId, status: 'no-email' });
      continue;
    }
    const { error: updErr } = await supabase.from('contacts')
      .update({ email: validEmail.email })
      .eq('id', contactId);
    if (updErr) {
      failed++;
      results.push({ contact_id: contactId, status: 'update-failed', error: updErr.message });
    } else {
      found++;
      results.push({ contact_id: contactId, status: 'found', email: validEmail.email });
    }
  }

  return res.status(200).json({ found, no_email: noEmail, failed, skipped, results });
}
