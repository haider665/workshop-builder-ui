import type { CWUser, CWUserStatus } from '../../types/cw'
import type { CreateUserInput, UpdateUserInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const usersService = {
  list(): CWUser[] {
    return cwStore.getState().users
  },

  create(input: CreateUserInput): CWUser {
    return cwStore.getState().createUser(input)
  },

  update(userId: string, input: UpdateUserInput) {
    cwStore.getState().updateUser(userId, input)
  },

  setStatus(userId: string, status: CWUserStatus) {
    cwStore.getState().setUserStatus(userId, status)
  },
}
