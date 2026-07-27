import { useState } from 'react'
import { UploadDropzone } from './UploadDropzone'

interface ComposerProps {
  placeholder: string
  attachLabel: string
  sendLabel?: string
  busyLabel?: string
  disabled?: boolean
  onSubmit: (input: { files: File[]; text: string }) => void | Promise<void>
}

/**
 * Combined text + photo-attach input, the single control a user composes
 * into (like a message) instead of a separate upload zone and text field.
 * Shared between the match conversation screen and the profile builder.
 */
export function Composer({ placeholder, attachLabel, sendLabel, busyLabel, disabled, onSubmit }: ComposerProps) {
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showAttach, setShowAttach] = useState(false)

  const canSubmit = !disabled && (text.trim().length > 0 || pendingFiles.length > 0)

  const handleSubmit = async () => {
    if (!canSubmit) return
    const files = pendingFiles
    const submittedText = text.trim()
    setText('')
    setPendingFiles([])
    setShowAttach(false)
    await onSubmit({ files, text: submittedText })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowAttach((v) => !v)}
        disabled={disabled}
        className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M15 3h6v6M21 3l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pendingFiles.length ? `${pendingFiles.length} photo(s) attached` : attachLabel}
      </button>

      {showAttach && (
        <UploadDropzone
          label={pendingFiles.length ? `${pendingFiles.length} photo(s) selected` : attachLabel}
          onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
          disabled={disabled}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-300 px-4 py-2.5 text-base focus:border-wingman-500 focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-[44px] rounded-full bg-wingman-600 px-5 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {disabled ? (busyLabel ?? 'Working…') : (sendLabel ?? 'Send')}
        </button>
      </form>
    </div>
  )
}
