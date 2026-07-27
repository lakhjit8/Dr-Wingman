import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { extractFunctionErrorMessage } from '../lib/functionError'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithEmail: AuthContextValue['signInWithEmail'] = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  const signInWithOAuth: AuthContextValue['signInWithOAuth'] = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const deleteAccount: AuthContextValue['deleteAccount'] = async () => {
    try {
      const { error: fnError } = await supabase.functions.invoke('delete-account')
      if (fnError) throw fnError
      await supabase.auth.signOut()
      return { error: null }
    } catch (e) {
      return { error: await extractFunctionErrorMessage(e, 'Failed to delete account') }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithEmail,
        signInWithOAuth,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
