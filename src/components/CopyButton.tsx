import { useState } from 'react'

/** Icon-only copy-to-clipboard button; swaps to a checkmark briefly on success. */
export function CopyButton({ text, label = 'Copy message' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied by the browser; fail silently, button just doesn't confirm.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        copied
          ? 'border-wingman-600 bg-wingman-600 text-white'
          : 'border-wingman-300 bg-white text-wingman-600 hover:border-wingman-500 hover:bg-wingman-50'
      }`}
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
