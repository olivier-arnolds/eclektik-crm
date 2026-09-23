// Leest een advertentieprestatie-export uit LinkedIn Campaign Manager.
// Ontwerp: docs/superpowers/specs/2026-09-23-linkedin-ads-tab-design.md
//
// Puur: tekst in, rijen uit. Geen React, geen Supabase, geen bestandslezer, zodat
// vitest het formaat kan vastleggen zonder browser. Dit is het stuk waar een
// fout stil is: een verkeerd gelezen scheidingsteken maakt van 55,39 euro het
// getal 5539, en dat zie je pas als een bedrag in het dashboard niet klopt.
//
// WAT HET BESTAND IS
//   UTF-16 met BOM, TAB-gescheiden, vier regels aanhef plus een lege regel, dus
//   de kolomkoppen staan op regel 6. Ruim tachtig kolommen.
//
//   De export komt in de taal van Campaign Manager, en die kan per keer
//   verschillen. Wij hebben zowel een Nederlandse ("Campagnenaam", "9,36",
//   "23-9-2026") als een Engelse ("Campaign Name", "55.39", "9/21/2026")
//   binnengekregen. De eerste versie van dit bestand ging uit van Nederlands en
//   weigerde de Engelse export als onleesbaar. Vandaar de tabel hieronder: de
//   taal bepaalt zowel de kolomnamen als hoe je een punt of komma moet lezen.
//
//   De bestandsnaam zegt niets: campaign_891312023_... en creative_1547643083_...
//   zijn allebei dezelfde soort export. De ID's staan in de rijen zelf.

/** Uitkomsten die de UI uit elkaar moet houden. Zie `leesExport`. */
export const LEEG = 'leeg';
export const ONLEESBAAR = 'onleesbaar';
export const AGGREGAAT = 'aggregaat';

// Per taal: de kolomnamen, en hoe getallen en datums geschreven worden.
//
// Nederlands: 1.234,50 en 23-9-2026 (dag-maand-jaar)
// Engels:     1,234.50 en 9/21/2026 (maand-dag-jaar)
//
// Die twee zijn niet uit een losse waarde af te leiden: "1.234" is 1234 in het
// Nederlands en 1,234 in het Engels. Alleen de taal van het bestand geeft
// uitsluitsel, dus die stellen we één keer vast en gebruiken we overal.
const TALEN = {
  nl: {
    herken: 'Campagnenaam',
    decimaal: ',',
    datum: 'dmj',
    rapportStart: 'Begindatum van rapport',
    rapportEind: 'Einddatum van rapport',
    maanden: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
      'augustus', 'september', 'oktober', 'november', 'december'],
    velden: {
      'Begindatum (in UTC)': 'stat_date',
      'Accountnaam': 'account_name',
      'Valuta': 'currency',
      'Campagne-ID': 'campaign_id',
      'Campagnenaam': 'campaign_name',
      'Status campagne': 'campaign_status',
      'Advertentieset-ID': 'adset_id',
      'Naam van advertentieset': 'adset_name',
      'Doelstelling van advertentieset': 'adset_objective',
      'Advertentienaam': 'ad_name',
      'Advertentie-ID': 'ad_id',
      'Advertentiestatus': 'ad_status',
      'Inleidende advertentietekst': 'ad_intro',
      'Kop van advertentie': 'ad_headline',
      'URL': 'url',
      'Totaal besteed': 'spend',
      'Weergaven': 'impressions',
      'Klikken': 'clicks',
      'Doorklikfrequentie (CTR)': 'ctr',
      'Gemiddelde CPM': 'cpm',
      'Gemiddelde CPC': 'cpc',
      'Aantal interacties': 'engagements',
      'Conversies': 'conversions',
      'Leads': 'leads',
      'Klikken naar bestemmingspagina': 'landing_clicks',
    },
  },
  en: {
    herken: 'Campaign Name',
    decimaal: '.',
    datum: 'mdj',
    rapportStart: 'Report Start',
    rapportEind: 'Report End',
    maanden: ['january', 'february', 'march', 'april', 'may', 'june', 'july',
      'august', 'september', 'october', 'november', 'december'],
    velden: {
      'Start Date (in UTC)': 'stat_date',
      'Account Name': 'account_name',
      'Currency': 'currency',
      'Campaign ID': 'campaign_id',
      'Campaign Name': 'campaign_name',
      'Campaign Status': 'campaign_status',
      'Ad Set ID': 'adset_id',
      'Ad Set Name': 'adset_name',
      'Ad Set Objective': 'adset_objective',
      'Ad Name': 'ad_name',
      'Ad ID': 'ad_id',
      'Ad Status': 'ad_status',
      'Ad Introduction Text': 'ad_intro',
      'Ad Headline': 'ad_headline',
      'Click URL': 'url',
      'Total Spent': 'spend',
      'Impressions': 'impressions',
      'Clicks': 'clicks',
      'Click Through Rate': 'ctr',
      'Average CPM': 'cpm',
      'Average CPC': 'cpc',
      'Total Engagements': 'engagements',
      'Conversions': 'conversions',
      'Leads': 'leads',
      'Clicks to Landing Page': 'landing_clicks',
    },
  },
};

