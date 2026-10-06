-- Een zin vooraan in bericht 2 voor wie bericht 1 nog met 6 oktober kreeg.
--
-- WAAROM
--   Alle 222 openstaande opvolgberichten gaan naar mensen die in september een
--   mail kregen waarin 6 oktober stond. Bericht 2 gaat als antwoord in diezelfde
--   thread en begint met "The afternoon on 17 November". Wie terugscrollt ziet
--   twee verschillende data zonder uitleg, en dat leest als slordigheid over je
--   eigen event.
--
-- WIE WEL EN WIE NIET
--   Alleen contacten die bericht 1 AL kregen met 6 oktober erin en bericht 2 nog
--   niet. Wie nog helemaal niets heeft gehad krijgt straks bericht 1 met
--   17 november, en voor hen zou "de datum is verschoven" juist verwarrend zijn.
--   Vandaar de twee exists-controles op outreach_message en niet op status: ook
--   gepauzeerde contacten krijgen de zin, zodat het klopt als ze later hervat
--   worden.

create table _dq_backup_outreach_contact_20261006c as select * from outreach_contact;

update outreach_contact oc
set msg2_body = regexp_replace(oc.msg2_body, E'^(.*?\n\n)',
      E'\\1One thing first: the date has moved. We are now on Tuesday 17 November, same place, same programme, and this time it is fixed.\n\n'),
    updated_at = now()
where oc.campaign_id = '5caf44f8-e6cc-4ecc-a61f-c729c7155089'
  and oc.msg1_body like '%6 October%'
  -- Idempotent: tweemaal draaien zet de zin er niet twee keer in.
  and oc.msg2_body not like '%the date has moved%'
  and exists (select 1 from outreach_message m where m.contact_id = oc.id
                and m.direction='outbound' and m.sequence_step = 1)
  and not exists (select 1 from outreach_message m where m.contact_id = oc.id
                    and m.direction='outbound' and m.sequence_step = 2);
-- 269 rijen, waarvan 222 direct aan de beurt. Nul bij contacten die nog niets
-- gehad hebben, zoals bedoeld.
