import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

const BUCKET = 'screenshots-temp'
const STALE_AFTER_MS = 15 * 60 * 1000

/**
 * Backstop for the no-persistent-image-retention requirement: the
 * per-request Edge Functions delete their own screenshots as soon as the
 * Claude call returns, but if that explicit delete ever silently fails
 * (crash, timeout), this scheduled sweep catches it. Restricted to the
 * service-role caller (the pg_cron job) — the anon key is public, and this
 * acts across every user's storage, so it must not be triggerable by
 * ordinary authenticated/anon requests even though they carry a validly
 * signed JWT.
 */
function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const payloadSegment = token.split('.')[1]
  if (!payloadSegment) return false
  try {
    const json = atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json)
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  if (!isServiceRoleRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const { data: folders, error: listFoldersError } = await supabaseAdmin.storage
      .from(BUCKET)
      .list('', { limit: 1000 })
    if (listFoldersError) throw listFoldersError

    const now = Date.now()
    let deletedCount = 0

    for (const folder of folders ?? []) {
      // Top-level entries are per-user folders (upload path is `${userId}/...`);
      // a real folder entry has no `id`. Skip anything else defensively.
      if (folder.id !== null) continue

      const { data: files, error: listFilesError } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(folder.name, { limit: 1000 })
      if (listFilesError) {
        console.error(`cleanup: failed to list folder ${folder.name}: ${listFilesError.message}`)
        continue
      }

      const stalePaths = (files ?? [])
        .filter((f) => f.created_at && now - new Date(f.created_at).getTime() > STALE_AFTER_MS)
        .map((f) => `${folder.name}/${f.name}`)

      if (!stalePaths.length) continue

      const { error: removeError } = await supabaseAdmin.storage.from(BUCKET).remove(stalePaths)
      if (removeError) {
        console.error(`cleanup: failed to remove stale screenshots in ${folder.name}: ${removeError.message}`)
        continue
      }
      deletedCount += stalePaths.length
    }

    console.log(`cleanup: removed ${deletedCount} stale screenshot(s)`)
    return new Response(JSON.stringify({ ok: true, deleted: deletedCount }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
