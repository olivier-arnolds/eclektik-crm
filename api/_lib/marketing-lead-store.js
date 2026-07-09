// Gedeelde upsert voor marketing leads + activiteit. Gebruikt door
// api/website-signal.js (waitlist) en api/scorecard-intake.js (scorecard).
// Semantiek: vind-of-maak op e-mail (case-insensitief), lege profielvelden
// aanvullen (nooit overschrijven), altijd één activity-rij per aanroep.
import { profilePatch } from './website-signal-lib.js';

const cap = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) || null : null);

async function findByEmail(supabase, email) {
  // ilike zodat een case-variant (bv. handmatige invoer) gevonden wordt;
  // \ % _ escapen zodat ze letterlijk matchen (LIKE-wildcards).
  const pattern = email.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase
    .from('marketing_leads')
    .select('id, full_name, company, role, sector')
    .ilike('email', pattern)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// fields: { email (verplicht, lowercase), name?, company?, role?, sector?, src?, consent? }
// activity: { event, payload, src? }
export async function upsertMarketingLead(supabase, fields, activity) {
  const now = new Date().toISOString();
  let lead = await findByEmail(supabase, fields.email);

  if (!lead) {
    const { data: created, error: insErr } = await supabase
      .from('marketing_leads')
      .insert({
        email: fields.email,
        full_name: cap(fields.name, 200),
        company: cap(fields.company, 200),
        role: cap(fields.role, 200),
        sector: cap(fields.sector, 200),
        first_src: typeof fields.src === 'string' ? fields.src.slice(0, 100) : null,
        // consent_at = AVG-moment, alleen bij expliciete opt-in
        consent_at: fields.consent === true ? now : null,
        last_activity_at: now,
      })
      .select('id')
      .single();
    if (insErr && insErr.code === '23505') {
      lead = await findByEmail(supabase, fields.email);
      if (!lead) throw new Error('marketing lead not found after unique-violation retry');
    } else if (insErr) {
      throw insErr;
    } else {
      lead = created;
    }
  } else {
    const patch = {
      ...profilePatch(lead, fields),
      last_activity_at: now,
      updated_at: now,
    };
    const { error: updErr } = await supabase
      .from('marketing_leads').update(patch).eq('id', lead.id);
    if (updErr) throw updErr;
  }

  const { error: actErr } = await supabase.from('marketing_lead_activity').insert({
    marketing_lead_id: lead.id,
    event: activity.event,
    payload: activity.payload,
    src: typeof activity.src === 'string' ? activity.src.slice(0, 100) : null,
  });
  if (actErr) throw actErr;

  return lead.id;
}
