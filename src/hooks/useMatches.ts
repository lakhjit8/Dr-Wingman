import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { extractFunctionErrorMessage } from '../lib/functionError'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [messageMatchIds, setMessageMatchIds] = useState<Set<string> | null>(null)

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

  const normalizedQuery = searchQuery.trim()

  // Also searches match_messages content — the flattened text of every
  // coach-generated message (opening lines, suggested replies, reading/
  // translation, momentum notes) and the transcribed conversation — not
  // just match_label/compatibility_notes. Debounced since, unlike the
  // client-side label/notes filter, this is a network query per keystroke.
  useEffect(() => {
    if (!user || !normalizedQuery) {
      setMessageMatchIds(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data, error: searchError } = await supabase
        .from('match_messages')
        .select('match_id')
        .eq('user_id', user.id)
        .ilike('content', `%${normalizedQuery}%`)
      if (cancelled) return
      if (searchError) {
        setError(searchError.message)
        return
      }
      setMessageMatchIds(new Set((data ?? []).map((r) => r.match_id as string)))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [user, normalizedQuery])

  const lowerQuery = normalizedQuery.toLowerCase()
  const visibleMatches = normalizedQuery
    ? matches.filter(
        (m) =>
          m.match_label.toLowerCase().includes(lowerQuery) ||
          m.style_summary?.compatibility_notes?.toLowerCase().includes(lowerQuery) ||
          messageMatchIds?.has(m.id)
      )
    : matches

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
      setError(await extractFunctionErrorMessage(e, 'Failed to analyze match profile'))
      return null
    } finally {
      setCreating(false)
    }
  }

  return {
    matches: visibleMatches,
    allMatches: matches,
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
    searchQuery,
    setSearchQuery,
  }
}
