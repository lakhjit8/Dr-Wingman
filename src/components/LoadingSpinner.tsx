export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center py-16 text-neutral-500">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-wingman-300 border-t-wingman-600" />
        <span>{label ?? 'Loading…'}</span>
      </div>
    </div>
  )
}
