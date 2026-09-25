-- Prioriteit A: 33 contacten uit de categorie 'andere discipline' verwijderd.
-- Backup: _dq_backup_contacts_d_20260924 (+ _dq_backup_sends_d_20260924).
--
-- REGEL (van Olivier): een D-contact mag weg zodra er bij dat bedrijf nog een
-- ander contact staat, van welke categorie dan ook. Blijft er anders niets over,
-- dan blijft de D staan. Dat gold voor twee bedrijven: Autodesk (Michel Riyad
-- Nabti) en Sky (Theresa Cook).
--
-- WAT D BETEKENT
--   Talent acquisition, recruitment, leadership development, learning, total
--   rewards, compensation & benefits, global mobility, diversity & inclusion.
--   Allemaal HR, maar niet de discipline die over employee listening beslist.
--   Afgeleid uit de rolbeoordeling van de collega in september: van de functies
--   die hij wegstreepte had 25% een senior titel tegen 59% van wat hij liet
--   staan, en 'people' en 'analytics' kwamen nul keer voor bij de afgekeurden.
--
-- KOSTEN, VOORAF BEKEND
--   10 van de 33 hadden een campagneverzending. campaign_sends.contact_id staat
--   op SET NULL, dus die verzending blijft bestaan maar raakt zijn persoon kwijt.
--   Dezelfde afweging als bij de 52 van 23 september.
--
-- Zwaarst geraakt: Reckitt (7), Pernod Ricard (5), Maersk (4). Dat zijn de
-- bedrijven waar de zoekronde breed was en veel learning- en
-- talentacquisitie-mensen opleverde naast de juiste persoon.

delete from public.contacts
 where id in (select id from public._dq_backup_contacts_d_20260924);

-- Controle: 1911 -> 1878 contacten, 0 nog aanwezig.
