import { describe, it, expect } from 'vitest';
import {
  leesExport, getal, procent, datum, totalen, perAdvertentie, perDag,
  LEEG, ONLEESBAAR,
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
    expect(getal('"9,36"')).toBe(9.36);
    expect(getal('0,00')).toBe(0);
  });

  it('leest een punt als decimaalteken waar LinkedIn dat gebruikt', () => {
    // Gemiddelde kijktijd komt met een punt in hetzelfde bestand. Zonder deze
    // regel wordt 6,25 seconde het getal 62527773973.
    expect(getal('6.2527773973')).toBeCloseTo(6.2527773973);
  });

  it('herkent een punt als duizendscheiding', () => {
    expect(getal('1.234')).toBe(1234);
    expect(getal('"1.234,50"')).toBe(1234.5);
  });

  it('geeft null bij leeg, zodat het geen stille nul wordt', () => {
    expect(getal('')).toBeNull();
    expect(getal('-')).toBeNull();
  });

  it('bewaart een percentage zoals het getoond wordt', () => {
    expect(procent('"0,341%"')).toBe(0.341);
    expect(procent('0%')).toBe(0);
  });

  it('zet dag-maand-jaar om naar ISO', () => {
    expect(datum('23-9-2026')).toBe('2026-09-23');
    expect(datum('1-12-2026')).toBe('2026-12-01');
    expect(datum('onzin')).toBeNull();
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
