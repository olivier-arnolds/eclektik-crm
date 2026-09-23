import { describe, it, expect } from 'vitest';
import { kiesBerichttekst, schoon, knipCitaat, kort } from './mail-body';

describe('kiesBerichttekst', () => {
  it('neemt uniqueBody, want dat is het antwoord zonder de geciteerde keten', () => {
    const b = {
      uniqueBody: { content: 'Dank, maar ik kan er niet bij zijn.' },
      body: { content: 'Dank, maar ik kan er niet bij zijn.\n\nVan: Marco\nKom je?' },
    };
    expect(kiesBerichttekst(b)).toBe('Dank, maar ik kan er niet bij zijn.');
  });

  it('valt terug op body als Graph uniqueBody leeg laat', () => {
    expect(kiesBerichttekst({ uniqueBody: { content: '  ' }, body: { content: 'Hallo' } }))
      .toBe('Hallo');
  });

  it('knipt bij die terugval de geciteerde geschiedenis eraf', () => {
    const b = { body: { content: 'Ik stuur je collega door.\n\nVan: Marco Ross\nOnderwerp: uitnodiging' } };
    expect(kiesBerichttekst(b)).toBe('Ik stuur je collega door.');
  });

  it('geeft null als er niets is', () => {
    expect(kiesBerichttekst({})).toBeNull();
    expect(kiesBerichttekst(null)).toBeNull();
  });
});

describe('schoon', () => {
  it('haalt HTML weg als de Prefer-header niet is aangekomen', () => {
    const html = '<html><body><p>Hoi Marco,</p><p>Leuk aanbod &amp; dank.</p></body></html>';
    expect(schoon(html)).toBe('Hoi Marco,\nLeuk aanbod & dank.');
  });

  it('maakt van CRLF en harde spaties gewone tekst', () => {
    expect(schoon('regel een\r\n regel twee')).toBe('regel een\n regel twee');
  });

  it('vouwt drie of meer lege regels samen', () => {
    expect(schoon('boven\n\n\n\n\nonder')).toBe('boven\n\nonder');
  });

  it('geeft null bij leeg', () => {
    expect(schoon('   ')).toBeNull();
    expect(schoon(null)).toBeNull();
  });
});

describe('knipCitaat', () => {
  it('herkent de Nederlandse en Engelse varianten', () => {
    expect(knipCitaat('Mijn antwoord.\n\nOp 21 sep 2026 schreef Marco Ross:\n> oude tekst'))
      .toBe('Mijn antwoord.');
    expect(knipCitaat('My reply.\n\nOn Sep 21 2026, Marco wrote:\n> old'))
      .toBe('My reply.');
    expect(knipCitaat('Antwoord.\n----- Original Message -----\noud'))
      .toBe('Antwoord.');
  });

  it('houdt alles als het citaat meteen bovenaan staat', () => {
    // Anders houd je een leeg bericht over, en een lege classificatie is erger
    // dan een classificatie met wat ruis erbij.
    const t = 'Van: Marco\nKom je?';
    expect(knipCitaat(t)).toBe(t);
  });

  it('laat een bericht zonder citaat heel', () => {
    expect(knipCitaat('Gewoon een antwoord zonder keten.')).toBe('Gewoon een antwoord zonder keten.');
  });
});

describe('kort', () => {
  it('breekt niet midden in een woord af', () => {
    const lang = `${'woord '.repeat(120)}einde`;
    const k = kort(lang, 100);
    expect(k.length).toBeLessThanOrEqual(101);
    expect(k.endsWith('…')).toBe(true);
    expect(k).not.toMatch(/wo…$/);
  });

  it('laat korte tekst met rust', () => {
    expect(kort('kort', 100)).toBe('kort');
  });
});
