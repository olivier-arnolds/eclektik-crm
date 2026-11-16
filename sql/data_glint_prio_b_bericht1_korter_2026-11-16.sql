-- Bericht 1 van de campagne Glint Prioriteit B: korter en platform-neutraal.
--
-- WAAROM
--   Bericht 1 was mediaan 278 woorden, waarvan er maar ongeveer 42 per contact
--   geschreven waren. De rest was voor alle 195 woordelijk hetzelfde. Twee
--   problemen daarmee:
--
--   1. De AI-alinea (106 woorden, alinea 4) is een tweede pitch naast de eerste.
--      Hij concurreert met de aanleiding waarmee de mail opent en duwt de link
--      en de slotvraag onder de vouw. Die alinea gaat er hier uit. De inhoud
--      blijft bestaan als bericht 2 (zie het losse voorstel met de Microsoft
--      Glint Labs-cijfers); dit bestand raakt msg2 niet aan.
--
--   2. Variant A zei 'the Glint tenant you already have'. Dat is een controleerbare
--      bewering over de stack van de lezer. Van de 59 contacten in die variant
--      rust die bewering bij 41 op een zwak of onbevestigd signaal (een losse
--      medewerkerspost, een leverancierslijst, een vacaturesignaal). Een lezer
--      die geen Glint draait valt daar meteen over en de rest van de mail is dan
--      verloren. Alleen de 18 met bewijskracht Sterk of Middel houden die
--      formulering; de andere 177 krijgen een insteek op employee engagement
--      zonder uitspraak over hun platform.
--
-- WAT ER PRECIES GEBEURT
--   Alle 195 bodies bestaan uit exact zeven alinea's, gescheiden door een lege
--   regel (geverifieerd: 195 van 195, AI-blok altijd op plek 4, link altijd op
--   plek 5):
--     1 aanhef          2 persoonlijke aanleiding   3 middenalinea
--     4 AI-alinea       5 link                      6 slotvraag      7 Olivier
--   Alinea 3 wordt vervangen, alinea 4 verdwijnt. 1, 2, 5, 6 en 7 blijven
--   woordelijk staan, dus het per contact geschreven stuk blijft intact.
--   Resultaat: ongeveer 135 woorden in plaats van 278.
--
-- DE 18 MET HARD BEWIJS
--   Komen uit de kolom Bewijskracht van outreach-glint-prio-b-2026-11-13.xlsx,
--   variant A met waarde Sterk of Middel. Hieronder op e-mailadres vastgelegd,
--   want die kolom staat niet in de database.
--
-- Prioriteit A wordt NIET geraakt. Daar is bericht 1 al verstuurd (258 stuks,
-- 28 september tot 9 oktober), dus aanpassen heeft daar geen zin meer.
--
-- Back-up vooraf: _dq_backup_outreach_contact_priob_msg1_20261116.

create table if not exists public._dq_backup_outreach_contact_priob_msg1_20261116 as
select oc.*
from public.outreach_contact oc
join public.outreach_campaign c on c.id = oc.campaign_id
where c.name = 'Glint Prioriteit B';

-- 1. De 18 met Sterk of Middel bewijs: Glint-formulering blijft, korter.
update public.outreach_contact oc
set msg1_body = array_to_string(
      array[
        (string_to_array(oc.msg1_body, E'\n\n'))[1],
        (string_to_array(oc.msg1_body, E'\n\n'))[2],
        'Engagement programmes leak in the same places, whatever the platform: managers who get a dashboard without knowing what is theirs to fix, and plans written in the fortnight after the readout and never reopened. We work inside the Glint tenant you already have. A customer success lead runs the mechanics, an organisational psychologist owns the question set and the executive readout. What comes back is three strengths and three focus areas, cut by site, length of service and grade.',
        (string_to_array(oc.msg1_body, E'\n\n'))[5],
        (string_to_array(oc.msg1_body, E'\n\n'))[6],
        (string_to_array(oc.msg1_body, E'\n\n'))[7]
      ], E'\n\n'),
    updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Glint Prioriteit B'
  and array_length(string_to_array(oc.msg1_body, E'\n\n'), 1) = 7
  and (string_to_array(oc.msg1_body, E'\n\n'))[4] like 'AI arrives the same way.%'
  and lower(btrim(oc.email)) in (
    'amckinley@ebay.com',
    'america.miglets@crowncork.com',
    'aprice@ctbonline.com',
    'danielle.clark@ebay.com',
    'do@ebay.com',
    'ellen.williams@carvana.com',
    'gloria.pucciatti@justeattakeaway.com',
    'lscarborough@ctbonline.com',
    'mary.falank@crowncork.com',
    'mathijs.vanveen@justeattakeaway.com',
    'michael.saywell@carvana.com',
    'paul.theine@carvana.com',
    'philip.karnoe@justeattakeaway.com',
    'ritika.bhalla@ebay.com',
    'ryan.lynnwatts@kiwibank.co.nz',
    'sheri.carroll@crowncork.com',
    'terence.guiamo@justeattakeaway.com',
    'tori.dixon@carvana.com'
  );

-- 2. De overige 177: geen uitspraak over het platform van de lezer.
update public.outreach_contact oc
set msg1_body = array_to_string(
      array[
        (string_to_array(oc.msg1_body, E'\n\n'))[1],
        (string_to_array(oc.msg1_body, E'\n\n'))[2],
        'Whatever you use to listen, engagement programmes leak in the same places: managers who get a dashboard without knowing what is theirs to fix, and plans written in the fortnight after the readout and never reopened. We have spent years doing that work, much of it inside Viva Glint environments. A customer success lead runs the mechanics, an organisational psychologist owns the question set and the executive readout. What comes back is three strengths and three focus areas, cut by site, length of service and grade.',
        (string_to_array(oc.msg1_body, E'\n\n'))[5],
        (string_to_array(oc.msg1_body, E'\n\n'))[6],
        (string_to_array(oc.msg1_body, E'\n\n'))[7]
      ], E'\n\n'),
    updated_at = now()
from public.outreach_campaign c
where c.id = oc.campaign_id
  and c.name = 'Glint Prioriteit B'
  and array_length(string_to_array(oc.msg1_body, E'\n\n'), 1) = 7
  and (string_to_array(oc.msg1_body, E'\n\n'))[4] like 'AI arrives the same way.%';

-- Terugdraaien:
--   update public.outreach_contact oc
--   set msg1_subject = b.msg1_subject, msg1_body = b.msg1_body
--   from public._dq_backup_outreach_contact_priob_msg1_20261116 b
--   where b.id = oc.id;
