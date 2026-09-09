-- Content Calendar: afbeelding bij een LinkedIn-post.
--
-- 1) image_url: publieke URL van de afbeelding die bij publicatie als bijlage
--    (attachment) met de LinkedIn-post wordt meegestuurd via Unipile. NULL = post
--    zonder afbeelding. Bewust een URL en geen bytes: de bytes staan in Storage.
-- 2) Storage-bucket 'content-images' (publiek leesbaar, zodat de cron en LinkedIn
--    de afbeelding zonder token kunnen ophalen). Ingelogde teamleden mogen
--    uploaden en verwijderen (upload gebeurt vanuit de Content Calendar-editor).
--
-- Additief en niet-destructief (nieuwe nullable kolom + nieuwe bucket/policies).
-- Backup vooraf: _dq_backup_content_calendar_items_20260909.
-- Toegepast via Supabase MCP apply_migration (content_calendar_image) op 2026-09-09.

alter table public.content_calendar_items
  add column if not exists image_url text;

comment on column public.content_calendar_items.image_url is
  'Publieke URL (Storage-bucket content-images) van de afbeelding die met een LinkedIn-post wordt meegestuurd. NULL = geen afbeelding.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-images', 'content-images', true, 8388608, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "public read content-images" on storage.objects;
create policy "public read content-images" on storage.objects
  for select to public using (bucket_id = 'content-images');

drop policy if exists "auth users can upload to content-images" on storage.objects;
create policy "auth users can upload to content-images" on storage.objects
  for insert to authenticated with check (bucket_id = 'content-images');

drop policy if exists "auth users can update content-images" on storage.objects;
create policy "auth users can update content-images" on storage.objects
  for update to authenticated using (bucket_id = 'content-images') with check (bucket_id = 'content-images');

drop policy if exists "auth users can delete content-images" on storage.objects;
create policy "auth users can delete content-images" on storage.objects
  for delete to authenticated using (bucket_id = 'content-images');

-- Terugdraaien:
-- drop policy if exists "auth users can delete content-images" on storage.objects;
-- drop policy if exists "auth users can update content-images" on storage.objects;
-- drop policy if exists "auth users can upload to content-images" on storage.objects;
-- drop policy if exists "public read content-images" on storage.objects;
-- delete from storage.objects where bucket_id = 'content-images';
-- delete from storage.buckets where id = 'content-images';
-- alter table public.content_calendar_items drop column if exists image_url;
