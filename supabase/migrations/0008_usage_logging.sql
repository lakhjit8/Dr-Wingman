-- Per-call Claude API usage/cost logging, for the expense-tracking spec.
-- Not user-facing (see risk-verification-spec.md's precedent for admin-only
-- internal tooling) — RLS is enabled with zero policies here, so only the
-- service role (Edge Functions) can read/write. Migration 0010 adds
-- policies granting admin users read access via the admin dashboard.

create table if not exists public.model_pricing (
  model text primary key,
  input_price_per_million numeric(10, 4) not null,
  output_price_per_million numeric(10, 4) not null,
  updated_at timestamptz not null default now()
);

alter table public.model_pricing enable row level security;

-- Sonnet 5 introductory pricing ($2/$10 per MTok) runs through Aug 31, 2026,
-- then standard pricing ($3/$15) takes effect per
-- platform.claude.com/docs/en/about-claude/pricing — this row will need a
-- manual update around that date; this table intentionally holds only the
-- current rate, not a scheduled/historical rate table.
insert into public.model_pricing (model, input_price_per_million, output_price_per_million)
values ('claude-sonnet-5', 2.00, 10.00)
on conflict (model) do nothing;

-- One row per Claude API call from any of the app's 3 analysis modes
-- (profile_builder, match_analysis, message_coaching — the app's real
-- modes; message_coaching covers both conversation parsing and reply
-- drafting since they happen in a single API call, not two).
create table if not exists public.api_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  feature text not null check (feature in ('profile_builder', 'match_analysis', 'message_coaching')),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  status text not null check (status in ('success', 'error', 'rejected_over_limit', 'rejected_rate_limit')),
  created_at timestamptz not null default now()
);

create index if not exists api_usage_log_created_at_idx on public.api_usage_log (created_at);
create index if not exists api_usage_log_user_id_idx on public.api_usage_log (user_id, created_at);
create index if not exists api_usage_log_feature_idx on public.api_usage_log (feature, created_at);

alter table public.api_usage_log enable row level security;
