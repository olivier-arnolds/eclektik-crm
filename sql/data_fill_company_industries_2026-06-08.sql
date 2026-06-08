-- data_fill_company_industries_2026-06-08.sql
-- Backfill companies.industry for accounts that had no industry, so the
-- Reporting industry breakdown has full coverage. Already applied to CRM
-- project (ref jdzaypckluncdwsoxurs) via Supabase MCP on 2026-06-08,
-- backup-first. Backup table: _dq_backup_companies_20260608.

create table if not exists _dq_backup_companies_20260608 as
  select * from companies;

update companies c set industry = v.ind, updated_at = now()
from (values
  ('BMC Software','Enterprise Software'),
  ('Eppendorf','Life Sciences'),
  ('Farmers Insurance Group','Insurance'),
  ('IMC','Trading'),
  ('M&C Saatchi Group','Advertising'),
  ('Trane Technologies','Industrial Manufacturing'),
  ('Addison group','Staffing & Recruiting'),
  ('AllianceBernstein','Asset Management'),
  ('American Eagle Outfitters','Retail'),
  ('Boskalis','Maritime & Infrastructure'),
  ('Brenntag','Chemicals'),
  ('Coloplast','Medical Devices'),
  ('Columbus Regional Healthcare System','Hospital'),
  ('DSM-Firmenich','Manufacturing'),
  ('FNB','Banking'),
  ('Gatewayfoundation','Healthcare'),
  ('GLG Group','Professional Services'),
  ('Groupe Agrica','Insurance'),
  ('Indicor','Industrial Manufacturing'),
  ('Jacobs Douwe Egberts (JDE Peet''s)','Food and Beverage'),
  ('Japan Tobacco (JT)','Consumer Goods'),
  ('Lemonade','Insurance'),
  ('National Trust','Non Profit'),
  ('Nestlé','Food and Beverage'),
  ('Norsk Hydro','Energy'),
  ('North Mississippi Medical Center','Hospital'),
  ('Northern Alberta Institute of Technology (NAIT)','Education'),
  ('NOV (National Oilwell Varco)','Oil and Gas'),
  ('Olsson','Civil Engineering'),
  ('Oscar Health','Insurance'),
  ('Pep core group','Retail'),
  ('PGGM','Asset Management'),
  ('Post Holdings','Food and Beverage'),
  ('Poundland','Retail'),
  ('PPG','Chemicals'),
  ('Rand Merchant Bank','Banking'),
  ('Randstad Holding','Staffing & Recruiting'),
  ('Republic National Distributing Company','Consumer Goods'),
  ('Rothschild & Co','Banking'),
  ('Telesure','Insurance'),
  ('University of Zurich (UZH)','Education'),
  ('Ventura Foods LLC','Food and Beverage'),
  ('Walgreens','Retail'),
  ('Zurich Insurance Group','Insurance'),
  ('Accenture','Consulting'),
  ('Campana & Schott','Consulting'),
  ('Capgemini','IT Services and IT Consulting'),
  ('KPMG','Accounting'),
  ('PwC Netherlands','Accounting'),
  ('PwC Switzerland','Accounting'),
  ('Microsoft APAC','Information Technology'),
  ('Microsoft BELGIUM','Information Technology'),
  ('Microsoft Corp','Information Technology'),
  ('Microsoft DENMARK','Information Technology'),
  ('Microsoft FRANCE','Information Technology'),
  ('Microsoft GERMANY','Information Technology'),
  ('Microsoft ITALY','Information Technology'),
  ('Microsoft NETHERLANDS','Information Technology'),
  ('Microsoft NORWAY','Information Technology'),
  ('Microsoft SOUTH AFRICA','Information Technology'),
  ('Microsoft UAE','Information Technology'),
  ('Microsoft UK','Information Technology'),
  ('Microsoft USA','Information Technology'),
  ('Perceptyx','Enterprise Software'),
  ('Work Vivo','Enterprise Software'),
  ('Ingram Micro','Information Technology'),
  ('Sulava','IT Services and IT Consulting'),
  ('HRIZONS','Enterprise Software')
) as v(name, ind)
where c.name = v.name and (c.industry is null or trim(c.industry) = '');

update companies set industry = 'Energy', updated_at = now()
where name like 'EKZ%' and (industry is null or trim(industry) = '');
