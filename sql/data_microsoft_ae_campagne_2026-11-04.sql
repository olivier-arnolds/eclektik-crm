-- Campagne 'Microsoft Account Executives 2026' - 29 Account Executives
-- Bron: Eclectik_Microsoft_Account_Contacts_20-10-2026 (3).xlsx, tabblad
-- 'Microsoft Account Executive'. Functietitels zijn door Olivier nagelopen.
--
-- De campagne start op handmatig (auto_send = false): Marco stuurt bericht 1
-- zelf. Zodra iedereen bericht 1 heeft gehad gaat auto_send aan, en heeft de
-- cron alleen de opvolgers nog te doen.
--
-- Geen afmeldvoet en wel een handtekening, net als bij Microsoft AIBS 2026:
-- dit is partner-naar-partner en geen marketing.

insert into outreach_campaign
  (id, name, channel, status, auto_send, sender_mailbox, daily_cap,
   followup_delay_days_min, followup_delay_days_max, max_per_company_per_week,
   send_windows, opt_out_footer, sender_signature, linkedin_followup)
values
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', 'Microsoft Account Executives 2026', 'email', 'active', false,
   'marco@eclectik.co', 12, 5, 7, 0,
   '["08:30", "11:30", "15:00"]'::jsonb, false, true, false);

insert into outreach_contact
  (campaign_id, first_name, last_name, title, email, email_domain, company, location,
   linkedin_url, source, outreach_prio, channel, status, msg1_subject, msg1_body,
   msg2_subject, msg2_body)
values
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Patrick$m$, $m$Lynch$m$, $m$Telco Majors Account Executive$m$, 'lynchpatrick@microsoft.com', 'microsoft.com', $m$Liberty Global$m$, $m$United Kingdom$m$, 'https://www.linkedin.com/in/paddylynch1/', 'Microsoft AE lijst 20-10-2026', 1, 'email', 'queued', $m$Copilot at Liberty Global$m$, $m$Hi Patrick,

It is my understanding that, in your role as Telco Majors Account Executive, you are responsible for accounts including Liberty Global.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Liberty Global$m$, $m$Hi Patrick,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Natalie$m$, $m$Viskozki Knapp$m$, $m$Senior Account Executive$m$, 'nviskozki@microsoft.com', 'microsoft.com', $m$TDIndustries$m$, $m$United States$m$, 'https://www.linkedin.com/in/natalie-viskozki', 'Microsoft AE lijst 20-10-2026', 2, 'email', 'queued', $m$Copilot at TDIndustries$m$, $m$Hi Natalie,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including TDIndustries.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at TDIndustries$m$, $m$Hi Natalie,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Gabriel$m$, $m$Moreno$m$, $m$Senior Digital Account Executive$m$, 'Gabriel.Moreno@microsoft.com', 'microsoft.com', $m$SoFi$m$, $m$United States$m$, 'https://www.linkedin.com/in/gabrielmorenomicrosoft/', 'Microsoft AE lijst 20-10-2026', 3, 'email', 'queued', $m$Copilot at SoFi$m$, $m$Hi Gabriel,

It is my understanding that, in your role as Senior Digital Account Executive, you are responsible for accounts including SoFi.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at SoFi$m$, $m$Hi Gabriel,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Uri$m$, $m$Brown$m$, $m$Strategic Account Technology Lead$m$, 'uribrown@microsoft.com', 'microsoft.com', $m$Chugai Pharma$m$, $m$Switzerland$m$, 'https://www.linkedin.com/in/uribrown/', 'Microsoft AE lijst 20-10-2026', 4, 'email', 'queued', $m$Copilot at Chugai Pharma$m$, $m$Hi Uri,

It is my understanding that, in your role as Strategic Account Technology Lead, you are responsible for accounts including Chugai Pharma.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Chugai Pharma$m$, $m$Hi Uri,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Rob$m$, $m$Williamson$m$, $m$General Manager$m$, 'rwilliamson@microsoft.com', 'microsoft.com', $m$PEP and Pepkor Speciality$m$, $m$South Afrika$m$, 'https://www.linkedin.com/in/robert-williamson-9b39912/?skipRedirect=true', 'Microsoft AE lijst 20-10-2026', 5, 'email', 'queued', $m$Copilot at PEP and Pepkor$m$, $m$Hi Rob,

