import { requireUser } from './_lib/guard.js';
import { contentTextToHtml } from './_lib/content-html.js';
import { appendSignature } from './_lib/signatures.js';

// POST /api/content-test-email
// Body: { subject, body, to, from_email?, from_name?, channel? }
//
// Stuurt EEN losse testmail (transactioneel via Resend /emails) zodat je kunt
// zien hoe een content-kalender-e-mail eruitziet vóór goedkeuring/planning.
// Slaat bewust de hele broadcast-machinerie over: geen segment, geen opt-in-
// check, geen planning. Merge-tags worden met een voorbeeld ingevuld (broadcast-
// merge-tags werken niet op de transactionele weg), links worden echte <a>.
// Alleen voor ingelogde CRM-gebruikers; het 'to'-adres typ je zelf (meestal jezelf).

const RESEND_API = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Voorbeeld-voornaam uit het lokale deel van het adres (olivier@… -> "Olivier").
function sampleFirstName(to) {
  const local = String(to || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/[^a-zA-Z ]/g, '').trim();
  const first = local.split(' ')[0] || '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'daar';
}

// Vul merge-tags met voorbeeldwaarden en ruim dubbele spaties/losse leestekens op.
function fillMergeTags(text, firstName) {
  return String(text || '')
    .replaceAll('{{first_name}}', firstName)
    .replaceAll('{{last_name}}', '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;!?])/g, '$1');
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { subject, body, to, from_email, from_name, channel } = req.body || {};
  if (!subject || !String(subject).trim()) return res.status(400).json({ error: 'onderwerp ontbreekt' });
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'tekst ontbreekt' });
  if (!to || !EMAIL_RE.test(String(to).trim())) return res.status(400).json({ error: 'geldig testadres vereist' });

  const toAddr = String(to).trim();
  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'from_email/MARKETING_FROM_EMAIL ontbreekt' });
  const fromName = from_name || process.env.MARKETING_FROM_NAME || 'Marketing';
  const from = `${fromName} <${fromEmail}>`;

  const filled = fillMergeTags(body, sampleFirstName(toAddr));
  const html = appendSignature(contentTextToHtml(filled), fromEmail);
  const prefix = channel ? `[TEST ${String(channel).toUpperCase()}] ` : '[TEST] ';

  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [toAddr], subject: prefix + subject, html }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('[content-test-email] Resend faalde', resp.status, JSON.stringify(data));
    return res.status(502).json({ error: data?.message || `Resend HTTP ${resp.status}` });
  }
  return res.status(200).json({ ok: true, id: data?.id || null, to: toAddr });
}
