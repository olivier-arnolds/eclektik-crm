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
//   { action:'register', email, slots, note, registeredBy, confirmOverwrite }
//     -> { ok:true } | { ok:false, reason:'needs_confirm', existing }
//     De interne aanmeldpagina /s/intern: een collega meldt iemand aan die in een
//     gesprek heeft gezegd mee te willen doen. Zelfde tabel, anders klopt de
//     telling per datum niet. Dit is de enige actie die een rij mag aanmaken.
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
  validateRequest, looksLikeToken, isClosed, clickPatch, confirmPatch, submitPatch, isRuis,
  registerOutcome, registerPatch,
} from './_lib/session-invite-lib.js';
import { maakToken } from './_lib/session-invite-ensure-lib.js';

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

  // De interne route gaat voor de deadline langs. Die deadline is er om te
  // voorkomen dat een klant drie dagen voor de sessie nog antwoordt; een collega
  // die daarna iemand aanmeldt heeft die persoon net aan de telefoon gehad en
  // weet precies wat hij doet. Zie de toelichting bij handleRegister.
  if (body.action === 'register') return handleRegister(res, body);

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
      .select('id, first_name, click_count, bot_suspected, created_at')
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

    // Een bevestiging die te snel na het versturen binnenkomt is vrijwel zeker
    // een scanner die de pagina uitvoert. Het antwoord wordt wel bewaard, maar
    // gemarkeerd, zodat de tab het niet meetelt. Weigeren zou betekenen dat een
    // snelle echte lezer de bedankpagina ziet en er niets wordt vastgelegd.
    if (body.action === 'confirm' && isRuis({ aangemaaktISO: row.created_at, antwoordISO: patch.answer_at })) {
      patch.bot_suspected = true;
    }

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


// ── Interne aanmelding ────────────────────────────────────────────────────────
//
// TWEE KEUZES DIE DE SPEC OPENLIET
//
// 1. De deadline geldt hier NIET. Hij bestaat om een klant te beletten vlak voor
//    de sessie nog te antwoorden op een mail van weken geleden. Een collega die
//    na die datum iemand aanmeldt, doet dat na een gesprek en weet wat hij doet.
//    Zou dit 'closed' teruggeven, dan staat de collega met lege handen terwijl de
//    deelnemer wel komt, en klopt juist de telling niet waar dit om begonnen is.
//
// 2. Herhaald posten is idempotent, en dat volgt uit registerOutcome: om
//    bevestiging wordt alleen gevraagd als er een antwoord van de KLANT ZELF
//    ligt. Een tweede klik op Register vindt zijn eigen interne antwoord en
//    schrijft gewoon door. Zelfde uitkomst, geen vraag aan de collega over zijn
//    eigen invoer van een seconde eerder.
//
// Opzoeken gaat met een exacte vergelijking en niet met ilike: drie van de
// adressen in de tabel bevatten een underscore, en dat is in LIKE een jokerteken
// voor één willekeurig teken. Alle adressen staan genormaliseerd opgeslagen en de
// unieke index user_session_invites_email_uniek staat op lower(btrim(email)),
// dus exact vergelijken op het genormaliseerde adres vindt wat er is.
async function handleRegister(res, body) {
  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('id, answer, confirmed, source, bot_suspected, slots, note')
      .eq('email', body.email)
      .maybeSingle();
    if (error) throw error;

    const uitkomst = registerOutcome(row, body);
    if (uitkomst.kind === 'needs_confirm') {
      return res.status(200).json({ ok: false, reason: 'needs_confirm', existing: uitkomst.existing });
    }

    const patch = registerPatch(body);

    if (uitkomst.kind === 'update') {
      const { error: updError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
      if (updError) throw updError;
      return res.status(200).json({ ok: true });
    }

    // Nieuw. token is NOT NULL en uniek, dus er wordt er een aangemaakt ook al
    // gaat er geen mail uit: dat houdt de invariant heel en laat de deelnemer
    // later alsnog een werkende link krijgen als we die willen sturen.
    const { error: insError } = await supabase
      .from(TABLE)
      .insert({ email: body.email, token: maakToken(), ...patch });

    // Twee collega's die tegelijk dezelfde persoon aanmelden botsen op de unieke
    // index. Dat is geen storing maar precies wat die index hoort te doen; de
    // tweede werkt gewoon de rij bij die de eerste zojuist maakte.
    if (insError) {
      if (insError.code !== '23505') throw insError;
      const { data: bestaand, error: leesError } = await supabase
        .from(TABLE).select('id').eq('email', body.email).maybeSingle();
      if (leesError) throw leesError;
      if (!bestaand) throw insError;
      const { error: updError } = await supabase.from(TABLE).update(patch).eq('id', bestaand.id);
      if (updError) throw updError;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Geen e-mailadres in de log: die belandt anders in de Vercel-runtimelogs.
    console.error('[session-invite] register failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
