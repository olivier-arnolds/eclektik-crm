-- Nieuwe herinneringstekst voor de LinkedIn-campagne "Amsterdam 2026 LinkedIn".
--
-- Aanleiding: de 122 contacten met status msg1_sent kregen hun eerste bericht
-- tussen 11 en 22 september, toen het event nog op 6 oktober stond. De datum is
-- verzet naar 17 november. De oude herinnering ("Just a friendly reminder...")
-- noemt alleen de nieuwe datum zonder te zeggen DAT hij verzet is, en dan leest
-- een tweede bericht als aandringen in plaats van als nieuws.
--
-- Alleen status='msg1_sent' wordt geraakt. De runner pakt namelijk uitsluitend
-- 'queued' en 'msg1_sent' op (api/_lib/outreach-runner.js), dus bij de 18 met
-- status msg2_sent zou een nieuwe tekst wel in de database staan maar nooit
-- verstuurd worden. Die groep vraagt een aparte beslissing.
--
-- Backup: _dq_backup_outreach_contact_20261103 (hele tabel, 2247 rijen).

update outreach_contact
set msg2_body = 'Hi ' || trim(first_name) || E',\n\nA quick follow up on my earlier message, with one important change. The session has moved to 17 November.\n\nWe will be looking at HR''s role in AI transformation. Not the technology side, but the part that decides whether it lands: how people actually experience the change, how you measure that, and how you steer on it.\n\nFull programme and registration here: https://www.eclectik.co/events/amsterdam-2026\n\nDoes 17 November work for you?\n\nMarco',
    updated_at = now()
where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389'
  and status = 'msg1_sent';
-- 122 rijen bijgewerkt op 2026-11-03.
