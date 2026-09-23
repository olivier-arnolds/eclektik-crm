-- Prioriteit A: de 53 rood gemarkeerde contacten uit de beoordeling van de
-- collega uit het CRM verwijderd. 52 daarvan stonden erin; Tove P. (Pernod
-- Ricard) niet.
--
-- WAAROM
--   Rood is bij hem geen adresoordeel maar een ROLoordeel. Van de rode rijen
--   heeft 25% een senior titel tegen 59% van wat hij liet staan: het zijn
--   recruiters, talent acquisition managers, een Workday-integratiebeheerder,
--   een knowledge manager. Allemaal HR, maar niemand die over employee
--   listening beslist. Bij sommige bedrijven stonden er twintig contacten, en
--   dat is voor deze markt te veel ruis.
--
-- AFWEGING, EXPLICIET GEMAAKT DOOR OLIVIER
--   Verwijderen kost campagnegeschiedenis: campaign_sends.contact_id staat op
--   SET NULL, dus de verzending blijft bestaan maar raakt zijn persoon kwijt.
--   Het gaat hier om 10 verzendingen. contact_tags cascadeert, dus de Glint-tag
--   verdwijnt. Olivier heeft dat afgewogen en gekozen voor het oordeel van de
--   collega. Vandaar drie backuptabellen plus een CSV-export voordat er iets weg
--   ging, zodat het terug te halen is ook al is de koppeling weg.

create table if not exists public._dq_backup_contacts_rood_20260923 as
select * from public.contacts where id in ( /* 52 ids, zie git-historie */ );

create table if not exists public._dq_backup_sends_rood_20260923 as
select s.*, c.full_name, c.email as contact_email
  from public.campaign_sends s
  join public._dq_backup_contacts_rood_20260923 c on c.id = s.contact_id;

create table if not exists public._dq_backup_tags_rood_20260923 as
select ct.*, c.full_name
  from public.contact_tags ct
  join public._dq_backup_contacts_rood_20260923 c on c.id = ct.contact_id;

delete from public.contacts
 where id in (select id from public._dq_backup_contacts_rood_20260923);

-- Controle voor en na: 1833 -> 1781 contacten, 52 weg, 0 nog aanwezig,
-- 10 verzendingen losgekoppeld maar bewaard, 282 Glint-bedrijven ongemoeid.
