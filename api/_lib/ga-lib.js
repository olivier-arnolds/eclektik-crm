// Pure helpers voor de Google Analytics-koppeling (api/analytics.js).
// Apart bestand zodat vitest de datumrekenkunde en het omvormen van de
// GA-antwoorden kan toetsen zonder een echte Google-verbinding.

/**
 * De privesleutel uit een serviceaccount-JSON leesbaar maken voor Node.
 *
 * Hier gaat het in de praktijk vaker mis dan in de rest van de koppeling samen,
 * en de foutmelding van OpenSSL ("DECODER routines::unsupported") wijst nergens
 * naar. Vandaar dat dit alle vormen aanpakt waarin de sleutel binnenkomt:
 *
 *   1. het hele JSON-bestand in plaats van alleen de sleutel
 *   2. \n-tekens in plaats van echte regeleinden (zo staat het in de JSON)
 *   3. aanhalingstekens eromheen, meegekopieerd uit de JSON
 *   4. alles op een regel met spaties, wat sommige invoervelden ervan maken
 */
export function normalizePrivateKey(raw) {
  let k = String(raw || '').trim();
  if (!k) return '';

  // 1. Per ongeluk het hele JSON-bestand geplakt: haal de sleutel eruit.
  if (k.startsWith('{')) {
    try {
      const obj = JSON.parse(k);
      if (obj && typeof obj.private_key === 'string') k = obj.private_key;
    } catch { /* geen geldige JSON: verderop faalt het met een duidelijke melding */ }
  }

  // 2 en 3.
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  k = k.replace(/\\n/g, '\n').trim();

  // 4. Geen enkel regeleinde maar wel de markeringen: de regeleinden zijn spaties
  // geworden. De base64-inhoud bevat zelf nooit spaties, dus dit is veilig terug
  // te draaien.
  if (!k.includes('\n') && /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(k)) {
    k = k
      .replace(/-----BEGIN ([A-Z ]*)PRIVATE KEY-----/, (_m, x) => `-----BEGIN ${x}PRIVATE KEY-----\n`)
      .replace(/-----END ([A-Z ]*)PRIVATE KEY-----/, (_m, x) => `\n-----END ${x}PRIVATE KEY-----`)
      .replace(/ +/g, '\n')
      .replace(/\n(BEGIN|END|PRIVATE|KEY)/g, ' $1')
      .replace(/\n+/g, '\n');
  }

  return k.trim();
}

/**
 * Beschrijft wat er mis is met een sleutel, ZONDER de sleutel zelf te tonen.
 * Alleen vorm en lengte, want dat is genoeg om de oorzaak aan te wijzen en het
 * verraadt niets. Geeft null als de sleutel er goed uitziet.
 */
export function describeKeyProblem(key) {
  const k = String(key || '');
  if (!k) return 'de variabele is leeg';
  if (k.startsWith('{')) return 'dit lijkt het hele JSON-bestand; zet alleen de waarde van private_key erin';
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(k)) return 'de regel -----BEGIN PRIVATE KEY----- ontbreekt';
  if (!/-----END [A-Z ]*PRIVATE KEY-----/.test(k)) return 'de regel -----END PRIVATE KEY----- ontbreekt';
  const regels = k.split('\n').length;
  if (regels < 3) return `alles staat op ${regels} regel(s); er horen regeleinden in te zitten`;
  if (k.length < 800) return `de sleutel is maar ${k.length} tekens, dat is te kort voor een volledige sleutel`;
  return null;
}

/**
 * Twee even lange perioden: de gevraagde en de periode ervoor, zodat elk getal
 * een vergelijking kan tonen. GA4 werkt met datums in YYYY-MM-DD, en 'vandaag'
 * telt mee omdat je anders bij een dagrapport altijd naar gisteren kijkt.
 */
export function dateRanges(days = 28, now = new Date()) {
  // Eerst bepalen of er uberhaupt een getal is, dan pas begrenzen. Met
  // `Number(days) || 28` zou 0 als 'niet ingevuld' tellen en stilletjes 28 dagen
  // opleveren, terwijl de gebruiker om iets anders vroeg.
  const gevraagd = Number(days);
  const n = Number.isFinite(gevraagd) ? Math.max(1, Math.min(365, gevraagd)) : 28;
  const dag = 86400000;
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  const eind = new Date(now.getTime());
  const start = new Date(eind.getTime() - (n - 1) * dag);
  const vorigEind = new Date(start.getTime() - dag);
  const vorigStart = new Date(vorigEind.getTime() - (n - 1) * dag);
  return {
    days: n,
    current: { startDate: iso(start), endDate: iso(eind) },
    previous: { startDate: iso(vorigStart), endDate: iso(vorigEind) },
  };
}

/**
 * Procentuele verandering. Geeft null als er geen vergelijking te maken valt:
 * van 0 naar 5 is niet "oneindig procent meer", en dat als getal tonen is
 * misleidender dan het weglaten.
 */
