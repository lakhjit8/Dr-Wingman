# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind, deployed to Vercel
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions, Deno runtime)
- **AI**: Claude API (vision), called only from Supabase Edge Functions — the API key never reaches the browser

## Commands

```bash
npm run dev            # Vite dev server
npm run build           # tsc -b && vite build — must pass with 0 errors before committing
npm run lint            # eslint . — supabase/functions/** is excluded (Deno code, not part of the tsc project)
npm test                # vitest run — full integration suite, see Testing below
npm test -- tests/label-format.test.ts   # run a single test file
npm run sync-persona    # regenerate supabase/functions/_shared/persona.ts from docs/dr-wingman-persona.md
```

Because `tsconfig.json`'s `include` is `["src"]` and eslint ignores `supabase/functions/**`, **neither `npm run build` nor `npm run lint` type-checks the Edge Functions.** A signature change in `supabase/functions/_shared/*.ts` will not surface a stale call site anywhere else in Edge Function code via these commands — check call sites by hand (or with grep) after changing a shared function's signature.

Deploying Edge Functions via the Supabase CLI (`supabase functions deploy <name>`) times out in some sandboxed environments. The fallback is `scripts/bundle-function-for-deploy.mjs <name>`, which inlines `_shared/*` into one self-contained file per function (per a **fixed dependency order** hardcoded in that script — add new shared modules to its `sharedOrder` array in the right position), then a plain JSON `PATCH`/`POST` to the Management API (`https://api.supabase.com/v1/projects/{ref}/functions[/{slug}]`) instead of the CLI's multi-asset upload. Same idea for one-off SQL/migrations: `POST .../database/query` instead of `supabase db push`. Both need a fresh Supabase access token (short-lived; the user provides one per session). Full README has the exact commands.

## Architecture

### Screenshot handling — the core privacy guarantee

