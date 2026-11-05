// De indeling van de Leads-tab in blokken. Pure logica, zonder React en zonder
// database, zodat de regels hieronder in tests vastliggen.
//
// WAAROM EEN EIGEN BESTAND
//   De tab toonde één tabel 'Website-aanmeldingen'. Daarin was niet te zien
//   voor welk event iemand zich had aangemeld, en met twee events tegelijk
//   (Amsterdam en Zürich) werd dat onhoudbaar. De indeling is daarmee een
//   beslissing met regels, en die horen niet verstopt in een renderfunctie.
import { EVENTS, eventLabel } from '../lib/lead-bron';

export const BLOK_EVENT = 'event';
export const BLOK_OUTREACH = 'outreach';
export const BLOK_OVERIG = 'overig';

/**
 * Houdt per lead alleen de nieuwste activiteit over.
 *
 * Verwacht een lijst die al op tijd gesorteerd is, nieuwste eerst: dan is de
 * eerste rij die we per lead tegenkomen meteen de goede. Ontdubbelen is nodig
 * omdat een paar mensen zich na de datumverschuiving opnieuw hebben aangemeld,
 * en die horen niet twee keer in hetzelfde blok.
 */
export function nieuwstePerLead(lijst) {
  const gezien = new Set();
  const uit = [];
  for (const a of (lijst || [])) {
    const lead = a?.marketing_lead_id;
    if (!lead || gezien.has(lead)) continue;
    gezien.add(lead);
    uit.push(a);
  }
  return uit;
}

/**
 * Deelt de activiteiten in blokken in.
 *
 * GEGROEPEERD OP ACTIVITEIT, NIET OP LEAD
 *   Wie zich voor Amsterdam en voor Zürich aanmeldt hoort in allebei de
 *   tabellen, want de vraag per blok is wie er bij dát event komt. Gevolg: de
 *   koppen tellen aanmeldingen en geen mensen.
 *
 * OP SLUG EN NIET OP DATUM
 *   Amsterdam is al twee keer verschoven en oude aanmeldingen dragen de datum
 *   van toen nog in hun payload. Groeperen op datum zou één event dus over
 *   meerdere blokken uitsmeren.
 *
 * @param {Array} activiteiten  marketing_lead_activity-rijen, nieuwste eerst
 * @param {Set|Map} zichtbareLeads  lead-ids die door het statusfilter komen
 * @returns {Array} blokken in weergavevolgorde
 */
export function maakBlokken(activiteiten, zichtbareLeads) {
  const zichtbaar = (id) => (zichtbareLeads?.has ? zichtbareLeads.has(id) : false);

  const perSlug = new Map();
  const afspraken = [];
  const overig = [];
  for (const a of (activiteiten || [])) {
    if (!zichtbaar(a?.marketing_lead_id)) continue;
    if (a.event === 'event_registered') {
      const slug = String(a.payload?.eventSlug || '').trim() || 'zonder-slug';
      if (!perSlug.has(slug)) perSlug.set(slug, []);
      perSlug.get(slug).push(a);
    } else if (a.event === 'outreach_meeting' || a.event === 'outreach_signup') {
      // Allebei komen ze uit een outreachcampagne. Een afspraak is een gepland
      // gesprek, een aanmelding is iemand die naar het event komt; de kolom
      // Aanmelding laat per rij zien welke van de twee het is.
      afspraken.push(a);
    } else {
      overig.push(a);
    }
  }

  // Elk event dat we kennen krijgt een blok, ook zonder aanmeldingen: nul is
  // daar een antwoord. Een slug uit de data die we niet kennen verdwijnt niet,
  // maar komt achteraan omdat we er geen datum bij hebben.
  const slugs = new Set([...Object.keys(EVENTS), ...perSlug.keys()]);
  const eventBlokken = [...slugs]
    .map(slug => ({
      sleutel: slug,
      titel: eventLabel(slug),
      soort: BLOK_EVENT,
      slug,
      rijen: nieuwstePerLead(perSlug.get(slug) || []),
      // Een eventblok telt aanmeldingen: dezelfde persoon kan zich voor twee
      // events aanmelden en telt dan in allebei de koppen mee.
      eenheid: ['aanmelding', 'aanmeldingen'],
    }))
    .sort((a, b) => String(EVENTS[a.slug]?.datum || '9999-99-99')
      .localeCompare(String(EVENTS[b.slug]?.datum || '9999-99-99')));

  return [
    ...eventBlokken,
    {
      sleutel: BLOK_OUTREACH,
      titel: 'Afspraken en aanmeldingen uit outreach',
      soort: BLOK_OUTREACH,
      rijen: nieuwstePerLead(afspraken),
      // Hier is niemand zich voor iets komen aanmelden: dit zijn leads die uit
      // een gesprek zijn gekomen.
      eenheid: ['lead', 'leads'],
    },
    {
      sleutel: BLOK_OVERIG,
      titel: 'Overig',
      soort: BLOK_OVERIG,
      rijen: nieuwstePerLead(overig),
      eenheid: ['lead', 'leads'],
    },
    // Waitlist en scorecard: een leeg restblok zegt niets en gaat weg. Bij een
    // event zegt nul aanmeldingen juist wel iets, dus dat blok blijft staan.
  ].filter(b => !(b.soort === BLOK_OVERIG && b.rijen.length === 0));
}
