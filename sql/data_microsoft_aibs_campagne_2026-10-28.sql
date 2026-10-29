-- Campagne 'Microsoft AIBS 2026': 22 AIBS-specialisten bij Microsoft, een
-- persoonlijke mail per persoon vanaf Marco.
--
-- WAAROM DIT GEEN BROADCAST IS
--   Elke mail heeft zijn eigen onderwerp en eigen tekst, opgebouwd rond de klant
--   waar die persoon op zit. De composer stuurt een tekst naar iedereen, dus die
--   weg kon niet. De outreachmodule doet precies dit, plus de dosering.
--
-- PLATTE MAIL
--   Afgesproken in de meeting van 28 oktober: geen links in de mail. De UTM-tags
--   raken deze teksten niet (er staat geen URL in) en de zichtbare afmeldregel
--   staat uit via outreach_campaign.opt_out_footer. De List-Unsubscribe-kop
--   blijft wel staan: onzichtbaar voor de lezer, nodig voor de bezorging.
--
-- NIETS GAAT VANZELF UIT
--   status 'draft' en auto_send false, dus de cron slaat deze campagne over.
--   Zet hem op 'active' zodra de teksten door Yarmilla heen zijn.
--
-- max_per_company_per_week op 0 (= geen grens), want alle 22 delen het domein
-- microsoft.com en de standaard van 2 per week zou er 2 per week sturen.

create table if not exists _dq_backup_outreach_campaign_20261028 as select * from outreach_campaign;
create table if not exists _dq_backup_outreach_contact_20261028 as select * from outreach_contact;

insert into outreach_campaign
  (id, name, sender_mailbox, channel, daily_cap, followup_delay_days_min, followup_delay_days_max,
   max_per_company_per_week, send_windows, status, auto_send, opt_out_footer)
values
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'Microsoft AIBS 2026', 'marco@eclectik.co', 'email', 12, 5, 7,
   0, '["08:30", "11:30", "15:00"]'::jsonb, 'draft', false, false)
on conflict (id) do nothing;


-- De 22 rijen. outreach_prio is de verzendvolgorde uit docs/microsoft-aibs-mails.md:
-- de strategische leads eerst, de twijfelgevallen achteraan.
insert into outreach_contact
  (campaign_id, contact_id, company_id, first_name, last_name, title, email, email_domain,
   company, linkedin_url, outreach_prio, priority_tier, source,
   msg1_subject, msg1_body, msg2_subject, msg2_body)
values
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '810e2178-9ea3-43d3-8c9d-c8dd50ebe57a', '27900421-4d58-4821-a751-a23ddab575cc', 'Charlotte', 'Gomez-Gimeno', 'AI Business Solutions Sales Lead, Microsoft Europe North', 'charlotte.gomez@microsoft.com', 'microsoft.com', 'Microsoft BELGIUM', 'https://www.linkedin.com/in/charlottegomezgimeno/', 1, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Copilot business cases across Europe North', 'Hi Charlotte,

If a Copilot expansion at the European Training Foundation or anywhere else in Europe North is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work there, so there is somewhere to check us.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Europe North', 'Hi Charlotte,

Following up on my note about Copilot business cases across Europe North. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '769dc0b5-a7c2-4e10-8161-903981c402d9', '6f0dbac3-427d-4075-87b3-d34c273ecb7e', 'Miguel Ángel', 'Cervera', 'Senior Director AI Business Solutions, Western Europe', 'miguelangel.cervera@microsoft.com', 'microsoft.com', 'Microsoft SPAIN', 'https://es.linkedin.com/in/miguelangelcervera/es', 2, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Breitling, Almirall, Copilot business case', 'Hi Miguel,

If a Copilot expansion at Breitling, Almirall or anywhere else in Western Europe is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Breitling and Almirall on Viva Glint and People Science, so we know the people and the data.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Breitling and Almirall', 'Hi Miguel,

Following up on my note about the Copilot business case at Breitling and Almirall. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'f85adc00-69e2-4dd7-bc7a-76a9b34d07d8', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Marie-Elena', 'Inacio', 'Senior Director, AI Workforce, Copilot & Agents, Americas', 'minacio@microsoft.com', 'microsoft.com', 'Microsoft USA', null, 3, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Draper, Copilot business case', 'Hi Marie-Elena,

If a Copilot expansion at Draper Laboratory or anywhere else in your Americas portfolio is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Draper on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Draper or elsewhere in your portfolio where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Draper', 'Hi Marie-Elena,

