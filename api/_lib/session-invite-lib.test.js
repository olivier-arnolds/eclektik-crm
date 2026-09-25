import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DEADLINE, deadlineAt, isClosed, looksLikeToken, normalizeSlots, normalizeNote,
  validateRequest, clickPatch, confirmPatch, submitPatch,
} from './session-invite-lib.js';

const VOOR = new Date('2026-10-01T12:00:00Z');   // ruim voor de deadline
const NA = new Date('2026-10-23T08:00:00Z');     // erna

describe('deadline', () => {
  it('sluit na 22 oktober 2026 23:59 CEST en niet ervoor', () => {
    expect(isClosed(VOOR, {})).toBe(false);
    expect(isClosed(NA, {})).toBe(true);
    // Precies op de seconde van de deadline is het nog open.
    expect(isClosed(new Date(DEFAULT_DEADLINE), {})).toBe(false);
    expect(isClosed(new Date('2026-10-22T22:00:00Z'), {})).toBe(true);
  });

  it('laat zich verzetten met de env-var', () => {
    const env = { SESSION_INVITE_DEADLINE: '2026-11-01T00:00:00Z' };
    expect(isClosed(NA, env)).toBe(false);
    expect(deadlineAt(env).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('valt terug op het contract als de env-var onleesbaar is', () => {
    const env = { SESSION_INVITE_DEADLINE: 'volgende week dinsdag' };
    expect(deadlineAt(env).toISOString()).toBe(new Date(DEFAULT_DEADLINE).toISOString());
  });
});

describe('looksLikeToken', () => {
  it('accepteert een url-safe token van minstens 22 tekens', () => {
    expect(looksLikeToken('a'.repeat(22))).toBe(true);
    expect(looksLikeToken('Ab9_-Ab9_-Ab9_-Ab9_-Ab9_-')).toBe(true);
  });

  it('weigert te korte, te lange en niet-url-safe tokens', () => {
    for (const bad of ['a'.repeat(21), 'a'.repeat(129), `${'a'.repeat(21)}.`, `${'a'.repeat(21)}/`,
      `${'a'.repeat(21)} `, null, undefined, 42, {}]) {
      expect(looksLikeToken(bad)).toBe(false);
    }
  });
});

describe('validateRequest', () => {
  const token = 'x'.repeat(24);

  it('accepteert een click met antwoord en botvlag', () => {
    expect(validateRequest({ action: 'click', token, answer: 'yes', botSuspected: true }).value)
      .toEqual({ action: 'click', token, answer: 'yes', botSuspected: true });
  });

  it('telt alleen een echte boolean als botvermoeden', () => {
    const v = validateRequest({ action: 'click', token, answer: 'no', botSuspected: 'false' }).value;
    expect(v.botSuspected).toBe(false);
  });

  it('weigert een onbekende actie en een ontbrekend token', () => {
    expect(validateRequest({ action: 'delete', token, answer: 'yes' }).error).toBeTruthy();
    expect(validateRequest({ action: 'click', answer: 'yes' }).error).toBeTruthy();
    expect(validateRequest({ action: 'click', token: '   ', answer: 'yes' }).error).toBeTruthy();
    expect(validateRequest(null).error).toBeTruthy();
    expect(validateRequest('token=abc').error).toBeTruthy();
  });

  it('weigert een antwoord dat geen ja of nee is', () => {
    for (const bad of ['maybe', '', 1, true, null, undefined]) {
      expect(validateRequest({ action: 'confirm', token, answer: bad }).error, String(bad)).toBeTruthy();
    }
  });

  it('laat een submit zonder vinkjes door, want dat is bruikbare informatie', () => {
    expect(validateRequest({ action: 'submit', token, slots: [], note: null }).value)
      .toEqual({ action: 'submit', token, slots: [], note: null });
    expect(validateRequest({ action: 'submit', token }).value.slots).toEqual([]);
  });

  it('geeft een token dat er raar uitziet niet meteen terug als fout', () => {
    // Vormcontrole van het token hoort bij looksLikeToken, niet hier: een 400 op
    // een te kort token zou verraden welke tokens wel bestaan.
    expect(validateRequest({ action: 'click', token: 'kort', answer: 'yes' }).error).toBeFalsy();
  });
});

describe('normalizeSlots', () => {
  it('accepteert de drie momenten uit het contract', () => {
    const slots = ['slot-2026-10-29', 'slot-2026-11-04', 'slot-2026-11-05'];
    expect(normalizeSlots(slots).value).toEqual(slots);
  });

  it('ontdubbelt en houdt de volgorde', () => {
    expect(normalizeSlots(['slot-2026-11-04', 'slot-2026-10-29', 'slot-2026-11-04']).value)
      .toEqual(['slot-2026-11-04', 'slot-2026-10-29']);
  });

  it('weigert iets anders dan een slot-id', () => {
    for (const bad of [['zomaar wat'], ['slot-2026-13'], [123], [null], ['slot-2026-10-29;drop'],
      'slot-2026-10-29', {}, Array(11).fill('slot-2026-10-29')]) {
      expect(normalizeSlots(bad).error, JSON.stringify(bad)).toBeTruthy();
    }
  });

  it('leest niets als niets', () => {
    expect(normalizeSlots(undefined).value).toEqual([]);
    expect(normalizeSlots(null).value).toEqual([]);
  });
});

describe('normalizeNote', () => {
  it('trimt, maakt leeg naar null en kapt af', () => {
    expect(normalizeNote('  hoi  ').value).toBe('hoi');
    expect(normalizeNote('   ').value).toBe(null);
    expect(normalizeNote(null).value).toBe(null);
    expect(normalizeNote('a'.repeat(5000)).value.length).toBe(2000);
  });

  it('weigert een niet-string', () => {
    expect(normalizeNote(42).error).toBeTruthy();
    expect(normalizeNote({}).error).toBeTruthy();
  });
});

describe('clickPatch', () => {
  it('raakt answer niet aan, ook niet als er al een antwoord staat', () => {
    const patch = clickPatch({ click_count: 2, bot_suspected: false, answer: 'yes', confirmed: true },
      { answer: 'no', botSuspected: false }, VOOR);
    expect(Object.keys(patch).sort())
      .toEqual(['bot_suspected', 'click_count', 'pending_answer', 'pending_at', 'updated_at']);
    expect(patch.pending_answer).toBe('no');
    expect(patch.click_count).toBe(3);
  });

  it('begint bij nul als de teller nog leeg is', () => {
    expect(clickPatch({}, { answer: 'yes', botSuspected: false }, VOOR).click_count).toBe(1);
    expect(clickPatch(null, { answer: 'yes', botSuspected: false }, VOOR).click_count).toBe(1);
  });

  it('houdt het botvermoeden vast zodra het een keer true was', () => {
    expect(clickPatch({ bot_suspected: true }, { answer: 'yes', botSuspected: false }, VOOR).bot_suspected)
      .toBe(true);
    expect(clickPatch({ bot_suspected: false }, { answer: 'yes', botSuspected: true }, VOOR).bot_suspected)
      .toBe(true);
    expect(clickPatch({ bot_suspected: false }, { answer: 'yes', botSuspected: false }, VOOR).bot_suspected)
      .toBe(false);
  });
});

describe('confirmPatch', () => {
  it('schrijft het antwoord van de pagina, niet het provisionele antwoord', () => {
    // Scanner klikte 'no' (staat in pending_answer), de bezoeker bevestigt 'yes'.
    const patch = confirmPatch({ answer: 'yes' }, VOOR);
    expect(patch.answer).toBe('yes');
    expect(patch.confirmed).toBe(true);
    expect(patch.answer_at).toBe(VOOR.toISOString());
    expect(patch.confirmed_at).toBe(VOOR.toISOString());
    expect(patch.pending_answer).toBeUndefined();
  });

  it('mag een bevestigd antwoord overschrijven, want mensen bedenken zich', () => {
    // Eerst nee, dan ja: de tweede confirm wint. De rij wordt niet bevroren.
    expect(confirmPatch({ answer: 'no' }, VOOR).answer).toBe('no');
    expect(confirmPatch({ answer: 'yes' }, VOOR).answer).toBe('yes');
  });
});

describe('submitPatch', () => {
  it('zet submitted_at ook bij nul vinkjes', () => {
    const patch = submitPatch({ slots: [], note: null }, VOOR);
    expect(patch).toEqual({
      slots: [], note: null, submitted_at: VOOR.toISOString(), updated_at: VOOR.toISOString(),
    });
  });

  it('raakt answer en confirmed niet aan', () => {
    const patch = submitPatch({ slots: ['slot-2026-10-29'], note: 'graag over eNPS' }, VOOR);
    expect(patch.answer).toBeUndefined();
    expect(patch.confirmed).toBeUndefined();
  });
});
