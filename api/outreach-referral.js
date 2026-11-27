// POST /api/outreach-referral - wat er met een doorverwijzing gebeurt.
//
// WAAR DIT OVER GAAT
//   Veel antwoorden op een outreachmail zijn afwezigheidsberichten, en ruim de
//   helft daarvan noemt een collega. Die namen worden sinds v1.166.0 bewaard op
//   het antwoord zelf (outreach_message.referral_name / referral_email). Dit
//   endpoint legt per doorverwijzing vast wat er gebeurt: opgepakt, later bij de
//   oorspronkelijke contactpersoon, of niets mee doen.
//
// WAAROM SERVER-SIDE EN NIET VANUIT DE BROWSER
//   Bij 'opgepakt' wordt een NIEUWE prospect aangemaakt die daarna echte post
//   krijgt. Dat is twee schrijfacties die bij elkaar horen: de prospect erbij en
//   de doorverwijzing afgevinkt. Breekt dat halverwege vanuit een tabblad dat
//   iemand sluit, dan staat er een prospect in de campagne die nergens vandaan
//   lijkt te komen, of een afgevinkte doorverwijzing zonder dat er iemand
//   benaderd wordt. De volgorde hieronder is daarom: eerst de prospect, dan het
//   vinkje, en het vinkje alleen als de prospect er echt staat.
//
// ACHTER EEN INGELOGDE GEBRUIKER. Dit is beheerwerk dat bij een mens hoort, net
// als api/event-confirm-set.js.
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';
import {
  besluitPatch, magBesluiten, bouwDoorverwijsBericht,
} from '../src/lib/outreach-doorverwijzing.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

/** De voornaam uit een naam of, als die ontbreekt, uit een e-mailadres. */
export function voornaamUit(naam, email) {
  const n = String(naam || '').trim();
  if (n) return n.split(/\s+/)[0];
  // 'tamara.meskes@csu.nl' -> 'Tamara'. Een voornaam uit een adres halen is een
  // gok, maar 'Hi ,' is geen alternatief en 'Hi there,' bij iemand van wie we
  // het adres wel hebben leest als een massamail.
  const lokaal = String(email || '').split('@')[0] || '';
  const eerste = lokaal.split(/[._-]/)[0] || '';
  return eerste ? eerste.charAt(0).toUpperCase() + eerste.slice(1).toLowerCase() : '';
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { messageId, status, email, naam, body } = req.body || {};
  if (!messageId) return res.status(400).json({ error: 'messageId is verplicht' });

  const { data: bericht, error: leesErr } = await supabase
    .from('outreach_message')
    .select('id, campaign_id, contact_id, classification, referral_name, referral_email, referral_status')
    .eq('id', messageId).single();
  if (leesErr || !bericht) return res.status(404).json({ error: 'Antwoord niet gevonden' });
  if (!bericht.referral_name && !bericht.referral_email) {
    return res.status(400).json({ error: 'Dit antwoord bevat geen doorverwijzing' });
  }
  if (!magBesluiten(bericht)) {
    // Opnieuw oppakken zou dezelfde persoon een tweede keer in de campagne
    // zetten, en die krijgt dan twee keer bericht 1.
    return res.status(409).json({ error: 'Deze doorverwijzing is al opgepakt' });
  }

  let nieuweContactId = null;

  if (status === 'opgepakt') {
    const adres = String(email || bericht.referral_email || '').trim().toLowerCase();
    if (!adres) {
      return res.status(400).json({
        error: 'Geen e-mailadres voor deze collega. Vul er een in, of kies later of laten.',
      });
    }

    // Al in deze campagne? Dan niet nog een keer. Twee rijen met hetzelfde adres
    // betekent twee keer bericht 1 naar dezelfde persoon.
    const { data: bestaat } = await supabase.from('outreach_contact')
      .select('id').eq('campaign_id', bericht.campaign_id).ilike('email', adres).maybeSingle();
    if (bestaat) {
      return res.status(409).json({ error: 'Deze collega staat al in deze campagne' });
    }

    // Het bericht van de oorspronkelijke prospect is de basis: die collega werkt
    // bij hetzelfde bedrijf, dus het onderzoekswerk in bericht 1 klopt nog.
    const { data: origineel } = await supabase.from('outreach_contact')
      .select('company, company_linkedin, website, industry, location, size_bucket, company_id, '
        + 'priority_label, priority_tier, outreach_prio, source, msg1_subject, msg1_body, first_name, last_name')
      .eq('id', bericht.contact_id).single();
    if (!origineel) return res.status(404).json({ error: 'Oorspronkelijke prospect niet gevonden' });

    const volledigeNaam = String(naam || bericht.referral_name || '').trim();
    const voornaam = voornaamUit(volledigeNaam, adres);
    const verwijzer = [origineel.first_name, origineel.last_name].filter(Boolean).join(' ').trim();

    // De tekst mag meegegeven worden (de gebruiker heeft hem in het scherm kunnen
    // bijwerken); anders bouwen we hem hier, met dezelfde functie die het scherm
    // gebruikt voor de preview.
    let tekst = String(body || '').trim();
    if (!tekst) {
      const gebouwd = bouwDoorverwijsBericht({
        origineelBody: origineel.msg1_body,
        voornaam,
        verwijzer,
        bron: bericht.classification,
      });
      if (gebouwd.fout) return res.status(400).json({ error: gebouwd.fout });
      tekst = gebouwd.body;
    }

    const { data: nieuw, error: insErr } = await supabase.from('outreach_contact').insert({
      campaign_id: bericht.campaign_id,
      first_name: voornaam || null,
      last_name: volledigeNaam.split(/\s+/).slice(1).join(' ') || null,
      email: adres,
      email_domain: adres.split('@')[1] || null,
      company: origineel.company,
      company_id: origineel.company_id,
      company_linkedin: origineel.company_linkedin,
      website: origineel.website,
      industry: origineel.industry,
      location: origineel.location,
      size_bucket: origineel.size_bucket,
      priority_label: origineel.priority_label,
      priority_tier: origineel.priority_tier,
      outreach_prio: origineel.outreach_prio,
      source: 'doorverwijzing',
      msg1_subject: origineel.msg1_subject,
      msg1_body: tekst,
      status: 'queued',
      referred_by_name: verwijzer || bericht.referral_name || null,
      referred_by_message_id: bericht.id,
    }).select('id').single();
    if (insErr) {
      console.error('[outreach-referral] prospect aanmaken faalde:', insErr.message);
      return res.status(500).json({ error: 'Prospect aanmaken mislukt: ' + insErr.message });
    }
    nieuweContactId = nieuw.id;
  }

  const { fout, patch } = besluitPatch(status, {
    door: authedUser.email || null,
    contactId: nieuweContactId,
  });
  if (fout) return res.status(400).json({ error: fout });

  const { error: updErr } = await supabase.from('outreach_message')
    .update(patch).eq('id', messageId);
  if (updErr) {
    console.error('[outreach-referral] vinkje zetten faalde:', updErr.message);
    // De prospect staat er dan wel. Dat melden we eerlijk, want anders lijkt de
    // actie mislukt en klikt iemand nog een keer.
    return res.status(500).json({
      error: nieuweContactId
        ? 'De collega staat in de campagne, maar de doorverwijzing kon niet worden afgevinkt. Probeer het opnieuw.'
        : 'Opslaan mislukt: ' + updErr.message,
    });
  }

  return res.status(200).json({ ok: true, status: patch.referral_status, contactId: nieuweContactId });
}
