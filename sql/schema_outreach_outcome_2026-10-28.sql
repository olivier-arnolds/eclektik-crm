-- Uitkomst per outreachcontact: 'afspraak' of 'geen_interesse', vastgelegd met
-- de hand in Marketing > Outreach.
--
-- WAAROM EEN EIGEN KOLOM EN NIET EEN STATUS ERBIJ
--   status beschrijft waar iemand in de reeks staat (queued, msg1_sent, done).
--   Die wordt door de verzend- en inboxlogica gezet en gelezen. Een uitkomst is
--   iets anders: het oordeel van een mens over het gesprek. Door die twee in een
--   kolom te proppen zou 'afspraak' meeliften in elke selectie die op status
--   filtert, en dat is precies waar zulke velden stuk gaan.
--
-- BEIDE WAARDEN STOPPEN DE REEKS
--   Het endpoint zet status op 'done' en next_action_at op null. De opvolgmail
--   is bedoeld voor stilte, en die is er na een afspraak of een afwijzing niet
--   meer.
--
-- marketing_lead_id BLIJFT STAAN BIJ TERUGDRAAIEN
--   Wie de keuze corrigeert haalt de lead niet weg. Die rij bestaat, er kan al
--   iemand mee bezig zijn, en stilletjes verdwijnen is erger dan een lead die
--   achteraf niets wordt.

alter table outreach_contact
  add column if not exists outcome      text,
  add column if not exists outcome_at   timestamptz,
  add column if not exists outcome_by   text,
  add column if not exists marketing_lead_id uuid references marketing_leads(id);

alter table outreach_contact drop constraint if exists outreach_contact_outcome_chk;
alter table outreach_contact add constraint outreach_contact_outcome_chk
  check (outcome is null or outcome in ('afspraak', 'geen_interesse'));

comment on column outreach_contact.outcome is
  'Uitkomst die een mens vastlegt in de outreachlijst. afspraak zet de persoon ook in Marketing > Leads; beide waarden stoppen de reeks.';
comment on column outreach_contact.marketing_lead_id is
  'De lead-rij die bij een afspraak is aangemaakt of bijgewerkt. Blijft staan als de keuze later wordt teruggedraaid, zodat de lead niet stilletjes verdwijnt.';
