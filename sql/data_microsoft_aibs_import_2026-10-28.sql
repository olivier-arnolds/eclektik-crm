-- Microsoft AIBS-specialisten toevoegen aan de CRM.
--
-- WAAROM DEZE VORM
--   Besloten in de meeting van 28-10-2026: de specialisten worden als contact
--   onder hun eigen Microsoft-landenaccount gezet EN via account_links met
--   link_type 'partner' gekoppeld aan elke klant waar ze bij horen. Daardoor
--   staan ze bij die klant als contactpersoon vanuit de partner, en toont hun
--   eigen kaart alle accounts waar ze aan hangen. Eva Wittenzellner is daar het
--   bestaande voorbeeld van (negentien koppelingen).
--
-- NIET MEEGENOMEN
--   Kinga Debreczeni, Vincent Smith en Etienne Athimon. Die staan rood in de
--   bronlijst: daar is al contact mee. Kinga en Etienne staan al in de CRM.
--
-- Back-ups vooraf: _dq_backup_companies_20261028, _dq_backup_contacts_20261028,
-- _dq_backup_account_links_20261028.

-- 1. Twee ontbrekende landenaccounts. Spanje en Ierland bestonden nog niet,
--    terwijl vier van de 22 daar zitten.
insert into companies (name, type, stage, owner, industry, website, country)
select v.name, v.type, v.stage, v.owner, v.industry, v.website, v.country
  from (values
    ('Microsoft SPAIN',   'Partner', 'Active', 'Marco van Gelder', 'Information Technology', 'https://microsoft.com', 'Spain'),
    ('Microsoft IRELAND', 'Partner', 'Active', 'Marco van Gelder', 'Information Technology', 'https://microsoft.com', 'Ireland')
  ) v(name, type, stage, owner, industry, website, country)
 where not exists (select 1 from companies c where c.name = v.name);

-- 2. De 22 contacten. title alleen waar de bronlijst een echte functietitel
--    geeft; waar die ontbreekt staat de gevonden informatie in headline, zodat
--    er niets verzonnen wordt en niets verloren gaat.
insert into contacts (full_name, first_name, last_name, email, title, headline,
                      company_id, owner, linkedin_url, country, source)
select v.full_name, v.first_name, v.last_name, v.email, v.title, v.headline,
       (select c.id from companies c where c.name = v.ms_account),
       'Marco van Gelder', v.linkedin_url, v.country, 'Microsoft AIBS lijst 20-10-2026'
  from (values
 ('Daniel Marquiegui','Daniel','Marquiegui','danielmarq@microsoft.com','AI Business Solutions Engineer, Western Europe',null,'Microsoft SPAIN','https://es.linkedin.com/in/danielmarquiegui','Spain'),
 ('Miguel Ángel Cervera','Miguel Ángel','Cervera','miguelangel.cervera@microsoft.com','Senior Director AI Business Solutions, Western Europe',null,'Microsoft SPAIN','https://es.linkedin.com/in/miguelangelcervera/es','Spain'),
 ('Ryan Madigan','Ryan','Madigan','ryanmadigan@microsoft.com','Director, Workforce AI Solutions, Strategic Accounts',null,'Microsoft USA','https://www.linkedin.com/in/ryanmadigan','United States'),
 ('Erin Spencer','Erin','Spencer','espencer@microsoft.com',null,'Modern Work, Microsoft 365, Viva, Copilot, Healthcare','Microsoft USA','https://www.linkedin.com/in/erin-spencer/','United States'),
 ('Sherif Hamza','Sherif','Hamza','shamza@microsoft.com','Director, AI Business Solutions, Middle East & Africa',null,'Microsoft UAE',null,'United Arab Emirates'),
 ('Nicolette Pringle','Nicolette','Pringle','nicolette.pringle@microsoft.com','AI Workforce Senior Specialist',null,'Microsoft SOUTH AFRICA','https://za.linkedin.com/in/nicolettepringle','South Africa'),
 ('Tim Newton','Tim','Newton','timnewt@microsoft.com',null,'Microsoft Enterprise Sales, strategische accounts en AI. LET OP: profiel onbevestigd, twee LinkedIn-profielen met deze naam.','Microsoft USA',null,'United States'),
 ('Marie-Elena Inacio','Marie-Elena','Inacio','minacio@microsoft.com','Senior Director, AI Workforce, Copilot & Agents, Americas',null,'Microsoft USA',null,'United States'),
 ('Eoin Gaffney','Eoin','Gaffney','eoingaffney@microsoft.com','AI Workforce Solution Specialist',null,'Microsoft IRELAND','https://ie.linkedin.com/in/eoin-gaffney','Ireland'),
 ('Emily Martin','Emily','Martin','emilymartin@microsoft.com','Director Specialist, AI Workforce, Software & Digital Platforms',null,'Microsoft USA',null,'United States'),
 ('Aoife Corcoran','Aoife','Corcoran','acorcoran@microsoft.com','Sr. Enterprise Security Specialist',null,'Microsoft IRELAND','https://www.linkedin.com/in/aoife-corcoran-0b62ba141/','Ireland'),
 ('Sebastian Brinke','Sebastian','Brinke','sebastian.brinke@microsoft.com','AI Workforce Specialist, Life Science',null,'Microsoft GERMANY','https://de.linkedin.com/in/sebastian-brinke','Germany'),
 ('Klaudia Bysiec','Klaudia','Bysiec','kbysiec@microsoft.com','Solution Specialist Modern Workplace, Pharma & Life Sciences',null,'Microsoft GERMANY','https://de.linkedin.com/in/klaudiabysiec','Germany'),
 ('Jimmy Chalhub','Jimmy','Chalhub','jimmy.chalhub@microsoft.com','Director, AI Workforce',null,'Microsoft USA','https://www.linkedin.com/in/jimmychalhub','United States'),
 ('Charlotte Gomez-Gimeno','Charlotte','Gomez-Gimeno','charlotte.gomez@microsoft.com','AI Business Solutions Sales Lead, Microsoft Europe North',null,'Microsoft BELGIUM','https://www.linkedin.com/in/charlottegomezgimeno/','Belgium'),
 ('Eric Inch','Eric','Inch','eric.inch@microsoft.com','Principal Solution Specialist, Security, Compliance & Identity',null,'Microsoft USA','https://www.linkedin.com/in/ericjinch','United States'),
 ('Laura D''Ambra','Laura','D''Ambra','laura.dambra@microsoft.com','AI Workforce Sales Lead, Enterprise & Public Sector, Microsoft Italy',null,'Microsoft ITALY',null,'Italy'),
 ('Niklas Preiss','Niklas','Preiss','nipreiss@microsoft.com',null,'Geen openbaar Microsoft-profiel gevonden; land aangenomen op Duitsland.','Microsoft GERMANY',null,'Germany'),
 ('Denisa Köhler','Denisa','Köhler','denisa.koehler@microsoft.com','Sales Manager Modern Work & Copilot',null,'Microsoft GERMANY','https://de.linkedin.com/in/denisakoehler','Germany'),
 ('Brooke Madsen','Brooke','Madsen','brooke.madsen@microsoft.com','Modern Work Specialist',null,'Microsoft USA',null,'United States'),
 ('Jason Lent','Jason','Lent','jason.lent@microsoft.com','Director of AI Business Solutions Sales, Manufacturing & Mobility',null,'Microsoft USA','https://www.linkedin.com/in/jason-lent','United States'),
 ('Mary Andrews','Mary','Andrews','maryand@microsoft.com','Sr. Sales Director, AI Workforce Strategic Accounts',null,'Microsoft USA',null,'United States')
  ) v(full_name, first_name, last_name, email, title, headline, ms_account, linkedin_url, country)
 where not exists (select 1 from contacts k where lower(k.email) = lower(v.email));

