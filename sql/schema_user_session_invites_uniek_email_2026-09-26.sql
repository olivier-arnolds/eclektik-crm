-- Een uitnodiging per adres, afgedwongen door de database.
-- Toegepast op 26 september 2026 via de Supabase MCP.
--
-- De marketingtab maakt tokens aan vlak voor het verzenden en moet een bestaand
-- token ALTIJD hergebruiken: een tweede token voor hetzelfde adres maakt de link
-- uit een eerdere mail dood. Dat hergebruik leunde op een lookup in de
-- applicatie, en dat is een belofte, geen garantie.
--
-- Genormaliseerd op lower(btrim(email)), gelijk aan wat de composer matcht.
-- De tabel was leeg bij toepassen, dus er kon niets botsen.
create unique index if not exists user_session_invites_email_uniek
  on public.user_session_invites (lower(btrim(email)));

comment on index public.user_session_invites_email_uniek is
  'Een uitnodiging per adres. Maakt hergebruik van een bestaand token een garantie in plaats van applicatielogica.';

-- Terugdraaien:
-- drop index public.user_session_invites_email_uniek;
