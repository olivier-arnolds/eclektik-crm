-- Tweede bericht voor de campagne Glint Prioriteit B.
--
-- WAAROM NIET LETTERLIJK DE TEKST VAN PRIORITEIT A
--   De opvolging van Prioriteit A opent met 'wat er gebeurt met een
--   luisterprogramma in de tien maanden tussen twee cycli'. Dat is waar bericht
--   1 van A over ging. Bericht 1 van B gaat over iets anders: waar cycli lekken
--   (een dashboard zonder uitleg, plannen die nooit heropend worden) en over AI
--   die bij mensen landt die het tijdpad niet hebben gekozen. Een terugverwijzing
--   naar een brief die je niet gestuurd hebt is het soort detail waar een lezer
--   meteen over valt, dus alleen die eerste zin is herschreven. De opbouw, de
--   toon en de afsluiting zijn gelijk aan A.
--
-- EEN KORTE OPVOLGING, NIET NOG EEN LANGE BRIEF
--   Bericht 1 is per contact geschreven en lang. Dat herhalen zou betekenen dat
--   er 195 nieuwe teksten gemaakt moeten worden. Een opvolging werkt anders:
--   kort, terugverwijzend, met een uitweg voor wie het niet is ("wijs me door").
--   Alleen de voornaam verschilt.
--
-- DRIE VARIANTEN, EEN OPVOLGING
--   Bericht 1 bestaat in drie smaken (draait Glint, draaide Glint,
--   platform-neutraal). De alinea over waar cycli lekken staat in alle drie,
--   woordelijk hetzelfde. Daarom kan de terugverwijzing voor alle 195 dezelfde
--   zijn zonder dat hij voor iemand onzin is.
--
-- HET ONDERWERP IS 'Re:' PLUS HET ORIGINEEL
--   Per contact dus een ander onderwerp, net als bericht 1. Er zit geen echte
--   thread achter: het is een nieuwe mail met Re: ervoor. Bestaande huisstijl.
--
-- ALLE 195, NIET ALLEEN DE VERSTUURDE
--   Bij A ging dit over contacten die bericht 1 al hadden gehad. Hier staat de
--   campagne nog op paused en heeft niemand iets gekregen, dus de tekst gaat er
--   bij iedereen in. Dan staat hij klaar zodra bericht 1 loopt.
--
-- LET OP BIJ HET VERSTUREN
--   Bericht 2 gaat alleen uit als de inboxscan jonger is dan twaalf uur
--   (STALE_HOURS in api/_lib/outreach-send-lib.js). Die scan draait bij
--   e-mailcampagnes in de browser. Zonder scan staat de campagne stil zonder
--   foutmelding.
--
-- Back-up vooraf: _dq_backup_outreach_contact_priob_20261113 (195 rijen).
-- Toegepast op 13 november 2026.

update public.outreach_contact oc
set msg2_subject = 'Re: ' || oc.msg1_subject,
    msg2_body =
      'Hi ' || btrim(oc.first_name) || E',\n\n'
      || 'A few weeks ago I wrote about where listening cycles tend to leak: a dashboard that arrives without instructions, plans written in the fortnight after the readout and never reopened. No reply needed if the timing was off.'
      || E'\n\n'
      || 'One thing I should have put first: what people ask us most is not about the platform, it is how to show the board that the programme changed something. That is the part we work on.'
      || E'\n\n'
      || 'And if this sits with someone else in your team, pointing me there helps just as much.'
      || E'\n\n'
      || 'Worth thirty minutes?'
      || E'\n\nOlivier',
    updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Glint Prioriteit B'
  and oc.msg1_subject is not null;

-- Terugdraaien:
--   update public.outreach_contact oc
--   set msg2_subject = b.msg2_subject, msg2_body = b.msg2_body
--   from public._dq_backup_outreach_contact_priob_20261113 b where b.id = oc.id;
