// Pure mapping van CRM-recipients naar Resend-contactobjecten.
// - Alleen contacten met een e-mailadres.
// - do_not_email -> unsubscribed (Resend slaat unsubscribed sowieso over).
// - E-mail genormaliseerd (trim + lowercase) en gededupliceerd (eerste wint).
// - contact_id wordt meegenomen zodat het broadcast-pad per ontvanger een
//   campaign_sends-rij kan schrijven (zichtbaar in de contacthistorie).
export function toResendContacts(recipients) {
  const seen = new Set();
  const out = [];
  for (const r of recipients || []) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      unsubscribed: !!r.do_not_email,
      contact_id: r.contact_id || r.id || null,
    });
  }
  return out;
}
