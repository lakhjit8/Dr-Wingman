import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Match } from '../lib/types'

export type MatchSort = 'last_message' | 'match_date'

const SORT_COLUMN: Record<MatchSort, 'last_message_at' | 'created_at'> = {
  last_message: 'last_message_at',
  match_date: 'created_at',
}

export function useMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<MatchSort>('last_message')
  const [sortAscending, setSortAscending] = useState(false)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('archived', false)
      .order('pinned', { ascending: false })
      .order(SORT_COLUMN[sortBy], { ascending: sortAscending })
    if (fetchError) setError(fetchError.message)
    setMatches((data as Match[] | null) ?? [])
    setLoading(false)
  }, [user, sortBy, sortAscending])

  useEffect(() => {
    void reload()
  }, [reload])

  const togglePin = async (matchId: string, pinned: boolean) => {
    const { error: pinError } = await supabase.from('matches').update({ pinned }).eq('id', matchId)
    if (pinError) {
      setError(pinError.message)
      return
    }
    await reload()
  }

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

  return {
    matches,
    loading,
    creating,
    error,
    createFromScreenshots,
    reload,
    sortBy,
    setSortBy,
    sortAscending,
    setSortAscending,
    togglePin,
  }
}
