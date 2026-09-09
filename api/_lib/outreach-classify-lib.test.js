import { describe, it, expect } from 'vitest';
import { parseClassification, SYSTEM, VALID_CLASSIFICATIONS } from './outreach-classify-lib.js';

const ok = (o) => JSON.stringify({
  classification: 'interested', confidence: 0.9, summary: 'Vraagt naar het programma.',
  ooo_until: null, referral_name: null, referral_email: null, ...o,
});

describe('parseClassification - schone JSON', () => {
  it('leest de velden uit', () => {
    const r = parseClassification(ok());
    expect(r).toMatchObject({
      classification: 'interested', confidence: 0.9, summary: 'Vraagt naar het programma.',
      ooo_until: null, referral_name: null, referral_email: null,
    });
  });

  it('leest een referral met naam en adres', () => {
    const r = parseClassification(ok({
      classification: 'referral', confidence: 0.88,
      referral_name: 'Sanne de Boer', referral_email: 'sanne@ing.com',
    }));
    expect(r.classification).toBe('referral');
    expect(r.referral_name).toBe('Sanne de Boer');
    expect(r.referral_email).toBe('sanne@ing.com');
  });

  it('leest een ooo met terugkeerdatum', () => {
    const r = parseClassification(ok({ classification: 'ooo', confidence: 0.97, ooo_until: '2026-10-01' }));
    expect(r.classification).toBe('ooo');
    expect(r.ooo_until).toBe('2026-10-01');
  });
});

describe('parseClassification - rommel eromheen', () => {
  it('haalt JSON uit een codeblok', () => {
    expect(parseClassification('```json\n' + ok() + '\n```').classification).toBe('interested');
  });

  it('haalt JSON uit een antwoord met een praatje ervoor', () => {
    expect(parseClassification('Hier is de classificatie:\n' + ok()).classification).toBe('interested');
  });

  it('haalt JSON met tekst er voor EN na', () => {
    expect(parseClassification('Let op: ' + ok() + ' Einde.').classification).toBe('interested');
  });
});

describe('parseClassification - degradeert veilig', () => {
  it('geeft null bij tekst zonder JSON', () => {
    expect(parseClassification('Ik denk dat deze persoon geinteresseerd is.')).toBeNull();
  });

  it('geeft null bij kapotte JSON', () => {
    expect(parseClassification('{"classification": "interested", "confidence":')).toBeNull();
  });

  it('geeft null bij leeg of onzin', () => {
    expect(parseClassification('')).toBeNull();
    expect(parseClassification(null)).toBeNull();
    expect(parseClassification(undefined)).toBeNull();
    expect(parseClassification('{}')).not.toBeNull();   // wel een object, maar zonder label
    expect(parseClassification('{}').classification).toBeNull();
    expect(parseClassification('{}').confidence).toBe(0);
  });

  it('KRITIEK: een verzonnen label komt niet door en krijgt confidence 0', () => {
    const r = parseClassification(ok({ classification: 'maybe', confidence: 0.99 }));
    expect(r.classification).toBeNull();
    expect(r.confidence).toBe(0);       // anders zou 'maybe' ongezien de statusmachine in lopen
  });

  it('normaliseert hoofdletters in het label', () => {
    expect(parseClassification(ok({ classification: 'INTERESTED' })).classification).toBe('interested');
  });

  it('klemt de confidence tussen 0 en 1', () => {
    expect(parseClassification(ok({ confidence: 5 })).confidence).toBe(1);
    expect(parseClassification(ok({ confidence: -2 })).confidence).toBe(0);
  });

  it('een niet-numerieke confidence wordt 0, dus review', () => {
    expect(parseClassification(ok({ confidence: 'hoog' })).confidence).toBe(0);
  });

  it("de string 'null' wordt echt null, geen tekst", () => {
    const r = parseClassification(ok({ ooo_until: 'null', referral_name: 'null', referral_email: 'NULL' }));
    expect(r.ooo_until).toBeNull();
    expect(r.referral_name).toBeNull();
    expect(r.referral_email).toBeNull();
  });

  it('kapt een absurd lange samenvatting af', () => {
    expect(parseClassification(ok({ summary: 'x'.repeat(900) })).summary).toHaveLength(500);
  });
});

describe('de prompt zelf', () => {
  it('noemt alle geldige classificaties, zodat parser en prompt niet uit elkaar lopen', () => {
    for (const label of VALID_CLASSIFICATIONS) expect(SYSTEM).toContain(label);
  });

  it('vraagt expliciet om JSON zonder codeblok', () => {
    expect(SYSTEM).toMatch(/ALLEEN geldige JSON/);
  });
});
