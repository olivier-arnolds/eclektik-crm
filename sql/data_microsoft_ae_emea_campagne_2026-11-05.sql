-- Campagne 'Microsoft AE EMEA 2026' - 478 contacten binnen Microsoft, waarvan
-- 414 actief
-- Bron: LinkedIn_Account_Executives.xlsx (799 rijen, 797 unieke adressen).
-- Selectie: alleen EMEA. De Verenigde Staten (315), India (1) en Indonesie (1)
-- vallen af, net als vier mensen die al in de AE- of AIBS-campagne zitten.
--
-- Functietitels zijn door Olivier zelf nagelopen; dit script neemt ze letterlijk
-- over. Wie geen 'exec' in de functie heeft staat op is_reserve: die rijen gaan
-- mee in de campagne maar worden niet verzonden tot ze worden vrijgegeven.
--
-- Anders dan bij 'Microsoft Account Executives 2026' is dit een koude lijst van
-- een datahandelaar: we delen geen klant met deze mensen. De opening haakt
-- daarom aan op het patroon dat elke AE kent, de pilot die blijft steken op
-- budget. Omdat het koud is en grotendeels EU staat de afmeldvoet wel aan.
--
-- De campagne start handmatig (auto_send = false): Marco stuurt bericht 1 zelf.
-- max_per_company_per_week staat op 0 (geen grens), anders zou de hele campagne
-- stilvallen: iedereen hoort bij hetzelfde bedrijf.
--
-- Volgorde van aanschrijven (outreach_prio): Benelux, DACH, Nordics, UK,
-- Frankrijk, Spanje, overig EMEA. Binnen een regio eerst de zwaardere titels.

insert into outreach_campaign
  (id, name, channel, status, auto_send, sender_mailbox, daily_cap,
   followup_delay_days_min, followup_delay_days_max, max_per_company_per_week,
   send_windows, opt_out_footer, sender_signature, linkedin_followup)
values
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', 'Microsoft AE EMEA 2026', 'email', 'active', false,
   'marco@eclectik.co', 12, 5, 7, 0,
   '["08:30", "11:30", "15:00"]'::jsonb, true, true, false);

insert into outreach_contact
  (campaign_id, first_name, last_name, title, email, email_domain, company, location,
   linkedin_url, source, outreach_prio, is_reserve, channel, status, email_validation,
   msg1_subject, msg1_body, msg2_subject, msg2_body)
values
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joyce$m$, $m$Bachstein$m$, $m$Enterprise Account Executive$m$, 'jbachstein@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/joycebachstein', $m$LinkedIn AE lijst 05-11-2026$m$, 1, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joyce,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joyce,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Isabella$m$, $m$Campellone$m$, $m$Strategic Account Executive$m$, 'isabella.campellone@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/isabellacampellone', $m$LinkedIn AE lijst 05-11-2026$m$, 2, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Isabella,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Isabella,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thomas$m$, $m$Dalberto$m$, $m$Enterprise Account Executive$m$, 'tdalberto@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Zaventem, Belgium$m$, 'https://linkedin.com/in/thomasdalberto', $m$LinkedIn AE lijst 05-11-2026$m$, 3, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thomas,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thomas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Evelien$m$, $m$Dam$m$, $m$Enterprise Account Executive$m$, 'dame@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/evelien-dam-78a53277', $m$LinkedIn AE lijst 05-11-2026$m$, 4, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Evelien,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Evelien,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jules$m$, $m$Fens$m$, $m$Strategic Account Executive$m$, 'julesfens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jules-fens-660a5035', $m$LinkedIn AE lijst 05-11-2026$m$, 5, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jules,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jules,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jamie$m$, $m$Irawan$m$, $m$Global Account Executive$m$, 'jamie.irawan@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/jamieirawan', $m$LinkedIn AE lijst 05-11-2026$m$, 6, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jamie,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jamie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Martyna$m$, $m$Lubińska$m$, $m$Senior Enterprise Account Executive$m$, 'mlubinska@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/martyna-lubinska', $m$LinkedIn AE lijst 05-11-2026$m$, 7, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Martyna,

In your role as Senior Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Martyna,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ridhima$m$, $m$Malhotra$m$, $m$Global Account Executive$m$, 'ridhima.malhotra@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/ridhima-malhotra-b04abb4', $m$LinkedIn AE lijst 05-11-2026$m$, 8, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ridhima,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ridhima,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Mathijs$m$, $m$Strategic Services Account Executive$m$, 'amathijs@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels, Belgium$m$, 'https://linkedin.com/in/alexander-mathijs', $m$LinkedIn AE lijst 05-11-2026$m$, 9, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Strategic Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rekha$m$, $m$Menon$m$, $m$Senior Strategic Account Executive$m$, 'rekha.menon@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/menonrekha', $m$LinkedIn AE lijst 05-11-2026$m$, 10, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rekha,

In your role as Senior Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rekha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sam$m$, $m$Pardaens$m$, $m$Strategic Account Executive$m$, 'sam.pardaens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/sam-pardaens', $m$LinkedIn AE lijst 05-11-2026$m$, 11, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sam,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sam,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Carla$m$, $m$Parilo$m$, $m$Global Account Executive$m$, 'carla.pariloseerden@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hoofddorp, Netherlands$m$, 'https://linkedin.com/in/carlaparilo', $m$LinkedIn AE lijst 05-11-2026$m$, 12, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Carla,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Carla,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gizem$m$, $m$Sagay Günay$m$, $m$Strategic Account Executive$m$, 'gizem.sagay@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/gizemsagay', $m$LinkedIn AE lijst 05-11-2026$m$, 13, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gizem,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gizem,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mohamed$m$, $m$Taybi$m$, $m$Enterprise Account Executive$m$, 'mohamedtaybi@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/mohamedtaybi', $m$LinkedIn AE lijst 05-11-2026$m$, 14, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mohamed,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mohamed,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laure$m$, $m$Timperman$m$, $m$Sr. Strategic Account Executive$m$, 'ltimperman@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/lauretimperman', $m$LinkedIn AE lijst 05-11-2026$m$, 15, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laure,

In your role as Sr. Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laure,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Loes$m$, $m$Toonen$m$, $m$Strategic Account Executive$m$, 'toonenloes@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Nijmegen, Netherlands$m$, 'https://linkedin.com/in/loes-toonen-75736965', $m$LinkedIn AE lijst 05-11-2026$m$, 16, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Loes,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Loes,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rachelle$m$, $m$van de Griek$m$, $m$Enterprise Account Executive$m$, 'rvandegriek@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Haarlem, Netherlands$m$, 'https://linkedin.com/in/rachellevandegriek', $m$LinkedIn AE lijst 05-11-2026$m$, 17, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rachelle,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rachelle,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Scott$m$, $m$van der Wel$m$, $m$Global Account Executive$m$, 'scott.wel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/scottvanderwel', $m$LinkedIn AE lijst 05-11-2026$m$, 18, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Scott,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Scott,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Merel$m$, $m$van Wijk-Snel$m$, $m$Sr. Enterprise Account Executive$m$, 'merelvanwijk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/merelvanwijk', $m$LinkedIn AE lijst 05-11-2026$m$, 19, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Merel,

In your role as Sr. Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Merel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Martijn$m$, $m$Verbeek$m$, $m$Enterprise Account Executive$m$, 'mverbeek@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Vught, Netherlands$m$, 'https://linkedin.com/in/martijn-verbeek-7ab4aa19', $m$LinkedIn AE lijst 05-11-2026$m$, 20, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Martijn,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Martijn,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Renske$m$, $m$Wolters$m$, $m$Strategic Client Executive$m$, 'rwolters@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/woltersrenske', $m$LinkedIn AE lijst 05-11-2026$m$, 21, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Renske,

In your role as Strategic Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Renske,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Silvia$m$, $m$Agresti$m$, $m$Sr Sales Executive$m$, 'silvia.agresti@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/sagresti', $m$LinkedIn AE lijst 05-11-2026$m$, 22, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Silvia,

In your role as Sr Sales Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Silvia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Bart$m$, $m$Albronda$m$, $m$Senior Account Executive$m$, 'bartalbronda@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Schiphol, Netherlands$m$, 'https://linkedin.com/in/bart-albronda', $m$LinkedIn AE lijst 05-11-2026$m$, 23, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Bart,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Bart,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Luc$m$, $m$Apers$m$, $m$Executive$m$, 'luc.apers@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Gent, Belgium$m$, 'https://linkedin.com/in/luc-apers-1355281', $m$LinkedIn AE lijst 05-11-2026$m$, 24, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Luc,

In your role as Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Luc,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ulker$m$, $m$Aydin$m$, $m$Account Executive$m$, 'ulker.aydin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Tilburg, Netherlands$m$, 'https://linkedin.com/in/ulker-aydin-b005295', $m$LinkedIn AE lijst 05-11-2026$m$, 25, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ulker,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ulker,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Antonie$m$, $m$Berkel$m$, $m$Account Executive$m$, 'aberkel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Utrecht, Netherlands$m$, 'https://linkedin.com/in/antonie-berkel', $m$LinkedIn AE lijst 05-11-2026$m$, 26, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Antonie,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Antonie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jeroen$m$, $m$Bolte$m$, $m$Sr Account Executive$m$, 'jeroenbolte@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jeroen-bolte', $m$LinkedIn AE lijst 05-11-2026$m$, 27, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jeroen,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jeroen,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Işıl$m$, $m$Canıtez-Kalma$m$, $m$Senior Account Executive$m$, 'isil.canitez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/işıl-canıtez-kalma-66a8653b', $m$LinkedIn AE lijst 05-11-2026$m$, 28, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Işıl,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Işıl,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joost$m$, $m$Csidei$m$, $m$Account Executive$m$, 'jcsidei@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/joostcsidei', $m$LinkedIn AE lijst 05-11-2026$m$, 29, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joost,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joost,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Erik$m$, $m$Dams$m$, $m$Sr. Commercial Executive$m$, 'erikdams@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Eindhoven, Netherlands$m$, 'https://linkedin.com/in/erikdams', $m$LinkedIn AE lijst 05-11-2026$m$, 30, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Erik,

In your role as Sr. Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Erik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kuntal$m$, $m$Das$m$, $m$Sr. Account Executive$m$, 'kuntaldas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/kuntal-das-1810a535', $m$LinkedIn AE lijst 05-11-2026$m$, 31, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kuntal,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kuntal,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Karl$m$, $m$De Backer$m$, $m$Account Executive$m$, 'karlb@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/karl-de-backer-5615a4', $m$LinkedIn AE lijst 05-11-2026$m$, 32, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Karl,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Karl,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joran$m$, $m$De Clercq$m$, $m$Account Executive$m$, 'jorand@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Gent, Belgium$m$, 'https://linkedin.com/in/jorandeclercq', $m$LinkedIn AE lijst 05-11-2026$m$, 33, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joran,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joran,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cor$m$, $m$de Muinck$m$, $m$Sr. Commercial Executive$m$, 'corde@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/cordemuinck', $m$LinkedIn AE lijst 05-11-2026$m$, 34, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cor,

In your role as Sr. Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cor,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mathias$m$, $m$Devis$m$, $m$Senior Account Executive$m$, 'mathiasdevis@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/mathiasdevis', $m$LinkedIn AE lijst 05-11-2026$m$, 35, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mathias,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mathias,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Salma$m$, $m$ElSharabassi$m$, $m$Services Account Executive$m$, 'salma@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/salma-elsharabassi', $m$LinkedIn AE lijst 05-11-2026$m$, 36, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Salma,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Salma,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Harsha$m$, $m$Govindarajalu$m$, $m$Sr Account Executive$m$, 'harshag@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/harshagovindarajalu', $m$LinkedIn AE lijst 05-11-2026$m$, 37, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Harsha,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Harsha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thomas$m$, $m$Groenendaal$m$, $m$Commercial Executive$m$, 'tgroenendaal@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/thomasgroenendaal', $m$LinkedIn AE lijst 05-11-2026$m$, 38, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thomas,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thomas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anne$m$, $m$Hameleers$m$, $m$Account Executive$m$, 'ahameleers@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/annehameleers', $m$LinkedIn AE lijst 05-11-2026$m$, 39, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anne,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anne,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gaby$m$, $m$Hannen$m$, $m$Account Executive$m$, 'gabyhannen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Vught, Netherlands$m$, 'https://linkedin.com/in/gabyhannen', $m$LinkedIn AE lijst 05-11-2026$m$, 40, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gaby,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gaby,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rogier$m$, $m$Hassink$m$, $m$Account Delivery Executive$m$, 'rogier.hassink@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/rogier-hassink-51810b4', $m$LinkedIn AE lijst 05-11-2026$m$, 41, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rogier,

In your role as Account Delivery Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rogier,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anique$m$, $m$Heezen$m$, $m$Commercial Executive$m$, 'anheezen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Enschede, Netherlands$m$, 'https://linkedin.com/in/anique-heezen-5248b626', $m$LinkedIn AE lijst 05-11-2026$m$, 42, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anique,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anique,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Manon$m$, $m$Heinrich$m$, $m$Account Executive$m$, 'mheinrich@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/manonheinrich', $m$LinkedIn AE lijst 05-11-2026$m$, 43, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Manon,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Manon,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jean Paul$m$, $m$In 't Zandt$m$, $m$Sr Services Account Executive$m$, 'j.paul@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jean-paul-int-zandt', $m$LinkedIn AE lijst 05-11-2026$m$, 44, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jean Paul,

In your role as Sr Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jean Paul,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stefania$m$, $m$Iordache$m$, $m$Account Executive$m$, 'stefania.iordache@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/stefania-iordache-b4005652', $m$LinkedIn AE lijst 05-11-2026$m$, 45, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stefania,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stefania,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jonathan$m$, $m$Jacqmin$m$, $m$Senior Commercial Executive$m$, 'jonathan.jacqmin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/jonathan-jacqmin-7474b4bb', $m$LinkedIn AE lijst 05-11-2026$m$, 46, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jonathan,

In your role as Senior Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jonathan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rene$m$, $m$Jansen$m$, $m$Account Executive$m$, 'rene.jansen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Heemstede, Netherlands$m$, 'https://linkedin.com/in/rene-jansen-337aa9', $m$LinkedIn AE lijst 05-11-2026$m$, 47, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rene,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rene,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Tim$m$, $m$Janssens$m$, $m$Account Executive$m$, 'timjanssens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/tim-janssens-79541431', $m$LinkedIn AE lijst 05-11-2026$m$, 48, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Tim,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Tim,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Giorgio$m$, $m$Joziasse$m$, $m$Account Executive$m$, 'giorgio.joziasse@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Breda, Netherlands$m$, 'https://linkedin.com/in/gjoziasse', $m$LinkedIn AE lijst 05-11-2026$m$, 49, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Giorgio,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Giorgio,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rabiye$m$, $m$Karahancer$m$, $m$Consulting account Executive$m$, 'rkarahancer@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Genk, Belgium$m$, 'https://linkedin.com/in/rabiye-karahancer-b27853b', $m$LinkedIn AE lijst 05-11-2026$m$, 50, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rabiye,

In your role as Consulting account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rabiye,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sander$m$, $m$Lenskens$m$, $m$Account Executive$m$, 'slenskens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/sanderlenskens', $m$LinkedIn AE lijst 05-11-2026$m$, 51, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sander,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lieke$m$, $m$Luijckx$m$, $m$Services Account Executive$m$, 'lieke.luijckx@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/lieke-luijckx-28860584', $m$LinkedIn AE lijst 05-11-2026$m$, 52, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lieke,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lieke,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Venice$m$, $m$Nollora$m$, $m$Senior Account Executive$m$, 'vencru@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/venicenollora', $m$LinkedIn AE lijst 05-11-2026$m$, 53, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Venice,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Venice,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Robert$m$, $m$Nooitgedagt$m$, $m$Senior Partner Sales Executive$m$, 'robert.nooitgedagt@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/robertnooitgedagt', $m$LinkedIn AE lijst 05-11-2026$m$, 54, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Robert,

