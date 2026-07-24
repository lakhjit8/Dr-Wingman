/**
 * The app's signature visual element (per design direction): the
 * compatibility flag system rendered as custom, understated icons — soft
 * rounded shapes, not raw emoji — rather than decorating everywhere else.
 */
export type FlagKind = 'green' | 'yellow' | 'red'

const STYLES: Record<FlagKind, { bg: string; fg: string }> = {
  green: { bg: 'bg-sage-100', fg: 'text-sage-700' },
  yellow: { bg: 'bg-amber-100', fg: 'text-amber-700' },
  red: { bg: 'bg-danger-100', fg: 'text-danger-700' },
}

export function FlagIcon({ kind }: { kind: FlagKind }) {
  const { bg, fg } = STYLES[kind]
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg} ${fg}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        {kind === 'green' && (
          <path d="M2.5 6.2 5 8.7l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {kind === 'yellow' && (
          <>
            <path d="M6 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="6" cy="8.7" r="0.9" fill="currentColor" />
          </>
        )}
        {kind === 'red' && (
          <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
    </span>
  )
}

export function FlagList({ kind, items }: { kind: FlagKind; items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
          <FlagIcon kind={kind} />
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ul>
  )
}
