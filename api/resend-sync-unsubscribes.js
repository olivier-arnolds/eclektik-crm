import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';

// Pull-sync van afmeldingen: Resend stuurt geen betrouwbare unsubscribe-webhook,
// dus halen we hier de actuele afmeld-status op en zetten afgemelde contacten in
// de CRM op do_not_email. Eenrichting (Resend afgemeld -> CRM geblokkeerd); we
// heffen een bestaande blokkade NOOIT automatisch op, om niemand ongewild weer
// te mailen. Aangeroepen bij het openen van de marketing-tab en via de knop.

const RESEND = 'https://api.resend.com';
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

async function rsGet(path) {
  const resp = await fetch(`${RESEND}${path}`, {
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // 1) Alle afgemelde e-mailadressen uit Resend ophalen (gepagineerd).
  const unsubscribed = new Set();
  let after = null;
  for (let page = 0; page < 500; page++) {
    const q = `/contacts?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    const r = await rsGet(q);
    if (!r.ok) {
      console.error('[resend-sync-unsubscribes] contacten ophalen faalde', r.status, JSON.stringify(r.data));
      return res.status(502).json({ error: 'contacten ophalen uit Resend faalde', detail: r.data });
    }
    const rows = Array.isArray(r.data?.data) ? r.data.data : [];
    for (const c of rows) {
      if (c.unsubscribed && c.email) unsubscribed.add(String(c.email).trim().toLowerCase());
    }
    if (!r.data?.has_more || rows.length === 0) break;
    after = rows[rows.length - 1]?.id;
    if (!after) break;
  }

  // 2) CRM-contacten laden en case-ongevoelig matchen (Resend lowercase't e-mails,
  //    de CRM bewaart ze in originele casing).
  const { data: crm, error: crmErr } = await supabase
    .from('contacts')
    .select('id, email, do_not_email');
  if (crmErr) {
    console.error('[resend-sync-unsubscribes] CRM-contacten laden faalde', crmErr.message);
    return res.status(500).json({ error: 'CRM-contacten laden faalde', detail: crmErr.message });
  }

  const toBlock = [];
  for (const c of crm || []) {
    const email = String(c.email || '').trim().toLowerCase();
    if (!email) continue;
    if (unsubscribed.has(email) && !c.do_not_email) toBlock.push(c.id);
  }

  // 3) Nieuw-afgemelde contacten op do_not_email zetten (per chunk).
  let newlyBlocked = 0;
  const CHUNK = 200;
  for (let i = 0; i < toBlock.length; i += CHUNK) {
    const ids = toBlock.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('contacts')
      .update({ do_not_email: true })
      .in('id', ids)
      .select('id');
    if (error) {
      console.error('[resend-sync-unsubscribes] do_not_email zetten faalde', error.message);
      return res.status(500).json({ error: 'do_not_email bijwerken faalde', detail: error.message });
    }
    newlyBlocked += data?.length || 0;
  }

  console.log('[resend-sync-unsubscribes] klaar', { unsubscribed: unsubscribed.size, newlyBlocked });
  return res.status(200).json({ unsubscribed_in_resend: unsubscribed.size, newly_blocked: newlyBlocked });
}
