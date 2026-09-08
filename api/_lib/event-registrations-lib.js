// Pure helpers voor api/event-registrations.js - apart bestand zodat vitest ze
// zonder Supabase-verbinding kan testen. (Bestanden onder api/_lib worden
// niet als endpoint gedeployed.)
//
// Bron: marketing_lead_activity-rijen met event = 'event_registered', gejoind
// met marketing_leads. De join levert e-mail, naam, bedrijf en functie; land,
// telefoon en de Workvivo-toestemming staan in de vrije payload die
// activityPayload() in website-signal-lib.js daar neerzet.

// Slug uit de querystring: kleine letters en cijfers met losse streepjes
// ertussen, bv. 'amsterdam-2026'. Bewust streng, want de waarde gaat als
// filterwaarde de PostgREST-query in (payload->>eventSlug=eq.<slug>) en daar
// hebben komma's, haakjes en punten betekenis.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 64;

export function validateEventSlug(raw) {
  if (raw === undefined || raw === null) return { error: 'Missing event' };
  // Een herhaalde queryparam (?event=a&event=b) komt als array binnen.
  if (typeof raw !== 'string') return { error: 'Invalid event' };
  const slug = raw.trim().toLowerCase();
  if (!slug) return { error: 'Missing event' };
  if (slug.length > SLUG_MAX || !SLUG_RE.test(slug)) return { error: 'Invalid event' };
  return { value: slug };
}

// Lege strings en niet-strings (onvertrouwde JSON in de payload kan alles
// bevatten) worden null, zodat het antwoord één vorm heeft.
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const ts = (v) => {
  const n = Date.parse(v);
  // Onparseerbaar achteraan sorteren in plaats van de rest door elkaar gooien.
  return Number.isNaN(n) ? Infinity : n;
};

// De join is many-to-one (de foreign key staat op marketing_lead_activity),
// dus PostgREST geeft één object terug. Een array wordt toch afgevangen: dat
// scheelt een lijst vol lege namen als een toekomstige schemawijziging de
// relatie anders laat lezen.
const oneLead = (v) => (Array.isArray(v) ? v[0] : v) || {};

// Eén DB-rij naar de vorm die het endpoint teruggeeft.
export function shapeRegistration(row) {
  const lead = (row && typeof row.lead === 'object' && oneLead(row.lead)) || {};
  const payload = (row && typeof row.payload === 'object' && row.payload) || {};
  return {
    occurred_at: (row && row.occurred_at) || null,
    email: str(lead.email),
    // Naam, bedrijf en functie staan als kolom op de lead. upsertMarketingLead
    // vult lege profielvelden aan maar overschrijft nooit, dus in de praktijk
    // is de kolom gevuld; de payload is alleen terugval voor een lead die die
    // kolom nog niet had toen de inschrijving binnenkwam.
    full_name: str(lead.full_name) || str(payload.name),
    company: str(lead.company) || str(payload.company),
    role: str(lead.role) || str(payload.role),
    country: str(payload.country),
    phone: str(payload.phone),
    // Strikt: alleen een echte boolean true telt als toestemming. Het
    // formulier stuurt z.literal(true), dus een string 'true' zou betekenen
    // dat er iets anders aan de lijn hangt.
    consent_workvivo: payload.consentWorkvivo === true,
  };
}

// Eén rij per e-mailadres, de vroegste. Het schrijfendpoint doet
// find-or-create op e-mail en schrijft altijd een activity-rij, dus wie zich
// twee keer inschrijft levert twee rijen op. De eerste is het moment waarop
// iemand zich aanmeldde; dat is wat op de deelnemerslijst hoort.
export function dedupeByEmail(registrations) {
  const seen = new Map();
  registrations.forEach((r, i) => {
    // marketing_leads.email is NOT NULL, maar een rij zonder e-mail mag niet
    // stilletjes verdwijnen: die krijgt een sleutel die nooit botst (geen '@').
    const key = String(r.email || '').toLowerCase() || `#${i}`;
    if (!seen.has(key)) seen.set(key, r);
  });
  return [...seen.values()];
}

export function sortByOccurredAt(registrations) {
  // Stabiele sort (ES2019+), dus rijen met hetzelfde tijdstip houden hun
  // DB-volgorde.
  return [...registrations].sort((a, b) => ts(a.occurred_at) - ts(b.occurred_at));
}

// Ruwe DB-rijen naar de deelnemerslijst: oplopend op tijdstip, ontdubbeld op
// e-mail. Sorteren gebeurt hier nog een keer (de query doet het al) zodat de
// functie op zichzelf klopt en los te testen is.
export function buildRegistrations(rows) {
  const shaped = (Array.isArray(rows) ? rows : []).map(shapeRegistration);
  return dedupeByEmail(sortByOccurredAt(shaped));
}
