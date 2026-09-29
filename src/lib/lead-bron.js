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

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/**
 * @param {string} event    het soort activiteit, bv. 'event_registered'
 * @param {object} payload  de payload van die activiteit
 * @returns {string|null}   leesbare bron, of null als er niets te zeggen valt
 */
export function bronLabel(event, payload) {
  if (!event) return null;
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
 * Wie de uitnodiging stuurde, uit de payload van de aanmelding.
 *
 * Het aanmeldformulier laat de bezoeker kiezen: Eclectik, Zoom/Workvivo of
 * Other. Dat is de vraag die ertoe doet bij het nakijken van de lijst; de
 * sector die hier eerder stond werd bij de eventaanmeldingen niet eens gevuld.
 */
export function uitnodiger(payload) {
  const v = String(payload?.invitedBy ?? '').trim();
  return v || null;
}
