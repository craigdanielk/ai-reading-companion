-- R3. A personal note belongs to a place in the text, the same way a gloss does.
alter table public.note
  add column if not exists selection_id uuid references public.selection(id) on delete cascade;

create index if not exists note_selection_idx on public.note (selection_id);

-- R5. Where the text came from physically: typed, read off an image, or extracted
-- from a document. The kind says what it IS; the medium says how it got here.
alter table public.content_item
  add column if not exists medium text not null default 'typed';

alter table public.content_item
  drop constraint if exists content_item_medium_check;

alter table public.content_item
  add constraint content_item_medium_check
  check (medium in ('typed', 'image', 'document'));
