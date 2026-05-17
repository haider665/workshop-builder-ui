import { Navigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'

function firstLanding(roles: string[]) {
  if (roles.includes('Admin')) return '/admin'
  if (roles.includes('Job Creation')) return '/jc'
  if (roles.includes('Guard')) return '/guard'
  if (roles.includes('CRO')) return '/cro'
  if (roles.includes('Service Advisor')) return '/sa/appointments'
  if (roles.includes('Service Engineer')) return '/se/appointments'
  if (roles.includes('Technician')) return '/technician'
  return '/tasks'
}

export function LandingRedirect() {
  const user = useSessionStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={firstLanding(user.roles)} replace />
}
