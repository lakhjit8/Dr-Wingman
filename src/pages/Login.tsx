import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { user, signInWithEmail, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/matches" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-semibold text-wingman-700">Dr. Wingman</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">
          Your AI dating communication coach.
        </p>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => void signInWithOAuth('google')}
            className="w-full rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Continue with Google
          </button>
          <button
            onClick={() => void signInWithOAuth('apple')}
            className="w-full rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Continue with Apple
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          or
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

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
              className="w-full rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-wingman-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-full bg-wingman-600 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending link…' : 'Continue with email'}
            </button>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">
          By continuing you agree to our Terms of Service. You are responsible for how you use
          generated content on third-party dating platforms.
        </p>
      </div>
    </div>
  )
}
