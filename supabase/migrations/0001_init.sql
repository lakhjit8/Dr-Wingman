-- Dr. Wingman: initial schema
-- Saved user profile, saved matches, and a per-match chat-style thread.
-- Raw screenshots are never persisted here — only derived text/JSON.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds the AI-drafted bio/prompts derived from
-- the user's own uploaded photos.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  bio_draft text,
  prompts jsonb not null default '[]'::jsonb,
  photo_analysis jsonb,
  communication_style text check (
    communication_style in ('action-oriented', 'emotional-relational', 'balanced')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- matches: saved match list, one row per person the user is analyzing/
-- talking to. style_summary holds the AI's communication-style read and
-- compatibility notes (derived text only, no images).
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text,
  match_name text not null default 'Match',
  style_summary jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_user_id_idx on public.matches (user_id);

alter table public.matches enable row level security;

create policy "matches_select_own" on public.matches
  for select using (auth.uid() = user_id);
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = user_id);
create policy "matches_update_own" on public.matches
  for update using (auth.uid() = user_id);
create policy "matches_delete_own" on public.matches
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- match_messages: the per-match chat-style thread. `sender` = 'user' or
-- 'match' renders as a right/left aligned bubble (parsed from conversation
-- screenshots); `sender` = 'coach' renders as a distinct Dr. Wingman card.
-- ---------------------------------------------------------------------------
create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null check (sender in ('user', 'match', 'coach')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_messages_match_id_idx on public.match_messages (match_id, created_at);

alter table public.match_messages enable row level security;

create policy "match_messages_select_own" on public.match_messages
  for select using (auth.uid() = user_id);
create policy "match_messages_insert_own" on public.match_messages
  for insert with check (auth.uid() = user_id);
create policy "match_messages_delete_own" on public.match_messages
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- new-user bootstrap: create an empty profile row on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- storage: temp bucket for screenshots. Objects are deleted by the Edge
-- Functions immediately after the Claude vision call returns; RLS here is a
-- defense-in-depth backstop restricting access to the owning user's folder
-- (path prefix `${auth.uid()}/...`) and to the service role used by Edge
-- Functions.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('screenshots-temp', 'screenshots-temp', false)
on conflict (id) do nothing;

create policy "screenshots_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'screenshots-temp'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots_select_own_folder" on storage.objects
  for select using (
    bucket_id = 'screenshots-temp'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'screenshots-temp'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
