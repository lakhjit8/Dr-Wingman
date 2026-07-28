-- User-submitted feedback (bug reports, feature requests, general
-- comments). A user can insert and read back their own submissions; admins
-- can read everyone's via the same is_admin_user() helper used elsewhere.
-- No update/delete policy for anyone via the client — feedback is immutable
-- once submitted.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);
create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);
create policy "feedback_select_admin" on public.feedback
  for select using (public.is_admin_user());
