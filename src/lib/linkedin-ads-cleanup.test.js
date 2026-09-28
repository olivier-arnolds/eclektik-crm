import { describe, it, expect } from 'vitest';
import { opruimPlan, groepVanBestand } from './linkedin-ads-cleanup.js';

const r = (stat_date, ad_id, campaign_id = '891') => ({ stat_date, ad_id, campaign_id });

const groep = (van, tot, sleutels, campagnes = ['891']) => ({
  van, tot, campagnes: new Set(campagnes), sleutels: new Set(sleutels),
});

describe('opruimPlan', () => {
  it('laat alles staan als het bestand elke opgeslagen dag bevat', () => {
    const bestaand = [r('2026-09-21', 'a'), r('2026-09-22', 'a')];
    const g = groep('2026-09-21', '2026-09-22', ['2026-09-21|a', '2026-09-22|a']);
    expect(opruimPlan(bestaand, [g])).toEqual([]);
  });

  it('KRITIEK: ruimt een dag op die LinkedIn niet meer meldt', () => {
    // Dit is de hele reden voor dit bestand. Zonder opruimen blijft de oude,
    // hogere waarde staan en telt hij mee in het totaal.
    const bestaand = [r('2026-09-21', 'a'), r('2026-09-23', 'a')];
    const g = groep('2026-09-21', '2026-09-23', ['2026-09-21|a']);
    expect(opruimPlan(bestaand, [g])).toEqual([{ stat_date: '2026-09-23', ad_id: 'a' }]);
  });

  it('blijft buiten de rapportperiode af', () => {
    const bestaand = [r('2026-09-10', 'a'), r('2026-09-30', 'a')];
    const g = groep('2026-09-21', '2026-09-23', ['2026-09-21|a']);
    expect(opruimPlan(bestaand, [g])).toEqual([]);
  });

  it('KRITIEK: raakt een andere campagne niet aan', () => {
    // Twee bestanden tegelijk slepen mag geen data van de ene campagne wissen
    // omdat de andere een ruimere periode beslaat.
    const bestaand = [r('2026-09-22', 'b', '999'), r('2026-09-22', 'a', '891')];
    const g = groep('2026-09-21', '2026-09-23', ['2026-09-21|a']);
    expect(opruimPlan(bestaand, [g])).toEqual([{ stat_date: '2026-09-22', ad_id: 'a' }]);
  });

  it('KRITIEK: een leeg rapport veegt niets leeg', () => {
    // Geen campagnes in het bestand is geen uitspraak over welke campagne dan
    // ook. Zou dit wel wissen, dan kost een lege export je hele maand.
    const bestaand = [r('2026-09-22', 'a')];
    expect(opruimPlan(bestaand, [groep('2026-09-01', '2026-09-30', [], [])])).toEqual([]);
  });

  it('telt dezelfde regel uit twee bestanden maar een keer', () => {
    const bestaand = [r('2026-09-22', 'a')];
    const g = groep('2026-09-21', '2026-09-23', ['2026-09-21|a']);
    expect(opruimPlan(bestaand, [g, g])).toHaveLength(1);
  });

  it('negeert een groep zonder periode', () => {
    const bestaand = [r('2026-09-22', 'a')];
    expect(opruimPlan(bestaand, [{ campagnes: ['891'], sleutels: [] }])).toEqual([]);
  });
});

describe('groepVanBestand', () => {
  it('haalt periode, campagnes en sleutels uit de gelezen rijen', () => {
    const g = groepVanBestand({ van: '2026-09-21', tot: '2026-09-28' }, [
      { stat_date: '2026-09-21', ad_id: 'a', campaign_id: '891' },
      { stat_date: '2026-09-22', ad_id: 'a', campaign_id: '891' },
    ]);
    expect(g.van).toBe('2026-09-21');
    expect([...g.campagnes]).toEqual(['891']);
    expect(g.sleutels.has('2026-09-22|a')).toBe(true);
  });

  it('geeft niets terug zonder periode, dan valt er niets op te ruimen', () => {
    expect(groepVanBestand(null, [{ stat_date: '2026-09-21', ad_id: 'a' }])).toBeNull();
  });
});
