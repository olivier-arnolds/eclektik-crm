// Pure helpers voor de Google Analytics-koppeling (api/analytics.js).
// Apart bestand zodat vitest de datumrekenkunde en het omvormen van de
// GA-antwoorden kan toetsen zonder een echte Google-verbinding.

/**
 * De privésleutel uit een serviceaccount-JSON bevat echte regeleinden. Plak je
 * hem in een omgevingsvariabele, dan worden die vaak \n-tekens, en soms staan er
 * ook nog aanhalingstekens omheen. Beide vormen moeten werken, anders krijg je
 * een onbegrijpelijke handtekeningfout terwijl de sleutel gewoon goed is.
 */
export function normalizePrivateKey(raw) {
  let k = String(raw || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, '\n').trim();
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
