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

const ANSWERS = new Set(['yes', 'no']);

/**
 * @returns {{error}|{value:{email, answer}}} answer is 'yes', 'no' of null.
 *   null betekent terug naar 'nog geen antwoord', een correctie dus.
 */
export function validateSet(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return { error: 'Invalid email' };

  // Leeg, null of 'none' betekent allemaal: zet het terug op geen antwoord.
  const raw = body.answer === null || body.answer === undefined ? '' : String(body.answer).trim().toLowerCase();
  if (raw === '' || raw === 'none') return { value: { email, answer: null } };
  if (!ANSWERS.has(raw)) return { error: 'Invalid answer' };
  return { value: { email, answer: raw } };
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
