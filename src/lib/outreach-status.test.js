import { describe, it, expect } from 'vitest';
import {
  STATUS_LABEL, STATUS_KORT, statusLabel, statusKleur, statusKort, weergaveVanProspect, uitkomstKeuzes,
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

describe('weergaveVanProspect', () => {
  it('KRITIEK: de uitkomst wint van de status', () => {
    // Status zegt waar de reeks bleef, uitkomst zegt wat eruit kwam. Greg Mills
    // stond op 'geantwoord' terwijl er een afspraak uit was gekomen.
    expect(weergaveVanProspect({ status: 'replied', outcome: 'afspraak' }))
      .toEqual({ tekst: 'afspraak', kleur: '#15803d', isUitkomst: true });
    expect(weergaveVanProspect({ status: 'done', outcome: 'geen_interesse' }))
      .toEqual({ tekst: 'geen interesse', kleur: '#6b7280', isUitkomst: true });
  });

  it('valt terug op de status als er geen uitkomst is', () => {
    expect(weergaveVanProspect({ status: 'msg1_sent' }))
      .toEqual({ tekst: 'bericht 1', kleur: '#d97706', isUitkomst: false });
    expect(weergaveVanProspect({ status: 'replied', outcome: null }).tekst)
      .toBe('geantwoord');
    expect(weergaveVanProspect({ status: 'replied', outcome: '  ' }).tekst)
      .toBe('geantwoord');
  });

  it('gaat om met lege invoer', () => {
    expect(weergaveVanProspect({}).tekst).toBeNull();
    expect(weergaveVanProspect(null).tekst).toBeNull();
  });
});

describe('uitkomstKeuzes', () => {
  it('KRITIEK: een eventcampagne zegt aangemeld, geen afspraak', () => {
    // Bij een uitnodiging voor een event plan je geen gesprek, je meldt je aan.
    expect(uitkomstKeuzes('aanmelding').map(k => k.label)).toEqual(['Aangemeld', 'Geen interesse']);
  });

  it('een gewone campagne zegt afspraak', () => {
    expect(uitkomstKeuzes('afspraak').map(k => k.label)).toEqual(['Afspraak', 'Geen interesse']);
    expect(uitkomstKeuzes(null).map(k => k.label)).toEqual(['Afspraak', 'Geen interesse']);
  });

  it('de opgeslagen waarde verandert niet mee', () => {
    // Anders zou er gemigreerd moeten worden en zou de validatie aan de
    // serverkant een onbekende uitkomst zien.
    for (const doel of ['aanmelding', 'afspraak', null]) {
      expect(uitkomstKeuzes(doel).map(k => k.waarde)).toEqual(['afspraak', 'geen_interesse']);
    }
  });

  it('weergaveVanProspect volgt hetzelfde doel', () => {
    expect(weergaveVanProspect({ outcome: 'afspraak', doel: 'aanmelding' }).tekst).toBe('aangemeld');
    expect(weergaveVanProspect({ outcome: 'afspraak', doel: 'afspraak' }).tekst).toBe('afspraak');
    expect(weergaveVanProspect({ outcome: 'geen_interesse', doel: 'aanmelding' }).tekst).toBe('geen interesse');
  });
});
