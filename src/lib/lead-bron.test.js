import { describe, it, expect } from 'vitest';
import {
  bronLabel, kortDatum, gekomenVia, telefoonVan, telHref,
  EVENTS, eventInfo, eventLabel, datumIsActueel,
} from './lead-bron.js';

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

describe('eventLabel', () => {
  it('maakt van een slug een leesbaar kopje met datum', () => {
    expect(eventLabel('amsterdam-2026')).toBe('Amsterdam 17 nov');
    expect(eventLabel('zurich-2026')).toBe('Zürich 1 dec');
  });

  it('valt terug op de slug zelf bij een event dat we niet kennen', () => {
    expect(eventLabel('berlijn-2027')).toBe('berlijn-2027');
    expect(eventLabel('')).toBe('Zonder event');
    expect(eventLabel(null)).toBe('Zonder event');
  });
});

describe('eventInfo', () => {
  it('geeft naam en datum terug', () => {
    expect(eventInfo('zurich-2026')).toEqual({ naam: 'Zürich', datum: '2026-12-01' });
  });

  it('geeft null bij een onbekende of lege slug', () => {
    for (const v of [null, undefined, '', '  ', 'berlijn-2027']) expect(eventInfo(v)).toBeNull();
  });
});

describe('datumIsActueel', () => {
  // KRITIEK: dit stond als één EVENT_DATUM in de code en klopte alleen voor
  // Amsterdam, waardoor Zürich nooit groen kon kleuren.
  it('vergelijkt per event, niet tegen één vaste datum', () => {
    expect(datumIsActueel('amsterdam-2026', { eventDate: '2026-11-17' })).toBe(true);
    expect(datumIsActueel('zurich-2026', { eventDate: '2026-12-01' })).toBe(true);
    expect(datumIsActueel('zurich-2026', { eventDate: '2026-11-17' })).toBe(false);
  });

  it('ziet een aanmelding op een verschoven datum', () => {
    expect(datumIsActueel('amsterdam-2026', { eventDate: '2026-10-06' })).toBe(false);
    expect(datumIsActueel('amsterdam-2026', { eventDate: '2026-11-12' })).toBe(false);
  });

  it('doet geen uitspraak zonder datum of bij een onbekend event', () => {
    expect(datumIsActueel('amsterdam-2026', {})).toBe(false);
    expect(datumIsActueel('amsterdam-2026', null)).toBe(false);
    expect(datumIsActueel('berlijn-2027', { eventDate: '2027-01-01' })).toBe(false);
  });
});

describe('EVENTS', () => {
  it('heeft voor elk event een naam en een geldige datum', () => {
    for (const [slug, info] of Object.entries(EVENTS)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(info.naam).toBeTruthy();
      expect(kortDatum(info.datum)).not.toBeNull();
    }
  });
});
