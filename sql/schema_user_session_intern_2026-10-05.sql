-- Interne aanmeldingen voor de Viva Glint user session (/s/intern op de website).
--
-- Een collega van CS of PS meldt iemand aan die in een call of per mail heeft
-- gezegd mee te willen doen. Dat moet in dezelfde tabel landen als de
-- aanmeldingen via de uitnodigingsmail, anders klopt de telling per datum niet.
--
-- WAT ER AL WAS
--   De spec vroeg om drie kolommen: email, source en registered_by. email stond
--   er al, is NOT NULL en heeft sinds 26 september de unieke index
--   user_session_invites_email_uniek op lower(btrim(email)). Dus alleen de twee
--   nieuwe kolommen, en geen backfill van e-mailadressen: die zijn er.
--
-- SOURCE HEEFT EEN DEFAULT EN EEN CHECK
--   Default 'email_link' zodat elke bestaande rij en elke rij die langs een
--   andere weg binnenkomt meteen goed staat, zonder dat iemand eraan hoeft te
--   denken. De check houdt de twee waarden af van typefouten; dit veld stuurt
--   straks een telling aan waar Yarmilla op vaart.

alter table public.user_session_invites
  add column if not exists source text not null default 'email_link',
  add column if not exists registered_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_session_invites_source_check'
  ) then
    alter table public.user_session_invites
      add constraint user_session_invites_source_check
      check (source in ('email_link', 'internal'));
  end if;
end $$;

comment on column public.user_session_invites.source is
  'email_link = de klant antwoordde zelf via de link in de uitnodiging. internal = een collega meldde hem aan via /s/intern.';
comment on column public.user_session_invites.registered_by is
  'Het @eclectik.co-adres van de collega die de aanmelding deed. Alleen gevuld bij source = internal.';

-- De view toont de uitkomsten zonder het token: wie een token heeft kan namens
-- die persoon antwoorden. source en registered_by horen daar wel in, want het
-- team moet kunnen zien wie zich zelf aanmeldde en wie via een collega binnenkwam.
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
    -- Achteraan en niet tussengevoegd: create or replace view weigert een kolom
    -- te verplaatsen ("cannot change name of view column"). Achteraan aanvullen
    -- mag wel, en dat scheelt een drop van de view terwijl de tab hem leest.
    source,
    registered_by
   from user_session_invites i;

-- Terugdraaien:
--   alter table public.user_session_invites
--     drop constraint if exists user_session_invites_source_check,
--     drop column if exists source,
--     drop column if exists registered_by;
--   en de view opnieuw aanmaken zonder die twee kolommen.
