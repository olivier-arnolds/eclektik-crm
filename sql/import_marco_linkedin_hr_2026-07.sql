-- Import: Marco's 1e-lijns LinkedIn HR-connecties (52 contacten / 47 nieuwe bedrijven)
-- Bron: Connecties_Marco_tbv_Workvivo_invite.xlsx | source: 'LinkedIn import Marco 2026-07' | owner: Marco van Gelder
-- Bedrijfsbeschrijvingen bewust weggelaten (kunnen later via Enrich worden bijgevuld).
begin;

-- 1) Nieuwe bedrijven (Bupa bestaat al -> overgeslagen via NOT EXISTS)
with cin(name,website,linkedin_url,industry,employee_count,size,city,dom,ncli) as (values
('Aon','http://www.aon.com','https://www.linkedin.com/company/aon/','Financial Services','93601','10,001+ employees','London','aon.com','linkedin.com/company/aon'),
('Arqiva','http://www.arqiva.com','https://www.linkedin.com/company/arqiva/','Telecommunications','1620','1,001-5,000 employees','Winchester','arqiva.com','linkedin.com/company/arqiva'),
('Asda','http://www.asda.jobs','https://www.linkedin.com/company/everythingatasda/','Retail','52206','10,001+ employees','Leeds','asda.jobs','linkedin.com/company/everythingatasda'),
('Avalere Health','https://avalerehealth.com/','https://www.linkedin.com/company/avalerehealth/','Business Consulting and Services','1298','1,001-5,000 employees','London','avalerehealth.com','linkedin.com/company/avalerehealth'),
('Bidfood UK','http://www.bidfood.co.uk','https://www.linkedin.com/company/bidfooduk/','Food and Beverage Services','2787','5,001-10,000 employees','Slough','bidfood.co.uk','linkedin.com/company/bidfooduk'),
('Boots UK','http://www.boots.jobs','https://www.linkedin.com/company/boots/','Retail','28001','10,001+ employees','Nottingham','boots.jobs','linkedin.com/company/boots'),
('Brunswick Group','https://www.brunswickgroup.com','https://www.linkedin.com/company/brunswick-group/','Business Consulting and Services','1632','1,001-5,000 employees','London','brunswickgroup.com','linkedin.com/company/brunswick-group'),
('BT Group','https://www.bt.com/about','https://www.linkedin.com/company/bt/','Telecommunications','73709','10,001+ employees','London','bt.com','linkedin.com/company/bt'),
('Bupa UK','https://www.bupa.com/','https://www.linkedin.com/company/bupauk/','Hospitals and Health Care','33271','10,001+ employees','London','bupa.com','linkedin.com/company/bupauk'),
('Capita','http://www.capita.com','https://www.linkedin.com/company/capita/','IT Services and IT Consulting','26649','10,001+ employees','London','capita.com','linkedin.com/company/capita'),
('Churchill Group','http://churchillservices.com','https://www.linkedin.com/company/churchill-group-/','Facilities Services','1520','10,001+ employees','Luton','churchillservices.com','linkedin.com/company/churchill-group-'),
('CityFibre','http://www.cityfibre.com','https://www.linkedin.com/company/cityfibre/','Telecommunications','1701','1,001-5,000 employees','London','cityfibre.com','linkedin.com/company/cityfibre'),
('Coca-Cola Europacific Partners','https://www.cocacolaep.com/system/social-media-news','https://www.linkedin.com/company/coca-cola-europacific-partners/','Manufacturing','27235','10,001+ employees','Uxbridge','cocacolaep.com','linkedin.com/company/coca-cola-europacific-partners'),
('De Beers Group','http://www.debeersgroup.com','https://www.linkedin.com/company/debeersgroup/','Retail Luxury Goods and Jewelry','4224','10,001+ employees','London','debeersgroup.com','linkedin.com/company/debeersgroup'),
('Direct Line Group','http://www.directlinegroupcareers.com','https://www.linkedin.com/company/direct-line-group/','Insurance','5950','10,001+ employees','Bromley','directlinegroupcareers.com','linkedin.com/company/direct-line-group'),
('Drax Group','https://www.drax.com','https://www.linkedin.com/company/drax-group/','Utilities','1985','1,001-5,000 employees','Selby','drax.com','linkedin.com/company/drax-group'),
('Foster + Partners','http://www.fosterandpartners.com','https://www.linkedin.com/company/foster-&-partners/','Architecture and Planning','3026','1,001-5,000 employees','London','fosterandpartners.com','linkedin.com/company/foster-&-partners'),
('Great Western Hospitals NHS Foundation Trust','https://www.gwh.nhs.uk/recruitment/','https://www.linkedin.com/company/great-western-hospitals-nhs-foundation-trust/','Hospitals and Health Care','1824','5,001-10,000 employees','Swindon','gwh.nhs.uk','linkedin.com/company/great-western-hospitals-nhs-foundation-trust'),
('GSF Car Parts','https://www.gsfgroup.com','https://www.linkedin.com/company/gsfcarparts/','Motor Vehicle Manufacturing','1523','1,001-5,000 employees','Wolverhampton','gsfgroup.com','linkedin.com/company/gsfcarparts'),
('Howden','http://www.howdengroupholdings.com','https://www.linkedin.com/company/howden-insurance/','Insurance','14608','10,001+ employees','London','howdengroupholdings.com','linkedin.com/company/howden-insurance'),
('HSBC','http://www.hsbc.com','https://www.linkedin.com/company/hsbc/','Financial Services','197861','10,001+ employees','London','hsbc.com','linkedin.com/company/hsbc'),
('IMI','http://www.imiplc.com','https://www.linkedin.com/company/imi/','Industrial Machinery Manufacturing','7629','10,001+ employees','Birmingham','imiplc.com','linkedin.com/company/imi'),
('JD Sports Fashion','https://careers.jdplc.com/','https://www.linkedin.com/company/jd-sports-fashion-plc/','Retail','34627','10,001+ employees','Bury','careers.jdplc.com','linkedin.com/company/jd-sports-fashion-plc'),
('JLR','http://www.jlr.com','https://www.linkedin.com/company/jaguar-land-rover_1/','Motor Vehicle Manufacturing','43669','10,001+ employees','Coventry','jlr.com','linkedin.com/company/jaguar-land-rover_1'),
('King''s College Hospital NHS Foundation Trust','http://www.kch.nhs.uk','https://www.linkedin.com/company/king%27s-college-hospital-nhs-foundation-trust/','Hospitals and Health Care','6469','10,001+ employees','London','kch.nhs.uk','linkedin.com/company/king%27s-college-hospital-nhs-foundation-trust'),
('Krispy Kreme UK & IRE','http://www.krispykreme.co.uk','https://www.linkedin.com/company/krispy-kreme-uk-and-ire/','Retail','303','1,001-5,000 employees','Frimley','krispykreme.co.uk','linkedin.com/company/krispy-kreme-uk-and-ire'),
('Legal & General','https://group.legalandgeneral.com/en','https://www.linkedin.com/company/legal-&-general/','Financial Services','9479','10,001+ employees','London','group.legalandgeneral.com','linkedin.com/company/legal-&-general'),
('LV=','https://www.lv.com','https://www.linkedin.com/company/lv/','Financial Services','2750','1,001-5,000 employees','Bournemouth','lv.com','linkedin.com/company/lv'),
('Menzies Aviation','http://www.menziesaviation.com/','https://www.linkedin.com/company/menzies-aviation/','Airlines and Aviation','18705','10,001+ employees','London','menziesaviation.com','linkedin.com/company/menzies-aviation'),
('National Grid','https://www.nationalgrid.com/','https://www.linkedin.com/company/national-grid/','Utilities','17623','10,001+ employees','London','nationalgrid.com','linkedin.com/company/national-grid'),
('Newcross Healthcare Solutions','https://www.newcrosshealthcare.com','https://www.linkedin.com/company/newcross-healthcare-solutions/','Hospitals and Health Care','1789','10,001+ employees','London','newcrosshealthcare.com','linkedin.com/company/newcross-healthcare-solutions'),
('NHS England','http://www.england.nhs.uk','https://www.linkedin.com/company/nhsengland/','Hospitals and Health Care','58828','5,001-10,000 employees','London','england.nhs.uk','linkedin.com/company/nhsengland'),
('Pentland Brands','http://www.pentlandbrands.com','https://www.linkedin.com/company/pentland-brands/','Apparel and Fashion','2340','1,001-5,000 employees','London','pentlandbrands.com','linkedin.com/company/pentland-brands'),
('Persimmon Homes','http://www.persimmonhomes.com','https://www.linkedin.com/company/persimmon-homes/','Construction','3466','1,001-5,000 employees','York','persimmonhomes.com','linkedin.com/company/persimmon-homes'),
('Princess Alexandra Hospital NHS Trust','http://www.pah.nhs.uk','https://www.linkedin.com/company/nhs-at-princess-alexandra-hospital/','Hospitals and Health Care','1504','1,001-5,000 employees','Harlow','pah.nhs.uk','linkedin.com/company/nhs-at-princess-alexandra-hospital'),
('QA Ltd','https://www.qa.com/','https://www.linkedin.com/company/qa-ltd/','Business Consulting and Services','3990','1,001-5,000 employees','London','qa.com','linkedin.com/company/qa-ltd'),
('RM plc','http://www.rmplc.com','https://www.linkedin.com/company/rm/','IT Services and IT Consulting','2522','1,001-5,000 employees','Abingdon','rmplc.com','linkedin.com/company/rm'),
('Robert Walters','https://www.robertwalters.co.uk/','https://www.linkedin.com/company/robert-walters/','Staffing and Recruiting','4509','1,001-5,000 employees','London','robertwalters.co.uk','linkedin.com/company/robert-walters'),
('Rubix','https://www.rubix.com','https://www.linkedin.com/company/rubixgroup/','Manufacturing','1717','5,001-10,000 employees','London','rubix.com','linkedin.com/company/rubixgroup'),
('Shell','http://www.shell.com','https://www.linkedin.com/company/shell/','Oil and Gas','208650','10,001+ employees','London','shell.com','linkedin.com/company/shell'),
('Sherwood Forest Hospitals NHS Foundation Trust','http://www.sfh-tr.nhs.uk','https://www.linkedin.com/company/sherwood-forest-hospitals-nhs-foundation-trust/','Hospitals and Health Care','1461','5,001-10,000 employees','Sutton in Ashfield','sfh-tr.nhs.uk','linkedin.com/company/sherwood-forest-hospitals-nhs-foundation-trust'),
('SThree','https://www.sthree.com/','https://www.linkedin.com/company/sthree-plc/','Business Consulting and Services','7927','1,001-5,000 employees','London','sthree.com','linkedin.com/company/sthree-plc'),
('The Rank Group plc','http://www.rank.com','https://www.linkedin.com/company/rank-group/','Gambling Facilities and Casinos','2102','5,001-10,000 employees','Maidenhead','rank.com','linkedin.com/company/rank-group'),
('The Telegraph','http://www.telegraph.co.uk','https://www.linkedin.com/company/telegraph-media-group/','Media Production','1626','1,001-5,000 employees','London','telegraph.co.uk','linkedin.com/company/telegraph-media-group'),
('THG','https://www.thg.com','https://www.linkedin.com/company/wearethg/','Retail','3909','1,001-5,000 employees','Manchester','thg.com','linkedin.com/company/wearethg'),
('Third Space','https://www.thirdspace.london/','https://www.linkedin.com/company/the-third-space/','Wellness and Fitness Services','877','1,001-5,000 employees','London','thirdspace.london','linkedin.com/company/the-third-space'),
('Unilever','http://www.unilever.com','https://www.linkedin.com/company/unilever/','Manufacturing','151753','10,001+ employees','Blackfriars','unilever.com','linkedin.com/company/unilever'),
('University Hospital Southampton NHS FT','https://careers.uhs.nhs.uk/Home.aspx','https://www.linkedin.com/company/uhsft/','Hospitals and Health Care','4496','10,001+ employees','Southampton','careers.uhs.nhs.uk','linkedin.com/company/uhsft')
)
insert into companies(name,website,linkedin_url,industry,employee_count,size,city,country,type,stage,owner)
select ci.name,ci.website,ci.linkedin_url,ci.industry,ci.employee_count,ci.size,ci.city,'United Kingdom','Prospect','Active','Marco van Gelder'
from cin ci
where not exists (select 1 from companies co where
    lower(trim(co.name))=lower(ci.name)
    or (ci.dom<>'' and regexp_replace(regexp_replace(lower(coalesce(co.website,'')),'^https?://(www\.)?',''),'/.*$','')=ci.dom)
    or (ci.ncli<>'' and rtrim(regexp_replace(regexp_replace(lower(coalesce(co.linkedin_url,'')),'\?.*$',''),'^https?://(www\.)?',''),'/')=ci.ncli));

