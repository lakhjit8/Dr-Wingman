import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/imageCompression'

const BUCKET = 'screenshots-temp'

/**
 * Uploads screenshots to the temp storage bucket so an Edge Function can
 * read them for a single Claude vision call. The Edge Function deletes the
 * objects from storage as soon as it's done — this hook never re-reads them.
 * Images are downscaled/re-encoded client-side first: full-resolution phone
 * photos are far bigger than any vision model needs, and pushing that much
 * data through a single Edge Function invocation risks hitting its
 * processing limits.
 */
export function useScreenshotUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const upload = async (files: File[]): Promise<string[]> => {
    if (!user) throw new Error('Must be signed in to upload screenshots')
    setUploading(true)
    try {
      const paths: string[] = []
      for (const rawFile of files) {
        const file = await compressImage(rawFile)
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
        if (error) throw error
        paths.push(path)
      }
      return paths
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}
