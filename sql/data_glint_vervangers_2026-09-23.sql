-- De 10 vervangers uit de rolbeoordeling van de collega, plus de bedrijven die
-- daarvoor nog ontbraken. Uitgevoerd via Supabase MCP op 23-09-2026.
--
-- ACHTERGROND
--   Bij 10 bedrijven verving de collega onze contactpersoon door iemand anders,
--   steeds een trede hoger: een Director of Training werd een EVP & CHRO, een
--   Staff Data Scientist werd de People Analytics Operations Lead. Dat sluit aan
--   op de doelrollen uit zijn eigen marktanalyse.
--
-- TWEE DINGEN UIT DE EXCEL DIE NIET ZIJN OVERGENOMEN
--   De LinkedIn-kolom bevat bij hem meestal linktekst ("Casey Bunk | LinkedIn")
--   in plaats van een URL. Onbruikbaar, dus leeggelaten.
--   Bij Betty Larson stond wel een URL, maar die wees naar /in/steven-mizell,
--   haar voorganger. Overnemen zou haar zijn profiel geven.

insert into public.companies (name, website, type, country, notes) values
  ('Block',            'https://block.xyz',            'Expected Glint Customers','United States', '...'),
  ('Charles Schwab',   'https://www.schwab.com',       'Expected Glint Customers','United States', '...'),
  ('FNB Botswana',     'https://www.fnbbotswana.co.bw','Expected Glint Customers','Botswana',      'LET OP: er bestaat ook een account "FNB" (A-0133) zonder website; mogelijk dezelfde groep, bewust niet samengevoegd.'),
  ('Merck & Co. (MSD)','https://www.merck.com',        'Expected Glint Customers','United States', 'Niet te verwarren met Merck KGaA (merckgroup.com), een ander bedrijf dat ook in de lijst staat.'),
  ('Oracle',           'https://www.oracle.com',       'Expected Glint Customers','United States', '...'),
  ('Paysafe',          'https://www.paysafe.com',      'Expected Glint Customers','United Kingdom','...')
on conflict do nothing;

-- Volvo Cars stond op axus.be, een ander bedrijf. Dat stuurde de vorige
-- Surfe-ronde naar het verkeerde domein; het adres van de contactpersoon daar
-- was @volvocars.com.
update public.companies set website = 'https://www.volvocars.com'
 where id = 'd207e39a-27be-414e-9e04-125b52202440' and website = 'axus.be';

-- Domeinen aangevuld waar een bestaand e-mailadres het bewijst. Alleen die drie:
-- een domein raden op de bedrijfsnaam is precies hoe axus.be daar terechtkwam.
update public.companies set website = 'https://www.alliancebernstein.com'
 where name = 'AllianceBernstein' and website is null;

-- De 10 personen; zie git-historie voor de volledige insert.
-- Resultaat: 10 contacten met source 'Glint marktanalyse sept2026', waarvan er
-- 9 nog geen e-mailadres hebben en meegaan in de tweede Surfe-ronde.
