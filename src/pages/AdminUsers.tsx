import { Link, useNavigate } from 'react-router-dom'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export function AdminUsers() {
  const { users, loading, error } = useAdminUsers()
  const navigate = useNavigate()

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <PageHeader title="Users" subtitle="All accounts" />

      <div className="flex gap-3 text-sm">
        <Link to="/admin" className="text-wingman-700 underline">
          ← Usage & spending
        </Link>
        <Link to="/admin/audit-log" className="text-wingman-700 underline">
          Audit log
        </Link>
      </div>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Signed up</th>
              <th className="px-4 py-3 font-semibold">Matches</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3 text-right font-semibold">Spend (month)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/users/${u.id}`)
                }}
                className="cursor-pointer border-t border-neutral-100 first:border-0 hover:bg-neutral-50"
              >
                <td className="px-4 py-2.5 text-neutral-800">
                  {u.email ?? u.id.slice(0, 8) + '…'}
                  {u.isAdmin && (
                    <span className="ml-2 rounded-full bg-wingman-100 px-2 py-0.5 text-[10px] font-medium text-wingman-700">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-neutral-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2.5 text-neutral-500">{u.matchCount}</td>
                <td className="px-4 py-2.5 text-neutral-500">{formatDate(u.lastActiveAt)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-neutral-900">
                  {formatUsd(u.monthSpendUsd)}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-neutral-400" colSpan={5}>
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
