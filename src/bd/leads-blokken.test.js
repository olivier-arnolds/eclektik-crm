import { describe, it, expect } from 'vitest';
import { maakBlokken, nieuwstePerLead, BLOK_EVENT, BLOK_OUTREACH, BLOK_OVERIG } from './leads-blokken.js';

const reg = (id, lead, slug, occurred_at, eventDate = '2026-11-17') => ({
  id, marketing_lead_id: lead, event: 'event_registered', occurred_at,
  payload: { eventSlug: slug, eventDate },
});

describe('nieuwstePerLead', () => {
  it('houdt per lead de eerste rij over, en die is de nieuwste', () => {
    const uit = nieuwstePerLead([
      reg('a2', 'lead1', 'amsterdam-2026', '2026-10-20T10:00:00Z'),
      reg('a1', 'lead1', 'amsterdam-2026', '2026-09-01T10:00:00Z'),
      reg('b1', 'lead2', 'amsterdam-2026', '2026-09-05T10:00:00Z'),
    ]);
    expect(uit.map(r => r.id)).toEqual(['a2', 'b1']);
  });

  it('gaat om met lege invoer en rijen zonder lead', () => {
    expect(nieuwstePerLead(null)).toEqual([]);
    expect(nieuwstePerLead([{ id: 'x' }])).toEqual([]);
  });
});

describe('maakBlokken', () => {
  const zichtbaar = new Set(['lead1', 'lead2', 'lead3']);

  it('maakt een blok per event, op datum gesorteerd', () => {
    const blokken = maakBlokken([
      reg('z1', 'lead1', 'zurich-2026', '2026-10-30T10:00:00Z', '2026-12-01'),
      reg('a1', 'lead2', 'amsterdam-2026', '2026-10-20T10:00:00Z'),
    ], zichtbaar);
    const events = blokken.filter(b => b.soort === BLOK_EVENT);
    expect(events.map(b => b.titel)).toEqual(['Amsterdam 17 nov', 'Zürich 1 dec']);
  });

  it('KRITIEK: dezelfde persoon mag in meerdere eventblokken staan', () => {
    // Wie zich voor twee events aanmeldt komt bij allebei, en de vraag per blok
    // is wie er bij dat event komt.
    const blokken = maakBlokken([
      reg('z1', 'lead1', 'zurich-2026', '2026-10-30T10:00:00Z', '2026-12-01'),
      reg('a1', 'lead1', 'amsterdam-2026', '2026-10-20T10:00:00Z'),
    ], zichtbaar);
    const perSlug = Object.fromEntries(
      blokken.filter(b => b.soort === BLOK_EVENT).map(b => [b.slug, b.rijen.length]));
    expect(perSlug['amsterdam-2026']).toBe(1);
    expect(perSlug['zurich-2026']).toBe(1);
  });

  it('KRITIEK: binnen één blok telt iemand maar één keer, de nieuwste wint', () => {
    // Na de datumverschuiving hebben een paar mensen zich opnieuw aangemeld.
    const blokken = maakBlokken([
      reg('nieuw', 'lead1', 'amsterdam-2026', '2026-10-20T10:00:00Z', '2026-11-17'),
      reg('oud', 'lead1', 'amsterdam-2026', '2026-09-01T10:00:00Z', '2026-10-06'),
    ], zichtbaar);
    const ams = blokken.find(b => b.slug === 'amsterdam-2026');
    expect(ams.rijen).toHaveLength(1);
    expect(ams.rijen[0].id).toBe('nieuw');
  });

  it('groepeert op slug en niet op datum', () => {
    // Een aanmelding van voor de verschuiving draagt de oude datum nog bij
    // zich. Groeperen op datum zou Amsterdam over twee blokken uitsmeren.
    const blokken = maakBlokken([
      reg('a1', 'lead1', 'amsterdam-2026', '2026-10-20T10:00:00Z', '2026-11-17'),
      reg('a2', 'lead2', 'amsterdam-2026', '2026-09-01T10:00:00Z', '2026-10-06'),
    ], zichtbaar);
    expect(blokken.filter(b => b.soort === BLOK_EVENT && b.rijen.length)).toHaveLength(1);
    expect(blokken.find(b => b.slug === 'amsterdam-2026').rijen).toHaveLength(2);
  });

  it('zet afspraken uit outreach in een eigen blok', () => {
    const blokken = maakBlokken([
      { id: 'm1', marketing_lead_id: 'lead1', event: 'outreach_meeting', payload: { campaign: 'AIBS' } },
    ], zichtbaar);
    const blok = blokken.find(b => b.soort === BLOK_OUTREACH);
    expect(blok.titel).toBe('Afspraken uit outreach');
    expect(blok.rijen).toHaveLength(1);
  });

  it('vangt waitlist en scorecard op in Overig, en laat dat blok weg als het leeg is', () => {
    const metOverig = maakBlokken([
      { id: 'w1', marketing_lead_id: 'lead1', event: 'waitlist_joined', payload: {} },
      { id: 's1', marketing_lead_id: 'lead2', event: 'scorecard_completed', payload: {} },
    ], zichtbaar);
    expect(metOverig.find(b => b.soort === BLOK_OVERIG).rijen).toHaveLength(2);

    const zonder = maakBlokken([], zichtbaar);
    expect(zonder.find(b => b.soort === BLOK_OVERIG)).toBeUndefined();
  });

  it('houdt een leeg eventblok wel staan, want nul is daar een antwoord', () => {
    const blokken = maakBlokken([], zichtbaar);
    expect(blokken.filter(b => b.soort === BLOK_EVENT).length).toBeGreaterThanOrEqual(2);
    expect(blokken.every(b => b.soort !== BLOK_EVENT || b.rijen.length === 0)).toBe(true);
  });

  it('laat een onbekende slug niet verdwijnen, maar zet hem achteraan', () => {
    const blokken = maakBlokken([
      reg('x1', 'lead1', 'berlijn-2027', '2026-10-20T10:00:00Z', '2027-03-01'),
    ], zichtbaar);
    const events = blokken.filter(b => b.soort === BLOK_EVENT);
    expect(events[events.length - 1].slug).toBe('berlijn-2027');
    expect(events[events.length - 1].rijen).toHaveLength(1);
  });

  it('een aanmelding zonder slug krijgt een eigen blok in plaats van te verdwijnen', () => {
    const blokken = maakBlokken([
      { id: 'n1', marketing_lead_id: 'lead1', event: 'event_registered', payload: {} },
    ], zichtbaar);
    expect(blokken.find(b => b.slug === 'zonder-slug').rijen).toHaveLength(1);
  });

  it('laat activiteiten weg van leads die buiten het statusfilter vallen', () => {
    const blokken = maakBlokken([
      reg('a1', 'lead1', 'amsterdam-2026', '2026-10-20T10:00:00Z'),
      reg('a2', 'gearchiveerd', 'amsterdam-2026', '2026-10-21T10:00:00Z'),
    ], new Set(['lead1']));
    expect(blokken.find(b => b.slug === 'amsterdam-2026').rijen.map(r => r.id)).toEqual(['a1']);
  });

  it('gaat om met lege invoer', () => {
    expect(maakBlokken(null, null).every(b => b.rijen.length === 0)).toBe(true);
  });
});
