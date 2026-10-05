import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DEADLINE, deadlineAt, isClosed, looksLikeToken, normalizeSlots, normalizeNote,
  validateRequest, clickPatch, confirmPatch, submitPatch, isRuis,
  registerOutcome, registerPatch,
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
      // Sinds de interne aanmeldroute: een submit is een antwoord van de klant zelf.
      source: 'email_link', registered_by: null,
    });
  });

  it('raakt answer en confirmed niet aan', () => {
    const patch = submitPatch({ slots: ['slot-2026-10-29'], note: 'graag over eNPS' }, VOOR);
    expect(patch.answer).toBeUndefined();
    expect(patch.confirmed).toBeUndefined();
  });
});

describe('ruisVenster', () => {
  const AANGEMAAKT = '2026-09-28T07:32:14Z';

  it('een antwoord binnen drie minuten is ruis', () => {
    // Gemeten bij de eerste echte verzending: elf van de dertien antwoorden
    // vielen tussen 47 en 105 seconden na verzenden, geen daarvan vulde data of
    // een opmerking in. Daarna een gat tot 316 seconden, waar de eerste echte
    // reactie zat. De grens ligt in dat gat.
    expect(isRuis({ aangemaaktISO: AANGEMAAKT, antwoordISO: '2026-09-28T07:33:01Z' })).toBe(true);
    expect(isRuis({ aangemaaktISO: AANGEMAAKT, antwoordISO: '2026-09-28T07:35:13Z' })).toBe(true);
  });

  it('een antwoord daarna telt gewoon', () => {
    expect(isRuis({ aangemaaktISO: AANGEMAAKT, antwoordISO: '2026-09-28T07:37:30Z' })).toBe(false);
    expect(isRuis({ aangemaaktISO: AANGEMAAKT, antwoordISO: '2026-09-29T09:00:00Z' })).toBe(false);
  });

  it('precies op de grens telt niet als ruis', () => {
    expect(isRuis({ aangemaaktISO: AANGEMAAKT, antwoordISO: '2026-09-28T07:35:14Z' })).toBe(false);
  });

  it('zonder bruikbare tijden geen oordeel', () => {
    expect(isRuis({})).toBe(false);
    expect(isRuis({ aangemaaktISO: AANGEMAAKT })).toBe(false);
    expect(isRuis({ aangemaaktISO: 'onzin', antwoordISO: 'ook onzin' })).toBe(false);
  });
});

// ── Interne aanmelding via /s/intern ──────────────────────────────────────────

describe('validateRequest bij action register', () => {
  const basis = {
    action: 'register', email: 'Klant@Voorbeeld.com ', slots: ['slot-2026-10-29'],
    note: ' Wil iets over adoptie ', registeredBy: ' Collega@Eclectik.co ', confirmOverwrite: false,
  };

  it('normaliseert e-mail en opmerking en neemt de slots over', () => {
    const { value, error } = validateRequest(basis);
    expect(error).toBeUndefined();
    expect(value.email).toBe('klant@voorbeeld.com');
    expect(value.registeredBy).toBe('collega@eclectik.co');
    expect(value.note).toBe('Wil iets over adoptie');
    expect(value.slots).toEqual(['slot-2026-10-29']);
    expect(value.confirmOverwrite).toBe(false);
  });

  it('accepteert een lege slotlijst, dat is een echt antwoord', () => {
    const { value, error } = validateRequest({ ...basis, slots: [] });
    expect(error).toBeUndefined();
    expect(value.slots).toEqual([]);
  });

  it('weigert een adres dat geen adres is', () => {
    for (const email of ['', '   ', 'geenadres', 'a@b', null, 42]) {
      expect(validateRequest({ ...basis, email }).error).toBeTruthy();
    }
  });

  it('KRITIEK: weigert een registeredBy buiten eclectik.co', () => {
    // Het endpoint is publiek bereikbaar met alleen het gedeelde geheim. Zonder
    // deze eis kan een aanmelding op naam van een willekeurig adres gezet worden.
    expect(validateRequest({ ...basis, registeredBy: 'iemand@gmail.com' }).error).toBeTruthy();
    expect(validateRequest({ ...basis, registeredBy: 'x@eclectik.co.evil.com' }).error).toBeTruthy();
    expect(validateRequest({ ...basis, registeredBy: null }).error).toBeTruthy();
  });

  it('weigert een onbekend slot', () => {
    expect(validateRequest({ ...basis, slots: ['slot-2026-12-01'] }).error).toBeTruthy();
    expect(validateRequest({ ...basis, slots: ['maandag'] }).error).toBeTruthy();
  });

  it('telt alleen een echte boolean als bevestiging om te overschrijven', () => {
    expect(validateRequest({ ...basis, confirmOverwrite: 'true' }).value.confirmOverwrite).toBe(false);
    expect(validateRequest({ ...basis, confirmOverwrite: true }).value.confirmOverwrite).toBe(true);
  });

  it('vraagt geen token, anders dan de andere drie acties', () => {
    expect(validateRequest(basis).error).toBeUndefined();
  });
});

