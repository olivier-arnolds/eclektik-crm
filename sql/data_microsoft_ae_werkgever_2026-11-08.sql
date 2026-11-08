-- Werkgever rechtzetten in de campagne Microsoft Account Executives 2026.
--
-- WAT ER MIS WAS
--   In die campagne stond in outreach_contact.company de GEDEELDE KLANT (Jazz
--   Pharmaceuticals, Draper, TDIndustries, DOUGLAS), want dat was de haak in
--   het bericht. De mensen zelf werken allemaal bij Microsoft; het adres zegt
--   dat ook (email_domain is voor alle 29 microsoft.com). In de tab Leads las
--   de kolom Bedrijf daardoor als de werkgever terwijl er de klant stond.
--
--   De latere campagne Microsoft AE EMEA 2026 had het wel goed staan: daar is
--   company 'Microsoft'. Dit trekt de oudere campagne daarmee gelijk.
--
-- DE KLANT GAAT NIET VERLOREN
--   Die verhuist naar hook_note. Dat veld is er precies voor: de aanleiding van
--   het bericht. Het staat nu nergens op het scherm; wil je de gedeelde klant
--   in de Outreach-tab zien, dan is daar een kolom voor nodig.
--
-- GEEN GEVOLG VOOR HET VERZENDEN
--   De berichtteksten staan al klaar in msg1_body/msg2_body en worden niet
--   opnieuw opgebouwd. max_per_company_per_week staat voor deze campagne op 0,
--   dus één bedrijfsnaam voor alle 29 stuurt de verzendvolgorde niet in de war.
--
-- Back-ups vooraf: _dq_backup_outreach_contact_20261108 (3026 rijen),
-- _dq_backup_marketing_leads_20261108 (26 rijen). Rijaantallen na afloop gelijk.
-- Toegepast op 8 november 2026.

update public.outreach_contact oc
set hook_note = coalesce(oc.hook_note, 'Gedeelde klant: ' || oc.company),
    company = 'Microsoft',
    updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Microsoft Account Executives 2026'
  and oc.company is distinct from 'Microsoft';
-- 29 rijen.

-- De vier leads die al uit deze campagne zijn voortgekomen dragen de oude
-- waarde nog: die is bij het vastleggen van de afspraak overgenomen.
update public.marketing_leads l
set company = 'Microsoft'
where l.id in (
  select a.marketing_lead_id from public.marketing_lead_activity a
  where a.event = 'outreach_meeting'
) and lower(btrim(l.email)) like '%@microsoft.com'
  and l.company is distinct from 'Microsoft';
-- 4 rijen: Arshad Syd, Greg Mills, Natalie Viskozki Knapp, Jens Mikosch.

-- Terugdraaien: haal de oude waarden uit de back-uptabellen.
--   update public.outreach_contact oc
--   set company = b.company, hook_note = b.hook_note
--   from public._dq_backup_outreach_contact_20261108 b where b.id = oc.id;
--   update public.marketing_leads l
--   set company = b.company
--   from public._dq_backup_marketing_leads_20261108 b where b.id = l.id;
