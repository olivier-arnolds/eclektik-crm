import { describe, it, expect } from 'vitest';
import {
  splitsNaam, magMarketing, normMail, zoekBedrijf, contactVanLead, aanvullingenVoorContact,
} from './contact-van-lead.js';

describe('splitsNaam', () => {
  it('splitst op de eerste spatie, de rest is achternaam', () => {
    expect(splitsNaam('Jan de Vries')).toEqual({ first_name: 'Jan', last_name: 'de Vries' });
    expect(splitsNaam('Esther van Lunteren')).toEqual({ first_name: 'Esther', last_name: 'van Lunteren' });
  });

  it('gaat om met één naam, extra spaties en niets', () => {
    expect(splitsNaam('Prince')).toEqual({ first_name: 'Prince', last_name: null });
    expect(splitsNaam('  Jan   de Vries ')).toEqual({ first_name: 'Jan', last_name: 'de Vries' });
    expect(splitsNaam('')).toEqual({ first_name: null, last_name: null });
    expect(splitsNaam(null)).toEqual({ first_name: null, last_name: null });
  });
});

describe('magMarketing', () => {
  it('KRITIEK: alleen een duidelijk ja is toestemming', () => {
    for (const v of [true, 'true', 'ja', 'JA', 'yes', '1', 'on']) {
      expect(magMarketing({ consentMarketing: v })).toBe(true);
    }
  });

  it('een ontbrekend of onduidelijk vinkje is geen toestemming', () => {
    for (const v of [undefined, null, '', false, 'false', 'nee', 'no', '0', 'misschien']) {
      expect(magMarketing({ consentMarketing: v })).toBe(false);
    }
    expect(magMarketing({})).toBe(false);
    expect(magMarketing(null)).toBe(false);
  });
});

describe('normMail', () => {
  it('trimt en maakt kleine letters', () => {
    expect(normMail('  Jan@Voorbeeld.NL ')).toBe('jan@voorbeeld.nl');
    expect(normMail(null)).toBe('');
  });
});

describe('zoekBedrijf', () => {
  const bedrijven = [{ id: 'c1', name: 'Eneco' }, { id: 'c2', name: 'Sage Global Services' }];

  it('koppelt bij een exacte naam, hoofdletters en spaties maken niet uit', () => {
    expect(zoekBedrijf('eneco', bedrijven).id).toBe('c1');
    expect(zoekBedrijf('  Sage   Global Services ', bedrijven).id).toBe('c2');
  });

  it('KRITIEK: koppelt niet bij een gedeeltelijke match', () => {
    // Sage en Sage Global Services zijn verschillende klanten. Een contact aan
    // het verkeerde account hangen is erger dan een contact zonder account.
    expect(zoekBedrijf('Sage', bedrijven)).toBeNull();
    expect(zoekBedrijf('Eneco Belgie', bedrijven)).toBeNull();
  });

  it('geeft null bij lege invoer', () => {
    expect(zoekBedrijf('', bedrijven)).toBeNull();
    expect(zoekBedrijf('Eneco', null)).toBeNull();
  });
});

describe('contactVanLead', () => {
  const lead = {
    full_name: 'Jan de Vries', email: ' Jan@Voorbeeld.NL ', company: 'Eneco',
    role: 'HR Director', phone: null,
  };
  const payload = { phone: '0612345678', country: 'Netherlands', consentMarketing: true };

  it('zet de velden om, met genormaliseerd adres', () => {
    const c = contactVanLead(lead, payload, { owner: 'OA', companyId: 'c1' });
    expect(c).toMatchObject({
      full_name: 'Jan de Vries', first_name: 'Jan', last_name: 'de Vries',
      email: 'jan@voorbeeld.nl', title: 'HR Director', company_name: 'Eneco',
      company_id: 'c1', country: 'Netherlands', owner: 'OA',
      source: 'Website - marketing lead', marketing_content_opt_in: true,
    });
  });

  it('het nummer op de lead gaat voor dat uit het formulier', () => {
    // Een nummer dat met de hand is gezet, is opgezocht en dus het goede.
    expect(contactVanLead({ ...lead, phone: '+31611111111' }, payload).phone).toBe('+31611111111');
    expect(contactVanLead(lead, payload).phone).toBe('0612345678');
  });

  it('valt terug op het e-mailadres als er geen naam is', () => {
    const c = contactVanLead({ email: 'naamloos@voorbeeld.nl' }, {});
    expect(c.full_name).toBe('naamloos@voorbeeld.nl');
    expect(c.first_name).toBeNull();
  });

  it('zet de opt-in uit als de deelnemer niets aanvinkte', () => {
    expect(contactVanLead(lead, { consentMarketing: false }).marketing_content_opt_in).toBe(false);
    expect(contactVanLead(lead, {}).marketing_content_opt_in).toBe(false);
  });
});

describe('aanvullingenVoorContact', () => {
  it('vult alleen lege velden aan', () => {
    const bestaand = { first_name: 'Jan', last_name: null, title: 'CFO', phone: '' };
    const nieuw = { first_name: 'Johannes', last_name: 'de Vries', title: 'HR Director', phone: '0612345678' };
    expect(aanvullingenVoorContact(bestaand, nieuw))
      .toEqual({ last_name: 'de Vries', phone: '0612345678' });
  });

  it('KRITIEK: overschrijft nooit wat er al staat', () => {
    // Wat er staat is door een mens gezet of verrijkt. Een aanmeldformulier is
    // geen reden om dat te vervangen.
    const bestaand = { title: 'CFO', company_name: 'Eneco', company_id: 'c1' };
    const nieuw = { title: 'Iets anders', company_name: 'Anders BV', company_id: 'c9' };
    expect(aanvullingenVoorContact(bestaand, nieuw)).toEqual({});
  });

  it('zet de opt-in wel van uit naar aan, maar nooit andersom', () => {
    expect(aanvullingenVoorContact(
      { marketing_content_opt_in: false }, { marketing_content_opt_in: true },
    )).toEqual({ marketing_content_opt_in: true });

    // Een aanmelding zonder vinkje mag een eerder gegeven toestemming niet wissen.
    expect(aanvullingenVoorContact(
      { marketing_content_opt_in: true }, { marketing_content_opt_in: false },
    )).toEqual({});
  });

  it('koppelt een bedrijf alleen als er nog geen koppeling is', () => {
    expect(aanvullingenVoorContact({ company_id: null }, { company_id: 'c1' }))
      .toEqual({ company_id: 'c1' });
    expect(aanvullingenVoorContact({ company_id: 'c1' }, { company_id: null })).toEqual({});
  });

  it('gaat om met lege invoer', () => {
    expect(aanvullingenVoorContact(null, null)).toEqual({});
    expect(aanvullingenVoorContact({}, {})).toEqual({});
  });
});