Following up on my note about the Copilot business case at Draper. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '9b53fcc0-79d5-480d-bb8e-650a32fb93cf', '6f0dbac3-427d-4075-87b3-d34c273ecb7e', 'Daniel', 'Marquiegui', 'AI Business Solutions Engineer, Western Europe', 'danielmarq@microsoft.com', 'microsoft.com', 'Microsoft SPAIN', 'https://es.linkedin.com/in/danielmarquiegui', 4, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Copilot business cases across Western Europe', 'Hi Daniel,

If a Copilot expansion at Boskalis, Liberty Global, Serco, Dentsu or anywhere else in your Western Europe portfolio is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We work inside Boskalis on Viva Glint and People Science and did that same work at the other three, so we know the people and the data.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Western Europe', 'Hi Daniel,

Following up on my note about Copilot business cases across your Western Europe portfolio. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '993dc64d-11f2-4b0c-ad82-90b99b76e9ed', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Ryan', 'Madigan', 'Director, Workforce AI Solutions, Strategic Accounts', 'ryanmadigan@microsoft.com', 'microsoft.com', 'Microsoft USA', 'https://www.linkedin.com/in/ryanmadigan', 5, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'GoDaddy and BMC, Copilot business case', 'Hi Ryan,

If a Copilot expansion at GoDaddy or BMC Software is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside both on Viva Glint and People Science, so we know the people and the data.

Is there a deal at either, or at another of your strategic accounts, where that would help? Happy to do 15 minutes.

Marco',
   'Following up on GoDaddy and BMC', 'Hi Ryan,

Following up on my note about the Copilot business case at GoDaddy and BMC Software. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'd35a34d2-b896-4574-af57-3bcf0d617c1f', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Mary', 'Andrews', 'Sr. Sales Director, AI Workforce Strategic Accounts', 'maryand@microsoft.com', 'microsoft.com', 'Microsoft USA', null, 6, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Trane, Copilot business case', 'Hi Mary,

If a Copilot expansion at Trane Technologies is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Trane on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Trane or elsewhere in your strategic accounts where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Trane', 'Hi Mary,

Following up on my note about the Copilot business case at Trane Technologies. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'a5d71d68-87bf-46e6-a809-da4c09f4a206', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Jason', 'Lent', 'Director of AI Business Solutions Sales, Manufacturing & Mobility', 'jason.lent@microsoft.com', 'microsoft.com', 'Microsoft USA', 'https://www.linkedin.com/in/jason-lent', 7, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Trane, Copilot business case', 'Hi Jason,

If a Copilot expansion at Trane Technologies is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Trane on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Trane or another manufacturing account where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Trane', 'Hi Jason,

Following up on my note about the Copilot business case at Trane Technologies. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '5e2478fe-9847-43fa-8fe7-4041326ab4af', '261e5dec-d993-4cae-8fb9-18f70d6c354d', 'Laura', 'D''Ambra', 'AI Workforce Sales Lead, Enterprise & Public Sector, Microsoft Italy', 'laura.dambra@microsoft.com', 'microsoft.com', 'Microsoft ITALY', null, 8, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Copilot business cases in Italy', 'Hi Laura,

If a Copilot expansion anywhere in your Italian portfolio is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside MAIRE, which is how your name reached us.

Is there a deal in Italy where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Italy', 'Hi Laura,

Following up on my note about Copilot business cases in your Italian portfolio. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '87de1348-bd8b-45f0-8fa0-eef236a2576b', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Jimmy', 'Chalhub', 'Director, AI Workforce', 'jimmy.chalhub@microsoft.com', 'microsoft.com', 'Microsoft USA', 'https://www.linkedin.com/in/jimmychalhub', 9, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Cognex, Copilot business case', 'Hi Jimmy,

If a Copilot expansion at Cognex is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Cognex on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Cognex or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Cognex', 'Hi Jimmy,

Following up on my note about the Copilot business case at Cognex. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'dceb3129-0578-4526-87cb-6751ad40514b', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Emily', 'Martin', 'Director Specialist, AI Workforce, Software & Digital Platforms', 'emilymartin@microsoft.com', 'microsoft.com', 'Microsoft USA', null, 10, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'GoDaddy, Copilot business case', 'Hi Emily,

If a Copilot expansion at GoDaddy is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside GoDaddy on Viva Glint and People Science, so we know the people and the data.

Is there a deal at GoDaddy or elsewhere in software and digital platforms where that would help? Happy to do 15 minutes.

Marco',
   'Following up on GoDaddy', 'Hi Emily,

