import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { extractFunctionErrorMessage } from '../lib/functionError'
import type { AdminUserSummary } from '../lib/types'

/**
 * Backs both /admin/users (list) and /admin/users/:id (detail) — the list is
 * small enough at this app's scale that the detail page just finds its
 * user in the same fetched array rather than making a second round trip.
 */
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ users: AdminUserSummary[] }>(
        'admin-list-users',
        { timeout: 30_000 }
      )
      if (fnError) throw fnError
      setUsers(data?.users ?? [])
    } catch (e) {
      setError(await extractFunctionErrorMessage(e, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const deleteUser = async (targetUserId: string, justification: string): Promise<{ error: string | null }> => {
    try {
      const { error: fnError } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId, justification },
        timeout: 30_000,
      })
      if (fnError) throw fnError
      await reload()
      return { error: null }
    } catch (e) {
      return { error: await extractFunctionErrorMessage(e, 'Failed to delete user') }
    }
  }

  const exportUserData = async (
    targetUserId: string,
    requestReference: string
  ): Promise<{ data: Record<string, unknown> | null; error: string | null }> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke<Record<string, unknown>>(
        'admin-export-user-data',
        { body: { targetUserId, requestReference }, timeout: 30_000 }
      )
      if (fnError) throw fnError
      return { data: data ?? null, error: null }
    } catch (e) {
      return { data: null, error: await extractFunctionErrorMessage(e, 'Failed to export user data') }
    }
  }

  return { users, loading, error, reload, deleteUser, exportUserData }
}
