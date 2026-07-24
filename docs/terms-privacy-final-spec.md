# Implementation Spec: Terms of Service & Privacy Policy Pages (Final)

**Context:** Supersedes the placeholder governing-law section from the
earlier working draft. Adds two requirements: version tracking (so existing
accounts get re-prompted when the terms materially change) and the actual
operating entity name.

Requirements:
1. Acceptance gate at signup — checkbox required before account creation
   completes, linking to both `/terms` and `/privacy`.
2. Record acceptance — `terms_accepted_at` (timestamp) and `terms_version`
   on the user record.
3. Versioning — a `CURRENT_TERMS_VERSION` constant (e.g. `"2026-07-24"`).
   Existing users predating a version bump get prompted to re-accept on
   next login before continuing.
4. Fill in the LLC legal name and product name placeholders before this is
   publicly live.

## What changed from the prior draft

- Operating entity now named explicitly: **LD Vending LLC**, a California
  LLC (existing entity, previously used for a vending machine business, now
  also operating this app as a second business line).
- Governing law/venue (§11) filled in as California / San Joaquin County —
  a reasonable default for a small operator, not a negotiated
  choice-of-law strategy. Still worth an attorney check, but no longer an
  open placeholder.
- Everything else carries forward from the prior draft: no biometric
  verification, no facial analysis, no persistent image storage, no match
  names.

## Still open (unresolved, flagged for the founder/attorney, not code tasks)

1. Arbitration/class-action-waiver decision (§11) — deliberately left to
   attorney rather than defaulted.
2. State-mandated dating-safety notice thresholds (CA, NY, TX, FL, NJ) —
   the safety notice itself already ships regardless of the answer (see
   `risk-verification-spec.md`, Section 3).
3. GDPR applicability if EU users arrive.
4. Final attorney review before this goes live publicly — still a
   founder-assembled draft, not a finished legal document.

## Implementation notes

- Full text lives in `src/pages/Terms.tsx` and `src/pages/Privacy.tsx`.
  `LLC_LEGAL_NAME`, `EFFECTIVE_DATE`, and `CURRENT_TERMS_VERSION` are
  centralized in `src/lib/legal.ts` — the only file that needs editing to
  update any of the three.
- `profiles.terms_version` (migration `0005_terms_versioning.sql`) drives
  re-acceptance: existing rows get `null`, which never equals
  `CURRENT_TERMS_VERSION`, so every account — including ones that already
  accepted under the earlier boolean-only gate — is naturally prompted to
  re-accept on next login. `TermsGate.tsx` enforces this app-wide (a
  stricter interpretation than the spec's "at least block match-analysis
  features" — simpler to reason about and more conservative).