In your role as Senior Partner Sales Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Robert,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Frederik$m$, $m$Op de Beeck$m$, $m$Account Executive$m$, 'fopdebeeck@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels, Belgium$m$, 'https://linkedin.com/in/frederikopdebeeck', $m$LinkedIn AE lijst 05-11-2026$m$, 55, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Frederik,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Frederik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pauline$m$, $m$Opdebeeck$m$, $m$Account Executive$m$, 'pauline.opdebeeck@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/pauline-opdebeeck', $m$LinkedIn AE lijst 05-11-2026$m$, 56, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pauline,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pauline,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gert$m$, $m$Parijs$m$, $m$Sr. Services Account Executive$m$, 'gparijs@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Leuven, Belgium$m$, 'https://linkedin.com/in/gertparijs', $m$LinkedIn AE lijst 05-11-2026$m$, 57, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gert,

In your role as Sr. Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gert,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Romain$m$, $m$Paris$m$, $m$Account Executive$m$, 'parisr@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Eijsden, Netherlands$m$, 'https://linkedin.com/in/rjjhdparis', $m$LinkedIn AE lijst 05-11-2026$m$, 58, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Romain,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Romain,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cas$m$, $m$Pijnenburg$m$, $m$Sr. Account Executive$m$, 'cas.pijnenburg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/cas-pijnenburg', $m$LinkedIn AE lijst 05-11-2026$m$, 59, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cas,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$David$m$, $m$Recio$m$, $m$Senior Account Executive$m$, 'davidrecio@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jdrecio', $m$LinkedIn AE lijst 05-11-2026$m$, 60, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi David,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi David,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jessie$m$, $m$Reymenants$m$, $m$Services Director Account Executive$m$, 'jreymenants@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/jessiereymenants', $m$LinkedIn AE lijst 05-11-2026$m$, 61, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jessie,

In your role as Services Director Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jessie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joke$m$, $m$Rys$m$, $m$Account Executive$m$, 'joke.rys@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/joke-rys-6a8446a', $m$LinkedIn AE lijst 05-11-2026$m$, 62, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joke,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joke,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nazan$m$, $m$Sabah Linet$m$, $m$Services Account Executive$m$, 'nazan.linet@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/nazan-sabah-linet-5b61a31', $m$LinkedIn AE lijst 05-11-2026$m$, 63, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nazan,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nazan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anouk$m$, $m$Schippers$m$, $m$Account Executive$m$, 'anouk.schippers@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/anouk-schippers-19aa2a3b', $m$LinkedIn AE lijst 05-11-2026$m$, 64, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anouk,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anouk,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lisa$m$, $m$Schouws$m$, $m$Account Executive$m$, 'lisaschouws@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/lisaschouws', $m$LinkedIn AE lijst 05-11-2026$m$, 65, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lisa,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lisa,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cesar$m$, $m$Sheikh$m$, $m$Account Executive$m$, 'cesar.sheikh@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/cesarsheikh', $m$LinkedIn AE lijst 05-11-2026$m$, 66, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cesar,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cesar,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Amrutha$m$, $m$Sivaraman$m$, $m$Account Executive$m$, 'asivaraman@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/amruthasivaraman', $m$LinkedIn AE lijst 05-11-2026$m$, 67, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Amrutha,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Amrutha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Chris$m$, $m$Smeets-Daday$m$, $m$Director Services Account Executive$m$, 'csmeetsdaday@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/christiansmeetsdaday', $m$LinkedIn AE lijst 05-11-2026$m$, 68, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Chris,

In your role as Director Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Chris,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vincent$m$, $m$Spada$m$, $m$Account Executive$m$, 'vincentspada@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/vincentspada', $m$LinkedIn AE lijst 05-11-2026$m$, 69, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vincent,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vincent,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Oksana$m$, $m$Tikhonova$m$, $m$Senior Unified Services Sales Account Executive$m$, 'oxana.tikhonova@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/oksana-tikhonova-22a23a1', $m$LinkedIn AE lijst 05-11-2026$m$, 70, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Oksana,

In your role as Senior Unified Services Sales Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Oksana,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Janiek$m$, $m$Touw$m$, $m$Account Executive$m$, 'janiektouw@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/janiek-touw-b46b94135', $m$LinkedIn AE lijst 05-11-2026$m$, 71, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Janiek,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Janiek,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jeroen$m$, $m$Unk$m$, $m$Sr Client Executive$m$, 'jeroen.unk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jeroenunk', $m$LinkedIn AE lijst 05-11-2026$m$, 72, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jeroen,

In your role as Sr Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jeroen,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jan$m$, $m$van der Elst$m$, $m$Account Executive$m$, 'jan.vanderelst@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Arnhem, Netherlands$m$, 'https://linkedin.com/in/jan-van-der-elst-44b4213', $m$LinkedIn AE lijst 05-11-2026$m$, 73, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jan,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ricardo$m$, $m$van Domburg$m$, $m$Account Executive$m$, 'ricardov@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/ricardo-van-domburg-954781', $m$LinkedIn AE lijst 05-11-2026$m$, 74, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ricardo,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ricardo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Danielle$m$, $m$van Eeuwijk$m$, $m$Senior Account Executive$m$, 'danielle.vaneeuwijk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/daniellevaneeuwijk', $m$LinkedIn AE lijst 05-11-2026$m$, 75, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Danielle,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Danielle,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$van Leeuwen$m$, $m$sr Account Executive$m$, 'mvanleeuwen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/michaelvanleeuwen', $m$LinkedIn AE lijst 05-11-2026$m$, 76, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Yvonne$m$, $m$van Leuken$m$, $m$Str Account Executive$m$, 'yvanleuken@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Neerpelt, Belgium$m$, 'https://linkedin.com/in/yvonne-van-leuken', $m$LinkedIn AE lijst 05-11-2026$m$, 77, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Yvonne,

In your role as Str Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Yvonne,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christophe$m$, $m$Van Mollekot$m$, $m$Sr Account Exec$m$, 'cvanmollekot@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/christophevm', $m$LinkedIn AE lijst 05-11-2026$m$, 78, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christophe,

In your role as Sr Account Exec you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christophe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kris$m$, $m$Vande Moortel$m$, $m$Senior account-Executive$m$, 'kris@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Keiem, Belgium$m$, 'https://linkedin.com/in/kris-vande-moortel-804a09158', $m$LinkedIn AE lijst 05-11-2026$m$, 79, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kris,

In your role as Senior account-Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kris,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alina$m$, $m$Vanderidt$m$, $m$Account Executive$m$, 'alinav@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Mechelen, Belgium$m$, 'https://linkedin.com/in/alinavanderidt', $m$LinkedIn AE lijst 05-11-2026$m$, 80, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alina,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nick$m$, $m$Vanderperre$m$, $m$Services Account Executive$m$, 'nickp@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/nick-vanderperre-2455566', $m$LinkedIn AE lijst 05-11-2026$m$, 81, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nick,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nick,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hans$m$, $m$Verbeeck$m$, $m$Senior Account Executive$m$, 'hans.verbeeck@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/hansver', $m$LinkedIn AE lijst 05-11-2026$m$, 82, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hans,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hans,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kathy$m$, $m$Vermeulen$m$, $m$Senior Account Executive$m$, 'kathy.vermeulen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brussels-Capital Region, Belgium$m$, 'https://linkedin.com/in/kathy-vermeulen-6461541', $m$LinkedIn AE lijst 05-11-2026$m$, 83, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kathy,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kathy,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vincent$m$, $m$Vermeulen$m$, $m$Senior Client Executive$m$, 'vincent.vermeulen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Rijswijk, Netherlands$m$, 'https://linkedin.com/in/vincent-vermeulen070', $m$LinkedIn AE lijst 05-11-2026$m$, 84, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vincent,

In your role as Senior Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vincent,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sander$m$, $m$Vos$m$, $m$Account Executive$m$, 'sander.vos@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/sander-vos-13448739', $m$LinkedIn AE lijst 05-11-2026$m$, 85, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sander,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Paul$m$, $m$Wasch$m$, $m$Sr. Account Executive$m$, 'pwasch@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Zeewolde, Netherlands$m$, 'https://linkedin.com/in/paul-wasch-0ab12b1', $m$LinkedIn AE lijst 05-11-2026$m$, 86, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Paul,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Paul,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Leonardo$m$, $m$Wilbrink$m$, $m$Sr. Account Executive$m$, 'leonardo.wilbrink@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Heemskerk, Netherlands$m$, 'https://linkedin.com/in/leonardowilbrink', $m$LinkedIn AE lijst 05-11-2026$m$, 87, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Leonardo,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Leonardo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anastasia$m$, $m$Zenetzidaki$m$, $m$Account Executive$m$, 'anastasia.zenetzidaki@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/anastasia-zenetzidaki', $m$LinkedIn AE lijst 05-11-2026$m$, 88, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anastasia,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anastasia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alona$m$, $m$Zijlema-Sharabani$m$, $m$Sr. Account Executive$m$, 'asharabani@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Loosdrecht, Netherlands$m$, 'https://linkedin.com/in/alonasharabani', $m$LinkedIn AE lijst 05-11-2026$m$, 89, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alona,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alona,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Patrick$m$, $m$Bartels$m$, $m$Enterprise Account Executive$m$, 'patrick.bartels@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Leverkusen, Germany$m$, 'https://linkedin.com/in/bartels-patrick', $m$LinkedIn AE lijst 05-11-2026$m$, 90, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Patrick,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Patrick,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katharina$m$, $m$Beck$m$, $m$Global Strategic Account Executive$m$, 'katharina.beck@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/katharinabeckms', $m$LinkedIn AE lijst 05-11-2026$m$, 91, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katharina,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katharina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ariane$m$, $m$Bensch$m$, $m$Enterprise Account Executive$m$, 'ariane.bensch@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/arianebensch', $m$LinkedIn AE lijst 05-11-2026$m$, 92, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ariane,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ariane,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dominik$m$, $m$Bergmann$m$, $m$Enterprise Account Executive$m$, 'dominik.bergmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/dominikbergmann', $m$LinkedIn AE lijst 05-11-2026$m$, 93, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dominik,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dominik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Albiona$m$, $m$Berisha$m$, $m$Enterprise Account Executive$m$, 'albiona.berisha@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Frankfurt am Main, Germany$m$, 'https://linkedin.com/in/albiona-berisha-97484a50', $m$LinkedIn AE lijst 05-11-2026$m$, 94, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Albiona,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Albiona,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sofie$m$, $m$Berwind$m$, $m$Strategic Account Executive$m$, 'sofie.berwind@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/berwind', $m$LinkedIn AE lijst 05-11-2026$m$, 95, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sofie,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sofie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mirkan$m$, $m$Celik$m$, $m$Enterprise Account Executive$m$, 'mirkancelik@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/mirkan-celik-167a5a16b', $m$LinkedIn AE lijst 05-11-2026$m$, 96, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mirkan,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mirkan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jonas$m$, $m$Coenen$m$, $m$Strategic Account Executive$m$, 'jonas.coenen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Frankfurt am Main, Germany$m$, 'https://linkedin.com/in/jonas-coenen', $m$LinkedIn AE lijst 05-11-2026$m$, 97, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jonas,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jonas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stefan$m$, $m$Deutschmann$m$, $m$Strategic Account Executive$m$, 'stefan@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockelsdorf, Germany$m$, 'https://linkedin.com/in/stefan-deutschmann-sd1403', $m$LinkedIn AE lijst 05-11-2026$m$, 98, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stefan,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stefan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Maik$m$, $m$Dumstorff$m$, $m$Strategic Account Executive$m$, 'mdumstorff@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/maik-dumstorff-904103136', $m$LinkedIn AE lijst 05-11-2026$m$, 99, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Maik,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Maik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Keiko$m$, $m$Enomoto$m$, $m$Enterprise Account Executive$m$, 'keiko.enomoto@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/keiko-enomoto-658479a6', $m$LinkedIn AE lijst 05-11-2026$m$, 100, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Keiko,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Keiko,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Volker$m$, $m$Fleischmann$m$, $m$Global Services Account Executive$m$, 'volker.fleischmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/volkerf', $m$LinkedIn AE lijst 05-11-2026$m$, 101, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Volker,

In your role as Global Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Volker,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Elisabeth$m$, $m$Goger$m$, $m$Enterprise Account Executive$m$, 'egoger@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/elisabeth-goger', $m$LinkedIn AE lijst 05-11-2026$m$, 102, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Elisabeth,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Elisabeth,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anke$m$, $m$Harbecke$m$, $m$Strategic Account Executive$m$, 'anke.harbecke@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/anke-harbecke-357325137', $m$LinkedIn AE lijst 05-11-2026$m$, 103, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anke,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anke,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christoph$m$, $m$Harding$m$, $m$Enterprise Account Executive$m$, 'christoph.harding@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/christophharding', $m$LinkedIn AE lijst 05-11-2026$m$, 104, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christoph,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christoph,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Philipp$m$, $m$Hauf$m$, $m$Global Account Executive$m$, 'philipphauf@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Frankfurt am Main, Germany$m$, 'https://linkedin.com/in/hauf', $m$LinkedIn AE lijst 05-11-2026$m$, 105, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Philipp,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Philipp,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christian$m$, $m$Heselhaus$m$, $m$Strategic Enterprise Account Executive$m$, 'cheselhaus@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Ahaus, Germany$m$, 'https://linkedin.com/in/christianheselhaus', $m$LinkedIn AE lijst 05-11-2026$m$, 106, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christian,

In your role as Strategic Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rabea$m$, $m$Hoppmann$m$, $m$Strategic Account Executive$m$, 'rabea.hoppmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/rabea-hoppmann-19204968', $m$LinkedIn AE lijst 05-11-2026$m$, 107, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rabea,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rabea,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Selina$m$, $m$Karl$m$, $m$Enterprise Account Executive$m$, 'karls@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/selina-karl', $m$LinkedIn AE lijst 05-11-2026$m$, 108, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Selina,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Selina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Andreas$m$, $m$Klingler$m$, $m$Senior Strategic Account Executive$m$, 'andreas.klingler@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/andreasklingler', $m$LinkedIn AE lijst 05-11-2026$m$, 109, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Andreas,

In your role as Senior Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Andreas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katharina$m$, $m$Krist$m$, $m$Enterprise Account Executive$m$, 'kkrist@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/katharina-krist', $m$LinkedIn AE lijst 05-11-2026$m$, 110, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katharina,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katharina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Finn$m$, $m$Liedtke$m$, $m$Global Commercial Executive$m$, 'finnliedtke@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/finnliedtke', $m$LinkedIn AE lijst 05-11-2026$m$, 111, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Finn,

In your role as Global Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Finn,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Melanie$m$, $m$Mis$m$, $m$Strategic Account Executive$m$, 'mism@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/melanie-mis-3a94a0136', $m$LinkedIn AE lijst 05-11-2026$m$, 112, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Melanie,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Melanie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Martin$m$, $m$Morgenfrüh$m$, $m$Strategic Account Executive$m$, 'martin.morgenfrueh@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/martin-morgenfrueh', $m$LinkedIn AE lijst 05-11-2026$m$, 113, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Martin,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Martin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ingo$m$, $m$Oppelt$m$, $m$Global Account Executive$m$, 'ioppelt@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/ingo-oppelt', $m$LinkedIn AE lijst 05-11-2026$m$, 114, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ingo,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ingo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jan$m$, $m$Riebold$m$, $m$Strategic Account Executive$m$, 'janriebold@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/janriebold', $m$LinkedIn AE lijst 05-11-2026$m$, 115, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jan,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ulf$m$, $m$Ruedel$m$, $m$Global Account Executive$m$, 'ulfruedel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/ulf-ruedel-8756547', $m$LinkedIn AE lijst 05-11-2026$m$, 116, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ulf,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ulf,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Carmela$m$, $m$Saggio$m$, $m$Global Account Executive$m$, 'carmela.saggio@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Renningen, Germany$m$, 'https://linkedin.com/in/carmela-saggio', $m$LinkedIn AE lijst 05-11-2026$m$, 117, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Carmela,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Carmela,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Martin$m$, $m$Schmidt$m$, $m$Strategic Account Executive$m$, 'martin.schmidt@infinera.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/martinschmidtmicrosoft', $m$LinkedIn AE lijst 05-11-2026$m$, 118, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Martin,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Martin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marcus$m$, $m$Schulze$m$, $m$Sr. Strategic Account Executive$m$, 'marcus.schulze@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Vaterstetten, Germany$m$, 'https://linkedin.com/in/marcus-schulze-56551643', $m$LinkedIn AE lijst 05-11-2026$m$, 119, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marcus,

