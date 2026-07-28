import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { getAdminUserFromRequest } from '../_shared/adminAuth.ts'

/**
 * Admin-facing, irreversible user deletion. Distinct from the self-service
 * delete-account function (which only ever targets the caller's own
 * account) — this targets an arbitrary user by id and requires a
 * justification, logged to audit_log *before* the delete executes, per
 * docs/admin-role-and-match-deletion-spec.md §3. profiles/matches/
 * match_messages all cascade via their existing FKs to auth.users, same as
 * delete-account.
 *
 * Unlike telemetry logging (api_usage_log's logUsage, which swallows
 * errors so a logging outage never breaks the feature it's measuring), a
 * failed audit-log write here must block the deletion — the whole point is
 * that this destructive action is never unrecorded.
 */
Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = await getAdminUserFromRequest(req)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const targetUserId: string | undefined = body.targetUserId
    const justification: string | undefined = body.justification

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'targetUserId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    if (!justification || !justification.trim()) {
      return new Response(JSON.stringify({ error: 'A justification is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    if (targetUserId === admin.id) {
      return new Response(
        JSON.stringify({ error: 'Use Settings to delete your own account, not the admin panel' }),
        { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      admin_user_id: admin.id,
      action: 'user_delete',
      target_user_id: targetUserId,
      request_reference: justification.trim(),
    })
    if (auditError) throw new Error(`Failed to write audit log — deletion aborted: ${auditError.message}`)

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    if (deleteError) throw deleteError

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
