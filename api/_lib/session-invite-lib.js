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

const ACTIONS = new Set(['click', 'confirm', 'submit', 'register']);
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

// De drie momenten, exact. Bij de acties van de klant toetst SLOT_RE alleen de
// vorm, omdat site en app daar niet in dezelfde minuut hoeven mee te deployen.
// Bij een interne aanmelding mag het strenger: die lijst komt uit hetzelfde
// formulier dat wij bouwen, en een typefout in een slot-id zou stil een vierde
// moment uitvinden waar niemand op zit te wachten.
export const SLOTS_TOEGESTAAN = ['slot-2026-10-29', 'slot-2026-11-04', 'slot-2026-11-05'];

// Een aanmelding op naam van een collega moet ook echt van een collega komen.
// Het endpoint hangt achter een gedeeld geheim, niet achter een login, dus dit
// is de enige plek waar dat afgedwongen wordt.
const INTERN_DOMEIN = '@eclectik.co';
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return { error: 'Invalid email' };
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return { error: 'Invalid email' };
  return { value: email };
}

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

  // register heeft geen token: de collega meldt iemand aan die de uitnodiging
  // misschien nooit gekregen heeft. Daarom vóór de tokencontrole hieronder.
  if (action === 'register') return validateRegister(body, action);

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
    // De klant heeft zelf geantwoord, ook als een collega hem eerder intern had
    // aangemeld. Dan is dit het verse feit en vervalt de interne herkomst; het
    // veld registered_by hoort alleen bij source 'internal'.
    source: 'email_link',
    registered_by: null,
    updated_at: iso,
  };
}

export function submitPatch({ slots, note }, now = new Date()) {
  const iso = now.toISOString();
  return {
    slots,
    note,
    submitted_at: iso,
    source: 'email_link',
    registered_by: null,
    updated_at: iso,
  };
}

// LET OP: clickPatch zet source NIET. Een klik is geen antwoord, en het is juist
// de actie die linkscanners uitvoeren. Zou een klik de herkomst op 'email_link'
// zetten, dan wist de scanner van Outlook het spoor van de collega die iemand
// een uur eerder had aangemeld. Dezelfde reden waarom click ook answer niet raakt.


// ── Antwoorden die te snel binnenkomen ────────────────────────────────────────
//
// Beveiligingsdiensten als Defender Safe Links en Barracuda ATP openen een
// pagina in een echte browser MET JavaScript om te zien wat er gebeurt. De
// bevestigingsstap houdt die dus niet tegen: ze doorlopen hem gewoon.
//
// Gemeten bij de eerste echte verzending van 28 september: van de dertien
// antwoorden vielen er elf tussen 47 en 105 seconden na verzenden, met
// afwisselend ja en nee, en geen van hen vulde een datum of opmerking in.
// Daarna een gat tot 316 seconden, waar de eerste echte reactie zat, die wel
// een datum koos. De grens van drie minuten ligt in dat gat.
//
// Bewust geen weigering maar een markering: wist je het antwoord, dan heeft een
// snelle echte lezer de bedankpagina gezien, antwoordt nooit meer, en blijft er
// geen spoor over. Markeren haalt ze uit beeld zonder iets te vernietigen.
export const RUIS_SECONDEN = 180;

export function isRuis({ aangemaaktISO, antwoordISO } = {}) {
  if (!aangemaaktISO || !antwoordISO) return false;
  const a = new Date(aangemaaktISO).getTime();
  const b = new Date(antwoordISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return (b - a) / 1000 < RUIS_SECONDEN;
}


// ── Interne aanmelding (/s/intern) ────────────────────────────────────────────
//
// Een collega van CS of PS meldt iemand aan die in een gesprek heeft gezegd mee
// te willen doen. Zelfde tabel als de aanmeldingen via de mail, anders klopt de
// telling per datum niet.
//
// De site normaliseert al, maar dit endpoint is publiek bereikbaar met alleen
// het gedeelde geheim, dus hier gebeurt het nog een keer.

function validateRegister(body, action) {
  const { error: mailErr, value: email } = normalizeEmail(body.email);
  if (mailErr) return { error: mailErr };

  const { error: doorErr, value: registeredBy } = normalizeEmail(body.registeredBy);
  if (doorErr) return { error: 'Invalid registeredBy' };
  if (!registeredBy.endsWith(INTERN_DOMEIN)) return { error: 'Invalid registeredBy' };

  const { error: slotErr, value: slots } = normalizeSlots(body.slots);
  if (slotErr) return { error: slotErr };
  for (const s of slots) {
    if (!SLOTS_TOEGESTAAN.includes(s)) return { error: 'Invalid slots' };
  }

  const { error: noteErr, value: note } = normalizeNote(body.note);
  if (noteErr) return { error: noteErr };

  return {
    value: {
      action, email, slots, note, registeredBy,
      // Net als botSuspected: alleen een echte boolean telt. Een string 'false'
      // zou anders als bevestiging gelezen worden en een antwoord overschrijven.
      confirmOverwrite: body.confirmOverwrite === true,
    },
  };
}

/**
 * Wat er met deze aanmelding moet gebeuren. Puur, zodat de afweging te lezen en
 * te toetsen is zonder database.
 *
 * DE KERN: wanneer moet de collega om bevestiging gevraagd worden?
 *   Niet "er staat al een antwoord", maar "er staat al een antwoord VAN DE KLANT
 *   ZELF". Dat verschil doet twee dingen tegelijk. Het beschermt wat de klant
 *   zelf heeft ingevuld, en het maakt een tweede identieke aanmelding vanzelf
 *   idempotent: die vindt zijn eigen interne antwoord van een seconde eerder en
 *   schrijft gewoon door. De site beschermt niet tegen dubbel klikken, dus zonder
 *   die regel zou de collega een vraag krijgen over zijn eigen invoer.
 *
 *   Een antwoord dat als ruis gemarkeerd staat telt niet mee. Dat komt vrijwel
 *   zeker van een linkscanner, en daar hoeft niemand bevestiging voor te geven.
 *
 * @returns {{kind:'insert'|'update'|'needs_confirm', existing?:object}}
 */
export function registerOutcome(rij, { confirmOverwrite } = {}) {
  if (!rij) return { kind: 'insert' };

  const klantHeeftGeantwoord = !!rij.answer && rij.confirmed === true
    && rij.source !== 'internal' && rij.bot_suspected !== true;

  if (klantHeeftGeantwoord && !confirmOverwrite) {
    return {
      kind: 'needs_confirm',
      existing: {
        answer: rij.answer,
        slots: Array.isArray(rij.slots) ? rij.slots : [],
        note: rij.note ?? null,
      },
    };
  }
  return { kind: 'update' };
}

/** De kolommen die een interne aanmelding schrijft, voor zowel insert als update. */
export function registerPatch({ slots, note, registeredBy }, now = new Date()) {
  const iso = now.toISOString();
  return {
    answer: 'yes',
    answer_at: iso,
    confirmed: true,
    confirmed_at: iso,
    slots,
    note,
    submitted_at: iso,
    source: 'internal',
    registered_by: registeredBy,
    // Een collega die iemand na een echt gesprek aanmeldt weet zeker dat het een
    // mens is. Bleef een eerdere ruismarkering staan, dan viel die deelnemer uit
    // de telling in de tab, en dat is precies de telling waar dit om begonnen is.
    bot_suspected: false,
    updated_at: iso,
  };
}
