-- Schedules the cleanup-stale-screenshots Edge Function as a backstop
-- against a failed explicit delete (see supabase/functions/cleanup-stale-screenshots).
--
-- Requires a Vault secret named 'service_role_key' holding this project's
-- service_role key, created out-of-band (Dashboard > Project Settings >
-- Vault, or `select vault.create_secret('<key>', 'service_role_key');` run
-- directly against the project) — never committed to this file or to git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'cleanup-stale-screenshots',
    '*/10 * * * *',
    $$
    select net.http_post(
      url := 'https://smcdqxaridfxbecxyedd.supabase.co/functions/v1/cleanup-stale-screenshots',
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
  select 1 from cron.job where jobname = 'cleanup-stale-screenshots'
);
