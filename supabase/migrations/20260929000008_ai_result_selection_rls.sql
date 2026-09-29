-- ai_result now holds selection-scoped rows too, where extracted_text_id is
-- NULL. "NULL in (subquery)" evaluates to NULL rather than true, so the original
-- policy would have silently denied every selection result. Ownership is now
-- checked against whichever parent the row actually has.

drop policy if exists "own ai_result" on public.ai_result;

create policy "own ai_result" on public.ai_result
  for all
  using ((selection_id is not null and selection_id in (
      select s.id from public.selection s
      join public.content_item c on c.id = s.content_item_id
      where c.user_id = auth.uid()))
    or (extracted_text_id is not null and extracted_text_id in (
      select e.id from public.extracted_text e
      join public.content_item c on c.id = e.content_item_id
      where c.user_id = auth.uid())))
  with check ((selection_id is not null and selection_id in (
      select s.id from public.selection s
      join public.content_item c on c.id = s.content_item_id
      where c.user_id = auth.uid()))
    or (extracted_text_id is not null and extracted_text_id in (
      select e.id from public.extracted_text e
      join public.content_item c on c.id = e.content_item_id
      where c.user_id = auth.uid())));
