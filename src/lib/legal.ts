/**
 * Single source for the values that appear throughout the Terms/Privacy
 * pages, so filling them in is a one-file edit. CURRENT_TERMS_VERSION
 * drives re-acceptance: bumping it means every existing account (including
 * ones that already accepted an older version) gets prompted to re-accept
 * on next login before continuing — see TermsGate.tsx.
 */
export const LLC_LEGAL_NAME = 'LD Vending LLC'
export const EFFECTIVE_DATE = 'July 24, 2026'
export const CURRENT_TERMS_VERSION = '2026-07-24'
