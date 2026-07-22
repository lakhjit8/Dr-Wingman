import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Matches</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Upload a match's profile to get a communication-style read and compatibility notes.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-full bg-wingman-600 px-4 py-2 text-sm font-medium text-white hover:bg-wingman-700"
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
            className="rounded-full bg-wingman-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:opacity-50"
          >
            {busy ? 'Analyzing…' : 'Analyze match'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No matches yet. Upload a screenshot of a match's profile to get started.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/matches/${m.id}`)}
              className="rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:border-wingman-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-neutral-900">{m.match_name}</h3>
                {m.style_summary && (
                  <span className="rounded-full bg-wingman-100 px-2.5 py-0.5 text-xs font-medium text-wingman-700">
                    {m.style_summary.communication_style}
                  </span>
                )}
              </div>
              {m.platform && <p className="mt-0.5 text-xs text-neutral-400">{m.platform}</p>}
              {m.style_summary?.compatibility_notes && (
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                  {m.style_summary.compatibility_notes}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
