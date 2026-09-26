import { requireUser } from './_lib/guard.js';
import { createClient } from '@supabase/supabase-js';
import { maakToken, normaliseerEmail, verdeelOntvangers } from './_lib/session-invite-ensure-lib.js';

// POST /api/session-invite-ensure
//
// Zorgt dat elke geselecteerde ontvanger een rij heeft in user_session_invites
// en geeft het token per adres terug, zodat de composer {{token}} kan invullen.
//
// WAAROM DIT SERVER-SIDE MOET
//   user_session_invites staat op RLS zonder policies, dus alleen de service
//   key komt erbij. Dat is expres: wie een token leest kan namens die persoon
//   antwoorden. De frontend kan de tabel dus niet zelf lezen of schrijven.
//
// WAAROM DIT DE CAMPAGNEDOELGROEP VOLGT
//   Er was al een scripts/maak-session-invites.py met een eigen doelgroepregel.
//   Twee lijsten die in de pas moeten lopen gaan uit elkaar lopen. De
//   ontvangers van de mail zijn nu de enige bron.
//
// HERGEBRUIK IS EEN GARANTIE, GEEN BELOFTE
//   Een bestaand token wordt altijd hergebruikt: een tweede token voor
//   hetzelfde adres maakt de link uit een eerdere mail dood. De lookup doet dat,
//   en de unieke index user_session_invites_email_uniek vangt de race af waarin
//   twee verzendingen tegelijk hetzelfde adres willen aanmaken.
//
// Het endpoint verstuurt niets. De composer roept het aan vlak voor het
// verzenden, eerst met dry_run om te tonen wat er gaat gebeuren.

export const config = { maxDuration: 60 };

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const MAX_ONTVANGERS = 500;

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { recipients } = req.body || {};
  // Schrijven moet expliciet aangezet worden, net als bij de outreach-scan.
  const dryRun = (req.body || {}).dry_run !== false;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients[] is verplicht' });
  }
  if (recipients.length > MAX_ONTVANGERS) {
    return res.status(400).json({ error: `max ${MAX_ONTVANGERS} ontvangers per aanroep` });
  }

  const adressen = [...new Set(recipients.map(r => normaliseerEmail(r?.email)).filter(Boolean))];

  // Bestaande rijen ophalen. De kolom email is al genormaliseerd opgeslagen
  // (het endpoint schrijft hem zo weg), dus een gewone in() volstaat.
  const bestaand = [];
  for (let i = 0; i < adressen.length; i += 200) {
    const { data, error } = await supabase
      .from('user_session_invites')
      .select('email,token')
      .in('email', adressen.slice(i, i + 200));
    if (error) return res.status(500).json({ error: 'bestaande uitnodigingen ophalen: ' + error.message });
    bestaand.push(...(data || []));
  }

  const verdeling = verdeelOntvangers(recipients, bestaand);

  if (dryRun) {
    return res.status(200).json({
      dry_run: true,
      bestaand: verdeling.bestaand.length,
      nieuw: verdeling.nieuw.length,
      ongeldig: verdeling.ongeldig,
      // Ook bij een droge run de tokens die al bestaan. De preview toont
      // daarmee het echte token van de voorbeeldontvanger in plaats van een
      // lege string, en dat is precies wat de eerste testverzending onbruikbaar
      // maakte: de knop zag er goed uit en de link was dood.
      tokens: verdeling.tokens,
    });
  }

  // Aanmaken, per rij. Trager dan een bulk-insert, maar bij een bulk weet je
  // van een mislukte rij niet welke het was, en een ontvanger zonder token mag
  // niet stilletjes een dode link krijgen.
  const tokens = { ...verdeling.tokens };
  const mislukt = [];
  let aangemaakt = 0;

  for (const n of verdeling.nieuw) {
    const token = maakToken();
    const { error } = await supabase.from('user_session_invites').insert({
      token,
      email: n.email,
      first_name: n.first_name,
      company: n.company,
      contact_id: n.contact_id,
    });

    if (!error) {
      tokens[n.email] = token;
      aangemaakt += 1;
      continue;
    }

    // 23505 op de e-mailindex betekent dat er inmiddels toch een rij is. Dan is
    // dat de rij die telt; ons verse token gooien we weg in plaats van het
    // bestaande te overschrijven.
    if (error.code === '23505') {
      const { data } = await supabase
        .from('user_session_invites').select('token').eq('email', n.email).maybeSingle();
      if (data?.token) { tokens[n.email] = data.token; continue; }
    }

    mislukt.push({ email: n.email, reden: error.message });
  }

  return res.status(200).json({
    dry_run: false,
    bestaand: verdeling.bestaand.length,
    aangemaakt,
    tokens,
    ongeldig: verdeling.ongeldig,
    mislukt,
  });
}
