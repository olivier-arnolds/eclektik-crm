import { describe, it, expect } from 'vitest';
import {
  leesExport, getal, procent, datum, totalen, perAdvertentie, perDag, herkenTaal,
  LEEG, ONLEESBAAR, AGGREGAAT,
} from './linkedin-ads-parse';

// De koppenregel en twee datarijen, overgenomen uit de echte export van
// 23 september 2026 (campagne MSFT-Sellers). Ingekort tot de kolommen die we
// uitpakken plus een kolom die we bewust niet kennen, zodat de raw-vangst
// meegetest wordt.
const KOPPEN = [
  'Begindatum (in UTC)', 'Accountnaam', 'Valuta', 'Campagne-ID', 'Campagnenaam',
  'Status campagne', 'Advertentieset-ID', 'Naam van advertentieset',
  'Doelstelling van advertentieset', 'Advertentienaam', 'Advertentie-ID',
  'Advertentiestatus', 'Inleidende advertentietekst', 'Kop van advertentie', 'URL',
  'Totaal besteed', 'Weergaven', 'Klikken', 'Doorklikfrequentie (CTR)',
  'Gemiddelde CPM', 'Gemiddelde CPC', 'Aantal interacties', 'Conversies', 'Leads',
  'Klikken naar bestemmingspagina', 'Gemiddelde kijktijd (in seconden)',
].join('\t');

const RIJ1 = [
  '23-9-2026', 'Eclectik B.V.', 'EUR', '1224430733', 'MSFT-Sellers', 'Actief',
  '891312023', '"Websitebezoeken - Sep 21, 2026"', 'Websitebezoeken',
  'Advertentie_1_21Sep2026', '1552896563', 'Actief',
  '"We measure how deeply AI sits in the work."',
  '"Measured on your client\'s own data"', 'https://www.eclectik.co/microsoft?src=li-immersion',
  '"9,36"', '293', '1', '"0,341%"', '"31,96"', '"9,36"', '1', '0', '0', '1',
  '6.2527773973',
].join('\t');

const RIJ2 = [
  '23-9-2026', 'Eclectik B.V.', 'EUR', '1224430733', 'MSFT-Sellers', 'Actief',
  '891312023', '"Websitebezoeken - Sep 21, 2026"', 'Websitebezoeken',
  'Advertentie_2_21Sep2026', '1553046103', 'Actief',
  'Every Copilot account hits the same wall.', 'Independent proof',
  'https://www.eclectik.co/microsoft?src=li-cfo',
  '"1,11"', '47', '0', '0%', '"23,64"', '"0,00"', '0', '0', '0', '0',
  '13.3054893617',
].join('\t');

const AANHEF = [
  'Rapport met advertentieprestaties (in UTC)',
  'Begindatum van rapport: 23 september 2026 00:00',
  'Einddatum van rapport: 23 september 2026 23:59',
  'Datum aangemaakt: 23 september 2026 07:06',
  '',
].join('\n');

const VOLLEDIG = `${AANHEF}\n${KOPPEN}\n${RIJ1}\n${RIJ2}\n`;

describe('getallen uit een Nederlandse export', () => {
  it('leest een komma als decimaalteken', () => {
    expect(getal('"9,36"', 'nl')).toBe(9.36);
    expect(getal('0,00', 'nl')).toBe(0);
  });

  it('leest een punt als decimaalteken in een Engelse export', () => {
    expect(getal('6.2527773973', 'en')).toBeCloseTo(6.2527773973);
  });

  it('herkent een punt als duizendscheiding', () => {
    expect(getal('1.234', 'nl')).toBe(1234);
    expect(getal('"1.234,50"', 'nl')).toBe(1234.5);
  });

  it('geeft null bij leeg, zodat het geen stille nul wordt', () => {
    expect(getal('')).toBeNull();
    expect(getal('-')).toBeNull();
  });

  it('bewaart een percentage zoals het getoond wordt', () => {
    expect(procent('"0,341%"', 'nl')).toBe(0.341);
    expect(procent('0%')).toBe(0);
  });

  it('zet dag-maand-jaar om naar ISO', () => {
    expect(datum('23-9-2026', 'nl')).toBe('2026-09-23');
    expect(datum('1-12-2026', 'nl')).toBe('2026-12-01');
    expect(datum('onzin', 'nl')).toBeNull();
  });
});

