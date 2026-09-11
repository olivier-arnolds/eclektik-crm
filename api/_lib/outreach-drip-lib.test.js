import { describe, it, expect } from 'vitest';
import {
  slotsRemaining, planDrip, inSendWindow, localParts, DRIP_MAX_PER_RUN,
} from './outreach-drip-lib.js';

// Het venster is 09:00 tot 17:00 in AMSTERDAMSE tijd. In de zomer is dat 07:00
// tot 15:00 UTC, in de winter 08:00 tot 16:00 UTC. Deze tests prikken bewust op
// beide kanten van de zomertijd, want dat is precies waar een vast UTC-rooster
// zou misgaan.
const zomer = (h, m = 0) => new Date(Date.UTC(2026, 8, 14, h, m));   // 14 sept, maandag, CEST
const winter = (h, m = 0) => new Date(Date.UTC(2026, 11, 14, h, m)); // 14 dec, maandag, CET

describe('localParts', () => {
  it('rekent om naar Amsterdamse tijd, zomer en winter', () => {
    expect(localParts(zomer(7, 0))).toEqual({ hour: 9, minute: 0, weekday: 1 });
    expect(localParts(winter(8, 0))).toEqual({ hour: 9, minute: 0, weekday: 1 });
  });
});

describe('inSendWindow', () => {
  it('KRITIEK: hetzelfde lokale venster in zomer en winter', () => {
    expect(inSendWindow(zomer(6, 59))).toBe(false);  // 08:59 lokaal
    expect(inSendWindow(zomer(7, 0))).toBe(true);    // 09:00 lokaal
    expect(inSendWindow(zomer(14, 59))).toBe(true);  // 16:59 lokaal
    expect(inSendWindow(zomer(15, 0))).toBe(false);  // 17:00 lokaal

    expect(inSendWindow(winter(7, 59))).toBe(false); // 08:59 lokaal
    expect(inSendWindow(winter(8, 0))).toBe(true);   // 09:00 lokaal
    expect(inSendWindow(winter(15, 59))).toBe(true); // 16:59 lokaal
    expect(inSendWindow(winter(16, 0))).toBe(false); // 17:00 lokaal
  });

  it('in het weekend gaat er niets uit', () => {
    expect(inSendWindow(new Date(Date.UTC(2026, 8, 12, 10, 0)))).toBe(false); // zaterdag
    expect(inSendWindow(new Date(Date.UTC(2026, 8, 13, 10, 0)))).toBe(false); // zondag
  });
});

describe('slotsRemaining', () => {
  it('een volle dag levert alle momenten op', () => {
    expect(slotsRemaining(zomer(7, 0))).toBe(24);   // 09:00 t/m 16:40, elke 20 min
    expect(slotsRemaining(winter(8, 0))).toBe(24);
  });

  it('telt dit moment mee en loopt netjes af', () => {
    expect(slotsRemaining(zomer(14, 40))).toBe(1);  // 16:40 lokaal, de laatste
    expect(slotsRemaining(zomer(14, 20))).toBe(2);
  });

  it('KRITIEK: nooit nul, want daar wordt door gedeeld', () => {
    expect(slotsRemaining(zomer(20, 0))).toBe(1);
    expect(slotsRemaining(new Date('kapot'))).toBe(1);
  });
});

describe('planDrip', () => {
  it('verdeelt de dagcap gelijkmatig over de resterende momenten', () => {
    expect(planDrip({ roomToday: 24, slotsLeft: 24 }).count).toBe(1);
    expect(planDrip({ roomToday: 30, slotsLeft: 15 }).count).toBe(2);
  });

  it('haalt in na gemiste runs, maar nooit meer dan het maximum per run', () => {
    expect(planDrip({ roomToday: 30, slotsLeft: 3 }).count).toBe(DRIP_MAX_PER_RUN);
  });

  it('KRITIEK: de weekcap wint als die strenger is', () => {
    expect(planDrip({ roomToday: 30, roomWeek: 2, slotsLeft: 1 }).count).toBe(2);
  });

  it('stuurt niets als een van de caps vol is, met de juiste reden', () => {
    expect(planDrip({ roomToday: 0, slotsLeft: 10 })).toEqual({ count: 0, reason: 'dagcap bereikt' });
    expect(planDrip({ roomToday: 10, roomWeek: 0, slotsLeft: 10 })).toEqual({ count: 0, reason: 'weekcap bereikt' });
  });

  it('gaat om met rare invoer', () => {
    expect(planDrip({}).count).toBe(0);
    expect(planDrip({ roomToday: 3, slotsLeft: 0 }).count).toBe(3);
  });
});
