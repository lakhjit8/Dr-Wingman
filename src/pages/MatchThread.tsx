import { useParams, Navigate, Link } from 'react-router-dom'
import { useMatchThread } from '../hooks/useMatchThread'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { useProfile } from '../hooks/useProfile'
import { ChatBubble } from '../components/ChatBubble'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SafetyNotice } from '../components/SafetyNotice'
import { AnalysisLoadingState } from '../components/AnalysisLoadingState'
import { Composer } from '../components/Composer'

export function MatchThread() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, messages, loading, coaching, error, sendToCoach } = useMatchThread(matchId)
  const { upload, uploading } = useScreenshotUpload()
  const { profile } = useProfile()

  if (!matchId) return <Navigate to="/matches" replace />

  const busy = uploading || coaching

  const handleSend = async ({ files, text }: { files: File[]; text: string }) => {
    const paths = files.length ? await upload(files) : undefined
    await sendToCoach({ paths, userText: text || undefined })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex h-[calc(100vh-12.5rem)] flex-col sm:h-[calc(100vh-8rem)]">
      {profile && <SafetyNotice alreadyShown={Boolean(profile.safety_notice_shown_at)} />}
      <div className="-mx-4 -mt-6 mb-3 flex items-center gap-3 bg-wingman-900 px-4 py-6 sm:-mx-0 sm:mt-0 sm:rounded-2xl sm:px-6">
        <Link
          to="/matches"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="Back to matches"
        >
          ←
        </Link>
        <div>
          <h1 className="font-display text-[17px] font-bold text-white">{match?.match_label ?? 'Match'}</h1>
          {match?.style_summary && (
            <span className="mt-0.5 inline-block rounded-full bg-amber-500 px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-wingman-900">
              {match.style_summary.pace} pace
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {messages.length === 0 && !busy ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wingman-50 text-wingman-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 5h16v11H8l-4 4V5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="max-w-xs text-sm text-neutral-500">
              Drop in a screenshot of your conversation, or ask Dr. Wingman what to say next.
            </p>
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
        {busy && <AnalysisLoadingState />}
      </div>

      {error && <p className="mb-2 text-sm text-danger-700">{error}</p>}

      <div className="border-t border-neutral-200 pt-3">
        <Composer
          placeholder="Ask Dr. Wingman what to say next…"
          attachLabel="+ Add screenshot"
          busyLabel="Thinking…"
          disabled={busy}
          onSubmit={handleSend}
        />
      </div>
    </div>
  )
}
