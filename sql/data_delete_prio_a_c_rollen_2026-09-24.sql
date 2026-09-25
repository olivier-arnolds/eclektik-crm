-- Prioriteit A, tweede opschoningsronde: 49 contacten uit de categorie
-- 'algemeen HR' verwijderd.
-- Backups: _dq_backup_contacts_c_20260924 (43), _dq_backup_contacts_cognizant_20260924 (6).
--
-- REGELS (van Olivier)
--   1. Staan er bij een bedrijf vier of meer contacten, dan mogen de
--      algemeen-HR-contacten weg. De A, B en D blijven.
--   2. Bestaat dat bedrijf alleen uit algemeen HR, dan blijven de vier best
--      passende staan in plaats van dat het account leeg valt.
--
-- Regel 2 raakte drie bedrijven: Getinge en United Airlines hadden er precies
-- vier, dus daar verandert niets. Cognizant had er tien; bewaard zijn David
-- Heffernan (VP HR Global Growth Markets), Bas van Mierlo (Sr HR Director),
-- Carissa Destinia (HR Digital Transformation, het dichtst bij het thema
-- HR-technologie) en Bruno Santos (HR Director). Bruno Santos en Manish
-- Jagannathan stonden op hetzelfde niveau; die keuze was een muntworp.
--
-- EEN CONTACT HANDMATIG UIT DE LIJST GEHOUDEN
--   Andrew Bates bij LSEG stond als algemeen HR, maar is Head of People, Data &
--   Analytics: precies de doelrol. De classificatie verwachtte 'people data' als
--   aaneengesloten tekst en zijn titel heeft er een komma tussen. Het patroon in
--   scripts/export-prio-a.py is daarop aangepast.
--
-- 8 van de 43 hadden een campagneverzending, die hun persoon kwijtraakt.

delete from public.contacts where id in (select id from public._dq_backup_contacts_c_20260924);
delete from public.contacts where id in (select id from public._dq_backup_contacts_cognizant_20260924);
