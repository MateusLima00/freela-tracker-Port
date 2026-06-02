import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface PrivateRouteProps {
  children: ReactNode
  kind: 'admin' | 'client'
}

export function PrivateRoute({ children, kind }: PrivateRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (!user) return <Navigate to="/login" replace />

  if (user.kind !== kind) {
    return <Navigate to={user.kind === 'admin' ? '/dashboard' : '/client/projects'} replace />
  }

  // Cliente no 1º acesso deve trocar a senha antes de acessar o portal
  if (user.kind === 'client' && user.mustChangePassword) {
    return <Navigate to="/client/change-password" replace />
  }

  return <>{children}</>
}
