-- Content Calendar: "kopieer naar draft" + dubbel-beveiliging (nooit dezelfde
-- uiting 2x naar 1 contact).
--
-- 1) origin_item_id koppelt een kopie aan het ORIGINEEL (de root). Een keten van
--    kopieën wijst allemaal naar dezelfde root, zodat alle kopieën van dezelfde
--    uiting één "familie" vormen. NULL = een origineel.
-- 2) content_family_reached(p_item_id) geeft de contacten die deze uiting (root +
--    alle kopieën) al ontvingen, gematcht op contact_id én e-mail. De publish-cron
--    filtert die weg; de editor gebruikt hem om te tonen hoeveel van de selectie
--    al bereikt is. Enige bron van waarheid voor de "familie"-definitie.
--
-- Additief en niet-destructief (nieuwe nullable kolom + nieuwe functie).
-- Toegepast via Supabase MCP apply_migration (content_calendar_origin) op 2026-08-24.

alter table public.content_calendar_items
  add column if not exists origin_item_id uuid
  references public.content_calendar_items(id) on delete set null;

comment on column public.content_calendar_items.origin_item_id is
  'Kopie: verwijst naar het ROOT-origineel. NULL = origineel. Root + kopieën = één uiting-familie (dubbel-beveiliging).';

-- Snel de kopieën van een root vinden.
create index if not exists idx_content_calendar_origin
  on public.content_calendar_items(origin_item_id);

-- Contacten die een uiting (de hele familie van p_item_id) al ontvingen.
-- Gematcht op contact_id en op (genormaliseerde) e-mail; een send-rij telt
-- ongeacht status (liever te veel uitsluiten dan dubbel sturen).
create or replace function content_family_reached(p_item_id uuid)
returns table(contact_id uuid, email text)
language sql stable as $$
  with root as (
    select coalesce(origin_item_id, id) as root_id
    from public.content_calendar_items
    where id = p_item_id
  ),
  family as (
    select ci.id
    from public.content_calendar_items ci, root r
    where ci.id = r.root_id or ci.origin_item_id = r.root_id
  )
  select distinct cs.contact_id, lower(cs.recipient_email) as email
  from public.campaigns c
  join public.campaign_sends cs on cs.campaign_id = c.id
  where c.content_item_id in (select id from family);
$$;

-- Terugdraaien:
-- drop function if exists content_family_reached(uuid);
-- drop index if exists idx_content_calendar_origin;
-- alter table public.content_calendar_items drop column if exists origin_item_id;
