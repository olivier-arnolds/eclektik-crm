// Pure helpers voor api/session-invite.js - apart bestand zodat vitest ze zonder
// Supabase-verbinding kan testen. (Bestanden onder api/_lib worden niet als
// endpoint gedeployed.)
//
// Contract: eclectik-website docs/superpowers/specs/2026-09-25-glint-user-session-design.md
//
// De drie acties, en waarom ze verschillen:
//   click    schrijft alleen pending_answer, pending_at en click_count. Raakt
//            answer nooit aan. Dat is de hele reden dat een linkscanner die de
//            mail opent geen antwoord kan achterlaten.
//   confirm  schrijft answer, met het antwoord dat de PAGINA meestuurt, niet met
//            wat er in pending_answer staat. Een scanner haalt geen javascript op
//            en doet dus nooit een confirm.
//   submit   schrijft de gekozen momenten en de open vraag.

// Deadline uit het contract: 22 oktober 2026 23:59 CEST. De site controleert hem
// ook, maar die controle is te omzeilen door de pagina over te slaan en het
// endpoint rechtstreeks aan te roepen, dus hier staat hij nog een keer.
// Te verzetten zonder deploy via de env-var, bijvoorbeeld als de uitvraag een
// week langer open moet.
export const DEFAULT_DEADLINE = '2026-10-22T21:59:59Z';

export function deadlineAt(env = process.env) {
  const raw = (env && env.SESSION_INVITE_DEADLINE) || DEFAULT_DEADLINE;
  const at = new Date(raw);
  // Een onleesbare env-var mag de uitvraag niet stilletjes voor altijd
  // openzetten of sluiten; dan geldt de datum uit het contract.
  return Number.isNaN(at.getTime()) ? new Date(DEFAULT_DEADLINE) : at;
}

export function isClosed(now = new Date(), env = process.env) {
  return now.getTime() > deadlineAt(env).getTime();
}

const ACTIONS = new Set(['click', 'confirm', 'submit']);
const ANSWERS = new Set(['yes', 'no']);

// Tokens komen uit secrets.token_urlsafe(): letters, cijfers, '-' en '_'.
// De ondergrens is de eis uit het contract (minstens 22 tekens), de bovengrens
// houdt onzin uit de query.
const TOKEN_RE = /^[A-Za-z0-9_-]{22,128}$/;

// De drie momenten hebben een id van de vorm slot-JJJJ-MM-DD. Bewust een vorm en
// geen vaste lijst: zo hoeven de site en de BD-app niet in dezelfde minuut mee te
// deployen als er een moment bijkomt, terwijl er nog steeds geen willekeurige
// tekst in de kolom belandt.
const SLOT_RE = /^slot-\d{4}-\d{2}-\d{2}$/;
const MAX_SLOTS = 10;
const MAX_NOTE = 2000;

// Vorm van het token los van de database. Een token dat er niet uitziet als een
// van de onze staat er ook niet in, dus dat scheelt een query - en het antwoord
// moet hetzelfde generieke 'unknown_token' zijn, want anders is uit het verschil
// af te lezen welke tokens bestaan.
export function looksLikeToken(raw) {
  return typeof raw === 'string' && TOKEN_RE.test(raw);
}

export function normalizeSlots(raw) {
  if (raw === undefined || raw === null) return { value: [] };
  if (!Array.isArray(raw)) return { error: 'Invalid slots' };
  if (raw.length > MAX_SLOTS) return { error: 'Invalid slots' };
  const out = [];
  for (const s of raw) {
    if (typeof s !== 'string' || !SLOT_RE.test(s)) return { error: 'Invalid slots' };
    if (!out.includes(s)) out.push(s);   // dubbele vinkjes zijn geen fout, wel een dubbele rij
  }
  return { value: out };
}

export function normalizeNote(raw) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: 'Invalid note' };
  const note = raw.trim().slice(0, MAX_NOTE);
  return { value: note || null };
}

// Valideert de body van de site. Geeft {error} bij een kapotte aanvraag (dat is
// een fout van de aanroeper en mag een 400 zijn) en {value} als de aanvraag
// bruikbaar is. Of het token bestaat weet deze functie niet; dat is bewust,
// want het verschil tussen 'bestaat niet' en 'bestaat wel' hoort nergens uit een
// statuscode te blijken.
export function validateRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!ACTIONS.has(action)) return { error: 'Unsupported action' };
  if (typeof body.token !== 'string' || !body.token.trim()) return { error: 'Missing token' };
  const token = body.token.trim();

  if (action === 'click' || action === 'confirm') {
    const answer = typeof body.answer === 'string' ? body.answer.trim().toLowerCase() : '';
    if (!ANSWERS.has(answer)) return { error: 'Invalid answer' };
    // Alleen een echte boolean true telt. De site stuurt een boolean; een string
    // 'false' zou anders als true binnenkomen.
    const botSuspected = body.botSuspected === true;
    return { value: { action, token, answer, botSuspected } };
  }

  const { error: slotErr, value: slots } = normalizeSlots(body.slots);
  if (slotErr) return { error: slotErr };
  const { error: noteErr, value: note } = normalizeNote(body.note);
  if (noteErr) return { error: noteErr };
  return { value: { action, token, slots, note } };
}

// ── De drie patches ────────────────────────────────────────────────────────
// Elk geeft precies de kolommen terug die die actie mag aanraken. Zo is in een
// oogopslag te zien dat click niet bij answer kan.

export function clickPatch(row, { answer, botSuspected }, now = new Date()) {
  const iso = now.toISOString();
  return {
    pending_answer: answer,
    pending_at: iso,
    click_count: (Number(row && row.click_count) || 0) + 1,
    // Blijft staan zodra hij een keer true was. Een scanner die de link opent en
    // daarna de echte ontvanger die klikt, zou anders het spoor van die scanner
    // wissen. Dat een mens langs is geweest blijkt uit confirmed, niet hieruit.
    bot_suspected: !!(row && row.bot_suspected) || botSuspected,
    updated_at: iso,
  };
}

export function confirmPatch({ answer }, now = new Date()) {
  const iso = now.toISOString();
  return {
    // Bewust het antwoord uit de aanvraag en niet row.pending_answer: dat laatste
    // kan van een scanner komen die na de ontvanger langskwam.
    answer,
    answer_at: iso,
    confirmed: true,
    confirmed_at: iso,
    updated_at: iso,
  };
}

export function submitPatch({ slots, note }, now = new Date()) {
  const iso = now.toISOString();
  return {
    slots,
    note,
    submitted_at: iso,
    updated_at: iso,
  };
}
