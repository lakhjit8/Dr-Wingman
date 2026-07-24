import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { TestUser } from './testUser'

const BUCKET = 'screenshots-temp'

/** Uploads a fixture image to the same temp bucket/path pattern the real app uses. */
export async function uploadFixture(user: TestUser, fixtureRelativePath: string): Promise<string> {
  const bytes = readFileSync(fileURLToPath(new URL(`../fixtures/${fixtureRelativePath}`, import.meta.url)))
  const path = `${user.id}/${crypto.randomUUID()}.png`
  const { error } = await user.client.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/png',
  })
  if (error) throw new Error(`Failed to upload fixture: ${error.message}`)
  return path
}

export interface InvokeOptions {
  forceError?: boolean
}

export async function invokeFunction(
  user: TestUser,
  name: string,
  body: Record<string, unknown>,
  opts: InvokeOptions = {}
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${user.accessToken}`,
    'Content-Type': 'application/json',
  }
  if (opts.forceError) headers['x-test-force-error'] = env.TEST_MODE_SECRET

  const res = await fetch(`${env.SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

/** Direct storage listing for a user's folder — bypasses the app entirely, straight to the Storage API. */
export async function listUserScreenshots(userId: string): Promise<string[]> {
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 })
  if (error) throw new Error(`Failed to list storage: ${error.message}`)
  return (data ?? []).map((f) => f.name)
}