-- 2) Nieuwe contacten, gekoppeld aan hun bedrijf (Bupa-contact -> bestaand Bupa via domein)
with pin(first_name,last_name,linkedin_url,nli,title,email,company_name,dom,ncli,cdate) as (values
('Andrew','Cunningham','https://www.linkedin.com/in/andrewfcunningham','linkedin.com/in/andrewfcunningham','Chief Client Officer Human Capital EMEA',null,'Aon','aon.com','linkedin.com/company/aon','2026-01-09'),
('David','Whiteman','https://www.linkedin.com/in/davemploy','linkedin.com/in/davemploy','Senior Talent Acquisition Partner',null,'Arqiva','arqiva.com','linkedin.com/company/arqiva','2026-04-04'),
('James','Goodman','https://www.linkedin.com/in/james-goodman-fcipd-a605794','linkedin.com/in/james-goodman-fcipd-a605794','Chief People Officer',null,'Asda','asda.jobs','linkedin.com/company/everythingatasda','2025-12-27'),
('Harriet','Shurville','https://www.linkedin.com/in/harrietshurville','linkedin.com/in/harrietshurville','Chief People Officer',null,'Avalere Health','avalerehealth.com','linkedin.com/company/avalerehealth','2025-11-05'),
('Heather','Angus','https://www.linkedin.com/in/heather-angus-58005a6','linkedin.com/in/heather-angus-58005a6','Chief People Officer',null,'Bidfood UK','bidfood.co.uk','linkedin.com/company/bidfooduk','2026-03-03'),
('Jim','Trussler','https://www.linkedin.com/in/jim-trussler','linkedin.com/in/jim-trussler','Talent Acquisition Manager',null,'Boots UK','boots.jobs','linkedin.com/company/boots','2026-05-05'),
('Gemma','Boulton','https://www.linkedin.com/in/gemma-boulton-02b72b2b','linkedin.com/in/gemma-boulton-02b72b2b','Learning and Development Manager',null,'Boots UK','boots.jobs','linkedin.com/company/boots','2026-04-07'),
('Fabiola','Williams','https://www.linkedin.com/in/fabiola-williams-636a881','linkedin.com/in/fabiola-williams-636a881','Partner and Chief People Officer',null,'Brunswick Group','brunswickgroup.com','linkedin.com/company/brunswick-group','2026-01-20'),
('Nicolas','Barea','https://www.linkedin.com/in/nicolas-barea-3320744','linkedin.com/in/nicolas-barea-3320744','HR Director',null,'BT Group','bt.com','linkedin.com/company/bt','2025-11-19'),
('Jag','Chohan','https://www.linkedin.com/in/jagchohan1','linkedin.com/in/jagchohan1','Human Resources Director',null,'Bupa UK','bupa.com','linkedin.com/company/bupauk','2026-04-21'),
('Scott','Hill','https://www.linkedin.com/in/scott-hill-603bab14','linkedin.com/in/scott-hill-603bab14','Chief People Officer',null,'Capita','capita.com','linkedin.com/company/capita','2025-12-12'),
('Karen','Hopley','https://www.linkedin.com/in/karen-hopley-fcipd-b9b67417','linkedin.com/in/karen-hopley-fcipd-b9b67417','Chief People Officer',null,'Churchill Group','churchillservices.com','linkedin.com/company/churchill-group-','2025-12-11'),
('Chloe','Keating','https://www.linkedin.com/in/chloe-keating-767b80b9','linkedin.com/in/chloe-keating-767b80b9','Strategic HR Business Partner',null,'CityFibre','cityfibre.com','linkedin.com/company/cityfibre','2026-04-24'),
('Nicki','Knowles','https://www.linkedin.com/in/nickistacey','linkedin.com/in/nickistacey','Senior Manager, HR Business Partner - Commercial',null,'Coca-Cola Europacific Partners','cocacolaep.com','linkedin.com/company/coca-cola-europacific-partners','2026-05-14'),
('Malebogo Melba','Mpugwa','https://www.linkedin.com/in/malebogo-mpugwa','linkedin.com/in/malebogo-mpugwa','Chief People Officer',null,'De Beers Group','debeersgroup.com','linkedin.com/company/debeersgroup','2025-11-26'),
('Craig','Oram','https://www.linkedin.com/in/craig-oram-17102379','linkedin.com/in/craig-oram-17102379','HR Technology & People Analytics Leader',null,'Direct Line Group','directlinegroupcareers.com','linkedin.com/company/direct-line-group','2026-04-29'),
('Farnaz','Ranjbar','https://www.linkedin.com/in/farnaz-ranjbar-1557b35','linkedin.com/in/farnaz-ranjbar-1557b35','Chief People Officer',null,'Drax Group','drax.com','linkedin.com/company/drax-group','2025-11-12'),
('Claire','Bryce','https://www.linkedin.com/in/claire-bryce-166027231','linkedin.com/in/claire-bryce-166027231','HR Manager',null,'Foster + Partners','fosterandpartners.com','linkedin.com/company/foster-&-partners','2026-04-22'),
('Claire','Warner','https://www.linkedin.com/in/claire-warner-05953342','linkedin.com/in/claire-warner-05953342','Human Resources Director',null,'Great Western Hospitals NHS Foundation Trust','gwh.nhs.uk','linkedin.com/company/great-western-hospitals-nhs-foundation-trust','2026-01-21'),
('Martin','Gray','https://www.linkedin.com/in/martygray1','linkedin.com/in/martygray1','Chief People Officer','martin.gray@gsfgroup.com','GSF Car Parts','gsfgroup.com','linkedin.com/company/gsfcarparts','2026-01-23'),
('Kirk','Southern','https://www.linkedin.com/in/kirk-southern-mcipd-01788118','linkedin.com/in/kirk-southern-mcipd-01788118','Group Chief People Officer',null,'Howden','howdengroupholdings.com','linkedin.com/company/howden-insurance','2025-11-06'),
('Jon','Doyle','https://www.linkedin.com/in/jmdoyle','linkedin.com/in/jmdoyle','Chief Operating Officer People, Governance & Communications and Legal',null,'HSBC','hsbc.com','linkedin.com/company/hsbc','2026-02-04'),
('Niki','Steel','https://www.linkedin.com/in/niki-steel-8052194','linkedin.com/in/niki-steel-8052194','Chief People Officer - Sector Operations',null,'IMI','imiplc.com','linkedin.com/company/imi','2025-11-17'),
('Marten','Booisma','https://www.linkedin.com/in/marten-booisma-8a7676123','linkedin.com/in/marten-booisma-8a7676123','Chief People Officer',null,'JD Sports Fashion','careers.jdplc.com','linkedin.com/company/jd-sports-fashion-plc','2025-11-06'),
('Jason','Gofton','https://www.linkedin.com/in/jasongofton','linkedin.com/in/jasongofton','Head of Digital Product Management - People, Property and Protection',null,'JLR','jlr.com','linkedin.com/company/jaguar-land-rover_1','2022-11-25'),
('Damian','McGuinness','https://www.linkedin.com/in/damian-mcguinness','linkedin.com/in/damian-mcguinness','Chief People Officer',null,'King''s College Hospital NHS Foundation Trust','kch.nhs.uk','linkedin.com/company/king%27s-college-hospital-nhs-foundation-trust','2026-01-22'),
('Gemma','Pye','https://www.linkedin.com/in/gemma-pye-93761035','linkedin.com/in/gemma-pye-93761035','Head of Culture & Talent Acquisition',null,'Krispy Kreme UK & IRE','krispykreme.co.uk','linkedin.com/company/krispy-kreme-uk-and-ire','2026-05-01'),
('Rahul','Pratap','https://www.linkedin.com/in/rahulpratapnzuk','linkedin.com/in/rahulpratapnzuk','Human Resources Project Manager',null,'Legal & General','group.legalandgeneral.com','linkedin.com/company/legal-&-general','2026-04-17'),
('Emma','Woodford','https://www.linkedin.com/in/emma-woodford-nee-giddy-541b6826','linkedin.com/in/emma-woodford-nee-giddy-541b6826','Chief People Officer / People Director',null,'LV=','lv.com','linkedin.com/company/lv','2026-01-09'),
('Juliet','Thomson','https://www.linkedin.com/in/juliet-thomson-07226827','linkedin.com/in/juliet-thomson-07226827','Chief People Officer',null,'Menzies Aviation','menziesaviation.com','linkedin.com/company/menzies-aviation','2025-12-08'),
('Amy','Burnett','https://www.linkedin.com/in/amy-burnett-a8156041','linkedin.com/in/amy-burnett-a8156041','People Transformation Lead - Service Delivery, TOM & ServiceNow',null,'National Grid','nationalgrid.com','linkedin.com/company/national-grid','2026-01-22'),
('James','Bland','https://www.linkedin.com/in/james-bland-51486346','linkedin.com/in/james-bland-51486346','Chief People Officer',null,'Newcross Healthcare Solutions','newcrosshealthcare.com','linkedin.com/company/newcross-healthcare-solutions','2025-11-12'),
('Liz','Durrant','https://www.linkedin.com/in/liz-durrant-b8aa594a','linkedin.com/in/liz-durrant-b8aa594a','Deputy Director - Quality Transformation (Mental Health, Learning Disability and Autism)',null,'NHS England','england.nhs.uk','linkedin.com/company/nhsengland','2026-03-10'),
('Nora','Butlere','https://www.linkedin.com/in/nora-butlere-6b1b763a','linkedin.com/in/nora-butlere-6b1b763a','Senior Human Resources Business Partner',null,'Pentland Brands','pentlandbrands.com','linkedin.com/company/pentland-brands','2026-05-13'),
('Clare','Cram','https://www.linkedin.com/in/clare-cram-739467205','linkedin.com/in/clare-cram-739467205','HR Business Partner',null,'Pentland Brands','pentlandbrands.com','linkedin.com/company/pentland-brands','2026-04-17'),
('Lisa','Mortleman','https://www.linkedin.com/in/lisa-mortleman-6378351b','linkedin.com/in/lisa-mortleman-6378351b','Chief Human Resources Officer',null,'Persimmon Homes','persimmonhomes.com','linkedin.com/company/persimmon-homes','2025-11-06'),
('Giovanna','Leeks','https://www.linkedin.com/in/gioleeks','linkedin.com/in/gioleeks','Chief People Officer',null,'Princess Alexandra Hospital NHS Trust','pah.nhs.uk','linkedin.com/company/nhs-at-princess-alexandra-hospital','2025-11-12'),
('Steph','Walker','https://www.linkedin.com/in/steph-walker-83a1b36','linkedin.com/in/steph-walker-83a1b36','Chief People Officer',null,'QA Ltd','qa.com','linkedin.com/company/qa-ltd','2026-01-02'),
('Alexis','Howsam','https://www.linkedin.com/in/lex-howsam-mba','linkedin.com/in/lex-howsam-mba','Senior Training Manager',null,'RM plc','rmplc.com','linkedin.com/company/rm','2026-05-13'),
('Claire','Crew','https://www.linkedin.com/in/claire-crew-77660333','linkedin.com/in/claire-crew-77660333','Group HR Operations Director',null,'RM plc','rmplc.com','linkedin.com/company/rm','2026-04-29'),
('Yolanda','Verbena','https://www.linkedin.com/in/yolandaverbena','linkedin.com/in/yolandaverbena','Global Head of HR Business Partnering',null,'Robert Walters','robertwalters.co.uk','linkedin.com/company/robert-walters','2026-04-28'),
('Guy','Dullage','https://www.linkedin.com/in/guy-dullage-b293228','linkedin.com/in/guy-dullage-b293228','Chief Human Resources Officer',null,'Rubix','rubix.com','linkedin.com/company/rubixgroup','2025-12-18'),
('Evon','Sara','https://www.linkedin.com/in/evon-sara-141b9a134','linkedin.com/in/evon-sara-141b9a134','Chief People Officer',null,'Shell','shell.com','linkedin.com/company/shell','2026-03-27'),
('Robert','Simcox','https://www.linkedin.com/in/robert-simcox-28996710','linkedin.com/in/robert-simcox-28996710','Chief People Officer',null,'Sherwood Forest Hospitals NHS Foundation Trust','sfh-tr.nhs.uk','linkedin.com/company/sherwood-forest-hospitals-nhs-foundation-trust','2026-01-23'),
('Sarah','Mason','https://www.linkedin.com/in/sarahmason12','linkedin.com/in/sarahmason12','Chief People Officer',null,'SThree','sthree.com','linkedin.com/company/sthree-plc','2025-11-06'),
('Steven','Fairhurst','https://www.linkedin.com/in/s-fairhurst','linkedin.com/in/s-fairhurst','Senior Business Partner - Talent Acquisition',null,'The Rank Group plc','rank.com','linkedin.com/company/rank-group','2026-05-13'),
('Karis','Clayphon','https://www.linkedin.com/in/karis-clayphon-896517a0','linkedin.com/in/karis-clayphon-896517a0','HR Business Partner',null,'The Telegraph','telegraph.co.uk','linkedin.com/company/telegraph-media-group','2026-04-24'),
('Trishna','Dhillon','https://www.linkedin.com/in/trishna-dhillon-0340425','linkedin.com/in/trishna-dhillon-0340425','Head of Talent Acquisition',null,'The Telegraph','telegraph.co.uk','linkedin.com/company/telegraph-media-group','2026-03-04'),
('Konrad','Hill','https://www.linkedin.com/in/konrad-hill-492667b8','linkedin.com/in/konrad-hill-492667b8','Chief People Officer',null,'THG','thg.com','linkedin.com/company/wearethg','2026-01-04'),
('Andrew','Meechan','https://www.linkedin.com/in/andrewmeechan','linkedin.com/in/andrewmeechan','Head of Talent Acquisition',null,'Third Space','thirdspace.london','linkedin.com/company/the-third-space','2026-04-28'),
('Anuradha','Razdan','https://www.linkedin.com/in/anuradha-razdan-6265321','linkedin.com/in/anuradha-razdan-6265321','CHRO Beauty & Wellbeing and Global Inclusion Officer, Unilever Plc (London, UK)',null,'Unilever','unilever.com','linkedin.com/company/unilever','2026-01-15'),
('Brenda','Carter','https://www.linkedin.com/in/brencarter','linkedin.com/in/brencarter','Deputy Chief People Officer',null,'University Hospital Southampton NHS FT','careers.uhs.nhs.uk','linkedin.com/company/uhsft','2025-12-18')
)
insert into contacts(first_name,last_name,full_name,linkedin_url,title,email,company_name,company_id,country,li_connected,connection_date,stage,owner,source)
select p.first_name,p.last_name,trim(p.first_name||' '||p.last_name),p.linkedin_url,p.title,p.email,p.company_name,
 (select co.id from companies co where
     lower(trim(co.name))=lower(p.company_name)
     or (p.dom<>'' and regexp_replace(regexp_replace(lower(coalesce(co.website,'')),'^https?://(www\.)?',''),'/.*$','')=p.dom)
     or (p.ncli<>'' and rtrim(regexp_replace(regexp_replace(lower(coalesce(co.linkedin_url,'')),'\?.*$',''),'^https?://(www\.)?',''),'/')=p.ncli)
   order by (lower(trim(co.name))=lower(p.company_name)) desc limit 1),
 'United Kingdom',true,p.cdate::date,'Active','Marco van Gelder','LinkedIn import Marco 2026-07'