In your role as Sr. Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marcus,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marc$m$, $m$Senninger$m$, $m$Strategic Account Executive$m$, 'marc.senninger@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/marc-senninger', $m$LinkedIn AE lijst 05-11-2026$m$, 120, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marc,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marc,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stefan$m$, $m$Wandelt$m$, $m$Global Account Executive$m$, 'stefan.wandelt@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/stefan-wandelt', $m$LinkedIn AE lijst 05-11-2026$m$, 121, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stefan,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stefan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Roksana$m$, $m$Adam-Treiber$m$, $m$Services Account Executive$m$, 'roksana.adam@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/roksanaadam', $m$LinkedIn AE lijst 05-11-2026$m$, 122, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Roksana,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Roksana,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jens$m$, $m$Albert$m$, $m$Consulting Account Executive$m$, 'jens.albert@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paderborn, Germany$m$, 'https://linkedin.com/in/jens-albert-577b9386', $m$LinkedIn AE lijst 05-11-2026$m$, 123, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jens,

In your role as Consulting Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jens,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Blessing$m$, $m$Account Executive$m$, 'ablessing@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/alexander-blessing-a6748655', $m$LinkedIn AE lijst 05-11-2026$m$, 124, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Chantal$m$, $m$Boelkes$m$, $m$Account Executive$m$, 'chantal.boelkes@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/chantal-boelkes', $m$LinkedIn AE lijst 05-11-2026$m$, 125, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Chantal,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Chantal,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marc$m$, $m$Douchet$m$, $m$Services Sales Account Executive$m$, 'marc.douchet@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/marc-douchet-677a89139', $m$LinkedIn AE lijst 05-11-2026$m$, 126, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marc,

In your role as Services Sales Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marc,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Fanny$m$, $m$Dupont$m$, $m$Account Executive$m$, 'fanny.dupont@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/fanny-dupont-9b2a83b1', $m$LinkedIn AE lijst 05-11-2026$m$, 127, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Fanny,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Fanny,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anke$m$, $m$Eickmans$m$, $m$Account Executive$m$, 'ankeeickmans@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/anke-eickmans', $m$LinkedIn AE lijst 05-11-2026$m$, 128, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anke,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anke,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Henrike$m$, $m$Etzelmüller$m$, $m$Account Executive$m$, 'henrike.etzelmueller@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/henrikeetzelmueller', $m$LinkedIn AE lijst 05-11-2026$m$, 129, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Henrike,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Henrike,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Maximilian$m$, $m$Faure$m$, $m$Services Account Executive$m$, 'mfaure@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Lübeck, Germany$m$, 'https://linkedin.com/in/maximilian-faure', $m$LinkedIn AE lijst 05-11-2026$m$, 130, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Maximilian,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Maximilian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Niklas$m$, $m$Giersberg$m$, $m$Account Executive$m$, 'niklas.giersberg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/niklas-giersberg-41a361147', $m$LinkedIn AE lijst 05-11-2026$m$, 131, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Niklas,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Niklas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Maximilian$m$, $m$Haase$m$, $m$Services Account Executive$m$, 'maximilian.haase@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Starnberg, Germany$m$, 'https://linkedin.com/in/maximilian-haase', $m$LinkedIn AE lijst 05-11-2026$m$, 132, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Maximilian,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Maximilian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rebecca$m$, $m$Harding$m$, $m$Services Account Executive$m$, 'rharding@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/rebecca-harding-ab225a3', $m$LinkedIn AE lijst 05-11-2026$m$, 133, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rebecca,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rebecca,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sofie$m$, $m$Haslauer$m$, $m$Account Executive$m$, 'sofie.haslauer@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/sofiehaslauer', $m$LinkedIn AE lijst 05-11-2026$m$, 134, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sofie,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sofie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Daniel$m$, $m$Heckmann$m$, $m$Azure Account Executive$m$, 'daniel.heckmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/danielheckmann', $m$LinkedIn AE lijst 05-11-2026$m$, 135, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Daniel,

In your role as Azure Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Daniel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Heidler$m$, $m$Senior Account Executive$m$, 'aheidler@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/alexander-heidler-51a92a19', $m$LinkedIn AE lijst 05-11-2026$m$, 136, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Oliver$m$, $m$Hein$m$, $m$Senior Account Executive$m$, 'oliverhein@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Mülheim an der Ruhr, Germany$m$, 'https://linkedin.com/in/ohein', $m$LinkedIn AE lijst 05-11-2026$m$, 137, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Oliver,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Oliver,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Margarete$m$, $m$Herden$m$, $m$Sales Executive$m$, 'margarete.herden@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/margareteherden', $m$LinkedIn AE lijst 05-11-2026$m$, 138, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Margarete,

In your role as Sales Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Margarete,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Johanna$m$, $m$Hiemer$m$, $m$Senior Account Executive$m$, 'jhiemer@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/johanna-hiemer', $m$LinkedIn AE lijst 05-11-2026$m$, 139, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Johanna,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Johanna,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christoph$m$, $m$Hinger$m$, $m$Account Executive$m$, 'christoph.hinger@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Karlsruhe, Germany$m$, 'https://linkedin.com/in/christoph-hinger-6a5887164', $m$LinkedIn AE lijst 05-11-2026$m$, 140, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christoph,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christoph,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Moritz$m$, $m$Hirschberg$m$, $m$Commercial Executive$m$, 'mhirschberg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/moritz-hirschberg', $m$LinkedIn AE lijst 05-11-2026$m$, 141, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Moritz,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Moritz,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Irina$m$, $m$Huszar$m$, $m$Account Executive$m$, 'irina.huszar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/irinamayer', $m$LinkedIn AE lijst 05-11-2026$m$, 142, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Irina,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Irina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christoph$m$, $m$Häbel$m$, $m$Account Executive$m$, 'christoph.haebel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Buchholz (Aller), Germany$m$, 'https://linkedin.com/in/christoph-haebel', $m$LinkedIn AE lijst 05-11-2026$m$, 143, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christoph,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christoph,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katrin$m$, $m$Kirici$m$, $m$Account Executive$m$, 'katrin.volk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/katrin-kirici', $m$LinkedIn AE lijst 05-11-2026$m$, 144, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katrin,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katrin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$Klusmeier$m$, $m$Senior Account Executive$m$, 'michaelk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Braunschweig, Germany$m$, 'https://linkedin.com/in/michael-klusmeier-829a958b', $m$LinkedIn AE lijst 05-11-2026$m$, 145, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kristina$m$, $m$Knill$m$, $m$Senior Account Executive$m$, 'kristina.knill@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/kristina-knill', $m$LinkedIn AE lijst 05-11-2026$m$, 146, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kristina,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kristina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jan$m$, $m$Koch$m$, $m$Account Executive$m$, 'jankoch@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/jan-koch-microsoft', $m$LinkedIn AE lijst 05-11-2026$m$, 147, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jan,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$Koppmann$m$, $m$Senior Services Account Executive$m$, 'mkoppmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/michael-koppmann-03395138', $m$LinkedIn AE lijst 05-11-2026$m$, 148, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as Senior Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thomas$m$, $m$Korff$m$, $m$Service Account Executive$m$, 'thomas.korff@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/thomaskorff', $m$LinkedIn AE lijst 05-11-2026$m$, 149, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thomas,

In your role as Service Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thomas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stefan$m$, $m$Kubacki$m$, $m$Director Services Account Executive$m$, 'stefan.kubacki@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Mannheim, Germany$m$, 'https://linkedin.com/in/stefan-kubacki-53673285', $m$LinkedIn AE lijst 05-11-2026$m$, 150, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stefan,

In your role as Director Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stefan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Franka$m$, $m$Ledig$m$, $m$Account Executive$m$, 'frankahusch@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/frankahüsch', $m$LinkedIn AE lijst 05-11-2026$m$, 151, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Franka,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Franka,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Henrik$m$, $m$Leiste$m$, $m$Account Executive$m$, 'henrik.leiste@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/henrik-leiste', $m$LinkedIn AE lijst 05-11-2026$m$, 152, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Henrik,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Henrik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pia$m$, $m$Neudecker$m$, $m$Client Executive$m$, 'pia@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/piajenderek', $m$LinkedIn AE lijst 05-11-2026$m$, 153, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pia,

In your role as Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ilker$m$, $m$Ozyavuz$m$, $m$Account Executive$m$, 'ilker.ozyavuz@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/ilker-ozyavuz-30329647', $m$LinkedIn AE lijst 05-11-2026$m$, 154, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ilker,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ilker,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Uwe$m$, $m$Pabst$m$, $m$Account Executive$m$, 'uwepabst@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/uwe-pabst', $m$LinkedIn AE lijst 05-11-2026$m$, 155, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Uwe,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Uwe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ole$m$, $m$Paulsen$m$, $m$Senior Account Executive$m$, 'olepaulsen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/ole-paulsen', $m$LinkedIn AE lijst 05-11-2026$m$, 156, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ole,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ole,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ralf$m$, $m$Pinsdorf$m$, $m$Senior Account Executive$m$, 'ralf.pinsdorf@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/ralf-pinsdorf-58866b166', $m$LinkedIn AE lijst 05-11-2026$m$, 157, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ralf,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ralf,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thomas$m$, $m$Piontek$m$, $m$Account Delivery Executive$m$, 'thomas.piontek@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/tpiontek', $m$LinkedIn AE lijst 05-11-2026$m$, 158, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thomas,

In your role as Account Delivery Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thomas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christopher$m$, $m$Schaal$m$, $m$Commercial Executive$m$, 'cschaal@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/chschaal', $m$LinkedIn AE lijst 05-11-2026$m$, 159, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christopher,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christopher,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Richard$m$, $m$Schmid$m$, $m$Account Executive$m$, 'richard.schmid@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/rischmid', $m$LinkedIn AE lijst 05-11-2026$m$, 160, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Richard,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Richard,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lars$m$, $m$Schneider$m$, $m$Account Executive$m$, 'lars.schneider@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/schneiderlars', $m$LinkedIn AE lijst 05-11-2026$m$, 161, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lars,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lars,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Henrik$m$, $m$Schwetje$m$, $m$Senior Account Executive$m$, 'hschwetje@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/henrik-schwetje', $m$LinkedIn AE lijst 05-11-2026$m$, 162, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Henrik,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Henrik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sebastian$m$, $m$Senger$m$, $m$Account Executive$m$, 'sebastian.senger@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/sebastian-senger-24a059205', $m$LinkedIn AE lijst 05-11-2026$m$, 163, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sebastian,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sebastian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Sprick$m$, $m$Account Executive$m$, 'asprick@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Rhein-Neckar-Kreis, Germany$m$, 'https://linkedin.com/in/alexander-sprick-57b838204', $m$LinkedIn AE lijst 05-11-2026$m$, 164, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$Stankowiak$m$, $m$Account Executive$m$, 'michael.stankowiak@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Düsseldorf, Germany$m$, 'https://linkedin.com/in/michael-stankowiak-b7528142', $m$LinkedIn AE lijst 05-11-2026$m$, 165, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nathalie$m$, $m$Theisen$m$, $m$Account Executive$m$, 'nathalie.theisen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/nathalie-theisen', $m$LinkedIn AE lijst 05-11-2026$m$, 166, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nathalie,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nathalie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Yannick$m$, $m$Thomas$m$, $m$Account Executive$m$, 'yannick.thomas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/yannick-thomas-48a1171b6', $m$LinkedIn AE lijst 05-11-2026$m$, 167, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Yannick,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Yannick,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rosi$m$, $m$von Platen$m$, $m$Account Executive$m$, 'rosi.von.platen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/rosiv', $m$LinkedIn AE lijst 05-11-2026$m$, 168, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rosi,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rosi,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marlene$m$, $m$Willersinn$m$, $m$Account Executive$m$, 'marlene.willersinn@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/marlenewillersinn', $m$LinkedIn AE lijst 05-11-2026$m$, 169, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marlene,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marlene,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rasmus$m$, $m$Burvall$m$, $m$Enterprise Account Executive$m$, 'rburvall@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/rasmusburvall', $m$LinkedIn AE lijst 05-11-2026$m$, 170, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rasmus,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rasmus,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kevin$m$, $m$Golestan$m$, $m$Enterprise Account Executive$m$, 'kevin.golestan@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Göteborg, Sweden$m$, 'https://linkedin.com/in/kevingolestan', $m$LinkedIn AE lijst 05-11-2026$m$, 171, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kevin,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kevin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nina Simone$m$, $m$Gunneng$m$, $m$Strategic Account Executive$m$, 'ninagunneng@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Norway$m$, 'https://linkedin.com/in/ninasimonegunneng', $m$LinkedIn AE lijst 05-11-2026$m$, 172, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nina Simone,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nina Simone,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Callum$m$, $m$Gwynne$m$, $m$Strategic Enterprise Account Executive$m$, 'callum.gwynne@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/cagwynne', $m$LinkedIn AE lijst 05-11-2026$m$, 173, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Callum,

