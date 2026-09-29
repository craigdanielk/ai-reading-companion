-- books: the container (Calibre-style). Passages live inside a book.
create table if not exists public.book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  created_at timestamptz not null default now()
);

alter table public.book enable row level security;

drop policy if exists "own book" on public.book;
create policy "own book" on public.book
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- a passage may belong to a book (null = unfiled)
alter table public.content_item
  add column if not exists book_id uuid references public.book(id) on delete cascade;

create index if not exists content_item_book_id_idx on public.content_item (book_id);
