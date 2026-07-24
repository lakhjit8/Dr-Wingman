import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AnalysisLoadingState } from '../components/AnalysisLoadingState'
import { truncateAtWord } from '../lib/text'

export function MatchList() {
  const { matches, loading, creating, error, createFromScreenshots } = useMatches()
  const { upload, uploading } = useScreenshotUpload()
  const navigate = useNavigate()
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showUpload, setShowUpload] = useState(false)

  const busy = uploading || creating

  const handleCreate = async () => {
    if (!pendingFiles.length) return
    const paths = await upload(pendingFiles)
    setPendingFiles([])
    const matchId = await createFromScreenshots(paths)
    setShowUpload(false)
    if (matchId) navigate(`/matches/${matchId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Matches</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Upload a match's profile to get a communication-style read and compatibility notes.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="min-h-[44px] shrink-0 whitespace-nowrap self-start rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700 sm:self-auto"
        >
          + New match
        </button>
      </div>

      {showUpload && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <UploadDropzone
            label={
              pendingFiles.length ? `${pendingFiles.length} screenshot(s) selected` : "Upload match's profile screenshots"
            }
            onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
            disabled={busy}
          />
          <button
            onClick={() => void handleCreate()}
            disabled={!pendingFiles.length || busy}
            className="min-h-[44px] rounded-full bg-wingman-600 px-5 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {busy ? 'Analyzing…' : 'Analyze match'}
          </button>
          {busy && <AnalysisLoadingState />}
          {error && <p className="text-sm text-danger-700">{error}</p>}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wingman-50 text-wingman-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 20s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="text-sm font-medium text-neutral-700">No matches yet</p>
          <p className="max-w-xs text-sm text-neutral-500">
            Upload a screenshot of a match's profile and Dr. Wingman will read their communication
            style and suggest an opener.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-1 min-h-[44px] rounded-full bg-wingman-600 px-5 text-sm font-medium text-white hover:bg-wingman-700"
          >
            Upload your first match
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/matches/${m.id}`)}
              className="flex min-h-[44px] items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-wingman-300 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-neutral-900">{m.match_label}</h3>
                  {m.style_summary && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-500">
                      {m.style_summary.pace} pace
                    </span>
                  )}
                </div>
                {m.platform && <p className="mt-0.5 font-mono text-xs text-neutral-400">{m.platform}</p>}
                {m.style_summary?.compatibility_notes && (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {truncateAtWord(m.style_summary.compatibility_notes, 110)}
                  </p>
                )}
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-1 shrink-0 text-neutral-300"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
