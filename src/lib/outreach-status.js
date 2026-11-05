// De status van een prospect in een outreachcampagne, in leesbare vorm.
//
// WAAROM EEN GEDEELD BESTAND
//   Deze labels stonden als constanten in marketing-outreach.jsx. De Leads-tab
//   toont dezelfde status, en twee kopieën lopen uit elkaar: dan heet
//   msg1_sent op het ene scherm 'Bericht 1 verstuurd' en op het andere iets
//   anders, terwijl het hetzelfde feit is. Zelfde reden waarom signatures.js
//   destijds van api/_lib naar src/lib verhuisde.

export const STATUS_LABEL = {
  queued: 'Klaar om te sturen', msg1_sent: 'Bericht 1 verstuurd', msg2_sent: 'Bericht 2 verstuurd',
  replied: 'Heeft geantwoord', bounced: 'Gebounced', ooo: 'Afwezig', referred: 'Doorverwezen',
  opted_out: 'Afgemeld', paused: 'Gepauzeerd', done: 'Afgerond',
};

export const STATUS_COLOR = {
  queued: '#2563eb', msg1_sent: '#d97706', msg2_sent: '#d97706', replied: '#16a34a',
  bounced: '#dc2626', ooo: '#7c3aed', referred: '#0891b2', opted_out: '#6b7280',
  paused: '#6b7280', done: '#16a34a',
};

/**
 * Het label bij een status. Een status die we niet kennen geven we terug zoals
 * hij is: dat leest lelijk, maar het is eerlijker dan 'Onbekend' en het valt
 * op, zodat de nieuwe status hier alsnog een naam krijgt.
 */
export function statusLabel(status) {
  const s = String(status || '').trim();
  if (!s) return null;
  return STATUS_LABEL[s] || s;
}

/** De kleur bij een status, of grijs als we hem niet kennen. */
export function statusKleur(status) {
  return STATUS_COLOR[String(status || '').trim()] || '#6b7280';
}

/**
 * Een korter label voor in een lijst, waar de campagnenaam er al naast staat.
 * 'Bericht 1 verstuurd' wordt 'bericht 1', want 'verstuurd' voegt daar niets
 * toe: in een outreachcampagne is dat de enige richting die een bericht heeft.
 */
export const STATUS_KORT = {
  queued: 'nog niet gestuurd', msg1_sent: 'bericht 1', msg2_sent: 'bericht 2',
  replied: 'geantwoord', bounced: 'gebounced', ooo: 'afwezig', referred: 'doorverwezen',
  opted_out: 'afgemeld', paused: 'gepauzeerd', done: 'afgerond',
};

export function statusKort(status) {
  const s = String(status || '').trim();
  if (!s) return null;
  return STATUS_KORT[s] || s;
}
