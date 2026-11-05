-- 'aanmelding' als eigen uitkomst, naast 'afspraak'.
--
-- Toegepast via Supabase MCP op 5 november 2026 (migratie
-- outreach_contact_outcome_aanmelding). Dit bestand is de vastlegging.
--
-- Eerder stond er bij een eventcampagne 'afspraak' in de database met alleen
-- een ander label eroverheen. Dat is goedkoop om te bouwen en duur om te
-- lezen: in een jaaroverzicht over alle campagnes staat er dan 'afspraak' bij
-- iemand die zich enkel voor een event heeft aangemeld, en dat verschil is
-- juist wat je wilt tellen.
--
-- Welke van de twee een campagne aanbiedt staat in outreach_campaign.doel;
-- de keuzelijst toont er dus altijd maar een van de twee.
--
-- Niets te migreren: op het moment van toepassen stonden alle drie de
-- 'afspraak'-rijen in Microsoft Account Executives 2026, een campagne met
-- doel 'afspraak'.
alter table outreach_contact drop constraint if exists outreach_contact_outcome_chk;
alter table outreach_contact add constraint outreach_contact_outcome_chk
  check (outcome is null or outcome in ('afspraak', 'aanmelding', 'geen_interesse'));

comment on column outreach_contact.outcome is
  'Met de hand vastgelegde uitkomst: afspraak (gesprek gepland), aanmelding (komt naar het event) of geen_interesse. Welke van de eerste twee de campagne aanbiedt staat in outreach_campaign.doel.';
