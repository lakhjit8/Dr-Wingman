import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabaseAdmin.ts'

/**
 * Deletes the calling user's auth.users row via the GoTrue admin API.
 * profiles/matches/match_messages all cascade via their existing
 * `references auth.users (id) on delete cascade` foreign keys — no
 * separate cleanup needed here.
 */
Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const user = await getUserFromRequest(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
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
