-- Legal/privacy hardening migration.
-- 1. Replace matches.match_name (was storing the match's real first name,
--    extracted by the AI) with match_label — an AI-generated, non-identifying
--    style/vibe descriptor plus the date the match was added. Existing rows
--    are backfilled from their already-stored style_summary before the
--    identifying column is dropped.
-- 2. Add profiles.terms_accepted_at to gate app access on Terms/Privacy
--    acceptance.

alter table public.matches add column if not exists match_label text;

update public.matches
set match_label = trim(
  initcap(replace(coalesce(style_summary ->> 'communication_style', 'balanced'), '-', ' '))
  || ' communicator (' || to_char(created_at, 'Mon DD') || ')'
)
where match_label is null;

alter table public.matches alter column match_label set not null;
alter table public.matches alter column match_label set default 'New match';

-- The identifying column: drop only after the backfill above is verified.
alter table public.matches drop column if exists match_name;

alter table public.profiles add column if not exists terms_accepted_at timestamptz;
