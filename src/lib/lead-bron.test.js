import { describe, it, expect } from 'vitest';
import { bronLabel, kortDatum, gekomenVia, telefoonVan, telHref } from './lead-bron.js';

describe('kortDatum', () => {
  it('maakt van een isodatum een korte Nederlandse datum', () => {
    expect(kortDatum('2026-11-12')).toBe('12 nov');
    expect(kortDatum('2026-10-06')).toBe('6 okt');
    expect(kortDatum('2026-01-01')).toBe('1 jan');
  });

  it('geeft null bij iets dat geen datum is', () => {
    for (const v of [null, undefined, '', 'morgen', '2026-13-01', '2026-11-32', '12-11-2026']) {
      expect(kortDatum(v)).toBeNull();
    }
  });
});

describe('bronLabel', () => {
  it('KRITIEK: volgt de datum uit de aanmelding, niet een vaste tekst', () => {
    // Hier ging het mis: het label stond hard op 'Event 6 okt' en bleef dat
    // zeggen nadat het event verschoven was.
    expect(bronLabel('event_registered', { eventDate: '2026-11-12' })).toBe('Event 12 nov');
    expect(bronLabel('event_registered', { eventDate: '2026-10-06' })).toBe('Event 6 okt');
  });

  it('valt terug op Event als de datum ontbreekt', () => {
    expect(bronLabel('event_registered', {})).toBe('Event');
    expect(bronLabel('event_registered', null)).toBe('Event');
  });

  it('laat een ander soort activiteit ongemoeid', () => {
    expect(bronLabel('waitlist_joined', {})).toBe('waitlist_joined');
  });

  it('geeft null zonder activiteit', () => {
    expect(bronLabel(null, {})).toBeNull();
    expect(bronLabel('', {})).toBeNull();
  });
});

describe('gekomenVia', () => {
  it('geeft terug wat de deelnemer zelf heeft opgegeven', () => {
    expect(gekomenVia({ invitedBy: 'Eclectik' })).toBe('Eclectik');
    expect(gekomenVia({ invitedBy: 'Zoom/Workvivo' })).toBe('Zoom/Workvivo');
    expect(gekomenVia({ invitedBy: 'Other' })).toBe('Other');
  });

  it('geeft null als er niets ingevuld is', () => {
    for (const v of [null, undefined, {}, { invitedBy: '' }, { invitedBy: '   ' }]) {
      expect(gekomenVia(v)).toBeNull();
    }
  });
});

describe('telefoonVan', () => {
  it('geeft het nummer terug zoals het is ingevuld', () => {
    expect(telefoonVan({ phone: '+31611447609' })).toBe('+31611447609');
    expect(telefoonVan({ phone: ' 0651502701 ' })).toBe('0651502701');
    expect(telefoonVan({ phone: '+905522477488' })).toBe('+905522477488');
  });

  it('geeft null als er niets ingevuld is', () => {
    for (const v of [null, undefined, {}, { phone: '' }, { phone: '   ' }]) {
      expect(telefoonVan(v)).toBeNull();
    }
  });
});

describe('telHref', () => {
  it('houdt cijfers en de plus over', () => {
    expect(telHref('+31 6 11 44 76 09')).toBe('tel:+31611447609');
    expect(telHref('06-51502701')).toBe('tel:0651502701');
  });

  it('KRITIEK: geen link bij een nummer zonder cijfers', () => {
    // Een lege tel-link opent de belapp met niets erin, en dat ziet eruit als
    // een kapotte knop.
    expect(telHref('onbekend')).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});
