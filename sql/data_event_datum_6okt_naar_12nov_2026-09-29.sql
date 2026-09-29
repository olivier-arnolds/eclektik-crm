-- Het event verschuift van 6 oktober naar 12 november 2026. Dit zet alles
-- na dat de oude datum nog noemde of eraan vastzat.
--
-- HET PRINCIPE DAT DE VOLGORDE BEPAALT
--   Een opgeslagen berichttekst is twee dingen tegelijk: het concept van wat er
--   nog uitgaat, en het bewijs van wat er al uit is. Voor wie het bericht nog
--   moet krijgen, moet de nieuwe datum erin. Voor wie het al gekregen heeft,
--   moet er blijven staan wat die persoon werkelijk gelezen heeft. Anders
--   beweert de database straks dat we iets geschreven hebben wat niemand ooit
--   ontvangen heeft.
--
--   De scheidslijn is niet de status maar het bestaan van een verstuurd bericht
--   in outreach_message. Dat is het feit; status is een afgeleide.

create table _dq_backup_outreach_contact_20260929 as select * from outreach_contact;   -- 2225
create table _dq_backup_outreach_campaign_20260929 as select * from outreach_campaign; -- 3

-- 1. Eerst alles om, daarna het al verstuurde terugzetten. Dat is minder
--    elegant dan meteen selectief updaten, maar wel makkelijker na te lopen:
--    de controle onderaan telt beide kanten apart.
update outreach_contact set
  msg1_body = replace(msg1_body, '6 October', '12 November'),
  msg2_body = replace(replace(msg2_body, '6 October', '12 November'), 'the 6th', 'the 12th'),
  updated_at = now()
where msg1_body like '%6 October%' or msg2_body like '%6 October%' or msg2_body like '%the 6th%';

update outreach_contact oc set msg1_body = b.msg1_body
from _dq_backup_outreach_contact_20260929 b
where b.id = oc.id and oc.msg1_body is distinct from b.msg1_body
  and exists (select 1 from outreach_message m
              where m.contact_id = oc.id and m.direction = 'outbound' and m.sequence_step = 1);

update outreach_contact oc set msg2_body = b.msg2_body
from _dq_backup_outreach_contact_20260929 b
where b.id = oc.id and oc.msg2_body is distinct from b.msg2_body
  and exists (select 1 from outreach_message m
              where m.contact_id = oc.id and m.direction = 'outbound' and m.sequence_step = 2);

-- 2. De harde stopdatums zaten vast aan de oude datum. Dezelfde verschuiving
--    (37 dagen) houdt de afstand tot het event gelijk: e-mail stopte vier dagen
--    ervoor, LinkedIn een dag ervoor.
update outreach_campaign set hard_stop_at = hard_stop_at + interval '37 days', updated_at = now()
where hard_stop_at is not null;
-- Amsterdam 2026: 2026-11-08. LinkedIn en Glint Prioriteit A: 2026-11-11.

update contacts set source = 'Aanmelding event Amsterdam 12 nov 2026', updated_at = now()
where source = 'Aanmelding event Amsterdam 6 okt 2026';

-- Controle achteraf:
--   bericht 1: 873 verstuurd houden '6 October', 832 open staan op '12 November', geen kruisbesmetting
--   bericht 2: 470 verstuurd houden de oude datum, 903 open staan op de nieuwe
