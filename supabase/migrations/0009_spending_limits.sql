-- Spending guardrails: a single-row config table (boolean PK trick forces
-- exactly one row) checked by _shared/spendingGuard.ts before every Claude
-- API call. RLS enabled, no end-user policies — service role only until
-- migration 0010 adds admin read+write access via the dashboard.
create table if not exists public.budget_config (
  id boolean primary key default true check (id),
  alert_threshold_usd numeric(10, 2) not null default 50,
  soft_stop_threshold_usd numeric(10, 2) not null default 100,
  hard_stop_threshold_usd numeric(10, 2) not null default 150,
  -- Latches true once the hard-stop threshold is crossed; stays true until
  -- an admin manually resets it from the dashboard, per spec (this is the
  -- actual bill-protection mechanism, not a live threshold re-check).
  hard_stop_active boolean not null default false,
  per_user_hourly_request_limit int not null default 100,
  max_user_text_chars int not null default 4000,
  max_images_per_request int not null default 9,
  -- Tracks which alert tier was last emailed this billing period, so the
  -- 15-min alert job doesn't re-send the same notification every run.
  last_alert_tier_sent text check (last_alert_tier_sent in ('alert', 'soft_stop', 'hard_stop')),
  last_alert_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.budget_config enable row level security;

insert into public.budget_config (id) values (true) on conflict (id) do nothing;

create trigger budget_config_set_updated_at
  before update on public.budget_config
  for each row execute function public.set_updated_at();
