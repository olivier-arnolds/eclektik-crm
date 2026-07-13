// Pure mapping van CRM-recipients naar Resend-contactobjecten.
// - Alleen contacten met een e-mailadres.
// - do_not_email -> unsubscribed (Resend slaat unsubscribed sowieso over).
// - E-mail genormaliseerd (trim + lowercase) en gededupliceerd (eerste wint).
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
      unsubscribed: !!r.do_not_email,
    });
  }
  return out;
}
