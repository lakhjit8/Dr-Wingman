/**
 * Downscales/re-encodes an image before upload. Claude's vision API
 * internally downsizes anything past ~1568px on the long edge, so sending
 * full-resolution phone photos (often 10MB+) wastes upload time and risks
 * exceeding the Edge Function's processing limits for no quality benefit.
 */
const MAX_DIMENSION = 1568
const JPEG_QUALITY = 0.85

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

  if (scale === 1 && file.size < 1_500_000) {
    bitmap.close()
    return file
  }

  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  )
  if (!blob) return file

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], newName, { type: 'image/jpeg' })
}
