# Dr. Wingman

An AI-powered dating communication coach. Upload your own profile photos, a
match's profile, or a conversation screenshot — Dr. Wingman reads
communication-style signals (action-oriented vs. emotional-relational vs.
balanced) and coaches you toward a real date, in your own voice.

See `docs/product-spec.md` for the full product spec and
`docs/dr-wingman-persona.md` for the AI persona / system prompt (kept
separate so the persona can be iterated on independently — see "Persona
sync" below).

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind, deployed to Vercel
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI**: Claude API (vision), called from Supabase Edge Functions only —
  the API key never reaches the browser

## Project layout

```
src/                      React app
  pages/                  Login, ProfileBuilder, MatchList, MatchThread, Settings
  hooks/                  Data-fetching + Edge Function calls (useProfile, useMatches, useMatchThread)
  components/             UI building blocks (UploadDropzone, ChatBubble, PaywallGate, ...)
  lib/                    Supabase client, shared types, feature flags
supabase/
  migrations/0001_init.sql        Schema: profiles, matches, match_messages, storage bucket + RLS
  functions/
    _shared/persona.ts            GENERATED — do not edit, see "Persona sync"
    _shared/claude.ts             Claude API wrapper (system prompt + vision + JSON extraction)
    _shared/modeInstructions.ts   Per-mode instructions appended to the persona system prompt
    _shared/supabaseAdmin.ts      Service-role client, screenshot download/delete helpers
    analyze-profile-photos/       Profile builder mode
    analyze-match-profile/        Match analysis mode
    coach-message/                Message coaching mode
docs/
  product-spec.md                 Product spec
  dr-wingman-persona.md           AI persona / system prompt (source of truth)
  legal-hardening-migration-spec.md   Privacy/identity hardening spec + implementation status
  risk-verification-spec.md           Automated test coverage spec + implementation notes
  terms-privacy-final-spec.md         Terms/Privacy content spec (LLC name, versioning) + status
  persona-update-spec-v2.md           Persona v2 rewrite spec + scope-resolution notes
scripts/
  sync-persona.mjs                Regenerates functions/_shared/persona.ts from docs/dr-wingman-persona.md
  audit-ai-output.mjs              Admin spot-check tool — see "AI output monitoring"
tests/                             Integration test suite — see "Testing"
```

## How screenshot handling works

1. Frontend uploads the screenshot(s) directly to the `screenshots-temp`
   Supabase Storage bucket, under the user's own folder (`${userId}/...`).
2. Frontend invokes the relevant Edge Function with the storage path(s).
3. The Edge Function downloads the image(s), makes **one** Claude vision
   call with the Dr. Wingman persona as the system prompt, and parses the
   structured JSON out of the reply.
4. The Edge Function writes only the derived text/JSON to Postgres
   (`profiles`, `matches`, `match_messages`) and then deletes the storage
   objects — in a `finally` block, so deletion happens even if the Claude
   call or DB write fails.
5. Nothing photographic about a match is ever retained past that single
   request.

RLS policies on `storage.objects` additionally scope reads/writes to the
owning user's folder as a defense-in-depth backstop; the Edge Functions use
the service-role key so they can always clean up.

## Persona sync

The Dr. Wingman system prompt lives in `docs/dr-wingman-persona.md` as a
human-editable Markdown doc. Because Supabase bundles each Edge Function
from its own directory, the persona is compiled into a generated TS
constant at `supabase/functions/_shared/persona.ts`. After editing the
persona doc:

```bash
npm run sync-persona
```

Then redeploy the functions (see below). Never hand-edit `persona.ts`
directly — it's overwritten on every sync.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

- Create a project at https://supabase.com.
- In **Authentication > Providers**, enable Email, Google, and Apple (each
  needs OAuth credentials from the respective developer console — set
  redirect URL to your Supabase project's callback URL).
- Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` from **Project Settings > API**.

### 3. Apply the database schema

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates the `profiles`, `matches`, `match_messages` tables (with RLS)
and the `screenshots-temp` storage bucket.

### 4. Deploy the Edge Functions

```bash
npm run sync-persona
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
supabase functions deploy analyze-profile-photos
supabase functions deploy analyze-match-profile
supabase functions deploy coach-message
supabase functions deploy check-budget-alerts
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
into Edge Functions by Supabase — no need to set them manually.

`check-budget-alerts` (the 15-min spending-alert cron job) needs a
[Resend](https://resend.com) API key to send email:

```bash
supabase secrets set RESEND_API_KEY=re_your-key
supabase secrets set ALERT_EMAIL_TO=ldvendingllc@gmail.com   # optional, this is the default
```

Without a verified sending domain in Resend, the default `ALERT_EMAIL_FROM`
(`onboarding@resend.dev`) only works for sending to the address on the
Resend account itself — verify a domain in the Resend dashboard if alerts
need to go to a different address. If `RESEND_API_KEY` isn't set, the
function logs and skips sending rather than failing the cron run.

**If `supabase functions deploy` times out** (some sandboxed/CI environments
can't complete the CLI's multi-asset upload): use
`scripts/bundle-function-for-deploy.mjs`, which inlines `_shared/*` into a
single self-contained file per function, then deploy that via the
Management API's plain JSON endpoint instead of the CLI:

```bash
node scripts/bundle-function-for-deploy.mjs analyze-profile-photos > /tmp/bundle.ts
curl -X POST "https://api.supabase.com/v1/projects/<project-ref>/functions" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data "$(node -e "console.log(JSON.stringify({slug:'analyze-profile-photos',name:'analyze-profile-photos',verify_jwt:true,body:require('fs').readFileSync('/tmp/bundle.ts','utf-8')}))")"
```

Repeat per function. The repo's modular `supabase/functions/<name>/index.ts`
+ `_shared/*` stays the source of truth either way.

### 5. Run the frontend

```bash
npm run dev
```

## Testing

The test suite (`tests/`, run via `npm test`) is **integration tests against
a real Supabase project and the real Claude API** — not mocked units. It
exists to prove the privacy/security claims made in this README and the
Terms/Privacy docs are actually true in the running code, per
`docs/risk-verification-spec.md`'s core premise: an unverified policy is the
same risk as no policy. Covers:

- No image persistence, on both the success path and a forced-failure path
  (`tests/persistence.test.ts`)
- No name leakage into any stored field or log line
  (`tests/name-leakage.test.ts`, using a synthetic fixture image —
  `tests/fixtures/name-leak-test.png` — so no real person's data is ever
  used in a test)
- No image data (base64, storage URLs, raw paths) in logs, success or error
  path (`tests/logs.test.ts`)
- Row-level access control enforced at the database layer, not just hidden
  by the UI (`tests/access-control.test.ts`)
- `match_label` format compliance against real usage data
  (`tests/label-format.test.ts`)

### Running locally

```bash
cp tests/.env.test.example tests/.env.test   # fill in your project's values
supabase secrets set TEST_MODE_SECRET=some-long-random-string
npm test
```

`TEST_MODE_SECRET` lets the test suite force a simulated Claude API failure
(to test the cleanup-on-error path) without spending a real API call — it
must match between the Edge Function secret and `tests/.env.test`. Tests
create and delete their own throwaway users; they don't touch real user
data except read-only queries in `label-format.test.ts` against whatever
matches already exist.

### CI

`.github/workflows/test.yml` runs lint + build on every push, then the full
integration suite (gated on that passing) with results uploaded as a build
artifact. Requires these repository secrets: `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
`SUPABASE_ACCESS_TOKEN`, `TEST_MODE_SECRET`. A failing test fails the
workflow — this is meant to block deploys, not just log a warning.

## AI output monitoring

`scripts/audit-ai-output.mjs` is an admin-only (not user-facing) spot-check
tool — pulls a recent sample of `match_label`/`compatibility_notes` values
and flags anything that looks like an unhedged character claim, a possible
name/job title, or a label that doesn't match the expected format, for
periodic human review (weekly early on, monthly once stable):

```bash
SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/audit-ai-output.mjs
```

It's heuristic (regex/keyword based), not exhaustive — false positives are
expected and fine, since a human reads the flagged output rather than
anything being auto-rejected.

## Deploying the frontend

Push to GitHub and import the repo in Vercel (framework preset: Vite). Set
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MONETIZATION_MODE`
as Vercel project environment variables — the same values as your local
`.env`.

## Monetization

Business model is flag-driven via `VITE_MONETIZATION_MODE` (`ads` |
`subscription` | `one_time`), read in `src/lib/featureFlags.ts` and enforced
through the single `<PaywallGate>` component (`src/components/PaywallGate.tsx`).
Launch mode is `ads` (free); switching models later means changing that one
component and the env var, not the pages that use it.

## Out of scope (v1)

- No automated/scheduled sending of messages — the user always copies and
  sends manually on the dating platform.
- No storing of match photos beyond the analysis step, and no
  cross-referencing a match's photos against external sources.
