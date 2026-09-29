-- user-level defaults (settings/preferences)
create table if not exists public.user_preference (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_source_language text not null default 'auto',
  default_target_language text not null default 'en',
  default_domain text not null default 'general'
    check (default_domain in ('general','literary','scientific','legal')),
  default_depth text not null default 'intermediate'
    check (default_depth in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now()
);

alter table public.user_preference enable row level security;

drop policy if exists "own user_preference" on public.user_preference;
create policy "own user_preference" on public.user_preference
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
