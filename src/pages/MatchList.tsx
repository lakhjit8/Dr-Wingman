import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AnalysisLoadingState } from '../components/AnalysisLoadingState'
import { PageHeader } from '../components/PageHeader'

export function MatchList() {
  const {
    matches,
    allMatches,
    loading,
    creating,
    error,
    createFromScreenshots,
    sortBy,
    setSortBy,
    sortAscending,
    setSortAscending,
    togglePin,
    deleteMatch,
    searchQuery,
    setSearchQuery,
  } = useMatches()
  const { upload, uploading } = useScreenshotUpload()
  const navigate = useNavigate()
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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
      <PageHeader title="Matches" subtitle="Understand them before you reply" />

      <button
        onClick={() => setShowUpload((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-2xl bg-wingman-700 px-4 py-3.5 text-left hover:bg-wingman-800"
      >
        <span>
          <span className="block font-display text-[14.5px] font-bold text-white">+ New match</span>
          <span className="mt-0.5 block text-xs text-white/65">Upload a profile screenshot</span>
        </span>
        <span className="text-lg text-amber-500">↑</span>
      </button>

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

      {!loading && allMatches.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matches…"
            className="min-h-[36px] w-full rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-700 focus:border-wingman-500 focus:outline-none sm:max-w-xs"
          />
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="match-sort" className="text-neutral-500">
              Sort by
            </label>
            <select
              id="match-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="min-h-[36px] rounded-full border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:border-wingman-500 focus:outline-none"
            >
              <option value="last_message">Last active</option>
              <option value="match_date">Matched date</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAscending((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 hover:bg-neutral-100"
              aria-label={sortAscending ? 'Sort descending' : 'Sort ascending'}
              title={sortAscending ? 'Oldest first' : 'Newest first'}
            >
              {sortAscending ? '↑' : '↓'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : allMatches.length === 0 ? (
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
      ) : matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">
          No matches found for "{searchQuery}".
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (confirmDeleteId === m.id) return
                navigate(`/matches/${m.id}`)
              }}
              onKeyDown={(e) => {
                if (confirmDeleteId === m.id) return
                if (e.key === 'Enter' || e.key === ' ') navigate(`/matches/${m.id}`)
              }}
              className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left transition-colors hover:border-wingman-300 hover:shadow-sm"
            >
              <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-wingman-300 to-wingman-700" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-neutral-900">{m.match_label}</h3>
                  {m.style_summary && (
                    <span className="rounded-full bg-wingman-100 px-2 py-0.5 font-mono text-[10.5px] text-wingman-700">
                      {m.style_summary.pace} pace
                    </span>
                  )}
                </div>
                {m.platform && <p className="mt-0.5 font-mono text-xs text-neutral-400">{m.platform}</p>}
                {m.style_summary?.compatibility_notes && (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-neutral-600">
                    {m.style_summary.compatibility_notes}
                  </p>
                )}
                {confirmDeleteId === m.id && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger-50 p-2">
                    <p className="flex-1 text-xs text-danger-800">Delete this match?</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteId(null)
                      }}
                      className="min-h-[28px] rounded-full border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void deleteMatch(m.id)
                        setConfirmDeleteId(null)
                      }}
                      className="min-h-[28px] rounded-full bg-danger-600 px-2.5 text-xs font-semibold text-white hover:bg-danger-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void togglePin(m.id, !m.pinned)
                  }}
                  aria-label={m.pinned ? 'Unpin match' : 'Pin match to top'}
                  aria-pressed={m.pinned}
                  title={m.pinned ? 'Unpin' : 'Pin to top'}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    m.pinned ? 'text-amber-500' : 'text-neutral-300 hover:text-neutral-500'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={m.pinned ? 'currentColor' : 'none'} aria-hidden="true">
                    <path
                      d="M12 2l1.5 6.5L20 10l-6 4 1 7-3-3.5L9 21l1-7-6-4 6.5-1.5L12 2Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDeleteId(m.id)
                  }}
                  aria-label="Delete match"
                  title="Delete"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:text-danger-600"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7h12Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
