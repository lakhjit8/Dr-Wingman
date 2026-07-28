import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useFeedback } from '../hooks/useFeedback'
import { MONETIZATION_MODE } from '../lib/featureFlags'
import { SAFETY_NOTICE_TEXT } from '../components/SafetyNotice'
import { PageHeader } from '../components/PageHeader'

export function Settings() {
  const { user, signOut, deleteAccount } = useAuth()
  const { profile } = useProfile()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { submitFeedback, submitting, error: feedbackError, submitted, resetSubmitted } = useFeedback()
  const [feedbackText, setFeedbackText] = useState('')

  const handleSubmitFeedback = async () => {
    const ok = await submitFeedback(feedbackText)
    if (ok) setFeedbackText('')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteAccount()
    if (error) {
      setDeleteError(error)
      setDeleting(false)
    }
    // On success, the auth state change fires and ProtectedRoute redirects to /login.
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Settings" />

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
        <h2 className="text-sm font-semibold text-neutral-700">Feedback</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Bug reports, feature requests, anything else — goes straight to the person building this.
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => {
            setFeedbackText(e.target.value)
            if (submitted) resetSubmitted()
          }}
          rows={3}
          placeholder="What's on your mind?"
          className="mt-3 w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-wingman-500 focus:outline-none"
        />
        {feedbackError && <p className="mt-2 text-sm text-danger-700">{feedbackError}</p>}
        {submitted && !feedbackText && <p className="mt-2 text-sm text-wingman-700">Thanks — got it.</p>}
        <button
          onClick={() => void handleSubmitFeedback()}
          disabled={!feedbackText.trim() || submitting}
          className="mt-3 min-h-[40px] rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </button>
      </div>

      {profile?.is_admin && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-700">Admin</h2>
          <Link to="/admin" className="mt-2 inline-block text-sm text-wingman-700 underline">
            Usage & spending dashboard
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Meeting someone new? A few reminders:</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-500">
          {SAFETY_NOTICE_TEXT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-danger-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-danger-700">Danger zone</h2>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 min-h-[44px] rounded-full border border-danger-300 px-4 text-sm font-semibold text-danger-600 hover:bg-danger-50"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl bg-danger-50 p-4">
            <p className="text-sm text-danger-800">
              This permanently deletes your account, profile, matches, and all conversation
              history. This cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-danger-700">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="min-h-[40px] flex-1 rounded-full border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="min-h-[40px] flex-1 rounded-full bg-danger-600 text-sm font-semibold text-white hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
