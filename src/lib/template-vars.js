// Substitutes {{first_name}}-style placeholders in an HTML or text body
// using values from a contact record. Unknown placeholders are replaced with
// an empty string; the user is responsible for choosing variables that exist.
//
// Supported variables (v1):
//   first_name, last_name, full_name, company_name, role, token
//
// Usage:
//   renderTemplate('Hi {{first_name}},', { first_name: 'Marco' }) === 'Hi Marco,'
//
// OVER token, EN WAAROM HIJ HIER MOEST STAAN
//   De uitnodiging voor de user session bevat per ontvanger een eigen token in
//   de Ja- en Nee-knop. Zolang token niet in deze lijst stond, viel hij onder
//   "onbekende plaatshouder" en werd hij stilletjes een lege string. De link
//   werd dan ?t=&a=yes, iedereen belandde op /s/invalid, en in de preview zag
//   de knop er gewoon goed uit. Precies de fout die de eerste testverzending
//   onbruikbaar maakte.
const KNOWN = ['first_name', 'last_name', 'full_name', 'company_name', 'role', 'token'];

export const TOKEN_VAR = 'token';

// Staat de tokenplaatshouder in deze tekst? Bepaalt of er tokens aangemaakt
// moeten worden en of het broadcast-pad geblokkeerd wordt. Bewust exact: een
// naam die er alleen op lijkt, zoals my_token, telt niet mee.
export function bevatToken(body) {
  if (!body) return false;
  return /\{\{\s*token\s*\}\}/i.test(String(body));
}

export function renderTemplate(body, vars) {
  if (!body) return '';
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    // Ongevoelig voor hoofdletters. {{TOKEN}} in een knoplink werd anders een
    // onbekende naam en dus een lege string, en dan is de link dood terwijl de
    // knop er goed uitziet. Wie een plaatshouder intypt bedoelt de variabele,
    // niet een bepaalde schrijfwijze.
    const canon = KNOWN.find(k => k.toLowerCase() === String(key).toLowerCase());
    if (!canon) return ''; // strip unknown vars silently
    const v = vars && (vars[canon] != null ? vars[canon] : vars[key]);
    return v == null ? '' : String(v);
  });
}

// Pulls the variables for one contact from a DB row (or adapted row).
export function varsForContact(contact) {
  if (!contact) return {};
  const fullName = contact.full_name || contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  return {
    first_name: contact.first_name || (fullName ? fullName.split(' ')[0] : ''),
    last_name: contact.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
    full_name: fullName,
    company_name: contact.company_name || contact.account || '',
    role: contact.role || contact.title || '',
    // Staat niet op het contact zelf maar wordt er vlak voor verzenden op
    // gezet, uit user_session_invites. Leeg betekent hier "nog geen token";
    // de composer weigert dan te versturen in plaats van een dode link te
    // maken. Zie api/session-invite-ensure.js.
    token: contact.token || '',
  };
}

export const KNOWN_VARS = KNOWN;