-- 3. Partnerkoppelingen naar de klantaccounts. Pepkor Speciality heeft geen
--    eigen account; PEPKOR (A-0008) dekt beide divisies.
insert into account_links (account_id, contact_id, link_type, role, created_by)
select co.id, k.id, 'partner', 'AIBS specialist', 'olivier@eclectik.co'
  from (values
 ('danielmarq@microsoft.com','A-0009'),('danielmarq@microsoft.com','A-0011'),
 ('danielmarq@microsoft.com','A-0042'),('danielmarq@microsoft.com','A-0177'),
 ('miguelangel.cervera@microsoft.com','A-0014'),('miguelangel.cervera@microsoft.com','A-0017'),
 ('ryanmadigan@microsoft.com','A-0016'),('ryanmadigan@microsoft.com','A-0077'),
 ('espencer@microsoft.com','A-0047'),('espencer@microsoft.com','A-0041'),
 ('shamza@microsoft.com','A-0008'),
 ('nicolette.pringle@microsoft.com','A-0008'),
 ('timnewt@microsoft.com','A-0046'),
 ('minacio@microsoft.com','A-0034'),
 ('eoingaffney@microsoft.com','A-0013'),
 ('emilymartin@microsoft.com','A-0016'),
 ('acorcoran@microsoft.com','A-0021'),
 ('sebastian.brinke@microsoft.com','A-0015'),
 ('kbysiec@microsoft.com','A-0015'),
 ('jimmy.chalhub@microsoft.com','A-0004'),
 ('charlotte.gomez@microsoft.com','A-0056'),
 ('eric.inch@microsoft.com','A-0043'),
 ('laura.dambra@microsoft.com','A-0043'),
 ('nipreiss@microsoft.com','A-0060'),
 ('denisa.koehler@microsoft.com','A-0061'),
 ('brooke.madsen@microsoft.com','A-0047'),
 ('jason.lent@microsoft.com','A-0066'),
 ('maryand@microsoft.com','A-0066')
  ) v(email, account_no)
  join contacts  k  on lower(k.email) = v.email
  join companies co on co.account_no  = v.account_no
 where not exists (
   select 1 from account_links al
    where al.account_id = co.id and al.contact_id = k.id and al.link_type = 'partner');
