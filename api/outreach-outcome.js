// POST /api/outreach-outcome - de uitkomst van een outreachcontact vastleggen
// vanuit Marketing > Outreach: 'afspraak', 'aanmelding', 'geen_interesse' of
// terugdraaien.
//
// Bij 'afspraak' komt de persoon ook in Marketing > Leads te staan. Dat raakt
// drie tabellen, en de Supabase-client in de frontend kent geen transacties,
// dus dit hoort server-side. Zie CLAUDE.md §8.
//
// Een 'aanmelding' doet dat bewust NIET: die tab is de lijst van mensen die
// zich via de website hebben aangemeld, en wie jij hier met de hand op
// aanmelding zet heb je zelf al binnengekregen.
//
// ZONDER E-MAILADRES WEL DE UITKOMST, GEEN LEAD
//   marketing_leads.email is NOT NULL en de hele vind-of-maak draait op dat
//   adres. LinkedIn-prospects hebben er geen: van de 154 in Amsterdam 2026
//   LinkedIn heeft er niet een een adres in de campagne. Dat gaf een harde
//   fout, en daarmee kon je niet eens vastleggen dat iemand zich had
//   aangemeld. De uitkomst is het belangrijkste feit, dus die wordt nu
//   opgeslagen en de lead blijft achterwege. Het antwoord zegt met
//   lead_overgeslagen waarom, zodat de tab dat kan tonen.
//
// ACHTER EEN INGELOGDE GEBRUIKER. Dit is een beheerfunctie, geen webhook.
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_lib/guard.js';
import { validateOutcome, outcomePatch, leadUitContact, UITKOMSTEN_MET_LEAD } from './_lib/outreach-outcome-lib.js';
import { upsertMarketingLead } from './_lib/marketing-lead-store.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateOutcome(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    const { data: rij, error } = await supabase
      .from('outreach_contact')
      .select('id, email, first_name, last_name, company, title, linkedin_url, marketing_lead_id, campaign:outreach_campaign(name)')
      .eq('id', body.id)
      .maybeSingle();
    if (error) throw error;
    if (!rij) return res.status(404).json({ error: 'Onbekend contact' });

    const patch = outcomePatch({ outcome: body.outcome, door: authedUser.email || null });

    // EERST de lead, DAN de uitkomst. Andersom zou een mislukte lead-aanmaak
    // een contact achterlaten dat op 'afspraak' staat terwijl er niemand in de
    // tab Leads verschijnt, en dat is precies de stand waar niemand meer naar
    // kijkt. Mislukt de lead, dan verandert er niets en ziet de gebruiker een
    // fout.
    let leadId = rij.marketing_lead_id || null;
    let leadOvergeslagen = null;
    if (UITKOMSTEN_MET_LEAD.has(body.outcome)) {
      const lead = leadUitContact(rij, rij.campaign?.name);
      if (lead) {
        leadId = await upsertMarketingLead(supabase, lead.fields, lead.activity);
        patch.marketing_lead_id = leadId;
      } else {
        leadOvergeslagen = 'geen e-mailadres';
      }
    }

    const { error: updError } = await supabase
      .from('outreach_contact').update(patch).eq('id', rij.id);
    if (updError) throw updError;

    return res.status(200).json({
      ok: true,
      outcome: body.outcome,
      marketing_lead_id: leadId,
      ...(leadOvergeslagen ? { lead_overgeslagen: leadOvergeslagen } : {}),
    });
  } catch (e) {
    console.error('[outreach-outcome] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
