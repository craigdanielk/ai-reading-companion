-- A section belongs to a text. Deleting the text must take its sections with
-- it — the earlier "on delete set null" left orphaned sections behind every time
-- a text was removed, and nothing ever collected them.
alter table public.content_item
  drop constraint if exists content_item_book_id_fkey;

alter table public.content_item
  add constraint content_item_book_id_fkey
  foreign key (book_id) references public.book(id) on delete cascade;
