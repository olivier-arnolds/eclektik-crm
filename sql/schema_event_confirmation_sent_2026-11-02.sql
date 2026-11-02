-- Bijhouden wanneer de bevestigingsmail met de eventdetails is verstuurd.
--
-- WAAROM LOS VAN answer
--   answer zegt of iemand komt. Of hij de mail met tijd, adres en zaalnamen ook
--   gekregen heeft is iets anders: je kunt op 'komt' staan zonder dat die mail
--   al weg is. In een lijst waar je bij twijfel niet opnieuw wilt sturen moet
--   dat uit elkaar te houden zijn, en de tab zet er een envelopje bij zodra het
--   echt verstuurd is.
--
-- answer kreeg er een waarde bij: 'confirmed', naast 'yes' en 'no'. Geen check
-- constraint op die kolom, dus er is geen DDL voor nodig.

alter table event_confirm_invites
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_sent_to text,
  add column if not exists confirmation_sent_by text;

comment on column event_confirm_invites.confirmation_sent_at is
  'Wanneer de bevestigingsmail met de eventdetails is verstuurd. Leeg = nog niet verstuurd. Staat los van answer: iemand kan op yes staan zonder dat de bevestiging al weg is.';
