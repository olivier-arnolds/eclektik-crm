import { describe, it, expect } from 'vitest';
import {
  normalizePrivateKey, describeKeyProblem, dateRanges, pctChange, reportToRows, totalOf,
  normalizeDateSeries, buildFunnel,
} from './ga-lib.js';

describe('normalizePrivateKey', () => {
  it('KRITIEK: accepteert zowel echte regeleinden als \\n uit een env-var', () => {
    const echt = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    expect(normalizePrivateKey(echt)).toBe(echt);
    expect(normalizePrivateKey('-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----')).toBe(echt);
  });

  it('haalt aanhalingstekens weg die bij het plakken meekomen', () => {
    expect(normalizePrivateKey('"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----"')).toBe(
      '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
  });

  it('gaat om met leeg', () => {
    expect(normalizePrivateKey(null)).toBe('');
  });
});

describe('dateRanges', () => {
  const NU = new Date('2026-09-17T12:00:00Z');

  it('de gevraagde periode eindigt vandaag en telt vandaag mee', () => {
    const r = dateRanges(7, NU);
    expect(r.current).toEqual({ startDate: '2026-09-11', endDate: '2026-09-17' });
  });

  it('de vorige periode is even lang en sluit er direct op aan', () => {
    const r = dateRanges(7, NU);
    expect(r.previous).toEqual({ startDate: '2026-09-04', endDate: '2026-09-10' });
  });

  it('begrenst rare invoer', () => {
    expect(dateRanges(0, NU).days).toBe(1);
    expect(dateRanges(9999, NU).days).toBe(365);
    expect(dateRanges('onzin', NU).days).toBe(28);
  });
});

describe('pctChange', () => {
  it('rekent de verandering uit', () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });

  it('KRITIEK: geeft null als er niets te vergelijken valt', () => {
    // Van 0 naar 5 is geen oneindig percentage; dat tonen is misleidender dan niets.
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });
});

describe('reportToRows', () => {
  const report = {
    rows: [
      { dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '42' }, { value: '3.5' }] },
      { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: 'kapot' }, { value: '1' }] },
    ],
  };

  it('maakt gewone rijen met namen', () => {
    expect(reportToRows(report, ['kanaal'], ['sessies', 'duur'])).toEqual([
      { kanaal: 'Organic Search', sessies: 42, duur: 3.5 },
      { kanaal: 'Direct', sessies: 0, duur: 1 },
    ]);
  });

  it('gaat om met een leeg rapport', () => {
    expect(reportToRows(null, ['x'], ['y'])).toEqual([]);
  });
});

describe('totalOf', () => {
  it('gebruikt het totaal van GA als dat er is', () => {
    expect(totalOf({ totals: [{ metricValues: [{ value: '99' }] }] })).toBe(99);
  });

  it('telt anders de rijen zelf op', () => {
    expect(totalOf({ rows: [{ metricValues: [{ value: '2' }] }, { metricValues: [{ value: '3' }] }] })).toBe(5);
  });

  it('is 0 bij niets', () => {
    expect(totalOf(null)).toBe(0);
  });
});

describe('normalizeDateSeries', () => {
  it('zet YYYYMMDD om en sorteert oplopend', () => {
    const r = normalizeDateSeries([{ date: '20260917', n: 1 }, { date: '20260915', n: 2 }]);
    expect(r.map(x => x.date)).toEqual(['2026-09-15', '2026-09-17']);
  });
});

describe('normalizePrivateKey, de manieren waarop het in de praktijk misgaat', () => {
  const echt = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\nkqhkiG9w0BAQEF\n-----END PRIVATE KEY-----';

  it('het hele JSON-bestand geplakt in plaats van alleen de sleutel', () => {
    const json = JSON.stringify({ type: 'service_account', private_key: echt, client_email: 'x@y.z' });
    expect(normalizePrivateKey(json)).toBe(echt);
  });

  it('alles op een regel met spaties in plaats van regeleinden', () => {
    const plat = '-----BEGIN PRIVATE KEY----- MIIEvQIBADANBg kqhkiG9w0BAQEF -----END PRIVATE KEY-----';
    expect(normalizePrivateKey(plat)).toBe(echt);
  });

  it('laat een al goede sleutel met rust', () => {
    expect(normalizePrivateKey(echt)).toBe(echt);
  });
});

describe('describeKeyProblem', () => {
  it('wijst de oorzaak aan zonder de sleutel te tonen', () => {
    expect(describeKeyProblem('')).toMatch(/leeg/);
    expect(describeKeyProblem('{"private_key":"x"}')).toMatch(/hele JSON-bestand/);
    expect(describeKeyProblem('zomaar wat tekst')).toMatch(/BEGIN/);
    expect(describeKeyProblem('-----BEGIN PRIVATE KEY-----\nabc')).toMatch(/END/);
    expect(describeKeyProblem('-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----')).toMatch(/regel/);
  });

  it('zwijgt over een sleutel die er goed uitziet', () => {
    const goed = '-----BEGIN PRIVATE KEY-----\n' + 'A'.repeat(1600) + '\n-----END PRIVATE KEY-----';
    expect(describeKeyProblem(goed)).toBeNull();
  });
});

describe('buildFunnel', () => {
  const rows = [
    { event: 'sc_start', users: 100, count: 120 },
    { event: 'sc_completed', users: 40, count: 42 },
    { event: 'sc_email_submitted', users: 12, count: 12 },
    { event: 'sc_cta_clicked', users: 5, count: 6 },
  ];

  it('rekent het aandeel van de eerste stap en de uitval per stap', () => {
    const f = buildFunnel(rows);
    expect(f.map(s => s.users)).toEqual([100, 40, 12, 5]);
    expect(f.map(s => s.pctVanStart)).toEqual([100, 40, 12, 5]);
    expect(f[1].uitval).toBe(60);
    expect(f[2].uitval).toBe(70);
  });

  it('KRITIEK: rekent in bezoekers, niet in gebeurtenissen', () => {
    // Wie twee keer start is een bezoeker en twee gebeurtenissen. Op
    // gebeurtenissen rekenen laat de uitval kleiner lijken dan hij is.
    const f = buildFunnel(rows);
    expect(f[0].users).toBe(100);
    expect(f[0].count).toBe(120);
  });

  it('de eerste stap heeft geen uitval, want er is niets ervoor', () => {
    expect(buildFunnel(rows)[0].uitval).toBeNull();
  });

  it('zonder verkeer geen percentages in plaats van nullen of oneindig', () => {
    const f = buildFunnel([]);
    expect(f.every(s => s.users === 0)).toBe(true);
    expect(f.every(s => s.pctVanStart === null)).toBe(true);
    expect(f.every(s => s.uitval === null)).toBe(true);
  });

  it('een ontbrekende tussenstap maakt de rest niet stuk', () => {
    const f = buildFunnel([{ event: 'sc_start', users: 10, count: 10 }]);
    expect(f[1].users).toBe(0);
    expect(f[2].uitval).toBeNull();
  });
});
