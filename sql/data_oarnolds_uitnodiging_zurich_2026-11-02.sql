-- De uitnodigingsrij van oarnolds@me.com naar zurich-2026.
--
-- WAT HET NIET WAS
--   Ik noemde deze rij eerder fout. Dat klopte niet helemaal. De rij is op
--   06-10-2026 aangemaakt voor amsterdam-2026, drie weken voor de aanmelding
--   voor Zurich op 29-10. Het was dus een echte Amsterdam-uitnodiging en geen
--   verschrijving.
--
-- WAAROM HIJ TOCH OM MOEST
--   De Leads-tab koppelt uitnodigingen aan leads op e-mailadres, dus er past er
--   maar een per adres. Zolang de rij op Amsterdam stond hing er een
--   Amsterdam-uitnodiging onder een Zurich-aanmelding, en dat levert bij elke
--   volgende stap de verkeerde tekst of de verkeerde telling op.
--
--   Wat hiermee uit de levende tabel verdwijnt is de vastlegging dat dit adres
--   ooit voor Amsterdam is uitgenodigd. Die staat in
--   _dq_backup_event_confirm_invites_20261102.
--
-- marketing_lead_id stond leeg en wijst nu naar de Zurich-lead.

create table if not exists _dq_backup_event_confirm_invites_20261102 as
  select * from event_confirm_invites;

update event_confirm_invites
   set event_slug = 'zurich-2026',
       marketing_lead_id = 'ff1d913b-6d4c-4613-a881-d1688518f234',
       updated_at = now()
 where lower(email) = 'oarnolds@me.com';
