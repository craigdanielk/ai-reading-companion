-- nuance domain on the comprehension profile + BYOK model choice
alter table public.content_profile
  add column if not exists domain text not null default 'general'
  check (domain in ('general','literary','scientific','legal'));

alter table public.provider_connection
  add column if not exists model text;
