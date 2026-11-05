-- Waar mikt deze campagne op?
--
-- Toegepast via Supabase MCP op 5 november 2026 (migratie
-- outreach_campaign_doel). Dit bestand is de vastlegging.
--
-- De uitkomstkeuze in de Outreach-tab bood 'Afspraak' of 'Geen interesse'.
-- Bij een campagne die mensen naar een event uitnodigt is 'Afspraak' het
-- verkeerde woord: daar meld je je aan, je plant geen gesprek. Hetzelfde veld,
-- een andere vraag.
--
-- Dit veld bepaalt WELKE uitkomst de campagne aanbiedt, niet alleen hoe hij
-- heet. Een campagne met doel 'aanmelding' schrijft outcome = 'aanmelding'
-- weg, een met doel 'afspraak' schrijft 'afspraak'. De eerste opzet legde bij
-- allebei 'afspraak' vast met alleen een ander label eroverheen; dat leest
-- prettig in de tab en verkeerd in een jaaroverzicht over alle campagnes.
-- Zie sql/schema_outreach_outcome_aanmelding_2026-11-05.sql en
-- uitkomstKeuzes() in src/lib/outreach-status.js, met tests.
alter table outreach_campaign
  add column if not exists doel text not null default 'afspraak';

alter table outreach_campaign
  drop constraint if exists outreach_campaign_doel_check;
alter table outreach_campaign
  add constraint outreach_campaign_doel_check check (doel in ('afspraak', 'aanmelding'));

comment on column outreach_campaign.doel is
  'Waar de campagne op mikt: afspraak (gesprek plannen) of aanmelding (naar een event). Bepaalt alleen het label van outreach_contact.outcome = afspraak, niet de opgeslagen waarde.';

-- De twee Amsterdam-campagnes nodigen uit voor het event van 17 november.
update outreach_campaign set doel = 'aanmelding'
where id in ('5caf44f8-e6cc-4ecc-a61f-c729c7155089', '61096375-a56f-4748-a08a-ce5413da0389');
