import { describe, it, expect } from 'vitest';
import {
  CAMPAGNE_FILTERS, vandaagISO, laatsteSessieDatum, isAfgelopen,
  toonCampagne, telCampagnes, wisselIngeklapt,
} from './leads-campagnes.js';

describe('vandaagISO', () => {
  it('geeft de lokale datum als YYYY-MM-DD, met voorloopnullen', () => {
    expect(vandaagISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(vandaagISO(new Date(2026, 10, 24, 0, 5))).toBe('2026-11-24');
  });
});

describe('laatsteSessieDatum', () => {
  it('pakt de laatste datum uit alle gekozen slots', () => {
    expect(laatsteSessieDatum([
      { slots: ['slot-2026-10-29'] },
      { slots: ['slot-2026-11-05', 'slot-2026-11-04'] },
      { slots: null },
    ])).toBe('2026-11-05');
  });

  it('is null als niemand een slot koos of de slots onleesbaar zijn', () => {
    expect(laatsteSessieDatum([])).toBeNull();
    expect(laatsteSessieDatum(null)).toBeNull();
    expect(laatsteSessieDatum([{ slots: [] }, { slots: ['ochtend', 42] }])).toBeNull();
  });
});

describe('isAfgelopen', () => {
  it('is afgelopen als de datum voor vandaag ligt', () => {
    expect(isAfgelopen('2026-11-17', '2026-11-24')).toBe(true);
  });

  it('KRITIEK: op de dag zelf loopt de campagne nog', () => {
    expect(isAfgelopen('2026-11-24', '2026-11-24')).toBe(false);
  });

  it('is niet afgelopen als de datum nog komt', () => {
    expect(isAfgelopen('2027-01-28', '2026-11-24')).toBe(false);
  });

  it('KRITIEK: zonder datum is een campagne actief', () => {
    // Outreach heeft geen einddatum en mag niet ongemerkt wegvallen.
    expect(isAfgelopen(null, '2026-11-24')).toBe(false);
    expect(isAfgelopen('', '2026-11-24')).toBe(false);
    expect(isAfgelopen('binnenkort', '2026-11-24')).toBe(false);
  });
});

describe('toonCampagne', () => {
  it('Actief toont alleen wat nog loopt', () => {
    expect(toonCampagne('actief', false)).toBe(true);
    expect(toonCampagne('actief', true)).toBe(false);
  });

  it('Afgelopen toont alleen wat voorbij is', () => {
    expect(toonCampagne('afgelopen', true)).toBe(true);
    expect(toonCampagne('afgelopen', false)).toBe(false);
  });

  it('Alles toont alles', () => {
    expect(toonCampagne('alles', true)).toBe(true);
    expect(toonCampagne('alles', false)).toBe(true);
  });

  it('een onbekende waarde uit localStorage gedraagt zich als Actief', () => {
    expect(toonCampagne('iets-ouds', false)).toBe(true);
    expect(toonCampagne(undefined, true)).toBe(false);
  });

  it('elk filter op de knoppen heeft een eigen gedrag', () => {
    expect(CAMPAGNE_FILTERS.map(f => f.id)).toEqual(['actief', 'afgelopen', 'alles']);
  });
});

describe('telCampagnes', () => {
  it('telt actief, afgelopen en alles', () => {
    expect(telCampagnes([true, false, false, true, false]))
      .toEqual({ actief: 3, afgelopen: 2, alles: 5 });
    expect(telCampagnes(null)).toEqual({ actief: 0, afgelopen: 0, alles: 0 });
  });
});

describe('wisselIngeklapt', () => {
  it('klapt in en weer uit, zonder de oude lijst te veranderen', () => {
    const oud = ['amsterdam-2026'];
    const nieuw = wisselIngeklapt(oud, 'outreach');
    expect(nieuw).toEqual(['amsterdam-2026', 'outreach']);
    expect(oud).toEqual(['amsterdam-2026']);
    expect(wisselIngeklapt(nieuw, 'amsterdam-2026')).toEqual(['outreach']);
  });

  it('overleeft rommel uit localStorage', () => {
    expect(wisselIngeklapt(null, 'x')).toEqual(['x']);
    expect(wisselIngeklapt('kapot', 'x')).toEqual(['x']);
  });
});
