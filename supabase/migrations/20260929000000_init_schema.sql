-- adel AI Reading Companion — T3 init schema (7 app tables + RLS)
-- "user" record = auth.users (Supabase Auth); app tables scope to auth.uid().

create table if not exists public.content_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text','article','ebook','document','image','screenshot')),
  title text,
  source text,
  storage_ref text,
  body_text text,
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_profile (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_item(id) on delete cascade,
  target_language text not null,
  comprehension_depth text not null default 'intermediate'
    check (comprehension_depth in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now()
);

create table if not exists public.extracted_text (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_item(id) on delete cascade,
  raw_text text,
  corrected_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_result (
  id uuid primary key default gen_random_uuid(),
  extracted_text_id uuid not null references public.extracted_text(id) on delete cascade,
  original text,
  understanding text,
  terms jsonb default '[]'::jsonb,
  key_idea text,
  explanation text,
  created_at timestamptz not null default now()
);

create table if not exists public.note (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_item(id) on delete cascade,
  source_ai_result_id uuid references public.ai_result(id) on delete set null,
  body text,
  kind text not null default 'ai' check (kind in ('ai','personal')),
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid references public.content_item(id) on delete cascade,
  last_position text,
  counters jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_connection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  credential_ref text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.content_item enable row level security;
alter table public.content_profile enable row level security;
alter table public.extracted_text enable row level security;
alter table public.ai_result enable row level security;
alter table public.note enable row level security;
alter table public.usage enable row level security;
alter table public.provider_connection enable row level security;

create policy "own content_item" on public.content_item
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own usage" on public.usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own provider_connection" on public.provider_connection
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own content_profile" on public.content_profile for all
  using (content_item_id in (select id from public.content_item where user_id = auth.uid()))
  with check (content_item_id in (select id from public.content_item where user_id = auth.uid()));
create policy "own extracted_text" on public.extracted_text for all
  using (content_item_id in (select id from public.content_item where user_id = auth.uid()))
  with check (content_item_id in (select id from public.content_item where user_id = auth.uid()));
create policy "own ai_result" on public.ai_result for all
  using (extracted_text_id in (select id from public.extracted_text
    where content_item_id in (select id from public.content_item where user_id = auth.uid())))
  with check (extracted_text_id in (select id from public.extracted_text
    where content_item_id in (select id from public.content_item where user_id = auth.uid())));
create policy "own note" on public.note for all
  using (content_item_id in (select id from public.content_item where user_id = auth.uid()))
  with check (content_item_id in (select id from public.content_item where user_id = auth.uid()));
