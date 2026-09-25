// POST /api/session-invite - de drie schrijfacties achter de Ja/Nee-knoppen in de
// uitnodiging voor de Glint user session. De website houdt geen databasesleutels,
// dus alles loopt via dit ene endpoint, achter hetzelfde gedeelde geheim als
// api/website-signal.js. Contract: eclectik-website docs/superpowers/specs/
// 2026-09-25-glint-user-session-design.md.
//
//   { action:'click',   token, answer:'yes'|'no', botSuspected:boolean }
//     -> { ok:true } | { ok:false, reason:'unknown_token'|'closed' }
//   { action:'confirm', token, answer:'yes'|'no' }
//     -> { ok:true, firstName } | { ok:false, reason }
//   { action:'submit',  token, slots:string[], note:string|null }
//     -> { ok:true } | { ok:false, reason }
//
// Twee regels die de rest verklaren:
//   1. click raakt answer nooit aan, alleen pending_answer. De linkscanners van
//      Outlook en Mimecast openen elke URL in een mail; zonder die scheiding
//      zetten ze een antwoord namens de ontvanger, of gooien ze er later een om.
//   2. Een onbekend token krijgt hetzelfde antwoord als elk ander: status 200 met
//      een reason. Uit de statuscode noch uit de tekst mag blijken of het token
//      bestond.
//
// Wat hier NIET gebeurt: IP-adressen en user agents opslaan. bot_suspected komt
// als boolean binnen van de site, die de user agent alleen in het geheugen bekijkt.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import {
  validateRequest, looksLikeToken, isClosed, clickPatch, confirmPatch, submitPatch,
} from './_lib/session-invite-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const TABLE = 'user_session_invites';
// Eén vorm, één statuscode. Zie regel 2 hierboven.
const UNKNOWN = { ok: false, reason: 'unknown_token' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateRequest(req.body);
  // Een kapotte body is een fout van de aanroeper en zegt niets over een token.
  if (valError) return res.status(400).json({ error: valError });

  // Voornaam in het antwoord: niet in een cache, niet in een proxy.
  res.setHeader('Cache-Control', 'no-store');

  // De deadline eerst, vóór de opzoekactie. Daardoor krijgt na sluiting iedereen
  // exact hetzelfde te zien, ook wie met verzonnen tokens zit te proberen. Zou de
  // opzoekactie eerst gaan, dan verraadt het verschil tussen 'closed' en
  // 'unknown_token' na de deadline alsnog welke tokens bestaan.
  if (isClosed()) return res.status(200).json({ ok: false, reason: 'closed' });

  // Een token dat niet de vorm van de onze heeft, staat er ook niet in.
  if (!looksLikeToken(body.token)) return res.status(200).json(UNKNOWN);

  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('id, first_name, click_count, bot_suspected')
      .eq('token', body.token)
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(200).json(UNKNOWN);

    // click telt op vanuit de zojuist gelezen rij. Twee kliks op exact hetzelfde
    // moment kunnen één tik van de teller kosten; dat is een teller voor de sfeer,
    // geen boekhouding, en een RPC met een atomaire increment is die extra
    // databasefunctie hier niet waard.
    const patch = body.action === 'click' ? clickPatch(row, body)
      : body.action === 'confirm' ? confirmPatch(body)
        : submitPatch(body);

    const { error: updError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (updError) throw updError;

    // De aanhef op de pagina. Alleen de voornaam: een doorgestuurde mail zou met
    // het e-mailadres of de bedrijfsnaam gegevens van een collega laten zien.
    if (body.action === 'confirm') {
      return res.status(200).json({ ok: true, firstName: row.first_name || null });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Geen token en geen e-mailadres in de log: die belanden anders in de
    // Vercel-runtimelogs, en met een token kun je namens iemand antwoorden.
    console.error(`[session-invite] ${body.action} failed:`, e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
