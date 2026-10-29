-- Mail 1 van de campagne 'Microsoft AIBS 2026': de accounts waar iemand aan
-- gerelateerd is, met naam in de mail.
--
-- WAAROM
--   Marco en Yarmilla wilden op 29 oktober dat elke eerste mail de klant noemt
--   waar die persoon volgens de bronlijst op zit, en niet alleen de regio. Waar
--   iemand aan meer dan een account hangt gaan ze er allemaal in, dus Pepkor
--   Trading en Pepkor Speciality apart en bij Daniel Marquiegui alle vier.
--
-- VIJF VAN DE 22
--   Bij de andere zeventien stond het account al in de mail. Laura D'Ambra en
--   Eric Inch hangen aan MAIRE en MAIRE is gestopt als klant, dus bij hen blijft
--   de openingsregel op de regio staan en wordt MAIRE in de bewijsregel genoemd,
--   in verleden tijd. Openen met een klant die geen klant meer is zou iets
--   beweren wat niet klopt.
--
-- De bron van deze teksten is docs/microsoft-aibs-mails.md.

create table if not exists _dq_backup_outreach_contact_20261029 as select * from outreach_contact;


update outreach_contact
   set msg1_subject = 'Copilot business cases across Europe North',
       msg1_body    = 'Hi Charlotte,

If a Copilot expansion at the European Training Foundation or anywhere else in Europe North is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work there, so there is somewhere to check us.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco'
 where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27'
   and contact_id  = '810e2178-9ea3-43d3-8c9d-c8dd50ebe57a'
   and status      = 'queued';   -- nooit een mail die al verstuurd is

update outreach_contact
   set msg1_subject = 'Draper, Copilot business case',
       msg1_body    = 'Hi Marie-Elena,

If a Copilot expansion at Draper Laboratory or anywhere else in your Americas portfolio is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Draper on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Draper or elsewhere in your portfolio where that would help? Happy to do 15 minutes.

Marco'
 where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27'
   and contact_id  = 'f85adc00-69e2-4dd7-bc7a-76a9b34d07d8'
   and status      = 'queued';   -- nooit een mail die al verstuurd is

update outreach_contact
   set msg1_subject = 'Copilot business cases across Western Europe',
       msg1_body    = 'Hi Daniel,

If a Copilot expansion at Boskalis, Liberty Global, Serco, Dentsu or anywhere else in your Western Europe portfolio is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We work inside Boskalis on Viva Glint and People Science and did that same work at the other three, so we know the people and the data.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco'
 where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27'
   and contact_id  = '9b53fcc0-79d5-480d-bb8e-650a32fb93cf'
   and status      = 'queued';   -- nooit een mail die al verstuurd is

update outreach_contact
   set msg1_subject = 'Pepkor, Copilot business case',
       msg1_body    = 'Hi Sherif,

If a Copilot expansion at Pepkor Trading, Pepkor Speciality or anywhere else across Middle East and Africa is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Pepkor on Viva Glint and People Science, so we know the people and the data.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco'
 where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27'
   and contact_id  = '508aabaa-85dc-432c-850e-a15c77090067'
   and status      = 'queued';   -- nooit een mail die al verstuurd is

update outreach_contact
   set msg1_subject = 'Pepkor, Copilot business case',
       msg1_body    = 'Hi Nicolette,

If a Copilot expansion at Pepkor Trading or Pepkor Speciality is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Pepkor on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Pepkor or other clients where that would help? Happy to do 15 minutes.

Marco'
 where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27'
   and contact_id  = '297db7e8-d776-4c01-a0a2-e140d437e53e'
   and status      = 'queued';   -- nooit een mail die al verstuurd is


-- Controle: deze vijf noemen hun accounts, de andere zeventien zijn niet aangeraakt.
-- select first_name, last_name, left(msg1_body, 140)
--   from outreach_contact
--  where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27' order by outreach_prio;
