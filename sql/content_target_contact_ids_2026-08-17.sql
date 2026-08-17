-- 2026-08-17: content-doelgroepkiezer — bevroren selectie i.p.v. permanente tag.
-- Additief; raakt geen bestaande data aan. target_tag blijft bestaan als fallback.
alter table content_calendar_items
  add column if not exists target_contact_ids uuid[],
  add column if not exists audience_summary text;
