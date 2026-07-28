import { ReactNode, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'
import { extractFunctionErrorMessage } from '../lib/functionError'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Blocks access to the rest of the app until the signed-in user has
 * redeemed a valid invite code. Enforced post-login (like TermsGate) rather
 * than at signup, since OAuth redirects straight past any pre-signup
 * checkpoint and this needs to catch every auth method uniformly. A user
 * can still create a real Supabase account without a code — they just get
 * stuck here, which is an acceptable tradeoff for a small invite-only beta.
 *
 * Admins bypass this gate: they're the only ones who can generate codes
 * (via /admin/invite-codes), so requiring one from an admin account would
 * be a lockout with no way out.
 */
export function InviteGate({ children }: { children: ReactNode }) {
  const { profile, loading, reload } = useProfile()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (profile?.invite_verified || profile?.is_admin) return <>{children}</>

  const handleSubmit = async () => {
    if (!code.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: fnError } = await supabase.functions.invoke('claim-invite-code', {
        body: { code },
        timeout: 15_000,
      })
      if (fnError) throw fnError
      await reload()
    } catch (e) {
      setError(await extractFunctionErrorMessage(e, 'Failed to redeem invite code'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">You're invited — almost there</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Dr. Wingman is in a closed beta. Enter your invite code to continue.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit()
          }}
          placeholder="Invite code"
          className="mt-4 w-full rounded-full border border-neutral-300 px-4 py-2.5 text-base tracking-wide focus:border-wingman-500 focus:outline-none sm:text-sm"
        />
        {error && <p className="mt-2 text-sm text-danger-700">{error}</p>}
        <button
          onClick={() => void handleSubmit()}
          disabled={!code.trim() || submitting}
          className="mt-4 min-h-[44px] w-full rounded-full bg-wingman-600 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
