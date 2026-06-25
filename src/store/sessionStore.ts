import { create } from 'zustand'
import { workshopApi } from '../services/workshopApi'
import type { Role } from '../types/roles'
import type { AuthSessionDto } from '../services/workshopApi'

export type SessionUser = {
  id: string
  name: string
  roles: Role[]
  email: string
  capabilities: string[]
  rawRoleIds: string[]
}

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

type SessionState = {
  user: SessionUser | null
  status: SessionStatus
  error: string | null
  login: (username: string, password: string) => Promise<void>
  restore: () => Promise<void>
  logout: () => Promise<void>
}

function hasAnyRole(roleIds: string[], names: string[]) {
  const normalized = new Set(roleIds.map((role) => role.toLowerCase()))
  return names.some((name) => normalized.has(name.toLowerCase()))
}

function roleFromBackend(session: AuthSessionDto): Role[] {
  const roles = new Set<Role>()
  const roleIds = session.user.roleIds ?? []
  const capabilities = new Set(session.capabilities ?? [])

  if (
    hasAnyRole(roleIds, ['Administrator', 'System Manager', 'Workshop Admin', 'CW Admin']) ||
    capabilities.has('admin.read')
  ) {
    roles.add('Admin')
  }
  if (hasAnyRole(roleIds, ['Guard', 'CW Guard'])) roles.add('Guard')
  if (hasAnyRole(roleIds, ['Job Creation', 'CW Job Creation'])) roles.add('Job Creation')
  if (hasAnyRole(roleIds, ['CRE', 'CRO', 'CW CRE', 'CW CRO'])) roles.add('CRE')
  if (hasAnyRole(roleIds, ['Technician', 'CW Technician'])) roles.add('Technician')
  if (hasAnyRole(roleIds, ['Service Advisor', 'SA', 'CW Service Advisor'])) roles.add('Service Advisor')
  if (hasAnyRole(roleIds, ['Service Engineer', 'SE', 'CW Service Engineer'])) roles.add('Service Engineer')
  if (hasAnyRole(roleIds, ['QC', 'Quality Controller', 'CW QC'])) roles.add('QC')
  if (!roles.size && roleIds.length) roles.add('Custom Role')

  return [...roles]
}

function toSessionUser(session: AuthSessionDto): SessionUser {
  return {
    id: session.user.id,
    name: session.user.fullName || session.user.id,
    email: session.user.email,
    roles: roleFromBackend(session),
    capabilities: session.capabilities ?? [],
    rawRoleIds: session.user.roleIds ?? [],
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'idle',
  error: null,
  login: async (username, password) => {
    set({ status: 'loading', error: null })
    try {
      const session = await workshopApi.login(username, password)
      set({ user: toSessionUser(session), status: 'authenticated', error: null })
    } catch (error) {
      set({
        user: null,
        status: 'anonymous',
        error: error instanceof Error ? error.message : 'Login failed',
      })
      throw error
    }
  },
  restore: async () => {
    set({ status: 'loading', error: null })
    try {
      const session = await workshopApi.me()
      if (!session) {
        set({ user: null, status: 'anonymous', error: null })
        return
      }
      set({ user: toSessionUser(session), status: 'authenticated', error: null })
    } catch (error) {
      set({
        user: null,
        status: 'anonymous',
        error: error instanceof Error ? error.message : 'Failed to restore session',
      })
    }
  },
  logout: async () => {
    try {
      await workshopApi.logout()
    } finally {
      set({ user: null, status: 'anonymous', error: null })
    }
  },
}))
