-- Harde koppeling content-item -> campagne(s), zodat opens/kliks per contentstuk
-- te aggregeren zijn (ook bij drip = meerdere campagnes per item).
alter table campaigns
  add column if not exists content_item_id uuid
  references content_calendar_items(id) on delete set null;

create index if not exists idx_campaigns_content_item
  on campaigns(content_item_id);

-- Aggregatie van engagement over alle campagnes van één content-item.
-- opened/clicked = unieke ontvangers met >=1 open/klik.
create or replace function content_item_engagement(p_item_id uuid)
returns table(recipients int, opened int, clicked int)
language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where cs.open_count > 0)::int,
    count(*) filter (where cs.click_count > 0)::int
  from campaigns c
  join campaign_sends cs on cs.campaign_id = c.id
  where c.content_item_id = p_item_id;
$$;
