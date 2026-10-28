// Pure logica voor api/outreach-outcome.js: de uitkomst van een outreachcontact
// met de hand vastleggen vanuit Marketing > Outreach.
//
// WAAROM DIT EEN ENDPOINT IS EN GEEN UPDATE VANUIT DE TAB
//   Bij 'afspraak' raken we twee tabellen: outreach_contact en marketing_leads
//   (plus de activiteit eronder). De Supabase-client in de frontend kent geen
//   transacties, dus een half gelukte reeks zou een contact op 'afspraak' zetten
//   zonder dat er iemand in de tab Leads verschijnt. Zie CLAUDE.md §8.
//
// WAAROM BEIDE KEUZES DE REEKS STOPPEN
//   Een afspraak en een afwijzing zijn allebei een antwoord. De opvolgmail is
//   bedoeld voor stilte, en die is er dan niet meer. Status 'done' is precies
//   wat de selectie in outreach-send-lib.js overslaat.

export const UITKOMSTEN = new Set(['afspraak', 'geen_interesse']);

/**
 * @returns {{error}|{value:{id, outcome}}} outcome is 'afspraak',
 *   'geen_interesse' of null. null betekent: keuze terugdraaien.
 */
export function validateOutcome(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'Invalid id' };
  }

  const raw = body.outcome === null || body.outcome === undefined
    ? '' : String(body.outcome).trim().toLowerCase();
  if (raw === '' || raw === 'none') return { value: { id, outcome: null } };
  if (!UITKOMSTEN.has(raw)) return { error: 'Invalid outcome' };
  return { value: { id, outcome: raw } };
}

/**
 * De kolommen die de keuze op outreach_contact schrijft.
 *
 * Bij het terugdraaien zetten we de status NIET terug naar 'queued'. Wie de
 * keuze corrigeert bedoelt "dit klopte niet", niet "stuur hem alsnog de
 * opvolgmail". Hervatten kan met de knop die daarvoor bestaat, en dat is een
 * bewuste handeling. marketing_lead_id blijft ook staan: de lead-rij is al
 * aangemaakt en die laten we niet stilletjes verdwijnen.
 */
export function outcomePatch({ outcome, door }, now = new Date()) {
  const iso = now.toISOString();
  if (outcome === null) {
    return { outcome: null, outcome_at: null, outcome_by: null, updated_at: iso };
  }
  return {
    outcome,
    outcome_at: iso,
    outcome_by: door || null,
    status: 'done',
    next_action_at: null,
    updated_at: iso,
  };
}

/**
 * De velden voor de lead-rij in Marketing > Leads, afgeleid uit de outreachrij.
 *
 * consent blijft bewust weg. Een afspraak is geen toestemming voor marketingmail;
 * die twee door elkaar halen zet iemand in een nieuwsbrief waar hij nooit om
 * gevraagd heeft.
 *
 * @returns {null|{fields, activity}} null als er geen e-mailadres is.
 */
export function leadUitContact(rij, campagneNaam) {
  const email = String(rij?.email || '').trim().toLowerCase();
  if (!email) return null;
  const naam = [rij?.first_name, rij?.last_name].filter(Boolean).join(' ') || null;
  return {
    fields: {
      email,
      name: naam,
      company: rij?.company || null,
      role: rij?.title || null,
      src: 'outreach',
    },
    activity: {
      event: 'outreach_meeting',
      src: 'outreach',
      payload: {
        campaign: campagneNaam || null,
        linkedin: rij?.linkedin_url || null,
      },
    },
  };
}
