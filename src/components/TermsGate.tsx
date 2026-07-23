import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Blocks access to the rest of the app until the user has accepted the
 * Terms/Privacy Policy at least once. Enforced here (post-login) rather than
 * only at signup because OAuth (Google/Apple) redirects straight past any
 * client-side signup checkbox — this is the one gate every auth method
 * passes through.
 */
export function TermsGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { profile, loading, reload } = useProfile()
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (profile?.terms_accepted_at) return <>{children}</>

  const handleAccept = async () => {
    if (!user || !checked) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', user.id)
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    await reload()
    setSaving(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">Before you continue</h1>
        <p className="mt-2 text-sm text-neutral-600">
          We've updated our Terms of Service and Privacy Policy. Please review and accept them to
          keep using Dr. Wingman.
        </p>
        <div className="mt-4 flex gap-2 text-sm">
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
            Terms of Service
          </Link>
          <span className="text-neutral-300">·</span>
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
            Privacy Policy
          </Link>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          I have read and agree to the Terms of Service and Privacy Policy.
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={() => void handleAccept()}
          disabled={!checked || saving}
          className="mt-4 w-full rounded-full bg-wingman-600 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Agree and continue'}
        </button>
      </div>
    </div>
  )
}
