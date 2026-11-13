// Omgaan met wat Microsoft Graph terugstuurt als het misgaat.
//
// AANLEIDING (13 november 2026)
//   De inboxscan viel om met de melding "Scan mislukt: UnknownError". Dat is
//   letterlijk wat Graph teruggeeft: foutcode UnknownError, bericht leeg. Er
//   stond geen HTTP-status bij, geen request-id, niets waarmee je verder kunt.
//
//   Het bleek een wereldwijde storing bij Microsoft te zijn. Dat kwam de
//   gebruiker te weten via een statuspagina, niet via onze melding, en daar
//   zit het echte gebrek: een foutmelding die niets zegt stuurt je zoeken in
//   je eigen code terwijl er niets aan de hand is.
//
// WAT DIT WEL EN NIET OPLOST
//   Niet de storing zelf; daar valt niets aan te doen. Wel dat je ziet waar je
//   aan toe bent: de HTTP-status, de request-id die Microsoft nodig heeft als
//   je het meldt, en bij een lege UnknownError een regel die zegt dat het aan
//   hun kant ligt. Plus een paar keer automatisch opnieuw proberen, want een
//   hapering van een paar seconden hoort de gebruiker niet te merken.
//
// Puur en zonder fetch, zodat dit zonder browser te toetsen is.

/** Statussen waarbij opnieuw proberen zin heeft. */
const TIJDELIJK = new Set([429, 500, 502, 503, 504]);

/**
 * Mag deze aanvraag nog een keer?
 *
 * 429 en 5xx zijn bij Graph vaak voorbijgaand: te druk, te traag, of een
 * interne hik. Een 400 of 404 wordt bij een tweede poging niet anders, en
 * blijven proberen maakt het alleen trager.
 */
export function magOpnieuw(status, poging, maxPogingen = 3) {
  return TIJDELIJK.has(Number(status)) && poging < maxPogingen;
}

/**
 * Hoe lang wachten voor de volgende poging, in milliseconden.
 *
 * Graph zegt het zelf in de header Retry-After als het om drukte gaat; die
 * respecteren we, want zelf sneller terugkomen dan gevraagd verlengt de
 * beperking alleen. Anders oplopend: 1, 2, 4 seconden.
 */
export function wachttijd(poging, retryAfter = null) {
  const sec = Number(retryAfter);
  if (Number.isFinite(sec) && sec > 0) return Math.min(sec, 30) * 1000;
  return Math.min(2 ** Math.max(0, poging - 1), 8) * 1000;
}

/**
 * De foutmelding die een mens verder helpt.
 *
 * @returns {{toegangGeweigerd: boolean, tekst: string}}
 *
 * De HTTP-status staat er ALTIJD in, ook als Graph een code meestuurt. Juist
 * bij UnknownError is die status het enige onderscheid tussen "te druk" (429),
 * "te zwaar gevraagd" (500) en "iets anders". De request-id gaat mee omdat
 * Microsoft daarom vraagt zodra je een storing meldt; zonder die id kunnen ze
 * niets terugvinden.
 */
export function graphFout(status, data, requestId = null) {
  const code = data?.error?.code || '';
  const msg = data?.error?.message || '';
  const toegangGeweigerd = Number(status) === 403
    || /ErrorAccessDenied|AccessDenied/i.test(code);

  const delen = [];
  delen.push(code ? `${code} (HTTP ${status})` : `HTTP ${status}`);
  if (msg) delen.push(msg);
  if (requestId) delen.push(`request-id ${requestId}`);

  // Een lege UnknownError zegt niets, dus zeggen we erbij wat het betekent.
  // Op 13 november was dit een wereldwijde storing bij Microsoft, en de
  // gebruiker ging in onze code zoeken omdat de melding hem niets vertelde.
  if (/UnknownError/i.test(code) && !msg) {
    delen.push('Microsoft geeft geen reden. Dit ligt vrijwel altijd aan hun '
      + 'kant, niet aan de CRM. Kijk op de Microsoft-statuspagina en probeer '
      + 'het daarna opnieuw.');
  }

  return { toegangGeweigerd, tekst: delen.join(' - ') };
}
