-- One-time seed of glint_delivery from Yarmilla's Master Project Overview
-- (snapshot read 2026-06-05). Owners/hours/status/priority are as-recorded;
-- dates are kept as free text where the sheet was ambiguous. The /api/glint-sync
-- endpoint will overwrite these rows (upsert on sheet_key) once Graph access is
-- configured. Run AFTER schema_glint_delivery.sql.
--
-- company_id is resolved by a name match against companies; leaves null if none.

insert into public.glint_delivery
  (sheet_key, client_name, project_name, service_type, region, status, priority,
   cs_owner, cs_hours, ps_owner, ps_hours, other_contractors, other_hours,
   ko_date, survey_date, insight_review_date, delivery_end,
   next_milestone_label, next_milestone_date, notes, follow_up, company_id)
values
 ('Alex Lee|Insight review Q3', 'Alex Lee', 'Alex Lee-Insight review-Q3-2025', 'CS and PS Support', 'US', 'In progress', 'Low',
  'Heidi Muhle', 43, 'Paul Mastrangelo', 65, 'Stephanie Noack', 3,
  null, 'Aug 2026', 'Beginning of March', null, 'Survey Aug 2026', '2026-08-01',
  'Waiting to launch survey beginning of 2026.', null,
  (select id from public.companies where lower(name) like '%alex lee%' limit 1)),

 ('GoDaddy|Q3 2025', 'GoDaddy', 'GoDaddy-Q3-2025', 'CS and PS V&S support', 'US', 'In progress', 'High',
  'Heidi Muhle', 66, 'Paul Mastrangelo', 37, 'Joanne Wong', 3,
  null, 'TBC 2026', null, null, 'Survey TBC 2026', null,
  'Moving to Qualtrics 2nd half of 2026.', 'Meeting with Marco',
  (select id from public.companies where lower(name) like '%godaddy%' limit 1)),

 ('Sage|2026', 'Sage', 'Sage-2026', 'PS support', 'UK', 'In progress', 'Low',
  null, 0, 'Kirsty Thompson - Clarke', 131, 'Avneeta Solanki', 4,
  null, null, 'TBC 2026', null, 'Insight reviews TBC', null,
  'Purchased 6 insight reviews; 2 delivered, 4 remaining in 2026, no dates confirmed.', null,
  (select id from public.companies where lower(name) like '%sage%' limit 1)),

 ('Jazz|2026', 'Jazz Pharmaceuticals', 'Jazz-2026', 'CS and PS Support', 'USA/UK', 'In progress', 'Medium',
  'Heidi Muhle', 32, 'Avneeta Solanki', 36, null, 0,
  null, 'May 2026', null, null, 'Survey May 2026', '2026-05-15',
  'Survey running in May; comms June/July (partner with Paul).', null,
  (select id from public.companies where lower(name) like '%jazz%' limit 1)),

 ('Cognex|Q3 2025', 'Cognex', 'Cognex-Q3-2025', 'PS support', 'US', 'In progress', 'Low',
  'Heidi Muhle', 4, 'Paul Mastrangelo', 55, null, 0,
  null, null, null, null, null, null, null, null,
  (select id from public.companies where lower(name) like '%cognex%' limit 1)),

 ('Almirall|360 Q1-Q2 2026', 'Almirall', 'Almirall-360-Q1-Q2-2026', 'CS and PS Support and 360', 'EU', 'In progress', 'Medium',
  'Angela Schwingel', 120, 'Avneeta Solanki', 59, 'Ivan de las Cuevas Ruiz', 11,
  null, null, null, 'Mid 2026', 'Delivery mid-2026', null,
  'Avneeta delivering as new partner/contractor; Kirsty allocated to support her.', null,
  (select id from public.companies where lower(name) like '%almirall%' limit 1)),

 ('PIMCO|360 Configuration', 'PIMCO Prime Real Estate', 'Pimco Prime Real Estate-360 Configuration', 'CS Support', 'EU', 'Not started', 'Medium',
  'Ivan de las Cuevas Ruiz', 37, null, 0, null, 0,
  '11 March 2026', null, null, '9/1/2026', 'KO (slipped)', null,
  'KO 11 March; Ivan not given IT system access — can only watch. Blocked.', null,
  (select id from public.companies where lower(name) like '%pimco%' limit 1)),

 ('SoFi|2026', 'SoFi', 'SoFi Bank-2026', 'CS Support', 'US', 'In progress', 'Low',
  'Stephanie Novack', 60, null, 0, null, 0,
  null, null, null, null, null, null, null, null,
  (select id from public.companies where lower(name) like '%sofi%' limit 1)),

 ('Douglas|CS Q1-Q2 2026', 'Douglas', 'Douglas-CS-Q1-Q2-2026', 'CS Support', 'EU', 'In progress', 'Low',
  'Heidi Muhle', 55, null, 0, null, 0,
  null, null, null, null, null, null,
  'Contact: Alina Reimer (a.reimer@douglas.de).', null,
  (select id from public.companies where lower(name) like '%douglas%' limit 1)),

 ('Warburtons|Q2 2026', 'Warburtons', 'Warburtons – Q2 2026', 'PS support', 'UK', 'In progress', 'Low',
  'Heidi Muhle', 1, 'Kirsty Thompson - Clarke', 42, null, 0,
  null, '28 Apr 2026', '26 May 2026', null, 'Insight review 26 May', '2026-05-26',
  'Survey live ~28 Apr for 3 weeks (closed ~19 May); results presentation 26 May. Contact: Stephen Friel.', null,
  (select id from public.companies where lower(name) like '%warburton%' limit 1)),

 ('Syngenta|Q2 2026', 'Syngenta', 'Syngenta – Q2 2026', 'CS and PS Support', 'Switzerland', 'In progress', 'Low',
  'Ivan de las Cuevas Ruiz', 55, 'Kirsty Thompson - Clarke', 39, null, 0,
  null, null, null, null, null, null,
  'Contact: Daniella Bonança (HRBP, Syngenta).', null,
  (select id from public.companies where lower(name) like '%syngenta%' limit 1)),

 ('Trane|Q2-Q3 2026', 'Trane Technologies', 'Trane-Q2-Q3-2026', 'CS Support', 'US', 'In progress', 'Low',
  'Heidi Muhle', 55, null, 0, null, 0,
  null, 'Aug 2026', null, null, 'Survey Aug 2026', '2026-08-27',
  'Survey QA / bucket of hours. Survey live 27 Aug, closes ~13 Sep. Contact: Katie Kavanagh.', null,
  (select id from public.companies where lower(name) like '%trane%' limit 1)),

 ('BioMarin|2026', 'BioMarin', 'BioMarin-2026', 'CS and PS Support', 'US', 'In progress', 'Low',
  'Heidi Muhle', 67, 'Paul Mastrangelo', 65, null, 0,
  null, null, null, null, null, null,
  'Contact: Jenni Janeczko.', null,
  (select id from public.companies where lower(name) like '%biomarin%' limit 1)),

 ('IMC|Q1-Q2 2026', 'IMC Trading', 'IMC Trading-Q1-Q2-2026', 'CS and PS Support / Insight review', 'EU', 'In progress', 'Low',
  'Ivan de las Cuevas Ruiz', 38, 'Kirsty Thompson - Clarke', 40, null, 0,
  null, null, null, '5/5/2026', 'Delivery 5 May', '2026-05-05',
  'Contact: Denise van Angeren (denise.vanangeren@imc.com).', null,
  (select id from public.companies where lower(name) like '%imc%' limit 1))

on conflict (sheet_key) do nothing;

-- Record the source sheet's last-modified time (as read on 2026-06-05) so the
-- War-room header can show it. The live sync will keep this current.
update public.glint_delivery
set source_modified_at = timestamptz '2026-06-03 13:56:53+00'
where source_modified_at is null;
