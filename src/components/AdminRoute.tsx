import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useProfile } from '../hooks/useProfile'
import { LoadingSpinner } from './LoadingSpinner'

/** Gates /admin to the one operator account. Not a general roles system — see profiles.is_admin. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile()

  if (loading) return <LoadingSpinner />
  if (!profile?.is_admin) return <Navigate to="/matches" replace />
  return <>{children}</>
}
