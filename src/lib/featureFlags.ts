/**
 * Monetization is flag-driven so the model can change (free+ads ->
 * subscription -> one-time purchase) without touching app structure.
 * Set VITE_MONETIZATION_MODE in the environment to switch modes.
 */
export type MonetizationMode = 'ads' | 'subscription' | 'one_time'

const RAW_MODE = (import.meta.env.VITE_MONETIZATION_MODE as string | undefined) ?? 'ads'

export const MONETIZATION_MODE: MonetizationMode = (
  ['ads', 'subscription', 'one_time'] as const
).includes(RAW_MODE as MonetizationMode)
  ? (RAW_MODE as MonetizationMode)
  : 'ads'

/** Free daily analysis quota when running in "ads" mode (unlimited for the others, gated by billing instead). */
export const FREE_DAILY_ANALYSES = 5
