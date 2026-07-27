import { FunctionsHttpError } from '@supabase/supabase-js'

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
