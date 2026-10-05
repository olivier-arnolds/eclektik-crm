// POST /api/event-confirm - de bevestigingspagina /e/:token op de website.
//
// Wie zich inschreef toen het event nog op 6 oktober stond, laat met één klik
// weten of de nieuwe datum schikt. Contract: eclectik-website
// api/e/_event-confirm.ts, commit 98bbd5d.
//
//   { action:'lookup', token }           -> { ok:true, firstName } | { ok:false, reason }
//   { action:'answer', token, answer }   -> { ok:true }            | { ok:false, reason }
//
// Twee regels die de rest verklaren:
//   1. Een onbekend token krijgt hetzelfde antwoord als elk ander: status 200 met
//      een reason. Niet uit de statuscode en niet uit de tekst mag blijken of het
//      token bestond, anders is de tabel af te tasten.
//   2. De deadline gaat vóór de opzoekactie. Daardoor ziet na afloop iedereen
//      exact hetzelfde, ook wie met verzonnen tokens zit te proberen. Andersom
//      verraadt het verschil tussen 'closed' en 'unknown_token' alsnog welke
//      tokens bestaan.
//
// Dat lookup niets schrijft is met opzet. Linkscanners openen elke URL in een
// mail; zou het openen van de pagina al iets vastleggen, dan zet Outlook een
// antwoord namens de genodigde. Daarom zit het schrijven achter een echte klik.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateRequest, looksLikeToken, isClosed, answerPatch } from './_lib/event-confirm-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const TABLE = 'event_confirm_invites';
const UNKNOWN = { ok: false, reason: 'unknown_token' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateRequest(req.body);
  if (valError) return res.status(400).json({ error: valError });

  // De voornaam in het antwoord hoort niet in een cache of proxy.
  res.setHeader('Cache-Control', 'no-store');

  if (isClosed()) return res.status(200).json({ ok: false, reason: 'closed' });
  if (!looksLikeToken(body.token)) return res.status(200).json(UNKNOWN);

  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('id, first_name, answer_count')
      .eq('token', body.token)
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(200).json(UNKNOWN);

    if (body.action === 'lookup') {
      // Alleen de voornaam. Een doorgestuurde mail zou met het e-mailadres of de
      // bedrijfsnaam gegevens van een collega laten zien.
      return res.status(200).json({ ok: true, firstName: row.first_name || null });
    }

    const { error: updError } = await supabase
      .from(TABLE).update(answerPatch(body, row)).eq('id', row.id);
    if (updError) throw updError;
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Geen token in de log: die belandt anders in de Vercel-runtimelogs, en met
    // een token kan iemand namens een ander antwoorden.
    console.error(`[event-confirm] ${body.action} failed:`, e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
