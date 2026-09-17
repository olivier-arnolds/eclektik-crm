// Links in een campagne voorzien van UTM-tags, zodat Google Analytics kan zien
// welke uiting het bezoek bracht.
//
// WAAROM DIT NODIG IS
//   Zonder tags ziet GA verkeer uit een e-mail meestal als 'direct' of als
//   verwijzing van de mailprovider. Je ziet dan wel bezoek, maar niet dat het uit
//   jouw mailing kwam, en dan is het dashboard aardig in plaats van bruikbaar.
//
// WAT WEL EN NIET GETAGD WORDT
//   Alleen links naar onze eigen domeinen. Een link naar een nieuwsartikel of
//   naar LinkedIn taggen heeft geen zin (die site doet niets met onze tags) en
//   het staat rommelig in andermans statistieken.
//
//   Een link die al utm_source heeft laten we met rust: dan heeft iemand bewust
//   iets ingesteld en dat overschrijven is erger dan niets doen.
//
//   Afmeldlinks en mailto-links blijven ongemoeid, net als ankers (#ergens) en
//   de merge-tag van Resend.

export const EIGEN_DOMEINEN = ['eclectik.co', 'eclectik-insights.co'];

/**
 * Naam naar een waarde die leesbaar blijft in een rapport: kleine letters,
 * streepjes, geen accenten. GA toont de waarde letterlijk, dus 'Glint Uitnodiging
 * #3' wordt daar anders een rommeltje.
 */
export function slugify(naam) {
  return String(naam || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function isEigenDomein(host, domeinen) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  return domeinen.some(d => h === d || h.endsWith(`.${d}`));
}

/**
 * Tags toevoegen aan een enkele URL. Geeft de URL onveranderd terug als hij niet
 * in aanmerking komt.
 */
export function addUtmToUrl(url, { source, medium, campaign, domains = EIGEN_DOMEINEN } = {}) {
  const raw = String(url || '').trim();
  if (!raw) return url;
  // Geen http(s): mailto, tel, ankers, en de merge-tags van Resend ({{{...}}}).
  if (!/^https?:\/\//i.test(raw)) return url;

  let u;
  try { u = new URL(raw); } catch { return url; }
  if (!isEigenDomein(u.hostname, domains)) return url;
  // Al bewust getagd: afblijven.
  if (u.searchParams.has('utm_source')) return url;

  if (source) u.searchParams.set('utm_source', source);
  if (medium) u.searchParams.set('utm_medium', medium);
  if (campaign) u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

/**
 * Alle href's in een stuk HTML taggen.
 *
 * Bewust met een reguliere expressie op href="..." en niet met een HTML-parser:
 * de body kan merge-tags en onvolledige HTML bevatten, en een parser zou die
 * netjes 'repareren' en daarmee de mail veranderen. We raken alleen het stukje
 * tussen de aanhalingstekens aan.
 */
export function addUtmToHtml(html, opts = {}) {
  return String(html || '').replace(
    /(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gis,
    (heel, voor, quote, url) => `${voor}${quote}${addUtmToUrl(url, opts)}${quote}`,
  );
}

/** Kale URL's in platte tekst taggen (outreach-berichten hebben geen href's). */
export function addUtmToPlainText(text, opts = {}) {
  return String(text || '').replace(
    /(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g,
    (heel, voor, url) => `${voor}${addUtmToUrl(url, opts)}`,
  );
}
