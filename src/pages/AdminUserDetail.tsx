import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const { users, loading, deleteUser, exportUserData } = useAdminUsers()
  const navigate = useNavigate()

  const [emailConfirm, setEmailConfirm] = useState('')
  const [justification, setJustification] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [requestReference, setRequestReference] = useState('')
  const [confirmingExport, setConfirmingExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  if (!id) return <Navigate to="/admin/users" replace />
  if (loading) return <LoadingSpinner />

  const user = users.find((u) => u.id === id)
  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="User not found" />
        <Link to="/admin/users" className="text-sm text-wingman-700 underline">
          ← Back to users
        </Link>
      </div>
    )
  }

  const confirmTarget = user.email ?? user.id
  const emailMatches = emailConfirm.trim().toLowerCase() === confirmTarget.toLowerCase()

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteUser(user.id, justification)
    setDeleting(false)
    if (error) {
      setDeleteError(error)
      return
    }
    navigate('/admin/users')
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    const { data, error } = await exportUserData(user.id, requestReference)
    setExporting(false)
    if (error) {
      setExportError(error)
      return
    }
    if (data) downloadJson(data, `export-${user.id}.json`)
    setConfirmingExport(false)
    setRequestReference('')
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title={user.email ?? user.id} subtitle="User detail" />

      <Link to="/admin/users" className="text-sm text-wingman-700 underline">
        ← Back to users
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Account</h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Display name</dt>
            <dd className="text-neutral-800">{user.displayName ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Signed up</dt>
            <dd className="text-neutral-800">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Matches</dt>
            <dd className="text-neutral-800">{user.matchCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Last active</dt>
            <dd className="text-neutral-800">{formatDate(user.lastActiveAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Spend this month</dt>
            <dd className="text-neutral-800">{formatUsd(user.monthSpendUsd)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Export for legal request</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Scoped to this user only — account data, match records (AI-generated labels only), and
          conversation/message text. Every export is logged with the reference below.
        </p>
        {!confirmingExport ? (
          <>
            <label className="mt-3 block text-xs font-medium text-neutral-500">
              Request reference (case number, requesting agency, subpoena ref — required)
            </label>
            <input
              value={requestReference}
              onChange={(e) => setRequestReference(e.target.value)}
              placeholder="e.g. Subpoena #2026-..."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-wingman-500 focus:outline-none"
            />
            <button
              onClick={() => setConfirmingExport(true)}
              disabled={!requestReference.trim()}
              className="mt-3 min-h-[40px] rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              Continue
            </button>
          </>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl bg-wingman-50 p-4">
            <p className="text-sm text-neutral-800">
              Export all data for <strong>{user.email ?? user.id}</strong> citing reference{' '}
              <strong>"{requestReference.trim()}"</strong>? This action is logged.
            </p>
            {exportError && <p className="text-sm text-danger-700">{exportError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingExport(false)}
                disabled={exporting}
                className="min-h-[40px] flex-1 rounded-full border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleExport()}
                disabled={exporting}
                className="min-h-[40px] flex-1 rounded-full bg-wingman-700 text-sm font-semibold text-white hover:bg-wingman-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? 'Generating…' : 'Generate export'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-danger-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-danger-700">Delete this user</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Permanently deletes this account, profile, matches, and conversation history. This cannot
          be undone and is logged with the justification below.
        </p>
        <label className="mt-3 block text-xs font-medium text-neutral-500">
          Justification (required — e.g. "user request," "ToS violation," "legal request ref #___")
        </label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-sm focus:border-wingman-500 focus:outline-none"
        />
        <label className="mt-3 block text-xs font-medium text-neutral-500">
          Type <strong>{confirmTarget}</strong> to confirm
        </label>
        <input
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-wingman-500 focus:outline-none"
        />
        {deleteError && <p className="mt-2 text-sm text-danger-700">{deleteError}</p>}
        <button
          onClick={() => void handleDelete()}
          disabled={!emailMatches || !justification.trim() || deleting}
          className="mt-3 min-h-[44px] w-full rounded-full bg-danger-600 text-sm font-semibold text-white hover:bg-danger-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {deleting ? 'Deleting…' : 'Permanently delete user'}
        </button>
      </div>
    </div>
  )
}
