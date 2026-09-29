-- source language on the comprehension profile (auto = detect)
alter table public.content_profile
  add column if not exists source_language text not null default 'auto';
