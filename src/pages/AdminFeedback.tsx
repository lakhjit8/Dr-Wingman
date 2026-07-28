import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'
import type { Feedback } from '../lib/types'

export function AdminFeedback() {
  const { users } = useAdminUsers()
  const [entries, setEntries] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (fetchError) setError(fetchError.message)
      setEntries((data as Feedback[] | null) ?? [])
      setLoading(false)
    })()
  }, [])

  const emailById = new Map(users.map((u) => [u.id, u.email ?? u.id.slice(0, 8) + '…']))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <PageHeader title="Feedback" subtitle="User-submitted feedback" />

      <Link to="/admin" className="text-sm text-wingman-700 underline">
        ← Usage & spending
      </Link>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <div className="space-y-3">
        {entries.map((f) => (
          <div key={f.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>{emailById.get(f.user_id) ?? f.user_id}</span>
              <span>{new Date(f.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{f.message}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">
            No feedback submitted yet.
          </p>
        )}
      </div>
    </div>
  )
}
