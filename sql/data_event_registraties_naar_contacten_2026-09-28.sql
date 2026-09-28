-- De aanmeldingen voor het event van 6 oktober als contacten, met een tag.
--
-- WAAROM
--   Aanmeldingen leven in marketing_leads; de composer verstuurt aan contacts.
--   Van de negen echte aanmelders stond er maar een in contacts, dus een filter
--   in de tab Contacten had er acht niet bereikt. Er is ook geen sleutelrelatie
--   tussen de twee: iemand meldt zich aan met het adres dat hij zelf kiest, dus
--   de koppeling gaat op e-mailadres.
--
--   Het event wordt verschoven en iedereen die zich heeft aangemeld moet bericht
--   krijgen. Met de tag doet de bestaande tagfilter in de tab Contacten het werk;
--   daar was geen nieuwe code voor nodig.
--
-- WAT ER BEWUST NIET IN ZIT
--   olivier@masasu.nl, dat was de eigen test.
--
-- marketing_content_opt_in staat op true: deze mensen hebben zich zelf
-- aangemeld en er staat een consent_at bij elke lead.

create table _dq_backup_contacts_20260928 as select * from contacts;          -- 1829
create table _dq_backup_contact_tags_20260928 as select * from contact_tags;  -- 1711

with bron as (
  select l.email, l.full_name, l.company, l.role
  from marketing_lead_activity a join marketing_leads l on l.id = a.marketing_lead_id
  where a.event = 'event_registered' and lower(l.email) <> 'olivier@masasu.nl'
)
insert into contacts (email, full_name, first_name, last_name, company_name, title,
                      source, event_source, marketing_content_opt_in, do_not_email)
select b.email, b.full_name,
       split_part(b.full_name, ' ', 1),
       nullif(trim(substr(b.full_name, length(split_part(b.full_name,' ',1)) + 2)), ''),
       b.company, b.role,
       'Aanmelding event Amsterdam 6 okt 2026', 'amsterdam-2026', true, false
from bron b
where not exists (select 1 from contacts c where lower(c.email) = lower(b.email));
-- 8 nieuw; Killian Fitzgerald bestond al en is niet aangeraakt

insert into tags (name) select 'Event 6 okt aangemeld'
where not exists (select 1 from tags where name = 'Event 6 okt aangemeld');

insert into contact_tags (contact_id, tag_id)
select c.id, (select id from tags where name = 'Event 6 okt aangemeld')
from contacts c
where lower(c.email) in (
  select lower(l.email) from marketing_lead_activity a join marketing_leads l on l.id = a.marketing_lead_id
  where a.event = 'event_registered' and lower(l.email) <> 'olivier@masasu.nl')
and not exists (select 1 from contact_tags ct
  where ct.contact_id = c.id and ct.tag_id = (select id from tags where name = 'Event 6 okt aangemeld'));
-- 9 koppelingen; geen enkele op do_not_email of inactief
