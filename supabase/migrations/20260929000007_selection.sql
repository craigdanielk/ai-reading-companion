-- A translation becomes a RANGE into a text, not a new document.
-- Anchors are stored W3C-annotation style (offsets + quote + prefix/suffix) so a
-- highlight survives an edit to the passage body instead of drifting.

alter table public.content_item
  add column if not exists position int not null default 0;

create table if not exists public.selection (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_item(id) on delete cascade,
  start_offset int not null,
  end_offset int not null,
  quote text not null,
  prefix text,
  suffix text,
  created_at timestamptz not null default now(),
  check (end_offset > start_offset)
);

create index if not exists selection_content_item_idx
  on public.selection (content_item_id, start_offset);

alter table public.selection enable row level security;

drop policy if exists "own selection" on public.selection;
create policy "own selection" on public.selection
  for all
  using (content_item_id in (select id from public.content_item where user_id = auth.uid()))
  with check (content_item_id in (select id from public.content_item where user_id = auth.uid()));

-- ai_result now carries two kinds of comprehension: a whole section ('page')
-- and a single selection. Section results hang off extracted_text, selection
-- results off selection.
alter table public.ai_result
  add column if not exists selection_id uuid,
  add column if not exists mode text not null default 'passage';

alter table public.ai_result
  alter column extracted_text_id drop not null;

alter table public.ai_result
  drop constraint if exists ai_result_selection_id_fkey;

alter table public.ai_result
  add constraint ai_result_selection_id_fkey
  foreign key (selection_id) references public.selection(id) on delete cascade;

create index if not exists ai_result_selection_idx on public.ai_result (selection_id);
