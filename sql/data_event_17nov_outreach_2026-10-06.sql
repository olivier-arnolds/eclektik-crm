-- Het event verschoof van 12 naar 17 november. Dit zet de outreach-campagnes
-- Amsterdam 2026 klaar om hervat te worden.
--
-- DEZELFDE REGEL ALS BIJ DE VORIGE VERSCHUIVING
--   Een opgeslagen berichttekst is het concept van wat nog uitgaat EN het bewijs
--   van wat al uit is. Wat nog moet: de nieuwe datum. Wat al gelezen is: laten
--   staan, anders beweert de database dat we iets geschreven hebben wat niemand
--   ooit ontvangen heeft. De scheidslijn is het bestaan van een verstuurd bericht
--   in outreach_message, niet de status; status is de afgeleide.

create table _dq_backup_outreach_contact_20261006 as select * from outreach_contact;
create table _dq_backup_outreach_campaign_20261006 as select * from outreach_campaign;

update outreach_contact oc
set msg1_body = replace(oc.msg1_body, '12 November', '17 November'), updated_at = now()
where oc.msg1_body like '%12 November%'
  and not exists (select 1 from outreach_message m
                  where m.contact_id = oc.id and m.direction = 'outbound' and m.sequence_step = 1);

update outreach_contact oc
set msg2_body = replace(replace(oc.msg2_body, '12 November', '17 November'), 'the 12th', 'the 17th'),
    updated_at = now()
where (oc.msg2_body like '%12 November%' or oc.msg2_body like '%the 12th%')
  and not exists (select 1 from outreach_message m
                  where m.contact_id = oc.id and m.direction = 'outbound' and m.sequence_step = 2);

-- Harde stopdatums op dezelfde afstand tot het event als voorheen: e-mail vier
-- dagen ervoor, LinkedIn een dag ervoor.
update outreach_campaign set
  hard_stop_at = case when channel = 'email' then timestamptz '2026-11-13 00:00:00+00'
                      else timestamptz '2026-11-16 00:00:00+00' end,
  updated_at = now()
where name like 'Amsterdam%';

-- Controle: 832 eerste en 903 tweede berichten op 17 november, niets meer op
-- 12 november, en 873 + 470 al verstuurde teksten onveranderd op 6 oktober.
