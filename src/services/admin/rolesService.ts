import type { CWRole, CWRoleStatus } from '../../types/cw'
import type { CreateRoleInput, UpdateRoleInput } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

export const rolesService = {
  async list(includeSystem = false): Promise<CWRole[]> {
    const response = await workshopApi.listRoles(includeSystem)
    return response.data
  },

  async create(input: CreateRoleInput): Promise<CWRole> {
    return workshopApi.createRole(input)
  },

  async update(roleId: string, input: UpdateRoleInput): Promise<CWRole> {
    return workshopApi.updateRole(roleId, input)
  },

  async setStatus(roleId: string, status: CWRoleStatus): Promise<CWRole> {
    return workshopApi.setRoleStatus(roleId, status)
  },
}
