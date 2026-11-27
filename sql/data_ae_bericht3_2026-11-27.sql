-- Bericht 3 voor de campagne Microsoft Account Executives 2026.
--
-- WAAROM JUIST DEZE CAMPAGNE
--   Hij is helemaal door de reeks heen: van de 29 contacten hebben er 22 beide
--   berichten gehad en niets laten horen, 3 antwoordden, 2 staan op afgerond,
--   1 bouncede en 1 verwees door. Die 22 zijn de hele doelgroep voor een derde
--   bericht. De EMEA-campagne krijgt er nu geen: daar hebben pas 12 mensen
--   bericht 2 gehad, dus die groep bestaat nog niet.
--
-- WAT DE TEKST DOET
--   Hij brengt nieuws in plaats van te herinneren: een afgeronde AI ROI-analyse
--   bij een Fortune Global 500-verzekeraar. Een derde keer vragen of iemand
--   twintig minuten heeft is aandringen; een derde keer iets vertellen wat die
--   persoon kan gebruiken is een reden om te schrijven.
--
--   'Last note from me on this' staat er bewust. Een expliciet slot haalt de
--   druk eruit en levert in de praktijk meer antwoorden op dan nog een vraag.
--
--   De afsluiter noemt het account van die AE, gehaald uit msg1_subject
--   ('Copilot at <account>'). Dat is hetzelfde onderzoekswerk dat bericht 1
--   sterk maakte; dat laten vallen zou de mail algemeen maken.
--
-- EEN EIGEN ONDERWERP, GEEN 'Re:'
--   Bericht 2 ging als 'Re:' op bericht 1, want dat was een opvolging in
--   dezelfde draad. Een derde mail met opnieuw 'Re:' leest als aandringen,
--   terwijl deze juist iets nieuws brengt. subjectForStep kent die uitzondering
--   nu: een gevulde msg3_subject wordt letterlijk gebruikt.
--
-- TE CONTROLEREN DOOR EEN MENS
--   'Fortune Global 500' is een checkbare bewering en de ontvangers zijn
--   Microsoft-AE's die die lijst kennen. Klopt het niet letterlijk, maak er dan
--   'a global insurer' van. En kijk of het contract iets zegt over het noemen
--   als referentie, ook ongenoemd: een Fortune Global 500-verzekeraar in EMEA
--   is een korte lijst.
--
-- Back-up vooraf: _dq_backup_outreach_contact_ae_20261127 (29 rijen).
-- Toegepast op 27 november 2026: 22 rijen.

create table if not exists public._dq_backup_outreach_contact_ae_20261127 as
select * from public.outreach_contact
where campaign_id = '3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48';

update public.outreach_contact oc
set msg3_subject = 'What the ROI number looked like',
    msg3_body =
      'Hi ' || btrim(oc.first_name) || E',\n\n'
      || 'Last note from me on this.'
      || E'\n\n'
      || 'We recently finished an AI ROI analysis for a Fortune Global 500 insurer. '
      || 'Adoption data on one side, the work their people actually do on the other, '
      || 'and a dollar value per use case that finance could stand behind.'
      || E'\n\n'
      || 'What moved the rollout was not the size of the number. It was that nobody '
      || 'had to take it on faith.'
      || E'\n\n'
      || 'Happy to brainstorm where that could help you get customers further along, '
      || 'starting with ' || replace(oc.msg1_subject, 'Copilot at ', '') || '.'
      || E'\n\nMarco',
    updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Microsoft Account Executives 2026'
  and oc.status = 'msg2_sent'
  and oc.msg1_subject like 'Copilot at %';

-- Controle achteraf: 22 rijen, geen em-dashes, geen lege accountnaam, 84 tot 87
-- woorden.
--   select count(*) filter (where msg3_body is not null),
--          count(*) filter (where msg3_body like '%' || chr(8212) || '%'),
--          count(*) filter (where msg3_body like '%, starting with .%')
--   from public.outreach_contact
--   where campaign_id = '3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48';

-- LET OP BIJ HET VERSTUREN
--   Bericht 3 valt onder dezelfde remmen als bericht 2: het gaat alleen uit als
--   de inboxscan jonger is dan twaalf uur (STALE_HOURS). Die scan draait in de
--   browser. Zonder scan staat de campagne stil zonder foutmelding.
--
--   Van de 22 staan er 4 op 'antwoord binnen, wacht op beoordeling'; die krijgen
--   niets tot een mens gekeken heeft. Blijven er 18 over, met een dagcap van 12.

-- Terugdraaien:
--   update public.outreach_contact oc
--   set msg3_subject = null, msg3_body = null
--   from public._dq_backup_outreach_contact_ae_20261127 b where b.id = oc.id;
