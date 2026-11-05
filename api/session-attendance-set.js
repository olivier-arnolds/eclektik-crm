// POST /api/session-attendance-set - de aanwezigheid bij de Glint user session
// met de hand vastleggen vanuit Marketing > Leads.
//
// WAAROM DIT SERVER-SIDE MOET
//   user_session_invites staat op RLS zonder policies: de tabel draagt per
//   genodigde een token waarmee je namens hem kunt antwoorden. Alleen de
//   service key komt erbij. Het team leest de uitkomsten via de view
//   user_session_results, die het token weglaat, en die view is read-only.
//
// ACHTER EEN INGELOGDE GEBRUIKER, net als api/event-confirm-set.js. Dit is een
// beheerfunctie en hoort bij een mens met een sessie, niet achter het
// webhookgeheim dat de website gebruikt.
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';
import { validateAanwezigheid, aanwezigheidPatch } from './_lib/session-attendance-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const TABLE = 'user_session_invites';

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateAanwezigheid(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    const patch = aanwezigheidPatch({ attendance: body.attendance, door: authedUser.email || null });
    const { data, error } = await supabase.from(TABLE)
      .update(patch).eq('id', body.id)
      .select('id, attendance, attendance_at, attendance_by')
      .maybeSingle();
    if (error) throw error;
    // Geen rij betekent dat dit id niet bestaat. Een stille 200 zou de
    // keuzelijst laten staan alsof het opgeslagen is.
    if (!data) return res.status(404).json({ error: 'Geen uitnodiging met dit id' });

    return res.status(200).json({ ok: true, rij: data });
  } catch (e) {
    console.error('[session-attendance-set] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
