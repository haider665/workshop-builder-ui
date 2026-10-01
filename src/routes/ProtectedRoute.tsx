import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import type { Role } from '../types/roles'

export function RequireAuth() {
  const user = useSessionStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireRole(props: { anyOf: Role[] }) {
  const user = useSessionStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // The normalized `Admin` role is intentionally not the same as the
  // Administrator account or Workshop Admin. A regular Admin is limited to
  // the workspace links; the two elevated tiers retain their broader access.
  const regularAdmin = user.roles.includes('Admin') && !user.isWorkshopAdmin && !user.isAdministrator
  const workspacePath = ['/admin', '/test-drives', '/service-orders'].includes(location.pathname)
  const allowed = user.isAdministrator || user.isWorkshopAdmin
    ? true
    : regularAdmin
      ? workspacePath && props.anyOf.includes('Admin')
      : props.anyOf.some((role) => role !== 'Admin' && user.roles.includes(role))
  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
