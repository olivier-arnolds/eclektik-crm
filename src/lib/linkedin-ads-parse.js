// Leest een advertentieprestatie-export uit LinkedIn Campaign Manager.
// Ontwerp: docs/superpowers/specs/2026-09-23-linkedin-ads-tab-design.md
//
// Puur: tekst in, rijen uit. Geen React, geen Supabase, geen bestandslezer, zodat
// vitest het formaat kan vastleggen zonder browser. Dit is het stuk waar een
// fout stil is: een verkeerd gelezen komma maakt van "9,36" euro het getal 936,
// en dat zie je pas als een bedrag in het dashboard niet klopt.
//
// WAT HET BESTAND IS (uit twee echte exports van 23 september 2026)
//   UTF-16 met BOM, TAB-gescheiden, vier regels aanhef plus een lege regel, dus
//   de kolomkoppen staan op regel 6. 81 kolommen met Nederlandse labels. Getallen
//   met komma en aanhalingstekens ("9,36"), percentages als tekst ("0,341%"), en
//   uitgerekend "Gemiddelde kijktijd" met een punt (6.2527773973).
//
//   De bestandsnaam zegt niets: campaign_891312023_... en creative_1547643083_...
//   zijn allebei dezelfde soort export. De ID's staan in de rijen zelf.

// Kolomkoppen zoals LinkedIn ze in het Nederlands schrijft. Links de kop, rechts
// het veld in onze tabel. Wat hier niet in staat gaat mee in `raw`, dus een
// kolom vergeten kost geen data.
const VELDEN = {
  'Begindatum (in UTC)': ['stat_date', datum],
  'Accountnaam': ['account_name', tekst],
  'Valuta': ['currency', tekst],
  'Campagne-ID': ['campaign_id', tekst],
  'Campagnenaam': ['campaign_name', tekst],
  'Status campagne': ['campaign_status', tekst],
  'Advertentieset-ID': ['adset_id', tekst],
  'Naam van advertentieset': ['adset_name', tekst],
  'Doelstelling van advertentieset': ['adset_objective', tekst],
  'Advertentienaam': ['ad_name', tekst],
  'Advertentie-ID': ['ad_id', tekst],
  'Advertentiestatus': ['ad_status', tekst],
  'Inleidende advertentietekst': ['ad_intro', tekst],
  'Kop van advertentie': ['ad_headline', tekst],
  'URL': ['url', tekst],
  'Totaal besteed': ['spend', getal],
  'Weergaven': ['impressions', getal],
  'Klikken': ['clicks', getal],
  'Doorklikfrequentie (CTR)': ['ctr', procent],
  'Gemiddelde CPM': ['cpm', getal],
  'Gemiddelde CPC': ['cpc', getal],
  'Aantal interacties': ['engagements', getal],
  'Conversies': ['conversions', getal],
  'Leads': ['leads', getal],
  'Klikken naar bestemmingspagina': ['landing_clicks', getal],
};

/** Foutsoort die de UI uit elkaar moet houden. Zie `leesExport`. */
export const LEEG = 'leeg';
export const ONLEESBAAR = 'onleesbaar';

