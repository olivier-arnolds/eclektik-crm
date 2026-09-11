// Pure matching-logica voor de outreach-inboxscan (job B).
// Ontwerp: docs/outreach-handover.md §5 en addendum §9.
//
// Los van de UI en van Graph, zodat het toetsbaar is (outreach-match.test.js).
// De scan leest Marco's inbox met het bestaande src/lib/graph.js
// getFolderEmails('Inbox'), dat berichten al normaliseert naar:
//   { id, subject, bodyPreview, from, fromAddress, toAddresses, date, ... }
//
// MATCHING IS TWEETRAPS (addendum §9.1). Omdat we via Resend versturen staat het
// uitgaande bericht niet in Marco's mailbox, dus er is geen Graph conversation_id
// om op te matchen:
//   1. afzenderadres gelijk aan een outreach_contact.email  -> zekere match
//   2. anders afzenderdomein bekend in de campagne          -> alleen flaggen
// Bij ING met 17 contacten mag stap 2 nooit automatisch iemand op 'replied'
// zetten; daarom levert die alleen een domain_flag voor handwerk.
//
// BEKENDE BEPERKING: Graph levert hier bodyPreview (circa 255 tekens), niet de
// volledige body. Genoeg voor classificatie (de kern staat vooraan) en voor het
// terugvinden van een gebouncet adres in een DSN, maar niet gegarandeerd.

export const MATCH_SENDER = 'sender_email';
export const MATCH_DOMAIN = 'domain_flag';
export const MATCH_NONE = 'none';

// Afzenders en subjects die op een bounce of systeemmelding duiden. Bounces
// worden VOOR de classificatie herkend (handover §5, stap 3): een DSN is geen
// antwoord van een mens en mag niet als 'declined' eindigen.
const BOUNCE_SENDERS = /^(postmaster|mailer-daemon|mail-daemon|no-?reply|microsoftexchange[0-9a-f]*)@/i;
const BOUNCE_SUBJECTS = /(undeliverable|delivery has failed|delivery status notification|returned mail|mail delivery failed|delivery incomplete|onbestelbaar|niet bezorgd)/i;

// Automatische afwezigheid. Alleen een hint voor de classificatie; het laatste
// woord heeft Claude, want "ik ben tot 3 okt weg maar stuur het programma" is
// inhoudelijk interessant.
const OOO_SUBJECTS = /(out of office|automatic reply|automatisch antwoord|afwezig|autoreply|automatische reactie)/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export const normEmail = (v) => String(v || '').trim().toLowerCase();

export function domainOf(email) {
  const e = normEmail(email);
  const at = e.lastIndexOf('@');
  return at === -1 ? null : (e.slice(at + 1) || null);
}

export function isBounceMessage({ fromAddress, subject } = {}) {
  return BOUNCE_SENDERS.test(normEmail(fromAddress)) || BOUNCE_SUBJECTS.test(String(subject || ''));
}

export function looksLikeAutoReply({ subject } = {}) {
  return OOO_SUBJECTS.test(String(subject || ''));
}

// Index over de campagnecontacten. contacts: [{ id, email, email_domain? }]
export function buildIndex(contacts) {
  const byEmail = new Map();
  const byDomain = new Map();
  for (const c of contacts || []) {
    const email = normEmail(c?.email);
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, c);
    const dom = normEmail(c?.email_domain) || domainOf(email);
    if (dom) {
      if (!byDomain.has(dom)) byDomain.set(dom, []);
      byDomain.get(dom).push(c);
    }
  }
  return { byEmail, byDomain };
}

// Zoekt in vrije tekst het eerste e-mailadres dat een campagnecontact is. Gebruikt
// om een DSN aan de juiste prospect te koppelen (het gebouncede adres staat in de
// body, niet in de afzender).
export function findContactEmailIn(text, index) {
  const matches = String(text || '').match(EMAIL_RE) || [];
  for (const m of matches) {
    const e = normEmail(m);
    if (index.byEmail.has(e)) return e;
  }
  return null;
}

/**
 * Matcht een enkel inkomend bericht tegen de campagne.
 * Geeft altijd een object terug; contactId is null als er niets zeker is.
 */
export function matchMessage(msg, index) {
  const fromAddress = normEmail(msg?.fromAddress);
  const bounce = isBounceMessage(msg);

  // Bounce: de afzender is de mailserver, dus zoek het echte adres in subject+preview.
  if (bounce) {
    const bounced = findContactEmailIn(`${msg?.subject || ''} ${msg?.bodyPreview || ''}`, index);
    const c = bounced ? index.byEmail.get(bounced) : null;
    return {
      messageId: msg?.id || null,
      contactId: c ? c.id : null,
      matchMethod: c ? MATCH_SENDER : MATCH_NONE,
      isBounce: true,
      bouncedEmail: bounced,
      isAutoReply: false,
      domainCandidates: [],
    };
  }

  // 1) Zeker: afzender is een campagnecontact.
  const direct = index.byEmail.get(fromAddress);
  if (direct) {
    return {
      messageId: msg?.id || null,
      contactId: direct.id,
      matchMethod: MATCH_SENDER,
      isBounce: false,
      bouncedEmail: null,
      isAutoReply: looksLikeAutoReply(msg),
      domainCandidates: [],
    };
  }

  // 2) Onzeker: wel een bekend domein. Nooit automatisch koppelen.
  const dom = domainOf(fromAddress);
  const candidates = (dom && index.byDomain.get(dom)) || [];
  if (candidates.length > 0) {
    return {
      messageId: msg?.id || null,
      contactId: null,
      matchMethod: MATCH_DOMAIN,
      isBounce: false,
      bouncedEmail: null,
      isAutoReply: looksLikeAutoReply(msg),
      domainCandidates: candidates.map((c) => c.id),
    };
  }

  return {
    messageId: msg?.id || null,
    contactId: null,
    matchMethod: MATCH_NONE,
    isBounce: false,
    bouncedEmail: null,
    isAutoReply: looksLikeAutoReply(msg),
    domainCandidates: [],
  };
}

