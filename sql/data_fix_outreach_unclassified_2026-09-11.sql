-- Herstel na de fout in api/outreach-classify.js: een inkomend antwoord waarvan
-- de classificatie niets bruikbaars opleverde werd wel vastgelegd in
-- outreach_message, maar liet outreach_contact volledig ongemoeid. Gevolg: geen
-- last_inbound_at, niet zichtbaar als 'Onbeantwoord', en de opvolgmail bleef
-- ingepland naar iemand die al geantwoord had.
--
-- Betrof 2 prospects met een out-of-office van 10 september. Toegepast 2026-09-11.
-- Terug te draaien via _dq_backup_outreach_contact_20260911.
with laatste as (
  select distinct on (m.contact_id) m.contact_id, m.sent_or_received_at, m.body_preview
  from outreach_message m
  where m.direction = 'inbound' and m.contact_id is not null and m.classification is null
  order by m.contact_id, m.sent_or_received_at desc
)
update outreach_contact oc
set last_inbound_at = l.sent_or_received_at,
    last_reply_summary = left(regexp_replace(coalesce(l.body_preview,''), '\s+', ' ', 'g'), 500),
    next_action_at = null,
    paused_reason = 'check handmatig: onbekend (0%)',
    updated_at = now()
from laatste l
where oc.id = l.contact_id and oc.last_inbound_at is null;
