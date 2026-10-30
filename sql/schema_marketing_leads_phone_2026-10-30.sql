-- Telefoonnummer op de lead zelf, met de hand in te vullen in de Leads-tab.
--
-- WAAROM EEN EIGEN KOLOM EN NIET DE PAYLOAD BIJWERKEN
--   Het nummer dat de lijst tot nu toe toonde komt uit
--   marketing_lead_activity.payload.phone, en dat is het aanmeldformulier zoals
--   de deelnemer het zelf invulde. Een activiteit is een logregel: daar overheen
--   schrijven vervalst wat er die dag is binnengekomen. Een nummer dat wij
--   ergens opzoeken hoort op de lead.
--
-- LEEG BETEKENT TERUGVALLEN
--   De tab toont leads.phone als die gevuld is, en anders het nummer uit de
--   aanmelding. Zo hoefde er niets gemigreerd te worden en blijven de bestaande
--   nummers gewoon staan.

alter table marketing_leads add column if not exists phone text;

comment on column marketing_leads.phone is
  'Telefoonnummer dat met de hand in de Leads-tab is ingevuld. Staat los van het nummer in de payload van de aanmelding: dat is het formulier zoals de deelnemer het zelf invulde en wordt nooit overschreven. Leeg = val terug op dat formulier.';
