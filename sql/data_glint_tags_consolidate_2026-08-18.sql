-- Glint prospects import: tags consolideren (2026-08-18, na de import eerder die dag).
-- Beslissing: geen aparte prio-/umbrella-tags meer; alles onder de bestaande 'Glint'-tag.
-- De prio-granulariteit blijft beschikbaar via account-status 'Expected Glint Customers'
-- (companies.type) in de doelgroepkiezer. Backup: _dq_backup_contact_tags_20260818.
-- Toegepast via Supabase MCP.

-- 1. Bestaande 'Glint'-tag op de hele Glint-batch (contacten met de umbrella-tag).
insert into contact_tags (contact_id, tag_id, tagged_at, tagged_by)
select distinct ct.contact_id, (select id from tags where name='Glint'), now(), 'import:glint-aug2026'
from contact_tags ct
join tags t on t.id = ct.tag_id
where t.name = 'Glint prospect (aug 2026)'
  and not exists (select 1 from contact_tags x
    where x.contact_id = ct.contact_id and x.tag_id = (select id from tags where name='Glint'));

-- 2. Koppelingen van de import-tags weghalen.
delete from contact_tags ct using tags t
where ct.tag_id = t.id
  and t.name in ('Glint prospect (aug 2026)','Glint prio 1','Glint prio 2','Glint prio 3','Glint prio 5');

-- 3. De import-tag-definities zelf weghalen.
delete from tags
where name in ('Glint prospect (aug 2026)','Glint prio 1','Glint prio 2','Glint prio 3','Glint prio 5');