Following up on my note about the Copilot business case at GoDaddy. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'd9cc427b-33c8-4283-9711-b644885cc337', '6b0f6537-9c03-488b-ad47-b74c044cdb03', 'Eoin', 'Gaffney', 'AI Workforce Solution Specialist', 'eoingaffney@microsoft.com', 'microsoft.com', 'Microsoft IRELAND', 'https://ie.linkedin.com/in/eoin-gaffney', 11, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Sage, Copilot business case', 'Hi Eoin,

If a Copilot expansion at Sage is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Sage on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Sage or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Sage', 'Hi Eoin,

Following up on my note about the Copilot business case at Sage. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '1aec3198-0658-468b-b97d-32cf52189858', '51f7a43e-6eab-4622-9256-8927ecb8eb10', 'Denisa', 'Köhler', 'Sales Manager Modern Work & Copilot', 'denisa.koehler@microsoft.com', 'microsoft.com', 'Microsoft GERMANY', 'https://de.linkedin.com/in/denisakoehler', 12, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Douglas, Copilot business case', 'Hi Denisa,

If a Copilot expansion at Douglas is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Douglas on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Douglas or elsewhere in your team''s accounts where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Douglas', 'Hi Denisa,

Following up on my note about the Copilot business case at Douglas. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '508aabaa-85dc-432c-850e-a15c77090067', '74b96e77-95a5-4e27-b6d8-d2a4ff35a6d1', 'Sherif', 'Hamza', 'Director, AI Business Solutions, Middle East & Africa', 'shamza@microsoft.com', 'microsoft.com', 'Microsoft UAE', null, 13, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Pepkor, Copilot business case', 'Hi Sherif,

If a Copilot expansion at Pepkor Trading, Pepkor Speciality or anywhere else across Middle East and Africa is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Pepkor on Viva Glint and People Science, so we know the people and the data.

Is there a deal in your region where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Pepkor', 'Hi Sherif,

Following up on my note about the Copilot business case at Pepkor and across your region. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '297db7e8-d776-4c01-a0a2-e140d437e53e', '8e98a265-4194-4027-8b34-be2cc50c6065', 'Nicolette', 'Pringle', 'AI Workforce Senior Specialist', 'nicolette.pringle@microsoft.com', 'microsoft.com', 'Microsoft SOUTH AFRICA', 'https://za.linkedin.com/in/nicolettepringle', 14, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Pepkor, Copilot business case', 'Hi Nicolette,

If a Copilot expansion at Pepkor Trading or Pepkor Speciality is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Pepkor on Viva Glint and People Science, so we know the people and the data.

Is there a deal at Pepkor or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Pepkor', 'Hi Nicolette,

Following up on my note about the Copilot business case at Pepkor. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'a2372593-c20c-467e-baae-ecb8a986d094', '51f7a43e-6eab-4622-9256-8927ecb8eb10', 'Klaudia', 'Bysiec', 'Solution Specialist Modern Workplace, Pharma & Life Sciences', 'kbysiec@microsoft.com', 'microsoft.com', 'Microsoft GERMANY', 'https://de.linkedin.com/in/klaudiabysiec', 15, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Eppendorf, Copilot business case', 'Hi Klaudia,

If a Copilot expansion at Eppendorf or another pharma and life sciences account is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside Eppendorf, so we know the people and the data.

Is there a deal in your sector where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Eppendorf', 'Hi Klaudia,

Following up on my note about the Copilot business case at Eppendorf. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'f5ba37cb-c275-41e5-8ea3-8043b3c1f07d', '51f7a43e-6eab-4622-9256-8927ecb8eb10', 'Sebastian', 'Brinke', 'AI Workforce Specialist, Life Science', 'sebastian.brinke@microsoft.com', 'microsoft.com', 'Microsoft GERMANY', 'https://de.linkedin.com/in/sebastian-brinke', 16, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Eppendorf, Copilot business case', 'Hi Sebastian,

If a Copilot expansion at Eppendorf or another life sciences account is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside Eppendorf, so we know the people and the data.

Is there a deal in your accounts where that would help? Happy to do 15 minutes.

Marco',
   'Following up on Eppendorf', 'Hi Sebastian,

Following up on my note about the Copilot business case at Eppendorf. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '9aa0e7a7-154c-46c1-b378-c34dc6885609', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Erin', 'Spencer', 'Senior AI Workforce Specialist', 'espencer@microsoft.com', 'microsoft.com', 'Microsoft USA', 'https://www.linkedin.com/in/erin-spencer/', 17, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'BioMarin and North Mississippi, Copilot business case', 'Hi Erin,

If a Copilot expansion at BioMarin or North Mississippi Health Services is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside both on Viva Glint and People Science, so we know the people and the data.

