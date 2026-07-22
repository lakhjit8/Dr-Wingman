import { ReactNode } from 'react'
import { MONETIZATION_MODE } from '../lib/featureFlags'

interface PaywallGateProps {
  /** Whether the current user already has access (active subscription / purchase / within free quota). */
  hasAccess: boolean
  children: ReactNode
}

/**
 * Single choke point for monetization UI. In "ads" mode everything is free
 * (an ad slot is expected elsewhere in the layout); "subscription" and
 * "one_time" modes block with an upgrade prompt when hasAccess is false.
 * Swapping monetization models later means changing this component and
 * VITE_MONETIZATION_MODE, not the pages that use it.
 */
export function PaywallGate({ hasAccess, children }: PaywallGateProps) {
  if (MONETIZATION_MODE === 'ads' || hasAccess) {
    return <>{children}</>
  }

  const copy =
    MONETIZATION_MODE === 'subscription'
      ? {
          title: 'Subscribe to keep going',
          body: 'You have used your free analyses for today. Subscribe to Dr. Wingman for unlimited coaching.',
        }
      : { title: 'Unlock Dr. Wingman', body: 'Make a one-time purchase to unlock unlimited profile and message coaching.' }

  return (
    <div className="rounded-2xl border border-wingman-200 bg-wingman-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-wingman-800">{copy.title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{copy.body}</p>
      <button className="mt-4 rounded-full bg-wingman-600 px-5 py-2 text-sm font-medium text-white hover:bg-wingman-700">
        {MONETIZATION_MODE === 'subscription' ? 'Subscribe' : 'Unlock'}
      </button>
    </div>
  )
}
