import { env } from './env'

/**
 * Runs SQL directly against the project's Postgres via the Management API —
 * used to verify state "not through app APIs" as several tests in this spec
 * require (e.g. querying storage/DB directly rather than through our own
 * Edge Functions).
 */
export async function runSql<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  if (!res.ok) {
    throw new Error(`Management API SQL query failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

/** Queries function invocation logs (gateway + runtime) for the last `minutes`. */
export async function queryFunctionLogs(minutes = 10): Promise<{ event_message: string }[]> {
  const sql = `
    select event_message
    from function_edge_logs
    where timestamp > (extract(epoch from now() - interval '${minutes} minutes') * 1000000)::bigint
    union all
    select event_message
    from function_logs
    where timestamp > (extract(epoch from now() - interval '${minutes} minutes') * 1000000)::bigint
    order by 1;
  `
  const url = new URL(
    `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/analytics/endpoints/logs.all`
  )
  url.searchParams.set('sql', sql)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
  })
  if (!res.ok) {
    throw new Error(`Management API log query failed (${res.status}): ${await res.text()}`)
  }
  const json = await res.json()
  return json.result ?? []
}
