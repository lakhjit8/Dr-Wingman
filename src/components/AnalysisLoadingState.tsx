import { useEffect, useState } from 'react'

const STAGES = ['Reading the profile…', 'Analyzing communication style…', 'Drafting your next move…']

/** Staged loading text so the multi-second AI analysis wait feels purposeful, not stalled. */
export function AnalysisLoadingState() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="my-3 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-wingman-200 border-t-wingman-600" />
      {STAGES[stage]}
    </div>
  )
}
