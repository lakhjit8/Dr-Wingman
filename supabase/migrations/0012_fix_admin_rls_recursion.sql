-- Fixes infinite recursion in the admin RLS policies from migration 0010.
-- Those policies checked `exists (select 1 from public.profiles where
-- id = auth.uid() and is_admin)` directly inside policies defined on
-- profiles/api_usage_log/model_pricing/budget_config. Evaluating that
-- subquery re-applies profiles' own RLS policies — including the admin
-- policy on profiles itself — which re-triggers the same check, forever.
-- Postgres aborts with "infinite recursion detected in policy for
-- relation profiles", which broke every read of profiles, including a
-- normal user's own row (TermsGate's login check), not just admin access.
--
-- Fix: a SECURITY DEFINER function bypasses RLS for its internal query
-- (it runs with the privileges of its owner — the migration role, which
-- owns and therefore already bypasses RLS on this table — rather than the
-- calling role), so checking is_admin no longer re-triggers profiles' own
-- policies.
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin_user());

drop policy if exists "api_usage_log_select_admin" on public.api_usage_log;
create policy "api_usage_log_select_admin" on public.api_usage_log
  for select using (public.is_admin_user());

drop policy if exists "model_pricing_select_admin" on public.model_pricing;
create policy "model_pricing_select_admin" on public.model_pricing
  for select using (public.is_admin_user());

drop policy if exists "model_pricing_update_admin" on public.model_pricing;
create policy "model_pricing_update_admin" on public.model_pricing
  for update using (public.is_admin_user());

drop policy if exists "budget_config_select_admin" on public.budget_config;
create policy "budget_config_select_admin" on public.budget_config
  for select using (public.is_admin_user());

drop policy if exists "budget_config_update_admin" on public.budget_config;
create policy "budget_config_update_admin" on public.budget_config
  for update using (public.is_admin_user());
