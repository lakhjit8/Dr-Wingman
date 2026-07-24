-- Records when a user was shown the dating-safety notice (compliance
-- record-keeping per the risk-verification spec, Section 3) — a timestamp
-- of when it was displayed, not confirmation it was read.
alter table public.profiles add column if not exists safety_notice_shown_at timestamptz;
