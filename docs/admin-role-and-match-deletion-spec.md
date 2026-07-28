# Admin Role, Match Deletion & Legal-Request Export — Spec

**Status:** Ready to hand to Claude Code. Builds on top of the architecture
in `legal-hardening-migration-spec.md` and `risk-verification-spec.md` —
read those first if starting fresh, since this spec assumes their schema
(no `match_name`/`match_photo_url` columns, AI-generated labels, no
persistent image storage).

**Not attorney-reviewed.** The technical capability below (exporting a
user's data in response to a legal/law enforcement request) is safe to
build now, but *when* to actually use it — verifying a request is
legitimate, what you're obligated to hand over, whether to notify the
user — is a legal process, not a technical one. Add this to the existing
attorney-review backlog before you rely on it for a real request.

---

## 1. Match deletion (user-facing)

**Behavior:** soft-delete, then auto-purge. Matches the pattern already
used for transient image cleanup, so there's one retention model across
the app instead of two.

- User taps "Delete" on a match → match is immediately hidden from that
  user's UI (all queries filter on `deleted_at IS NULL`).
- Row is retained with a `deleted_at` timestamp for a short grace window
  — recommend 24–72 hours — long enough to recover from an accidental
  delete, short enough that it's not meaningfully different from "gone."
- A scheduled cleanup job (can reuse the existing image-cleanup job's
  cron infrastructure) hard-deletes rows where `deleted_at` is older than
  the grace window.
- Deleting a match cascades to its associated conversation/message
  records and any draft replies tied to it — nothing photographic or
  textual outlives the match itself.
- No admin involvement needed for this path — it's entirely user-
  initiated and self-service.

**Data model change:**
```sql
ALTER TABLE matches ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
-- RLS: user-facing queries must filter deleted_at IS NULL
-- Cleanup job: DELETE FROM matches WHERE deleted_at < now() - interval '72 hours'
```

---

## 2. Admin role

**Principle: enforced at the database level, not the UI.** A client-side
"if user.email === admin email, show admin panel" check is trivially
bypassed by anyone who can read the frontend bundle or call the API
directly. The actual authorization must live in Supabase Row Level
Security policies.

**Implementation:**
- Add an `is_admin` boolean (or a small `admin_users` table keyed by
  `auth.uid()`) seeded with the account for `lakhjitsingh8@gmail.com`.
  Do not hardcode the email string into RLS policies or app logic —
  reference the seeded admin row/flag instead, so revoking or rotating
  admin access later is a data change, not a code change.
- All admin-only tables/actions (user deletion, data export, audit log
  read) get RLS policies that check `is_admin` for the requesting
  `auth.uid()`. No admin route should rely solely on frontend routing to
  restrict access.
- Admin panel is a separate, auth-gated route — not exposed in the
  regular user navigation.

**Admin capabilities (scoped intentionally — see §4 for what's excluded):**
1. View a list of users and basic per-user info (§2a)
2. Delete a user account (§3)
3. Export a single user's data for a legal/law-enforcement request (§4)
4. View the audit log (§5)

## 2a. Implementation approach: build in-app, not a new framework

**Recommendation: add this as a few more authenticated routes inside the
existing React/Vite app, reusing your current components and Supabase
client — don't introduce a separate admin framework (e.g. Refine, React
Admin) for this.** Those tools earn their keep once you're managing a
dozen+ resource types or multiple admin roles with different permission
levels. Right now you have a handful of screens and one admin account —
a second framework would mean more dependencies, a second design
language to reconcile with your existing "clean & trustworthy" tokens,
and a learning curve, for something that's genuinely small in scope. If
the admin surface grows a lot later (more staff, more data views), Refine
is the one to reach for then — headless, has a first-class Supabase data
provider, and won't fight your existing Tailwind/shadcn components the
way Material-UI-based tools would.

**Suggested structure:**
- New route group, e.g. `/admin/*`, gated by a route guard that checks
  the current user's `is_admin` flag (client-side check for UX/redirect
  only — the real enforcement is the RLS policies from §2, so a
  determined user hitting the API directly is still blocked at the
  database).
