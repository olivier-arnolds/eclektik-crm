-- Aanwezigheid bij de Glint user session: aangemeld / aanwezig / afwezig.
--
-- WAAROM EEN EIGEN KOLOM EN NIET answer
--   answer zegt wat de genodigde ZELF heeft laten weten (ja of nee), en die
--   kolom wordt alleen geschreven door de bevestiging vanaf de landingspagina.
--   Of iemand daarna ook echt kwam opdagen is een waarneming van ons, achteraf,
--   en hoort dus niet in een veld dat de deelnemer vult. Door elkaar halen zou
--   betekenen dat 'afwezig' het eerdere 'ja' uitwist, en dan is niet meer te
--   zien dat iemand zich had aangemeld.
--
-- AANGEMELD IS GEEN LEGE WAARDE
--   Iedereen in dit blok heeft ja gezegd, dus 'aangemeld' is de toestand waarin
--   zo'n rij begint. De kolom mag daarom null zijn: null leest in de tab als
--   aangemeld. Dat scheelt een backfill die hetzelfde zegt als de rij al zegt,
--   en 'aangemeld' kiezen in de keuzelijst zet de kolom weer leeg.
--
-- Geen backup nodig: dit voegt kolommen toe en raakt geen bestaande waarde.
-- Schrijvende kant: api/session-attendance-set.js (service key, want de tabel
-- staat op RLS zonder policies vanwege de tokens die erin staan).

alter table public.user_session_invites
  add column if not exists attendance text,
  add column if not exists attendance_at timestamptz,
  add column if not exists attendance_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_session_invites_attendance_check'
  ) then
    alter table public.user_session_invites
      add constraint user_session_invites_attendance_check
      check (attendance in ('aangemeld', 'aanwezig', 'afwezig'));
  end if;
end $$;

comment on column public.user_session_invites.attendance is
  'Waargenomen aanwezigheid: aanwezig of afwezig. Null of aangemeld = aangemeld, nog niets waargenomen.';
comment on column public.user_session_invites.attendance_by is
  'Het @eclectik.co-adres van de collega die dit vastlegde.';

-- De view opnieuw, met de drie kolommen achteraan. Achteraan en niet
-- tussengevoegd: create or replace view weigert een kolom te verplaatsen
-- ("cannot change name of view column").
create or replace view public.user_session_results as
 select id,
    contact_id,
    email,
    first_name,
    company,
    answer,
    confirmed,
    confirmed_at,
    answer_at,
    pending_answer,
    pending_at,
    click_count,
    bot_suspected,
    slots,
    cardinality(slots) as slot_count,
    note,
    submitted_at,
    created_at,
        case
            when confirmed and answer = 'yes'::text then 'yes'::text
            when confirmed and answer = 'no'::text then 'no'::text
            when pending_answer is not null then 'clicked_only'::text
            else 'no_response'::text
        end as status,
    source,
    registered_by,
    attendance,
    attendance_at,
    attendance_by
   from user_session_invites i;

revoke all on public.user_session_results from anon;
grant select on public.user_session_results to authenticated;

-- Terugdraaien:
--   alter table public.user_session_invites
--     drop constraint if exists user_session_invites_attendance_check,
--     drop column if exists attendance,
--     drop column if exists attendance_at,
--     drop column if exists attendance_by;
--   en de view opnieuw aanmaken zonder die drie kolommen.
