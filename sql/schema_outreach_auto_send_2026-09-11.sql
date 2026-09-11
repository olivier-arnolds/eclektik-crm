-- Automatisch versturen per campagne. Toegepast 2026-09-11.
--
-- WAAROM
--   Een klik op 'verstuur batch' haalt de dagcap niet: bij LinkedIn zit er 12 tot
--   25 seconden tussen twee berichten, dus 30 stuks is ruim negen minuten en een
--   serverloze functie mag er vijf draaien. Zonder cron moet iemand de hele dag
--   zelf bijhouden wanneer er weer ruimte is.
--
-- Standaard FALSE: onbeheerd versturen vanaf iemands eigen LinkedIn-account is
-- een bewuste keuze, geen standaardgedrag. Status 'paused' blijft de killswitch,
-- ook voor de cron.
alter table public.outreach_campaign
  add column if not exists auto_send boolean not null default false;

comment on column public.outreach_campaign.auto_send is
  'True = de cron api/outreach-drip smeert de dagcap uit over de dag. Standaard false: automatisch versturen is een bewuste keuze per campagne. Status paused blijft de killswitch, ook voor de cron.';
