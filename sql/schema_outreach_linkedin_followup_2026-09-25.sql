-- Staat de cron toe om een tweede LinkedIn-bericht te versturen.
-- Toegepast op 25 september 2026 via de Supabase MCP.
--
-- Standaard FALSE, en dat is de hele veiligheid van deze migratie: bestaande
-- campagnes veranderen niet van gedrag door deze release. De knop 'Verstuur
-- batch' in de tab werkt los van deze kolom; die opent zijn eigen slot door
-- expliciet om stap 2 te vragen.
--
-- Zonder dit onderscheid zou het opheffen van de blokkade in
-- api/_lib/outreach-send-lib.js betekenen dat api/outreach-drip.js, die elke 20
-- minuten draait, ongevraagd herinneringen gaat sturen. Een beperking op het
-- LinkedIn-account is niet terug te draaien.
alter table public.outreach_campaign
  add column if not exists linkedin_followup boolean not null default false;

comment on column public.outreach_campaign.linkedin_followup is
  'Mag de cron (outreach-drip) een tweede LinkedIn-bericht sturen? Standaard nee. De knop Verstuur batch werkt hier los van.';

-- Terugdraaien:
-- alter table public.outreach_campaign drop column linkedin_followup;
