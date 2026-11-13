import { describe, it, expect } from 'vitest';
import {
  redenGeenBericht2, magHervatten, datumNaarMoment, momentNaarDatum,
  hervatPatch, datumPatch,
} from './outreach-hervatten.js';

const nu = new Date('2026-11-13T10:00:00.000Z');

describe('redenGeenBericht2', () => {
  it('geeft null voor iemand die gewoon in de rij staat', () => {
    expect(redenGeenBericht2({ status: 'msg1_sent' })).toBeNull();
    expect(redenGeenBericht2({ status: 'queued' })).toBeNull();
    expect(redenGeenBericht2({ status: 'msg1_sent', next_action_at: '2026-11-20T00:00:00Z' })).toBeNull();
  });

  it('herkent de hold: antwoord binnen zonder vervolgdatum', () => {
    const r = redenGeenBericht2({ status: 'msg1_sent', last_inbound_at: '2026-11-10T09:00:00Z' });
    expect(r).toMatchObject({ code: 'hold', herstelbaar: true });
  });

  it('een antwoord met een datum is geen hold', () => {
    // Een herkende afwezigheid krijgt een terugkeerdatum en loopt gewoon af.
    expect(redenGeenBericht2({
      status: 'msg1_sent',
      last_inbound_at: '2026-11-10T09:00:00Z',
      next_action_at: '2026-11-24T00:00:00Z',
    })).toBeNull();
  });

  it('noemt geantwoord, doorverwezen en stilgezet herstelbaar', () => {
    expect(redenGeenBericht2({ status: 'replied' })).toMatchObject({ herstelbaar: true });
    expect(redenGeenBericht2({ status: 'referred' })).toMatchObject({ herstelbaar: true });
    expect(redenGeenBericht2({ status: 'paused' })).toMatchObject({ herstelbaar: true });
  });

  it('KRITIEK: wie bericht 2 al had, is niet te hervatten', () => {
    // Zonder deze regel viel msg2_sent met een antwoord zonder datum in de hold
    // hieronder. Op de echte data waren dat 25 mensen, en één klik zou hun
    // bericht 2 een tweede keer sturen.
    expect(redenGeenBericht2({ status: 'msg2_sent' }).herstelbaar).toBe(false);
    expect(redenGeenBericht2({
      status: 'msg2_sent', last_inbound_at: '2026-11-10T09:00:00Z', next_action_at: null,
    })).toMatchObject({ code: 'msg2_sent', herstelbaar: false });
    expect(magHervatten({ status: 'msg2_sent', last_inbound_at: '2026-11-10T09:00:00Z' })).toBe(false);
    expect(hervatPatch({ status: 'msg2_sent' }, '2026-11-24', nu).fout).toBeTruthy();
  });

  it('KRITIEK: afgemeld en gebounced zijn niet herstelbaar', () => {
    // Iemand die zich heeft afgemeld opnieuw aanschrijven is het ergste wat
    // deze knop zou kunnen doen.
    expect(redenGeenBericht2({ status: 'opted_out' }).herstelbaar).toBe(false);
    expect(redenGeenBericht2({ status: 'bounced' }).herstelbaar).toBe(false);
    expect(magHervatten({ status: 'opted_out' })).toBe(false);
    expect(magHervatten({ status: 'bounced' })).toBe(false);
  });

  it('KRITIEK: een vastgelegde uitkomst wint van alles', () => {
    // Dat is een beslissing van een mens. Die mag een datumveld niet stilletjes
    // terugdraaien.
    expect(redenGeenBericht2({ status: 'done', outcome: 'afspraak' }).herstelbaar).toBe(false);
    expect(redenGeenBericht2({ status: 'replied', outcome: 'geen_interesse' }).herstelbaar).toBe(false);
  });
});

describe('datumNaarMoment', () => {
  it('maakt er middernacht aan het begin van die dag van', () => {
    // Later op de dag zou de ronde van negen uur missen en de mail een dag
    // opschuiven, waardoor de terugkeerdatum van de ontvanger niet meer klopt.
    expect(datumNaarMoment('2026-11-24')).toBe('2026-11-24T00:00:00.000Z');
  });

  it('weigert onzin', () => {
    expect(datumNaarMoment('24-11-2026')).toBeNull();
    expect(datumNaarMoment('morgen')).toBeNull();
    expect(datumNaarMoment('')).toBeNull();
    expect(datumNaarMoment(null)).toBeNull();
  });

  it('heen en terug levert dezelfde dag op', () => {
    expect(momentNaarDatum(datumNaarMoment('2026-12-01'))).toBe('2026-12-01');
    expect(momentNaarDatum(null)).toBe('');
  });
});

describe('hervatPatch', () => {
  it('zet de status terug op msg1_sent met de gekozen datum', () => {
    const { patch } = hervatPatch({ status: 'replied' }, '2026-11-24', nu);
    expect(patch).toEqual({
      status: 'msg1_sent',
      next_action_at: '2026-11-24T00:00:00.000Z',
      paused_reason: null,
      updated_at: nu.toISOString(),
    });
  });

  it('KRITIEK: laat last_inbound_at met rust', () => {
    // Dat er ooit een antwoord kwam is een feit. Het wissen om de verzender
    // tevreden te stellen veegt het spoor uit waarom iemand stilgezet werd.
    const { patch } = hervatPatch({ status: 'replied', last_inbound_at: '2026-11-10T09:00:00Z' }, '2026-11-24', nu);
    expect(patch).not.toHaveProperty('last_inbound_at');
    expect(patch).not.toHaveProperty('outcome');
  });

  it('weigert wie niet hervat mag worden', () => {
    expect(hervatPatch({ status: 'opted_out' }, '2026-11-24', nu).fout).toMatch(/afgemeld/i);
    expect(hervatPatch({ status: 'bounced' }, '2026-11-24', nu).fout).toBeTruthy();
    expect(hervatPatch({ status: 'done', outcome: 'afspraak' }, '2026-11-24', nu).fout).toMatch(/uitkomst/i);
  });

  it('weigert een onbruikbare datum', () => {
    expect(hervatPatch({ status: 'replied' }, '', nu).fout).toBe('Geen geldige datum');
  });

  it('werkt ook voor iemand die al in de rij staat', () => {
    // De knop staat er dan niet, maar de functie hoeft niet te struikelen.
    expect(hervatPatch({ status: 'msg1_sent' }, '2026-11-24', nu).patch.status).toBe('msg1_sent');
  });
});

describe('datumPatch', () => {
  it('verzet alleen de datum', () => {
    expect(datumPatch('2026-12-02', nu).patch).toEqual({
      next_action_at: '2026-12-02T00:00:00.000Z',
      updated_at: nu.toISOString(),
    });
  });

  it('een lege datum haalt de wachttijd weg', () => {
    expect(datumPatch('', nu).patch).toEqual({
      next_action_at: null, updated_at: nu.toISOString(),
    });
  });

  it('raakt de status niet aan', () => {
    expect(datumPatch('2026-12-02', nu).patch).not.toHaveProperty('status');
  });

  it('weigert onzin', () => {
    expect(datumPatch('2-12-2026', nu).fout).toBe('Geen geldige datum');
  });
});
