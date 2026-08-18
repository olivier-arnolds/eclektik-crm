// Vaste afzenders - allemaal op het in Resend geverifieerde domein eclectik.co.
// Andere domeinen worden door Resend geweigerd, dus het adres is een keuzelijst
// (geen vrij tekstveld). De weergavenaam hoort bij het adres. Gedeeld door de
// marketing-composer en de content-kalender (afzenderkeuze + testmail).
export const SENDERS = [
  { email: 'marketing@eclectik.co', name: 'Marketing' },
  { email: 'olivier@eclectik.co', name: 'Olivier Arnolds' },
  { email: 'marco@eclectik.co', name: 'Marco van Gelder' },
  { email: 'yarmilla@eclectik.co', name: 'Yarmilla Koenders' },
];

export const DEFAULT_SENDER = SENDERS[0];

// Weergavenaam bij een e-mailadres (fallback = het adres zelf).
export function senderNameFor(email) {
  const s = SENDERS.find(x => x.email === email);
  return s ? s.name : (email || '');
}
