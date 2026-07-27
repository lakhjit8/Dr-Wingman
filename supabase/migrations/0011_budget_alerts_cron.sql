-- Dedup marker for the repeated-rate-limit-hits alert, separate from
-- last_alert_tier_sent (which tracks the budget-threshold email) so the
-- two alert types don't interfere with each other's send/suppress logic.
alter table public.budget_config add column if not exists last_abuse_alert_sent_at timestamptz;

-- Schedules check-budget-alerts every 15 minutes — same pg_cron + pg_net +
-- Vault service-role-key pattern as cleanup-stale-screenshots
-- (migration 0003). Requires the same 'service_role_key' Vault secret,
-- already created for that job.
select
  cron.schedule(
    'check-budget-alerts',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://smcdqxaridfxbecxyedd.supabase.co/functions/v1/check-budget-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'check-budget-alerts'
);
