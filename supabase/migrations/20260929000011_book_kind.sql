-- A text is a book, a paper, an article, an essay, a poem, a note or something
-- else. The form is orthogonal to the comprehension domain (register), but the
-- two pair up: choosing "paper" means the reader wants scientific register.
alter table public.book
  add column if not exists kind text not null default 'book';

alter table public.book
  drop constraint if exists book_kind_check;

alter table public.book
  add constraint book_kind_check
  check (kind in ('book', 'paper', 'article', 'essay', 'poem', 'note', 'other'));

create index if not exists book_kind_idx on public.book (user_id, kind);
