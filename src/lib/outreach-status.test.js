import { describe, it, expect } from 'vitest';
import {
  STATUS_LABEL, STATUS_KORT, statusLabel, statusKleur, statusKort,
} from './outreach-status.js';

describe('statusLabel', () => {
  it('geeft het leesbare label', () => {
    expect(statusLabel('msg1_sent')).toBe('Bericht 1 verstuurd');
    expect(statusLabel('replied')).toBe('Heeft geantwoord');
  });

  it('geeft een onbekende status terug zoals hij is, zodat hij opvalt', () => {
    expect(statusLabel('iets_nieuws')).toBe('iets_nieuws');
  });

  it('geeft null bij niets', () => {
    for (const v of [null, undefined, '', '  ']) expect(statusLabel(v)).toBeNull();
  });
});

describe('statusKort', () => {
  it('laat weg wat de context al zegt', () => {
    expect(statusKort('msg1_sent')).toBe('bericht 1');
    expect(statusKort('queued')).toBe('nog niet gestuurd');
  });

  it('valt terug op de status zelf', () => {
    expect(statusKort('iets_nieuws')).toBe('iets_nieuws');
    expect(statusKort('')).toBeNull();
  });
});

describe('statusKleur', () => {
  it('geeft een kleur per status en grijs bij een onbekende', () => {
    expect(statusKleur('replied')).toBe('#16a34a');
    expect(statusKleur('bounced')).toBe('#dc2626');
    expect(statusKleur('iets_nieuws')).toBe('#6b7280');
    expect(statusKleur(null)).toBe('#6b7280');
  });
});

describe('de twee lijsten', () => {
  it('dekken dezelfde statussen, anders mist er een label', () => {
    expect(Object.keys(STATUS_KORT).sort()).toEqual(Object.keys(STATUS_LABEL).sort());
  });
});
