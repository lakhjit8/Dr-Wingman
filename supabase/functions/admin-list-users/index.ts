import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { getAdminUserFromRequest } from '../_shared/adminAuth.ts'

/**
 * Admin-only user list for /admin/users. Joins auth.users (email, signup
 * date — only reachable via the admin API, never exposed to the browser)
 * with profiles, a per-user match count/last-active read via the
 * service-role client, and this-month API spend. Match/message *content*
 * is deliberately not exposed here — only an aggregate count — so casual
 * admin browsing doesn't become an unaudited substitute for the explicit,
 * logged export path in admin-export-user-data. See
 * docs/admin-role-and-match-deletion-spec.md §2a.
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
    const authUsers: { id: string; email: string | null; created_at: string }[] = []
    let page = 1
    const perPage = 200
    // deno-lint-ignore no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      for (const u of data.users) {
        authUsers.push({ id: u.id, email: u.email ?? null, created_at: u.created_at })
      }
      if (data.users.length < perPage) break
      page += 1
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, is_admin')
    if (profilesError) throw profilesError
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]))

    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('matches')
      .select('user_id, last_message_at')
      .is('deleted_at', null)
    if (matchesError) throw matchesError

    const matchCountByUser = new Map<string, number>()
    const lastActiveByUser = new Map<string, string>()
    for (const m of matches ?? []) {
      const uid = m.user_id as string
      matchCountByUser.set(uid, (matchCountByUser.get(uid) ?? 0) + 1)
      const current = lastActiveByUser.get(uid)
      if (!current || (m.last_message_at as string) > current) {
        lastActiveByUser.set(uid, m.last_message_at as string)
      }
    }

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { data: usageRows, error: usageError } = await supabaseAdmin
      .from('api_usage_log')
      .select('user_id, estimated_cost_usd')
      .eq('status', 'success')
      .gte('created_at', monthStart.toISOString())
    if (usageError) throw usageError

    const spendByUser = new Map<string, number>()
    for (const row of usageRows ?? []) {
      const uid = row.user_id as string
      if (!uid) continue
      spendByUser.set(uid, (spendByUser.get(uid) ?? 0) + Number(row.estimated_cost_usd))
    }

    const users = authUsers.map((u) => {
      const profile = profileById.get(u.id)
      return {
        id: u.id,
        email: u.email,
        displayName: profile?.display_name ?? null,
        isAdmin: profile?.is_admin ?? false,
        createdAt: u.created_at,
        matchCount: matchCountByUser.get(u.id) ?? 0,
        lastActiveAt: lastActiveByUser.get(u.id) ?? null,
        monthSpendUsd: spendByUser.get(u.id) ?? 0,
      }
    })

    return new Response(JSON.stringify({ users }), {
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
