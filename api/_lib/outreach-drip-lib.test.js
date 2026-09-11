import { describe, it, expect } from 'vitest';
import { slotsRemaining, planDrip, DRIP_MAX_PER_RUN } from './outreach-drip-lib.js';

const om = (uur, min) => new Date(Date.UTC(2026, 8, 14, uur, min, 0)); // maandag

describe('slotsRemaining', () => {
  it('telt dit moment mee', () => {
    expect(slotsRemaining(om(16, 40))).toBe(1);   // alleen deze nog
    expect(slotsRemaining(om(16, 20))).toBe(2);
  });

  it('een volle dag levert alle momenten op', () => {
    expect(slotsRemaining(om(7, 0))).toBe(30);    // 07:00 t/m 16:40, elke 20 min
  });

  it('KRITIEK: nooit nul, want daar wordt door gedeeld', () => {
    expect(slotsRemaining(om(23, 59))).toBe(1);
    expect(slotsRemaining(new Date('kapot'))).toBe(1);
  });
});

describe('planDrip', () => {
  it('verdeelt de dagcap gelijkmatig over de resterende momenten', () => {
    expect(planDrip({ roomToday: 30, slotsLeft: 30 }).count).toBe(1);
    expect(planDrip({ roomToday: 30, slotsLeft: 15 }).count).toBe(2);
  });

  it('haalt in na gemiste runs, maar nooit meer dan het maximum per run', () => {
    const r = planDrip({ roomToday: 30, slotsLeft: 3 });
    expect(r.count).toBe(DRIP_MAX_PER_RUN);
  });

  it('KRITIEK: de weekcap wint als die strenger is', () => {
    const r = planDrip({ roomToday: 30, roomWeek: 2, slotsLeft: 1 });
    expect(r.count).toBe(2);
  });

  it('stuurt niets als een van de caps vol is, met de juiste reden', () => {
    expect(planDrip({ roomToday: 0, slotsLeft: 10 })).toEqual({ count: 0, reason: 'dagcap bereikt' });
    expect(planDrip({ roomToday: 10, roomWeek: 0, slotsLeft: 10 })).toEqual({ count: 0, reason: 'weekcap bereikt' });
  });

  it('zonder weekcap remt alleen de dag', () => {
    expect(planDrip({ roomToday: 5, roomWeek: null, slotsLeft: 1 }).count).toBe(4);
  });

  it('gaat om met rare invoer', () => {
    expect(planDrip({}).count).toBe(0);
    expect(planDrip({ roomToday: 3, slotsLeft: 0 }).count).toBe(3);
  });
});