In your role as Strategic Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Callum,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lukkas$m$, $m$Hamann$m$, $m$Strategic Account Executive$m$, 'lukkashamann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/lukkashamann', $m$LinkedIn AE lijst 05-11-2026$m$, 174, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lukkas,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lukkas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Hennig Westöö$m$, $m$Senior Enterprise Account Executive$m$, 'ahennig@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Uppsala, Sweden$m$, 'https://linkedin.com/in/alexander-hennig-westöö-601742a3', $m$LinkedIn AE lijst 05-11-2026$m$, 175, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Senior Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Märta$m$, $m$Hermelin Dahl$m$, $m$Strategic Account Executive$m$, 'martah@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/märta-hermelin-dahl-8a659a2', $m$LinkedIn AE lijst 05-11-2026$m$, 176, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Märta,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Märta,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Linn Katrine$m$, $m$Høie$m$, $m$Strategic Account Executive$m$, 'lhoie@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Norway$m$, 'https://linkedin.com/in/linn-katrine-høie-60a1502', $m$LinkedIn AE lijst 05-11-2026$m$, 177, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Linn Katrine,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Linn Katrine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Inge-André$m$, $m$Krokvik$m$, $m$Enterprise Account Executive$m$, 'ikrokvik@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/krokvik', $m$LinkedIn AE lijst 05-11-2026$m$, 178, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Inge-André,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Inge-André,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Charlotte$m$, $m$Ruhne$m$, $m$Strategic Account Executive$m$, 'charlotte.ruhne@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/charlotte-ruhne', $m$LinkedIn AE lijst 05-11-2026$m$, 179, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Charlotte,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Charlotte,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pepijn$m$, $m$van den Brink$m$, $m$Enterprise Account Executive$m$, 'pvandenbrink@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/pepijnvandenbrink', $m$LinkedIn AE lijst 05-11-2026$m$, 180, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pepijn,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pepijn,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Annica$m$, $m$Wallenbro Stojcevski$m$, $m$Strategic Account Executive$m$, 'annica.stojcevski@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/annicastojcevski', $m$LinkedIn AE lijst 05-11-2026$m$, 181, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Annica,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Annica,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ylva$m$, $m$Ahlqvist$m$, $m$Account Executive$m$, 'ylvaahlqvist@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/ylva-ahlqvist', $m$LinkedIn AE lijst 05-11-2026$m$, 182, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ylva,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ylva,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mattias$m$, $m$Atelius$m$, $m$Services Account Executive$m$, 'mattias.atelius@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Göteborg, Sweden$m$, 'https://linkedin.com/in/mattiasatelius', $m$LinkedIn AE lijst 05-11-2026$m$, 183, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mattias,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mattias,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Andreas$m$, $m$Blomqvist$m$, $m$Sr Account Executive$m$, 'ablomqvist@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Kalmar, Sweden$m$, 'https://linkedin.com/in/andreasblomqvistmicrosoft', $m$LinkedIn AE lijst 05-11-2026$m$, 184, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Andreas,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Andreas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Oona$m$, $m$Dahlin$m$, $m$Account Executive$m$, 'oona.dahlin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/oonadahlin', $m$LinkedIn AE lijst 05-11-2026$m$, 185, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Oona,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Oona,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hans$m$, $m$Dolk$m$, $m$Senior Account Executive$m$, 'hans.dolk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/hansdolk', $m$LinkedIn AE lijst 05-11-2026$m$, 186, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hans,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hans,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kimmo$m$, $m$Ekholm$m$, $m$Account Executive$m$, 'kimmo.ekholm@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Vantaa, Finland$m$, 'https://linkedin.com/in/kimmoekholm', $m$LinkedIn AE lijst 05-11-2026$m$, 187, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kimmo,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kimmo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hanne-Regine$m$, $m$Epland-Rosvold$m$, $m$Services Account Executive$m$, 'hvermedal@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/hanne-regine-epland-rosvold-17314528', $m$LinkedIn AE lijst 05-11-2026$m$, 188, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hanne-Regine,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hanne-Regine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Robert$m$, $m$Eriksson$m$, $m$Account Executive$m$, 'beriksson@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/robert-eriksson-0b749456', $m$LinkedIn AE lijst 05-11-2026$m$, 189, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Robert,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Robert,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jasmin$m$, $m$Gadimzadeh$m$, $m$Services Account Executive$m$, 'jgadimzadeh@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/jasmin-gadimzadeh-023a30102', $m$LinkedIn AE lijst 05-11-2026$m$, 190, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jasmin,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jasmin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katherina$m$, $m$Hansen$m$, $m$Account Executive$m$, 'hansen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/katherinahansen', $m$LinkedIn AE lijst 05-11-2026$m$, 191, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katherina,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katherina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Zenia$m$, $m$Harpsøe$m$, $m$Account Executive$m$, 'zeniaharpsoe@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/zeniaharpsoee', $m$LinkedIn AE lijst 05-11-2026$m$, 192, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Zenia,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Zenia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mette$m$, $m$Heegaard Thorhauge$m$, $m$Senior Executive$m$, 'mette.thorhauge@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/mette-heegaard-thorhauge-50937029', $m$LinkedIn AE lijst 05-11-2026$m$, 193, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mette,

In your role as Senior Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mette,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kristian$m$, $m$Herbert$m$, $m$Senior Account Executive$m$, 'kherbert@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/kristianherbert', $m$LinkedIn AE lijst 05-11-2026$m$, 194, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kristian,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kristian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ari$m$, $m$Hevosmaa$m$, $m$Account Executive$m$, 'ari.hevosmaa@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Finland$m$, 'https://linkedin.com/in/arihevosmaa', $m$LinkedIn AE lijst 05-11-2026$m$, 195, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ari,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ari,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anne$m$, $m$Hjulmann$m$, $m$Account Executive$m$, 'annehjulmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Aalborg, Denmark$m$, 'https://linkedin.com/in/annehjulmann', $m$LinkedIn AE lijst 05-11-2026$m$, 196, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anne,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anne,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Signe$m$, $m$Holm Andersen$m$, $m$Account Executive$m$, 'sandersen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/signe-holm-andersen-05825a3b', $m$LinkedIn AE lijst 05-11-2026$m$, 197, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Signe,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Signe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hege Cecilie$m$, $m$Knain$m$, $m$Services Account Executive$m$, 'hegekn@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/hege-cecilie-knain-4062021', $m$LinkedIn AE lijst 05-11-2026$m$, 198, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hege Cecilie,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hege Cecilie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Erica$m$, $m$Kulas Ek$m$, $m$Senior Account Executive$m$, 'erica@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/ericakulas', $m$LinkedIn AE lijst 05-11-2026$m$, 199, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Erica,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Erica,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Emma Kristine$m$, $m$Laigaard Jensen$m$, $m$Account Executive$m$, 'emjensen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/emma-kristine-laigaard-jensen-43205a11b', $m$LinkedIn AE lijst 05-11-2026$m$, 200, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Emma Kristine,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Emma Kristine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Petteri$m$, $m$Lehtinen$m$, $m$Senior Account Executive$m$, 'petteri.lehtinen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Turku, Finland$m$, 'https://linkedin.com/in/petteri-lehtinen', $m$LinkedIn AE lijst 05-11-2026$m$, 201, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Petteri,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Petteri,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Emma$m$, $m$Lehtonen$m$, $m$Sr. Account Executive$m$, 'emmalehtonen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Espoo, Finland$m$, 'https://linkedin.com/in/emma-lehtonen-', $m$LinkedIn AE lijst 05-11-2026$m$, 202, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Emma,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Emma,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katja$m$, $m$Maanonen$m$, $m$Sr. Account Executive$m$, 'kmaanonen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Espoo, Finland$m$, 'https://linkedin.com/in/katja-maanonen-a855313', $m$LinkedIn AE lijst 05-11-2026$m$, 203, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katja,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katja,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Heli$m$, $m$Miettinen$m$, $m$Sr. Account Executive$m$, 'heli.miettinen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Espoo, Finland$m$, 'https://linkedin.com/in/heli-miettinen-3646836', $m$LinkedIn AE lijst 05-11-2026$m$, 204, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Heli,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Heli,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Helena$m$, $m$Mischel$m$, $m$Client Executive$m$, 'helena.mischel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/helenamischel', $m$LinkedIn AE lijst 05-11-2026$m$, 205, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Helena,

In your role as Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Helena,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Morten$m$, $m$Naess$m$, $m$Services Account Executive$m$, 'morten.naess@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/morten-naess-a36149', $m$LinkedIn AE lijst 05-11-2026$m$, 206, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Morten,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Morten,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kirsi$m$, $m$Pallonen$m$, $m$Senior Account Executive$m$, 'kirsi.pallonen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/kirsi-pallonen', $m$LinkedIn AE lijst 05-11-2026$m$, 207, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kirsi,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kirsi,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nicklas$m$, $m$Panzio$m$, $m$Account Executive$m$, 'npanzio@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/nicklas-panzio', $m$LinkedIn AE lijst 05-11-2026$m$, 208, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nicklas,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nicklas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Aslak$m$, $m$Puroila$m$, $m$Sr. Services Account Executive$m$, 'aslak.puroila@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/aslakpuroila', $m$LinkedIn AE lijst 05-11-2026$m$, 209, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Aslak,

In your role as Sr. Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Aslak,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jussi$m$, $m$Pykäläinen$m$, $m$Sr. Account Executive$m$, 'jussi.pykalainen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Espoo, Finland$m$, 'https://linkedin.com/in/jpykalainen', $m$LinkedIn AE lijst 05-11-2026$m$, 210, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jussi,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jussi,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ebba$m$, $m$Rading Heyman$m$, $m$Account Executive$m$, 'ebba.rading@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Lund, Sweden$m$, 'https://linkedin.com/in/ebbaradingheyman', $m$LinkedIn AE lijst 05-11-2026$m$, 211, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ebba,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ebba,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ali$m$, $m$Rahnama$m$, $m$Services Account Executive$m$, 'ali.rahnama@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/alirahnama', $m$LinkedIn AE lijst 05-11-2026$m$, 212, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ali,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ali,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Angeliqua$m$, $m$Ramming Gaden$m$, $m$Sr Account Executive$m$, 'angeliquar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Asker, Norway$m$, 'https://linkedin.com/in/angeliquar', $m$LinkedIn AE lijst 05-11-2026$m$, 213, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Angeliqua,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Angeliqua,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Svein$m$, $m$Risberget$m$, $m$Sr Account Executive$m$, 'svein.risberget@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/svein-risberget-202a4125', $m$LinkedIn AE lijst 05-11-2026$m$, 214, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Svein,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Svein,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Björn$m$, $m$Rosen$m$, $m$Services Account Executive$m$, 'bjornros@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/björn-rosen-49257410', $m$LinkedIn AE lijst 05-11-2026$m$, 215, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Björn,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Björn,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Juha$m$, $m$Salmi$m$, $m$Senior Account Executive$m$, 'juha.salmi@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Finland$m$, 'https://linkedin.com/in/juha-salmi', $m$LinkedIn AE lijst 05-11-2026$m$, 216, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Juha,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Juha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jarno$m$, $m$Salonen$m$, $m$Sr. Account Executive$m$, 'jarno.salonen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/jarno-salonen', $m$LinkedIn AE lijst 05-11-2026$m$, 217, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jarno,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jarno,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lene$m$, $m$Stone$m$, $m$Account Executive$m$, 'lene.stone@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/lene-stone-a11b89', $m$LinkedIn AE lijst 05-11-2026$m$, 218, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lene,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lene,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Krister$m$, $m$Sundquist$m$, $m$Senior Account Executive$m$, 'krister.sundquist@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stockholm, Sweden$m$, 'https://linkedin.com/in/kristersundquist', $m$LinkedIn AE lijst 05-11-2026$m$, 219, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Krister,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Krister,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Peter$m$, $m$Urbak$m$, $m$Account Executive$m$, 'peterurbak@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Denmark$m$, 'https://linkedin.com/in/peter-urbak-9b403759', $m$LinkedIn AE lijst 05-11-2026$m$, 220, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Peter,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Peter,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Matilda$m$, $m$Varvne$m$, $m$Account Executive$m$, 'mvarvne@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/matilda-varvne-a22202159', $m$LinkedIn AE lijst 05-11-2026$m$, 221, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Matilda,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Matilda,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Freja$m$, $m$Vulff$m$, $m$Senior Services Account Executive$m$, 'frejavulff@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/freja-vulff', $m$LinkedIn AE lijst 05-11-2026$m$, 222, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Freja,

In your role as Senior Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Freja,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thomas$m$, $m$Witte Pedersen$m$, $m$Sr. Account Executive$m$, 'thomas.pedersen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Solrød Strand, Denmark$m$, 'https://linkedin.com/in/thomas-witte-pedersen-38188936', $m$LinkedIn AE lijst 05-11-2026$m$, 223, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thomas,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thomas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Harriet$m$, $m$Wright$m$, $m$Account Executive$m$, 'hwright@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/harrietjenniferwright', $m$LinkedIn AE lijst 05-11-2026$m$, 224, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Harriet,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Harriet,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sindre$m$, $m$Østengen$m$, $m$Account Executive$m$, 'sostengen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/sindre-ostengen', $m$LinkedIn AE lijst 05-11-2026$m$, 225, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sindre,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sindre,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Steven$m$, $m$Abbruzzese$m$, $m$Strategic Client Executive$m$, 'stevena@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/steven-abbruzzese', $m$LinkedIn AE lijst 05-11-2026$m$, 226, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Steven,

In your role as Strategic Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Steven,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Georgie$m$, $m$Butler$m$, $m$Enterprise Account Executive$m$, 'bbutler@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/georgie-butler-49028710b', $m$LinkedIn AE lijst 05-11-2026$m$, 227, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Georgie,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Georgie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Carrie-Anne$m$, $m$Cremin$m$, $m$Strategic Account Executive$m$, 'carrieanne.cremin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/ccremin', $m$LinkedIn AE lijst 05-11-2026$m$, 228, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Carrie-Anne,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Carrie-Anne,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jay$m$, $m$Crofton$m$, $m$Enterprise Account Executive$m$, 'jay.crofton@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/jaycrofton', $m$LinkedIn AE lijst 05-11-2026$m$, 229, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jay,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jay,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$James$m$, $m$Dellamura$m$, $m$Enterprise Account Executive$m$, 'james.dellamura@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Southampton, United Kingdom$m$, 'https://linkedin.com/in/jamesdellamura', $m$LinkedIn AE lijst 05-11-2026$m$, 230, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi James,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi James,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rob$m$, $m$Denham$m$, $m$Strategic Services Account Executive$m$, 'rodenham@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Edinburgh, United Kingdom$m$, 'https://linkedin.com/in/robdenham', $m$LinkedIn AE lijst 05-11-2026$m$, 231, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rob,

In your role as Strategic Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rob,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marta$m$, $m$Goulson$m$, $m$Strategic Account Executive$m$, 'martagoulson@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/marta-goulson-18b903117', $m$LinkedIn AE lijst 05-11-2026$m$, 232, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marta,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marta,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lizzie$m$, $m$Greenway$m$, $m$Enterprise Account Executive$m$, 'lizzieg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/lizzie-greenway-8971195b', $m$LinkedIn AE lijst 05-11-2026$m$, 233, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lizzie,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lizzie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nicole$m$, $m$Gujer$m$, $m$Enterprise Account Executive$m$, 'nicole.gujer@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/nicolegujer', $m$LinkedIn AE lijst 05-11-2026$m$, 234, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nicole,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nicole,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alastair$m$, $m$Holmes$m$, $m$Global Strategic Account Executive$m$, 'alastair.holmes@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/alastair-holmes-bba2b959', $m$LinkedIn AE lijst 05-11-2026$m$, 235, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alastair,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alastair,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jade$m$, $m$Lockwood$m$, $m$Enterprise Account Executive$m$, 'jade.lockwood@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/jade-lockwood', $m$LinkedIn AE lijst 05-11-2026$m$, 236, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jade,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jade,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rebecca$m$, $m$Moore$m$, $m$Strategic Account Executive$m$, 'rebecca.moore@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/rebecca-moore-77132761', $m$LinkedIn AE lijst 05-11-2026$m$, 237, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rebecca,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rebecca,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Inonge$m$, $m$Mutonga$m$, $m$Strategic Account Executive$m$, 't-imutonga@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Brighton, United Kingdom$m$, 'https://linkedin.com/in/inonge-mutonga-7a208b254', $m$LinkedIn AE lijst 05-11-2026$m$, 238, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Inonge,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Inonge,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joanna$m$, $m$Noori$m$, $m$HSBC Strategic Account Executive$m$, 'joannanoori@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Fareham, United Kingdom$m$, 'https://linkedin.com/in/joanna-noori-b4197434', $m$LinkedIn AE lijst 05-11-2026$m$, 239, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joanna,

