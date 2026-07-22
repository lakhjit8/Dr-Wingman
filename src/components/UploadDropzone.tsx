import { ChangeEvent, DragEvent, useRef, useState } from 'react'

interface UploadDropzoneProps {
  label: string
  hint?: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function UploadDropzone({ label, hint, multiple = true, onFilesSelected, disabled }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (files.length) onFilesSelected(files)
  }

  return (
    <div
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? 'border-wingman-500 bg-wingman-50' : 'border-neutral-300 bg-white'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-wingman-400'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
      />
      <p className="font-medium text-neutral-700">{label}</p>
      {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
      <p className="mt-3 text-xs text-neutral-400">
        Screenshots are analyzed and deleted immediately — nothing photographic is stored.
      </p>
    </div>
  )
}
