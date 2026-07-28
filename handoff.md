# Dr. Wingman — Project Handoff

_Last updated: 2026-07-28_

## What it is

Dr. Wingman is an AI dating-communication coach. Users upload their own
profile photos, a match's profile screenshots, or conversation screenshots;
Claude (via Supabase Edge Functions) reads communication-style signals and
coaches the user toward a real date, in their own voice. Screenshots are
analyzed and immediately deleted — only derived text/JSON is persisted.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS, React Router v6
- **Backend**: Supabase — Postgres, Auth (magic-link + Google/Apple OAuth),
  Storage, Edge Functions (Deno), Row-Level Security, `pg_cron` + `pg_net`
  for scheduled jobs (screenshot cleanup, budget alerts, deleted-match purge)
- **AI**: Claude API, called **only** from Edge Functions — the API key
  never reaches the browser
- **Repo**: `lakhjit8/dr-wingman`, working branch
  `claude/dr-wingman-dating-coach-309e0y`

See `CLAUDE.md` (repo root) for the terse, code-facing version of this doc —
commands and architecture notes aimed at an AI agent picking up work here.
This file is the narrative version, aimed at a human (or an agent that wants
the "why" and the history, not just the "what").

## Current status: functional, deployed, privacy-hardened, redesigned, admin-equipped

All work below has been implemented, deployed to the live Supabase project,
and (as of this handoff) committed and pushed to git. The app is usable
end-to-end: sign up, accept terms, build a profile, add a match, get
AI-coached opening messages and ongoing conversation coaching with
pacing-aware meetup suggestions, delete a match or your whole account, and
(as the operator) manage users, review an audit trail, and read submitted
feedback from `/admin`.

## Architecture

