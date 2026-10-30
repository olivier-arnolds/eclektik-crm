-- Marketing-opt-in aan bij de contacten die Eclectik kennen.
--
-- DE AANLEIDING, EN WAT ER NIET AAN DE HAND WAS
--   Het vermoeden was dat een actie de vlag bij iedereen verkeerd had gezet. Dat
--   bleek niet zo: de kolom is op 14-08-2026 aangemaakt als
--   'not null default false' en stond sindsdien bij iedereen uit. Er viel dus
--   niets terug te draaien; dit is toestemming toekennen, geen correctie.
--
-- WAAROM NIET BIJ IEDEREEN
--   Het eerste voorstel was alles aan behalve wie zich via Resend afmeldde. Twee
--   bezwaren. Ten eerste zitten er 720 koud verrijkte Microsoft-adressen in de
--   database die nog nooit van ons gehoord hebben; die een opt-in geven is geen
--   administratie maar een aanname over wat zij willen. Ten tweede is onze lijst
--   afgemelden per definitie onvolledig: Resend stuurt geen webhook bij een
--   afmelding, dus we vangen er alleen op bij een volgende verzending. "Aan
--   tenzij afgemeld" zou dus starten bij een uitzonderingslijst van vijf, niet
--   omdat er vijf zijn maar omdat we de rest niet kennen.
--
-- WIE WEL
--   Contacten uit Dynamics (bestaande klantrelaties), handmatig toegevoegde
--   contacten, aanmeldingen voor het event, wie op de Amsterdam-outreach opende
--   of klikte, en de deelnemer aan de user session. Mensen die weten wie wij
--   zijn.
--
-- WIE NIET, BINNEN DIE GROEP
--   Zonder e-mailadres (16), afgemeld (2), former (13) en stage Inactive (46).
--   Een opt-in geven aan een vertrokken medewerker levert een bounce op en geen
--   lezer.

create table if not exists _dq_backup_contacts_optin_20261030 as
  select id, email, source, stage, former, do_not_email, marketing_content_opt_in
    from contacts;

update contacts
   set marketing_content_opt_in = true, updated_at = now()
 where (source in ('Dynamics', 'Manual add', 'Outreach Amsterdam 2026: geopend of geklikt',
                   'User session 5 nov 2026')
        or source like 'Aanmelding event%')
   and email is not null and email <> ''
   and not do_not_email
   and not former
   and stage is distinct from 'Inactive'
   and not marketing_content_opt_in;

-- ALLEEN STAGE 'Active' (aanvulling, zelfde dag)
--   De update hierboven pakte ook contacten op stage 'New' mee. Afgesproken is
--   dat alleen Active contacten aangezet worden, dus die 86 zijn weer uit.
--   Bewust alleen wat deze update zelf aanzette: de 36 niet-Active contacten die
--   de vlag al hadden blijven staan. Daar zitten de tien event-aanmelders bij
--   die op het formulier zelf het vinkje voor marketing aanzetten, en dat is
--   echte toestemming die wij niet horen in te trekken omdat hun stage 'New' is.
update contacts c
   set marketing_content_opt_in = false, updated_at = now()
  from _dq_backup_contacts_optin_20261030 b
 where b.id = c.id
   and not b.marketing_content_opt_in
   and c.marketing_content_opt_in
   and c.stage is distinct from 'Active';

-- MARCO'S LINKEDIN-CONNECTIES ERBIJ (aanvulling, zelfde dag)
--   52 eerstelijns LinkedIn-connecties van Marco, allemaal op stage Active. Zij
--   kennen hem persoonlijk, dus ze horen in dezelfde groep als de rest hierboven.
--   47 kwamen in aanmerking; de andere 5 vielen af op een leeg adres, een
--   afmelding, de vlag former of omdat de opt-in al aanstond.
update contacts
   set marketing_content_opt_in = true, updated_at = now()
 where source = 'LinkedIn import Marco 2026-07'
   and stage = 'Active'
   and email is not null and email <> ''
   and not do_not_email and not former
   and not marketing_content_opt_in;

-- De zes Surfe-verrijkingen staan allemaal op stage New en vallen daarmee onder
-- de Active-regel hierboven. Niet aangezet; ligt terug bij Olivier.

-- Resultaat: 790 contacten met de opt-in aan.
-- Controle dat de koude lijsten uit bleven:
-- select count(*) from contacts
--  where source in ('Microsoft LinkedIn lijst 29-10-2026','Microsoft AIBS lijst 20-10-2026')
--    and marketing_content_opt_in;   -- 0

-- Terugdraaien:
-- update contacts c set marketing_content_opt_in = b.marketing_content_opt_in
--   from _dq_backup_contacts_optin_20261030 b where b.id = c.id;
