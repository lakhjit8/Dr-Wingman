# Spec: Automated Risk Verification + Remaining Code Tasks

**Context:** This builds on `legal-hardening-migration-spec.md`, which
covers removing biometric collection, stopping persistent image storage,
and stripping names from match data. This spec covers what wasn't in that
one: **automated tests that prove those changes actually work** (not just
that they were written), plus two remaining product features (safety
notice, output monitoring).

The core problem this spec solves: a policy that's true in the spec
document but not verified in the running code is functionally the same risk
as not having the policy at all. Everything in Section 1 exists to close
that gap with tests, not just implementation.

---

## Section 1: Automated Verification Tests (highest priority)

Add these as part of the test suite / CI pipeline, not manual QA steps.
Each should fail the build if violated.

### 1.1 No image persistence
- Test: upload a screenshot through the full analysis flow, wait for the
  response, then query the storage bucket/database directly (not through
  app APIs) and assert no file exists referencing that upload.
- Test: repeat with a forced API failure mid-processing (mock the vision
  API to error) and assert the transient copy is still cleaned up — don't
  let error paths skip cleanup logic.
- Test: run this as a scheduled job in production too (not just CI) — e.g.
  a nightly check that the storage bucket is empty of anything older than
  the TTL window, alerting if not.

### 1.2 No name leakage
- Test: send a screenshot containing a known test name (e.g. mock a
  screenshot with "Sarah" visible) through analysis, then assert:
  - The returned analysis text does not contain "Sarah"
  - The stored `match_label`, `communication_style`, and
    `compatibility_notes` fields do not contain "Sarah"
  - No log line generated during the request contains "Sarah"
- Run this with a handful of different names/formats to catch edge cases
  (name in a prompt answer text vs. name in the platform's UI chrome).

### 1.3 No image data in logs/errors
- Test: trigger both a successful request and a forced error, then grep
  application logs for base64 patterns, image URLs, or file paths. Assert
  none are present in either case.

### 1.4 Row-level access control
- Test: as User A, attempt to query User B's match data directly via the
  API (not just through the UI). Assert this is rejected at the database/
  API layer, not just hidden client-side.

### 1.5 Label format compliance
- Test: run a batch of sample match analyses and assert every generated
  `match_label` matches the expected pattern (style traits + date, no
  digits-only counters, no obvious identifying detail like job titles).
  Flag for manual review any output that doesn't fit the expected shape,
  rather than silently accepting it.

**Acceptance criteria for this section:** All five test categories run in
CI on every deploy. A failing test blocks deployment. Document the results
somewhere durable (test report artifact) so there's a record — this is the
"proof" referenced in the plan, not just a one-time check.

---

## Section 2: AI Output Spot-Check Tooling

Build a lightweight internal tool (admin-only, not user-facing) to support
ongoing review of AI output quality/compliance:

- Pull a random sample (e.g. last 50) of generated `compatibility_notes`
  and `match_label` values.
- Flag any that:
  - Contain unhedged claims about a person's character ("this person is
    dishonest" vs. "this profile may suggest...")
  - Contain what looks like a proper name, job title, or specific location
  - Don't match the expected label format
- Output a simple pass/fail report the founder can review periodically
  (weekly during early operation, monthly once stable).

This doesn't need to be fancy — a script that queries the DB and applies
some regex/keyword heuristics plus a manual review checklist is enough for
launch. Don't over-invest here; it's a monitoring tool, not a product
feature.

---

## Section 3: State Dating-Safety Notice

Add a safety notice, shown once at first use of any date-planning-adjacent
feature (and available afterward in a help/safety section):

> **Meeting someone new? A few reminders:**
> Meet in a public place for your first meeting. Tell a friend or family
> member where you're going and when you expect to be back. Arrange your
> own transportation to and from the meeting. Trust your instincts — if
> something feels wrong, it's okay to leave.

Implementation notes:
- Should appear as a dismissible modal or banner the first time a user's
  conversation with the AI reaches a "suggest next steps" / date-planning
  point, not buried in onboarding where it'll be skipped unread.
- Keep a persistent link to it in settings/help.
- Log that the notice was shown (not necessarily that it was read) for
  compliance record-keeping — a timestamp is enough.

---

## Section 4: What This Spec Does NOT Cover

These are from the risk-reduction plan but aren't code tasks — flagging so
they don't get lost, but Claude Code shouldn't attempt these:
- LLC formation and maintaining a separate business bank account
- Cyber-liability/tech E&O insurance purchase
- Attorney review of the Terms of Service / Privacy Policy document
- Confirming state-specific safety-notice legal thresholds (the notice in
  Section 3 is included regardless of the answer, as a low-cost precaution)

---

## Suggested order

1. Section 1.1-1.3 (persistence, name-leakage, log tests) — these verify
   the highest-risk items from the migration spec are actually true.
2. Section 1.4 (access control test) — quick to add, catches a different
   class of bug.
3. Section 3 (safety notice) — self-contained, no dependencies.
4. Section 1.5 + Section 2 (label compliance test + spot-check tool) — do
   these once the label-generation logic from the migration spec has been
   running long enough to have real sample data to test against.

---

## Implementation notes (added after implementation)

- Test suite lives in `tests/` (Vitest), documented in the README's
  "Testing" section. These are real integration tests against a live
  Supabase project and the real Claude API — not mocked units — since the
  thing being verified is actual runtime behavior, not code structure.
- The forced-failure path (1.1's second test, and 1.3's error-path check)
  is driven by `supabase/functions/_shared/testMode.ts`: a header-gated hook
  that only activates if the `TEST_MODE_SECRET` Edge Function secret is
  explicitly configured, so it can't be triggered in any deployment that
  hasn't opted in.
- 1.2's test fixture (`tests/fixtures/name-leak-test.png`) is generated by a
  small pure-JS PNG encoder (`tests/fixtures/generate-name-leak-fixture.mjs`)
  rather than a real screenshot or a native canvas library, so it's fully
  synthetic (no real person's data) and portable to any CI environment
  without native image-library dependencies.
- Section 2's tool is `scripts/audit-ai-output.mjs`.
