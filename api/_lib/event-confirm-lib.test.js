import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DEADLINE, deadlineAt, isClosed, looksLikeToken, validateRequest, answerPatch,
} from './event-confirm-lib.js';

describe('deadline', () => {
  it('staat standaard op het einde van het event zelf', () => {
    // 17 november 2026 16:30 CET is 15:30 UTC. CET en niet CEST: de zomertijd
    // is in november voorbij, dus het verschil is een uur en niet twee.
    expect(DEFAULT_DEADLINE).toBe('2026-11-17T15:30:00Z');
  });

  it('is te verzetten met een env-var', () => {
    expect(deadlineAt({ EVENT_CONFIRM_DEADLINE: '2026-12-01T10:00:00Z' }).toISOString())
      .toBe('2026-12-01T10:00:00.000Z');
  });

  it('KRITIEK: een onleesbare env-var valt terug op de vaste datum', () => {
    // Zou een typefout hier een Invalid Date opleveren, dan is elke vergelijking
    // false en blijft de link voor altijd open, of juist voor altijd dicht.
    expect(deadlineAt({ EVENT_CONFIRM_DEADLINE: 'morgen' }).toISOString())
      .toBe(new Date(DEFAULT_DEADLINE).toISOString());
  });

  it('sluit pas na het event', () => {
    expect(isClosed(new Date('2026-11-17T15:29:00Z'))).toBe(false);
    expect(isClosed(new Date('2026-11-17T15:31:00Z'))).toBe(true);
  });
});

describe('looksLikeToken', () => {
  it('volgt de vorm die de website al controleert', () => {
    expect(looksLikeToken('a'.repeat(22))).toBe(true);
    expect(looksLikeToken('A-b_9'.repeat(10))).toBe(true);
    expect(looksLikeToken('a'.repeat(21))).toBe(false);
    expect(looksLikeToken('a'.repeat(129))).toBe(false);
    expect(looksLikeToken('token met spaties en meer dan 22')).toBe(false);
    expect(looksLikeToken(null)).toBe(false);
  });
});

describe('validateRequest', () => {
  const token = 'x'.repeat(24);

  it('accepteert lookup', () => {
    expect(validateRequest({ action: 'lookup', token }).value).toEqual({ action: 'lookup', token });
  });

  it('accepteert answer met ja of nee', () => {
    expect(validateRequest({ action: 'answer', token, answer: 'YES ' }).value.answer).toBe('yes');
    expect(validateRequest({ action: 'answer', token, answer: 'no' }).value.answer).toBe('no');
  });

  it('weigert een antwoord dat geen ja of nee is', () => {
    for (const answer of ['misschien', '', null, true]) {
      expect(validateRequest({ action: 'answer', token, answer }).error).toBeTruthy();
    }
  });

  it('weigert een onbekende actie en een lege body', () => {
    expect(validateRequest({ action: 'delete', token }).error).toBeTruthy();
    expect(validateRequest(null).error).toBeTruthy();
    expect(validateRequest({ action: 'lookup' }).error).toBeTruthy();
  });

  it('lookup heeft geen answer nodig', () => {
    expect(validateRequest({ action: 'lookup', token }).error).toBeUndefined();
  });
});

describe('answerPatch', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it('legt het antwoord en het moment vast', () => {
    const p = answerPatch({ answer: 'yes' }, { answer_count: 0 }, now);
    expect(p.answer).toBe('yes');
    expect(p.answered_at).toBe(now.toISOString());
    expect(p.answer_count).toBe(1);
  });

  it('KRITIEK: een tweede antwoord overschrijft en telt op', () => {
    // Iemand mag zich bedenken en de link opnieuw openen. Het laatste antwoord
    // wint; de teller laat zien dat er geschoven is.
    const p = answerPatch({ answer: 'no' }, { answer: 'yes', answer_count: 1 }, now);
    expect(p.answer).toBe('no');
    expect(p.answer_count).toBe(2);
  });

  it('telt netjes door bij een ontbrekende teller', () => {
    expect(answerPatch({ answer: 'yes' }, {}, now).answer_count).toBe(1);
    expect(answerPatch({ answer: 'yes' }, null, now).answer_count).toBe(1);
  });
});