describe('leesExport', () => {
  it('leest de twee advertentieregels', () => {
    const { rijen, fout } = leesExport(VOLLEDIG, 'export.csv');
    expect(fout).toBeNull();
    expect(rijen).toHaveLength(2);
    expect(rijen[0]).toMatchObject({
      stat_date: '2026-09-23',
      campaign_name: 'MSFT-Sellers',
      ad_id: '1552896563',
      spend: 9.36,
      impressions: 293,
      clicks: 1,
      ctr: 0.341,
    });
  });

  it('leest de rapportperiode uit de aanhef', () => {
    const { periode } = leesExport(VOLLEDIG);
    expect(periode).toEqual({ van: '2026-09-23', tot: '2026-09-23' });
  });

  it('bewaart onbekende kolommen in raw in plaats van ze weg te gooien', () => {
    const { rijen } = leesExport(VOLLEDIG);
    expect(rijen[0].raw['Gemiddelde kijktijd (in seconden)']).toBe('6.2527773973');
  });

  it('noemt een rapport zonder regels leeg, niet kapot', () => {
    // Dit is de echte tweede export: alleen de aanhef, geen koppenregel. Het
    // verschil met een onleesbaar bestand is wat de gebruiker gaat doen, dus het
    // mag nooit dezelfde melding geven.
    const { rijen, fout, melding } = leesExport(`${AANHEF}\n`, 'creative_1547643083.csv');
    expect(fout).toBe(LEEG);
    expect(rijen).toHaveLength(0);
    expect(melding).toMatch(/niet dat het bestand stuk is/);
  });

  it('noemt een vreemd bestand onleesbaar', () => {
    const { fout } = leesExport('naam,bedrag\nfoo,1\n', 'iets-anders.csv');
    expect(fout).toBe(ONLEESBAAR);
  });

  it('slaat regels zonder sleutel over', () => {
    const kapot = `${AANHEF}\n${KOPPEN}\n${RIJ1}\n\t\t\t\n`;
    expect(leesExport(kapot).rijen).toHaveLength(1);
  });
});

