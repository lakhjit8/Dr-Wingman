import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabaseAdmin.ts'

/**
 * Called by InviteGate right after a user authenticates (any method — email
 * OTP or OAuth all pass through this same post-login gate, mirroring
 * TermsGate). Claiming is atomic (`update ... where used_by is null`) so
 * two people redeeming the same code at the same moment can't both win it.
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
    const body = await req.json()
    const rawCode: string | undefined = body.code
    const code = rawCode?.trim().toUpperCase()

    if (!code) {
      return new Response(JSON.stringify({ error: 'An invite code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('code', code)
      .is('used_by', null)
      .select('code')
      .maybeSingle()
    if (claimError) throw claimError

    if (!claimed) {
      return new Response(JSON.stringify({ error: 'That invite code is invalid or already used' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ invite_verified: true })
      .eq('id', user.id)
    if (profileError) throw profileError

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
