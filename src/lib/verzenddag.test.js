import { describe, it, expect } from 'vitest';
import { beginVanDeDag, dagcapVanaf, VERZEND_TZ } from './verzenddag.js';

describe('beginVanDeDag', () => {
  it('geeft middernacht Amsterdamse tijd, in wintertijd', () => {
    // 5 november 09:14 Amsterdam is 08:14 UTC; middernacht lokaal is 23:00 UTC
    // de dag ervoor.
    expect(beginVanDeDag(new Date('2026-11-05T08:14:00Z')))
      .toBe('2026-11-04T23:00:00.000Z');
  });

  it('geeft middernacht Amsterdamse tijd, in zomertijd', () => {
    // In de zomer loopt Amsterdam twee uur voor op UTC.
    expect(beginVanDeDag(new Date('2026-07-15T10:00:00Z')))
      .toBe('2026-07-14T22:00:00.000Z');
  });

  it('KRITIEK: een verzending van gistermiddag valt buiten vandaag', () => {
    // Dit is het geval waarvoor dit bestaat: 12 berichten op 4 november om
    // 14:12 lokaal, de volgende ochtend om 09:14 moet de teller op nul staan.
    const grens = beginVanDeDag(new Date('2026-11-05T08:14:00Z'));
    const gisteren = new Date('2026-11-04T13:12:00Z').toISOString();  // 14:12 lokaal
    expect(gisteren < grens).toBe(true);
  });

  it('een verzending van net na middernacht valt wel binnen vandaag', () => {
    const grens = beginVanDeDag(new Date('2026-11-05T08:14:00Z'));
    const vannacht = new Date('2026-11-04T23:30:00Z').toISOString();  // 00:30 lokaal
    expect(vannacht >= grens).toBe(true);
  });

  it('zit op de klokwisseling nog steeds op lokale middernacht', () => {
    // Laatste zondag van maart 2026: de klok gaat om 02:00 naar 03:00. De dag
    // begint die nacht om 23:00 UTC van de zaterdag ervoor.
    expect(beginVanDeDag(new Date('2026-03-29T12:00:00Z')))
      .toBe('2026-03-28T23:00:00.000Z');
    // Laatste zondag van oktober 2026: terug naar wintertijd, de dag begint om
    // 22:00 UTC van de zaterdag.
    expect(beginVanDeDag(new Date('2026-10-25T12:00:00Z')))
      .toBe('2026-10-24T22:00:00.000Z');
  });

  it('geeft null bij een onbruikbaar moment of een onbekende tijdzone', () => {
    expect(beginVanDeDag(new Date('niet een datum'))).toBeNull();
    expect(beginVanDeDag('zomaar wat')).toBeNull();
    expect(beginVanDeDag(new Date('2026-11-05T08:14:00Z'), 'Mars/Olympus')).toBeNull();
  });

  it('accepteert ook een getal of een string als moment', () => {
    const uit = beginVanDeDag(Date.parse('2026-11-05T08:14:00Z'));
    expect(uit).toBe('2026-11-04T23:00:00.000Z');
    expect(beginVanDeDag('2026-11-05T08:14:00Z')).toBe(uit);
  });
});

describe('dagcapVanaf', () => {
  it('geeft normaal gesproken de dagsgrens', () => {
    expect(dagcapVanaf(new Date('2026-11-05T08:14:00Z')))
      .toBe('2026-11-04T23:00:00.000Z');
  });

  it('valt bij een onbekende tijdzone terug op een rollend etmaal, dus strenger', () => {
    const nu = new Date('2026-11-05T08:14:00Z');
    expect(dagcapVanaf(nu, 'Mars/Olympus')).toBe('2026-11-04T08:14:00.000Z');
  });

  it('de tijdzone is Amsterdam', () => {
    expect(VERZEND_TZ).toBe('Europe/Amsterdam');
  });
});