In your role as HSBC Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joanna,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sorcha$m$, $m$O'Neill$m$, $m$Strategic Account Executive$m$, 'sorchaoneill@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/sorchaoneill-90', $m$LinkedIn AE lijst 05-11-2026$m$, 240, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sorcha,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sorcha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hannah$m$, $m$Owen$m$, $m$Strategic Account Executive$m$, 'hannah.owen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/hannahowen', $m$LinkedIn AE lijst 05-11-2026$m$, 241, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hannah,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hannah,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mish$m$, $m$Patel$m$, $m$Enterprise Account Executive$m$, 'mishpatel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Harpenden, United Kingdom$m$, 'https://linkedin.com/in/mish-patel-56335738', $m$LinkedIn AE lijst 05-11-2026$m$, 242, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mish,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mish,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rory$m$, $m$Quinn$m$, $m$Global Strategic Account Executive$m$, 'quinn.rory@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/roryquinn', $m$LinkedIn AE lijst 05-11-2026$m$, 243, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rory,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rory,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Will$m$, $m$Rowley$m$, $m$Strategic Account Executive$m$, 'will.rowley@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Bath, United Kingdom$m$, 'https://linkedin.com/in/willrowley', $m$LinkedIn AE lijst 05-11-2026$m$, 244, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Will,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Will,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ricky$m$, $m$Sangha$m$, $m$Strategic Account Executive$m$, 'rickysangha@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Southampton, United Kingdom$m$, 'https://linkedin.com/in/ricky-sangha', $m$LinkedIn AE lijst 05-11-2026$m$, 245, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ricky,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ricky,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Leo$m$, $m$Seus$m$, $m$Enterprise Account Executive$m$, 'leoseus@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/leo-seus-72a40a189', $m$LinkedIn AE lijst 05-11-2026$m$, 246, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Leo,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Leo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Issy$m$, $m$Stewart$m$, $m$Senior Enterprise Account Executive$m$, 'issystewart@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/issy-stewart-108969123', $m$LinkedIn AE lijst 05-11-2026$m$, 247, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Issy,

In your role as Senior Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Issy,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ben$m$, $m$Wakelin$m$, $m$Strategic Account Executive$m$, 'benwakelin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/ben-wakelin', $m$LinkedIn AE lijst 05-11-2026$m$, 248, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ben,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ben,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joe$m$, $m$Waters$m$, $m$Strategic Account Executive$m$, 'joewaters@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/joewaters1998', $m$LinkedIn AE lijst 05-11-2026$m$, 249, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joe,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Shannon$m$, $m$Alexander$m$, $m$Account Executive$m$, 'shannon.alexander@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Edinburgh, United Kingdom$m$, 'https://linkedin.com/in/shannonalexander1', $m$LinkedIn AE lijst 05-11-2026$m$, 250, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Shannon,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Shannon,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Victoria$m$, $m$Atata$m$, $m$Account Executive$m$, 't-vatata@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/victoria-atata', $m$LinkedIn AE lijst 05-11-2026$m$, 251, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Victoria,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Victoria,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Shasha$m$, $m$Backi$m$, $m$Account Executive$m$, 'backi@google.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/shasha-backi-560218119', $m$LinkedIn AE lijst 05-11-2026$m$, 252, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Shasha,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Shasha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Oliver$m$, $m$Barrett$m$, $m$Account Executive$m$, 'oliver.barrett@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Bradford, United Kingdom$m$, 'https://linkedin.com/in/oliverbarrett', $m$LinkedIn AE lijst 05-11-2026$m$, 253, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Oliver,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Oliver,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Natasha$m$, $m$Bhuiyan$m$, $m$Account Executive$m$, 'nbhuiyan@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/natasha-bhuiyan-microsoft', $m$LinkedIn AE lijst 05-11-2026$m$, 254, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Natasha,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Natasha,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kim$m$, $m$Boardman$m$, $m$Services Account Executive$m$, 'kimboardman@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Calne, United Kingdom$m$, 'https://linkedin.com/in/kim-boardman-0793416', $m$LinkedIn AE lijst 05-11-2026$m$, 255, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kim,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kim,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Harvey$m$, $m$Brown$m$, $m$Services Account Executive$m$, 'harveybrown@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/harvey-brown-ab956b214', $m$LinkedIn AE lijst 05-11-2026$m$, 256, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Harvey,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Harvey,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Paul$m$, $m$Bulmer$m$, $m$Senior Account Executive$m$, 'paulbulmer@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Cardiff, United Kingdom$m$, 'https://linkedin.com/in/npaulbulmer', $m$LinkedIn AE lijst 05-11-2026$m$, 257, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Paul,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Paul,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nick$m$, $m$Burke$m$, $m$Healthcare Account Executive$m$, 'nickburke@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/nick-burke-ba6bb7108', $m$LinkedIn AE lijst 05-11-2026$m$, 258, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nick,

In your role as Healthcare Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nick,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kirstie$m$, $m$Collier$m$, $m$Account Executive$m$, 'kirstie.collier@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/kirstiecollier', $m$LinkedIn AE lijst 05-11-2026$m$, 259, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kirstie,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kirstie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rachel$m$, $m$Collings$m$, $m$Senior Account Executive$m$, 'rcollings@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Bury, United Kingdom$m$, 'https://linkedin.com/in/rachel-collings', $m$LinkedIn AE lijst 05-11-2026$m$, 260, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rachel,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rachel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pia$m$, $m$Corneloues$m$, $m$Account Executive$m$, 'pia.corneloues@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/pia-corneloues', $m$LinkedIn AE lijst 05-11-2026$m$, 261, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pia,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Krystin$m$, $m$D'Agostino$m$, $m$Account Executive$m$, 'kdagostino@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/krystindagostino', $m$LinkedIn AE lijst 05-11-2026$m$, 262, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Krystin,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Krystin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kerry$m$, $m$Davis$m$, $m$Services Account Executive$m$, 'kerry.davis@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/kerry-davis-5999b7100', $m$LinkedIn AE lijst 05-11-2026$m$, 263, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kerry,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kerry,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rajindu$m$, $m$De Silva$m$, $m$Healthcare Account Executive$m$, 'rajdesilva@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/rajindu-de-silva', $m$LinkedIn AE lijst 05-11-2026$m$, 264, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rajindu,

In your role as Healthcare Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rajindu,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jubril$m$, $m$Dudu$m$, $m$Services Account Executive$m$, 'jubrildudu@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/jubril-dudu-80524536', $m$LinkedIn AE lijst 05-11-2026$m$, 265, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jubril,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jubril,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$David$m$, $m$Edwards$m$, $m$Senior Account Executive$m$, 'david@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/davidedwardsemea', $m$LinkedIn AE lijst 05-11-2026$m$, 266, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi David,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi David,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Beth$m$, $m$Elliott$m$, $m$Account Executive$m$, 'bethelliott@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/bethwilliams12', $m$LinkedIn AE lijst 05-11-2026$m$, 267, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Beth,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Beth,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$Fair$m$, $m$Account Executive$m$, 'michaelfair@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/michael-fair-b5ba983b', $m$LinkedIn AE lijst 05-11-2026$m$, 268, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ian$m$, $m$Forrest$m$, $m$Senior Account Executive$m$, 'ianforrest@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/ianmforrest', $m$LinkedIn AE lijst 05-11-2026$m$, 269, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ian,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$James$m$, $m$Fulton$m$, $m$Senior Account Executive$m$, 'jamesfulton@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/jwfulton', $m$LinkedIn AE lijst 05-11-2026$m$, 270, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi James,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi James,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Michael$m$, $m$Gadsden$m$, $m$Senior Account Executive$m$, 'mgadsden@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/mrmichaelgadsden', $m$LinkedIn AE lijst 05-11-2026$m$, 271, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Michael,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Michael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hannah$m$, $m$Garland$m$, $m$Services Account Executive$m$, 'hagarland@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Maidenhead, United Kingdom$m$, 'https://linkedin.com/in/hannah-garland-90727714a', $m$LinkedIn AE lijst 05-11-2026$m$, 272, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hannah,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hannah,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Matthew$m$, $m$Garner$m$, $m$Account Executive$m$, 'mgarner@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/matthew-garner-ai', $m$LinkedIn AE lijst 05-11-2026$m$, 273, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Matthew,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Matthew,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mike$m$, $m$Haigh$m$, $m$Microsoft Senior Account Executive$m$, 'mikehaigh@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/mike-haigh-068a0112', $m$LinkedIn AE lijst 05-11-2026$m$, 274, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mike,

In your role as Microsoft Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mike,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ruby$m$, $m$Hamilton$m$, $m$Services Account Executive$m$, 'rhamilton@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Dover, United Kingdom$m$, 'https://linkedin.com/in/rubyhamilton', $m$LinkedIn AE lijst 05-11-2026$m$, 275, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ruby,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ruby,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Clint$m$, $m$Jenden$m$, $m$Sr Account Executive$m$, 'cjenden@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/clint-jenden-517664', $m$LinkedIn AE lijst 05-11-2026$m$, 276, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Clint,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Clint,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Reka$m$, $m$Jenkins$m$, $m$Account Executive$m$, 'rjenkins@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Stratford-upon-Avon, United Kingdom$m$, 'https://linkedin.com/in/reka-jenkins-2a398626', $m$LinkedIn AE lijst 05-11-2026$m$, 277, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Reka,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Reka,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nathan$m$, $m$Johnson$m$, $m$Account Executive$m$, 'johnsonn@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/nathanjohnson45', $m$LinkedIn AE lijst 05-11-2026$m$, 278, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nathan,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nathan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Andy$m$, $m$Kellett$m$, $m$Senior Services Account Executive$m$, 'andke@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Warrington, United Kingdom$m$, 'https://linkedin.com/in/andy-kellett-605a6330', $m$LinkedIn AE lijst 05-11-2026$m$, 279, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Andy,

In your role as Senior Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Andy,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$George$m$, $m$Kershaw$m$, $m$Services Account Executive$m$, 'gkershaw@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hemel Hempstead, United Kingdom$m$, 'https://linkedin.com/in/georgekershaw93', $m$LinkedIn AE lijst 05-11-2026$m$, 280, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi George,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi George,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Justine$m$, $m$Kharbanda$m$, $m$Account Executive$m$, 'justine.kharbanda@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/justine-kharbanda-106b4a37', $m$LinkedIn AE lijst 05-11-2026$m$, 281, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Justine,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Justine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Su$m$, $m$Kumari$m$, $m$Snr Account Executive$m$, 'skumari@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Cheltenham, United Kingdom$m$, 'https://linkedin.com/in/su-kumari-6860741a', $m$LinkedIn AE lijst 05-11-2026$m$, 282, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Su,

In your role as Snr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Su,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Edward$m$, $m$Large$m$, $m$Account Executive$m$, 'edward.large@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/edward-large-9b171b83', $m$LinkedIn AE lijst 05-11-2026$m$, 283, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Edward,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Edward,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Emily$m$, $m$Large$m$, $m$Account Executive$m$, 'emlarge@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/emily-large', $m$LinkedIn AE lijst 05-11-2026$m$, 284, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Emily,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Emily,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Blair$m$, $m$Lochrie$m$, $m$Senior Account Executive$m$, 'blair.lochrie@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Edinburgh, United Kingdom$m$, 'https://linkedin.com/in/blairlochrie', $m$LinkedIn AE lijst 05-11-2026$m$, 285, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Blair,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Blair,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Georgia$m$, $m$Low$m$, $m$Services Account Executive$m$, 'georgialow@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/georgia-low', $m$LinkedIn AE lijst 05-11-2026$m$, 286, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Georgia,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Georgia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Steve$m$, $m$Mahoney$m$, $m$Senior Services Account Executive$m$, 'smahoney@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/steve-mahoney-', $m$LinkedIn AE lijst 05-11-2026$m$, 287, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Steve,

In your role as Senior Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Steve,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Danielle$m$, $m$Maxwell$m$, $m$Banking Account Executive$m$, 'danielle.maxwell@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/danielle-o-a-maxwell', $m$LinkedIn AE lijst 05-11-2026$m$, 288, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Danielle,

In your role as Banking Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Danielle,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ian$m$, $m$McFarlane$m$, $m$Services Account Executive$m$, 'ian.mcfarlane@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$South Shields, United Kingdom$m$, 'https://linkedin.com/in/ian-mcfarlane-1b91a317', $m$LinkedIn AE lijst 05-11-2026$m$, 289, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ian,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Elizabeth$m$, $m$Melville$m$, $m$Account Executive$m$, 'elizabeth.melville@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Henley on Thames, United Kingdom$m$, 'https://linkedin.com/in/elizabeth-melville-184292151', $m$LinkedIn AE lijst 05-11-2026$m$, 290, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Elizabeth,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Elizabeth,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Fardos$m$, $m$Mohsin$m$, $m$Account Delivery Executive$m$, 'fardos.mohsin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Glasgow, United Kingdom$m$, 'https://linkedin.com/in/fardos-mohsin-a289a032', $m$LinkedIn AE lijst 05-11-2026$m$, 291, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Fardos,

In your role as Account Delivery Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Fardos,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ed$m$, $m$Morris$m$, $m$Sr Account Executive$m$, 'e_morris@itsaboutme.in', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/ed-morris-02a5a525', $m$LinkedIn AE lijst 05-11-2026$m$, 292, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ed,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ed,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Steven$m$, $m$Mullaghan$m$, $m$Sr. Account Executive$m$, 'stmul@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/stevenmullaghan', $m$LinkedIn AE lijst 05-11-2026$m$, 293, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Steven,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Steven,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Zoe$m$, $m$Nichols$m$, $m$Account Executive$m$, 'zoe.nichols@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/zoe-nichols-a95463121', $m$LinkedIn AE lijst 05-11-2026$m$, 294, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Zoe,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Zoe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Guldeniz$m$, $m$Niemeyer$m$, $m$Senior Account Executive$m$, 'gdicel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/guldenizdicel', $m$LinkedIn AE lijst 05-11-2026$m$, 295, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Guldeniz,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Guldeniz,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rob$m$, $m$Orwin$m$, $m$Account Executive$m$, 'rorwin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/roborwin', $m$LinkedIn AE lijst 05-11-2026$m$, 296, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rob,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rob,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Tina$m$, $m$Owen$m$, $m$Account Executive$m$, 'tinaowen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/tina-owen-69a239161', $m$LinkedIn AE lijst 05-11-2026$m$, 297, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Tina,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Tina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Georgie$m$, $m$Patel$m$, $m$Services Account Executive$m$, 'gepatel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/georgiepatel', $m$LinkedIn AE lijst 05-11-2026$m$, 298, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Georgie,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Georgie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Tom$m$, $m$Price$m$, $m$Account Executive$m$, 'thomas.price@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/tprice23', $m$LinkedIn AE lijst 05-11-2026$m$, 299, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Tom,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Tom,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dan$m$, $m$Reardon$m$, $m$Senior Account Executive$m$, 'dreardon@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/dareardon', $m$LinkedIn AE lijst 05-11-2026$m$, 300, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dan,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hibaag$m$, $m$Rooble$m$, $m$Account Executive$m$, 'hibaagrooble@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/hibaag-rooble', $m$LinkedIn AE lijst 05-11-2026$m$, 301, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hibaag,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hibaag,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hannah$m$, $m$Rowlands$m$, $m$Account Executive$m$, 'hannah.rowlands@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/hannah-rowlands', $m$LinkedIn AE lijst 05-11-2026$m$, 302, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hannah,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hannah,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Amaan$m$, $m$Shaikh$m$, $m$Internal Account Executive$m$, 'shaikha@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/amaan-shaikh-503324349', $m$LinkedIn AE lijst 05-11-2026$m$, 303, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Amaan,

In your role as Internal Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Amaan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nao$m$, $m$Shibanoki$m$, $m$Account Executive$m$, 'naoshibanoki@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/nao-shibanoki', $m$LinkedIn AE lijst 05-11-2026$m$, 304, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nao,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nao,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Aaron$m$, $m$Singh$m$, $m$Account Executive$m$, 'asingh@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/aaron-singh-microsoft-hq', $m$LinkedIn AE lijst 05-11-2026$m$, 305, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Aaron,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Aaron,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jonathan$m$, $m$Smith$m$, $m$Account Executive$m$, 'jon.smith@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oxford, United Kingdom$m$, 'https://linkedin.com/in/jonathan-smith-3bb07315', $m$LinkedIn AE lijst 05-11-2026$m$, 306, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jonathan,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jonathan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katie$m$, $m$Smith Veiga$m$, $m$Services Account Executive$m$, 'katie.smith@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Reading, United Kingdom$m$, 'https://linkedin.com/in/katie-smith-veiga-7724729a', $m$LinkedIn AE lijst 05-11-2026$m$, 307, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katie,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jennifer$m$, $m$Sopp$m$, $m$Account Executive$m$, 'jennifer.sopp@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Sunderland, United Kingdom$m$, 'https://linkedin.com/in/jennifer-sopp', $m$LinkedIn AE lijst 05-11-2026$m$, 308, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jennifer,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jennifer,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Emma$m$, $m$Stern$m$, $m$Senior Services Account Executive$m$, 'emmas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/emmastern', $m$LinkedIn AE lijst 05-11-2026$m$, 309, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Emma,

