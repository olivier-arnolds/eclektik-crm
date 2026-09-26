import { describe, it, expect } from 'vitest';
import { maakToken, normaliseerEmail, verdeelOntvangers } from './session-invite-ensure-lib.js';

describe('normaliseerEmail', () => {
  it('trimt en verkleint', () => {
    expect(normaliseerEmail('  Nel@Voorbeeld.NL ')).toBe('nel@voorbeeld.nl');
  });
  it('valt niet om op leegte', () => {
    expect(normaliseerEmail(null)).toBe('');
    expect(normaliseerEmail(undefined)).toBe('');
  });
});

describe('maakToken', () => {
  it('geeft 32 url-veilige tekens', () => {
    const t = maakToken();
    expect(t).toHaveLength(32);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('geeft niet twee keer hetzelfde', () => {
    const set = new Set(Array.from({ length: 50 }, () => maakToken()));
    expect(set.size).toBe(50);
  });
});

describe('verdeelOntvangers', () => {
  it('hergebruikt een bestaand token', () => {
    const uit = verdeelOntvangers(
      [{ email: 'nel@x.nl' }],
      [{ email: 'nel@x.nl', token: 'bestaand' }],
    );
    expect(uit.bestaand).toEqual(['nel@x.nl']);
    expect(uit.nieuw).toEqual([]);
    expect(uit.tokens['nel@x.nl']).toBe('bestaand');
  });

  it('matcht ondanks hoofdletters en spaties', () => {
    // Dit is de reden dat de unieke index op lower(btrim(email)) staat: zou dit
    // niet matchen, dan kreeg dezelfde persoon een tweede token en was de link
    // uit de eerste mail dood.
    const uit = verdeelOntvangers(
      [{ email: '  Nel@X.NL ' }],
      [{ email: 'nel@x.nl', token: 'bestaand' }],
    );
    expect(uit.nieuw).toEqual([]);
    expect(uit.tokens['nel@x.nl']).toBe('bestaand');
  });

  it('zet een onbekend adres in nieuw, met naam en bedrijf', () => {
    const uit = verdeelOntvangers(
      [{ email: 'jan@y.nl', first_name: 'Jan', company: 'Y bv', contact_id: 'c1' }],
      [],
    );
    expect(uit.bestaand).toEqual([]);
    expect(uit.nieuw).toEqual([
      { email: 'jan@y.nl', first_name: 'Jan', company: 'Y bv', contact_id: 'c1' },
    ]);
  });

  it('maakt een dubbel adres in de selectie maar een keer aan', () => {
    const uit = verdeelOntvangers(
      [{ email: 'jan@y.nl' }, { email: 'JAN@y.nl' }],
      [],
    );
    expect(uit.nieuw).toHaveLength(1);
  });

  it('zet een onbruikbaar adres apart in plaats van het te negeren', () => {
    const uit = verdeelOntvangers([{ email: 'geen-apenstaart' }, { email: '' }], []);
    expect(uit.nieuw).toEqual([]);
    expect(uit.ongeldig).toHaveLength(2);
    expect(uit.ongeldig[0].reden).toMatch(/e-mailadres/);
  });

  it('scheidt bestaand en nieuw in een gemengde lijst', () => {
    const uit = verdeelOntvangers(
      [{ email: 'a@x.nl' }, { email: 'b@x.nl' }, { email: 'c@x.nl' }],
      [{ email: 'a@x.nl', token: 't-a' }, { email: 'c@x.nl', token: 't-c' }],
    );
    expect(uit.bestaand.sort()).toEqual(['a@x.nl', 'c@x.nl']);
    expect(uit.nieuw.map(n => n.email)).toEqual(['b@x.nl']);
  });

  it('valt niet om op lege invoer', () => {
    const uit = verdeelOntvangers(null, null);
    expect(uit).toEqual({ bestaand: [], nieuw: [], ongeldig: [], tokens: {} });
  });
});
