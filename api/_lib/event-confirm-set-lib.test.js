import { describe, it, expect } from 'vitest';
import { validateSet, setPatch } from './event-confirm-set-lib.js';

describe('validateSet', () => {
  it('accepteert ja en nee', () => {
    expect(validateSet({ email: 'A@B.com', answer: 'YES' }).value).toEqual({ email: 'a@b.com', answer: 'yes' });
    expect(validateSet({ email: 'a@b.com', answer: 'no' }).value.answer).toBe('no');
  });

  it('leest leeg, null en none als terug naar geen antwoord', () => {
    for (const a of ['', null, undefined, 'none', '  ']) {
      expect(validateSet({ email: 'a@b.com', answer: a }).value).toEqual({ email: 'a@b.com', answer: null });
    }
  });

  it('weigert een antwoord dat niets betekent', () => {
    expect(validateSet({ email: 'a@b.com', answer: 'misschien' }).error).toBeTruthy();
    expect(validateSet({ email: 'a@b.com', answer: true }).error).toBeTruthy();
  });

  it('weigert een adres dat geen adres is', () => {
    for (const e of ['', 'geenadres', 'a@b', null, 42]) {
      expect(validateSet({ email: e, answer: 'yes' }).error).toBeTruthy();
    }
    expect(validateSet(null).error).toBeTruthy();
  });
});

describe('setPatch', () => {
  const now = new Date('2026-10-26T10:00:00Z');

  it('KRITIEK: legt vast dat het met de hand gezet is', () => {
    // Zonder dit beweert de tabel dat de deelnemer zelf op de knop heeft
    // gedrukt, terwijl hij een mail heeft gestuurd.
    const p = setPatch({ answer: 'yes', door: 'olivier@eclectik.co' }, { answer_count: 0 }, now);
    expect(p.answer).toBe('yes');
    expect(p.answer_source).toBe('manual');
    expect(p.answer_by).toBe('olivier@eclectik.co');
    expect(p.answered_at).toBe(now.toISOString());
    expect(p.answer_count).toBe(1);
  });

  it('telt op bij een tweede antwoord', () => {
    expect(setPatch({ answer: 'no', door: 'x@eclectik.co' }, { answer_count: 2 }, now).answer_count).toBe(3);
  });

  it('KRITIEK: terugzetten naar niets telt niet als antwoord', () => {
    // Dat is een correctie van ons. Zou de teller oplopen, dan lijkt het alsof
    // de deelnemer van gedachten is veranderd.
    const p = setPatch({ answer: null, door: 'x@eclectik.co' }, { answer_count: 1 }, now);
    expect(p.answer).toBeNull();
    expect(p.answered_at).toBeNull();
    expect(p.answer_source).toBeNull();
    expect(p).not.toHaveProperty('answer_count');
  });

  it('werkt ook zonder bekende teller', () => {
    expect(setPatch({ answer: 'yes' }, null, now).answer_count).toBe(1);
    expect(setPatch({ answer: 'yes' }, {}, now).answer_by).toBeNull();
  });
});
