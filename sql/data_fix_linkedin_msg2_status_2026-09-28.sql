-- Reparatie na de bug in statusAfterSend (v1.134.4).
--
-- De kanaalcheck stond voor de stapcheck, dus een verstuurde LinkedIn-herinnering
-- liet het contact op msg1_sent staan. stepForStatus('msg1_sent') is 2, dus die
-- tien mensen stonden bij de volgende ronde weer klaar voor precies het bericht
-- dat ze net gekregen hadden.
--
-- De code is gerepareerd; dit zet de rijen recht die er al doorheen waren.
-- Alleen contacten met een echt weggeschreven uitgaand stap-2-bericht worden
-- aangeraakt, dus dit kan niet per ongeluk iemand overslaan die nog niets kreeg.

create table _dq_backup_outreach_contact_20260928 as
select * from outreach_contact
where campaign_id = '61096375-a56f-4748-a08a-ce5413da0389';
-- 154 rijen

update outreach_contact c
set status = 'msg2_sent', next_action_at = null, updated_at = now()
where c.campaign_id = '61096375-a56f-4748-a08a-ce5413da0389'
  and c.status = 'msg1_sent'
  and exists (select 1 from outreach_message m
              where m.contact_id = c.id and m.sequence_step = 2 and m.direction = 'outbound');
-- 10 rijen bijgewerkt

-- Controle achteraf: msg1_sent 130, msg2_sent 10, replied 10, paused 4.
