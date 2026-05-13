import type { CWRole, CWRoleStatus } from '../../types/cw'
import type { CreateRoleInput, UpdateRoleInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const rolesService = {
  list(): CWRole[] {
    return cwStore.getState().roles
  },

  create(input: CreateRoleInput): CWRole {
    return cwStore.getState().createRole(input)
  },

  update(roleId: string, input: UpdateRoleInput) {
    cwStore.getState().updateRole(roleId, input)
  },

  setStatus(roleId: string, status: CWRoleStatus) {
    cwStore.getState().setRoleStatus(roleId, status)
  },
}
