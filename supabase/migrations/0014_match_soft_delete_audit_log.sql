-- Match deletion: soft-delete then auto-purge, matching the retention model
-- already used for transient screenshots — one pattern across the app
-- instead of two. See docs/admin-role-and-match-deletion-spec.md §1.
alter table public.matches add column if not exists deleted_at timestamptz;

-- App-level enforcement: every user-facing query filters deleted_at is
-- null (RLS is about ownership, not soft-delete visibility — see
-- matches_delete_own below, which still permits a real delete for
-- whoever wants to bypass the grace window via direct SQL/support request).
--
-- Grace window: 72 hours, the top of the spec's recommended 24-72h range —
-- long enough to recover from an accidental delete, short enough that nothing
-- meaningfully outlives the user's decision to remove it. match_messages rows
-- cascade automatically via the existing `on delete cascade` FK to matches
-- (migration 0001), so a hard-delete here also removes the conversation
-- history and any coach-generated drafts tied to it — nothing textual
-- outlives the match itself.
--
-- Pure SQL (no pg_net/Edge Function round trip needed, unlike the
-- screenshot-cleanup and budget-alert cron jobs) since this is a plain
-- DELETE with no external API call involved.
select
  cron.schedule(
    'purge-deleted-matches',
    '0 * * * *',
    $$ delete from public.matches where deleted_at < now() - interval '72 hours' $$
  )
where not exists (
  select 1 from cron.job where jobname = 'purge-deleted-matches'
);

-- ---------------------------------------------------------------------------
-- audit_log: append-only record of admin actions (user deletion, data
-- export). Deliberately does not store the exported content or the deleted
-- user's data itself — only that an action occurred, on whom, and why — so
-- the audit log itself never becomes a second copy of sensitive data. See
-- docs/admin-role-and-match-deletion-spec.md §5.
--
-- No FK on admin_user_id/target_user_id: the whole point of this table is
-- to outlive the accounts it references (an admin-delete-user action is
-- logged before the target's auth.users row is removed; a cascading FK
-- would delete the very audit row proving the deletion happened).
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null check (action in ('user_delete', 'data_export')),
  target_user_id uuid,
  request_reference text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_target_user_id_idx on public.audit_log (target_user_id);

alter table public.audit_log enable row level security;

-- Admin-read-only, append-only: no insert/update/delete policy for any
-- client role — rows are only ever written by Edge Functions via the
-- service-role key, which bypasses RLS entirely.
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_admin_user());