// Welke velden een getal zijn, en welke een percentage of datum. Los van de
// naamtabel zodat een taal erbij alleen namen kost en geen regels.
const GETALLEN = new Set(['spend', 'impressions', 'clicks', 'cpm', 'cpc',
  'engagements', 'conversions', 'leads', 'landing_clicks']);
const PROCENTEN = new Set(['ctr']);

/**
 * Leest een getal in de schrijfwijze van de opgegeven taal.
 *
 * Het decimaalteken komt uit de taal van het bestand en wordt niet geraden: in
 * "1.234" is de punt in het Nederlands een duizendscheiding (1234) en in het
 * Engels het decimaalteken (1,234). Raden op basis van de waarde gaat daar
 * gegarandeerd een keer mis, en dan staat er een bedrag in het dashboard dat er
 * plausibel uitziet.
 */
export function getal(v, taal = 'nl') {
  const t = TALEN[taal] || TALEN.nl;
  let s = String(v ?? '').replace(/["\s]/g, '').replace(/[€$]/g, '');
  if (s === '' || s === '-') return null;
  const duizend = t.decimaal === ',' ? '.' : ',';
  s = s.split(duizend).join('');
  if (t.decimaal !== '.') s = s.replace(t.decimaal, '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "0,341%" of "0.321%" -> 0.341 / 0.321. Het getal zoals LinkedIn het toont. */
export function procent(v, taal = 'nl') {
  return getal(String(v ?? '').replace('%', ''), taal);
}

/** "23-9-2026" (nl) of "9/21/2026" (en) -> "2026-09-23" / "2026-09-21". */
export function datum(v, taal = 'nl') {
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const volgorde = (TALEN[taal] || TALEN.nl).datum;
  const dag = volgorde === 'dmj' ? m[1] : m[2];
  const maand = volgorde === 'dmj' ? m[2] : m[1];
  return `${m[3]}-${maand.padStart(2, '0')}-${dag.padStart(2, '0')}`;
}

export function tekst(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

/** Welke taal is dit bestand? Null als we het niet herkennen. */
export function herkenTaal(kopregel) {
  const r = String(kopregel ?? '');
  for (const [code, t] of Object.entries(TALEN)) if (r.includes(t.herken)) return code;
  return null;
}

/**
 * Zet de tekst van een export om in rijen.
 *
 * @returns {{ rijen, periode, taal, fout, melding }}
 *   fout is null bij succes, en anders LEEG (geldig rapport, geen activiteit),
 *   AGGREGAAT (opgeteld over meerdere dagen, zie hieronder) of ONLEESBAAR.
 */
export function leesExport(inhoud, bestandsnaam = '') {
  const regels = String(inhoud ?? '').split(/\r?\n/);

  const kopIndex = regels.findIndex((r) => r.split('\t').length > 5 && herkenTaal(r));
  if (kopIndex === -1) {
    // Alleen de aanhef en verder niets: een geldig rapport over een periode
    // waarin niets is uitgeleverd. De export meldt activiteit, niet instellingen,
    // dus een gepauzeerde of nog niet gestarte campagne geeft precies dit.
    const aanhef = regels.some((r) => /^(Rapport met advertentieprestaties|Ad Performance Report)/.test(r.trim()));
    if (aanhef) {
      const p = leesPeriode(regels, herkenPeriodeTaal(regels));
      return { rijen: [], periode: p, taal: null, fout: LEEG, melding: meldingLeeg(p, bestandsnaam) };
    }
    return {
      rijen: [], periode: null, taal: null, fout: ONLEESBAAR,
      melding: `${bestandsnaam || 'Dit bestand'} lijkt geen LinkedIn-export. `
        + 'Verwacht een advertentieprestatie-rapport uit Campaign Manager, in het '
        + 'Nederlands of Engels.',
    };
  }

  const taal = herkenTaal(regels[kopIndex]);
  const t = TALEN[taal];
  const periode = leesPeriode(regels, taal);
  const koppen = regels[kopIndex].split('\t').map((k) => k.trim());

  const rijen = [];
  for (const regel of regels.slice(kopIndex + 1)) {
    if (!regel.trim()) continue;
    const cellen = regel.split('\t');
    const rij = { raw: {} };
    koppen.forEach((kop, i) => {
      const ruw = String(cellen[i] ?? '').trim().replace(/^"|"$/g, '');
      const veld = t.velden[kop];
      if (!veld) { if (kop && ruw !== '') rij.raw[kop] = ruw; return; }
      if (veld === 'stat_date') rij[veld] = datum(ruw, taal);
      else if (GETALLEN.has(veld)) rij[veld] = getal(ruw, taal);
      else if (PROCENTEN.has(veld)) rij[veld] = procent(ruw, taal);
      else rij[veld] = tekst(ruw);
    });
    // Zonder datum en advertentie-ID is er geen sleutel, dus zo'n regel kunnen
    // we niet wegschrijven zonder het risico op dubbeltellen.
    if (rij.stat_date && rij.ad_id) rijen.push(rij);
  }

  if (!rijen.length) {
    return { rijen: [], periode, taal, fout: LEEG, melding: meldingLeeg(periode, bestandsnaam) };
  }

  if (isAggregaat(rijen, periode)) {
    return {
      rijen: [], periode, taal, fout: AGGREGAAT,
      melding: `${bestandsnaam || 'Dit rapport'} telt ${periode.van} tot en met ${periode.tot} bij `
        + 'elkaar op: er is één regel per advertentie, met de begindatum van de periode erbij. '
        + 'Zo opgeslagen zouden die bedragen op één dag terechtkomen, en dat klopt niet. '
        + 'Zet in Campaign Manager de uitsplitsing op dag en exporteer opnieuw.',
    };
  }

  return { rijen, periode, taal, fout: null, melding: null };
}

/**
 * Is dit een optelling over de hele periode in plaats van een uitsplitsing per dag?
 *
 * Het signaal: de periode beslaat meer dan één dag, elke advertentie komt precies
 * één keer voor, en alle regels dragen de begindatum van de periode. Bij een
 * uitsplitsing per dag staat een advertentie die drie dagen liep er drie keer in.
 *
 * Dit moet als fout terugkomen en niet stilzwijgend worden opgeslagen. De tabel
 * heeft (datum, advertentie) als sleutel, dus een optelling over drie dagen zou
 * op dag één belanden en daarna botsen met een echte dagregel voor die dag.
 * Zichtbaar bewijs uit de export van 23 september: 55,39 euro besteed bij een
 * dagbudget van 20 euro kan geen enkele dag zijn.
 */
export function isAggregaat(rijen, periode) {
  if (!periode || periode.van === periode.tot) return false;
  const datums = new Set(rijen.map((r) => r.stat_date));
  if (datums.size !== 1 || !datums.has(periode.van)) return false;
  const ads = new Set(rijen.map((r) => r.ad_id));
  return ads.size === rijen.length;
}

function meldingLeeg(periode, bestandsnaam) {
  const wanneer = periode ? ` voor ${periode.van} tot en met ${periode.tot}` : '';
  return `${bestandsnaam || 'Dit rapport'} bevat geen regels${wanneer}. `
    + 'Dat betekent dat er in die periode niets is uitgeleverd, niet dat het bestand stuk is. '
    + 'Kies in Campaign Manager een ruimere periode.';
}

// Bij een leeg rapport is er geen koppenregel om de taal aan af te lezen, dus
// pakken we hem van de aanhef.
function herkenPeriodeTaal(regels) {
  return regels.some((r) => r.trim().startsWith('Report Start')) ? 'en' : 'nl';
}

// nl: "Begindatum van rapport: 23 september 2026 00:00"
// en: "Report Start: September 21, 2026, 12:00 AM"
function leesPeriode(regels, taal) {
  const t = TALEN[taal] || TALEN.nl;
  const pak = (prefix) => {
    const r = regels.find((x) => x.trim().replace(/^"/, '').startsWith(prefix));
    if (!r) return null;
    const nl = r.match(/(\d{1,2})\s+([a-zé]+)\s+(\d{4})/i);
    const en = r.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
    const [dag, maandNaam, jaar] = nl ? [nl[1], nl[2], nl[3]]
      : en ? [en[2], en[1], en[3]] : [];
    if (!jaar) return null;
    const maand = t.maanden.indexOf(String(maandNaam).toLowerCase());
    if (maand === -1) return null;
    return `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
  };
  const van = pak(t.rapportStart);
  const tot = pak(t.rapportEind);
  return van && tot ? { van, tot } : null;
}

/**
 * Leest een File uit de browser. Apart van leesExport zodat de omzetting zelf
 * testbaar blijft zonder FileReader.
 *
 * UTF-16 wordt herkend aan de BOM. LinkedIn levert UTF-16LE, maar een bestand
 * dat onderweg door een ander programma is gegaan kan als UTF-8 terugkomen, en
 * dan levert blind als UTF-16 decoderen onleesbare tekens op.
 */
export async function leesBestand(file) {
  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf);
  let codering = 'utf-8';
  if (b[0] === 0xff && b[1] === 0xfe) codering = 'utf-16le';
  else if (b[0] === 0xfe && b[1] === 0xff) codering = 'utf-16be';
  return leesExport(new TextDecoder(codering).decode(buf), file.name);
}

/** Telt op tot de cijfers die bovenaan het scherm staan. */
export function totalen(rijen) {
  const som = (v) => rijen.reduce((t, r) => t + (r[v] || 0), 0);
  const spend = som('spend');
  const impressions = som('impressions');
  const clicks = som('clicks');
  return {
    spend,
    impressions,
    clicks,
    conversions: som('conversions'),
    leads: som('leads'),
    // CTR en CPC opnieuw uitrekenen over het totaal. Het gemiddelde van de
    // per-dag-percentages is niet hetzelfde getal, en wijkt hard af zodra een
    // dag weinig vertoningen had.
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
  };
}

/** Rolt de rijen op per advertentie, met de tekst erbij. */
export function perAdvertentie(rijen) {
  const op = new Map();
  for (const r of rijen) {
    const bestaand = op.get(r.ad_id) || {
      ad_id: r.ad_id, ad_name: r.ad_name, ad_headline: r.ad_headline,
      ad_intro: r.ad_intro, url: r.url, campaign_name: r.campaign_name,
      ad_status: r.ad_status, rijen: [],
    };
    bestaand.rijen.push(r);
    // De laatst bekende tekst wint: een advertentie kan hernoemd zijn.
    if (r.ad_headline) bestaand.ad_headline = r.ad_headline;
    op.set(r.ad_id, bestaand);
  }
  return [...op.values()]
    .map((a) => ({ ...a, ...totalen(a.rijen), dagen: a.rijen.length }))
    .sort((a, b) => b.spend - a.spend);
}

/** Rolt op per dag, voor de grafiek. */
export function perDag(rijen) {
  const op = new Map();
  for (const r of rijen) {
    if (!op.has(r.stat_date)) op.set(r.stat_date, []);
    op.get(r.stat_date).push(r);
  }
  return [...op.entries()]
    .map(([datum_, rs]) => ({ datum: datum_, ...totalen(rs) }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}
