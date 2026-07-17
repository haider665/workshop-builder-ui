import { Navigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'

function firstLanding(roles: string[]) {
  if (roles.includes('Admin')) return '/admin'
  if (roles.includes('Job Creation')) return '/jc'
  if (roles.includes('Guard')) return '/guard'
  if (roles.includes('CRE')) return '/cre'
  if (roles.includes('Service Advisor')) return '/sa/appointments'
  if (roles.includes('Service Engineer')) return '/se/appointments'
  if (roles.includes('QC')) return '/qc/appointments'
  if (roles.includes('Technician')) return '/technician'
  if (roles.includes('Parts')) return '/parts/inventory'
  console.warn('[LandingRedirect] No role matched. roles:', roles)
  return '/notifications'
}

export function LandingRedirect() {
  const user = useSessionStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={firstLanding(user.roles)} replace />
}