```
src/
  pages/        Login, ProfileBuilder, MatchList, MatchThread, Settings, Terms, Privacy,
                Admin, AdminUsers, AdminUserDetail, AuditLog, AdminFeedback
  hooks/        useProfile, useMatches, useMatchThread, useScreenshotUpload,
                useAdminStats, useAdminUsers, useFeedback
  components/    UploadDropzone, ChatBubble, FlagIcon, Collapsible, AnalysisLoadingState,
                 PaywallGate, TermsGate, SafetyNotice, ProtectedRoute, AdminRoute, Layout,
                 LoadingSpinner, Composer, CopyButton, PageHeader, WingMark
  lib/           supabaseClient, types, legal (LLC name / effective date / terms version),
                 featureFlags, functionError, imageCompression
  context/       AuthContext (session persistence, sign-in/out/deleteAccount)
supabase/
  migrations/    0001_init.sql                     profiles/matches/match_messages schema + RLS
                 0002_legal_hardening.sql           match_label replaces match_name
                 0003_screenshot_cleanup_cron.sql    pg_cron backstop for orphaned screenshots
                 0004_safety_notice.sql              profiles.safety_notice_shown_at
                 0005_terms_versioning.sql           profiles.terms_accepted_at / terms_version
                 0006_match_messages_realtime.sql    realtime on match_messages
                 0007_matches_activity_sort_pin.sql  last_message_at, pinned
                 0008_usage_logging.sql              api_usage_log, model_pricing
                 0009_spending_limits.sql            budget_config, hard/soft-stop
                 0010_admin_dashboard.sql            profiles.is_admin + admin RLS
                 0011_budget_alerts_cron.sql         check-budget-alerts cron
                 0012_fix_admin_rls_recursion.sql    is_admin_user() SECURITY DEFINER helper
                 0013_prompt_caching_and_compaction.sql  cache-tier pricing, conversation_summary
                 0014_match_soft_delete_audit_log.sql    matches.deleted_at + purge cron, audit_log
                 0015_feedback.sql                   feedback table
  functions/
    _shared/persona.ts        GENERATED from docs/dr-wingman-persona.md — do not hand-edit
    _shared/claude.ts         callDrWingman() — the single Anthropic call site, prompt caching + usage logging
    _shared/modeInstructions.ts, supabaseAdmin.ts, adminAuth.ts, spendingGuard.ts, testMode.ts
    analyze-profile-photos/   Profile builder mode
    analyze-match-profile/    Match analysis mode (5-Layer Analysis Framework, v2 persona)
    coach-message/            Ongoing message coaching mode (message-count-aware pacing, compaction)
    delete-account/           Self-service account deletion
    cleanup-stale-screenshots/  Cron-invoked backstop cleanup
    check-budget-alerts/      Cron-invoked spend threshold email alerts (Resend)
    admin-list-users/         Admin-only: joins auth.users + profiles + match counts + spend
    admin-delete-user/        Admin-only: irreversible, justification required, audit-logged
    admin-export-user-data/   Admin-only: per-user legal-request export, audit-logged
docs/            product-spec.md, dr-wingman-persona.md (source of truth for AI persona),
                 legal-hardening-migration-spec.md, risk-verification-spec.md,
                 terms-privacy-final-spec.md, persona-update-spec-v2.md,
                 admin-role-and-match-deletion-spec.md
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
   `logs.test.ts`, `label-format.test.ts`. CI wired up in
   `.github/workflows/test.yml`.
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
9. **Mobile-first "Clean & Trustworthy" UI redesign** — warm neutral /
   slate-teal / sage-amber-danger flag palette replacing an over-saturated
   pink/red theme; Public Sans/IBM Plex Mono type; fixed mobile bottom tab
   nav; structured coach-message cards with flag badges and collapsible
   reasoning sections. Covered every screen (Login, Matches, Match Thread,
   Profile Builder, Settings, Admin, Terms/Privacy).
10. **Spend tracking & guardrails** — every Claude call logged to
    `api_usage_log` with token/cost breakdown (`logUsage()` inside
    `callDrWingman()`); `checkBeforeCall()` in `spendingGuard.ts` enforces
    request-size caps, a latched hard-stop, live monthly-spend hard/soft
    thresholds, and a per-user hourly rate limit; scheduled
    `check-budget-alerts` email job via Resend; minimal `/admin` dashboard
    (daily spend chart, by-feature/by-user breakdown, threshold controls).
11. **Prompt caching + rolling conversation compaction** — persona and
    `coach-message`'s growing history block are both `cache_control`-marked
    (1h TTL); once a match's un-summarized message count exceeds a
    threshold, older messages are folded into `matches.conversation_summary`
    so the verbatim tail stays small and the cached prefix stays stable.
12. **Message-count-aware meetup pacing** — hard floors added to the
    persona (message 1 = opener only, message 2 = earliest to gauge
    openness, message 3 = earliest concrete meetup suggestion), with the
    user's real outbound message number computed deterministically in
    `coach-message/index.ts` rather than left to model inference. A new
    "deflected/redirected" scenario makes the coach pivot to general
    conversation once a meetup ask has been sidestepped, instead of
    re-suggesting it.
13. **Profile reset** — a "Start over" action in Profile Builder clears
    `bio_draft`/`prompts`/`photo_analysis`/`communication_style` so a user
    can rebuild their dating profile from scratch without touching their
    account, matches, or conversation history.
14. **`CLAUDE.md`** added at the repo root — commands and architecture
    guidance for future Claude Code sessions working in this repo.
15. **Match deletion + admin user-management surface** (per
    `docs/admin-role-and-match-deletion-spec.md`) — user-facing soft-delete
    on matches (`deleted_at`, 72h grace window, hourly purge cron); a new
    `/admin/users` (list) and `/admin/users/:id` (detail) surface backed by
    three Edge Functions (`admin-list-users`, `admin-delete-user`,
    `admin-export-user-data`); an append-only, admin-read-only `audit_log`
    table recording every admin deletion/export with a required
    justification/request-reference, viewable at `/admin/audit-log`.
16. **User feedback** — a Settings-page form lets any signed-in user submit
    free-text feedback (new `feedback` table, RLS-scoped insert/select-own
    plus admin-select), readable by the operator at `/admin/feedback`.

## Bugs found and fixed along the way

- **Deno boot error** on Management-API JSON deploys caused by an
  `esm.sh` import — fixed by switching to the `npm:` specifier.
- **Real names stored in `matches.match_name`** — fixed via migration +
  persona guardrails (twice — first pass missed transcript text).
- **Bundler missing `testMode.ts`** in `sharedOrder` — `shouldSimulateFailure`
  was called in bundled functions but never defined. Found by the test suite.
  (The same `sharedOrder` array has since needed two more additions —
  `adminAuth.ts` for the admin Edge Functions — this is a recurring gotcha:
  any new `_shared/*.ts` module must be added to that array or the bundled
  deploy silently omits it.)
- **`max_tokens: 4096` too small** for persona v2's verbose output format —
  every real request silently failed to parse. Raised to `8192`. Found by
  the test suite.
- **SafetyNotice persistence** — investigated as a possible bug (modal
  reappearing in screenshot QA); root-caused to stale data from before
  error-handling was added to the update call, not a real backend/RLS bug.
  Confirmed resolved by direct DB query.
- **Infinite recursion in admin RLS policies** — the first admin-flag
  migration checked `is_admin` via a subquery directly inside a policy on
  `profiles` itself, which re-triggers that same policy forever. Fixed with
  a `SECURITY DEFINER` helper function (`is_admin_user()`) that bypasses RLS
  for its internal check. This is now the standard pattern for every
  admin-gated policy added since (`audit_log`, `feedback`).
- **Duplicate message re-insertion** on repeated screenshot uploads of the
  same scrolled chat — fixed with code-level dedup against the full stored
  transcript, not left to the model to judge "is this message new."
- Several UI bugs from the redesign brief's own screenshots — all fixed and
  verified.

## How things run in this environment (useful for the next session)

- The `supabase` CLI's multi-asset deploy times out in this sandbox — the
  Supabase **Management API** is used instead for SQL execution (`POST
  .../database/query`) and function deploys (`POST`/`PATCH
  .../functions[/{slug}]`), with `scripts/bundle-function-for-deploy.mjs`
  inlining `_shared/*` into a single self-contained file per function
  (required because the Management API's JSON deploy path runs Deno with
  `--no-remote`). **Any new `_shared/*.ts` file must be added to that
  script's `sharedOrder` array** or it's silently missing from the bundle.
- Node's built-in `fetch` doesn't read `HTTPS_PROXY` by default on the Node
  version in this sandbox — prefix Node invocations that hit the Supabase
  API with `NODE_USE_ENV_PROXY=1`. `NODE_EXTRA_CA_CERTS` is already set in
  the environment for TLS trust. `curl` needs `-x "$HTTPS_PROXY" --cacert
  /root/.ccr/ca-bundle.crt` explicitly.
- Persona changes: edit `docs/dr-wingman-persona.md`, then run
  `npm run sync-persona` to regenerate `supabase/functions/_shared/persona.ts`,
  then redeploy every Edge Function that bundles it (all three analysis
  functions) for the change to reach production.
- Neither `npm run build` nor `npm run lint` type-checks
  `supabase/functions/**` (Deno code, excluded from both). A signature
  change to a `_shared/*.ts` export needs its call sites checked by hand.
- Postgres in this project does **not** support `\y`/`\m`/`\M` regex
  word-boundary shorthands — use manual
  `([^[:alnum:]]|^)NAME([^[:alnum:]]|$)` character-class boundaries instead.
- Supabase access tokens are never stored in the repo or scripts — they're
  pasted into chat per-session and should be revoked by the user
  immediately after use (this has been the consistent practice all along).

## What's NOT done / open items for the next session

- No production monitoring/alerting has been set up beyond the pg_cron
  cleanup/purge backstops and the budget-threshold email job.
- `MONETIZATION_MODE` (ads / subscription / one_time) exists as a feature
  flag (`src/lib/featureFlags.ts`) with `PaywallGate` as the choke point,
  but no real payment/subscription provider is wired up yet — it's a UI
  stub.
- Google/Apple OAuth buttons exist in the UI but the providers are not
  actually configured in the Supabase Auth dashboard (confirmed
  earlier as an expected/known gap, not a bug).
- No production analytics/crash reporting.
- The redesign has not been tested on a real physical device, only via
  Playwright at a simulated 390×844 viewport — worth a real-device pass
  before wider release. Likewise, the new admin delete/export flows and
  the match-deletion UI haven't been click-tested against a live logged-in
  account in this sandbox (no test credentials available here) — worth a
  manual pass.
- `scripts/audit-ai-output.mjs` (admin spot-check tool) exists but hasn't
  been run against a meaningful volume of production data yet.
- Per `docs/admin-role-and-match-deletion-spec.md`'s own open items,
  **not attorney-reviewed**: (1) what counts as a legitimate legal/law-
  enforcement request before the export feature is used for a real one,
  (2) whether admin user-deletion should be the official CCPA/GDPR
  right-to-erasure path (and if so, whether it needs a documented SLA in
  the Privacy Policy), (3) audit log retention period. The user has
  confirmed admin access stays scoped to the single seeded
  `lakhjitsingh8@gmail.com` account — no second admin tier was built.
- The feedback feature has no email/Slack notification on new submissions
  — an operator has to check `/admin/feedback` manually. Resend is already
  wired up for budget alerts if that's wanted later.

## Testing

```
npm run build   # tsc -b && vite build — currently clean
npm run lint    # eslint . — currently 0 errors, 2 pre-existing fast-refresh warnings
npm test        # vitest run — integration suite against the LIVE Supabase project + Claude API,
                # requires real Supabase credentials, not run in CI without them configured
```
