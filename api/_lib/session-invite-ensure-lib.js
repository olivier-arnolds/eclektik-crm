// Pure logica voor het klaarzetten van uitnodigingstokens. Apart van het
// endpoint zodat vitest het zonder Supabase kan toetsen, net als
// outreach-classify-lib.js en session-invite-lib.js.

import crypto from 'node:crypto';

// Zelfde vorm als scripts/maak-session-invites.py: 24 bytes toeval geeft 32
// url-veilige tekens. Ruim genoeg om niet te raden; wie een geldig token heeft
// kan namens die persoon antwoorden, dus dat is de eigenschap die telt.
export const TOKEN_BYTES = 24;

export function maakToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Het e-mailadres zoals wij het vergelijken. Moet gelijk lopen met de unieke
 * index user_session_invites_email_uniek, die op lower(btrim(email)) staat.
 * Wijkt dit af, dan ontstaan er stilletjes twee rijen voor dezelfde persoon en
 * wordt de link uit de eerste mail dood.
 */
export function normaliseerEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * Verdeelt de ontvangers in drie groepen, op basis van wat er al in de tabel
 * staat. Schrijft niets; het endpoint gebruikt dit zowel voor de droge run als
 * om te weten wat het moet aanmaken.
 *
 * @param {Array<{email?: string, first_name?: string, company?: string, contact_id?: string}>} ontvangers
 * @param {Array<{email: string, token: string}>} bestaand  rijen uit user_session_invites
 * @returns {{bestaand: Array, nieuw: Array, ongeldig: Array, tokens: Object}}
 */
export function verdeelOntvangers(ontvangers, bestaand) {
  const bekend = new Map();
  for (const r of bestaand || []) {
    const sleutel = normaliseerEmail(r?.email);
    if (sleutel && r?.token) bekend.set(sleutel, r.token);
  }

  const heeftAl = [];
  const nieuw = [];
  const ongeldig = [];
  const tokens = {};
  // Dubbele adressen in de selectie mogen niet twee keer aangemaakt worden.
  const gezien = new Set();

  for (const r of Array.isArray(ontvangers) ? ontvangers : []) {
    const sleutel = normaliseerEmail(r?.email);
    if (!sleutel || !sleutel.includes('@')) {
      ongeldig.push({ email: r?.email ?? null, reden: 'geen bruikbaar e-mailadres' });
      continue;
    }
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    if (bekend.has(sleutel)) {
      tokens[sleutel] = bekend.get(sleutel);
      heeftAl.push(sleutel);
    } else {
      nieuw.push({
        email: sleutel,
        first_name: r?.first_name || null,
        company: r?.company || null,
        contact_id: r?.contact_id || null,
      });
    }
  }

  return { bestaand: heeftAl, nieuw, ongeldig, tokens };
}
