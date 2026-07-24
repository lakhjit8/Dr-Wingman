# Migration Spec: Legal/Privacy Hardening for Existing App

**Context:** This is not a greenfield build — an app already exists with
working profile analysis, match storage, and messaging features. This spec
describes changes to the *existing* codebase: what to audit, what to
remove, what to add, and how to migrate existing data safely.

---

## Task 1: Remove biometric/ID verification, if present

**Audit:** Check whether the current signup/verification flow collects a
selfie, photo ID, or performs any facial-geometry/identity check.

**If present, remove it entirely** and replace with:
- Email verification (confirmation link) and/or
- Google/Apple OAuth (identity is handled by the provider, we never touch
  biometric data)

**Migration:** If any selfie/ID images already exist in storage from prior
signups, delete them and confirm deletion via a logged audit script. Do not
just mark them inactive — permanently delete the files and any DB rows
referencing them.

**Acceptance criteria:** No code path in the app uploads, stores, or
processes a selfie or government ID.

**Status: verified clean.** No selfie/ID verification flow exists anywhere
in this app — auth is email magic-link + Google/Apple OAuth only. This task
was a no-op.

---

## Task 2: Strip facial/identity analysis from the AI pipeline

**Audit:** Review the current system prompt(s) sent to the vision model for
profile/match analysis. Check whether it currently allows or invites any
commentary on facial features, attractiveness ratings, or identity.

**Change:** Update the system prompt to explicitly instruct the model to:
- Ignore facial geometry, facial features, and any physically-identifying
  details entirely.
- Ignore and never output any name visible in a screenshot (dating apps
  display the match's first name in the UI — this must never be extracted
  or echoed back).
- Analyze only: setting/context, activity type, prompt/bio text content and
  tone, photo composition (solo vs. group, action vs. portrait), and
  communication style signals.

**Acceptance criteria:** Send a test screenshot with a visible name and
confirm the AI's output never contains that name, in either the analysis
text or any structured field.

**Status: implemented.** See the "PRIVACY & IDENTITY SAFEGUARDS" section in
`docs/dr-wingman-persona.md`, verified by `tests/name-leakage.test.ts`.

---

## Task 3: Remove persistent image storage; process in-memory only

**Audit:** Trace the current flow from screenshot upload → AI analysis. Find
every point where the image is written to disk, a storage bucket, a cache,
or a queue/log.

**Change:**
- Refactor so the uploaded image is sent directly from the upload handler to
  the vision API call, without an intermediate persistent-storage write. If
  the current stack requires a storage step, use a bucket with a strict TTL
  enforced by the storage provider itself, an explicit delete call
  immediately after the API response returns, and a scheduled cleanup job as
  a backstop in case the explicit delete fails.
- Remove the image reference/URL from any response payload, log line, or
  error message.

**Migration:** Audit existing storage buckets for any images already
persisted from before this change. Delete all of them.

**Acceptance criteria:** After processing a screenshot, query storage
directly (not through the app) and confirm no image file exists, within one
minute of the analysis completing. No log line anywhere in the pipeline
contains an image URL, file path, or base64 payload.

**Status: implemented.** Explicit delete in a `finally` block
(`supabase/functions/_shared/supabaseAdmin.ts`), plus a scheduled backstop
(`supabase/functions/cleanup-stale-screenshots`, cron-scheduled — see
`supabase/migrations/0003_screenshot_cleanup_cron.sql`). Verified by
`tests/persistence.test.ts` and `tests/logs.test.ts`.

---

## Task 4: Migrate match data schema — remove identifying fields, add AI-generated labels

**Audit:** Inspect the current `matches` table schema for any of: name,
photo URL, platform-specific profile ID, raw bio/prompt text stored
verbatim, or any other field that could re-identify the real person.

**`match_label` generation rule:**
- Format: `[standout communication/style trait], [second trait] (Mon DD)`
  — e.g. `"Outdoorsy, direct communicator (Jul 21)"`.
- Source restricted to tone/activity/personality signals — **never** job
  title, specific location, or physical description.
- Generated **entirely by the AI at analysis time** — no user text input
  field for naming/labeling a match exists in the UI at all.

**Migration steps:** Backfill `match_label` for existing rows from
already-stored analysis data, then drop the identifying column.

**Acceptance criteria:** Query the matches table directly; confirm no column
contains a real name, image reference, or verbatim third-party text. Every
row has a non-null `match_label` in the correct format.

**Status: implemented.** `matches.match_name` (was storing the AI-extracted
real first name) replaced with `match_label`; see
`supabase/migrations/0002_legal_hardening.sql`. Date suffix is computed
server-side (`analyze-match-profile/index.ts`'s `formatMatchLabel`), never
trusted from the model. Verified by `tests/label-format.test.ts`.

---

## Task 5: Update match list UI

**Change:** Replace whatever currently renders as the match list item title
with `match_label`. Remove any "name" input field from the add/edit match
flow entirely.

**Status: implemented.** `src/pages/MatchList.tsx` and
`src/pages/MatchThread.tsx` display `match.match_label`; there was never a
name-entry field in the UI to remove.

---

## Task 6: Restrict AI output framing (defamation-adjacent risk)

**Change:** Update the system prompt to require hedged, profile-based
framing — "this profile suggests..." / "may indicate..." — never unqualified
claims about the person's character or intentions.

**Status: implemented.** See "PRIVACY & IDENTITY SAFEGUARDS" in
`docs/dr-wingman-persona.md`; spot-checked by `scripts/audit-ai-output.mjs`.

---

## Task 7: No shared/public visibility

**Audit:** Confirm there is no existing feature that makes a match's
analysis visible to any user other than the one who uploaded it.

**Status: verified clean.** RLS policies scope every row in `profiles`,
`matches`, and `match_messages` to `auth.uid()` (see
`supabase/migrations/0001_init.sql`). Verified by
`tests/access-control.test.ts`.

---

## Task 8: Terms/Privacy Policy sync check

**Not a code task, but block launch on it:** diff the actual system
behavior against the Terms of Service / Privacy Policy draft to confirm the
stated data practices match what the code actually does.

**Status:** Terms/Privacy pages live at `/terms` and `/privacy`
(`src/pages/Terms.tsx`, `src/pages/Privacy.tsx`), gated by a signup checkbox
and a post-login acceptance gate (`src/components/TermsGate.tsx`,
`profiles.terms_accepted_at`). The automated test suite in
`docs/risk-verification-spec.md` is what keeps this synced going forward —
a failing test means the code no longer matches what these documents claim.
