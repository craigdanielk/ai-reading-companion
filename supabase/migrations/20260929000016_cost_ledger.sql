-- Costs are the operator's margin, not the reader's business.
--
-- The reader's own usage row is readable by them under RLS, so cost must not
-- live there. It moves to a ledger with RLS enabled and NO policies: no client
-- role can read or write it, only the service role.

create table if not exists public.cost_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid references public.content_item(id) on delete set null,
  provider text not null,
  origin text not null check (origin in ('byok', 'platform')),
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cost_ledger enable row level security;

create index if not exists cost_ledger_created_idx on public.cost_ledger (created_at desc);
create index if not exists cost_ledger_user_idx on public.cost_ledger (user_id, created_at desc);

-- Strip cost and token detail from every row a reader can already read.
update public.usage
set counters = counters - 'cost_usd' - 'platform_cost_usd' - 'byok_cost_usd'
                        - 'last_model' - 'prompt_tokens' - 'completion_tokens';

comment on table public.cost_ledger is
  'Operator-only. RLS on with no policies: reachable by the service role only.';
