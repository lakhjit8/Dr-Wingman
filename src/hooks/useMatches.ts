import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Match } from '../lib/types'

export function useMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('archived', false)
      .order('updated_at', { ascending: false })
    if (fetchError) setError(fetchError.message)
    setMatches((data as Match[] | null) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const createFromScreenshots = async (paths: string[], platform?: string) => {
    setCreating(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ matchId: string }>(
        'analyze-match-profile',
        { body: { paths, platform }, timeout: 60_000 }
      )
      if (fnError) throw fnError
      await reload()
      return data?.matchId ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze match profile')
      return null
    } finally {
      setCreating(false)
    }
  }

  return { matches, loading, creating, error, createFromScreenshots, reload }
}