In your role as Senior Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Emma,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lauren$m$, $m$Sullivan$m$, $m$Senior Account Executive$m$, 'lauren.sullivan@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Manchester, United Kingdom$m$, 'https://linkedin.com/in/lauren-sullivan-718b8b38', $m$LinkedIn AE lijst 05-11-2026$m$, 310, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lauren,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lauren,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stephanie$m$, $m$Taylor$m$, $m$Senior Account Executive$m$, 'stephanie.taylor@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/stephanieataylor', $m$LinkedIn AE lijst 05-11-2026$m$, 311, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stephanie,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stephanie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Brad$m$, $m$Tobin$m$, $m$Services Account Executive$m$, 'bradtobin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hemel Hempstead, United Kingdom$m$, 'https://linkedin.com/in/brad-tobin-b2aa3614a', $m$LinkedIn AE lijst 05-11-2026$m$, 312, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Brad,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Brad,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cameron$m$, $m$Tyler-Hughes$m$, $m$Services Account Executive$m$, 'ctyler@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Bristol, United Kingdom$m$, 'https://linkedin.com/in/cameron-tyler-hughes-24174b150', $m$LinkedIn AE lijst 05-11-2026$m$, 313, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cameron,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cameron,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Merve$m$, $m$Uluyurt$m$, $m$Senior Account Executive$m$, 'merveuluyurt@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/merveuluyurt', $m$LinkedIn AE lijst 05-11-2026$m$, 314, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Merve,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Merve,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$David$m$, $m$Veryard$m$, $m$Senior Account Executive$m$, 'dveryard@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater Cardiff Area, United Kingdom$m$, 'https://linkedin.com/in/david-veryard-38746299', $m$LinkedIn AE lijst 05-11-2026$m$, 315, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi David,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi David,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Kate$m$, $m$Walker$m$, $m$Account Executive$m$, 'kate.walker@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/misskatewalker', $m$LinkedIn AE lijst 05-11-2026$m$, 316, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Kate,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Kate,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Daniel$m$, $m$Williams$m$, $m$Senior Account Executive$m$, 'daniel.williams@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oxford, United Kingdom$m$, 'https://linkedin.com/in/daniel-williams124', $m$LinkedIn AE lijst 05-11-2026$m$, 317, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Daniel,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Daniel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stef$m$, $m$Yordanova$m$, $m$Account Executive$m$, 'syordanova@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/stefyordanova', $m$LinkedIn AE lijst 05-11-2026$m$, 318, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stef,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stef,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cyril$m$, $m$Aregay$m$, $m$Airbus Global Strategic Account Executive$m$, 'cyril.aregay@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Toulouse, France$m$, 'https://linkedin.com/in/cyril-aregay-05085945', $m$LinkedIn AE lijst 05-11-2026$m$, 319, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cyril,

In your role as Airbus Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cyril,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alyona$m$, $m$Belozerova$m$, $m$Strategic Account Executive$m$, 'abelozerova@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/alyona-belozerova-0246b88b', $m$LinkedIn AE lijst 05-11-2026$m$, 320, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alyona,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alyona,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Adèle$m$, $m$Debost$m$, $m$Strategic Account Executive$m$, 'adledebost@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/adèle-debost-3022761b', $m$LinkedIn AE lijst 05-11-2026$m$, 321, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Adèle,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Adèle,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Benjamin$m$, $m$Delpon de Vaux$m$, $m$Global Strategic Account Executive$m$, 'benjamin.delpon@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/benjamindelpondevaux', $m$LinkedIn AE lijst 05-11-2026$m$, 322, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Benjamin,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Benjamin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nathalie$m$, $m$Dufouil$m$, $m$Strategic Sales Account Executive$m$, 'ndufouil@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/nathaliedufouil', $m$LinkedIn AE lijst 05-11-2026$m$, 323, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nathalie,

In your role as Strategic Sales Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nathalie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Elias$m$, $m$Ellaouzi$m$, $m$Global Strategic Account Executive$m$, 'elias.ellaouzi@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/elias-ellaouzi', $m$LinkedIn AE lijst 05-11-2026$m$, 324, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Elias,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Elias,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nathalie$m$, $m$Goudeau$m$, $m$Strategic Account Executive$m$, 'ngoudeau@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/nathaliegoudeau', $m$LinkedIn AE lijst 05-11-2026$m$, 325, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nathalie,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nathalie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vincent$m$, $m$Guilloteau$m$, $m$Strategic Account Executive$m$, 'vguilloteau@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Tours, France$m$, 'https://linkedin.com/in/vincent-guilloteau-a2415390', $m$LinkedIn AE lijst 05-11-2026$m$, 326, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vincent,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vincent,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pierre-Michel$m$, $m$Imbern$m$, $m$Global Strategic Account Executive$m$, 'pierre-michel.imbern@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/pmimbern', $m$LinkedIn AE lijst 05-11-2026$m$, 327, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pierre-Michel,

In your role as Global Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pierre-Michel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nadjia$m$, $m$Kalache$m$, $m$Strategic Account Executive$m$, 'nadjia.kalache@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/nadjiakalache', $m$LinkedIn AE lijst 05-11-2026$m$, 328, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nadjia,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nadjia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$François$m$, $m$Meunier$m$, $m$Strategic Client Executive$m$, 'fmeunier@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/fmeunier', $m$LinkedIn AE lijst 05-11-2026$m$, 329, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi François,

In your role as Strategic Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi François,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Norbert$m$, $m$Piette$m$, $m$Strategic Account Executive$m$, 'npiette@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/norbertpiette', $m$LinkedIn AE lijst 05-11-2026$m$, 330, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Norbert,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Norbert,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Elsa$m$, $m$Poirier$m$, $m$Strategic Account Executive$m$, 'elsapoirier@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/elsapoirier', $m$LinkedIn AE lijst 05-11-2026$m$, 331, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Elsa,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Elsa,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marion$m$, $m$Sainjost$m$, $m$Enterprise Account Executive$m$, 'msainjost@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/msaintjost', $m$LinkedIn AE lijst 05-11-2026$m$, 332, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marion,

In your role as Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marion,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pascale$m$, $m$Serot$m$, $m$Senior Strategic Account Executive$m$, 'pascale.serot@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/pserot28', $m$LinkedIn AE lijst 05-11-2026$m$, 333, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pascale,

In your role as Senior Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pascale,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pierre$m$, $m$Truss$m$, $m$Global Account Executive$m$, 'pierretruss@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/pierre-truss-474b2768', $m$LinkedIn AE lijst 05-11-2026$m$, 334, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pierre,

In your role as Global Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pierre,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hélène$m$, $m$Achte$m$, $m$Services Account Executive$m$, 'heleneachte@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/heleneachte', $m$LinkedIn AE lijst 05-11-2026$m$, 335, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hélène,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hélène,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lionel$m$, $m$Amar$m$, $m$Senior Sales Account Executive$m$, 'lionel.amar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Issy-les-Moulineaux, France$m$, 'https://linkedin.com/in/lionel-amar-a4520322', $m$LinkedIn AE lijst 05-11-2026$m$, 336, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lionel,

In your role as Senior Sales Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lionel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dominique$m$, $m$Beccia$m$, $m$Services Account Executive$m$, 'dominique.beccia@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Strasbourg, France$m$, 'https://linkedin.com/in/dominique-beccia', $m$LinkedIn AE lijst 05-11-2026$m$, 337, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dominique,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dominique,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Adrien$m$, $m$Beuriot$m$, $m$Senior Account Executive$m$, 'abeuriot@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/adrien-beuriot-43930347', $m$LinkedIn AE lijst 05-11-2026$m$, 338, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Adrien,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Adrien,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Yannick$m$, $m$Boissel$m$, $m$Services Account Executive$m$, 'yboissel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Issy-les-Moulineaux, France$m$, 'https://linkedin.com/in/yannickboissel', $m$LinkedIn AE lijst 05-11-2026$m$, 339, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Yannick,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Yannick,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mathieu$m$, $m$Boukellala$m$, $m$Director Account Executive$m$, 'mboukellala@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Issy-les-Moulineaux, France$m$, 'https://linkedin.com/in/mathieuboukellala', $m$LinkedIn AE lijst 05-11-2026$m$, 340, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mathieu,

In your role as Director Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mathieu,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Rym$m$, $m$Chirk Kabla$m$, $m$Account Executive$m$, 'rym.chirk@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/rym-chirk-kabla-a8177a22', $m$LinkedIn AE lijst 05-11-2026$m$, 341, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Rym,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Rym,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thibault$m$, $m$Coutarel$m$, $m$Account Executive$m$, 'tcoutarel@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/thibault-coutarel', $m$LinkedIn AE lijst 05-11-2026$m$, 342, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thibault,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thibault,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Charles$m$, $m$de Boudemange$m$, $m$Account Executive$m$, 'charles.deboudemange@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/charlesdeboudemange', $m$LinkedIn AE lijst 05-11-2026$m$, 343, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Charles,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Charles,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laetitia$m$, $m$Deslandes$m$, $m$Account Executive$m$, 'laetitia.deslandes@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/laetitia-deslandes-6bb486a0', $m$LinkedIn AE lijst 05-11-2026$m$, 344, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laetitia,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laetitia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nadine$m$, $m$Durrwell Trevas$m$, $m$Account Executive$m$, 'nadine.durrwelltrevas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Strasbourg, France$m$, 'https://linkedin.com/in/nadined1', $m$LinkedIn AE lijst 05-11-2026$m$, 345, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nadine,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nadine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Yassine$m$, $m$El Jamali$m$, $m$Senior Account Executive$m$, 'yeljamali@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/yassine-el-jamali-58797963', $m$LinkedIn AE lijst 05-11-2026$m$, 346, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Yassine,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Yassine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Najat$m$, $m$Esseghir$m$, $m$Service Account Executive$m$, 'najat.esseghir@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/najat-esseghir-a33b4716', $m$LinkedIn AE lijst 05-11-2026$m$, 347, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Najat,

In your role as Service Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Najat,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Fabian$m$, $m$Fargearel$m$, $m$Services Account Executive$m$, 'fafar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/fabian-fargearel-251809b', $m$LinkedIn AE lijst 05-11-2026$m$, 348, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Fabian,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Fabian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Julie$m$, $m$Fleury$m$, $m$Services Account Executive$m$, 'juliefleury@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/julie-fleury-601a58156', $m$LinkedIn AE lijst 05-11-2026$m$, 349, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Julie,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Julie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Julien$m$, $m$Fontana$m$, $m$Account Executive$m$, 'julien.fontana@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/fontanajulien', $m$LinkedIn AE lijst 05-11-2026$m$, 350, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Julien,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Julien,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pauline$m$, $m$François$m$, $m$Account Executive$m$, 'pauline.francois@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/pauline-francois', $m$LinkedIn AE lijst 05-11-2026$m$, 351, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pauline,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pauline,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stéphanie$m$, $m$Garnotel$m$, $m$Account Executive$m$, 'steph@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/stephaniegarnotel', $m$LinkedIn AE lijst 05-11-2026$m$, 352, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stéphanie,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stéphanie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laure$m$, $m$Garçon$m$, $m$Account Executive$m$, 'laure.garcon@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/laure-garçon-88144b8', $m$LinkedIn AE lijst 05-11-2026$m$, 353, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laure,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laure,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Maximilien$m$, $m$Gomas$m$, $m$Services Account Executive$m$, 'mgomas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/maximilien-gomas', $m$LinkedIn AE lijst 05-11-2026$m$, 354, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Maximilien,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Maximilien,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Charline$m$, $m$Grenet$m$, $m$Account Executive$m$, 'charline.grenet@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/cgrenet', $m$LinkedIn AE lijst 05-11-2026$m$, 355, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Charline,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Charline,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cécilia$m$, $m$Hak Naveau$m$, $m$Account Executive$m$, 'cecilia.naveau@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Lille, France$m$, 'https://linkedin.com/in/cécilia-hak-naveau-845b5194', $m$LinkedIn AE lijst 05-11-2026$m$, 356, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cécilia,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cécilia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mickael$m$, $m$Hardeman$m$, $m$Capital Markets Account Executive$m$, 'mickael.hardeman@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/mickael-hardeman-3850982', $m$LinkedIn AE lijst 05-11-2026$m$, 357, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mickael,

In your role as Capital Markets Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mickael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Raphael$m$, $m$Hollis$m$, $m$Services Account Executive$m$, 'rhollis@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Lille, France$m$, 'https://linkedin.com/in/raphael-hollis-05b56a92', $m$LinkedIn AE lijst 05-11-2026$m$, 358, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Raphael,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Raphael,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Imène$m$, $m$Kabla$m$, $m$Cloud & AI Account Executive$m$, 'imkabla@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Puteaux, France$m$, 'https://linkedin.com/in/imène-kabla-46923b135', $m$LinkedIn AE lijst 05-11-2026$m$, 359, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Imène,

In your role as Cloud & AI Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Imène,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dado$m$, $m$Kebe$m$, $m$Account Executive$m$, 'dado@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Issy-les-Moulineaux, France$m$, 'https://linkedin.com/in/dadokebe', $m$LinkedIn AE lijst 05-11-2026$m$, 360, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dado,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dado,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nicolas$m$, $m$Kyrychenko$m$, $m$Account Executive$m$, 'nkyrychenko@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/nicolaskyrychenko', $m$LinkedIn AE lijst 05-11-2026$m$, 361, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nicolas,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nicolas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Claire$m$, $m$Langreau$m$, $m$Account Executive$m$, 'claire.langreau@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/claire-langreau-22667172', $m$LinkedIn AE lijst 05-11-2026$m$, 362, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Claire,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Claire,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Romain$m$, $m$Lefevre$m$, $m$Account Executive$m$, 'rlefevre@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/romain-lefevre-7a8862158', $m$LinkedIn AE lijst 05-11-2026$m$, 363, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Romain,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Romain,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Eric$m$, $m$Mazieres$m$, $m$Cloud & AI Account Executive$m$, 'ericmazieres@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/ericmazieres', $m$LinkedIn AE lijst 05-11-2026$m$, 364, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Eric,

In your role as Cloud & AI Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Eric,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cathy$m$, $m$Pastor$m$, $m$Account Executive$m$, 'cpastor@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/cathypastor', $m$LinkedIn AE lijst 05-11-2026$m$, 365, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cathy,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cathy,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marion$m$, $m$Pelé$m$, $m$Account Executive$m$, 'mpele@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Boulogne-Billancourt, France$m$, 'https://linkedin.com/in/marion-pelé-0b1a5945', $m$LinkedIn AE lijst 05-11-2026$m$, 366, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marion,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marion,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Livio$m$, $m$Piccioni$m$, $m$Healthcare Account Executive$m$, 'lpiccioni@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Montpellier, France$m$, 'https://linkedin.com/in/liviopiccioni', $m$LinkedIn AE lijst 05-11-2026$m$, 367, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Livio,

In your role as Healthcare Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Livio,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$François$m$, $m$Poirier$m$, $m$Account Executive$m$, 'francois.poirier@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/francois-poirier', $m$LinkedIn AE lijst 05-11-2026$m$, 368, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi François,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi François,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sarah$m$, $m$Reboul$m$, $m$Account Executive$m$, 'sareboul@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Issy-les-Moulineaux, France$m$, 'https://linkedin.com/in/sarahreboul', $m$LinkedIn AE lijst 05-11-2026$m$, 369, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sarah,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sarah,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Emmanuel$m$, $m$Rochet$m$, $m$Sales Executive$m$, 'erochet@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/emmanuel-rochet-098167196', $m$LinkedIn AE lijst 05-11-2026$m$, 370, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Emmanuel,

