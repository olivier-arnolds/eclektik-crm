-- De doorverwijzingen uit de bestaande afwezigheidsberichten geoogst.
--
-- WAAROM DIT BESTAND BESTAAT
--   De classificatie haalde referral_name en referral_email al uit elk antwoord,
--   maar niets sloeg ze op (zie de migratie outreach_referral_en_ooo_bewaren en
--   de wijziging in api/outreach-classify.js). Alles wat daarvoor binnenkwam is
--   dus zonder die velden opgeslagen. De teksten stonden er nog wel, in
--   body_full en body_preview, dus de oogst kon alsnog.
--
-- WAT ER IS NAGELOPEN
--   Alle 85 binnengekomen antwoorden met classificatie 'ooo' of 'referral'.
--   Niet alleen de 43 die een eerdere zoekterm ving: die zoekterm miste
--   formuleringen als "redirect your request to" en ving omgekeerd disclaimers
--   die niets met een doorverwijzing te maken hadden.
--
--   Resultaat: 29 berichten met een doorverwijzing, waarvan 21 met een
--   e-mailadres, verdeeld over 26 prospects.
--
-- WELKE REGELS ZIJN GEVOLGD
--   Wel overgenomen: een met naam genoemde vervanger ("neem contact op met mijn
--   collega X"), ook als het antwoord verder een gewone afwezigheid was.
--   Niet overgenomen:
--     - een algemene postbus (hr@, info@, people@, marketing.nl@). Daar zit geen
--       persoon achter om te benaderen.
--     - een doorverwijzing die uitdrukkelijk over een ander onderwerp gaat
--       ("voor vragen over CatMan"). Dat is geen doorverwijzing voor ons.
--     - een naam zonder achternaam naast een algemene postbus.
--   Waar iemand meerdere mensen noemde is de eerstgenoemde of de meest
--   passende genomen; de volledige tekst blijft in body_full staan, dus de
--   anderen zijn niet verloren.
--
--   Waar alleen een e-mailadres stond en geen naam, is referral_name leeg
--   gelaten. Een naam afleiden uit het adres is gokken, en een verkeerde
--   naam in een mail is erger dan geen naam.
--
-- DE CONTACTEN ZIJN GEMARKEERD
--   Dezelfde reden die de scan nu zelf schrijft: 'doorverwijzing: <naam>'. Een
--   reden die een mens had ingetypt is met rust gelaten; alleen lege redenen en
--   redenen die een scan zelf schreef zijn overschreven.
--
-- Geen back-up vooraf: dit vult twee lege kolommen en raakt verder alleen
-- paused_reason van rijen waar niemand iets met de hand had ingevuld.
-- Toegepast op 27 november 2026.

-- 1. De 29 doorverwijzingen zijn RECHTSTREEKS op de database toegepast en staan
--    bewust NIET in dit bestand.
--
--    WAAROM NIET
--      Het waren 29 namen en 21 e-mailadressen van mensen buiten Eclectik, die
--      niets met ons te maken hebben behalve dat hun collega met vakantie was.
--      Zo'n lijst in een git-repo zetten betekent dat hij voorgoed in de
--      geschiedenis staat, meekomt met elke kloon en buiten de database valt
--      waar het toegangsbeheer op zit. De plek voor die gegevens is
--      outreach_message.referral_name en referral_email, en daar staan ze.
--
--    De bron is niet weg: elk van deze 29 waarden komt uit de tekst van het
--    antwoord zelf, die in outreach_message.body_full staat. Opnieuw oogsten kan
--    dus altijd, met de query hieronder als startpunt.
--
--      select id, from_address, coalesce(body_full, body_preview)
--      from public.outreach_message
--      where direction = 'inbound' and classification in ('ooo','referral')
--        and referral_name is null and referral_email is null
--      order by id;
--
--    De update zelf had deze vorm:
--      update public.outreach_message m
--      set referral_name = v.naam, referral_email = v.mail
--      from (values (<id>::uuid, <naam>, <mail>), ...) as v(id, naam, mail)
--      where m.id = v.id;

-- 2. De prospect markeren, met de nieuwste doorverwijzing als er meerdere zijn.
--    Twee van deze mensen schreven twee keer een afwezigheidsbericht met een
--    andere vervanger erin; dan telt de laatste.
with laatste as (
  select distinct on (m.contact_id) m.contact_id, m.referral_name, m.referral_email
  from public.outreach_message m
  where m.direction = 'inbound'
    and (m.referral_name is not null or m.referral_email is not null)
    and m.contact_id is not null
  order by m.contact_id, m.sent_or_received_at desc
)
update public.outreach_contact oc
set paused_reason = 'doorverwijzing: ' || coalesce(l.referral_name, l.referral_email),
    updated_at = now()
from laatste l
where oc.id = l.contact_id
  and (oc.paused_reason is null
       or oc.paused_reason ~ '^(check handmatig:|doorverwijzing:|mail bouncede)');

-- Controle achteraf: 29 berichten, 21 met adres, 26 prospects gemarkeerd.
--   select count(*) filter (where referral_name is not null or referral_email is not null),
--          count(*) filter (where referral_email is not null)
--   from public.outreach_message where direction='inbound';
--   select count(*) from public.outreach_contact where paused_reason like 'doorverwijzing:%';

-- Terugdraaien:
--   update public.outreach_message set referral_name = null, referral_email = null
--   where direction = 'inbound';
--   update public.outreach_contact set paused_reason = null
--   where paused_reason like 'doorverwijzing:%';
