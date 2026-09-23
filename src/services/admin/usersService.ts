import type { CWUser, CWUserStatus } from '../../types/cw'
import type { CreateUserInput, UpdateUserInput } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

type UsersListParams = {
  status?: CWUserStatus
  shopId?: string
  roleId?: string
  search?: string
  page?: number
  pageSize?: number
}

export const usersService = {
  async list(params: UsersListParams = {}): Promise<CWUser[]> {
    const response = await workshopApi.listUsers(params)
    return response.data
  },

  /** Load every account visible in the active company. The API is paginated. */
  async listAll(params: Omit<UsersListParams, 'page' | 'pageSize'> = {}): Promise<CWUser[]> {
    const users: CWUser[] = []
    const pageSize = 100
    for (let page = 1; page <= 100; page += 1) {
      const response = await workshopApi.listUsers({ ...params, page, pageSize })
      users.push(...response.data)
      const total = response.meta?.total
      if (response.data.length === 0 || (typeof total === 'number' && users.length >= total) || response.data.length < pageSize) break
    }
    return users
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
