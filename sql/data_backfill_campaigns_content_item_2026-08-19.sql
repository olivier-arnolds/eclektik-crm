-- Eenmalige backfill: koppel bestaande content-e-mailitems aan hun campagne via
-- het opgeslagen broadcast-id. Werkt voor het normale broadcast-pad; drip-items
-- krijgen alleen hun laatste batch (het item bewaart maar één broadcast-id).
--
-- Protocol: maak eerst een backup als de update daadwerkelijk rijen raakt. Bij
-- toepassing op 2026-08-19 was dit een no-op (0 rijen: nog geen verstuurde
-- content-mails), dus is de backup overgeslagen. Draai bij een niet-lege set
-- eerst de backup hieronder.

-- create table if not exists _dq_backup_campaigns_20260819 as select * from campaigns;

update campaigns c
set content_item_id = ci.id
from content_calendar_items ci
where ci.type = 'email'
  and ci.external_message_id is not null
  and c.resend_broadcast_id = ci.external_message_id
  and c.content_item_id is null;
