-- Waar een antwoord op de eventuitnodiging vandaan komt.
--
-- WAAROM
--   De mail met de bevestigingsknop komt slecht aan. Mensen mailen daarom
--   rechtstreeks terug en iemand van het team zet het antwoord met de hand.
--   Zonder dit veld beweert de tabel dat die persoon zelf op de knop heeft
--   gedrukt, en dat is simpelweg onwaar.

alter table public.event_confirm_invites
  add column if not exists answer_source text,
  add column if not exists answer_by text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_confirm_answer_source_check') then
    alter table public.event_confirm_invites
      add constraint event_confirm_answer_source_check
      check (answer_source is null or answer_source in ('link', 'manual'));
  end if;
end $$;

comment on column public.event_confirm_invites.answer_source is
  'link = de deelnemer klikte zelf op de bevestigingspagina. manual = iemand van het team zette het antwoord met de hand, bijvoorbeeld na een mail.';
comment on column public.event_confirm_invites.answer_by is
  'Wie het met de hand zette. Alleen gevuld bij answer_source = manual.';

-- De twee bestaande antwoorden met terugwerkende kracht eerlijk maken.
update public.event_confirm_invites set answer_source = 'link'
  where answer is not null and answer_source is null and lower(email) = 'laura.roos@fagron.com';
update public.event_confirm_invites set answer_source = 'manual', answer_by = 'olivier@eclectik.co'
  where answer is not null and answer_source is null;

create or replace view public.event_confirm_results as
  select i.id, i.marketing_lead_id, i.email, i.first_name, i.event_slug,
         i.answer, i.answered_at, i.answer_count, i.created_at,
         case when i.answer is null then 'no_response' else i.answer end as status,
         i.answer_source, i.answer_by
    from public.event_confirm_invites i;

-- Terugdraaien: drop de twee kolommen en de check, en maak de view opnieuw
-- zonder answer_source en answer_by.
