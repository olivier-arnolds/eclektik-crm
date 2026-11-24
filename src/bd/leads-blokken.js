// De indeling van de Leads-tab in blokken. Pure logica, zonder React en zonder
// database, zodat de regels hieronder in tests vastliggen.
//
// WAAROM EEN EIGEN BESTAND
//   De tab toonde één tabel 'Website-aanmeldingen'. Daarin was niet te zien
//   voor welk event iemand zich had aangemeld, en met twee events tegelijk
//   (Amsterdam en Zürich) werd dat onhoudbaar. De indeling is daarmee een
//   beslissing met regels, en die horen niet verstopt in een renderfunctie.
import { EVENTS, eventLabel } from '../lib/lead-bron';
import { magMarketing } from '../lib/contact-van-lead';

export const BLOK_EVENT = 'event';
export const BLOK_OUTREACH = 'outreach';
export const BLOK_BMAI = 'bmai';

/**
 * De signalen van eclectik.co/bmai. bmai_enquiry is het contactformulier
 * onderaan die pagina (api/bmai-enquiry.ts in de websiterepo),
 * bmai_poster_download het formulier voor de A3-poster (api/bmai-poster.ts).
 */
export const BMAI_EVENTS = new Set(['bmai_enquiry', 'bmai_poster_download']);

// De korte ids die de site meestuurt bij een aanvraag. Houd in sync met
// INTERESTS in api/bmai-enquiry.ts van de websiterepo.
const BMAI_INTERESSE = {
  organisation: 'eigen organisatie',
  partner: 'partner',
  app: 'Canvas-app',
};

/**
 * Wat iemand op /bmai deed, voor de kolom Aanvraag in het BMAI-blok.
 *
 * De opt-in staat erbij omdat hij hier echt verschilt: bij de poster is hij
 * verplicht, bij een aanvraag een keuze. Wie alleen een vraag stelde, mag je
 * antwoorden maar niet in een mailing zetten.
 *
 * @returns {{label: string, optIn: boolean}|null}  null bij een ander signaal
 */
export function bmaiAanvraag(event, payload) {
  if (!BMAI_EVENTS.has(event)) return null;
  const optIn = magMarketing(payload);
  if (event === 'bmai_poster_download') return { label: 'Poster', optIn };
  const interesse = BMAI_INTERESSE[String(payload?.interest || '').trim()];
  return { label: interesse ? `Vraag: ${interesse}` : 'Vraag', optIn };
}

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
  const bmai = [];
  for (const a of (activiteiten || [])) {
    if (!zichtbaar(a?.marketing_lead_id)) continue;
    if (a.event === 'event_registered') {
      const slug = String(a.payload?.eventSlug || '').trim() || 'zonder-slug';
      if (!perSlug.has(slug)) perSlug.set(slug, []);
      perSlug.get(slug).push(a);
    } else if (a.event === 'outreach_meeting') {
      // Alleen geplande gesprekken; dit blok is de lijst van gesprekken die er
      // aankomen. Een aanmelding in een eventcampagne levert geen activiteit
      // op: die zet je met de hand omdat je de aanmelding al binnen hebt.
      afspraken.push(a);
    } else if (BMAI_EVENTS.has(a.event)) {
      // Aanvragen en posterdownloads van /bmai. Tot 24 november 2026 vielen
      // die hieronder door, terwijl de site ze al in het CRM zette.
      bmai.push(a);
    }
    // Al het andere komt niet in beeld. Er stond een restblok 'Overig' voor
    // waitlist en scorecard, maar die mensen staan ook in het eventoverzicht,
    // dus het blok herhaalde alleen wat er al stond. LET OP: een nieuw soort
    // activiteit verdwijnt hiermee stilzwijgend uit deze tab; die hoort dan
    // een eigen plek te krijgen in plaats van een restbak.
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
      // De datum van het event, of null bij een slug die we niet kennen.
      // Hiermee bepaalt leads-campagnes.js of het blok onder Afgelopen valt.
      datum: EVENTS[slug]?.datum || null,
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
      titel: 'Afspraken uit outreach',
      soort: BLOK_OUTREACH,
      // Geen einddatum: outreach loopt door en valt nooit onder Afgelopen.
      datum: null,
      rijen: nieuwstePerLead(afspraken),
      // Hier is niemand zich voor iets komen aanmelden: dit zijn leads die uit
      // een gesprek zijn gekomen.
      eenheid: ['lead', 'leads'],
    },
    {
      sleutel: BLOK_BMAI,
      titel: 'BMAI',
      soort: BLOK_BMAI,
      // Geen einddatum: de pagina en de poster blijven staan, dus dit blok
      // valt nooit onder Afgelopen.
      datum: null,
      // Eén rij per lead, de nieuwste. Wie eerst de poster haalt en daarna een
      // vraag stelt, staat er dus met zijn vraag; de download staat in de
      // activiteit als je de rij openklapt.
      rijen: nieuwstePerLead(bmai),
      eenheid: ['lead', 'leads'],
    },
  ];
}
