-- Invite-code gated beta access. invite_codes is a server-only table:
-- regular users have no select/insert/update policy on it at all (an
-- anon/authenticated-readable "is this code valid" policy would let someone
-- enumerate or brute-force codes). Admins can view and create codes
-- directly; claiming one happens exclusively through the
-- claim-invite-code Edge Function (service role), which does an atomic
-- `update ... where used_by is null` so two people can't redeem the same
-- code in a race.
create table if not exists public.invite_codes (
  code text primary key,
  note text,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create policy "invite_codes_select_admin" on public.invite_codes
  for select using (public.is_admin_user());
create policy "invite_codes_insert_admin" on public.invite_codes
  for insert with check (public.is_admin_user());

-- Set true by claim-invite-code once a user redeems a valid code. Read
-- directly off the already-fetched profile row by InviteGate — no separate
-- query needed, and no client visibility into invite_codes itself.
alter table public.profiles add column if not exists invite_verified boolean not null default false;
