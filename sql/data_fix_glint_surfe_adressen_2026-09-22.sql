-- Glint Prioriteit A - terugschrijven van de Surfe-validatie, 22 sept 2026.
-- Bron: surfe-input-glint-prioriteit-a.csv (in) naast de door Surfe verrijkte
-- versie (uit), gekoppeld op LinkedIn-URL en anders op naam.
--
-- Alleen BESTAANDE CRM-contacten worden hier aangeraakt (22 stuks):
--   13x fout adres  - er stond het adres van een collega op de rij (het patroon
--                     bij Cognizant, UCB en Aramex: juiste achternaam ontbrak)
--    5x domein      - ch.abb.com -> abb.com, fr.otis.com -> otis.com, enz.
--    4x leeg -> gevuld
--
-- Bewust NIET hier: de 28 personen uit de marktanalyse die nog geen CRM-record
-- hebben (dat is aanmaken, niet corrigeren), en de 6 overstappers wier nieuwe
-- adres bij een ander bedrijf hoort dan waar ze in het CRM hangen. Zo'n adres
-- op het oude account zetten maakt de rij stilzwijgend onjuist.

create table if not exists public._dq_backup_contacts_20260922d as
select * from public.contacts where id in (
 '7363e709-6c1a-4cd3-ba68-ad11b767672d','0ea2512f-ea79-4c79-ac78-4a7228946efa',
 'f75aacce-c5b4-4459-9d23-ef29beee0359','37c63a38-a794-4018-91c4-3db948639347',
 'd19e499d-1627-40b3-a396-7542e2837e82','34a2da6f-fbe5-4604-b5d3-32b267e5fec7',
 '6fd7139b-b59b-48b6-a26c-a1f3ad12257a','acea1c7d-162a-48b4-b368-3a05e0e27ce1',
 'b55632db-3ec8-457f-8ff4-36ed34559905','f5e09568-e540-4194-8964-72408b3b7334',
 '4349ebcd-ce80-45a4-a798-9ae16024dea9','00c25836-1890-4cc8-beea-e88df30d768e',
 '717a376d-a6e5-4110-9942-b6769a4cc7db','ef238839-eecb-4fcb-bca9-66bb66e1764b',
 'd70d9ed8-bf45-49ed-964b-63ccbc654f9e','6ad12204-955a-439f-b7ee-4d339e6d4f4f',
 'e3868920-cf08-4f97-9790-27e131ef1230','abc0aa05-e95d-4d43-8fa6-5464dfe82f1e',
 'df700c15-0532-44a1-ab8b-f2042ee1ee7c','453654b3-8e05-4894-9b89-2162fc61d7fd',
 '2f12832a-efa8-4a9f-ac37-4758da3f53b5','867e0899-6ca7-40e5-b4c0-7557ee48d7b8');

with nieuw(id, adres) as (values
 ('7363e709-6c1a-4cd3-ba68-ad11b767672d','alex.moir@cognizant.com'),
 ('0ea2512f-ea79-4c79-ac78-4a7228946efa','andrea.chatterson@cognizant.com'),
 ('f75aacce-c5b4-4459-9d23-ef29beee0359','anna.nowicka@ucb.com'),
 ('37c63a38-a794-4018-91c4-3db948639347','christopher.marashlian@united.com'),
 ('d19e499d-1627-40b3-a396-7542e2837e82','eman.zahran@aramex.com'),
 ('34a2da6f-fbe5-4604-b5d3-32b267e5fec7','hassan.diab@aramex.com'),
 ('6fd7139b-b59b-48b6-a26c-a1f3ad12257a','jean-luc.fleurial@ucb.com'),
 ('acea1c7d-162a-48b4-b368-3a05e0e27ce1','lindseytruetzel@cognizant.com'),
 ('b55632db-3ec8-457f-8ff4-36ed34559905','manish.jagannathan@cognizant.com'),
 ('f5e09568-e540-4194-8964-72408b3b7334','mariacristina.sidoli@ucb.com'),
 ('4349ebcd-ce80-45a4-a798-9ae16024dea9','rohit.singh@cognizant.com'),
 ('00c25836-1890-4cc8-beea-e88df30d768e','saudal@aramex.com'),
 ('717a376d-a6e5-4110-9942-b6769a4cc7db','theresa.cook@sky.uk'),
 ('ef238839-eecb-4fcb-bca9-66bb66e1764b','aubrey.newberry@bilh.org'),
 ('d70d9ed8-bf45-49ed-964b-63ccbc654f9e','fernanda.jesus@abb.com'),
 ('6ad12204-955a-439f-b7ee-4d339e6d4f4f','natalia.kaplanska@cognizant.com'),
 ('e3868920-cf08-4f97-9790-27e131ef1230','nevra.oenal@abb.com'),
 ('abc0aa05-e95d-4d43-8fa6-5464dfe82f1e','sophie.dupuis@otis.com'),
 ('df700c15-0532-44a1-ab8b-f2042ee1ee7c','bruno.andradesantos@cognizant.com'),
 ('453654b3-8e05-4894-9b89-2162fc61d7fd','michel-riyad.nabti@autodesk.com'),
 ('2f12832a-efa8-4a9f-ac37-4758da3f53b5','raed.taha@ericsson.com'),
 ('867e0899-6ca7-40e5-b4c0-7557ee48d7b8','sophie.ochsenbein@pierre-fabre.com')
)
update public.contacts c
   set email = n.adres, email_status = 'found_surfe', last_enriched_at = now()
  from nieuw n
 where c.id = n.id::uuid;
