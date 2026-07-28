import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useFeedback() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submitFeedback = async (message: string): Promise<boolean> => {
    if (!user || !message.trim()) return false
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({ user_id: user.id, message: message.trim() })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return false
    }
    setSubmitted(true)
    return true
  }

  const resetSubmitted = () => setSubmitted(false)

  return { submitFeedback, submitting, error, submitted, resetSubmitted }
}