It is my understanding that, in your role as General Manager, you are responsible for accounts including PEP and Pepkor Speciality.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at PEP and Pepkor$m$, $m$Hi Rob,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Vasily$m$, $m$Fomin$m$, $m$Senior Account Executive$m$, 'vasilyfomyn@microsoft.com', 'microsoft.com', $m$Westfalen$m$, $m$Soain$m$, 'https://www.linkedin.com/in/vasily-fomin/', 'Microsoft AE lijst 20-10-2026', 6, 'email', 'queued', $m$Copilot at Westfalen$m$, $m$Hi Vasily,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including Westfalen.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Westfalen$m$, $m$Hi Vasily,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Greg$m$, $m$Mills$m$, $m$Senior Account Executive$m$, 'gregmills@microsoft.com', 'microsoft.com', $m$Draper$m$, $m$United States$m$, 'https://www.linkedin.com/in/gregoryaps/', 'Microsoft AE lijst 20-10-2026', 7, 'email', 'queued', $m$Copilot at Draper$m$, $m$Hi Greg,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including Draper.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Draper$m$, $m$Hi Greg,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Lisa$m$, $m$Kennedy Smith$m$, $m$Global Strategic Client Director$m$, 'Lisa.Smith@microsoft.com', 'microsoft.com', $m$Sage$m$, $m$United States$m$, 'https://www.linkedin.com/in/lisa-kennedy-smith-660764/', 'Microsoft AE lijst 20-10-2026', 8, 'email', 'queued', $m$Copilot at Sage$m$, $m$Hi Lisa,

It is my understanding that, in your role as Global Strategic Client Director, you are responsible for accounts including Sage.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Sage$m$, $m$Hi Lisa,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Kirkland$m$, $m$Jue$m$, $m$Director Major Enterprise$m$, 'Kirkland.Jue@microsoft.com', 'microsoft.com', $m$GoDaddy$m$, $m$United States$m$, 'https://www.linkedin.com/in/kirklandjue/', 'Microsoft AE lijst 20-10-2026', 9, 'email', 'queued', $m$Copilot at GoDaddy$m$, $m$Hi Kirkland,

It is my understanding that, in your role as Director Major Enterprise, you are responsible for accounts including GoDaddy.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at GoDaddy$m$, $m$Hi Kirkland,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Gary$m$, $m$Seeley$m$, $m$Account Executive$m$, 'garyseeley@microsoft.com', 'microsoft.com', $m$M&C Saatchi$m$, $m$Ireland$m$, 'https://www.linkedin.com/in/garyseeley/', 'Microsoft AE lijst 20-10-2026', 10, 'email', 'queued', $m$Copilot at M&C Saatchi$m$, $m$Hi Gary,

It is my understanding that, in your role as Account Executive, you are responsible for accounts including M&C Saatchi.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at M&C Saatchi$m$, $m$Hi Gary,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Niamh$m$, $m$Walsh$m$, $m$Account Executive$m$, 'Niamh.Walsh@microsoft.com', 'microsoft.com', $m$Warburtons$m$, $m$Ireland$m$, 'https://www.linkedin.com/in/niamh-walsh-8885b653/', 'Microsoft AE lijst 20-10-2026', 11, 'email', 'queued', $m$Copilot at Warburtons$m$, $m$Hi Niamh,

It is my understanding that, in your role as Account Executive, you are responsible for accounts including Warburtons.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Warburtons$m$, $m$Hi Niamh,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Mathieu$m$, $m$Metzdorf$m$, $m$Digital Account Executive$m$, 'mmetzdorf@microsoft.com', 'microsoft.com', $m$Breitling$m$, $m$Spain$m$, 'https://es.linkedin.com/in/mathieumetzdorf', 'Microsoft AE lijst 20-10-2026', 12, 'email', 'queued', $m$Copilot at Breitling$m$, $m$Hi Mathieu,

It is my understanding that, in your role as Digital Account Executive, you are responsible for accounts including Breitling.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Breitling$m$, $m$Hi Mathieu,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$James$m$, $m$Daley$m$, $m$Medium Enterprise Sales$m$, 'jamesdaley@microsoft.com', 'microsoft.com', $m$IMC Trading$m$, $m$United States$m$, 'https://www.linkedin.com/in/jamesbdaley/', 'Microsoft AE lijst 20-10-2026', 13, 'email', 'queued', $m$Copilot at IMC Trading$m$, $m$Hi James,

It is my understanding that, in your role as Medium Enterprise Sales, you are responsible for accounts including IMC Trading.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at IMC Trading$m$, $m$Hi James,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Sierra$m$, $m$Brandenburg$m$, $m$Account Executive$m$, 'Sierra.Brandenburg@microsoft.com', 'microsoft.com', $m$the Boston Red Sox$m$, $m$United States$m$, 'https://www.linkedin.com/in/sierra-brandenburg/', 'Microsoft AE lijst 20-10-2026', 14, 'email', 'queued', $m$Copilot at the Red Sox$m$, $m$Hi Sierra,

