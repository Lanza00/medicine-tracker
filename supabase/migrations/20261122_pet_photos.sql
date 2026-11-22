-- Pet photos
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.
--
-- Photos are uploaded by the Next.js server with the service role key, so the
-- bucket needs no upload policies. The bucket is public so the app can show a
-- photo by its URL; each file name is a random id, so it can't be guessed.

-- 1) Column for the photo's public URL (null = show the emoji icon instead)
alter table public.pets add column if not exists photo_url text;

-- 2) Public storage bucket for the photos (max 1 MB each, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
