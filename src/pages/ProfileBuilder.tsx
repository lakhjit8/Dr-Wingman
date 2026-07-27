import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AnalysisLoadingState } from '../components/AnalysisLoadingState'
import { Composer } from '../components/Composer'
import { PageHeader } from '../components/PageHeader'

type BioChoice = 'ask' | 'new' | 'existing'

const MIN_PHOTOS = 3
const MAX_PHOTOS = 9

export function ProfileBuilder() {
  const { profile, loading, analyzing, error, analyzePhotos, resetProfile } = useProfile()
  const { upload, uploading } = useScreenshotUpload()
  const [bioChoice, setBioChoice] = useState<BioChoice>('ask')
  const [existingBioText, setExistingBioText] = useState('')
  const [reviewFiles, setReviewFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = uploading || analyzing

  useEffect(() => {
    const urls = reviewFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [reviewFiles])

  const resetToAsk = () => {
    setBioChoice('ask')
    setReviewFiles([])
    setExistingBioText('')
    setNotes('')
  }

  const handleFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    setReviewFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS))
    e.target.value = ''
  }

  const removeReviewFile = (index: number) => {
    setReviewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmReviewPhotos = async () => {
    if (reviewFiles.length < MIN_PHOTOS) return
    const paths = await upload(reviewFiles)
    await analyzePhotos(
      paths,
      notes.trim() || undefined,
      bioChoice === 'existing' ? existingBioText.trim() : undefined
    )
    setReviewFiles([])
    setNotes('')
  }

  const handleAddMorePhotos = async ({ files, text }: { files: File[]; text: string }) => {
    if (!files.length) return
    const paths = await upload(files)
    await analyzePhotos(paths, text || undefined, bioChoice === 'existing' ? existingBioText.trim() : undefined)
  }

  const handleResetProfile = async () => {
    setResetting(true)
    setResetError(null)
    const { error: err } = await resetProfile()
    setResetting(false)
    if (err) {
      setResetError(err)
      return
    }
    setConfirmingReset(false)
    resetToAsk()
  }

  if (loading) return <LoadingSpinner />

  const analysis = profile?.photo_analysis

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="What your photos & bio say about you" />

      {!analysis && bioChoice === 'ask' && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-800">
            Do you already have a bio and prompts you'd like to keep, or would you like Dr. Wingman
            to draft new ones?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBioChoice('existing')}
              className="min-h-[44px] rounded-full border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              I have an existing bio
            </button>
            <button
              type="button"
              onClick={() => setBioChoice('new')}
              className="min-h-[44px] rounded-full bg-wingman-700 px-4 font-display text-sm font-bold text-white hover:bg-wingman-800"
            >
              Draft one for me
            </button>
          </div>
        </div>
      )}

      {!analysis && bioChoice !== 'ask' && (
        <button
          type="button"
          onClick={resetToAsk}
          className="-mb-2 flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          ← Back
        </button>
      )}

      {!analysis && bioChoice === 'existing' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">Paste your existing bio</label>
          <textarea
            value={existingBioText}
            onChange={(e) => setExistingBioText(e.target.value)}
            rows={4}
            placeholder="Paste your current bio and prompt answers here…"
            className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-wingman-500 focus:outline-none"
          />
        </div>
      )}

      {!analysis && (bioChoice === 'new' || bioChoice === 'existing') && reviewFiles.length === 0 && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesPicked}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[44px] w-full items-center justify-between rounded-2xl bg-wingman-700 px-4 py-3.5 text-left hover:bg-wingman-800"
          >
            <span>
              <span className="block font-display text-[14.5px] font-bold text-white">↑ Upload your photos</span>
              <span className="mt-0.5 block text-xs text-white/65">3–9 photos for the sharpest read</span>
            </span>
          </button>
        </>
      )}

      {!analysis && reviewFiles.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-neutral-800">Review your photos</p>
            <p className={`font-mono text-xs ${reviewFiles.length < MIN_PHOTOS ? 'text-danger-600' : 'text-neutral-500'}`}>
              {reviewFiles.length} of {MAX_PHOTOS}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, i) => (
              <div key={url} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    MAIN
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeReviewFile(i)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {reviewFiles.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-xl text-neutral-400 hover:border-wingman-400"
              >
                +
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {reviewFiles.length < MIN_PHOTOS
              ? 'Add at least 3 photos for a useful read.'
              : 'The first photo leads on your profile — remove and re-add to reorder.'}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything you want Dr. Wingman to know? (optional)"
            className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-wingman-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void confirmReviewPhotos()}
            disabled={reviewFiles.length < MIN_PHOTOS || busy || (bioChoice === 'existing' && !existingBioText.trim())}
            className="min-h-[44px] w-full rounded-full bg-wingman-700 font-display text-sm font-bold text-white hover:bg-wingman-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {busy ? 'Analyzing…' : 'Analyze photos'}
          </button>
          {bioChoice === 'existing' && !existingBioText.trim() && (
            <p className="text-xs text-neutral-400">Paste your bio above to enable this.</p>
          )}
        </div>
      )}

      {!analysis && busy && <AnalysisLoadingState />}
      {!analysis && error && <p className="text-sm text-danger-700">{error}</p>}

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

          {analysis.bio_draft && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Bio draft
              </h3>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">
                {analysis.bio_draft}
              </p>
            </div>
          )}

          {analysis.prompt_suggestions && analysis.prompt_suggestions.length > 0 && (
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
          )}

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

      {analysis && (
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">Add more photos to refine this</p>
          <Composer
            placeholder="Anything new you want Dr. Wingman to know? (optional)"
            attachLabel="Add more photos"
            sendLabel="Re-analyze"
            busyLabel="Analyzing…"
            disabled={busy}
            onSubmit={handleAddMorePhotos}
          />
          {busy && <AnalysisLoadingState />}
          {error && <p className="text-sm text-danger-700">{error}</p>}
        </div>
      )}

      {analysis && (
        <div className="rounded-2xl border border-danger-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-danger-700">Start over</h2>
          {!confirmingReset ? (
            <>
              <p className="mt-1 text-sm text-neutral-500">
                Clear your bio draft, prompt suggestions, and photo analysis to rebuild your
                profile from scratch.
              </p>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="mt-3 min-h-[44px] rounded-full border border-danger-300 px-4 text-sm font-semibold text-danger-600 hover:bg-danger-50"
              >
                Delete profile & start over
              </button>
            </>
          ) : (
            <div className="mt-3 space-y-3 rounded-xl bg-danger-50 p-4">
              <p className="text-sm text-danger-800">
                This clears your bio draft, prompt suggestions, and photo analysis so you can
                rebuild your profile from scratch. Your account, matches, and conversation
                history are not affected. This cannot be undone.
              </p>
              {resetError && <p className="text-sm text-danger-700">{resetError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  disabled={resetting}
                  className="min-h-[40px] flex-1 rounded-full border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetProfile()}
                  disabled={resetting}
                  className="min-h-[40px] flex-1 rounded-full bg-danger-600 text-sm font-semibold text-white hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetting ? 'Clearing…' : 'Yes, start over'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
