-- Tweede mail voor de 184 contacten in "Amsterdam 2026" die alleen bericht 1
-- hadden en nog geen opvolgtekst.
--
-- Deze groep kreeg een ANDERE eerste mail dan de 85 die al een tweede mail
-- klaar hadden: de variant "AI lands on your team before it reaches the
-- boardroom", waarin het programma al volledig wordt uitgelegd. Een tweede mail
-- die dat herhaalt leest als een kopie, dus deze opent met de verzette datum en
-- noemt de keynote als reden om alsnog te komen.
--
-- Een persoonlijke openingszin per bedrijf, zoals bij die 85, is bewust
-- losgelaten: hij voelde gemaakt. Daardoor is de tekst voor alle 184 gelijk op
-- de voornaam na, en is er geen AI-ronde per contact nodig.
--
-- Het onderwerp komt uit subjectForStep: msg2_subject blijft leeg, dus er gaat
-- "Re: " voor het onderwerp van bericht 1. Afzender is marco@eclectik.co, de
-- campagne-instelling; handtekening uit, afmeldregel aan.
--
-- Backup: _dq_backup_outreach_contact_20261103b (hele tabel).

update outreach_contact
set msg2_body = 'Hi ' || trim(first_name) || E',\n\nI wrote a few weeks ago about 17 November. It is close now.\n\nDo you want to connect with peers about HR’s role and importance in the AI transformation? Prof. dr. Marc van Veldhoven of Tilburg University opens with why implemented is not the same as experienced, and why that gap is wider with AI than with anything before it.\n\nAfter that we focus on where AI lands as help and where as extra pressure, which levers you actually control, and how to tell a working pilot from an expensive one.\n\nProgramme and registration: https://www.eclectik.co/events/amsterdam-2026\n\nShall I hold a seat for you?\n\nMarco\n\nLocation: Zoom Office Amsterdam, Parnassus Tower, 12:15 to 16:30.',
    updated_at = now()
where campaign_id = '5caf44f8-e6cc-4ecc-a61f-c729c7155089'
  and status = 'msg1_sent'
  and coalesce(msg2_body,'') = ''
  and is_reserve = false
  and coalesce(trim(first_name),'') <> '';
-- 184 rijen bijgewerkt op 2026-11-03.