/**
 * Scant een lijst inbox-berichten en geeft alleen de relevante kandidaten terug.
 *
 * Filtert bewust weg:
 *   - berichten van vóór `sinceISO` (Marco's inbox bevat jaren historie; een oude
 *     mail van een prospect over iets anders is geen reply op deze campagne)
 *   - berichten van onze eigen domeinen (interne mail, nieuwsbrieven aan onszelf)
 *   - berichten zonder enige match EN zonder bounce-kenmerk (ruis)
 *
 * @returns {{ candidates: Array, stats: object }}
 */
export function scanInbox(messages, contacts, { sinceISO = null, ignoreDomains = ['eclectik.co'] } = {}) {
  const index = buildIndex(contacts);
  const since = sinceISO ? new Date(sinceISO).getTime() : null;
  const ignore = new Set((ignoreDomains || []).map(normEmail));

  const stats = {
    scanned: 0, tooOld: 0, ownDomain: 0, noMatch: 0,
    sender: 0, domainFlag: 0, bounces: 0, autoReplies: 0,
  };
  const candidates = [];

  for (const msg of messages || []) {
    stats.scanned++;

    if (since !== null) {
      const t = new Date(msg?.date || 0).getTime();
      if (!Number.isFinite(t) || t < since) { stats.tooOld++; continue; }
    }
    const dom = domainOf(msg?.fromAddress);
    if (dom && ignore.has(dom)) { stats.ownDomain++; continue; }

    const m = matchMessage(msg, index);
    if (m.matchMethod === MATCH_NONE && !m.isBounce) { stats.noMatch++; continue; }
    // Een bounce die we aan geen enkele prospect kunnen koppelen is ook ruis.
    if (m.isBounce && !m.contactId) { stats.noMatch++; continue; }

    if (m.isBounce) stats.bounces++;
    else if (m.matchMethod === MATCH_SENDER) stats.sender++;
    else if (m.matchMethod === MATCH_DOMAIN) stats.domainFlag++;
    if (m.isAutoReply) stats.autoReplies++;

    candidates.push({
      ...m,
      // Naast het Graph-id ook het stabiele internet-id: dat overleeft een
      // verplaatsing naar een andere map en is dus de betrouwbare sleutel om
      // te zien of we dit bericht al verwerkt hebben.
      internetMessageId: msg?.internetMessageId || null,
      fromAddress: normEmail(msg?.fromAddress),
      subject: msg?.subject || null,
      bodyPreview: msg?.bodyPreview || null,
      receivedAt: msg?.date || null,
    });
  }

  return { candidates, stats };
}

/**
 * Statusovergang na een classificatie (handover §4).
 * Puur, zodat de regels toetsbaar zijn en niet in een endpoint verstoppen.
 *
 * Onder de confidence-drempel wijzigen we de status NIET, maar zetten we
 * next_action_at wel op null: liever een bericht 2 te weinig dan een te veel.
 */
export const CONFIDENCE_FLOOR = 0.7;

export function statusAfterClassification({
  classification, confidence = 0, currentStatus = 'msg1_sent', oooUntilISO = null, now = new Date(),
} = {}) {
  const hold = { status: currentStatus, next_action_at: null, needs_review: true };

  if (classification === 'bounce') {
    return { status: 'bounced', next_action_at: null, needs_review: false };
  }
  if (!classification || Number(confidence) < CONFIDENCE_FLOOR) return hold;

  switch (classification) {
    case 'interested':
    case 'declined':
      return { status: 'replied', next_action_at: null, needs_review: false };
    case 'referral':
      return { status: 'referred', next_action_at: null, needs_review: true };
    case 'ooo': {
      // Status blijft; alleen opnieuw proberen na de terugkeerdatum, anders +7 dagen.
      const base = oooUntilISO ? new Date(oooUntilISO) : new Date(now.getTime() + 7 * 86400000);
      const when = Number.isFinite(base.getTime()) ? base : new Date(now.getTime() + 7 * 86400000);
      return { status: currentStatus, next_action_at: when.toISOString(), needs_review: false };
    }
    default: // 'other'
      return hold;
  }
}

/**
 * 'Onbeantwoord': er kwam een antwoord binnen en wij hebben daarna nog niets
 * teruggestuurd. Bewust afgeleid uit twee tijdstempels in plaats van als
 * DB-status opgeslagen: "heeft geantwoord" en "wij moeten nog terug" zijn
 * onafhankelijke feiten, en zo blijft het ook kloppen als iemand twee keer
 * achter elkaar antwoordt.
 */
export function needsOurReply(r) {
  const inAt = r?.last_inbound_at ? new Date(r.last_inbound_at).getTime() : null;
  if (inAt === null || !Number.isFinite(inAt)) return false;
  const outAt = r?.answered_at ? new Date(r.answered_at).getTime() : null;
  if (outAt === null || !Number.isFinite(outAt)) return true;
  return outAt < inAt;
}