In your role as Sales Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Emmanuel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Octavio$m$, $m$Tenas$m$, $m$Client Executive$m$, 'octavio.tenas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/octavio-tenas-63b818', $m$LinkedIn AE lijst 05-11-2026$m$, 371, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Octavio,

In your role as Client Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Octavio,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jean-Marc$m$, $m$Violain$m$, $m$Senior Account Executive$m$, 'jviolain@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/jean-marc-violain-a8aa8b1', $m$LinkedIn AE lijst 05-11-2026$m$, 372, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jean-Marc,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jean-Marc,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Léa$m$, $m$Youssef$m$, $m$Account Executive$m$, 'leayoussef@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/lea-youssef', $m$LinkedIn AE lijst 05-11-2026$m$, 373, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Léa,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Léa,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ana$m$, $m$Barbero$m$, $m$Strategic Account Executive$m$, 'ana.barbero@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/anainesbarbero', $m$LinkedIn AE lijst 05-11-2026$m$, 374, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ana,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ana,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Cristian$m$, $m$Dozo$m$, $m$Senior Enterprise Account Executive$m$, 'cdozo@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/cristiandozo', $m$LinkedIn AE lijst 05-11-2026$m$, 375, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Cristian,

In your role as Senior Enterprise Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Cristian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lucas$m$, $m$Métens$m$, $m$Enterprise Sales Executive$m$, 'lucasmetens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/lucas-metens', $m$LinkedIn AE lijst 05-11-2026$m$, 376, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lucas,

In your role as Enterprise Sales Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lucas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laura$m$, $m$Palencia Ruiz$m$, $m$Strategic Account Executive$m$, 'lpalencia@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/laurapalencia', $m$LinkedIn AE lijst 05-11-2026$m$, 377, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laura,

In your role as Strategic Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laura,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Eduardo$m$, $m$Aguiar$m$, $m$Senior Account Executive$m$, 'eduardo.aguiar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/eduardojraguiar', $m$LinkedIn AE lijst 05-11-2026$m$, 378, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Eduardo,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Eduardo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Isabel$m$, $m$Alonso Fernández$m$, $m$Sr. Account Executive$m$, 'ifernandez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/isabelalonsofernandez', $m$LinkedIn AE lijst 05-11-2026$m$, 379, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Isabel,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Isabel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Tarek$m$, $m$Aly$m$, $m$Account Executive$m$, 'tarekaly@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/alytarek', $m$LinkedIn AE lijst 05-11-2026$m$, 380, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Tarek,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Tarek,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mariateresa$m$, $m$Amato$m$, $m$Services Account Executive$m$, 'mariateresa.amato@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/mariateresa-amato-50886916', $m$LinkedIn AE lijst 05-11-2026$m$, 381, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mariateresa,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mariateresa,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Elicio$m$, $m$Benito Herrera$m$, $m$Account Executive$m$, 'benitoe@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/eliciobenito', $m$LinkedIn AE lijst 05-11-2026$m$, 382, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Elicio,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Elicio,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Zoe$m$, $m$Buyckx$m$, $m$Account Executive$m$, 'zobuyckx@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/zoebuyckx', $m$LinkedIn AE lijst 05-11-2026$m$, 383, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Zoe,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Zoe,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Paz$m$, $m$Calvo$m$, $m$Partner Sales Exec MSA$m$, 'paz.calvo@xandr.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/paz-calvo-834b8b4', $m$LinkedIn AE lijst 05-11-2026$m$, 384, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Paz,

In your role as Partner Sales Exec MSA you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Paz,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Davide$m$, $m$Cardella$m$, $m$Account Executive$m$, 'dcardella@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/davidecardella', $m$LinkedIn AE lijst 05-11-2026$m$, 385, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Davide,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Davide,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Noelia$m$, $m$Caro$m$, $m$Senior Account Executive$m$, 'noeliac@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/noeliacarogonzalez', $m$LinkedIn AE lijst 05-11-2026$m$, 386, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Noelia,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Noelia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gonzalo$m$, $m$Carrillo$m$, $m$Account Executive$m$, 'gcarrillo@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/gonzalo-carrillo-4034382', $m$LinkedIn AE lijst 05-11-2026$m$, 387, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gonzalo,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gonzalo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Virgilia$m$, $m$Casaburi$m$, $m$Senior Account Executive$m$, 'vcasaburi@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/virgilia-casaburi-444278195', $m$LinkedIn AE lijst 05-11-2026$m$, 388, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Virgilia,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Virgilia,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Veronika$m$, $m$Csikos$m$, $m$Commercial Executive$m$, 'vcsikos@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/veronika-csikos-742a71124', $m$LinkedIn AE lijst 05-11-2026$m$, 389, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Veronika,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Veronika,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nuria$m$, $m$de Marti Olius$m$, $m$Commercial Executive$m$, 'demartin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/nuria-de-marti-olius-80710714a', $m$LinkedIn AE lijst 05-11-2026$m$, 390, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nuria,

In your role as Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nuria,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Marta$m$, $m$Garrido Oriol$m$, $m$Account Executive$m$, 'marta.garrido@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/martagarridooriol', $m$LinkedIn AE lijst 05-11-2026$m$, 391, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Marta,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Marta,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vanessa$m$, $m$Gonzalez$m$, $m$Senior Commercial Executive$m$, 'vgonzalez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/vanessaegv', $m$LinkedIn AE lijst 05-11-2026$m$, 392, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vanessa,

In your role as Senior Commercial Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vanessa,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lourdes$m$, $m$Gutiérrez Toranzo$m$, $m$Senior Account Executive$m$, 'lgutierrez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/lourdesgutierreztoranzo', $m$LinkedIn AE lijst 05-11-2026$m$, 393, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lourdes,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lourdes,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ramiro$m$, $m$Gómez de la Cruz$m$, $m$Services Account Executive$m$, 'rgomez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Las Rozas de Madrid, Spain$m$, 'https://linkedin.com/in/ramiro-gómez-de-la-cruz-81232092', $m$LinkedIn AE lijst 05-11-2026$m$, 394, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ramiro,

In your role as Services Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ramiro,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lucía$m$, $m$Iglesias Fedeli$m$, $m$Client Account Executive$m$, 'luigle@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/lucía-iglesias-fedeli', $m$LinkedIn AE lijst 05-11-2026$m$, 395, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lucía,

In your role as Client Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lucía,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sandrine$m$, $m$Khauv$m$, $m$Senior Corporate Account Executive$m$, 'skhauv@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/sandrine-khauv', $m$LinkedIn AE lijst 05-11-2026$m$, 396, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sandrine,

In your role as Senior Corporate Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sandrine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Janine$m$, $m$Koleta$m$, $m$Senior Account Executive$m$, 'janinekoleta@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/janine-koleta', $m$LinkedIn AE lijst 05-11-2026$m$, 397, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Janine,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Janine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stephanie$m$, $m$Lukas$m$, $m$Senior Digital Account Executive$m$, 'slukas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/stephanie-lukas-466503183', $m$LinkedIn AE lijst 05-11-2026$m$, 398, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stephanie,

In your role as Senior Digital Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stephanie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Pedro$m$, $m$Moreno$m$, $m$Account Executive$m$, 'pmoreno@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/pedromorenoh', $m$LinkedIn AE lijst 05-11-2026$m$, 399, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Pedro,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Pedro,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lisa Marie$m$, $m$Nöfer$m$, $m$Sr Account Executive$m$, 'nferlisa@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/lisa-marie-nöfer-875733188', $m$LinkedIn AE lijst 05-11-2026$m$, 400, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lisa Marie,

In your role as Sr Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lisa Marie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lucas$m$, $m$Orozco Martin$m$, $m$Account Executive$m$, 'lucasm@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/lucas-orozco-martin-50a38476', $m$LinkedIn AE lijst 05-11-2026$m$, 401, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lucas,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lucas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gabriela$m$, $m$Pulido Larrea$m$, $m$Account Executive$m$, 'gabrielap@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/gpulido', $m$LinkedIn AE lijst 05-11-2026$m$, 402, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gabriela,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gabriela,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Danique$m$, $m$Quaedvlieg$m$, $m$Account Executive$m$, 'dquaedvlieg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/danique-quaedvlieg-591079105', $m$LinkedIn AE lijst 05-11-2026$m$, 403, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Danique,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Danique,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Chantal$m$, $m$Rodriguez Perez$m$, $m$Senior Digital Account Executive$m$, 'chantal.rodriguez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/chantal-rodriguez-perez-0817a9133', $m$LinkedIn AE lijst 05-11-2026$m$, 404, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Chantal,

In your role as Senior Digital Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Chantal,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sara$m$, $m$San Martín del Pozo$m$, $m$Account Executive$m$, 'saras@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/sara-san-martín-del-pozo', $m$LinkedIn AE lijst 05-11-2026$m$, 405, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sara,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sara,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Carlos$m$, $m$Sanz Alonso$m$, $m$Senior Account Executive$m$, 'csanzalonso@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/carlos-sanz-alonso', $m$LinkedIn AE lijst 05-11-2026$m$, 406, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Carlos,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Carlos,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Samuel$m$, $m$Schaeftlein$m$, $m$Account Executive$m$, 'sschaeftlein@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/sschaeftlein', $m$LinkedIn AE lijst 05-11-2026$m$, 407, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Samuel,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Samuel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Regina$m$, $m$Solé$m$, $m$Account Executive$m$, 'reginas@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/reginasole', $m$LinkedIn AE lijst 05-11-2026$m$, 408, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Regina,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Regina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Peter$m$, $m$Stützner$m$, $m$Sr. Account Executive$m$, 'pstutzner@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Mataró, Spain$m$, 'https://linkedin.com/in/pstutzner', $m$LinkedIn AE lijst 05-11-2026$m$, 409, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Peter,

In your role as Sr. Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Peter,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alberto$m$, $m$Tapia$m$, $m$Account Executive$m$, 'alberto.tapia@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Pozuelo de Alarcón, Spain$m$, 'https://linkedin.com/in/albertotapia', $m$LinkedIn AE lijst 05-11-2026$m$, 410, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alberto,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alberto,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Bob$m$, $m$van Bilsen$m$, $m$Senior Account Executive$m$, 'bobvanbilsen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/bob-van-bilsen-8660a736', $m$LinkedIn AE lijst 05-11-2026$m$, 411, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Bob,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Bob,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Olivier$m$, $m$van Gorkom$m$, $m$Account Executive$m$, 'ovangorkom@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/olivier-van-gorkom-37b85910b', $m$LinkedIn AE lijst 05-11-2026$m$, 412, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Olivier,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Olivier,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mamen$m$, $m$Vázquez Copé$m$, $m$Senior Account Executive$m$, 'mamen.vazquez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/mamenvazco', $m$LinkedIn AE lijst 05-11-2026$m$, 413, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mamen,

In your role as Senior Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mamen,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Guillermo$m$, $m$Muñoz Díez$m$, $m$Account Executive$m$, 'gmunozdiez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Italy$m$, 'https://linkedin.com/in/gmunozdiez', $m$LinkedIn AE lijst 05-11-2026$m$, 414, false, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Guillermo,

In your role as Account Executive you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Guillermo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sander$m$, $m$de Regt$m$, $m$Enterprise Sales Director$m$, 'sderegt@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/sanderd5', $m$LinkedIn AE lijst 05-11-2026$m$, 415, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sander,

In your role as Enterprise Sales Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Christian$m$, $m$McCracken$m$, $m$Global Account Director for ASML$m$, 'christian.mccracken@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/christian-mccracken', $m$LinkedIn AE lijst 05-11-2026$m$, 416, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Christian,

In your role as Global Account Director for ASML you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Christian,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vikash$m$, $m$Sital$m$, $m$Senior Enterprise Client Director$m$, 'vikashsital@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/vikashsital', $m$LinkedIn AE lijst 05-11-2026$m$, 417, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vikash,

In your role as Senior Enterprise Client Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vikash,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Hira$m$, $m$Zahid$m$, $m$Strategic Account Manager$m$, 'h.zahid@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/hira-zahid1991', $m$LinkedIn AE lijst 05-11-2026$m$, 418, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Hira,

In your role as Strategic Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Hira,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jasper$m$, $m$Adam$m$, $m$Sales Specialist Modern Work$m$, 'jasperadam@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/jasperadam', $m$LinkedIn AE lijst 05-11-2026$m$, 419, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jasper,

In your role as Sales Specialist Modern Work you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jasper,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexandre$m$, $m$Attallah$m$, $m$Customer Success Account Manager$m$, 'alexandre.attallah@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/alexandre-attallah', $m$LinkedIn AE lijst 05-11-2026$m$, 420, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexandre,

In your role as Customer Success Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexandre,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laura$m$, $m$Been$m$, $m$Sr. AI Business Solutions Specialist$m$, 'beenlaura@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/laura-been-13a1637b', $m$LinkedIn AE lijst 05-11-2026$m$, 421, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laura,

In your role as Sr. AI Business Solutions Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laura,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vita$m$, $m$Bosmans$m$, $m$Chief Hybrid (AI) Officer$m$, 'shanna.bosmans@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/vitashannabosmans', $m$LinkedIn AE lijst 05-11-2026$m$, 422, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vita,

In your role as Chief Hybrid (AI) Officer you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vita,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Ronald$m$, $m$Bouscholte$m$, $m$Sr. Azure Specialist$m$, 'rbouscholte@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/ronaldbouscholte', $m$LinkedIn AE lijst 05-11-2026$m$, 423, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Ronald,

In your role as Sr. Azure Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Ronald,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dirk$m$, $m$Caals$m$, $m$Customer Success Account Manager$m$, 'dcaals@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Gent, Belgium$m$, 'https://linkedin.com/in/dirkcaals', $m$LinkedIn AE lijst 05-11-2026$m$, 424, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dirk,

In your role as Customer Success Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dirk,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dirk$m$, $m$de Jong$m$, $m$Customer Success Lead$m$, 'dirk.de.jong@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Delft, Netherlands$m$, 'https://linkedin.com/in/dcdejong', $m$LinkedIn AE lijst 05-11-2026$m$, 425, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dirk,

In your role as Customer Success Lead you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dirk,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Bart$m$, $m$de Wit$m$, $m$Client Solutions Manager$m$, 'b_wit@itsaboutme.in', 'microsoft.com', $m$Microsoft$m$, $m$'s Hertogenbosch, Netherlands$m$, 'https://linkedin.com/in/bart-de-wit', $m$LinkedIn AE lijst 05-11-2026$m$, 426, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Bart,

In your role as Client Solutions Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Bart,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Noël$m$, $m$der Weduwen$m$, $m$Sr. Cloud & AI Platform Specialist$m$, 'noeld@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amstelveen, Netherlands$m$, 'https://linkedin.com/in/noël-der-weduwen-94899344', $m$LinkedIn AE lijst 05-11-2026$m$, 427, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Noël,

In your role as Sr. Cloud & AI Platform Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Noël,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joana$m$, $m$Eberhard$m$, $m$Business Manager$m$, 'joana.eberhard@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/joana-eberhard-4a2b03154', $m$LinkedIn AE lijst 05-11-2026$m$, 428, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joana,

In your role as Business Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joana,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Leon$m$, $m$Fretz$m$, $m$Financial Services Business Leader$m$, 'leon.fretz@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/leon-fretz', $m$LinkedIn AE lijst 05-11-2026$m$, 429, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Leon,

In your role as Financial Services Business Leader you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Leon,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dennis$m$, $m$Oranje$m$, $m$Principal Pursuit Lead EMEA$m$, 'dennis.oranje@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/dennisoranje', $m$LinkedIn AE lijst 05-11-2026$m$, 430, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dennis,

