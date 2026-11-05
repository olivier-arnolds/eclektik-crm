// Het bronlabel in de tab Leads, afgeleid uit de activiteit zelf.
//
// WAAROM NIET MEER EEN VASTE TEKST
//   Dit stond als constante in de code: event_registered werd altijd
//   'Event 6 okt'. Toen het event naar 12 november verschoof klopte dat label
//   voor elke aanmelding niet meer, en het zou bij elke volgende verschuiving
//   opnieuw moeten. De datum staat gewoon in de payload van de aanmelding, dus
//   die kan het label zelf dragen.
//
//   De registratieroute schrijft eventDate weg als 2026-11-12. Verschuift het
//   event nog een keer, dan volgt dit label vanzelf.

// De events waarvoor mensen zich kunnen aanmelden, op slug.
//
// WAAROM EEN MAP EN NIET EEN DATUM
//   Dit was één constante EVENT_DATUM, en die klopte alleen voor Amsterdam.
//   Zodra Zürich erbij kwam stond elke Zürich-aanmelding op een 'verkeerde'
//   datum en kleurde hij nooit groen. Een event is meer dan een datum, dus
//   staat het hier als wat het is.
//
//   De slug is de sleutel en niet de datum: Amsterdam is al twee keer
//   verschoven (6 oktober, 12 november, 17 november) en oude aanmeldingen
//   dragen de datum van toen nog in hun payload. De slug verschuift niet.
export const EVENTS = {
  'amsterdam-2026': { naam: 'Amsterdam', datum: '2026-11-17' },
  'zurich-2026': { naam: 'Zürich', datum: '2026-12-01' },
};

/** Het event bij een slug, of null bij een slug die we niet kennen. */
export function eventInfo(slug) {
  const s = String(slug || '').trim();
  return (s && EVENTS[s]) || null;
}

/**
 * Het kopje boven een eventblok: 'Amsterdam 17 nov'. Een onbekende slug levert
 * de slug zelf op, want die zegt nog altijd meer dan 'Onbekend event'.
 */
export function eventLabel(slug) {
  const info = eventInfo(slug);
  if (!info) return String(slug || '').trim() || 'Zonder event';
  const datum = kortDatum(info.datum);
  return datum ? `${info.naam} ${datum}` : info.naam;
}

/**
 * Staat deze aanmelding op de datum waarop het event nu gepland staat?
 *
 * Alleen false als we het event kennen én de aanmelding een andere datum
 * draagt. Bij een onbekend event of een aanmelding zonder datum valt er niets
 * te vergelijken, en dan is 'wijkt af' een hardere uitspraak dan we kunnen doen.
 */
export function datumIsActueel(slug, payload) {
  const info = eventInfo(slug);
  if (!info) return false;
  const opgegeven = String(payload?.eventDate || '').trim();
  if (!opgegeven) return false;
  return opgegeven === info.datum;
}

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/**
 * @param {string} event    het soort activiteit, bv. 'event_registered'
 * @param {object} payload  de payload van die activiteit
 * @returns {string|null}   leesbare bron, of null als er niets te zeggen valt
 */
export function bronLabel(event, payload) {
  if (!event) return null;
  // Iemand die in de outreachlijst op 'afspraak' is gezet. De campagnenaam
  // staat in de payload, want anders leest de kolom Bron alleen 'outreach' en
  // weet je niet uit welke actie diegene kwam.
  if (event === 'outreach_meeting') {
    const camp = typeof payload?.campaign === 'string' ? payload.campaign.trim() : '';
    return camp ? `Outreach: ${camp}` : 'Outreach';
  }
  if (event !== 'event_registered') return event;
  const datum = kortDatum(payload?.eventDate);
  return datum ? `Event ${datum}` : 'Event';
}

/** '2026-11-12' wordt '12 nov'. Een onbruikbare waarde geeft null. */
export function kortDatum(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const maand = Number(m[2]);
  if (maand < 1 || maand > 12) return null;
  const dag = Number(m[3]);
  if (dag < 1 || dag > 31) return null;
  return `${dag} ${MAANDEN[maand - 1]}`;
}

/**
 * Via wie de deelnemer bij het event terechtgekomen is, zoals hij dat zelf in
 * het aanmeldformulier heeft opgegeven: Eclectik, Zoom/Workvivo of Other.
 *
 * Let op het perspectief. Dit is de route die de deelnemer noemt, geen registratie
 * van wie de uitnodiging verstuurd heeft. Iemand kan via Zoom binnenkomen op een
 * mail die van ons kwam, en andersom. Het veld heet in de payload invitedBy, en
 * juist die naam nodigt uit tot de verkeerde lezing.
 */
export function gekomenVia(payload) {
  const v = String(payload?.invitedBy ?? '').trim();
  return v || null;
}

/**
 * Het telefoonnummer uit de aanmelding, zoals de deelnemer het zelf invulde.
 *
 * Bewust niet genormaliseerd naar een vast formaat. De invoer loopt van
 * +31611447609 tot 0651502701 tot +905522477488, en een eigen poging tot
 * opschonen zou van een buitenlands nummer iets onbelbaars kunnen maken. Wat de
 * deelnemer opgaf is wat je moet bellen.
 */
export function telefoonVan(payload) {
  const v = String(payload?.phone ?? '').trim();
  return v || null;
}

/** Hetzelfde nummer als href voor een tel-link: alleen cijfers en een plus. */
export function telHref(nummer) {
  const schoon = String(nummer || '').replace(/[^\d+]/g, '');
  return schoon ? `tel:${schoon}` : null;
}
