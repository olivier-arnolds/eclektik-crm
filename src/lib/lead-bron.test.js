import { describe, it, expect } from 'vitest';
import { bronLabel, kortDatum } from './lead-bron.js';

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