export function tekst(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

// "9,36" -> 9.36, "6.2527773973" -> 6.2527773973, "1.234,50" -> 1234.5
//
// Beide decimaaltekens komen in hetzelfde bestand voor, dus raden op basis van
// het bestand kan niet; het moet per waarde. De regel: staat er een komma, dan
// is dat het decimaalteken en zijn punten duizendtallen. Staat er geen komma,
// dan is een punt het decimaalteken, behalve als het patroon onmiskenbaar een
// duizendscheiding is (1.234). Anders zou "6.2527773973" 62 miljard worden.
export function getal(v) {
  let s = String(v ?? '').replace(/["\s]/g, '').replace(/[€$]/g, '');
  if (s === '' || s === '-') return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// "0,341%" -> 0.341. We bewaren het getal zoals LinkedIn het toont, niet als
// fractie: 0.341 betekent 0,341 procent. Anders moet elk scherm delen door 100
// en gaat dat ergens een keer mis.
export function procent(v) {
  return getal(String(v ?? '').replace('%', ''));
}

// "23-9-2026" -> "2026-09-23". Dag-maand-jaar, want de export is Nederlands.
export function datum(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

/**
 * Zet de tekst van een export om in rijen.
 *
 * @returns {{ rijen: Array, periode: {van: string, tot: string}|null,
 *             fout: string|null, melding: string|null }}
 *   fout is null bij succes, LEEG als het rapport geldig maar zonder activiteit
 *   is, en ONLEESBAAR als we het bestand niet herkennen. Dat onderscheid is de
 *   reden dat dit geen exception gooit: "hier staat niets in voor deze periode"
 *   is een normale uitkomst en geen fout om op te zoeken.
 */
export function leesExport(inhoud, bestandsnaam = '') {
  const regels = String(inhoud ?? '').split(/\r?\n/);
  const periode = leesPeriode(regels);

  const kopIndex = regels.findIndex((r) => r.split('\t').length > 5
    && r.includes('Campagne') && r.includes('Advertentie'));

  if (kopIndex === -1) {
    // Alleen de aanhef en verder niets: een geldig rapport over een periode
    // waarin niets is uitgeleverd. De export meldt activiteit, niet instellingen,
    // dus een gepauzeerde of nog niet gestarte campagne geeft precies dit.
    const heeftAanhef = regels.some((r) => r.startsWith('Rapport met advertentieprestaties'));
    return heeftAanhef
      ? { rijen: [], periode, fout: LEEG, melding: meldingLeeg(periode, bestandsnaam) }
      : {
        rijen: [], periode: null, fout: ONLEESBAAR,
        melding: `${bestandsnaam || 'Dit bestand'} lijkt geen LinkedIn-export. `
          + 'Verwacht een advertentieprestatie-rapport uit Campaign Manager.',
      };
  }

  const koppen = regels[kopIndex].split('\t').map((k) => k.trim());
  const rijen = [];
  for (const regel of regels.slice(kopIndex + 1)) {
    if (!regel.trim()) continue;
    const cellen = regel.split('\t');
    const rij = { raw: {} };
    koppen.forEach((kop, i) => {
      const ruw = String(cellen[i] ?? '').trim().replace(/^"|"$/g, '');
      const veld = VELDEN[kop];
      if (veld) rij[veld[0]] = veld[1](ruw);
      else if (kop && ruw !== '') rij.raw[kop] = ruw;
    });
    // Zonder datum en advertentie-ID is er geen sleutel, dus zo'n regel kunnen
    // we niet wegschrijven zonder het risico op dubbeltellen.
    if (rij.stat_date && rij.ad_id) rijen.push(rij);
  }

  if (!rijen.length) {
    return { rijen: [], periode, fout: LEEG, melding: meldingLeeg(periode, bestandsnaam) };
  }
  return { rijen, periode, fout: null, melding: null };
}

function meldingLeeg(periode, bestandsnaam) {
  const wanneer = periode ? ` voor ${periode.van} tot en met ${periode.tot}` : '';
  return `${bestandsnaam || 'Dit rapport'} bevat geen regels${wanneer}. `
    + 'Dat betekent dat er in die periode niets is uitgeleverd, niet dat het bestand stuk is. '
    + 'Kies in Campaign Manager een ruimere periode.';
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
  'augustus', 'september', 'oktober', 'november', 'december'];

// "Begindatum van rapport: 23 september 2026 00:00" -> 2026-09-23
function leesPeriode(regels) {
  const pak = (prefix) => {
    const r = regels.find((x) => x.startsWith(prefix));
    if (!r) return null;
    const m = r.match(/(\d{1,2})\s+([a-zé]+)\s+(\d{4})/i);
    if (!m) return null;
    const maand = MAANDEN.indexOf(m[2].toLowerCase());
    if (maand === -1) return null;
    return `${m[3]}-${String(maand + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  };
  const van = pak('Begindatum van rapport');
  const tot = pak('Einddatum van rapport');
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
  const tekstInhoud = new TextDecoder(codering).decode(buf);
  return leesExport(tekstInhoud, file.name);
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
