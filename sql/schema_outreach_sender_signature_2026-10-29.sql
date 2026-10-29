-- Per campagne bepalen of de merkhandtekening van de afzender meegaat.
--
-- WAAROM EEN KOLOM EN GEEN VASTE KEUZE
--   De outreachmodule stuurde tot nu toe nooit een handtekening mee, met als
--   reden dat een gestileerde footer onder een mail van vier zinnen verraadt dat
--   er een campagne achter zit. Dat blijft het uitgangspunt, dus de standaard is
--   false. Voor de Microsoft AIBS-campagne wilden Marco en Yarmilla hem er wel
--   bij: die mails gaan naar mensen die hem mogen kunnen plaatsen en terugbellen.
--
-- STANDAARD FALSE
--   Zo verandert er niets aan de lopende campagnes (Amsterdam, Glint). Wie de
--   handtekening wil zet hem per campagne aan.

alter table outreach_campaign
  add column if not exists sender_signature boolean not null default false;

comment on column outreach_campaign.sender_signature is
  'Gaat de merkhandtekening van sender_mailbox mee onder de mail? Standaard false: een gestileerde footer onder een korte persoonlijke mail verraadt de campagne.';

-- Microsoft AIBS 2026: wel een handtekening, op verzoek van Marco en Yarmilla.
update outreach_campaign
   set sender_signature = true
 where id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27';
