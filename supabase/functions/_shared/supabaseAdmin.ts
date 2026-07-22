import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Service-role client: bypasses RLS. Used only server-side, never exposed to the frontend. */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Resolves the calling user from the request's Authorization bearer token (verified via GoTrue). */
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return null
  return data.user
}

const SCREENSHOT_BUCKET = 'screenshots-temp'

/** Downloads a screenshot from the temp bucket as base64, for a single Claude vision call. */
export async function downloadScreenshotAsBase64(
  path: string
): Promise<{ base64: string; mediaType: string }> {
  const { data, error } = await supabaseAdmin.storage.from(SCREENSHOT_BUCKET).download(path)
  if (error || !data) throw new Error(`Failed to download screenshot ${path}: ${error?.message}`)
  const buffer = new Uint8Array(await data.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize))
  }
  const base64 = btoa(binary)
  return { base64, mediaType: data.type || 'image/jpeg' }
}

/**
 * Deletes screenshots from storage. Called unconditionally after the vision
 * call returns (success or failure) so raw images never outlive the
 * analysis step, per the product's no-image-retention requirement.
 */
export async function deleteScreenshots(paths: string[]): Promise<void> {
  if (!paths.length) return
  const { error } = await supabaseAdmin.storage.from(SCREENSHOT_BUCKET).remove(paths)
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete screenshots (retention risk):', paths, error.message)
  }
}
