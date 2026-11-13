-- Tweede bericht voor de campagne Glint Prioriteit A, plus een rustiger tempo.
--
-- WAAROM ER NOOIT IETS UITGING
--   Niet alleen de stopdatum van 11 november: bij alle 253 contacten was
--   msg2_body gewoon leeg. De verzender had dus niets te versturen en meldde
--   dat nergens, want een lege tekst is geen fout maar een lege tekst.
--
-- EEN KORTE OPVOLGING, NIET NOG EEN LANGE BRIEF
--   Bericht 1 is per contact geschreven en lang, met verwijzingen naar hun eigen
--   organisatie. Dat herhalen zou betekenen dat er 253 nieuwe teksten gemaakt
--   moeten worden. Een opvolging werkt anders: kort, terugverwijzend, met een
--   uitweg voor wie het niet is ("wijs me door"). Alleen de voornaam verschilt.
--
-- HET ONDERWERP IS 'Re:' PLUS HET ORIGINEEL
--   Per contact dus een ander onderwerp, net als bericht 1. Let op: er zit geen
--   echte thread achter, het is een nieuwe mail met Re: ervoor. Dat is de
--   bestaande huisstijl (zie de Microsoft-campagnes), maar het is een keuze.
--
-- RUSTIGER TEMPO
--   Dagcap van 60 naar 15: 253 contacten is dan ongeveer zeventien werkdagen.
--   Nieuwe stopdatum 19 december, zodat er marge is maar hij niet eindeloos
--   doorloopt zoals de vorige keer.
--
-- LET OP BIJ HET VERSTUREN
--   Bericht 2 gaat alleen uit als de inboxscan jonger is dan twaalf uur
--   (STALE_HOURS in api/_lib/outreach-send-lib.js). Die scan draait bij
--   e-mailcampagnes in de browser. Zonder scan staat de campagne stil zonder
--   foutmelding.
--
-- Back-up vooraf: _dq_backup_outreach_contact_20261113 (3026 rijen).
-- Toegepast op 13 november 2026: 253 contacten, 10 verschillende onderwerpen.

update public.outreach_contact oc
set msg2_subject = 'Re: ' || oc.msg1_subject,
    msg2_body =
      'Hi ' || btrim(oc.first_name) || E',\n\n'
      || 'A few weeks ago I wrote about what happens to a listening programme in the ten months between cycles. No reply needed if the timing was off.'
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
  and c.name = 'Glint Prioriteit A'
  and oc.status = 'msg1_sent'
  and oc.msg1_subject is not null;

update public.outreach_campaign
set daily_cap = 15, hard_stop_at = '2026-12-19 23:00:00+00', updated_at = now()
where name = 'Glint Prioriteit A';

-- Terugdraaien:
--   update public.outreach_contact oc
--   set msg2_subject = b.msg2_subject, msg2_body = b.msg2_body
--   from public._dq_backup_outreach_contact_20261113 b where b.id = oc.id;
--   update public.outreach_campaign
--   set daily_cap = 60, hard_stop_at = '2026-11-11 00:00:00+00'
--   where name = 'Glint Prioriteit A';
