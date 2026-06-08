import { Navigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

interface AuthGuardProps {
  children: React.ReactNode
  requireRole?: 'student' | 'parent'
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { user, profile, loading } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center" role="status" aria-label="Loading your profile">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireRole && profile?.role !== requireRole) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
