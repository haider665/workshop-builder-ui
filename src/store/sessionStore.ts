import { create } from 'zustand'
import type { Role } from '../types/roles'

export type SessionUser = {
  name: string
  roles: Role[]
}

type SessionState = {
  user: SessionUser | null
  login: (user: SessionUser) => void
  logout: () => void
}

// MVP rule: in-memory only. No persistence.
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