1. Frontend uploads screenshot(s) directly to the `screenshots-temp` Storage bucket under the user's own folder (`${userId}/...`).
2. Frontend invokes the relevant Edge Function with the storage path(s).
3. The function downloads the image(s), makes **one** Claude vision call (persona + mode instructions as system/user content), and parses a fenced ` ```json ` block out of the reply.
4. Only the derived text/JSON is written to Postgres; the storage objects are deleted in a `finally` block so cleanup happens even if the Claude call or DB write fails.

Nothing photographic about a match is ever retained past a single request — this is asserted by `tests/persistence.test.ts` and `tests/name-leakage.test.ts`, not just documented. Never weaken the `finally`-block deletion or add a code path that persists an image.

### Persona-as-markdown pipeline

`docs/dr-wingman-persona.md` is the human-edited source of truth for the Dr. Wingman system prompt (5-layer analysis framework, pacing guidelines, investment thermometer, safety/privacy requirements, output contract). `npm run sync-persona` compiles it into `supabase/functions/_shared/persona.ts`, a generated constant — **never hand-edit `persona.ts`**, it's overwritten on every sync. Any edit to the persona doc requires a sync before it takes effect, and requires redeploying every Edge Function that bundles `_shared/persona.ts` (all three analysis functions) for the change to reach production.

### Edge Function call graph

Three analysis modes, one shared call path:

- `analyze-profile-photos` (`profile_builder`), `analyze-match-profile` (`match_analysis`), `coach-message` (`message_coaching`) are the three feature entry points. Each builds mode-specific instructions via a function in `_shared/modeInstructions.ts` (`profileBuilderInstructions` / `matchAnalysisInstructions` / `messageCoachingInstructions`), layered on top of the shared persona.
- All three call through `_shared/claude.ts`'s `callDrWingman()` — the single choke point for the Anthropic request. It builds the content array (optional cached `historyBlock` text block, then images, then task text), sends `system` as a `cache_control`-marked (1h TTL) array, extracts the trailing JSON block from the reply, and unconditionally logs the call (success or failure) to `api_usage_log` via `logUsage()`, including prompt-cache token breakdowns for cost estimation.
- `_shared/spendingGuard.ts`'s `checkBeforeCall()` runs before every Claude call: request-size caps, a latched hard-stop flag, a live monthly-spend check against hard/soft thresholds (latches hard-stop immediately on crossing), then a per-user rolling-hour rate limit. Fails open (allows the call) if `budget_config` is unreadable, since a guardrail outage shouldn't take the app down. `profile_builder` is the one feature cut off at the soft-stop tier; the other two are treated as core and only stop at hard-stop.
- `_shared/supabaseAdmin.ts` provides the service-role client plus screenshot download/delete helpers.
- `_shared/testMode.ts`'s `shouldSimulateFailure()` lets the test suite force a mid-processing failure via an `x-test-force-error` header matching the `TEST_MODE_SECRET` secret, to exercise the cleanup-on-error path without spending a real API call. Inert unless that secret is configured.

### Message-count-aware pacing (coach-message)

The persona's pacing guidelines have hard floors (message 1 = opener only, never mentions meeting up; message 2 = earliest point to gauge openness; message 3 = earliest a concrete meetup suggestion is allowed) plus pace-tier ranges beyond that. `coach-message/index.ts` computes the user's real outbound message number deterministically from the stored transcript (counting `sender === 'user'` rows, +1) and passes it into `messageCoachingInstructions()` rather than trusting the model to infer position-in-conversation from a raw text dump. This mirrors the same philosophy used for message dedup (below): anything computable exactly in code shouldn't be left to model inference.

### Conversation compaction (coach-message)

`coach-message` fetches the full ordered transcript for a match every call. Once `totalCount - summary_through_count` exceeds `MAX_UNCOMPACTED` (24), it folds all but the most recent `KEEP_VERBATIM_TAIL` (8) messages into `matches.conversation_summary` (asking the model to produce an `updated_summary` field) and advances `summary_through_count`. Between compactions the verbatim block only grows by appending — a stable prefix, which is what makes the `historyBlock` cache breakpoint in `callDrWingman` actually pay off across a burst of back-and-forth. The same full transcript fetch is reused (not queried twice) to build a `seen` set for message-dedup: a screenshot of a scrolled chat naturally re-includes messages already parsed from a previous screenshot, so newly parsed messages are filtered against everything already stored for that match before insertion.

### Database

`supabase/migrations/*.sql`, applied in order. Core tables: `profiles` (one row per user, `id` = `auth.users.id`; holds `bio_draft`/`prompts`/`photo_analysis`/`communication_style`, all written together by `analyze-profile-photos`'s upsert), `matches` (one row per match, `style_summary`/`conversation_summary`/`summary_through_count`/pacing fields), `match_messages` (per-message rows, `sender` is `user`/`match`/`coach`). RLS scopes everything to `auth.uid()`. Admin-related policies use a `SECURITY DEFINER` helper function to check `is_admin` — a self-referencing RLS policy on `profiles` checking `profiles.is_admin` directly caused infinite recursion in production; don't reintroduce that pattern.

### Frontend structure

- `src/pages/` — one file per route (`ProfileBuilder`, `MatchList`, `MatchThread`, `Settings`, `Admin`, `Login`, `Terms`, `Privacy`), wired in `src/App.tsx`. Authenticated routes are wrapped in `ProtectedRoute` + `TermsGate` + `Layout`; `/admin` additionally wrapped in `AdminRoute` (checks `profile.is_admin`).
- `src/hooks/` — one hook per data domain (`useProfile`, `useMatches`, `useMatchThread`, `useAdminStats`, `useScreenshotUpload`), each owning its own Supabase queries/Edge Function invocations and exposing `reload`/loading/error state. `supabase.functions.invoke()` calls always pass an explicit `timeout` (Supabase's client has no default timeout and will hang otherwise).
- `src/lib/featureFlags.ts` + `src/components/PaywallGate.tsx` — monetization is flag-driven via `VITE_MONETIZATION_MODE` (`ads` | `subscription` | `one_time`), gated through this single component so switching business models later means changing one component + the env var, not every page that uses it.

## Testing

`tests/` (vitest) is an **integration suite against a real Supabase project and the real Claude API** — not mocked units. It exists to prove the privacy/security claims in the README/Terms/Privacy are actually true in the running code (`docs/risk-verification-spec.md`): no image persistence on success or forced-failure paths (`persistence.test.ts`), no name leakage into stored fields or logs (`name-leakage.test.ts`, synthetic fixture image only), no image data in logs (`logs.test.ts`), RLS enforced at the DB layer not just hidden by UI (`access-control.test.ts`), `match_label` format compliance (`label-format.test.ts`). Requires `tests/.env.test` (copy from `.env.test.example`) and a `TEST_MODE_SECRET` Supabase secret matching that file. Tests create/delete their own throwaway users. CI (`.github/workflows/test.yml`) runs lint+build first, then gates the full integration suite on that passing.

## AI output monitoring

`scripts/audit-ai-output.mjs` is an admin-only spot-check tool (not user-facing): pulls a recent sample of `match_label`/`compatibility_notes` values and heuristically (regex/keyword) flags anything that looks like an unhedged character claim, a possible name/job title, or a label not matching the expected format, for periodic human review. False positives are expected and fine — a human reviews flagged output, nothing is auto-rejected.

## Out of scope (v1)

- No automated/scheduled sending of messages — the user always copies and sends manually on the dating platform.
- No storing of match photos beyond the analysis step, and no cross-referencing a match's photos against external sources.
