-- Books gained free-form notes in the UI, and deleting a book must not
-- destroy the passages read inside it: they survive, unfiled.
alter table public.book
  add column if not exists description text;

alter table public.content_item
  drop constraint if exists content_item_book_id_fkey;

alter table public.content_item
  add constraint content_item_book_id_fkey
  foreign key (book_id) references public.book(id) on delete set null;
