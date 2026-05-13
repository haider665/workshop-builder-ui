import { Navigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'

function firstLanding(roles: string[]) {
  if (roles.includes('Admin')) return '/admin'
  if (roles.includes('Job Controller')) return '/jc'
  if (roles.includes('Guard')) return '/guard'
  if (roles.includes('CRO')) return '/cro'
  return '/tasks'
}

export function LandingRedirect() {
  const user = useSessionStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={firstLanding(user.roles)} replace />
}