describe('registerOutcome', () => {
  const inzending = { email: 'k@v.com', slots: ['slot-2026-11-04'], note: null, registeredBy: 'c@eclectik.co' };

  it('maakt een nieuwe rij als het adres onbekend is', () => {
    expect(registerOutcome(null, { ...inzending, confirmOverwrite: false }).kind).toBe('insert');
  });

  it('werkt een uitnodiging zonder antwoord gewoon bij', () => {
    const rij = { id: '1', answer: null, confirmed: false, source: 'email_link' };
    expect(registerOutcome(rij, { ...inzending, confirmOverwrite: false }).kind).toBe('update');
  });

  it('KRITIEK: vraagt om bevestiging als de klant zelf al geantwoord heeft', () => {
    const rij = { id: '1', answer: 'no', confirmed: true, source: 'email_link', slots: ['slot-2026-10-29'], note: null };
    const r = registerOutcome(rij, { ...inzending, confirmOverwrite: false });
    expect(r.kind).toBe('needs_confirm');
    expect(r.existing).toEqual({ answer: 'no', slots: ['slot-2026-10-29'], note: null });
  });

  it('schrijft wel door als de collega bevestigt', () => {
    const rij = { id: '1', answer: 'no', confirmed: true, source: 'email_link' };
    expect(registerOutcome(rij, { ...inzending, confirmOverwrite: true }).kind).toBe('update');
  });

  it('KRITIEK: een tweede identieke aanmelding vraagt niets, die is idempotent', () => {
    // De website beschermt niet tegen dubbel klikken op Register. Zou een eerder
    // intern antwoord ook needs_confirm opleveren, dan krijgt de collega bij de
    // tweede klik een vraag over zijn eigen invoer van een seconde eerder.
    const rij = { id: '1', answer: 'yes', confirmed: true, source: 'internal', registered_by: 'c@eclectik.co' };
    expect(registerOutcome(rij, { ...inzending, confirmOverwrite: false }).kind).toBe('update');
  });

  it('een antwoord dat als ruis is gemarkeerd telt niet als antwoord van de klant', () => {
    const rij = { id: '1', answer: 'no', confirmed: true, source: 'email_link', bot_suspected: true };
    expect(registerOutcome(rij, { ...inzending, confirmOverwrite: false }).kind).toBe('update');
  });

  it('een klik zonder bevestiging houdt de aanmelding niet tegen', () => {
    const rij = { id: '1', answer: null, confirmed: false, pending_answer: 'no', source: 'email_link' };
    expect(registerOutcome(rij, { ...inzending, confirmOverwrite: false }).kind).toBe('update');
  });
});

describe('registerPatch', () => {
  const now = new Date('2026-10-05T10:00:00Z');

  it('zet ja, bevestigd, en legt de collega vast', () => {
    const p = registerPatch({ slots: ['slot-2026-11-05'], note: 'x', registeredBy: 'c@eclectik.co' }, now);
    expect(p.answer).toBe('yes');
    expect(p.confirmed).toBe(true);
    expect(p.source).toBe('internal');
    expect(p.registered_by).toBe('c@eclectik.co');
    expect(p.submitted_at).toBe(now.toISOString());
    expect(p.slots).toEqual(['slot-2026-11-05']);
  });

  it('KRITIEK: haalt een eerdere ruismarkering weg', () => {
    // Een collega die iemand na een echt gesprek aanmeldt weet zeker dat het een
    // mens is. Bleef bot_suspected staan, dan valt die deelnemer uit de telling.
    expect(registerPatch({ slots: [], note: null, registeredBy: 'c@eclectik.co' }, now).bot_suspected).toBe(false);
  });
});

describe('herkomst bij de acties van de klant', () => {
  it('confirm en submit leggen vast dat de klant zelf antwoordde', () => {
    for (const p of [confirmPatch({ answer: 'yes' }), submitPatch({ slots: [], note: null })]) {
      expect(p.source).toBe('email_link');
      expect(p.registered_by).toBeNull();
    }
  });

  it('KRITIEK: een klik raakt de herkomst niet aan', () => {
    // Linkscanners klikken. Zou een klik de herkomst omzetten, dan wist de
    // scanner van Outlook het spoor van de collega die iemand had aangemeld.
    const p = clickPatch({ click_count: 0 }, { answer: 'yes', botSuspected: false });
    expect(p).not.toHaveProperty('source');
    expect(p).not.toHaveProperty('registered_by');
  });
});
