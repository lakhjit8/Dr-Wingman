-- Adds version tracking for Terms/Privacy acceptance. Existing rows get
-- terms_version = null, which never equals CURRENT_TERMS_VERSION
-- (src/lib/legal.ts) — so every existing account, including ones that
-- already accepted under the old boolean-only gate, is naturally prompted
-- to re-accept the current version on next login. No destructive reset of
-- terms_accepted_at needed; the version column alone drives the gate.
alter table public.profiles add column if not exists terms_version text;