It is my understanding that, in your role as Account Executive, you are responsible for accounts including the Boston Red Sox.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at the Red Sox$m$, $m$Hi Sierra,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Christoph$m$, $m$Isenburg$m$, $m$Enterprise Account Executive$m$, 'Christoph.Isenburg@microsoft.com', 'microsoft.com', $m$Eppendorf$m$, $m$Germany$m$, 'https://de.linkedin.com/in/chris-isenburg', 'Microsoft AE lijst 20-10-2026', 15, 'email', 'queued', $m$Copilot at Eppendorf$m$, $m$Hi Christoph,

It is my understanding that, in your role as Enterprise Account Executive, you are responsible for accounts including Eppendorf.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Eppendorf$m$, $m$Hi Christoph,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Sarah$m$, $m$Wilde$m$, $m$Senior Client Executive$m$, 'sarahwilde@microsoft.com', 'microsoft.com', $m$Serco$m$, $m$United Kingdom$m$, 'https://www.linkedin.com/in/sarah-e-wilde/', 'Microsoft AE lijst 20-10-2026', 16, 'email', 'queued', $m$Copilot at Serco$m$, $m$Hi Sarah,

It is my understanding that, in your role as Senior Client Executive, you are responsible for accounts including Serco.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Serco$m$, $m$Hi Sarah,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Manfredo$m$, $m$Santopinto$m$, $m$Senior Strategic Account Executive$m$, 'Manfredo.Santopinto@microsoft.com', 'microsoft.com', $m$the European Training Foundation$m$, $m$Belgium$m$, 'https://www.linkedin.com/in/manfredo-santopinto/', 'Microsoft AE lijst 20-10-2026', 17, 'email', 'queued', $m$Copilot at the ETF$m$, $m$Hi Manfredo,

It is my understanding that, in your role as Senior Strategic Account Executive, you are responsible for accounts including the European Training Foundation.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at the ETF$m$, $m$Hi Manfredo,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Pilar$m$, $m$Ariza Colmenares$m$, $m$Account Executive$m$, 'pilari@microsoft.com', 'microsoft.com', $m$Almirall$m$, $m$Spain$m$, 'https://www.linkedin.com/in/pilar-ariza-colmenares-32680a65/', 'Microsoft AE lijst 20-10-2026', 18, 'email', 'queued', $m$Copilot at Almirall$m$, $m$Hi Pilar,

It is my understanding that, in your role as Account Executive, you are responsible for accounts including Almirall.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Almirall$m$, $m$Hi Pilar,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Samia$m$, $m$Kesseiri$m$, $m$Global Agency Director$m$, 'Samia.Kesseiri@microsoft.com', 'microsoft.com', $m$Dentsu$m$, $m$United Kingdom$m$, 'https://www.linkedin.com/in/samiakesseiri/', 'Microsoft AE lijst 20-10-2026', 19, 'email', 'queued', $m$Copilot at Dentsu$m$, $m$Hi Samia,

It is my understanding that, in your role as Global Agency Director, you are responsible for accounts including Dentsu.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Dentsu$m$, $m$Hi Samia,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Arshad$m$, $m$Syd$m$, $m$Account Director$m$, 'Arshad.Hussain@microsoft.com', 'microsoft.com', $m$Jazz Pharmaceuticals$m$, $m$United States$m$, 'https://www.linkedin.com/in/arshadswsalesprofessional/', 'Microsoft AE lijst 20-10-2026', 20, 'email', 'queued', $m$Copilot at Jazz Pharmaceuticals$m$, $m$Hi Arshad,

It is my understanding that, in your role as Account Director, you are responsible for accounts including Jazz Pharmaceuticals.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Jazz Pharmaceuticals$m$, $m$Hi Arshad,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Francesco$m$, $m$Lo Iacono$m$, $m$Senior Account Executive$m$, 'Francesco.LoIacono@microsoft.com', 'microsoft.com', $m$Maire$m$, $m$Italy$m$, 'https://www.linkedin.com/in/loiaconofrancesco/', 'Microsoft AE lijst 20-10-2026', 21, 'email', 'queued', $m$Copilot at Maire$m$, $m$Hi Francesco,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including Maire.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Maire$m$, $m$Hi Francesco,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Christophe$m$, $m$Besançon$m$, $m$Account Executive$m$, 'chrisbes@microsoft.com', 'microsoft.com', $m$PIMCO Prime Real Estate$m$, $m$France$m$, 'https://www.linkedin.com/in/christophebesancon/', 'Microsoft AE lijst 20-10-2026', 22, 'email', 'queued', $m$Copilot at PIMCO Prime Real Estate$m$, $m$Hi Christophe,