from pin p
where p.nli<>'' and not exists (select 1 from contacts ct
   where rtrim(regexp_replace(regexp_replace(lower(coalesce(ct.linkedin_url,'')),'\?.*$',''),'^https?://(www\.)?',''),'/')=p.nli);

-- 3) Campagne-tag
insert into tags(name,color,type,description,created_by)
select 'Marco LinkedIn HR (jul 2026)','#dbeafe','custom','Marco 1e-lijns LinkedIn HR-connecties, import jul 2026','olivier@eclectik.co'
where not exists (select 1 from tags where name='Marco LinkedIn HR (jul 2026)');

-- 4) Tag koppelen
insert into contact_tags(contact_id,tag_id,tagged_by)
select ct.id,(select id from tags where name='Marco LinkedIn HR (jul 2026)'),'olivier@eclectik.co'
from contacts ct where ct.source='LinkedIn import Marco 2026-07'
  and not exists (select 1 from contact_tags x where x.contact_id=ct.id and x.tag_id=(select id from tags where name='Marco LinkedIn HR (jul 2026)'));

commit;

-- TERUGDRAAIEN:
-- delete from contact_tags where tag_id=(select id from tags where name='Marco LinkedIn HR (jul 2026)');
-- delete from tags where name='Marco LinkedIn HR (jul 2026)';
-- delete from contacts where source='LinkedIn import Marco 2026-07';