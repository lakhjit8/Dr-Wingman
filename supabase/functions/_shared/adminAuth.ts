import { getUserFromRequest, supabaseAdmin } from './supabaseAdmin.ts'

/**
 * Resolves the calling user from the request and additionally requires
 * their profiles.is_admin flag to be true. Enforcement of "is_admin" for
 * these Edge Functions themselves is a defense-in-depth check on top of the
 * real authorization boundary — the `is_admin_user()` RLS policies — since
 * these functions use the service-role client (which bypasses RLS) to do
 * their work, so they must gate access explicitly rather than relying on
 * Postgres to reject the query.
 */
export async function getAdminUserFromRequest(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return null
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!data?.is_admin) return null
  return user
}
