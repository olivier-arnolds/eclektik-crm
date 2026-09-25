-- Glint Prioriteit A - Surfe-validatie 22 sept 2026: de vier tegenstrijdige
-- gevallen waar het gevonden e-mailadres een ander bedrijf aanwees dan het
-- werkgeversveld van Surfe. Olivier heeft ze stuk voor stuk nagekeken; in alle
-- vier bleek het ADRES het verse signaal en het werkgeversveld verouderd.
-- Daarom zijn deze handmatig bevestigd en niet meegenomen in de bulk.
--
-- Michelle Demetriou -> BBC News        (nieuw account, adres ingevuld)
-- Marie Taylor       -> Scania UK       (nieuw account, adres ingevuld)
-- Eric Hudson        -> Nutanix         (nieuw account, adres ingevuld)
-- Mark Kelley        -> weg bij Cognizant, niet relevant, op Inactive gezet

-- Backups (per contact, zodat losse terugdraai mogelijk blijft)
create table if not exists public._dq_backup_contacts_20260922b as
  select * from public.contacts where id in (
    '497579aa-cad8-4072-9414-9d8ce3d158ce',   -- Michelle Demetriou
    'f52d0e10-e9d2-4a87-9d67-138c08743b8f');  -- Marie Taylor
create table if not exists public._dq_backup_contacts_20260922c as
  select * from public.contacts where id = 'f7344608-41f9-4407-ad99-55dfaa16720d';
create table if not exists public._dq_backup_companies_20260922c as
  select * from public.companies where id = '4c95fe14-f349-4b80-8c5c-6adaa8a4e109';

update public.contacts set email = 'michelle.demetriou@bbc.co.uk'
 where id = '497579aa-cad8-4072-9414-9d8ce3d158ce';
update public.contacts set email = 'marie.taylor@scania.com'
 where id = 'f52d0e10-e9d2-4a87-9d67-138c08743b8f';
update public.contacts set email = 'eric.hudson@nutanix.com'
 where id = 'f7344608-41f9-4407-ad99-55dfaa16720d' and email is null;

-- Website op de nieuwe accounts. Dit is geen cosmetiek: een leeg of verkeerd
-- websiteveld stuurt de volgende Surfe-ronde naar het verkeerde domein (dat is
-- precies wat bij Volvo Cars met axus.be misging).
update public.companies set website = 'https://www.nutanix.com'
 where id = '4c95fe14-f349-4b80-8c5c-6adaa8a4e109' and (website is null or website = '');