In your role as Principal Pursuit Lead EMEA you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dennis,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Diami$m$, $m$Papadopoulou$m$, $m$Account Technology Manager-AI strategist$m$, 'diamantoula.papadopoulou@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/diamantoula-papadopoulou', $m$LinkedIn AE lijst 05-11-2026$m$, 431, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Diami,

In your role as Account Technology Manager-AI strategist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Diami,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alexander$m$, $m$Prins$m$, $m$Cloud Solution Architect$m$, 'aprins@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/alexander-prins', $m$LinkedIn AE lijst 05-11-2026$m$, 432, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alexander,

In your role as Cloud Solution Architect you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alexander,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Liesbeth$m$, $m$Roelfs$m$, $m$Services Sales Lead NL$m$, 'lroelfs@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Almere, Netherlands$m$, 'https://linkedin.com/in/liesbeth-roelfs-428579', $m$LinkedIn AE lijst 05-11-2026$m$, 433, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Liesbeth,

In your role as Services Sales Lead NL you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Liesbeth,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Farah$m$, $m$Saeedi$m$, $m$AI Business Process Lead SMB for Benelux$m$, 'farah.saeedi@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$The Hague, Netherlands$m$, 'https://linkedin.com/in/farah-saeedi-58b60631', $m$LinkedIn AE lijst 05-11-2026$m$, 434, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Farah,

In your role as AI Business Process Lead SMB for Benelux you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Farah,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Wilma$m$, $m$Scholtens$m$, $m$Senior Customer Success Account Manager$m$, 'wscholtens@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/quaelo', $m$LinkedIn AE lijst 05-11-2026$m$, 435, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Wilma,

In your role as Senior Customer Success Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Wilma,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Quint$m$, $m$Schoors$m$, $m$AI Workforce Specialist$m$, 'quint.schoors@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/quintreneschoors', $m$LinkedIn AE lijst 05-11-2026$m$, 436, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Quint,

In your role as AI Workforce Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Quint,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Lisanne$m$, $m$Schrooyen$m$, $m$Marketing & Events Lead Netherlands$m$, 'lisanne.schrooyen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/lisanneschrooyen', $m$LinkedIn AE lijst 05-11-2026$m$, 437, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Lisanne,

In your role as Marketing & Events Lead Netherlands you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Lisanne,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Thang$m$, $m$Tran$m$, $m$Specialist$m$, 'trant@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Haarlemmermeer, Netherlands$m$, 'https://linkedin.com/in/thang-tran-50b54b1', $m$LinkedIn AE lijst 05-11-2026$m$, 438, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Thang,

In your role as Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Thang,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Edgar$m$, $m$van Denzel$m$, $m$Microsoft for Startups Expert and Mentor$m$, 'edgar@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/edgarvandenzel', $m$LinkedIn AE lijst 05-11-2026$m$, 439, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Edgar,

In your role as Microsoft for Startups Expert and Mentor you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Edgar,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Robin$m$, $m$van der Horst$m$, $m$Sr. Specialist AI Business Solutions$m$, 'rvanderhorst@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/robinvanderhorst', $m$LinkedIn AE lijst 05-11-2026$m$, 440, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Robin,

In your role as Sr. Specialist AI Business Solutions you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Robin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dennis$m$, $m$van Onselen$m$, $m$Services Excellence Lead EMEA$m$, 'dennisv@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Netherlands$m$, 'https://linkedin.com/in/dennisvanonselen', $m$LinkedIn AE lijst 05-11-2026$m$, 441, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dennis,

In your role as Services Excellence Lead EMEA you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dennis,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Annelot$m$, $m$Verbruggen$m$, $m$Chief of Staff to the CEO of Microsoft Netherlands$m$, 'annelot.verbruggen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/annelotverbruggen', $m$LinkedIn AE lijst 05-11-2026$m$, 442, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Annelot,

In your role as Chief of Staff to the CEO of Microsoft Netherlands you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Annelot,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Oleksandra$m$, $m$Voronchykhina$m$, $m$Senior Solution Engineer AI Business Solutions$m$, 'oleksandrav@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/o-voronchykhina', $m$LinkedIn AE lijst 05-11-2026$m$, 443, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Oleksandra,

In your role as Senior Solution Engineer AI Business Solutions you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Oleksandra,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Robbert$m$, $m$Vranken$m$, $m$Customer Success Manager Ministry of Defense$m$, 'robbertv@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Arnhem, Netherlands$m$, 'https://linkedin.com/in/robbert-vranken-392478', $m$LinkedIn AE lijst 05-11-2026$m$, 444, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Robbert,

In your role as Customer Success Manager Ministry of Defense you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Robbert,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Martijn$m$, $m$Welling$m$, $m$Sr. Security Specialist$m$, 'mwelling@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Amsterdam, Netherlands$m$, 'https://linkedin.com/in/martijn-welling-b5a21b149', $m$LinkedIn AE lijst 05-11-2026$m$, 445, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Martijn,

In your role as Sr. Security Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Martijn,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Stéphanie$m$, $m$Windels$m$, $m$Account Manager$m$, 'stephanie.windels@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Belgium$m$, 'https://linkedin.com/in/stephaniewindels', $m$LinkedIn AE lijst 05-11-2026$m$, 446, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Stéphanie,

In your role as Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Stéphanie,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dorena$m$, $m$Paschke-Elmsheuser$m$, $m$Global Business Manager$m$, 'dorena.paschke@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/dpaschke', $m$LinkedIn AE lijst 05-11-2026$m$, 447, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dorena,

In your role as Global Business Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dorena,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Eick-Hendrik$m$, $m$von Ramin$m$, $m$Global Client Director$m$, 'eick.vonramin@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Hamburg, Germany$m$, 'https://linkedin.com/in/eick-hendrik-von-ramin-b234a458', $m$LinkedIn AE lijst 05-11-2026$m$, 448, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Eick-Hendrik,

In your role as Global Client Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Eick-Hendrik,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nelly$m$, $m$Kempf$m$, $m$Customer Success Account Manager$m$, 'nellykempf@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Berlin, Germany$m$, 'https://linkedin.com/in/nellykempf', $m$LinkedIn AE lijst 05-11-2026$m$, 449, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nelly,

In your role as Customer Success Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nelly,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Dominique$m$, $m$Mirandolle$m$, $m$Head of Customer Success Account Management$m$, 'dominique.mirandolle@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/dmirandolle', $m$LinkedIn AE lijst 05-11-2026$m$, 450, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Dominique,

In your role as Head of Customer Success Account Management you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Dominique,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Arzu$m$, $m$Morcicek$m$, $m$Principal Solution Specialist$m$, 'arzu.morcicek@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/arzu-morcicek-32522859', $m$LinkedIn AE lijst 05-11-2026$m$, 451, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Arzu,

In your role as Principal Solution Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Arzu,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jasmin$m$, $m$Parchmann$m$, $m$Solution Manager$m$, 'jparchmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Germany$m$, 'https://linkedin.com/in/jasmin-parchmann-1a4784225', $m$LinkedIn AE lijst 05-11-2026$m$, 452, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jasmin,

In your role as Solution Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jasmin,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Daniel$m$, $m$Schellmann$m$, $m$Senior Client Partner Retail$m$, 'daniel.schellmann@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$München, Germany$m$, 'https://linkedin.com/in/daniel-schellmann-4852614', $m$LinkedIn AE lijst 05-11-2026$m$, 453, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Daniel,

In your role as Senior Client Partner Retail you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Daniel,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Vincent$m$, $m$Sedlace$m$, $m$Account Manager$m$, 'vincents@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Köln, Germany$m$, 'https://linkedin.com/in/vsedlace', $m$LinkedIn AE lijst 05-11-2026$m$, 454, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Vincent,

In your role as Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Vincent,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nina$m$, $m$Due$m$, $m$Director Enterprise Commercial Partners$m$, 'ndue@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/nina-due-21750b1', $m$LinkedIn AE lijst 05-11-2026$m$, 455, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nina,

In your role as Director Enterprise Commercial Partners you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nina,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Øzcan$m$, $m$Deveci$m$, $m$Director, Services AE$m$, 'ozcandeveci@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/øzcan-deveci-b6803b90', $m$LinkedIn AE lijst 05-11-2026$m$, 456, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Øzcan,

In your role as Director, Services AE you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Øzcan,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Linnea$m$, $m$Egebjerg$m$, $m$Services Solution Sales Professional$m$, 'linnea.egebjerg@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/linnea-egebjerg-a6b50b9a', $m$LinkedIn AE lijst 05-11-2026$m$, 457, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Linnea,

In your role as Services Solution Sales Professional you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Linnea,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Katrine$m$, $m$Garde$m$, $m$Customer Success Account Manager$m$, 'kgarde@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Copenhagen, Denmark$m$, 'https://linkedin.com/in/katrine-garde-1983a4b0', $m$LinkedIn AE lijst 05-11-2026$m$, 458, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Katrine,

In your role as Customer Success Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Katrine,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Aleksi$m$, $m$Kuitunen$m$, $m$Health Lead$m$, 'aleksi.kuitunen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Helsinki, Finland$m$, 'https://linkedin.com/in/aleksikuitunen', $m$LinkedIn AE lijst 05-11-2026$m$, 459, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Aleksi,

In your role as Health Lead you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Aleksi,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Joakim$m$, $m$Nordström$m$, $m$Sr. Account Technology Strategist$m$, 'joakim.nordstrom@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Vallentuna, Sweden$m$, 'https://linkedin.com/in/jockenordstrom', $m$LinkedIn AE lijst 05-11-2026$m$, 460, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Joakim,

In your role as Sr. Account Technology Strategist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Joakim,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jørgen$m$, $m$Storflåten$m$, $m$Senior Account Manager$m$, 'jostorfl@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Oslo, Norway$m$, 'https://linkedin.com/in/jørgen-storflåten-4363002b', $m$LinkedIn AE lijst 05-11-2026$m$, 461, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jørgen,

In your role as Senior Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jørgen,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jen$m$, $m$Bagshaw$m$, $m$Global Client Director$m$, 'jen@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Beaconsfield, United Kingdom$m$, 'https://linkedin.com/in/jen-bagshaw-a72588', $m$LinkedIn AE lijst 05-11-2026$m$, 462, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jen,

In your role as Global Client Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jen,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Jo$m$, $m$Parsons$m$, $m$Strategic Account Director$m$, 'joparsons@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$United Kingdom$m$, 'https://linkedin.com/in/joparsons123', $m$LinkedIn AE lijst 05-11-2026$m$, 463, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Jo,

In your role as Strategic Account Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Jo,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Mark$m$, $m$Davies$m$, $m$Director$m$, 'mark.davies@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Olney, United Kingdom$m$, 'https://linkedin.com/in/markdaviesmicrosoft', $m$LinkedIn AE lijst 05-11-2026$m$, 464, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Mark,

In your role as Director you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Mark,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Helena$m$, $m$Wilton$m$, $m$Cloud & AI Sales Specialist$m$, 'helenawilton@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Greater London, United Kingdom$m$, 'https://linkedin.com/in/helenawilton', $m$LinkedIn AE lijst 05-11-2026$m$, 465, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Helena,

In your role as Cloud & AI Sales Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Helena,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Laura$m$, $m$Aguirre$m$, $m$Advertising Account Management$m$, 'lauraaguirre@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/laura-aguirre-b3505865', $m$LinkedIn AE lijst 05-11-2026$m$, 466, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Laura,

In your role as Advertising Account Management you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Laura,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Nicolas$m$, $m$Barré$m$, $m$Sales Specialist$m$, 'nicolasbarre@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/nicolas-barré-149b6049', $m$LinkedIn AE lijst 05-11-2026$m$, 467, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Nicolas,

In your role as Sales Specialist you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Nicolas,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Sebastien$m$, $m$Baschard$m$, $m$Solution Specialist Modern Workplace$m$, 'sebastien.baschard@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/sebastien-baschard-09836a32', $m$LinkedIn AE lijst 05-11-2026$m$, 468, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Sebastien,

In your role as Solution Specialist Modern Workplace you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Sebastien,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Gillone$m$, $m$de Clisson$m$, $m$AI Business Solutions Sales Manager$m$, 'gillde@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/gillonedeclisson', $m$LinkedIn AE lijst 05-11-2026$m$, 469, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Gillone,

In your role as AI Business Solutions Sales Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Gillone,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Andrea$m$, $m$Garcia Elescano$m$, $m$Cloud & AI$m$, 'andrea.garcia@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/andrea-garcia-elescano-24a79a22', $m$LinkedIn AE lijst 05-11-2026$m$, 470, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Andrea,

In your role as Cloud & AI you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Andrea,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Anthony$m$, $m$Mellian$m$, $m$Services Account Manager$m$, 'anthony.mellian@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$France$m$, 'https://linkedin.com/in/anthonymellian', $m$LinkedIn AE lijst 05-11-2026$m$, 471, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Anthony,

In your role as Services Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Anthony,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Eric$m$, $m$Vigouroux$m$, $m$Account Manager$m$, 'eric.vigouroux@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Paris, France$m$, 'https://linkedin.com/in/ericvigouroux', $m$LinkedIn AE lijst 05-11-2026$m$, 472, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Eric,

In your role as Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Eric,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Juliette$m$, $m$Bologne$m$, $m$Enterprise Sales$m$, 'jbologne@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/juliette-bologne', $m$LinkedIn AE lijst 05-11-2026$m$, 473, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Juliette,

In your role as Enterprise Sales you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Juliette,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Maria$m$, $m$Antalova$m$, $m$Agency Partner Manager$m$, 'maria.antalova@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/mariaantalova', $m$LinkedIn AE lijst 05-11-2026$m$, 474, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Maria,

In your role as Agency Partner Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Maria,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Antonio$m$, $m$Marzan Gonzalez$m$, $m$Corporate Account Manager$m$, 'agonzalez@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/antoniomarzan', $m$LinkedIn AE lijst 05-11-2026$m$, 475, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Antonio,

In your role as Corporate Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Antonio,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Alex$m$, $m$Marzo Montoro$m$, $m$Senior Account Manager$m$, 'malexander@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/alex-marzo-montoro-4601b7106', $m$LinkedIn AE lijst 05-11-2026$m$, 476, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Alex,

In your role as Senior Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Alex,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Tamara$m$, $m$Nottalgiovani Knopf$m$, $m$Account Manager$m$, 'tknopf@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/tamara-nottalgiovani-knopf', $m$LinkedIn AE lijst 05-11-2026$m$, 477, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Tamara,

In your role as Account Manager you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Tamara,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$),
  ('7b4d1e62-9c08-4a31-ae57-2f6b3d085c19', $m$Simone$m$, $m$Pantaleo$m$, $m$New Business Lead IT&ES$m$, 'spantaleo@microsoft.com', 'microsoft.com', $m$Microsoft$m$, $m$Spain$m$, 'https://linkedin.com/in/simonepantaleo', $m$LinkedIn AE lijst 05-11-2026$m$, 478, true, 'email', 'queued', 'VALID', $m$Copilot beyond the pilot$m$, $m$Hi Simone,

In your role as New Business Lead IT&ES you will recognise this: Copilot lands well in the pilot, and then the conversation about wider rollout stalls on budget.

We are known inside Microsoft for our Glint services, maybe with you too. With a number of your colleagues we also run AI ROI analyses that translate Copilot and agent adoption into dollar-value outcomes. That is the number that moves a customer from pilot to wider rollout and increased consumption.

I would like to touch base on where that would help in your accounts, and on Glint if that is closer to home.

Do you have 20 minutes in the next two weeks?

Marco$m$, $m$Re: Copilot beyond the pilot$m$, $m$Hi Simone,

Following up on my note about the business case behind Copilot adoption. If this sits with someone else on your team, pointing me there helps just as much.

Worth 20 minutes?

Marco$m$);
