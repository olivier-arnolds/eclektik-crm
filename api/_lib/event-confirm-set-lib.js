// Pure logica voor api/event-confirm-set.js: het antwoord met de hand zetten
// vanuit de tab, los van de bevestigingspagina op de website.
//
// WAAROM DIT BESTAAT NAAST api/event-confirm.js
//   Dat endpoint hangt achter het gedeelde webhookgeheim en wordt door de
//   website aangeroepen. Dit hangt achter een ingelogde gebruiker. Twee
//   verschillende manieren van toegang in een bestand door elkaar halen is
//   precies hoe een publieke route per ongeluk een beheerfunctie krijgt.
//
// WAAROM HET MOET BESTAAN
//   De mail met de knop komt slecht aan. Mensen mailen daarom rechtstreeks
//   terug, en dan moet iemand het antwoord kunnen vastleggen zonder dat de
//   deelnemer ooit op de pagina is geweest.

// 'confirmed' is de stand na 'yes': de deelnemer komt EN heeft de bevestiging
// met de details gekregen. Een eigen waarde en geen vlag ernaast, want in de
// lijst wil je in een oogopslag zien wie nog een bevestiging moet krijgen.
const ANSWERS = new Set(['yes', 'no', 'confirmed']);

// Bij welke standen biedt de tab aan om de bevestigingsmail te sturen. Niet bij
// 'no' (een bevestiging van een stoel klopt dan nooit) en niet bij het
// terugzetten naar niets.
export const MAIL_STANDEN = new Set(['yes', 'confirmed']);

/** Mag er bij deze stand een bevestigingsmail mee? */
export function magMailVersturen(answer) {
  return MAIL_STANDEN.has(String(answer || ''));
}

/**
 * @returns {{error}|{value:{email, answer, send_mail}}} answer is 'yes', 'no',
 *   'confirmed' of null. null betekent terug naar 'nog geen antwoord', een
 *   correctie dus.
 *
 * send_mail HOORT HIER THUIS en niet alleen in het endpoint. Deze functie geeft
 * een schoongemaakt object terug, en het endpoint werkt daarmee verder. Een veld
 * dat hier niet doorkomt bestaat voor de rest van de keten niet: dat was precies
 * waarom de bevestigingsmail nooit vertrok terwijl de gebruiker wel ja klikte.
 */
export function validateSet(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return { error: 'Invalid email' };

  // Alleen een echte true stuurt de mail. Alles anders, ook de tekst 'true' of
  // een 1, betekent niet versturen: bij iets dat echte post de deur uit doet
  // hoort de twijfel de kant van niet-versturen op te vallen.
  const send_mail = body.send_mail === true;

  // Leeg, null of 'none' betekent allemaal: zet het terug op geen antwoord.
  const raw = body.answer === null || body.answer === undefined ? '' : String(body.answer).trim().toLowerCase();
  if (raw === '' || raw === 'none') return { value: { email, answer: null, send_mail: false } };
  if (!ANSWERS.has(raw)) return { error: 'Invalid answer' };
  return { value: { email, answer: raw, send_mail } };
}

/**
 * De kolommen die een handmatige wijziging schrijft.
 *
 * answer_count telt alleen op bij een ECHT antwoord, niet bij het terugzetten
 * naar niets. Dat terugzetten is een correctie van ons, geen uitspraak van de
 * deelnemer, en zou de teller anders laten zien dat iemand van gedachten is
 * veranderd terwijl dat niet zo is.
 */
export function setPatch({ answer, door }, rij, now = new Date()) {
  const iso = now.toISOString();
  if (answer === null) {
    return {
      answer: null, answered_at: null,
      answer_source: null, answer_by: null,
      updated_at: iso,
    };
  }
  return {
    answer,
    answered_at: iso,
    answer_count: (Number(rij && rij.answer_count) || 0) + 1,
    answer_source: 'manual',
    answer_by: door || null,
    updated_at: iso,
  };
}
