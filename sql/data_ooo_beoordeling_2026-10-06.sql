-- Afwezigheidsmeldingen in Amsterdam 2026 met de hand beoordeeld.
--
-- WAAROM MET DE HAND
--   De classificatie kwam er bij deze 32 niet uit, of de scan kwam niet aan het
--   verwerken toe. Olivier heeft ze op 6 oktober allemaal gelezen: op een na
--   afwezigheidsmeldingen.
--
-- WAAROM GEEN EIGEN STATUS 'ooo'
--   De verzender kent maar twee statussen die in aanmerking komen: queued voor
--   bericht 1 en msg1_sent voor bericht 2. Een status 'ooo' zou deze mensen
--   permanent uitsluiten, precies het omgekeerde van de bedoeling. De
--   afwezigheid hoort op het BERICHT (classification) en de deblokkering op het
--   CONTACT (next_action_at). Zo werkt statusAfterClassification ook.
--
-- DRIE UITZONDERINGEN, GEEN VAN ALLE EEN TIJDELIJKE AFWEZIGHEID
--   Nicole Snijders    echt antwoord aan Marco, staat terecht op replied
--   Melissa Uljevic    vertrokken, account wordt niet gelezen, staat op referred
--   Angelique van Sonderen  niet meer werkzaam bij Appel, staat op paused
--   En een vierde die als afwezigheid gelezen werd maar het niet is:
--   Marije Verschelling  "dit email adres wordt niet gelezen", geen vervanger.
--                        Dat is een dood postvak en geen vakantie; op paused gezet.

create table _dq_backup_outreach_contact_20261006b as select * from outreach_contact;
create table _dq_backup_outreach_message_20261006 as select * from outreach_message;

update outreach_contact
set status = 'paused', next_action_at = null,
    paused_reason = 'postvak wordt niet gelezen (automatisch antwoord, geen vervanger genoemd)',
    updated_at = now()
where id = '95c15d1b-d64e-4628-97e0-4dee1dbed7f5';

update outreach_message m
set classification = 'ooo', classification_confidence = 1
from outreach_contact oc
where m.contact_id = oc.id and m.direction = 'inbound' and m.classification is null
  and oc.campaign_id = '5caf44f8-e6cc-4ecc-a61f-c729c7155089'
  and oc.last_inbound_at is not null
  and (oc.answered_at is null or oc.answered_at < oc.last_inbound_at)
  and oc.id not in ('1f0b3344-997d-4a52-8266-e589d8dd52ea',
                    '5df966d7-e514-43d3-898a-ca8617e5e21c',
                    'd1f83cfb-6b23-4abc-9249-fbbce7a05eab',
                    '95c15d1b-d64e-4628-97e0-4dee1dbed7f5');

-- Een lege next_action_at naast een binnengekomen antwoord betekent "wacht op
-- beoordeling". Die beoordeling is nu gedaan, en de afwezigheden dateren van
-- weken terug, dus die mensen zijn allang terug.
update outreach_contact
set next_action_at = now(), updated_at = now()
where campaign_id = '5caf44f8-e6cc-4ecc-a61f-c729c7155089'
  and last_inbound_at is not null and next_action_at is null
  and status in ('queued', 'msg1_sent', 'msg2_sent')
  and id not in ('1f0b3344-997d-4a52-8266-e589d8dd52ea',
                 '5df966d7-e514-43d3-898a-ca8617e5e21c',
                 'd1f83cfb-6b23-4abc-9249-fbbce7a05eab',
                 '95c15d1b-d64e-4628-97e0-4dee1dbed7f5');

-- Na afloop: nog 4 geblokkeerd, en dat zijn precies de vier uitzonderingen.
