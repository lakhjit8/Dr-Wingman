import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'
import type { InviteCode } from '../lib/types'

// Excludes visually ambiguous characters (0/O, 1/I) so codes are easy to
// read aloud or type from a screenshot.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function AdminInviteCodes() {
  const { users } = useAdminUsers()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [generating, setGenerating] = useState(false)

  const reload = async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) setError(fetchError.message)
    setCodes((data as InviteCode[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    const { error: insertError } = await supabase
      .from('invite_codes')
      .insert({ code: generateCode(), note: note.trim() || null })
    setGenerating(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setNote('')
    await reload()
  }

  const emailById = new Map(users.map((u) => [u.id, u.email ?? u.id.slice(0, 8) + '…']))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <PageHeader title="Invite codes" subtitle="Beta access control" />

      <Link to="/admin" className="text-sm text-wingman-700 underline">
        ← Usage & spending
      </Link>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Generate a code</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional — who this is for)"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-wingman-500 focus:outline-none"
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="min-h-[40px] rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200"
          >
            {generating ? 'Generating…' : 'Generate code'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Note</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Used by</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-t border-neutral-100 first:border-0">
                <td className="px-4 py-2.5 font-mono text-neutral-800">{c.code}</td>
                <td className="px-4 py-2.5 text-neutral-500">{c.note ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {c.used_by ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">used</span>
                  ) : (
                    <span className="rounded-full bg-wingman-100 px-2 py-0.5 text-xs text-wingman-700">available</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {c.used_by ? emailById.get(c.used_by) ?? c.used_by : '—'}
                </td>
                <td className="px-4 py-2.5 text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-neutral-400" colSpan={5}>
                  No invite codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
