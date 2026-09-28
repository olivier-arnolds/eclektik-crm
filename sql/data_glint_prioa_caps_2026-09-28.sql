-- Glint Prioriteit A: dagcap naar 60 en een harde stopdatum erbij.
--
-- WAAROM
--   De campagne stond op 30 per dag. Dat getal komt uit de LinkedIn-campagne,
--   waar het bestaat omdat LinkedIn per week rekent (150 aan eerstegraads
--   connecties). Bij e-mail speelt dat niet; de kolomstandaard en beide
--   importscripts gebruiken 60.
--
--   Belangrijker: deze campagne stond actief met auto_send aan en als enige
--   ZONDER hard_stop_at. Amsterdam 2026 stopt 2 oktober, de LinkedIn-variant
--   5 oktober. Zonder stopdatum blijft een actieve campagne sturen zodra er
--   contacten bijkomen.
--
--   Let op de betekenis van de datum: hard_stop_at is een moment, geen dag.
--   00:00 op 5 oktober betekent dat 4 oktober de laatste verzenddag is. Zo
--   staat het ook bij de LinkedIn-campagne.

create table _dq_backup_outreach_campaign_20260928 as select * from outreach_campaign;
-- voor de wijziging: Glint Prioriteit A had daily_cap 30, hard_stop_at NULL

update outreach_campaign
set daily_cap = 60, hard_stop_at = '2026-10-05 00:00:00+00', updated_at = now()
where name = 'Glint Prioriteit A';
-- 1 rij; 258 contacten in de wachtrij, nog niets verstuurd op dat moment
