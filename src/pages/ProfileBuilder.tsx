import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function ProfileBuilder() {
  const { profile, loading, analyzing, error, analyzePhotos } = useProfile()
  const { upload, uploading } = useScreenshotUpload()
  const [notes, setNotes] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const busy = uploading || analyzing

  const handleAnalyze = async () => {
    if (!pendingFiles.length) return
    const paths = await upload(pendingFiles)
    setPendingFiles([])
    await analyzePhotos(paths, notes || undefined)
  }

  if (loading) return <LoadingSpinner />

  const analysis = profile?.photo_analysis

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">My Profile</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload 3-9 photos and Dr. Wingman will read what they communicate, then draft a bio and
          prompt answers that complement them.
        </p>
      </div>

      <UploadDropzone
        label={pendingFiles.length ? `${pendingFiles.length} photo(s) selected` : 'Upload your photos'}
        hint="Drag and drop, or click to browse"
        onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
        disabled={busy}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Anything you want Dr. Wingman to know? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. I'm looking for something serious, I travel a lot for work..."
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-wingman-500 focus:outline-none"
        />
      </div>

      <button
        onClick={() => void handleAnalyze()}
        disabled={!pendingFiles.length || busy}
        className="rounded-full bg-wingman-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-wingman-700 disabled:opacity-50"
      >
        {busy ? 'Analyzing…' : 'Analyze photos & build profile'}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {analysis && (
        <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-wingman-700">
              Overall vibe
            </h2>
            <p className="mt-1 text-neutral-800">{analysis.overall_vibe}</p>
            <span className="mt-1 inline-block rounded-full bg-wingman-100 px-2.5 py-0.5 text-xs font-medium text-wingman-700">
              {analysis.communication_style}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Strengths
              </h3>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-neutral-700">
                {analysis.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Gaps to address
              </h3>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-neutral-700">
                {analysis.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Bio draft
            </h3>
            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">
              {analysis.bio_draft}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Prompt suggestions
            </h3>
            <div className="mt-2 space-y-2">
              {analysis.prompt_suggestions.map((p, i) => (
                <div key={i} className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-xs font-semibold text-neutral-500">{p.prompt}</p>
                  <p className="mt-1 text-sm text-neutral-800">{p.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {analysis.photo_requests.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Photos to add
              </h3>
              <div className="mt-2 space-y-2">
                {analysis.photo_requests.map((r, i) => (
                  <div key={i} className="rounded-xl border border-wingman-200 bg-wingman-50 p-3 text-sm">
                    <p className="font-medium text-wingman-800">{r.purpose}</p>
                    <p className="text-neutral-600">
                      {r.setting} · {r.energy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
