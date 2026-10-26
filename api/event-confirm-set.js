// POST /api/event-confirm-set - het antwoord op de eventuitnodiging met de hand
// zetten vanuit Marketing > Leads.
//
// Nodig omdat de mail met de bevestigingsknop slecht aankomt: mensen mailen
// rechtstreeks terug, en dan moet iemand dat kunnen vastleggen zonder dat de
// deelnemer ooit op de pagina is geweest.
//
// ACHTER EEN INGELOGDE GEBRUIKER, niet achter het webhookgeheim. De website
// gebruikt api/event-confirm.js met dat gedeelde geheim; dit is een
// beheerfunctie en hoort bij een mens met een sessie. Twee manieren van toegang
// in een bestand door elkaar halen is hoe een publieke route per ongeluk iets
// krijgt wat alleen het team mag.
//
// Waarom dit server-side moet: event_confirm_invites staat op RLS zonder
// policies, dus alleen de service key komt erbij. Dat is expres, want de tabel
// draagt per deelnemer een token waarmee je namens hem kunt antwoorden.
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';
import { validateSet, setPatch } from './_lib/event-confirm-set-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const TABLE = 'event_confirm_invites';

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateSet(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('id, answer_count')
      .eq('email', body.email)
      .maybeSingle();
    if (error) throw error;
    // Geen uitnodiging betekent geen antwoord om te zetten. Niet stilzwijgend
    // aanmaken: een deelnemerslijst hoort alleen mensen te bevatten die ook echt
    // uitgenodigd zijn.
    if (!row) return res.status(404).json({ error: 'Geen uitnodiging voor dit adres' });

    const patch = setPatch({ answer: body.answer, door: authedUser.email || null }, row);
    const { error: updError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (updError) throw updError;

    return res.status(200).json({ ok: true, answer: body.answer });
  } catch (e) {
    console.error('[event-confirm-set] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
