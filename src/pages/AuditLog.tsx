import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'
import type { AuditLogEntry } from '../lib/types'

const ACTION_LABELS: Record<AuditLogEntry['action'], string> = {
  user_delete: 'User deleted',
  data_export: 'Data exported',
}

export function AuditLog() {
  const { users } = useAdminUsers()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (fetchError) setError(fetchError.message)
      setEntries((data as AuditLogEntry[] | null) ?? [])
      setLoading(false)
    })()
  }, [])

  const emailById = new Map(users.map((u) => [u.id, u.email ?? u.id.slice(0, 8) + '…']))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" subtitle="Admin actions — user deletions & data exports" />

      <Link to="/admin/users" className="text-sm text-wingman-700 underline">
        ← Back to users
      </Link>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Admin</th>
              <th className="px-4 py-3 font-semibold">Target user</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100 first:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-neutral-800">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-4 py-2.5 text-neutral-500">{emailById.get(e.admin_user_id) ?? e.admin_user_id}</td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {e.target_user_id ? emailById.get(e.target_user_id) ?? e.target_user_id : '—'}
                </td>
                <td className="px-4 py-2.5 text-neutral-700">{e.request_reference}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-neutral-400" colSpan={5}>
                  No admin actions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
