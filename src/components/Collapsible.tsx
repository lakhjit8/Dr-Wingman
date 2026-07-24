import { useState, ReactNode } from 'react'

export function Collapsible({
  label,
  openLabel,
  children,
  defaultOpen = false,
}: {
  label: string
  openLabel?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-wingman-700 hover:text-wingman-800"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          <path d="M4 2.5 8 6l-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? (openLabel ?? label) : label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
