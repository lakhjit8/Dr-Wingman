import { useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { useMatchThread } from '../hooks/useMatchThread'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { useProfile } from '../hooks/useProfile'
import { UploadDropzone } from '../components/UploadDropzone'
import { ChatBubble } from '../components/ChatBubble'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SafetyNotice } from '../components/SafetyNotice'

export function MatchThread() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, messages, loading, coaching, error, sendToCoach } = useMatchThread(matchId)
  const { upload, uploading } = useScreenshotUpload()
  const { profile } = useProfile()
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [question, setQuestion] = useState('')

  if (!matchId) return <Navigate to="/matches" replace />

  const busy = uploading || coaching

  const handleSend = async () => {
    let paths: string[] | undefined
    if (pendingFiles.length) {
      paths = await upload(pendingFiles)
      setPendingFiles([])
    }
    const userText = question.trim() || undefined
    if (!paths && !userText) return
    setQuestion('')
    setShowUpload(false)
    await sendToCoach({ paths, userText })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {profile && <SafetyNotice alreadyShown={Boolean(profile.safety_notice_shown_at)} />}
      <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/matches"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
            aria-label="Back to matches"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{match?.match_label ?? 'Match'}</h1>
            {match?.style_summary && (
              <span className="mt-0.5 inline-block rounded-full bg-wingman-100 px-2.5 py-0.5 text-xs font-medium text-wingman-700">
                {match.style_summary.communication_style}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          + Add screenshot
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">
            Drop in a screenshot of your conversation, or ask Dr. Wingman what to say next.
          </p>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
      </div>

      {showUpload && (
        <div className="mb-3">
          <UploadDropzone
            label={pendingFiles.length ? `${pendingFiles.length} screenshot(s) selected` : 'Upload conversation screenshot'}
            onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
            disabled={busy}
          />
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSend()
        }}
        className="flex items-end gap-2 border-t border-neutral-200 pt-3"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Dr. Wingman what to say next…"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-wingman-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || (!question.trim() && !pendingFiles.length)}
          className="rounded-full bg-wingman-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:opacity-50"
        >
          {busy ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
