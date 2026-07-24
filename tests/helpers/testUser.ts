import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export interface TestUser {
  id: string
  email: string
  accessToken: string
  /** A client authenticated as this user (RLS applies) — for "as if a real client called the API". */
  client: ReturnType<typeof createClient>
}

/** Creates a confirmed test user and returns a real session for it — a real JWT, not a stub. */
export async function createTestUser(): Promise<TestUser> {
  const email = `test-${crypto.randomUUID()}@example.com`
  const password = crypto.randomUUID()

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`)
  }

  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !session.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`)
  }

  return {
    id: created.user.id,
    email,
    accessToken: session.session.access_token,
    client: anonClient,
  }
}

export async function deleteTestUser(userId: string): Promise<void> {
  await adminClient.auth.admin.deleteUser(userId)
}
