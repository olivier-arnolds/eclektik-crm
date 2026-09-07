import { requireUser } from './_lib/guard.js';
import { sendBroadcast } from './_lib/send-broadcast.js';
import { appendSignature } from './_lib/signatures.js';

// Newsletter-broadcast via Resend (segment = de selectie). De hard-won segment-/
// rate-limit-logica leeft in api/_lib/send-broadcast.js zodat de content-kalender-
// cron dezelfde weg kan gebruiken. Dit endpoint is de user-facing wrapper.
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const body = req.body || {};
  // Handtekening onder de body plakken vóór sendBroadcast; die voegt de
  // verplichte afmeldlink daarná toe (body -> handtekening -> afmeldlink),
  // net als de content-kalender. no-op als het afzenderadres geen handtekening heeft.
  if (body.append_signature) {
    body.html_body = appendSignature(body.html_body, body.from_email);
  }

  const { ok, status, result, error, detail } = await sendBroadcast(body);
  if (!ok) return res.status(status).json({ error, detail });
  return res.status(200).json(result);
}
