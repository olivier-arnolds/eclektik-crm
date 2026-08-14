import { requireUser } from './_lib/guard.js';
import { sendBroadcast } from './_lib/send-broadcast.js';

// Newsletter-broadcast via Resend (segment = de selectie). De hard-won segment-/
// rate-limit-logica leeft in api/_lib/send-broadcast.js zodat de content-kalender-
// cron dezelfde weg kan gebruiken. Dit endpoint is de user-facing wrapper.
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const { ok, status, result, error, detail } = await sendBroadcast(req.body || {});
  if (!ok) return res.status(status).json({ error, detail });
  return res.status(200).json(result);
}
