-- Welk contact hoort bij deze marketing lead?
--
-- Toegepast via Supabase MCP op 5 november 2026 (migratie
-- marketing_leads_contact_id). Dit bestand is de vastlegging.
--
-- Naast converted_lead_id, dat naar de sales-funnel wijst. Deze kolom wijst
-- naar contacts en zegt alleen: deze persoon staat in de contactendatabase.
-- Dat is bewust iets anders dan een lead: niet elke aanmelding is een deal.
--
-- Gevuld door de knop 'Voeg contact toe' in Marketing > Leads. Zolang hij leeg
-- is toont die tab de knop; staat hij gevuld, dan een merkteken, zodat twee
-- keer klikken geen dubbel contact oplevert.
--
-- on delete set null: wordt het contact opgeruimd, dan verdwijnt de verwijzing
-- maar blijft de marketing lead met zijn aanmeldingen gewoon staan.
alter table marketing_leads
  add column if not exists contact_id uuid references contacts(id) on delete set null;

comment on column marketing_leads.contact_id is
  'Contact in contacts dat bij deze aanmelding hoort. Gevuld door de knop "Voeg contact toe" in Marketing > Leads. Los van converted_lead_id, dat naar de sales-funnel wijst.';
