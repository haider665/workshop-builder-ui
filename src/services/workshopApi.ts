const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export type CWUserDto = {
  id: string
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export type AuthSessionDto = {
  ok?: boolean
  user: CWUserDto
  capabilities: string[]
}

type FrappeResponse<T> = {
  message: T
}

export type ApiListResponse<T> = {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    [key: string]: number
  }
}

async function readMessage<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as FrappeResponse<T>
  return payload.message
}

async function ensureOk(response: Response, fallbackMessage: string) {
  if (response.ok) return

  let message = fallbackMessage
  try {
    const payload = (await response.json()) as { message?: unknown; exception?: string }
    if (typeof payload.message === 'string') message = payload.message
    else if (payload.exception) message = payload.exception
  } catch {
    // Response was not JSON; keep the fallback message.
  }

  throw new Error(message)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  await ensureOk(response, 'Request failed')
  return readMessage<T>(response)
}

export const workshopApi = {
  async login(username: string, password: string): Promise<AuthSessionDto> {
    const body = new URLSearchParams()
    body.set('usr', username)
    body.set('pwd', password)

    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      credentials: 'include',
    })

    await ensureOk(response, 'Login failed')
    return readMessage<AuthSessionDto>(response)
  },

  async me(): Promise<AuthSessionDto | null> {
    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.me`, {
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) return null

    await ensureOk(response, 'Failed to restore session')
    return readMessage<AuthSessionDto>(response)
  },

  async logout(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.logout`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.status === 401) return
    await ensureOk(response, 'Logout failed')
  },

  async listShops(): Promise<ApiListResponse<import('../types/cw').CWShop>> {
    return request<ApiListResponse<import('../types/cw').CWShop>>('/api/method/workshop.api.shops.list')
  },

  async createShop(input: {
    name: string
    type: import('../types/cw').CWShopType
    description?: string
    status?: import('../types/cw').CWShopStatus
  }): Promise<import('../types/cw').CWShop> {
    return request<import('../types/cw').CWShop>('/api/method/workshop.api.shops.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateShop(
    shopId: string,
    input: {
      name: string
      type: import('../types/cw').CWShopType
      description: string
    },
  ): Promise<import('../types/cw').CWShop> {
    return request<import('../types/cw').CWShop>('/api/method/workshop.api.shops.update', {
      method: 'POST',
      body: { id: shopId, data: input },
    })
  },

  async setShopStatus(
    shopId: string,
    status: import('../types/cw').CWShopStatus,
  ): Promise<import('../types/cw').CWShop> {
    return request<import('../types/cw').CWShop>('/api/method/workshop.api.shops.set_status', {
      method: 'POST',
      body: { id: shopId, status },
    })
  },

  async listRoles(includeSystem = false): Promise<ApiListResponse<import('../types/cw').CWRole>> {
    const query = new URLSearchParams()
    if (includeSystem) query.set('includeSystem', 'true')
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWRole>>(
      `/api/method/workshop.api.roles.list${suffix}`,
    )
  },

  async createRole(input: {
    name: string
    status?: import('../types/cw').CWRoleStatus
  }): Promise<import('../types/cw').CWRole> {
    return request<import('../types/cw').CWRole>('/api/method/workshop.api.roles.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateRole(
    roleId: string,
    input: {
      name: string
    },
  ): Promise<import('../types/cw').CWRole> {
    return request<import('../types/cw').CWRole>('/api/method/workshop.api.roles.update', {
      method: 'POST',
      body: { id: roleId, data: input },
    })
  },

  async setRoleStatus(
    roleId: string,
    status: import('../types/cw').CWRoleStatus,
  ): Promise<import('../types/cw').CWRole> {
    return request<import('../types/cw').CWRole>('/api/method/workshop.api.roles.set_status', {
      method: 'POST',
      body: { id: roleId, status },
    })
  },

  async listBays(params: {
    shopId?: string
    status?: import('../types/cw').CWBayStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWBay>> {
    const query = new URLSearchParams()
    if (params.shopId) query.set('shopId', params.shopId)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWBay>>(
      `/api/method/workshop.api.bays.list${suffix}`,
    )
  },

  async createBay(input: {
    shopId: string
    name: string
    status?: import('../types/cw').CWBayStatus
  }): Promise<import('../types/cw').CWBay> {
    return request<import('../types/cw').CWBay>('/api/method/workshop.api.bays.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateBay(
    bayId: string,
    input: {
      name: string
      status: import('../types/cw').CWBayStatus
    },
  ): Promise<import('../types/cw').CWBay> {
    return request<import('../types/cw').CWBay>('/api/method/workshop.api.bays.update', {
      method: 'POST',
      body: { id: bayId, data: input },
    })
  },

  async setBayStatus(
    bayId: string,
    status: import('../types/cw').CWBayStatus,
  ): Promise<import('../types/cw').CWBay> {
    return request<import('../types/cw').CWBay>('/api/method/workshop.api.bays.set_status', {
      method: 'POST',
      body: { id: bayId, status },
    })
  },

  async listUsers(params: {
    status?: import('../types/cw').CWUserStatus
    shopId?: string
    roleId?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWUser>> {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.shopId) query.set('shopId', params.shopId)
    if (params.roleId) query.set('roleId', params.roleId)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWUser>>(
      `/api/method/workshop.api.users.list${suffix}`,
    )
  },

  async createUser(input: {
    fullName: string
    email: string
    mobile: string
    roleIds: string[]
    shopIds: string[]
    status?: import('../types/cw').CWUserStatus
    password?: string
  }): Promise<import('../types/cw').CWUser> {
    return request<import('../types/cw').CWUser>('/api/method/workshop.api.users.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateUser(
    userId: string,
    input: {
      fullName: string
      email: string
      mobile: string
      roleIds: string[]
      shopIds: string[]
      status: import('../types/cw').CWUserStatus
      password?: string
    },
  ): Promise<import('../types/cw').CWUser> {
    return request<import('../types/cw').CWUser>('/api/method/workshop.api.users.update', {
      method: 'POST',
      body: { id: userId, data: input },
    })
  },

  async setUserStatus(
    userId: string,
    status: import('../types/cw').CWUserStatus,
  ): Promise<import('../types/cw').CWUser> {
    return request<import('../types/cw').CWUser>('/api/method/workshop.api.users.set_status', {
      method: 'POST',
      body: { id: userId, status },
    })
  },
}
