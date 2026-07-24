/**
 * Lets the automated test suite force a mid-processing failure (after the
 * screenshot is downloaded, before the real Claude call) to prove the
 * `finally` cleanup still deletes the transient copy on an error path — see
 * tests/persistence.test.ts. Inert unless TEST_MODE_SECRET is explicitly
 * configured as a secret; if that secret is never set, no request header can
 * trigger this, in production or otherwise.
 */
export function shouldSimulateFailure(req: Request): boolean {
  const configured = Deno.env.get('TEST_MODE_SECRET')
  if (!configured) return false
  return req.headers.get('x-test-force-error') === configured
}