export function pctChange(nu, eerder) {
  const a = Number(nu) || 0;
  const b = Number(eerder) || 0;
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

/**
 * Een GA4-rapport omzetten naar gewone rijen. GA levert dimensies en metrics als
 * losse arrays per rij; daar wil de rest van de code niets van weten.
 *
 * @param {object} report  het antwoord van runReport
 * @param {string[]} dimensieNamen  hoe de dimensies mogen heten in het resultaat
 * @param {string[]} metricNamen    idem voor de metrics
 */
export function reportToRows(report, dimensieNamen = [], metricNamen = []) {
  const rijen = report?.rows || [];
  return rijen.map((r) => {
    const out = {};
    dimensieNamen.forEach((naam, i) => { out[naam] = r.dimensionValues?.[i]?.value ?? null; });
    metricNamen.forEach((naam, i) => {
      const ruw = r.metricValues?.[i]?.value;
      const getal = Number(ruw);
      out[naam] = Number.isFinite(getal) ? getal : 0;
    });
    return out;
  });
}

/** Het totaal van een metric over alle rijen van een rapport. */
export function totalOf(report, metricIndex = 0) {
  const totalen = report?.totals?.[0]?.metricValues?.[metricIndex]?.value;
  if (totalen !== undefined) {
    const n = Number(totalen);
    if (Number.isFinite(n)) return n;
  }
  return (report?.rows || []).reduce((som, r) => {
    const n = Number(r.metricValues?.[metricIndex]?.value);
    return som + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * GA4 geeft datums als 'YYYYMMDD'. Voor een grafiek wil je ze oplopend en in een
 * vorm waar Date mee overweg kan.
 */
export function normalizeDateSeries(rows, veld = 'date') {
  return rows
    .map((r) => {
      const d = String(r[veld] || '');
      const iso = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
      return { ...r, [veld]: iso };
    })
    .sort((a, b) => String(a[veld]).localeCompare(String(b[veld])));
}

// De scorecard op de website vuurt vijf gebeurtenissen af. Vier daarvan vormen
// een trechter; sc_q_answered hoort er bewust NIET bij, want die gaat per vraag
// af en zou het beeld vertekenen (een bezoeker die tien vragen beantwoordt telt
// dan als tien). Die tonen we apart als losse teller.
export const SCORECARD_STAPPEN = [
  { key: 'sc_start', label: 'Gestart' },
  { key: 'sc_completed', label: 'Afgerond' },
  { key: 'sc_email_submitted', label: 'Adres achtergelaten' },
  { key: 'sc_cta_clicked', label: 'Doorgeklikt' },
];
export const SCORECARD_EVENTS = [...SCORECARD_STAPPEN.map(s => s.key), 'sc_q_answered'];

/**
 * Bouwt een trechter uit tellingen per gebeurtenis.
 *
 * Rekent in BEZOEKERS en niet in gebeurtenissen. Iemand die de scorecard twee
 * keer start is een bezoeker en twee gebeurtenissen; in een trechter wil je het
 * eerste weten, anders lijkt de uitval kleiner dan hij is.
 *
 * @param {Array} rows   [{ event, users, count }]
 * @param {Array} stappen  [{ key, label }] in volgorde
 * @returns {Array} per stap het aantal, het aandeel van stap 1, en de uitval
 *                  ten opzichte van de vorige stap
 */
export function buildFunnel(rows, stappen = SCORECARD_STAPPEN) {
  const perEvent = Object.fromEntries((rows || []).map(r => [r.event, r]));
  const eerste = Number(perEvent[stappen[0]?.key]?.users) || 0;

  let vorige = null;
  return stappen.map(({ key, label }) => {
    const users = Number(perEvent[key]?.users) || 0;
    const count = Number(perEvent[key]?.count) || 0;
    const pctVanStart = eerste > 0 ? Math.round((users / eerste) * 100) : null;
    // Uitval alleen tonen als de vorige stap er was; anders suggereer je een
    // daling van 100% terwijl er simpelweg niets te vergelijken valt.
    const uitval = vorige === null || vorige === 0 ? null : Math.round(((vorige - users) / vorige) * 100);
    vorige = users;
    return { key, label, users, count, pctVanStart, uitval };
  });
}

/**
 * Seconden naar iets leesbaars: '1m 23s', '45s', '2u 05m'.
 *
 * GA4 levert duur als kommagetal in seconden. Dat rauw tonen ('83.4') vraagt van
 * de lezer een rekensom die de app net zo goed kan doen.
 */
export function formatDuration(seconden) {
  const s = Math.max(0, Math.round(Number(seconden) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m}m ${String(rest).padStart(2, '0')}s`;
  const u = Math.floor(m / 60);
  return `${u}u ${String(m % 60).padStart(2, '0')}m`;
}
