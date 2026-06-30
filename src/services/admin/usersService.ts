import type { CWUser, CWUserStatus } from '../../types/cw'
import type { CreateUserInput, UpdateUserInput } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

export const usersService = {
  async list(params: {
    status?: CWUserStatus
    shopId?: string
    roleId?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWUser[]> {
    const response = await workshopApi.listUsers(params)
    return response.data
  },

  async create(input: CreateUserInput): Promise<CWUser> {
    return workshopApi.createUser(input)
  },

  async update(userId: string, input: UpdateUserInput): Promise<CWUser> {
    return workshopApi.updateUser(userId, input)
  },

  async setStatus(userId: string, status: CWUserStatus): Promise<CWUser> {
    return workshopApi.setUserStatus(userId, status)
  },
}
