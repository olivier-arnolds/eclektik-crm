// Vaste afzenders - allemaal op het in Resend geverifieerde domein eclectik.co.
// Andere domeinen worden door Resend geweigerd, dus het adres is een keuzelijst
// (geen vrij tekstveld). De weergavenaam hoort bij het adres. Gedeeld door de
// marketing-composer en de content-kalender (afzenderkeuze + testmail).
// `signature: true` = er bestaat een persoonlijke handtekening voor dit adres
// (api/_lib/signatures.js). Puur een UI-hint voor de default van de
// handtekening-toggle; de daadwerkelijke handtekening-HTML komt server-side.
export const SENDERS = [
  { email: 'marketing@eclectik.co', name: 'Marketing' },
  { email: 'olivier@eclectik.co', name: 'Olivier Arnolds', signature: true },
  { email: 'marco@eclectik.co', name: 'Marco van Gelder', signature: true },
  { email: 'yarmilla@eclectik.co', name: 'Yarmilla Koenders', signature: true },
];

export const DEFAULT_SENDER = SENDERS[0];

// Weergavenaam bij een e-mailadres (fallback = het adres zelf).
export function senderNameFor(email) {
  const s = SENDERS.find(x => x.email === email);
  return s ? s.name : (email || '');
}

// Heeft dit afzenderadres een persoonlijke handtekening? (Marketing@ niet.)
export function hasSignature(email) {
  const s = SENDERS.find(x => x.email === String(email || '').trim().toLowerCase());
  return !!(s && s.signature);
}
