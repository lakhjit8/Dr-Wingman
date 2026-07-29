import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'

/**
 * supabase-js's thrown error.message on a non-2xx Edge Function response is
 * always the generic "Edge Function returned a non-2xx status code" — the
 * actual {error: string} JSON body (validation messages, spending-guard
 * rejections) is only reachable via error.context. This extracts it so
 * those messages actually reach the user instead of a generic string.
 */
export async function extractFunctionErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // Response body wasn't JSON or was already consumed — fall through.
    }
  }
  return err instanceof Error ? err.message : fallback
}

/**
 * When the client-side `timeout` passed to `functions.invoke()` elapses,
 * supabase-js aborts the underlying fetch and always throws
 * FunctionsFetchError with the fixed message "Failed to send a request to
 * the Edge Function" — the same message it uses for a genuine network
 * failure. The only way to tell an abort apart from a real network error is
 * to look inside `context`, which holds the raw fetch rejection (a
 * DOMException named "AbortError" in this case). The Edge Function itself
 * keeps running after the client gives up, so this is worth distinguishing:
 * the user hasn't hit a dead end, the response is just still in flight.
 */
export function isTimeoutError(err: unknown): boolean {
  return err instanceof FunctionsFetchError && err.context?.name === 'AbortError'
}
