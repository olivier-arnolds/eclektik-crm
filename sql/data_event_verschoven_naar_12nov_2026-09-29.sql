-- Het event van 6 oktober is verschoven naar 12 november.
-- Plus: Esther van Lunteren meldde zich opnieuw aan met een ander adres.

create table _dq_backup_marketing_leads_20260929 as select * from marketing_leads;          -- 14
create table _dq_backup_marketing_lead_activity_20260929 as select * from marketing_lead_activity; -- 17
create table _dq_backup_contacts_20260929 as select * from contacts;                        -- 1837
create table _dq_backup_contact_tags_20260929 as select * from contact_tags;                -- 1720

-- 1. De bestaande aanmeldingen naar de nieuwe datum. De oorspronkelijke datum
--    blijft bewaard in originalEventDate: wat iemand destijds invulde is een
--    feit, en dat willen we niet overschrijven, alleen aanvullen.
update marketing_lead_activity
set payload = payload
      || jsonb_build_object('eventDate', '2026-11-12')
      || jsonb_build_object('originalEventDate', payload->>'eventDate')
where event = 'event_registered' and payload->>'eventDate' = '2026-10-06';
-- 10 rijen

-- 2. Esther's nieuwe adres als contact, met de tag.
insert into contacts (email, full_name, first_name, last_name, company_name, title,
                      source, event_source, marketing_content_opt_in, do_not_email)
values ('esthervanlunteren1971@gmail.com', 'Esther van Lunteren', 'Esther', 'van Lunteren',
        'People Impact Collective', 'CHRO',
        'Aanmelding event Amsterdam 12 nov 2026', 'amsterdam-2026', true, false);

update tags set name = 'Event 12 nov aangemeld' where name = 'Event 6 okt aangemeld';

insert into contact_tags (contact_id, tag_id)
select c.id, t.id from contacts c, tags t
where c.email = 'esthervanlunteren1971@gmail.com' and t.name = 'Event 12 nov aangemeld';

-- 3. Pas daarna de oude registratie weg. Volgorde is bewust: eerst het nieuwe
--    adres bereikbaar maken, dan het oude opruimen, zodat er geen moment is
--    waarop Esther helemaal uit de mailgroep valt.
--    De oude lead had precies een activiteit, dus er gaat niets anders verloren.
delete from contacts where email = 'info@peopleimpactcollective.nl';
delete from marketing_lead_activity where marketing_lead_id = '7a6cc5af-7ed7-431f-875a-6105ba7b4344';
delete from marketing_leads where id = '7a6cc5af-7ed7-431f-875a-6105ba7b4344';

-- Controle: 9 contacten met de tag, 10 aanmeldingen waarvan 9 echt (1 eigen test).
