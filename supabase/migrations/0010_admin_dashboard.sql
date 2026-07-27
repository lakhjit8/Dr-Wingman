-- Minimal admin flag + RLS policies granting admin users direct read/write
-- access to the usage-logging and spending-limit tables from migrations
-- 0008-0009, via the new /admin dashboard. No separate admin role/auth
-- system — this app has exactly one operator, so a boolean flag on
-- profiles is sufficient.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Lets the admin dashboard resolve api_usage_log.user_id to a display_name
-- for the "breakdown by user" table (spotting one account driving
-- disproportionate usage) instead of showing raw UUIDs.
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles admin_check where admin_check.id = auth.uid() and admin_check.is_admin)
  );

create policy "api_usage_log_select_admin" on public.api_usage_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "model_pricing_select_admin" on public.model_pricing
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- Not surfaced in the dashboard UI yet (out of scope for the minimal v1),
-- but granted now so pricing can be corrected directly via SQL without a
-- further migration once the Sonnet 5 rate changes on Sept 1, 2026.
create policy "model_pricing_update_admin" on public.model_pricing
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "budget_config_select_admin" on public.budget_config
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "budget_config_update_admin" on public.budget_config
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
