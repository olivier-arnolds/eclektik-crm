-- Nieuwe tekst voor bericht 1 in de campagne Microsoft AE EMEA 2026.
--
-- WAT ERUIT GAAT
--   De Glint-alinea ("We are known inside Microsoft for our Glint services")
--   en de Glint-verwijzing in de afsluiting. Wat overblijft gaat alleen nog
--   over de AI ROI-analyse.
--
-- DE FUNCTIE BLIJFT PERSOONLIJK
--   In de aangeleverde tekst stond 'Enterprise Account Executive', maar dat is
--   de functie van degene wiens bericht als voorbeeld werd overgenomen. De 443
--   actieve contacten hebben zeer uiteenlopende titels: 134 Account Executive,
--   48 Senior, 41 Strategic, maar ook Account Technology Strategist en
--   Commercial Executive. Een vaste titel zou bij de meesten simpelweg niet
--   kloppen, dus hij blijft per persoon ingevuld, net als de voornaam.
--
-- VEILIG MOMENT
--   Alle 750 staan nog op 'queued': er is nog geen enkel bericht verstuurd. De
--   voorwaarde status = 'queued' staat er voor het geval dat later niet meer
--   geldt; een tekst van iemand die het bericht al heeft gekregen veranderen
--   zou het archief laten liegen over wat er verstuurd is.
--
-- Onderwerp ("Copilot beyond the pilot") en bericht 2 blijven zoals ze waren;
-- bericht 2 noemde Glint niet.
--
-- Back-up vooraf: _dq_backup_outreach_contact_20261109 (3026 rijen).
-- Toegepast op 9 november 2026: 750 rijen, nul die nog 'Glint' noemen.

update public.outreach_contact oc
set msg1_body =
  'Hi ' || btrim(oc.first_name) || E',\n\n'
  || 'In your role as ' || btrim(oc.title) || ' you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.'
  || E'\n\n'
  || 'With a number of your colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.'
  || E'\n\n'
  || 'I would like to touch base on where that would help in your accounts.'
  || E'\n'
  || 'Do you have 20 minutes in the next two weeks?'
  || E'\n\nMarco',
  updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Microsoft AE EMEA 2026'
  and oc.status = 'queued';

-- Terugdraaien:
--   update public.outreach_contact oc
--   set msg1_body = b.msg1_body
--   from public._dq_backup_outreach_contact_20261109 b where b.id = oc.id;
