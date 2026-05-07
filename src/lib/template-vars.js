// Substitutes {{first_name}}-style placeholders in an HTML or text body
// using values from a contact record. Unknown placeholders are replaced with
// an empty string; the user is responsible for choosing variables that exist.
//
// Supported variables (v1):
//   first_name, last_name, full_name, company_name, role
//
// Usage:
//   renderTemplate('Hi {{first_name}},', { first_name: 'Marco' }) === 'Hi Marco,'
const KNOWN = ['first_name', 'last_name', 'full_name', 'company_name', 'role'];

export function renderTemplate(body, vars) {
  if (!body) return '';
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!KNOWN.includes(key)) return ''; // strip unknown vars silently
    const v = vars && vars[key];
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
  };
}

export const KNOWN_VARS = KNOWN;
