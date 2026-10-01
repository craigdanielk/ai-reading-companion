-- Keep the language used for each answer. A reader can change the target
-- language between actions, so the current text preference cannot label history.
alter table public.ai_result
  add column if not exists target_language text;

comment on column public.ai_result.target_language is
  'Target language used for this particular reader action. Older rows are unknown.';
