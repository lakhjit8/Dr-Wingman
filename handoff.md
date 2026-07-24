# Dr. Wingman — Project Handoff

_Last updated: 2026-07-24_

## What it is

Dr. Wingman is an AI dating-communication coach. Users upload their own
profile photos, a match's profile screenshots, or conversation screenshots;
Claude (via Supabase Edge Functions) reads communication-style signals and
coaches the user toward a real date, in their own voice. Screenshots are
analyzed and immediately deleted — only derived text/JSON is persisted.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS, React Router v6
- **Backend**: Supabase — Postgres, Auth (magic-link + Google/Apple OAuth),
  Storage, Edge Functions (Deno), Row-Level Security, `pg_cron` + `pg_net`
  for a scheduled cleanup backstop
- **AI**: Claude API, called **only** from Edge Functions — the API key
  never reaches the browser
- **Repo**: `lakhjit8/dr-wingman`, working branch
  `claude/dr-wingman-dating-coach-309e0y`

## Current status: functional, deployed, privacy-hardened, redesigned

All work below has been implemented, deployed to the live Supabase project,
and (as of this handoff) committed and pushed to git. The app is usable
end-to-end: sign up, accept terms, build a profile, add a match, get
AI-coached opening messages and ongoing conversation coaching.

## Architecture

```
src/
  pages/        Login, ProfileBuilder, MatchList, MatchThread, Settings, Terms, Privacy
  components/    UploadDropzone, ChatBubble, FlagIcon, Collapsible, AnalysisLoadingState,
                 PaywallGate, TermsGate, SafetyNotice, ProtectedRoute, Layout, LoadingSpinner
  lib/           supabaseClient, types, legal (LLC name / effective date / terms version),
                 featureFlags, text (truncateAtWord)
  context/       AuthContext (session persistence, sign-in/out)
supabase/
  migrations/    0001_init.sql            profiles/matches/match_messages schema + RLS
                 0002_legal_hardening.sql match_label replaces match_name (no real names stored)
                 0003_screenshot_cleanup_cron.sql   pg_cron backstop for orphaned screenshots
                 0004_safety_notice.sql   profiles.safety_notice_shown_at
                 0005_terms_versioning.sql profiles.terms_accepted_at / terms_version
  functions/
    _shared/persona.ts        GENERATED from docs/dr-wingman-persona.md — do not hand-edit
    _shared/claude.ts         Claude API wrapper, max_tokens: 8192, returns {text, json, stopReason}
    _shared/modeInstructions.ts, supabaseAdmin.ts, testMode.ts
    analyze-profile-photos/   Profile builder mode
    analyze-match-profile/    Match analysis mode (5-Layer Analysis Framework, v2 persona)
    coach-message/            Ongoing message coaching mode
    cleanup-stale-screenshots/  Cron-invoked backstop cleanup
docs/            product-spec.md, dr-wingman-persona.md (source of truth for AI persona),
                 legal-hardening-migration-spec.md, risk-verification-spec.md,
                 terms-privacy-final-spec.md, persona-update-spec-v2.md
scripts/         sync-persona.mjs, bundle-function-for-deploy.mjs, audit-ai-output.mjs
tests/           Vitest integration suite against the LIVE Supabase project + real Claude API
```

## Major features delivered, in build order

1. **Core app** — profile builder, match analysis, per-match coached chat
   thread, photo upload with client-side compression, magic-link + OAuth
   auth with persistent sessions.
2. **Back button on match thread**, **3 generated opening messages** from
   match photo analysis.
3. **Legal hardening**: Terms of Service + Privacy Policy pages, mandatory
   acceptance gate (`TermsGate`), migration replacing stored real match
   names (`match_name`) with AI-generated non-identifying `match_label`.
4. **Second privacy pass**: closed a gap where real names were still
   appearing *inside parsed conversation transcripts* (not just the name
   field) — persona instructions updated to redact names in transcripts
   too, plus retroactive SQL redaction of already-leaked production data.
5. **Risk verification test suite** (`tests/`) — integration tests that
   actually exercise the deployed Edge Functions and live database to prove
   the privacy claims hold, not just that the code intends them to:
   `name-leakage.test.ts`, `access-control.test.ts`, `persistence.test.ts`,
   `logs.test.ts`, `label-format.test.ts`. Caught two real bugs this way
   (see below). CI wired up in `.github/workflows/test.yml`.
6. **AI output spot-check tool** (`scripts/audit-ai-output.mjs`) and
   **dating-safety notice** (`SafetyNotice.tsx` — meet-in-public /
   tell-a-friend reminders, shown once, logged via
   `profiles.safety_notice_shown_at`).
