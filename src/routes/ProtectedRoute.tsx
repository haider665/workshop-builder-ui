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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const allowed = props.anyOf.some((role) => user.roles.includes(role))
  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
