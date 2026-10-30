-- Campagne 'Amsterdam 2026 LinkedIn': de eventdatum in de berichten naar
-- 17 november, waar die nog op 6 oktober stond.
--
-- WAT ER STOND
--   Bericht 1 (per persoon een eigen tekst, alleen de bedrijfsnaam verschilt):
--     "On 6 October we explore HR's vital role in AI transformation."
--   Bericht 2 (een tekst voor iedereen):
--     "Have you been able to consider attending our session on the 6th?"
--
--   151 van de 154 stonden op 6 oktober. De andere drie stonden al goed; die
--   zijn niet aangeraakt.
--
-- WAAROM BERICHT 2 '17 November' KRIJGT EN NIET 'the 17th'
--   De datum verschoof van oktober naar november. Een kale dag zonder maand kan
--   dan in de verkeerde maand gelezen worden, zeker in een opvolgbericht dat
--   weken na het eerste aankomt. De maand staat er nu bij.
--
-- LET OP: BERICHT 1 IS AL VERSTUURD
--   Alle 154 hebben bericht 1 gehad. Deze aanpassing bereikt dus niemand meer;
--   ze zet alleen de vastgelegde tekst goed. Wat nog wel uitgaat is bericht 2,
--   en daar telt de verandering echt.

create table if not exists _dq_backup_outreach_contact_li_20261030 as
  select * from outreach_contact where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389';

update outreach_contact
   set msg1_body = replace(msg1_body, 'On 6 October we explore', 'On 17 November we explore'),
       updated_at = now()
 where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389'
   and msg1_body like '%On 6 October we explore%';

update outreach_contact
   set msg2_body = replace(msg2_body, 'our session on the 6th', 'our session on 17 November'),
       updated_at = now()
 where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389'
   and msg2_body like '%our session on the 6th%';

-- Controle: 154 van de 154 op 17 november, niets meer op oktober.
-- select count(*) filter (where msg1_body like '%On 17 November%') as mail1_goed,
--        count(*) filter (where msg1_body ilike '%october%')       as mail1_fout
--   from outreach_contact where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389';
