import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const SAFETY_NOTICE_TEXT = [
  'Meet in a public place for your first meeting.',
  "Tell a friend or family member where you're going and when you expect to be back.",
  'Arrange your own transportation to and from the meeting.',
  "Trust your instincts — if something feels wrong, it's okay to leave.",
]

/**
 * Shown once, the first time a user reaches a date-planning-adjacent point
 * (opening a match thread, where the coach starts suggesting next steps).
 * Logs that it was shown (a timestamp) as soon as it renders — dismissal
 * closes the modal but isn't required for the log to exist, per the spec's
 * "log that the notice was shown, not necessarily that it was read."
 */
export function SafetyNotice({ alreadyShown }: { alreadyShown: boolean }) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(!alreadyShown)

  useEffect(() => {
    if (alreadyShown || !user) return
    void supabase
      .from('profiles')
      .update({ safety_notice_shown_at: new Date().toISOString() })
      .eq('id', user.id)
  }, [alreadyShown, user])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-neutral-900">Meeting someone new? A few reminders:</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-neutral-700">
          {SAFETY_NOTICE_TEXT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <button
          onClick={() => setVisible(false)}
          className="mt-5 w-full rounded-full bg-wingman-600 py-2.5 text-sm font-medium text-white hover:bg-wingman-700"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