- Screens, reusing existing table/card/button components from the main
  app rather than building new primitives:
  - `/admin/users` — list view. Table of users: email, signup date,
    match count, last-active date, API usage/spend if you've built the
    expense-tracking table (join against `api_usage_log` for a per-user
    spend column — useful for spotting abuse here too, not just on the
    cost dashboard).
  - `/admin/users/:id` — detail view. Full per-user info, plus the
    delete action (§3) and "export for legal request" action (§4) live
    here, scoped to that one user.
  - `/admin/audit-log` — read-only table view of the audit log (§5).
- Data fetching: plain Supabase client calls (`supabase.from('...').select()`),
  same pattern already used elsewhere in the app — no new data-fetching
  library needed for this scope.
- Keep the admin routes visually consistent with the rest of the app
  (same type scale, same table/button components) rather than styling
  them as a separate "internal tool" look — it's a small enough surface
  that a second visual language isn't worth maintaining.

---

## 3. User deletion (admin-facing)

- Admin selects a user, confirms deletion (irreversible — this is
  distinct from the soft-delete pattern used for matches; account
  deletion should require an explicit "type the email to confirm" step
  given its weight).
- Cascades: user's matches, conversations, drafts, profile data, and
  auth record are all removed.
- Logged to the audit log before execution, including a required
  justification field (e.g., "user request," "ToS violation," "legal
  request ref #___").
- Consider whether this should also serve as your right-to-erasure
  fulfillment path for CCPA/GDPR-style user deletion requests — if so,
  make the justification field's options reflect that (e.g., a
  "user-initiated erasure request" category), since you'll want to point
  to this log if a deletion request is ever disputed.

---

## 4. Legal-request data export (admin-facing)

Scoped deliberately narrow, per your direction — this is **not** a
general "download user data" bulk-export tool, and shouldn't grow into
one without a separate, explicit decision.

- **Per-user only.** Admin selects one user, not a bulk/all-users export.
- **Requires a request reference before export is generated** — free-text
  field for case number, requesting agency, subpoena reference, etc. This
  is mandatory, not optional, and becomes part of the audit log entry.
- **Export contents are inherently limited by your existing
  architecture** — no real names, no photos, no biometric data, no
  match-partner identifying info ever existed in the database, so none
  can appear in the export. Worth stating this explicitly in the export
  file's header, since it documents *why* the disclosure is narrow rather
  than looking like an oversight.
- **Output:** a single JSON or PDF bundle containing the requesting
  user's own account data, their match records (AI-generated labels
  only, per existing schema), conversation/message text, and generated
  drafts — scoped to that one user's data only.
- **Every export is logged** (§5) with: admin identity, target user,
  timestamp, and the request reference entered.
- **Recommendation, not a technical requirement:** don't wire this
  directly to "click export → file downloads" without a pause step. A
  simple confirmation screen that restates the request reference and
  target user before generating the file adds a moment of friction that's
  cheap to build and meaningfully reduces the chance of an export
  triggered under a mistaken or informal request.

---

## 5. Audit log

- New table, admin-read-only (RLS: only `is_admin` rows can `SELECT`;
  nothing can `UPDATE` or `DELETE` — append-only).
- Fields: `id`, `admin_user_id`, `action` (enum: `user_delete`,
  `data_export`, future actions as needed), `target_user_id`,
  `justification`/`request_reference` text, `created_at`.
- Deliberately does **not** store the exported content or the deleted
  user's data itself — only the fact that an action occurred, on whom,
  and why. This keeps the audit log itself from becoming a second copy
  of sensitive data that needs its own protection.
- Suggest giving this its own long retention period (e.g., indefinite, or
  matched to your state's records-retention norms) separate from the
  short retention on matches/images, since its whole purpose is being
  available if questioned later.

---

## Open items to carry into legal review

- [ ] Confirm what counts as a "legitimate" legal/law-enforcement request
      before this feature is used for a real one (verification process,
      whether user notification is required/permitted, etc.) — this is
      squarely attorney-review territory, not a technical decision.
- [ ] Decide whether admin user-deletion should also be the official
      right-to-erasure fulfillment mechanism for CCPA/GDPR-style requests,
      and if so, whether that needs its own documented SLA (e.g., "within
      45 days") referenced in the Privacy Policy.
- [ ] Decide audit log retention period and who (if anyone besides the
      admin) can review it — e.g., should your wife, as co-owner, have
      read access to the audit log even without full admin/deletion
      power?
