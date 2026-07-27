import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { ProfileAnalysis, UserProfile } from '../lib/types'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (fetchError) setError(fetchError.message)
    setProfile(data as UserProfile | null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const analyzePhotos = async (paths: string[], interviewNotes?: string) => {
    setAnalyzing(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        analysis: ProfileAnalysis
      }>('analyze-profile-photos', {
        body: { paths, interviewNotes },
        timeout: 60_000,
      })
      if (fnError) throw fnError
      await reload()
      return data?.analysis ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze photos')
      return null
    } finally {
      setAnalyzing(false)
    }
  }

  return { profile, loading, analyzing, error, analyzePhotos, reload }
}
