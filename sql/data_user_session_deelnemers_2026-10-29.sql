-- Deelnemerslijst online user session, donderdag 5 november 2026.
--
-- Olivier stuurde de lijst van 17 die zich bij hem hadden gemeld. In de tab
-- Leads, blok Customer session, stonden er daarvan zeven op ja.
--
-- WAT ER IS BIJGEWERKT
--   8  waren uitgenodigd maar hadden nooit geantwoord -> ja
--   1  Amy Healey stond op nee met een ruisvlag -> ja, vlag eraf
--   1  Alexandra Abreu stond er niet in -> nieuwe rij
--
-- WAAROM source = 'internal'
--   De bevestiging kwam niet via de link in de uitnodiging binnen maar via
--   Olivier. Dan hoort registered_by ingevuld te zijn, net als bij de rij die
--   Yarmilla eerder met de hand toevoegde. Zo blijft zichtbaar welk ja uit de
--   uitvraag zelf komt en welk ja er met de hand in is gezet.
--
-- WAAROM bot_suspected BIJ AMY HEALEY ERAF MOET
--   Haar nee kwam binnen drie minuten na verzenden binnen, en dat is precies het
--   patroon van een linkscanner die de mail opent. De tab laat zulke rijen niet
--   zien. Nu zij zich bij Olivier heeft gemeld is duidelijk dat dat nee niet van
--   haar kwam, dus de vlag kan weg.
--
-- EEN TOKEN VOOR EEN RIJ ZONDER UITNODIGING
--   user_session_invites.token is NOT NULL. Alexandra krijgt er dus een, maar er
--   gaat geen mail meer naartoe: de uitvraag is gesloten en zij staat al vast.

create table if not exists _dq_backup_user_session_invites_20261029 as select * from user_session_invites;

update user_session_invites
   set answer = 'yes', answer_at = now(), confirmed = true, confirmed_at = now(),
       bot_suspected = false, source = 'internal', registered_by = 'olivier@eclectik.co',
       updated_at = now()
 where lower(email) in (
   'anne.sarrabayrouse.external@almirall.com','fmraz@sofi.org','jenni.janeczko@bmrn.com',
   'kathryn.kavanagh@tranetechnologies.com','kim.warner@nmhs.net','mar.llach@almirall.com',
   'michelle_parkin@bmc.com','shahed_alqadi@bmc.com','amy.healey@cognex.com');

insert into user_session_invites
  (token, email, first_name, company, answer, answer_at, confirmed, confirmed_at,
   source, registered_by)
values
  ('v6RAP6G-7CxjCcIl9GAg-tL9v1RctnrSKOWLGBcI9Cw', 'Alexandra.Abreu@cognex.com',
   'Alexandra', 'Cognex', 'yes', now(), true, now(), 'internal', 'olivier@eclectik.co');

-- tiffanyivory@gmail.com was door Yarmilla foutief toegevoegd. Verwijderd op
-- verzoek van Olivier, en wel echt verwijderd en niet op nee gezet: zij is nooit
-- uitgenodigd, dus een nee zou suggereren dat zij heeft afgezegd. De rij staat in
-- _dq_backup_user_session_invites_20261029.
delete from user_session_invites where lower(email) = 'tiffanyivory@gmail.com';

-- Controle: 18 op ja zonder ruisvlag, zijnde de 17 van Olivier plus Roberto
-- Olivazzo van ETF, die blijft staan.
-- select lower(email), first_name, company, source, registered_by
--   from user_session_results where answer = 'yes' and not bot_suspected
--  order by company, first_name;
