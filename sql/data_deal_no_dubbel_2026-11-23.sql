-- Dubbel dealnummer D-0206 opgelost, teller rechtgezet, trigger gehard.
--
-- DE MELDING
--   'Move failed: Promote lead failed: duplicate key value violates unique
--   constraint "opportunities_deal_no_key"' bij het slepen van de LHH-lead
--   (Agent ROI | Phase 2) van qualify naar develop.
--
-- WAT ER AAN DE HAND WAS
--   De promotie neemt het dealnummer van de lead mee naar de opportunity
--   (promote_lead_to_opportunity, sinds v1.36.0). De LHH-lead had D-0206, en
--   dat nummer stond ook al op een opportunity. Twee rijen met hetzelfde
--   nummer kunnen niet, dus de promotie brak af. Terecht: de constraint deed
--   precies zijn werk.
--
-- HOE DAT NUMMER TWEE KEER KON BESTAAN
--   Dealnummers komen uit EEN sequence die leads en opportunities delen, juist
--   zodat ze CRM-breed uniek zijn (sql/schema_numbering_2026-06-07.sql). De
--   LHH-lead kreeg D-0206 op 18-11 netjes uit die teller.
--
--   Op 20-11 om 15:10:05 zijn twee opportunities van Marco met de hand
--   ingevoegd, buiten de app om, met een zelf uitgerekend nummer: D-0206 en
--   D-0207. Dat was kennelijk max(deal_no) over de opportunities plus een, en
--   die berekening keek niet naar de leads. Omdat deal_no werd meegegeven sloeg
--   de trigger nextval over, dus bleef de teller op 206 staan.
--
--   Daar zaten twee problemen in. Het zichtbare: het dubbele D-0206. Het
--   stillere: de teller stond lager dan het hoogste bestaande nummer, dus de
--   eerstvolgende nieuwe deal zou D-0207 krijgen en opnieuw vastlopen. Die was
--   nog niemand tegengekomen.
--
-- WAT HIER GEBEURT
--   1. De teller naar het hoogste bestaande nummer (207).
--   2. De opportunity van University of Staffordshire krijgt een nieuw nummer
--      (D-0208). Die en niet de lead, want de lead had D-0206 wel uit de teller
--      gekregen en de opportunity niet. Dealnummers horen permanent te zijn;
--      dit nummer was nooit uitgegeven, dus er wordt niets afgenomen dat van
--      iemand was.
--   3. assign_deal_no slaat voortaan een bezet nummer over in plaats van blind
--      nextval te nemen. Een met de hand ingevuld nummer is niet te verbieden,
--      dus vangt de trigger de gevolgen op.
--
-- Back-ups vooraf: _dq_backup_opportunities_20261123 (150 rijen),
--                  _dq_backup_leads_20261123 (55 rijen).
-- Toegepast op 23 november 2026. D-0209 is opgebrand door een wegwerprij
-- waarmee de nieuwe trigger is getest; gaten in de reeks zijn normaal.

create table if not exists public._dq_backup_opportunities_20261123 as
  select * from public.opportunities;
create table if not exists public._dq_backup_leads_20261123 as
  select * from public.leads;

-- 1. Teller boven het hoogste bestaande nummer.
select setval('public.deal_no_seq', (
  select max(substring(deal_no from 3)::int) from (
    select deal_no from public.opportunities where deal_no is not null
    union all
    select deal_no from public.leads where deal_no is not null) t
), true);

-- 2. Het met de hand ingevulde nummer vervangen door een uitgegeven nummer.
update public.opportunities
set deal_no = 'D-' || lpad(nextval('public.deal_no_seq')::text, 4, '0'),
    updated_at = now()
where id = 'c6118941-61e1-47a7-bf71-a063b1135c8d';

-- 3. Trigger: pak het volgende VRIJE nummer. De bovengrens van 1000 pogingen is
--    er zodat een fout nooit een eindeloze lus wordt.
create or replace function assign_deal_no() returns trigger language plpgsql as $fn$
declare
  kandidaat text;
  pogingen int := 0;
begin
  if new.deal_no is null then
    loop
      kandidaat := 'D-' || lpad(nextval('deal_no_seq')::text, 4, '0');
      exit when not exists (select 1 from opportunities where deal_no = kandidaat)
            and not exists (select 1 from leads where deal_no = kandidaat);
      pogingen := pogingen + 1;
      if pogingen >= 1000 then
        raise exception 'assign_deal_no: geen vrij dealnummer gevonden na 1000 pogingen (laatste: %)', kandidaat;
      end if;
    end loop;
    new.deal_no := kandidaat;
  end if;
  return new;
end $fn$;

-- Controle achteraf: 0 dubbele, hoogste D-0208, teller 208.
--   with alle as (select deal_no from public.opportunities where deal_no is not null
--                 union all select deal_no from public.leads where deal_no is not null)
--   select (select count(*) from (select deal_no from alle group by deal_no having count(*)>1) d),
--          (select max(deal_no) from alle), (select last_value from public.deal_no_seq);

-- Terugdraaien van stap 2:
--   update public.opportunities o set deal_no = b.deal_no
--   from public._dq_backup_opportunities_20261123 b where b.id = o.id and o.id = 'c6118941-61e1-47a7-bf71-a063b1135c8d';
--   (Let op: dan staat het dubbele nummer er weer en breekt de promotie opnieuw.)
