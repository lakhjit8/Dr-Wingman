import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { getAdminUserFromRequest } from '../_shared/adminAuth.ts'

/**
 * Admin-facing, per-user data export for a legal/law-enforcement request.
 * Deliberately narrow (see docs/admin-role-and-match-deletion-spec.md §4):
 * one user only, requires a request reference, and every export is
 * audit-logged before the bundle is generated. Includes all of the user's
 * matches regardless of soft-delete state (deleted_at) — a legal request is
 * asking for what exists, not what's currently visible in the app's UI.
 *
 * Not attorney-reviewed: this is the technical capability only. Whether a
 * given request is legitimate, what's actually owed, and whether the user
 * must be notified is a legal decision, not a technical one — see the open
 * items in the spec doc.
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
    const requestReference: string | undefined = body.requestReference

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'targetUserId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    if (!requestReference || !requestReference.trim()) {
      return new Response(JSON.stringify({ error: 'A request reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const { data: targetAuthUser, error: targetAuthError } =
      await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (targetAuthError || !targetAuthUser.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Logged before the bundle is generated — the export itself is the
    // sensitive action, same reasoning as admin-delete-user logging before
    // the delete executes. A failed audit write blocks the export.
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      admin_user_id: admin.id,
      action: 'data_export',
      target_user_id: targetUserId,
      request_reference: requestReference.trim(),
    })
    if (auditError) throw new Error(`Failed to write audit log — export aborted: ${auditError.message}`)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name, bio_draft, prompts, photo_analysis, communication_style, created_at')
      .eq('id', targetUserId)
      .maybeSingle()
    if (profileError) throw profileError

    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true })
    if (matchesError) throw matchesError

    const matchIds = (matches ?? []).map((m) => m.id as string)
    const { data: messages, error: messagesError } = matchIds.length
      ? await supabaseAdmin
          .from('match_messages')
          .select('*')
          .in('match_id', matchIds)
          .order('created_at', { ascending: true })
      : { data: [], error: null }
    if (messagesError) throw messagesError

    const messagesByMatch = new Map<string, unknown[]>()
    for (const msg of messages ?? []) {
      const list = messagesByMatch.get(msg.match_id as string) ?? []
      list.push(msg)
      messagesByMatch.set(msg.match_id as string, list)
    }

    const bundle = {
      export_scope_note:
        "This export is limited to what this application's architecture ever stores: no real names, " +
        'photos, or other identifying information about a match are ever extracted or persisted — ' +
        "matches are represented only by an AI-generated, non-identifying label. The narrowness of " +
        'this disclosure reflects the data model, not an omission.',
      request_reference: requestReference.trim(),
      exported_at: new Date().toISOString(),
      account: {
        id: targetUserId,
        email: targetAuthUser.user.email ?? null,
        signed_up_at: targetAuthUser.user.created_at,
        display_name: profile?.display_name ?? null,
        bio_draft: profile?.bio_draft ?? null,
        prompts: profile?.prompts ?? [],
        photo_analysis: profile?.photo_analysis ?? null,
        communication_style: profile?.communication_style ?? null,
      },
      matches: (matches ?? []).map((m) => ({
        ...m,
        messages: messagesByMatch.get(m.id as string) ?? [],
      })),
    }

    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="export-${targetUserId}.json"`,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
