-- user_session_invites: de Ja/Nee-uitnodiging voor de Glint user session, met de
-- landingspagina's op eclectik.co achter de twee knoppen in de mail.
-- Contract: eclectik-website docs/superpowers/specs/2026-09-25-glint-user-session-design.md
-- (datamodel en HTTP-contract). Schrijvende kant: api/session-invite.js.
--
-- NOG NIET TOEGEPAST (25 sep 2026). Dit bestand is opgeleverd om te draaien in de
-- Supabase SQL Editor of via apply_migration, nadat Olivier het heeft gelezen.
-- De database bevat echte contacten; het aanmaken van een nieuwe tabel raakt geen
-- bestaande rij, maar het moment van draaien is een beslissing van de eigenaar.
-- Er valt dus ook niets te backuppen: alles hieronder is nieuw.
--
-- WAAROM EEN PROVISIONELE KOLOM
--   pending_answer wordt geschreven door de klik vanuit de mail, en dus ook door
--   de linkscanners van Outlook en Mimecast die elke URL in een bericht openen.
--   answer wordt alleen gevuld door de bevestiging vanaf de landingspagina, met
--   het antwoord dat die pagina meestuurt. Een scanner kan answer daardoor per
--   definitie niet raken, ook niet als hij later de andere link ophaalt.
--
-- AFSCHERMING (bewuste afwijking van de huisregel)
--   De huisregel is RLS aan met de uniforme policy "auth users full access on
--   <tabel>". Hier niet. In deze tabel staan de tokens uit de mail, en wie een
--   token heeft kan namens die persoon antwoorden. Alleen de service key
--   (api/session-invite.js) leest en schrijft, net als bij form_responses. Het
--   team leest de uitkomsten via de view onderaan, die het token weglaat.

-- ── 1. Tabel ────────────────────────────────────────────────────────────────
create table if not exists public.user_session_invites (
  id uuid primary key default gen_random_uuid(),
  -- Willekeurig, url-safe, minstens 22 tekens. Geen oplopend nummer en geen
  -- afgeleide van het e-mailadres: beide zijn te raden, en met een geraden token
  -- kun je namens iemand anders antwoorden. Zie scripts/maak-session-invites.py.
  token text unique not null,
  contact_id uuid references public.contacts(id),
  email text not null,
  first_name text,
  company text,

  -- Provisioneel: geschreven door de klik, dus ook door linkscanners.
  pending_answer text check (pending_answer in ('yes','no')),
  pending_at timestamptz,
  click_count int not null default 0,

  -- Pas gevuld door de bevestiging vanuit een echte browser.
  answer text check (answer in ('yes','no')),
  answer_at timestamptz,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  -- Komt als boolean binnen van de site (die kijkt naar de user agent). Wij slaan
  -- de user agent zelf niet op, en het IP-adres ook niet.
  bot_suspected boolean not null default false,

  slots text[] not null default '{}',
  note text,
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_session_invites is
  'Uitnodiging per ontvanger voor de Glint user session. Afgeschermd: alleen de service key. Uitkomsten via de view user_session_results.';
comment on column public.user_session_invites.pending_answer is
  'Antwoord uit de klik op de mailknop. Kan van een linkscanner komen en telt daarom niet als antwoord.';
comment on column public.user_session_invites.answer is
  'Het bevestigde antwoord, alleen geschreven door de confirm vanaf de landingspagina.';
comment on column public.user_session_invites.bot_suspected is
  'True zodra een klik er als een scanner uitzag. Blijft daarna staan; confirmed=true is het bewijs dat er een mens was.';

-- ── 2. Indexen ──────────────────────────────────────────────────────────────
-- Opzoeken op token bij elke klik, bevestiging en verzending.
-- Let op: de unique-constraint hierboven maakt al een index op token. Deze staat
-- er omdat het contract hem noemt; hij is functioneel overbodig en kan zonder
-- gevolgen weg (drop index idx_user_session_invites_token).
create index if not exists idx_user_session_invites_token
  on public.user_session_invites (token);
-- Uitlezen van de uitkomst: wie heeft ja gezegd, en is dat bevestigd.
create index if not exists idx_user_session_invites_answer
  on public.user_session_invites (answer, confirmed);

-- ── 3. RLS: aan, en geen enkele policy ──────────────────────────────────────
-- Geen policy betekent: anon niet, authenticated niet. De service key gaat als
-- enige langs RLS heen. De revoke is dubbelop met RLS en staat er bewust:
-- Supabase geeft anon standaard rechten op nieuwe tabellen in public, en twee
-- sloten op een tabel met tokens erin is de moeite waard.
alter table public.user_session_invites enable row level security;
revoke all on public.user_session_invites from anon;

-- ── 4. View met de uitkomsten (zonder token) ────────────────────────────────
-- Een view draait met de rechten van de eigenaar en ziet de tabel dus langs RLS
-- heen. Precies daarom staat het token er niet in en wordt anon hieronder
-- uitgesloten: zonder die revoke zou de anon key deze view wel kunnen lezen.
create or replace view public.user_session_results as
select
  i.id,
  i.contact_id,
  i.email,
  i.first_name,
  i.company,
  i.answer,
  i.confirmed,
  i.confirmed_at,
  i.answer_at,
  i.pending_answer,
  i.pending_at,
  i.click_count,
  i.bot_suspected,
  i.slots,
  cardinality(i.slots) as slot_count,
  i.note,
  i.submitted_at,
  i.created_at,
  -- Vier toestanden, in de volgorde waarin je ze wilt zien: bevestigd ja,
  -- bevestigd nee, alleen aangeklikt (nog niets waard), en niets gehoord.
  case
    when i.confirmed and i.answer = 'yes' then 'yes'
    when i.confirmed and i.answer = 'no'  then 'no'
    when i.pending_answer is not null      then 'clicked_only'
    else 'no_response'
  end as status
from public.user_session_invites i;

comment on view public.user_session_results is
  'Uitkomsten van de user-session-uitnodigingen, zonder token. Voor het team; anon heeft geen rechten.';

revoke all on public.user_session_results from anon;
grant select on public.user_session_results to authenticated;

-- Terugdraaien:
-- drop view if exists public.user_session_results;
-- drop table if exists public.user_session_invites;