describe('optellen', () => {
  const { rijen } = leesExport(VOLLEDIG);

  it('rekent CTR en CPC over het totaal, niet als gemiddelde van de dagen', () => {
    // Het gemiddelde van 0,341% en 0% is 0,17%. Over het totaal is het
    // 1 klik op 340 vertoningen, dus 0,294%. Het tweede getal klopt.
    const t = totalen(rijen);
    expect(t.impressions).toBe(340);
    expect(t.ctr).toBeCloseTo(0.294, 3);
    expect(t.cpc).toBeCloseTo(10.47, 2);
  });

  it('telt de besteding bij elkaar op', () => {
    expect(totalen(rijen).spend).toBeCloseTo(10.47, 2);
  });

  it('geeft geen deling door nul bij een lege lijst', () => {
    expect(totalen([])).toMatchObject({ spend: 0, ctr: 0, cpc: 0, cpm: 0 });
  });

  it('groepeert per advertentie, duurste eerst', () => {
    const ads = perAdvertentie(rijen);
    expect(ads).toHaveLength(2);
    expect(ads[0].ad_id).toBe('1552896563');
    expect(ads[0].ad_headline).toMatch(/Measured on your client/);
  });

  it('groepeert per dag op datum', () => {
    const dagen = perDag(rijen);
    expect(dagen).toHaveLength(1);
    expect(dagen[0]).toMatchObject({ datum: '2026-09-23', clicks: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Manager wisselt zelf van taal: Olivier krijgt de ene keer een
// Nederlandse en de andere keer een Engelse export, zonder dat hij iets
// verandert. De taal moet dus per bestand worden afgelezen, niet ergens
// ingesteld. Onderstaande rijen komen uit de echte Engelse export van
// 23 september 2026.

const KOPPEN_EN = [
  'Start Date (in UTC)', 'Account Name', 'Currency', 'Campaign ID', 'Campaign Name',
  'Campaign Status', 'Ad Set ID', 'Ad Set Name', 'Ad Set Objective', 'Ad Name', 'Ad ID',
  'Ad Status', 'Ad Introduction Text', 'Ad Headline', 'Click URL', 'Total Spent',
  'Impressions', 'Clicks', 'Click Through Rate', 'Average CPM', 'Average CPC',
  'Total Engagements', 'Conversions', 'Leads', 'Clicks to Landing Page', 'Reach',
].join('\t');

const EN_RIJ = (datum_, ad, id, besteed, vert, kliks, ctr) => [
  datum_, 'Eclectik B.V.', 'EUR', '1224430733', 'MSFT-Sellers', 'Active',
  '891312023', '"Websitebezoeken - Sep 21, 2026"', 'Website visits', ad, id,
  'Active', 'We measure how deeply AI sits in the work.',
  '"Measured on your client\'s own data"', 'https://www.eclectik.co/microsoft?src=li-immersion',
  besteed, vert, kliks, ctr, '16.19', '5.04', '23', '0', '0', kliks, '2800',
].join('\t');

const AANHEF_EN = (van, tot) => [
  'Ad Performance Report (in UTC)',
  `"Report Start: ${van}, 12:00 AM"`,
  `"Report End: ${tot}, 11:59 PM"`,
  '"Date Generated: September 23, 2026, 12:40 PM"',
  '',
].join('\n');

describe('Engelse export', () => {
  const EEN_DAG = `${AANHEF_EN('September 21, 2026', 'September 21, 2026')}\n${KOPPEN_EN}\n`
    + `${EN_RIJ('9/21/2026', 'Advertentie_1_21Sep2026', '1552896563', '55.39', '3422', '11', '0.321%')}\n`;

  it('herkent de taal aan de koppenregel', () => {
    expect(herkenTaal(KOPPEN_EN)).toBe('en');
    expect(herkenTaal(KOPPEN)).toBe('nl');
  });

  it('leest een Engelse export die eerder als onleesbaar werd geweigerd', () => {
    const { rijen, fout, taal } = leesExport(EEN_DAG, 'campaign_891312023 (3).csv');
    expect(fout).toBeNull();
    expect(taal).toBe('en');
    expect(rijen[0]).toMatchObject({
      stat_date: '2026-09-21',       // 9/21/2026 is maand-dag-jaar, niet 9 december
      campaign_name: 'MSFT-Sellers',
      spend: 55.39,                  // punt is hier het decimaalteken
      impressions: 3422,
      clicks: 11,
      ctr: 0.321,
    });
  });

  it('KRITIEK: leest duizendtallen per taal, niet op gevoel', () => {
    // Dezelfde tekens, een andere betekenis. Raden op basis van de waarde gaat
    // hier gegarandeerd mis, en levert een bedrag op dat plausibel oogt.
    expect(getal('1,234.50', 'en')).toBe(1234.5);
    expect(getal('1.234,50', 'nl')).toBe(1234.5);
    expect(getal('1,234', 'en')).toBe(1234);
    expect(getal('1.234', 'nl')).toBe(1234);
  });

  it('leest maand-dag-jaar en dag-maand-jaar uit elkaar', () => {
    expect(datum('9/21/2026', 'en')).toBe('2026-09-21');
    expect(datum('21-9-2026', 'nl')).toBe('2026-09-21');
    // Dezelfde cijfers, twee talen, twee datums. Zonder de taal erbij is dit niet
    // op te lossen: 5/9 is 5 september of 9 mei.
    expect(datum('5/9/2026', 'en')).toBe('2026-05-09');
    expect(datum('5-9-2026', 'nl')).toBe('2026-09-05');
  });

  it('leest een lege Engelse export als leeg, niet als onleesbaar', () => {
    const { fout } = leesExport(AANHEF_EN('September 23, 2026', 'September 23, 2026'), 'leeg.csv');
    expect(fout).toBe(LEEG);
  });
});

describe('optelling over meerdere dagen', () => {
  // De echte export van 23 september: periode 21 tot en met 23 september, maar
  // één regel per advertentie met 21 september erbij. Dat zijn geen dagcijfers.
  // Zo opgeslagen zou 55,39 euro op 21 september belanden, terwijl het dagbudget
  // 20 euro is; dat kan nooit één dag zijn.
  const OPGETELD = `${AANHEF_EN('September 21, 2026', 'September 23, 2026')}\n${KOPPEN_EN}\n`
    + `${EN_RIJ('9/21/2026', 'Advertentie_1_21Sep2026', '1552896563', '55.39', '3422', '11', '0.321%')}\n`
    + `${EN_RIJ('9/21/2026', 'Advertentie_2_21Sep2026', '1553046103', '5.28', '440', '3', '0.682%')}\n`;

  it('KRITIEK: weigert een optelling in plaats van hem op één dag te boeken', () => {
    const { fout, rijen, melding } = leesExport(OPGETELD, 'campaign_891312023 (3).csv');
    expect(fout).toBe(AGGREGAAT);
    expect(rijen).toHaveLength(0);
    expect(melding).toMatch(/uitsplitsing op dag/);
  });

  it('laat een echte uitsplitsing per dag gewoon door', () => {
    const PER_DAG = `${AANHEF_EN('September 21, 2026', 'September 23, 2026')}\n${KOPPEN_EN}\n`
      + `${EN_RIJ('9/21/2026', 'Advertentie_1_21Sep2026', '1552896563', '20.00', '1200', '4', '0.333%')}\n`
      + `${EN_RIJ('9/22/2026', 'Advertentie_1_21Sep2026', '1552896563', '26.03', '1930', '6', '0.311%')}\n`
      + `${EN_RIJ('9/23/2026', 'Advertentie_1_21Sep2026', '1552896563', '9.36', '292', '1', '0.342%')}\n`;
    const { fout, rijen } = leesExport(PER_DAG, 'per-dag.csv');
    expect(fout).toBeNull();
    expect(rijen).toHaveLength(3);
    expect(perDag(rijen)).toHaveLength(3);
    expect(totalen(rijen).spend).toBeCloseTo(55.39, 2);
  });

  it('een periode van één dag is nooit een optelling', () => {
    const { fout } = leesExport(
      `${AANHEF_EN('September 21, 2026', 'September 21, 2026')}\n${KOPPEN_EN}\n`
      + `${EN_RIJ('9/21/2026', 'A', '1', '55.39', '3422', '11', '0.321%')}\n`, 'x.csv');
    expect(fout).toBeNull();
  });
});
