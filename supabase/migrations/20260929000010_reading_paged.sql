-- Reading layout: pages (book-like, turn back and forth) or scroll.
alter table public.user_preference
  add column if not exists reading_paged boolean not null default true;
