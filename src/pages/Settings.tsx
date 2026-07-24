import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MONETIZATION_MODE } from '../lib/featureFlags'
import { SAFETY_NOTICE_TEXT } from '../components/SafetyNotice'

export function Settings() {
  const { user, signOut } = useAuth()

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Account</h2>
        <p className="mt-1 text-sm text-neutral-500">{user?.email ?? 'Signed in'}</p>
        <button
          onClick={() => void signOut()}
          className="mt-4 min-h-[44px] rounded-full border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Sign out
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Plan</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Current mode: <span className="font-medium capitalize">{MONETIZATION_MODE.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Privacy</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Screenshots you upload are analyzed and deleted immediately. Only the derived text
          analysis (bios, compatibility notes, parsed conversation history) is saved to your
          account.
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
            Terms of Service
          </Link>
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-wingman-700 underline">
            Privacy Policy
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Meeting someone new? A few reminders:</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-500">
          {SAFETY_NOTICE_TEXT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
