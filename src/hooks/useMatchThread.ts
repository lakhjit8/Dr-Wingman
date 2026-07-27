import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Match, MatchMessage } from '../lib/types'

export function useMatchThread(matchId: string | undefined) {
  const [match, setMatch] = useState<Match | null>(null)
  const [messages, setMessages] = useState<MatchMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [coaching, setCoaching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    const [{ data: matchData, error: matchError }, { data: messageData, error: messageError }] =
      await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
        supabase
          .from('match_messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true }),
      ])
    if (matchError) setError(matchError.message)
    if (messageError) setError(messageError.message)
    setMatch((matchData as Match | null) ?? null)
    setMessages((messageData as MatchMessage[] | null) ?? [])
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!matchId) return
    const channel = supabase
      .channel(`match-messages-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MatchMessage])
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [matchId])

  const sendToCoach = async (opts: { paths?: string[]; userText?: string }) => {
    if (!matchId) return
    setCoaching(true)
    setError(null)
    try {
      const { error: fnError } = await supabase.functions.invoke('coach-message', {
        body: { matchId, paths: opts.paths, userText: opts.userText },
        timeout: 60_000,
      })
      if (fnError) throw fnError
      await reload()
    } catch (e) {
      setError(
        e instanceof Error
          ? /aborted|timeout/i.test(e.message)
            ? 'Dr. Wingman is taking longer than expected — please try again.'
            : e.message
          : 'Failed to get coaching response'
      )
    } finally {
      setCoaching(false)
    }
  }

  return { match, messages, loading, coaching, error, sendToCoach, reload }
}
