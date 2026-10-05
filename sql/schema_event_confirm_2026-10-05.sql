-- Bevestigingen voor het event in Amsterdam (/e/:token op de website).
-- Wie zich inschreef toen het nog 6 oktober was, laat met een klik weten of de
-- nieuwe datum schikt.
--
-- EIGEN TABEL
--   Niet een paar kolommen op marketing_leads: een lead is breder dan dit event,
--   en deze tabel draagt een token. Wie een token heeft kan namens die persoon
--   antwoorden, dus dat veld hoort achter de service-key en niet in een view die
--   het team leest. Zelfde opzet als user_session_invites.

create table if not exists public.event_confirm_invites (
  id                uuid primary key default gen_random_uuid(),
  token             text not null unique,
  marketing_lead_id uuid references public.marketing_leads(id) on delete cascade,
  email             text not null,
  first_name        text,
  event_slug        text not null default 'amsterdam-2026',
  answer            text check (answer in ('yes', 'no')),
  answered_at       timestamptz,
  answer_count      int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists event_confirm_invites_email_uniek
  on public.event_confirm_invites (lower(btrim(email)), event_slug);
create index if not exists idx_event_confirm_invites_answer
  on public.event_confirm_invites (answer);

comment on column public.event_confirm_invites.answer_count is
  'Hoe vaak er geantwoord is. Iemand mag zich bedenken; dan telt dit op en wint het laatste antwoord.';

create or replace view public.event_confirm_results as
  select i.id, i.marketing_lead_id, i.email, i.first_name, i.event_slug,
         i.answer, i.answered_at, i.answer_count, i.created_at,
         case when i.answer is null then 'no_response' else i.answer end as status
    from public.event_confirm_invites i;

-- Tokens voor de bestaande inschrijvingen. 24 bytes toeval, base64url gemaakt:
-- 32 tekens uit A-Za-z0-9_- , dus binnen de regex die de website hanteert.
insert into event_confirm_invites (token, marketing_lead_id, email, first_name, event_slug)
select translate(rtrim(encode(gen_random_bytes(24), 'base64'), '='), '+/', '-_'),
       l.id, lower(btrim(l.email)), split_part(btrim(l.full_name), ' ', 1), 'amsterdam-2026'
from marketing_leads l
where exists (
  select 1 from marketing_lead_activity a
  where a.marketing_lead_id = l.id and a.event = 'event_registered'
    and a.payload->>'eventSlug' = 'amsterdam-2026')
on conflict do nothing;
-- 13 rijen. Dezelfde query is veilig opnieuw te draaien als er inschrijvingen
-- bijkomen: on conflict do nothing laat bestaande tokens met rust, en een
-- bestaand token moet blijven leven omdat het in een verstuurde mail staat.

-- Terugdraaien:
--   drop view if exists public.event_confirm_results;
--   drop table if exists public.event_confirm_invites;
