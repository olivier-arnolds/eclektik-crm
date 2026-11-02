-- event_confirm_results liet confirmation_sent_at niet zien.
--
-- WAAROM DAT ERG WAS
--   De Leads-tab leest deze view en niet de tabel, omdat de tabel per deelnemer
--   een token draagt waarmee je namens hem kunt antwoorden. De view gaf de
--   verzenddatum niet door, dus de tab kon niet tonen of de bevestigingsmail al
--   weg was. Samen met een tweede fout, een net aangemaakte rij die niet in
--   beeld kwam, leidde dat ertoe dat een deelnemer de bevestiging vier keer
--   kreeg: de keuzelijst sprong terug naar 'nog niets' en elke nieuwe poging
--   verstuurde opnieuw.

create or replace view event_confirm_results as
 select id, marketing_lead_id, email, first_name, event_slug, answer, answered_at,
    answer_count, created_at,
        case when answer is null then 'no_response'::text else answer end as status,
    answer_source, answer_by,
    confirmation_sent_at, confirmation_sent_to, confirmation_sent_by
   from event_confirm_invites i;
