-- Dubbele inbound-regels opruimen. Ontstaan doordat de scan sinds v1.98.0 de hele
-- mailbox leest: Graph geeft een bericht een NIEUW id zodra het naar een andere
-- map verplaatst wordt, dus een inmiddels gearchiveerd antwoord kwam terug met een
-- ander provider_message_id en werd een tweede keer weggeschreven.
--
-- Structureel opgelost in v1.98.1 door ook op internetMessageId te ontdubbelen;
-- dit ruimt de 5 regels op die daarvoor al ontstaan waren.
-- Backup: _dq_backup_outreach_message_20260911. Toegepast 2026-09-11.
with dubbel as (
  select id, row_number() over (
           partition by campaign_id, direction, from_address, sent_or_received_at
           order by created_at, id
         ) as rn
  from outreach_message
  where direction = 'inbound'
)
delete from outreach_message m
using dubbel d
where m.id = d.id and d.rn > 1;
