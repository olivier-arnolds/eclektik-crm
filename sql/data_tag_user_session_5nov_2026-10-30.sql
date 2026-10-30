-- Tag 'User session 5 nov' op de 19 deelnemers aan de online user session.
--
-- WAAROM EEN TAG EN GEEN NIEUWE LIJST
--   Tags hangen aan contacts, en de composer selecteert ontvangers op tag. De
--   sessiedeelnemers stonden alleen in user_session_invites, en daar kan de
--   composer niet bij. Deze tag is de brug.
--
-- ALEXANDRA ABREU BESTOND NOG NIET ALS CONTACT
--   Zij kwam gisteren met de hand in de sessielijst terecht en had nog geen
--   contactrij. Aangemaakt onder het bestaande account Cognex, net als Amy
--   Healey. Anders dan bij de koude Microsoft-lijst hoort zij wel onder een
--   account: Cognex is een klant en zij komt naar onze sessie.
--
-- GEKOPPELD OP E-MAIL EN NIET OP contact_id
--   De sessierij van Alexandra wijst nergens heen, want haar contact bestond nog
--   niet toen die rij werd gemaakt. Op e-mail koppelen pakt haar wel mee.

create table if not exists _dq_backup_contact_tags_20261030 as select * from contact_tags;

insert into contacts (full_name, first_name, last_name, email, company_id, company_name,
                      stage, source)
select 'Alexandra Abreu', 'Alexandra', 'Abreu', 'Alexandra.Abreu@cognex.com',
       '88eee30a-8548-437b-b411-b72a35d6d80a', 'Cognex', 'Active', 'User session 5 nov 2026'
 where not exists (select 1 from contacts where lower(email) = 'alexandra.abreu@cognex.com');

insert into tags (name, color, type, description)
select 'User session 5 nov', '#888780', 'custom',
       'Deelnemers aan de online user session van 5 november 2026'
 where not exists (select 1 from tags where name = 'User session 5 nov');

insert into contact_tags (contact_id, tag_id, tagged_by)
select c.id, t.id, 'olivier@eclectik.co'
  from user_session_invites i
  join contacts c on lower(c.email) = lower(i.email)
  cross join (select id from tags where name = 'User session 5 nov') t
 where i.answer = 'yes' and not i.bot_suspected
on conflict do nothing;

-- Controle: 19 contacten met de tag, geen van allen op do_not_email.
-- select count(*) from contact_tags ct join tags t on t.id = ct.tag_id
--  where t.name = 'User session 5 nov';
