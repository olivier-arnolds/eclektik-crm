-- De betrokken ontvangers uit de campagne Amsterdam 2026 als contacten, met tag.
-- Doel: een verzetmail kunnen sturen aan wie de vorige mails echt gelezen heeft.
--
-- WIE ERIN ZITTEN
--   Van de 722 gemailde prospects openden of klikten er ruw 385 respectievelijk
--   83. Die getallen kun je niet gebruiken: beveiligingsscanners halen de
--   trackingpixel op en volgen de links, meestal binnen enkele seconden na
--   verzending. Met de tweeminutengrens (zie klikOordeel in outreach-match.js)
--   blijven er 80 echte openers en 46 echte klikkers over, samen 111 personen.
--   Daarvan vallen 25 af (afgemeld of gebounced) en 1 die al geantwoord heeft.
--   Blijft over: 85.
--
-- OPT-IN STAAT BEWUST OP FALSE
--   Een e-mail openen is geen toestemming voor marketing. Deze mensen komen uit
--   koude outreach en hebben nooit iets aangevinkt, anders dan de aanmelders
--   voor het event, die een consent_at hebben. Met opt_in false blijven ze
--   buiten de content-calendar-cron, die daarop filtert. De composer verstuurt
--   aan de selectie die je zelf maakt, dus een gerichte verzetmail kan gewoon.

create table _dq_backup_contacts_20260929b as select * from contacts;
create table _dq_backup_contact_tags_20260929b as select * from contact_tags;

with m as (
  select oc.id, oc.email, oc.first_name, oc.last_name, oc.title, oc.company, oc.status,
         max(case when mm.first_opened_at is not null
                   and extract(epoch from (mm.first_opened_at - mm.sent_or_received_at)) >= 120 then 1 else 0 end) as open_mens,
         max(case when mm.first_clicked_at is not null
                   and extract(epoch from (mm.first_clicked_at - mm.sent_or_received_at)) >= 120 then 1 else 0 end) as klik_mens
  from outreach_contact oc
  join outreach_message mm on mm.contact_id = oc.id and mm.direction = 'outbound'
  where oc.campaign_id = '5caf44f8-e6cc-4ecc-a61f-c729c7155089'
  group by oc.id, oc.email, oc.first_name, oc.last_name, oc.title, oc.company, oc.status
), doel as (
  select * from m where (open_mens = 1 or klik_mens = 1)
    and status not in ('opted_out','bounced','replied')
)
insert into contacts (email, full_name, first_name, last_name, company_name, title,
                      source, event_source, marketing_content_opt_in, do_not_email)
select d.email,
       nullif(trim(coalesce(d.first_name,'') || ' ' || coalesce(d.last_name,'')), ''),
       d.first_name, d.last_name, d.company, d.title,
       'Outreach Amsterdam 2026: geopend of geklikt', 'amsterdam-2026', false, false
from doel d
where not exists (select 1 from contacts c where lower(c.email) = lower(d.email));
-- 85 nieuw; geen van de 85 bestond al als contact

insert into tags (name) select 'Amsterdam 2026 open of klik'
where not exists (select 1 from tags where name = 'Amsterdam 2026 open of klik');

insert into contact_tags (contact_id, tag_id)
select c.id, (select id from tags where name = 'Amsterdam 2026 open of klik')
from contacts c
where c.source = 'Outreach Amsterdam 2026: geopend of geklikt'
and not exists (select 1 from contact_tags ct
  where ct.contact_id = c.id
    and ct.tag_id = (select id from tags where name = 'Amsterdam 2026 open of klik'));
-- 85 koppelingen, niemand op do_not_email
