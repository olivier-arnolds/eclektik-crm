// Pure helpers voor api/event-confirm.js, apart zodat vitest ze zonder Supabase
// kan toetsen. (Bestanden onder api/_lib worden niet als endpoint gedeployed.)
//
// Contract: eclectik-website api/e/_event-confirm.ts, commit 98bbd5d.
//
// De twee acties:
//   lookup  schrijft niets en geeft alleen de voornaam voor de aanhef terug.
//   answer  legt ja of nee vast, met het moment erbij.
//
// Waarom dit los staat van session-invite-lib.js, dat erop lijkt: daar zit een
// bevestigingsstap tussen klik en antwoord, hier niet. De uitnodiging voor de
// user session ging naar een koude lijst waar linkscanners antwoorden zaten te
// zetten; deze mail gaat naar mensen die zich al hadden ingeschreven, en de
// website heeft bewust voor één klik gekozen. Die twee modellen door elkaar
// halen in één bestand levert een web van ifs op dat niemand meer naleest.

// Het event loopt af op 17 november 2026 om 16:30 CET. In november geldt CET en
// niet CEST, dus een uur verschil met UTC, geen twee.
export const DEFAULT_DEADLINE = '2026-11-17T15:30:00Z';

export function deadlineAt(env = process.env) {
  const raw = (env && env.EVENT_CONFIRM_DEADLINE) || DEFAULT_DEADLINE;
  const at = new Date(raw);
  // Een typefout in de env-var mag de link niet stilletjes voor altijd open- of
  // dichtzetten: een Invalid Date maakt elke vergelijking false.
  return Number.isNaN(at.getTime()) ? new Date(DEFAULT_DEADLINE) : at;
}

export function isClosed(now = new Date(), env = process.env) {
  return now.getTime() > deadlineAt(env).getTime();
}

const ACTIONS = new Set(['lookup', 'answer']);
const ANSWERS = new Set(['yes', 'no']);

// Exact de vorm die de website al controleert voordat hij ons belt. Een token
// dat hier niet aan voldoet staat ook niet in de tabel, dus dat scheelt een
// query, en het antwoord is hetzelfde generieke unknown_token.
const TOKEN_RE = /^[A-Za-z0-9_-]{22,128}$/;

export function looksLikeToken(raw) {
  return typeof raw === 'string' && TOKEN_RE.test(raw);
}

export function validateRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!ACTIONS.has(action)) return { error: 'Unsupported action' };
  if (typeof body.token !== 'string' || !body.token.trim()) return { error: 'Missing token' };
  const token = body.token.trim();

  if (action === 'lookup') return { value: { action, token } };

  const answer = typeof body.answer === 'string' ? body.answer.trim().toLowerCase() : '';
  if (!ANSWERS.has(answer)) return { error: 'Invalid answer' };
  return { value: { action, token, answer } };
}

/**
 * De kolommen die een antwoord schrijft.
 *
 * Een tweede antwoord overschrijft gewoon: iemand mag zich bedenken en de link
 * opnieuw openen, en dat staat ook zo in het contract. answer_count laat zien
 * dat er geschoven is, zodat een heen-en-weer niet onzichtbaar blijft.
 */
export function answerPatch({ answer }, rij, now = new Date()) {
  const iso = now.toISOString();
  return {
    answer,
    answered_at: iso,
    answer_count: (Number(rij && rij.answer_count) || 0) + 1,
    updated_at: iso,
  };
}
