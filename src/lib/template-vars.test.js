import { describe, it, expect } from 'vitest';
import { renderTemplate, varsForContact, KNOWN_VARS, bevatToken, TOKEN_VAR } from './template-vars';

describe('renderTemplate', () => {
  it('vult een bekende variabele in', () => {
    expect(renderTemplate('Hi {{first_name}},', { first_name: 'Marco' })).toBe('Hi Marco,');
  });

  it('laat spaties binnen de accolades toe', () => {
    expect(renderTemplate('Hi {{ first_name }},', { first_name: 'Marco' })).toBe('Hi Marco,');
  });

  it('strijkt een onbekende plaatshouder weg', () => {
    // Bestaand gedrag, bewust niet gewijzigd. Wel de reden dat {{token}} een
    // bekende variabele moest worden: als onbekende naam werd hij stilletjes
    // een lege string en kwam er een dode link in de mail.
    expect(renderTemplate('a{{verzonnen}}b', {})).toBe('ab');
  });

  it('een ontbrekende bekende variabele wordt leeg', () => {
    expect(renderTemplate('Hi {{first_name}},', {})).toBe('Hi ,');
  });
});

describe('token als variabele', () => {
  it('token staat in de whitelist', () => {
    expect(KNOWN_VARS).toContain('token');
    expect(TOKEN_VAR).toBe('token');
  });

  it('vult het token in', () => {
    const uit = renderTemplate('?t={{token}}&a=yes', { token: 'abc123' });
    expect(uit).toBe('?t=abc123&a=yes');
  });

  it('varsForContact geeft het token door als het contact er een heeft', () => {
    expect(varsForContact({ first_name: 'Nel', token: 'xyz' }).token).toBe('xyz');
  });

  it('varsForContact geeft een lege token als er geen is', () => {
    expect(varsForContact({ first_name: 'Nel' }).token).toBe('');
  });
});

describe('bevatToken', () => {
  it('herkent de plaatshouder', () => {
    expect(bevatToken('klik hier: ?t={{token}}')).toBe(true);
    expect(bevatToken('klik hier: ?t={{ token }}')).toBe(true);
  });

  it('is onwaar zonder de plaatshouder', () => {
    expect(bevatToken('Hi {{first_name}}, tot dan')).toBe(false);
    expect(bevatToken('')).toBe(false);
    expect(bevatToken(null)).toBe(false);
  });

  it('trapt niet in een naam die er op lijkt', () => {
    expect(bevatToken('{{tokens}}')).toBe(false);
    expect(bevatToken('{{my_token}}')).toBe(false);
  });
});

describe('hoofdletters in een plaatshouder', () => {
  // {{TOKEN}} in een knoplink werd een onbekende naam en dus een lege string.
  // De knop zag er goed uit en de link was dood; precies de stille fout waar
  // deze hele reeks om draait.
  it('vult {{TOKEN}} net zo goed in als {{token}}', () => {
    expect(renderTemplate('?t={{TOKEN}}', { token: 'abc' })).toBe('?t=abc');
    expect(renderTemplate('?t={{Token}}', { token: 'abc' })).toBe('?t=abc');
  });

  it('herkent {{TOKEN}} als tokenmodus', () => {
    expect(bevatToken('?t={{TOKEN}}')).toBe(true);
    expect(bevatToken('?t={{ Token }}')).toBe(true);
  });

  it('geldt ook voor de andere variabelen', () => {
    expect(renderTemplate('Hi {{First_Name}},', { first_name: 'Nel' })).toBe('Hi Nel,');
  });

  it('een echt onbekende naam blijft weggestreken', () => {
    expect(renderTemplate('a{{VERZONNEN}}b', {})).toBe('ab');
  });
});
