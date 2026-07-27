-- Separates "when the match was created" (created_at) from "when the
-- conversation was last active" (last_message_at), so the Matches list can
-- be sorted by either. Previously the app conflated these by sorting on the
-- generic updated_at trigger column. Backfilled from updated_at since that
-- was the closest existing proxy for prior activity.
alter table public.matches add column if not exists last_message_at timestamptz;
update public.matches set last_message_at = updated_at where last_message_at is null;
alter table public.matches alter column last_message_at set not null;
alter table public.matches alter column last_message_at set default now();

alter table public.matches add column if not exists pinned boolean not null default false;

create index if not exists matches_user_pinned_last_message_idx
  on public.matches (user_id, pinned desc, last_message_at desc);
