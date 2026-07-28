import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { WingMark } from '../components/WingMark'

// Google/Apple aren't configured as OAuth providers in Supabase yet (needs
// developer-console setup on both sides first) — hidden rather than left
// live and broken. Flip back on once both are wired up.
const OAUTH_ENABLED = false

export function Login() {
  const { user, signInWithEmail, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/matches" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setStatus('sending')
    setError(null)
    const { error: signInError } = await signInWithEmail(email)
    if (signInError) {
      setError(signInError)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-wingman-900 px-6">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-wingman-600">
        <WingMark size={44} />
      </div>
      <h1 className="font-display text-2xl font-bold text-white">Dr. Wingman</h1>
      <p className="mb-6 mt-1 text-center text-sm text-white/60">
        Your AI dating communication coach.
      </p>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <label className="flex items-start gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I'm 18 or older and agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {OAUTH_ENABLED && (
          <>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => void signInWithOAuth('google')}
                disabled={!agreed}
                className="min-h-[44px] w-full rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue with Google
              </button>
              <button
                onClick={() => void signInWithOAuth('apple')}
                disabled={!agreed}
                className="min-h-[44px] w-full rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue with Apple
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              or
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
          </>
        )}

        {status === 'sent' ? (
          <p className="rounded-xl bg-wingman-50 p-3 text-center text-sm text-wingman-700">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-neutral-300 px-4 py-2.5 text-base focus:border-wingman-500 focus:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={status === 'sending' || !agreed}
              className="min-h-[44px] w-full rounded-full bg-wingman-600 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {status === 'sending' ? 'Sending link…' : 'Continue with email'}
            </button>
            {error && <p className="text-center text-sm text-danger-700">{error}</p>}
          </form>
        )}
      </div>

      <p className="mt-6 max-w-xs text-center text-xs text-white/35">
        You are responsible for how you use generated content on third-party dating platforms.
      </p>
    </div>
  )
}
