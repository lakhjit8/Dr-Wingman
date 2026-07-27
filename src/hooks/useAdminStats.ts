import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface UsageLogRow {
  user_id: string | null
  feature: string
  estimated_cost_usd: number
  status: string
  created_at: string
}

export interface BudgetConfig {
  alert_threshold_usd: number
  soft_stop_threshold_usd: number
  hard_stop_threshold_usd: number
  hard_stop_active: boolean
  per_user_hourly_request_limit: number
  max_user_text_chars: number
  max_images_per_request: number
}

const FETCH_WINDOW_DAYS = 35

/**
 * Fetches a 35-day window (covers "this month" for any day-of-month, plus
 * "this week" even when the current week spans a month boundary) and
 * aggregates today/week/month/feature/user breakdowns client-side — simple
 * ILIKE-style approach, no dedicated analytics backend, consistent with
 * this app's scale everywhere else.
 */
export function useAdminStats() {
  const [rows, setRows] = useState<UsageLogRow[]>([])
  const [profileNames, setProfileNames] = useState<Record<string, string>>({})
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const windowStart = new Date(Date.now() - FETCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: logRows, error: logError }, { data: config, error: configError }] = await Promise.all([
      supabase
        .from('api_usage_log')
        .select('user_id, feature, estimated_cost_usd, status, created_at')
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase.from('budget_config').select('*').eq('id', true).maybeSingle(),
    ])
    if (logError) setError(logError.message)
    if (configError) setError(configError.message)

    const fetchedRows = (logRows as UsageLogRow[] | null) ?? []
    setRows(fetchedRows)
    setBudgetConfig((config as BudgetConfig | null) ?? null)

    const userIds = [...new Set(fetchedRows.map((r) => r.user_id).filter((id): id is string => !!id))]
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
      const names: Record<string, string> = {}
      for (const p of profiles ?? []) {
        if (p.display_name) names[p.id] = p.display_name
      }
      setProfileNames(names)
    } else {
      setProfileNames({})
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateBudgetConfig = async (patch: Partial<BudgetConfig>): Promise<boolean> => {
    const { error: updateError } = await supabase.from('budget_config').update(patch).eq('id', true)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    await reload()
    return true
  }

  return { rows, profileNames, budgetConfig, loading, error, reload, updateBudgetConfig }
}
