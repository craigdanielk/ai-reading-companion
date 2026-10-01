-- The reader's verbs.
--
-- ai_result used to be one thing: the result of "understand". An action now
-- decides what was asked for, and the scope (already carried by `mode`) decides
-- what it was asked of. Existing rows were all comprehensions, so `understand`
-- is the honest default.

alter table ai_result
  add column if not exists action text not null default 'understand';

comment on column ai_result.action is
  'Which reader action produced this row (lib/actions/registry.ts). `mode` carries the scope.';

-- The reader renders the newest result per selection, so this is the lookup.
create index if not exists ai_result_selection_action_idx
  on ai_result (selection_id, created_at desc);

-- Which verbs readers actually reach for is product intelligence for the
-- operator, so the ledger records it alongside cost. Operator-only, as ever.
alter table cost_ledger
  add column if not exists action text;