7. **Terms/Privacy finalization** — real operating entity (LD Vending LLC),
   effective date, and **version-based** re-acceptance (`terms_version`
   column, not just a boolean) so future legal changes force re-consent.
8. **Persona v2** — full rewrite of the match-analysis/coaching system
   prompt to a "5-Layer Analysis Framework" (pace, investment read,
   green/yellow/red flags, bridge strategy, opening messages), with the
   mandatory Safety & Privacy Addendum appended and profile-builder mode
   left untouched.
9. **Mobile-first "Clean & Trustworthy" UI redesign** (most recent, just
   committed) — warm neutral / slate-teal / sage-amber-danger flag palette
   replacing an over-saturated pink/red theme; Public Sans/IBM Plex Mono
   type; fixed mobile bottom tab nav; structured coach-message cards with
   flag badges and collapsible reasoning sections; fixed a washed-out
   disabled-button bug, mid-word text truncation, and a button that
   collapsed into a pink circle on mobile.

## Bugs found and fixed along the way

- **Deno boot error** on Management-API JSON deploys caused by an
  `esm.sh` import — fixed by switching to the `npm:` specifier.
- **Real names stored in `matches.match_name`** — fixed via migration +
  persona guardrails (twice — first pass missed transcript text).
- **Bundler missing `testMode.ts`** in `sharedOrder` — `shouldSimulateFailure`
  was called in bundled functions but never defined. Found by the test suite.
- **`max_tokens: 4096` too small** for persona v2's verbose output format —
  every real request silently failed to parse. Raised to `8192`. Found by
  the test suite.
- **SafetyNotice persistence** — investigated as a possible bug (modal
  reappearing in screenshot QA); root-caused to stale data from before
  error-handling was added to the update call, not a real backend/RLS bug.
  Confirmed resolved by direct DB query.
- Several UI bugs from the redesign brief's own screenshots (see item 9
  above) — all fixed and verified.

## How things run in this environment (useful for the next session)

- The `supabase` CLI's multi-asset deploy times out in this sandbox — the
  Supabase **Management API** is used instead for SQL execution, secrets,
  and function deploys, with `scripts/bundle-function-for-deploy.mjs`
  inlining `_shared/*` into a single self-contained file per function
  (required because the Management API's JSON deploy path runs Deno with
  `--no-remote`).
- Persona changes: edit `docs/dr-wingman-persona.md`, then run
  `npm run sync-persona` to regenerate `supabase/functions/_shared/persona.ts`
  before deploying.
- Postgres in this project does **not** support `\y`/`\m`/`\M` regex
  word-boundary shorthands — use manual
  `([^[:alnum:]]|^)NAME([^[:alnum:]]|$)` character-class boundaries instead.
- Node's `fetch` needs `NODE_USE_ENV_PROXY=1` and
  `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to reach Supabase through
  this sandbox's egress proxy. Playwright/Chromium reaching `*.supabase.co`
  through the same proxy hangs indefinitely — if browser automation against
  Supabase is needed again, relay those requests through Node's own
  `fetch` via `context.route()`.
- Supabase access tokens are never stored in the repo or scripts — they're
  pasted into chat per-session and should be revoked by the user
  immediately after use (this has been the consistent practice all
  session).

## What's NOT done / open items for the next session

- No production monitoring/alerting has been set up beyond the pg_cron
  cleanup backstop.
- `MONETIZATION_MODE` (ads / subscription / one_time) exists as a feature
  flag (`src/lib/featureFlags.ts`) with `PaywallGate` as the choke point,
  but no real payment/subscription provider is wired up yet — it's a UI
  stub.
- Google/Apple OAuth buttons exist in the UI but the providers are not
  actually configured in the Supabase Auth dashboard (this was confirmed
  earlier as an expected/known gap, not a bug).
- No production analytics/crash reporting.
- The redesign has not been tested on a real physical device, only via
  Playwright at a simulated 390×844 viewport — worth a real-device pass
  before wider release.
- `scripts/audit-ai-output.mjs` (admin spot-check tool) exists but hasn't
  been run against a meaningful volume of production data yet.

## Testing

```
npm run build   # tsc -b && vite build — currently clean
npm run lint    # eslint . — currently 0 errors, 2 pre-existing fast-refresh warnings
npm test        # vitest run — integration suite against the LIVE Supabase project + Claude API,
                # requires real Supabase credentials, not run in CI without them configured
```
