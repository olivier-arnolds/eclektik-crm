import { describe, it, expect } from 'vitest';
import {
  normalizePrivateKey, dateRanges, pctChange, reportToRows, totalOf, normalizeDateSeries,
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
