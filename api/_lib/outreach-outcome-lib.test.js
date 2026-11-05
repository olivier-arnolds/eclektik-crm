import { describe, it, expect } from 'vitest';
import {
  validateOutcome, outcomePatch, leadUitContact, UITKOMSTEN_MET_LEAD,
} from './outreach-outcome-lib.js';

const ID = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27';

describe('validateOutcome', () => {
  it('accepteert de twee uitkomsten', () => {
    expect(validateOutcome({ id: ID, outcome: 'afspraak' })).toEqual({ value: { id: ID, outcome: 'afspraak' } });
    expect(validateOutcome({ id: ID, outcome: 'geen_interesse' })).toEqual({ value: { id: ID, outcome: 'geen_interesse' } });
  });

  it('leest leeg, null en none als terugdraaien', () => {
    for (const v of ['', null, undefined, 'none']) {
      expect(validateOutcome({ id: ID, outcome: v })).toEqual({ value: { id: ID, outcome: null } });
    }
  });

  it('weigert een onbekende uitkomst en een kapotte id', () => {
    expect(validateOutcome({ id: ID, outcome: 'misschien' }).error).toBeTruthy();
    expect(validateOutcome({ id: 'niet-een-uuid', outcome: 'afspraak' }).error).toBeTruthy();
    expect(validateOutcome(null).error).toBeTruthy();
  });
});

describe('outcomePatch', () => {
  const now = new Date('2026-10-28T20:00:00Z');

  it('zet de reeks stop bij allebei de keuzes', () => {
    for (const u of ['afspraak', 'geen_interesse']) {
      const p = outcomePatch({ outcome: u, door: 'marco@eclectik.co' }, now);
      expect(p.status).toBe('done');
      expect(p.next_action_at).toBe(null);
      expect(p.outcome).toBe(u);
      expect(p.outcome_by).toBe('marco@eclectik.co');
    }
  });

  it('laat de status met rust bij terugdraaien', () => {
    const p = outcomePatch({ outcome: null, door: 'marco@eclectik.co' }, now);
    expect(p.outcome).toBe(null);
    expect(p.outcome_at).toBe(null);
    // Geen status en geen next_action_at: hervatten is een aparte handeling.
    expect('status' in p).toBe(false);
    expect('next_action_at' in p).toBe(false);
  });
});

describe('leadUitContact', () => {
  const rij = {
    email: ' Nicolette.Pringle@Microsoft.com ', first_name: 'Nicolette', last_name: 'Pringle',
    company: 'Microsoft SOUTH AFRICA', title: 'AI Workforce Senior Specialist',
    linkedin_url: 'https://za.linkedin.com/in/nicolettepringle',
  };

  it('maakt de lead-velden uit de outreachrij', () => {
    const out = leadUitContact(rij, 'Microsoft AIBS 2026');
    expect(out.fields.email).toBe('nicolette.pringle@microsoft.com');
    expect(out.fields.name).toBe('Nicolette Pringle');
    expect(out.fields.company).toBe('Microsoft SOUTH AFRICA');
    expect(out.fields.role).toBe('AI Workforce Senior Specialist');
    expect(out.activity.event).toBe('outreach_meeting');
    expect(out.activity.payload.campaign).toBe('Microsoft AIBS 2026');
  });

  it('vraagt nooit toestemming aan, want een afspraak is geen opt-in', () => {
    expect('consent' in leadUitContact(rij, 'x').fields).toBe(false);
  });

  it('geeft null zonder e-mailadres', () => {
    expect(leadUitContact({ first_name: 'Zonder' }, 'x')).toBe(null);
  });
});

describe('aanmelding als eigen uitkomst', () => {
  it('KRITIEK: aanmelding is een geldige uitkomst met een eigen waarde', () => {
    // Niet 'afspraak' met een ander label: in een jaaroverzicht over alle
    // campagnes moet het verschil tussen een gesprek en een eventaanmelding
    // te tellen zijn.
    expect(validateOutcome({ id: '11111111-1111-1111-1111-111111111111', outcome: 'aanmelding' }))
      .toEqual({ value: { id: '11111111-1111-1111-1111-111111111111', outcome: 'aanmelding' } });
  });

  it('KRITIEK: alleen een afspraak zet iemand in Marketing > Leads', () => {
    // Die tab is de lijst van mensen die zich via de website hebben
    // aangemeld. Wie je in de outreach met de hand op aanmelding zet heb je
    // zelf al binnengekregen; een tweede rij daar voegt niets toe.
    expect(UITKOMSTEN_MET_LEAD.has('afspraak')).toBe(true);
    expect(UITKOMSTEN_MET_LEAD.has('aanmelding')).toBe(false);
    expect(UITKOMSTEN_MET_LEAD.has('geen_interesse')).toBe(false);
  });

  it('de activiteit bij een afspraak heet outreach_meeting', () => {
    expect(leadUitContact({ email: 'a@b.nl', first_name: 'Ann' }, 'AIBS').activity.event)
      .toBe('outreach_meeting');
  });
});

describe('een prospect zonder e-mailadres', () => {
  it('KRITIEK: levert geen lead op, maar dat mag de uitkomst niet tegenhouden', () => {
    // Speelt bij een afspraak met een LinkedIn-prospect: die hebben geen
    // adres. Dat gaf een harde fout, waardoor de uitkomst niet eens vastgelegd
    // kon worden. leadUitContact geeft null terug; het endpoint slaat de lead
    // dan over en bewaart de uitkomst.
    expect(leadUitContact({ first_name: 'Ann', last_name: 'Bos' }, 'Amsterdam 2026 LinkedIn'))
      .toBeNull();
    expect(leadUitContact({ email: '   ' }, 'x')).toBeNull();
  });

  it('met een adres komt de lead er gewoon', () => {
    const lead = leadUitContact({ email: 'A@B.nl', first_name: 'Ann' }, 'AIBS');
    expect(lead.fields.email).toBe('a@b.nl');
    expect(lead.activity.event).toBe('outreach_meeting');
  });
});
