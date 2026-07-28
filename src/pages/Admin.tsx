import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStats } from '../hooks/useAdminStats'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/PageHeader'

const CHART_DAYS = 14
const FEATURE_LABELS: Record<string, string> = {
  profile_builder: 'Profile builder',
  match_analysis: 'Match analysis',
  message_coaching: 'Message coaching',
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function dayKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD, UTC
}

export function Admin() {
  const { rows, profileNames, budgetConfig, loading, error, updateBudgetConfig } = useAdminStats()
  const [savingConfig, setSavingConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({})

  if (loading) return <LoadingSpinner />

  const now = Date.now()
  const todayKey = new Date(now).toISOString().slice(0, 10)
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const successRows = rows.filter((r) => r.status === 'success')

  const todayTotal = successRows
    .filter((r) => dayKey(r.created_at) === todayKey)
    .reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)
  const weekTotal = successRows
    .filter((r) => new Date(r.created_at).getTime() >= weekAgo)
    .reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)
  const monthRows = successRows.filter((r) => new Date(r.created_at) >= monthStart)
  const monthTotal = monthRows.reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)

  const rejectedThisMonth = rows.filter(
    (r) => new Date(r.created_at) >= monthStart && r.status.startsWith('rejected')
  ).length

  const byFeature = new Map<string, { count: number; cost: number }>()
  for (const r of monthRows) {
    const entry = byFeature.get(r.feature) ?? { count: 0, cost: 0 }
    entry.count += 1
    entry.cost += Number(r.estimated_cost_usd)
    byFeature.set(r.feature, entry)
  }

  const byUser = new Map<string, { count: number; cost: number }>()
  for (const r of monthRows) {
    if (!r.user_id) continue
    const entry = byUser.get(r.user_id) ?? { count: 0, cost: 0 }
    entry.count += 1
    entry.cost += Number(r.estimated_cost_usd)
    byUser.set(r.user_id, entry)
  }
  const topUsers = [...byUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 10)

  const dailyTotals: { day: string; cost: number }[] = []
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    dailyTotals.push({ day: d, cost: 0 })
  }
  const dailyIndex = new Map(dailyTotals.map((d, i) => [d.day, i]))
  for (const r of successRows) {
    const idx = dailyIndex.get(dayKey(r.created_at))
    if (idx !== undefined) dailyTotals[idx].cost += Number(r.estimated_cost_usd)
  }
  const maxDaily = Math.max(...dailyTotals.map((d) => d.cost), 0.01)

  const handleToggleHardStop = async () => {
    if (!budgetConfig) return
    setSavingConfig(true)
    await updateBudgetConfig({ hard_stop_active: !budgetConfig.hard_stop_active })
    setSavingConfig(false)
  }

  const handleSaveThresholds = async () => {
    if (!budgetConfig) return
    setSavingConfig(true)
    const patch: Record<string, number> = {}
    for (const key of ['alert_threshold_usd', 'soft_stop_threshold_usd', 'hard_stop_threshold_usd'] as const) {
      const draftVal = configDraft[key]
      if (draftVal !== undefined && draftVal !== '' && !Number.isNaN(Number(draftVal))) {
        patch[key] = Number(draftVal)
      }
    }
    await updateBudgetConfig(patch)
    setConfigDraft({})
    setSavingConfig(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Claude API usage & spending limits" />

      <div className="flex gap-3 text-sm">
        <Link to="/admin/users" className="text-wingman-700 underline">
          Users →
        </Link>
        <Link to="/admin/audit-log" className="text-wingman-700 underline">
          Audit log →
        </Link>
      </div>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      {budgetConfig?.hard_stop_active && (
        <div className="rounded-2xl border border-danger-300 bg-danger-50 p-4 text-sm text-danger-800">
          <strong>Hard stop is active.</strong> All Claude API calls are being rejected app-wide until
          this is manually reset below.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Today" value={formatUsd(todayTotal)} />
        <StatCard label="This week" value={formatUsd(weekTotal)} />
        <StatCard label="This month" value={formatUsd(monthTotal)} sub={`${rejectedThisMonth} rejected this month`} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Daily spend (last {CHART_DAYS} days)</h2>
        <div className="flex h-32 items-end gap-1">
          {dailyTotals.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${formatUsd(d.cost)}`}>
              <div
                className="w-full rounded-t bg-wingman-500"
                style={{ height: `${Math.max((d.cost / maxDaily) * 100, d.cost > 0 ? 3 : 0)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>{dailyTotals[0]?.day.slice(5)}</span>
          <span>{dailyTotals[dailyTotals.length - 1]?.day.slice(5)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">By feature (this month)</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...byFeature.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([feature, stats]) => (
                <tr key={feature} className="border-t border-neutral-100 first:border-0">
                  <td className="py-1.5 text-neutral-700">{FEATURE_LABELS[feature] ?? feature}</td>
                  <td className="py-1.5 text-right font-mono text-xs text-neutral-400">{stats.count} calls</td>
                  <td className="py-1.5 pl-3 text-right font-medium text-neutral-900">{formatUsd(stats.cost)}</td>
                </tr>
              ))}
              {byFeature.size === 0 && (
                <tr>
                  <td className="py-1.5 text-neutral-400">No usage this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Top users (this month)</h2>
          <table className="w-full text-sm">
            <tbody>
              {topUsers.map(([userId, stats]) => (
                <tr key={userId} className="border-t border-neutral-100 first:border-0">
                  <td className="py-1.5 text-neutral-700">{profileNames[userId] ?? `${userId.slice(0, 8)}…`}</td>
                  <td className="py-1.5 text-right font-mono text-xs text-neutral-400">{stats.count} calls</td>
                  <td className="py-1.5 pl-3 text-right font-medium text-neutral-900">{formatUsd(stats.cost)}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td className="py-1.5 text-neutral-400">No usage this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {budgetConfig && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Spending limits</h2>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-neutral-200 p-3">
            <div>
              <p className="text-sm font-medium text-neutral-800">Hard stop</p>
              <p className="text-xs text-neutral-500">
                {budgetConfig.hard_stop_active
                  ? 'Active — all Claude API calls are blocked app-wide.'
                  : 'Inactive — calls are allowed.'}
              </p>
            </div>
            <button
              onClick={() => void handleToggleHardStop()}
              disabled={savingConfig}
              className={`min-h-[44px] rounded-full px-4 text-sm font-medium ${
                budgetConfig.hard_stop_active
                  ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                  : 'bg-danger-600 text-white hover:bg-danger-700'
              }`}
            >
              {budgetConfig.hard_stop_active ? 'Reset (allow calls)' : 'Trigger hard stop'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ThresholdField
              label="Alert threshold"
              value={configDraft.alert_threshold_usd ?? String(budgetConfig.alert_threshold_usd)}
              onChange={(v) => setConfigDraft((d) => ({ ...d, alert_threshold_usd: v }))}
            />
            <ThresholdField
              label="Soft-stop threshold"
              value={configDraft.soft_stop_threshold_usd ?? String(budgetConfig.soft_stop_threshold_usd)}
              onChange={(v) => setConfigDraft((d) => ({ ...d, soft_stop_threshold_usd: v }))}
            />
            <ThresholdField
              label="Hard-stop threshold"
              value={configDraft.hard_stop_threshold_usd ?? String(budgetConfig.hard_stop_threshold_usd)}
              onChange={(v) => setConfigDraft((d) => ({ ...d, hard_stop_threshold_usd: v }))}
            />
          </div>
          <button
            onClick={() => void handleSaveThresholds()}
            disabled={savingConfig || Object.keys(configDraft).length === 0}
            className="mt-3 min-h-[40px] rounded-full bg-wingman-600 px-4 text-sm font-medium text-white hover:bg-wingman-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            Save thresholds
          </button>

          <p className="mt-3 text-xs text-neutral-400">
            Per-user rate limit: {budgetConfig.per_user_hourly_request_limit} requests/hour · Max message length:{' '}
            {budgetConfig.max_user_text_chars} chars · Max images/request: {budgetConfig.max_images_per_request}
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}

function ThresholdField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label} (USD)</label>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-wingman-500 focus:outline-none"
      />
    </div>
  )
}