Is there a deal at either, or at another healthcare account, where that would help? Happy to do 15 minutes.

Marco',
   'Following up on BioMarin and North Mississippi', 'Hi Erin,

Following up on my note about the Copilot business case at BioMarin and North Mississippi. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '4fa1135b-ed4b-4eb5-a312-4057e8a34ac1', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Brooke', 'Madsen', 'Modern Work Specialist', 'brooke.madsen@microsoft.com', 'microsoft.com', 'Microsoft USA', null, 18, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'BioMarin, Copilot business case', 'Hi Brooke,

If a Copilot expansion at BioMarin is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside BioMarin on Viva Glint and People Science, so we know the people and the data.

Is there a deal at BioMarin or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on BioMarin', 'Hi Brooke,

Following up on my note about the Copilot business case at BioMarin. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '40a0a1f1-d39b-4965-80ba-efb712e5a3c6', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Tim', 'Newton', null, 'timnewt@microsoft.com', 'microsoft.com', 'Microsoft USA', null, 19, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'TDIndustries, Copilot business case', 'Hi Tim,

If a Copilot expansion at TDIndustries is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside TDIndustries, so we know the people and the data.

Is there a deal at TDIndustries or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on TDIndustries', 'Hi Tim,

Following up on my note about the Copilot business case at TDIndustries. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', 'cffac337-7f25-405c-ad28-16c17bac686e', '51f7a43e-6eab-4622-9256-8927ecb8eb10', 'Niklas', 'Preiss', null, 'nipreiss@microsoft.com', 'microsoft.com', 'Microsoft GERMANY', null, 20, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'PIMCO Prime Real Estate, Copilot business case', 'Hi Niklas,

If a Copilot expansion at PIMCO Prime Real Estate is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside PIMCO Prime Real Estate, so we know the people and the data.

Is there a deal at PIMCO or other clients where that would help? Happy to do 15 minutes.

Marco',
   'Following up on PIMCO', 'Hi Niklas,

Following up on my note about the Copilot business case at PIMCO Prime Real Estate. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '7542f0ed-7134-435a-b85e-5e41a8f226c2', '6b0f6537-9c03-488b-ad47-b74c044cdb03', 'Aoife', 'Corcoran', 'Sr. Enterprise Security Specialist', 'acorcoran@microsoft.com', 'microsoft.com', 'Microsoft IRELAND', 'https://www.linkedin.com/in/aoife-corcoran-0b62ba141/', 21, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Warburtons, and who owns the Copilot case', 'Hi Aoife,

If a Copilot expansion at Warburtons is waiting on a business case, we can help build it, and if that sits with a colleague of yours I would value the pointer.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We already work inside Warburtons on Viva Glint and People Science, so we know the people and the data.

Is there someone on your side who owns that conversation? Happy to do 15 minutes either way.

Marco',
   'Following up on Warburtons', 'Hi Aoife,

Following up on my note about the Copilot business case at Warburtons. If that sits with a colleague of yours, a name is all I need. If not, no problem at all and I will leave it there.

Worth a pointer?

Marco'),
  ('7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27', '7ca24894-69d0-4afc-97a8-8b0b75edd9b6', 'a941ef84-f3dd-4812-adb9-e5a3064a7aef', 'Eric', 'Inch', 'Principal Solution Specialist, Security, Compliance & Identity', 'eric.inch@microsoft.com', 'microsoft.com', 'Microsoft USA', 'https://www.linkedin.com/in/ericjinch', 22, 'top', 'Microsoft AIBS lijst 20-10-2026',
   'Copilot business cases, from the partner side', 'Hi Eric,

If a Copilot expansion anywhere in your accounts is waiting on a business case, we can help build it.

With your Microsoft colleagues we run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption. We did the Viva Glint and People Science work inside MAIRE, which is how your name came up.

Is there a deal where that would help? Happy to do 15 minutes.

Marco',
   'Following up on my note', 'Hi Eric,

Following up on my note about Copilot business cases across your accounts. If that is not yours to pick up, pointing me to whoever owns it helps just as much. If the timing is wrong, tell me and I will leave it there.

Worth 15 minutes?

Marco')
on conflict do nothing;


-- Controle: 22 rijen, allemaal met tekst, allemaal queued, geen dubbele prio.
-- select count(*) rijen, count(msg1_body) met_mail1, count(msg2_body) met_mail2,
--        count(distinct outreach_prio) prios, count(distinct status) statussen
--   from outreach_contact where campaign_id = '7a3f1c84-2b65-4d0e-9a51-6c8e3f0d4b27';
