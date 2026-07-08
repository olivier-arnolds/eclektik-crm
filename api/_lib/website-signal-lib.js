// Pure helpers voor api/website-signal.js — apart bestand zodat vitest ze
// zonder Supabase-verbinding kan testen. (Bestanden onder api/_lib worden
// niet als endpoint gedeployed.)

// Velden die als kolom worden opgeslagen en dus niet dubbel in de
// activity-payload hoeven. Profielvelden (name/company/role/sector) blijven
// WEL in de payload: als een bestaande lead met een ander bedrijf opnieuw
// binnenkomt, overschrijven we het profiel niet maar raakt de nieuwe waarde
// zo toch niet kwijt.
const META_FIELDS = new Set(['email', 'event', 'source', 'src']);

// Keys uit onvertrouwde JSON die via `out[k] = v` de prototype-keten kunnen
// raken in plaats van een gewone property te worden.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function validateSignal(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Invalid email' };
  if (typeof body.event !== 'string' || !body.event.trim()) return { error: 'Missing event' };
  const event = body.event.trim();
  return { value: { ...body, email, event } };
}

export function activityPayload(body) {
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (META_FIELDS.has(k) || DANGEROUS_KEYS.has(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

// Patch voor een bestaande marketing lead: alleen lege profielvelden
// aanvullen, nooit bestaande waarden overschrijven.
export function profilePatch(existing, body) {
  const map = {
    full_name: body.name,
    company: body.company,
    role: body.role,
    sector: body.sector,
  };
  const patch = {};
  for (const [col, val] of Object.entries(map)) {
    // Alleen strings: deze kolommen zijn text, en onvertrouwde JSON kan
    // hier ook numbers/objects bevatten.
    if (typeof val === 'string' && val.trim() && !existing[col]) patch[col] = val.trim();
  }
  return patch;
}
