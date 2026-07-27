import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useScreenshotUpload } from '../hooks/useScreenshotUpload'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AnalysisLoadingState } from '../components/AnalysisLoadingState'
import { Composer } from '../components/Composer'

type BioChoice = 'ask' | 'new' | 'existing'

export function ProfileBuilder() {
  const { profile, loading, analyzing, error, analyzePhotos } = useProfile()
  const { upload, uploading } = useScreenshotUpload()
  const [bioChoice, setBioChoice] = useState<BioChoice>('ask')
  const [existingBioText, setExistingBioText] = useState('')

  const busy = uploading || analyzing

  const handleAnalyze = async ({ files, text }: { files: File[]; text: string }) => {
    if (!files.length) return
    const paths = await upload(files)
    await analyzePhotos(paths, text || undefined, bioChoice === 'existing' ? existingBioText.trim() : undefined)
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
              className="min-h-[44px] rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700"
            >
              Draft one for me
            </button>
          </div>
        </div>
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

      {!analysis && (bioChoice === 'new' || bioChoice === 'existing') && (
        <Composer
          placeholder={
            bioChoice === 'existing'
              ? 'Anything else you want Dr. Wingman to know? (optional)'
              : "Anything you want Dr. Wingman to know? (optional) e.g. I'm looking for something serious…"
          }
          attachLabel="Upload your photos"
          sendLabel={bioChoice === 'existing' ? 'Analyze photos' : 'Analyze photos & build profile'}
          busyLabel="Analyzing…"
          disabled={busy || (bioChoice === 'existing' && !existingBioText.trim())}
          onSubmit={handleAnalyze}
        />
      )}
      {!analysis && bioChoice === 'existing' && !existingBioText.trim() && (
        <p className="-mt-4 text-xs text-neutral-400">Paste your bio above to enable this.</p>
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
            onSubmit={handleAnalyze}
          />
          {busy && <AnalysisLoadingState />}
          {error && <p className="text-sm text-danger-700">{error}</p>}
        </div>
      )}
    </div>
  )
}
