-- Storage for reader-supplied sources. This was originally created out of band;
-- it belongs in migrations so a fresh environment is reproducible.
--
-- The bucket is private, capped, and restricted to formats the app can actually
-- read — an unrestricted bucket would accept anything a client cared to post.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content',
  'content',
  false,
  26214400, -- 25 MB per file
  array[
    'application/pdf',
    'application/epub+zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The original policy checked only the folder segment, so it applied to EVERY
-- bucket in the project — a reader could reach objects in unrelated buckets
-- whenever the folder happened to match. Scope it to content, and to signed-in
-- readers only.
drop policy if exists "own content storage" on storage.objects;

create policy "own content storage" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'content' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'content' and auth.uid()::text = (storage.foldername(name))[1]);
