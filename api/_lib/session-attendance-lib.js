// Pure logica voor api/session-attendance-set.js: de aanwezigheid bij de Glint
// user session met de hand vastleggen vanuit Marketing > Leads.
//
// WAAROM DIT LOS STAAT VAN HET ANTWOORD
//   answer in user_session_invites is wat de genodigde zelf liet weten, en dat
//   veld wordt alleen door de landingspagina geschreven. Of iemand op de dag
//   zelf kwam opdagen is een waarneming van ons. Zouden die in één veld zitten,
//   dan wist 'afwezig' het eerdere 'ja' uit en was niet meer te zien dat die
//   persoon zich had aangemeld.
//
// AANGEMELD IS DE LEGE WAARDE
//   Iedereen in dit blok heeft ja gezegd, dus elke rij begint op aangemeld. De
//   keuzelijst toont dat dan ook zo, en 'aangemeld' kiezen zet de kolom weer
//   leeg. Een rij die expliciet op 'aangemeld' zou staan en een rij die nog
//   niets heeft, zijn hetzelfde ding; twee manieren om dat op te slaan leveren
//   alleen maar een vraag op welke van de twee nou telt.

export const AANWEZIGHEID = new Set(['aanwezig', 'afwezig']);

/**
 * @returns {{error}|{value:{id, attendance}}} attendance is 'aanwezig',
 *   'afwezig' of null. null betekent terug naar aangemeld.
 */
export function validateAanwezigheid(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'Invalid id' };
  }

  const raw = body.attendance === null || body.attendance === undefined
    ? '' : String(body.attendance).trim().toLowerCase();
  // Leeg en 'aangemeld' betekenen hetzelfde: niets waargenomen.
  if (raw === '' || raw === 'aangemeld') return { value: { id, attendance: null } };
  if (!AANWEZIGHEID.has(raw)) return { error: 'Invalid attendance' };
  return { value: { id, attendance: raw } };
}

/** De kolommen die zo'n wijziging schrijft. */
export function aanwezigheidPatch({ attendance, door }, now = new Date()) {
  const iso = now.toISOString();
  if (attendance === null) {
    return { attendance: null, attendance_at: null, attendance_by: null, updated_at: iso };
  }
  return { attendance, attendance_at: iso, attendance_by: door || null, updated_at: iso };
}
