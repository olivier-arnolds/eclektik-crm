// POST /api/event-confirm-set - het antwoord op de eventuitnodiging met de hand
// zetten vanuit Marketing > Leads.
//
// Nodig omdat de mail met de bevestigingsknop slecht aankomt: mensen mailen
// rechtstreeks terug, en dan moet iemand dat kunnen vastleggen zonder dat de
// deelnemer ooit op de pagina is geweest.
//
// ACHTER EEN INGELOGDE GEBRUIKER, niet achter het webhookgeheim. De website
// gebruikt api/event-confirm.js met dat gedeelde geheim; dit is een
// beheerfunctie en hoort bij een mens met een sessie. Twee manieren van toegang
// in een bestand door elkaar halen is hoe een publieke route per ongeluk iets
// krijgt wat alleen het team mag.
//
// Waarom dit server-side moet: event_confirm_invites staat op RLS zonder
// policies, dus alleen de service key komt erbij. Dat is expres, want de tabel
// draagt per deelnemer een token waarmee je namens hem kunt antwoorden.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';
import { validateSet, setPatch, magMailVersturen } from './_lib/event-confirm-set-lib.js';
import { confirmationMail } from './_lib/event-confirmation-mails.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const TABLE = 'event_confirm_invites';

// De bevestiging komt van Olivier persoonlijk en niet van marketing@: het is een
// mail aan een genodigde die hij zelf heeft beoordeeld, en daar hoort een
// antwoord naar een mens op terug te kunnen.
const AFZENDER = 'olivier@eclectik.co';
const AFZENDER_NAAM = 'Olivier Arnolds';

/**
 * De aanmelding achter dit adres: welk event, welke voornaam, welke lead.
 * Null als er geen aanmelding ligt.
 */
async function registratie(email) {
  const { data: lead } = await supabase.from('marketing_leads')
    .select('id, full_name').ilike('email', email.replace(/([\\%_])/g, '\\$1')).maybeSingle();
  if (!lead) return null;
  const { data: acts } = await supabase.from('marketing_lead_activity')
    .select('payload, occurred_at').eq('marketing_lead_id', lead.id)
    .eq('event', 'event_registered').order('occurred_at', { ascending: false }).limit(1);
  const payload = acts && acts[0] ? acts[0].payload : null;
  if (!payload) return null;
  return {
    lead_id: lead.id,
    event_slug: payload.eventSlug || null,
    first_name: String(payload.name || lead.full_name || '').trim().split(/\s+/)[0] || null,
  };
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateSet(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    let { data: row, error } = await supabase
      .from(TABLE)
      .select('id, answer_count, email, first_name, event_slug')
      .eq('email', body.email)
      .maybeSingle();
    if (error) throw error;

    // De aanmelding is de bron voor WELK event iemand koos. De uitnodigingsrij
    // niet: die van oarnolds@me.com stond op amsterdam-2026 terwijl de
    // aanmelding zurich-2026 was, en dan zou de bevestiging iemand naar de
    // verkeerde stad sturen.
    const reg = await registratie(body.email);

    // Vroeger gaf een ontbrekende uitnodiging een 404, met als redenering dat
    // een deelnemerslijst alleen uitgenodigden hoort te bevatten. Dat klopt nog
    // steeds voor de uitnodigingsmail, maar niet voor deze lijst: wie zich via
    // de site aanmeldt staat wel in Leads en had geen rij, dus bij hem ontbrak
    // de keuzelijst. Aanmaken mag alleen als er ECHT een aanmelding ligt.
    if (!row) {
      if (!reg) return res.status(404).json({ error: 'Geen aanmelding voor dit adres' });
      const { data: nieuw, error: insErr } = await supabase.from(TABLE)
        .insert({
          token: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
          email: body.email,
          first_name: reg.first_name || null,
          event_slug: reg.event_slug || null,
          marketing_lead_id: reg.lead_id || null,
        })
        .select('id, answer_count, email, first_name, event_slug').single();
      if (insErr) throw insErr;
      row = nieuw;
    }

    const slug = reg?.event_slug || row.event_slug;
    const wilMail = body.send_mail;

    // De mail EERST, de status DAARNA. Andersom zou een mislukte verzending een
    // rij achterlaten die zegt dat iemand bevestigd is terwijl hij niets heeft
    // gekregen, en daar kijkt niemand meer naar om.
    let mailStatus = null;
    if (wilMail) {
      if (!magMailVersturen(body.answer)) {
        return res.status(400).json({ error: 'Bij deze status gaat er geen bevestiging mee' });
      }
      const mail = confirmationMail(slug, row.first_name || reg?.first_name);
      if (!mail) {
        return res.status(400).json({ error: `Geen bevestigingstekst voor event '${slug || 'onbekend'}'` });
      }
      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
      }
      const send = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${AFZENDER_NAAM} <${AFZENDER}>`,
          to: row.email,
          reply_to: AFZENDER,
          subject: mail.subject,
          text: mail.body,
        }),
      });
      const data = await send.json().catch(() => ({}));
      if (!send.ok) {
        console.error('[event-confirm-set] mail mislukt:', data);
        return res.status(502).json({ error: 'Versturen mislukt: ' + (data?.message || send.status) });
      }
      mailStatus = { sent: true, id: data?.id || null, event_slug: slug };
    }

    const patch = setPatch({ answer: body.answer, door: authedUser.email || null }, row);
    if (mailStatus) {
      patch.confirmation_sent_at = new Date().toISOString();
      patch.confirmation_sent_to = row.email;
      patch.confirmation_sent_by = authedUser.email || null;
    }
    const { error: updError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (updError) throw updError;

    return res.status(200).json({ ok: true, answer: body.answer, mail: mailStatus });
  } catch (e) {
    console.error('[event-confirm-set] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