It is my understanding that, in your role as Account Executive, you are responsible for accounts including PIMCO Prime Real Estate.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at PIMCO Prime Real Estate$m$, $m$Hi Christophe,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Jens$m$, $m$Mikosch$m$, $m$Senior Account Executive$m$, 'Jens.Mikosch@microsoft.com', 'microsoft.com', $m$Douglas$m$, $m$Germany$m$, 'https://www.linkedin.com/in/jens-mikosch/', 'Microsoft AE lijst 20-10-2026', 23, 'email', 'queued', $m$Copilot at Douglas$m$, $m$Hi Jens,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including Douglas.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Douglas$m$, $m$Hi Jens,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Philipp$m$, $m$Hass$m$, $m$Sales & Account Executive$m$, 'Philipp.Hass@microsoft.com', 'microsoft.com', $m$Syngenta$m$, $m$Switzerland$m$, 'https://www.linkedin.com/in/philipphass/', 'Microsoft AE lijst 20-10-2026', 24, 'email', 'queued', $m$Copilot at Syngenta$m$, $m$Hi Philipp,

It is my understanding that, in your role as Sales & Account Executive, you are responsible for accounts including Syngenta.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Syngenta$m$, $m$Hi Philipp,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Renee$m$, $m$Johnson$m$, $m$Strategic Account Executive$m$, 'reneejohnson@microsoft.com', 'microsoft.com', $m$BioMarin$m$, $m$United States$m$, 'https://www.linkedin.com/in/reneesjohnson/', 'Microsoft AE lijst 20-10-2026', 25, 'email', 'queued', $m$Copilot at BioMarin$m$, $m$Hi Renee,

It is my understanding that, in your role as Strategic Account Executive, you are responsible for accounts including BioMarin.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at BioMarin$m$, $m$Hi Renee,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Tom$m$, $m$Salerno$m$, $m$Client Executive$m$, 'Tom.Salerno@microsoft.com', 'microsoft.com', $m$Trane$m$, $m$United States$m$, 'https://www.linkedin.com/in/tomsalerno/', 'Microsoft AE lijst 20-10-2026', 26, 'email', 'queued', $m$Copilot at Trane$m$, $m$Hi Tom,

It is my understanding that, in your role as Client Executive, you are responsible for accounts including Trane.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Trane$m$, $m$Hi Tom,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Jason$m$, $m$Wingenbach$m$, $m$Senior Account Executive$m$, 'Jason.Wingenbach@microsoft.com', 'microsoft.com', $m$North Mississippi Health Services$m$, $m$United States$m$, 'https://www.linkedin.com/in/jwingenbach/', 'Microsoft AE lijst 20-10-2026', 27, 'email', 'queued', $m$Copilot at North Mississippi$m$, $m$Hi Jason,

It is my understanding that, in your role as Senior Account Executive, you are responsible for accounts including North Mississippi Health Services.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at North Mississippi$m$, $m$Hi Jason,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Wendy$m$, $m$Li$m$, $m$Director, Account Executive$m$, 'wendyli@microsoft.com', 'microsoft.com', $m$BMC$m$, $m$United States$m$, 'https://www.linkedin.com/in/wendy-li-529a353/', 'Microsoft AE lijst 20-10-2026', 28, 'email', 'queued', $m$Copilot at BMC$m$, $m$Hi Wendy,

It is my understanding that, in your role as Director, Account Executive, you are responsible for accounts including BMC.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at BMC$m$, $m$Hi Wendy,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('3e9c7a51-8d42-4f16-b0c3-5a7e2d916f48', $m$Marloes$m$, $m$Veenstra$m$, $m$Client Executive$m$, 'Marloes.Veenstra@microsoft.com', 'microsoft.com', $m$Boskalis$m$, $m$Netherlands$m$, 'https://nl.linkedin.com/in/marloesveenstra', 'Microsoft AE lijst 20-10-2026', 29, 'email', 'queued', $m$Copilot at Boskalis$m$, $m$Hi Marloes,

It is my understanding that, in your role as Client Executive, you are responsible for accounts including Boskalis.

We are known for our Glint services, with you too I hope ;-). But with other Microsoft colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes, used to move customers from pilot to wider rollout and increased consumption.

That is the conversation I would like to have, about Copilot across your wider portfolio rather than one account.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot at Boskalis$m$, $m$Hi Marloes,

Following up on my note about Copilot across your accounts. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$);
