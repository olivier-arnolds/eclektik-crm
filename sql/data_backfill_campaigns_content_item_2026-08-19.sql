-- Eenmalige backfill: koppel bestaande content-e-mailitems aan hun campagne(s),
-- zodat de engagement-RPC (content_item_engagement) ook historische verzendingen
-- meetelt.
--
-- Protocol: maak eerst een backup als de update daadwerkelijk rijen raakt:
--   create table if not exists _dq_backup_campaigns_<datum> as select * from campaigns;
-- Draai daarna de twee updates hieronder en verifieer de counts.

-- 1) Afgeronde verzendingen: external_message_id is bij publish gezet en gelijk
--    aan de Resend broadcast-id. Directe, veilige match.
update campaigns c
set content_item_id = ci.id
from content_calendar_items ci
where ci.type = 'email'
  and ci.external_message_id is not null
  and c.resend_broadcast_id = ci.external_message_id
  and c.content_item_id is null;

-- 2) Nog-lopende drips: external_message_id is dan nog NULL (die wordt pas bij de
--    finale publish gezet), dus stap 1 pakt ze niet. Match daarom op de
--    campagnenaam, die door de cron als "[kanaal] <onderwerp> (drip)" of
--    "[kanaal] <onderwerp>" wordt gezet en dus het onderwerp bevat.
--    LET OP: dit matcht op onderwerp-substring; bij twee e-mailitems met een
--    identiek onderwerp kan dit mis-koppelen. Handmatig scopen (per ci.id) als
--    dat risico bestaat.
update campaigns c
set content_item_id = ci.id
from content_calendar_items ci
where ci.type = 'email'
  and c.content_item_id is null
  and c.channel = 'broadcast'
  and c.name ilike '%' || ci.subject || '%';

-- Verifieer:
--   select count(*) from campaigns where content_item_id is not null;
--   select * from content_item_engagement('<item-id>');
