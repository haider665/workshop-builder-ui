const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const apiBaseUrl = configuredApiBaseUrl

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

type QueryValue = string | number | boolean | null | undefined

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

function buildQuery(params: Record<string, QueryValue>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }
  return query.toString() ? `?${query.toString()}` : ''
}

async function uploadFile(input: { file: File; folder?: string; isPrivate?: boolean }): Promise<{ fileUrl: string; fileName: string; name: string }> {
  const form = new FormData()
  form.set('file', input.file)
  if (input.folder) form.set('folder', input.folder)
  if (input.isPrivate !== undefined) form.set('is_private', input.isPrivate ? '1' : '0')

  const response = await fetch(`${apiBaseUrl}/api/method/upload_file`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  await ensureOk(response, 'File upload failed')
  return readMessage<{ file_url: string; file_name: string; name: string }>(response).then((message) => ({
    fileUrl: message.file_url,
    fileName: message.file_name,
    name: message.name,
  }))
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

  async uploadFile(file: File, opts: { folder?: string; isPrivate?: boolean } = {}) {
    return uploadFile({ file, ...opts })
  },

  async listCustomers(params: {
    status?: import('../types/cw').CWCustomerStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWCustomer>> {
    return request<ApiListResponse<import('../types/cw').CWCustomer>>(
      `/api/method/workshop.api.customers.list${buildQuery({
        status: params.status,
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async getCustomer(id: string): Promise<import('../types/cw').CWCustomer> {
    return request<import('../types/cw').CWCustomer>(`/api/method/workshop.api.customers.get${buildQuery({ id })}`)
  },

  async createCustomer(input: {
    fullName: string
    phone: string
    email?: string
    status?: import('../types/cw').CWCustomerStatus
    type?: import('../types/cw').CWCustomerType
    address?: import('../types/cw').CWAddress
    occupation?: import('../types/cw').CWOccupation
    whatsappLink?: string
    facebookLink?: string
    linkedinLink?: string
    googleLink?: string
    corporate?: import('../types/cw').CWCorporateInfo
    isSelfDriven?: boolean
    driverName?: string
    driverPhone?: string
    isPersonalUse?: boolean
  }): Promise<import('../types/cw').CWCustomer> {
    return request<import('../types/cw').CWCustomer>('/api/method/workshop.api.customers.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateCustomer(
    customerId: string,
    input: Partial<{
      fullName: string
      phone: string
      email?: string
      status: import('../types/cw').CWCustomerStatus
      type: import('../types/cw').CWCustomerType
      address: import('../types/cw').CWAddress
      occupation: import('../types/cw').CWOccupation
      whatsappLink: string
      facebookLink: string
      linkedinLink: string
      googleLink: string
      corporate: import('../types/cw').CWCorporateInfo
      isSelfDriven: boolean
      driverName: string
      driverPhone: string
      isPersonalUse: boolean
    }>,
  ): Promise<import('../types/cw').CWCustomer> {
    return request<import('../types/cw').CWCustomer>('/api/method/workshop.api.customers.update', {
      method: 'POST',
      body: { id: customerId, data: input },
    })
  },

  async listVehicles(params: {
    customerId?: string
    status?: import('../types/cw').CWVehicleStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWVehicle>> {
    return request<ApiListResponse<import('../types/cw').CWVehicle>>(
      `/api/method/workshop.api.vehicles.list${buildQuery({
        customerId: params.customerId,
        status: params.status,
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async getVehicle(id: string): Promise<import('../types/cw').CWVehicle> {
    return request<import('../types/cw').CWVehicle>(`/api/method/workshop.api.vehicles.get${buildQuery({ id })}`)
  },

  async createVehicle(input: {
    customerId: string
    registrationNo: string
    make?: string
    model?: string
    vin?: string
    odometerKm?: number
    vehicleCategory?: import('../types/cw').CWVehicleCategory
    vehicleSize: import('../types/cw').CWVehicleSize
    modelVariant?: string
    countryOfOrigin?: string
    countryOfAssembly?: string
    exteriorColor?: string
    exteriorColorCode?: string
    interiorColor?: string
    interiorColorCode?: string
    tyreSize?: string
    additionalNotes?: string
    status?: import('../types/cw').CWVehicleStatus
  }): Promise<import('../types/cw').CWVehicle> {
    return request<import('../types/cw').CWVehicle>('/api/method/workshop.api.vehicles.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateVehicle(
    vehicleId: string,
    input: Partial<{
      customerId: string
      registrationNo: string
      make?: string
      model?: string
      vin?: string
      odometerKm?: number
      vehicleCategory?: import('../types/cw').CWVehicleCategory
      vehicleSize: import('../types/cw').CWVehicleSize
      modelVariant?: string
      countryOfOrigin?: string
      countryOfAssembly?: string
      exteriorColor?: string
      exteriorColorCode?: string
      interiorColor?: string
      interiorColorCode?: string
      tyreSize?: string
      additionalNotes?: string
      status?: import('../types/cw').CWVehicleStatus
    }>,
  ): Promise<import('../types/cw').CWVehicle> {
    return request<import('../types/cw').CWVehicle>('/api/method/workshop.api.vehicles.update', {
      method: 'POST',
      body: { id: vehicleId, data: input },
    })
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
    if (includeSystem) query.set('includeSystem', '1')
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

  async listConcernCategories(params: {
    shopId?: string
    status?: import('../types/cw').CWConcernCategoryStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWConcernCategory>> {
    const query = new URLSearchParams()
    if (params.shopId) query.set('shopId', params.shopId)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWConcernCategory>>(
      `/api/method/workshop.api.concerns.categories_list${suffix}`,
    )
  },

  async createConcernCategory(input: {
    name: string
    shopId: string
    status?: import('../types/cw').CWConcernCategoryStatus
  }): Promise<import('../types/cw').CWConcernCategory> {
    return request<import('../types/cw').CWConcernCategory>(
      '/api/method/workshop.api.concerns.create_category',
      {
        method: 'POST',
        body: { data: input },
      },
    )
  },

  async updateConcernCategory(
    categoryId: string,
    input: {
      name: string
      shopId?: string
      status: import('../types/cw').CWConcernCategoryStatus
    },
  ): Promise<import('../types/cw').CWConcernCategory> {
    return request<import('../types/cw').CWConcernCategory>(
      '/api/method/workshop.api.concerns.update_category',
      {
        method: 'POST',
        body: { id: categoryId, data: input },
      },
    )
  },

  async setConcernCategoryStatus(
    categoryId: string,
    status: import('../types/cw').CWConcernCategoryStatus,
  ): Promise<import('../types/cw').CWConcernCategory> {
    return request<import('../types/cw').CWConcernCategory>(
      '/api/method/workshop.api.concerns.set_category_status',
      {
        method: 'POST',
        body: { id: categoryId, status },
      },
    )
  },

  async listConcerns(params: {
    categoryId?: string
    status?: import('../types/cw').CWConcernStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWConcern>> {
    const query = new URLSearchParams()
    if (params.categoryId) query.set('categoryId', params.categoryId)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWConcern>>(
      `/api/method/workshop.api.concerns.list${suffix}`,
    )
  },

  async createConcern(input: {
    categoryId: string
    code: string
    name: string
    processTimeMins?: number
    status?: import('../types/cw').CWConcernStatus
  }): Promise<import('../types/cw').CWConcern> {
    return request<import('../types/cw').CWConcern>('/api/method/workshop.api.concerns.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateConcern(
    concernId: string,
    input: {
      categoryId?: string
      code?: string
      name: string
      processTimeMins?: number
      status: import('../types/cw').CWConcernStatus
    },
  ): Promise<import('../types/cw').CWConcern> {
    return request<import('../types/cw').CWConcern>('/api/method/workshop.api.concerns.update', {
      method: 'POST',
      body: { id: concernId, data: input },
    })
  },

  async setConcernStatus(
    concernId: string,
    status: import('../types/cw').CWConcernStatus,
  ): Promise<import('../types/cw').CWConcern> {
    return request<import('../types/cw').CWConcern>('/api/method/workshop.api.concerns.set_status', {
      method: 'POST',
      body: { id: concernId, status },
    })
  },

  async listServices(params: {
    shopId?: string
    status?: import('../types/cw').CWServiceStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWService>> {
    const query = new URLSearchParams()
    if (params.shopId) query.set('shopId', params.shopId)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWService>>(
      `/api/method/workshop.api.services.list${suffix}`,
    )
  },

  async createService(input: {
    code: string
    category: string
    section?: string
    description: string
    vehicleSize?: import('../types/cw').CWVehicleSize
    severity?: import('../types/cw').CWServiceSeverity
    processTimeMins: number
    ratePerHr?: number
    price: number
    shopId: string
    stages?: import('../types/cw').CWServiceStageDefinition[]
    status?: import('../types/cw').CWServiceStatus
  }): Promise<import('../types/cw').CWService> {
    return request<import('../types/cw').CWService>('/api/method/workshop.api.services.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateService(
    serviceId: string,
    input: {
      code: string
      category: string
      section?: string
      description: string
      vehicleSize?: import('../types/cw').CWVehicleSize
      severity?: import('../types/cw').CWServiceSeverity
      processTimeMins: number
      ratePerHr?: number
      price: number
      shopId: string
      stages?: import('../types/cw').CWServiceStageDefinition[]
      status: import('../types/cw').CWServiceStatus
    },
  ): Promise<import('../types/cw').CWService> {
    return request<import('../types/cw').CWService>('/api/method/workshop.api.services.update', {
      method: 'POST',
      body: { id: serviceId, data: input },
    })
  },

  async setServiceStatus(
    serviceId: string,
    status: import('../types/cw').CWServiceStatus,
  ): Promise<import('../types/cw').CWService> {
    return request<import('../types/cw').CWService>('/api/method/workshop.api.services.set_status', {
      method: 'POST',
      body: { id: serviceId, status },
    })
  },

  async listTeams(params: {
    status?: import('../types/cw').CWTeamStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWTeam>> {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWTeam>>(
      `/api/method/workshop.api.teams.list${suffix}`,
    )
  },

  async createTeam(input: {
    name: string
    seUserId: string
    technicianUserIds: string[]
    status?: import('../types/cw').CWTeamStatus
  }): Promise<import('../types/cw').CWTeam> {
    return request<import('../types/cw').CWTeam>('/api/method/workshop.api.teams.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateTeam(
    teamId: string,
    input: {
      name: string
      seUserId: string
      technicianUserIds: string[]
      status: import('../types/cw').CWTeamStatus
    },
  ): Promise<import('../types/cw').CWTeam> {
    return request<import('../types/cw').CWTeam>('/api/method/workshop.api.teams.update', {
      method: 'POST',
      body: { id: teamId, data: input },
    })
  },

  async setTeamStatus(
    teamId: string,
    status: import('../types/cw').CWTeamStatus,
  ): Promise<import('../types/cw').CWTeam> {
    return request<import('../types/cw').CWTeam>('/api/method/workshop.api.teams.set_status', {
      method: 'POST',
      body: { id: teamId, status },
    })
  },

  async getF1Config(): Promise<import('../types/cw').CWF1Config> {
    return request<import('../types/cw').CWF1Config>('/api/method/workshop.api.settings.get_f1_config')
  },

  async setF1Config(input: { returnWindowDays: number }): Promise<import('../types/cw').CWF1Config> {
    return request<import('../types/cw').CWF1Config>('/api/method/workshop.api.settings.set_f1_config', {
      method: 'POST',
      body: { data: input },
    })
  },

  async listTaskTemplates(params: {
    shopId?: string
    status?: import('../types/cw').CWTaskTemplateStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWTaskTemplate>> {
    const query = new URLSearchParams()
    if (params.shopId) query.set('shopId', params.shopId)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<ApiListResponse<import('../types/cw').CWTaskTemplate>>(
      `/api/method/workshop.api.task_templates.list${suffix}`,
    )
  },

  async createTaskTemplate(input: {
    shopId: string
    name: string
    description?: string
    status?: import('../types/cw').CWTaskTemplateStatus
    fields?: import('../types/cw').CWTaskField[]
  }): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateTaskTemplate(
    templateId: string,
    input: {
      shopId: string
      name: string
      description: string
      status: import('../types/cw').CWTaskTemplateStatus
      fields?: import('../types/cw').CWTaskField[]
    },
  ): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.update', {
      method: 'POST',
      body: { id: templateId, data: input },
    })
  },

  async setTaskTemplateStatus(
    templateId: string,
    status: import('../types/cw').CWTaskTemplateStatus,
  ): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.set_status', {
      method: 'POST',
      body: { id: templateId, status },
    })
  },

  async addTaskTemplateField(
    templateId: string,
    input: {
      label: string
      type: import('../types/cw').CWTaskFieldType
      required: boolean
      options?: string[]
    },
  ): Promise<import('../types/cw').CWTaskField> {
    return request<import('../types/cw').CWTaskField>('/api/method/workshop.api.task_templates.add_field', {
      method: 'POST',
      body: { templateId, data: input },
    })
  },

  async updateTaskTemplateField(
    templateId: string,
    fieldId: string,
    input: {
      label: string
      type: import('../types/cw').CWTaskFieldType
      required: boolean
      options?: string[]
    },
  ): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.update_field', {
      method: 'POST',
      body: { templateId, fieldId, data: input },
    })
  },

  async removeTaskTemplateField(
    templateId: string,
    fieldId: string,
  ): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.remove_field', {
      method: 'POST',
      body: { templateId, fieldId },
    })
  },

  async moveTaskTemplateField(
    templateId: string,
    fieldId: string,
    direction: 'up' | 'down',
  ): Promise<import('../types/cw').CWTaskTemplate> {
    return request<import('../types/cw').CWTaskTemplate>('/api/method/workshop.api.task_templates.move_field', {
      method: 'POST',
      body: { templateId, fieldId, direction },
    })
  },

  async listAppointments(params: {
    status?: import('../types/cw').CWAppointmentStatus
    customerId?: string
    vehicleId?: string
    assignedSAUserId?: string
    assignedQCUserId?: string
    assignedTeamId?: string
    slotDate?: string
    paymentStatus?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWAppointment>> {
    return request<ApiListResponse<import('../types/cw').CWAppointment>>(
      `/api/method/workshop.api.appointments.list${buildQuery({
        status: params.status,
        customerId: params.customerId,
        vehicleId: params.vehicleId,
        assignedSAUserId: params.assignedSAUserId,
        assignedQCUserId: params.assignedQCUserId,
        assignedTeamId: params.assignedTeamId,
        slotDate: params.slotDate,
        paymentStatus: params.paymentStatus,
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async getAppointment(id: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>(`/api/method/workshop.api.appointments.get${buildQuery({ id })}`)
  },

  async createAppointment(input: {
    customerId: string
    vehicleId: string
    slotDate?: string
    slotTime?: string
    scheduledAt?: string
    concerns?: string
    notes?: string
    status?: import('../types/cw').CWAppointmentStatus
    assignedSAUserId?: string
    assignedQCUserId?: string
    assignedTeamId?: string
    gateEntryId?: string
    paymentStatus?: string
    concernItems?: Array<Record<string, unknown>>
    serviceItems?: Array<Record<string, unknown>>
    inspectionChecks?: import('../types/cw').CWInspectionCheck[]
    vehicleViewChecks?: import('../types/cw').CWInspectionCheck[]
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async updateAppointment(
    appointmentId: string,
    input: Partial<{
      customerId: string
      vehicleId: string
      slotDate: string
      slotTime: string
      scheduledAt: string
      concerns: string
      notes: string
      status: import('../types/cw').CWAppointmentStatus
      assignedSAUserId: string
      assignedQCUserId: string
      assignedTeamId: string
      gateEntryId: string
      paymentStatus: string
      concernItems: Array<Record<string, unknown>>
      serviceItems: Array<Record<string, unknown>>
      inspectionChecks: import('../types/cw').CWInspectionCheck[]
      vehicleViewChecks: import('../types/cw').CWInspectionCheck[]
    }>,
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.update', {
      method: 'POST',
      body: { id: appointmentId, data: input },
    })
  },

  async transitionAppointment(
    appointmentId: string,
    status: import('../types/cw').CWAppointmentStatus,
    data: Record<string, unknown> = {},
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.transition', {
      method: 'POST',
      body: { id: appointmentId, status, data },
    })
  },

  async assignAppointmentSa(appointmentId: string, assignedSAUserId: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.assign_sa', {
      method: 'POST',
      body: { appointmentId, assignedSAUserId },
    })
  },

  async setCustomerApproval(
    appointmentId: string,
    input: { status: 'Approved' | 'Rejected'; note?: string },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.set_customer_approval', {
      method: 'POST',
      body: { appointmentId, ...input },
    })
  },

  async addAppointmentConcern(
    appointmentId: string,
    data: { concernId: string; remark?: string },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.add_concern', {
      method: 'POST',
      body: { appointmentId, data },
    })
  },

  async updateAppointmentConcern(
    appointmentId: string,
    concernItemId: string,
    data: { remark?: string; serviceIds?: string[] },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.update_concern', {
      method: 'POST',
      body: { appointmentId, concernItemId, data },
    })
  },

  async removeAppointmentConcern(appointmentId: string, concernItemId: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.remove_concern', {
      method: 'POST',
      body: { appointmentId, concernItemId },
    })
  },

  async addAppointmentService(
    appointmentId: string,
    data: { serviceId: string; remark?: string; addedBySA?: boolean },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.add_service', {
      method: 'POST',
      body: { appointmentId, data },
    })
  },

  async updateAppointmentService(
    appointmentId: string,
    serviceItemId: string,
    data: { remark?: string; price?: number; serviceIds?: string[]; addedBySA?: boolean },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.update_service', {
      method: 'POST',
      body: { appointmentId, serviceItemId, data },
    })
  },

  async removeAppointmentService(appointmentId: string, serviceItemId: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.remove_service', {
      method: 'POST',
      body: { appointmentId, serviceItemId },
    })
  },

  async submitAppointmentInspection(input: {
    appointmentId: string
    checks: import('../types/cw').CWInspectionCheck[]
    actorName?: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.appointments.submit_inspection', {
      method: 'POST',
      body: { data: input },
    })
  },

  async guardEntry(input: { registrationNo: string; appointmentId?: string }): Promise<{ gateEvent: unknown; pendingVehicle: unknown }> {
    return request<{ gateEvent: unknown; pendingVehicle: unknown }>('/api/method/workshop.api.guard.entry', {
      method: 'POST',
      body: { data: input },
    })
  },

  async guardExitCheck(registrationNo: string): Promise<unknown> {
    return request<unknown>(`/api/method/workshop.api.guard.exit_check${buildQuery({ registrationNo })}`)
  },

  async guardExit(input: { registrationNo: string }): Promise<{ allowed: boolean; gateEvent?: unknown; pendingVehicle?: unknown }> {
    return request<{ allowed: boolean; gateEvent?: unknown; pendingVehicle?: unknown }>(
      '/api/method/workshop.api.guard.exit',
      { method: 'POST', body: { data: input } },
    )
  },

  async listPendingVehicles(params: {
    status?: import('../types/cw').CWPendingVehicleStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWPendingVehicle>> {
    return request<ApiListResponse<import('../types/cw').CWPendingVehicle>>(
      `/api/method/workshop.api.intake.pending_vehicles${buildQuery({
        status: params.status,
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async resolvePendingVehicle(
    pendingVehicleId: string,
    input: { customerId: string; vehicleId: string },
  ): Promise<import('../types/cw').CWPendingVehicle> {
    return request<import('../types/cw').CWPendingVehicle>('/api/method/workshop.api.intake.resolve_pending_vehicle', {
      method: 'POST',
      body: { data: { pendingVehicleId, ...input } },
    })
  },

  async setPendingVehicleStatus(
    pendingVehicleId: string,
    status: import('../types/cw').CWPendingVehicleStatus,
  ): Promise<import('../types/cw').CWPendingVehicle> {
    return request<import('../types/cw').CWPendingVehicle>('/api/method/workshop.api.intake.set_pending_vehicle_status', {
      method: 'POST',
      body: { pendingVehicleId, status },
    })
  },

  async listJobs(params: {
    status?: import('../types/cw').CWJobStatus
    registrationNo?: string
    appointmentId?: string
    pendingVehicleId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWJob>> {
    return request<ApiListResponse<import('../types/cw').CWJob>>(
      `/api/method/workshop.api.jobs.list${buildQuery({
        status: params.status,
        registrationNo: params.registrationNo,
        appointmentId: params.appointmentId,
        pendingVehicleId: params.pendingVehicleId,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async getJob(id: string): Promise<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }> {
    return request<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>(
      `/api/method/workshop.api.jobs.get${buildQuery({ id })}`,
    )
  },

  async createJob(input: { registrationNo: string; appointmentId?: string }): Promise<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }> {
    return request<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>('/api/method/workshop.api.jobs.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async createJobWithTasks(input: Record<string, unknown>): Promise<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }> {
    return request<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>('/api/method/workshop.api.jobs.create_with_tasks', {
      method: 'POST',
      body: { data: input },
    })
  },

  async transitionJob(jobId: string, status: import('../types/cw').CWJobStatus, data: Record<string, unknown> = {}): Promise<import('../types/cw').CWJob> {
    return request<import('../types/cw').CWJob>('/api/method/workshop.api.jobs.transition', {
      method: 'POST',
      body: { id: jobId, status, data },
    })
  },

  async moveJobTask(jobId: string, taskId: string, direction: 'up' | 'down'): Promise<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }> {
    return request<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>(
      '/api/method/workshop.api.jobs.move_task',
      { method: 'POST', body: { jobId, taskId, direction } },
    )
  },

  async initiateTestDrive(jobId: string, input: { driverName: string; driverNid?: string; expectedReturnAt?: string }): Promise<import('../types/cw').CWJob> {
    return request<import('../types/cw').CWJob>('/api/method/workshop.api.jobs.initiate_test_drive', {
      method: 'POST',
      body: { id: jobId, ...input },
    })
  },

  async logTestDriveReturn(jobId: string, data: { returnedAt: string; notes?: string }): Promise<import('../types/cw').CWJob> {
    return request<import('../types/cw').CWJob>('/api/method/workshop.api.jobs.log_test_drive_return', {
      method: 'POST',
      body: { id: jobId, data },
    })
  },

  async approveGatepass(jobId: string, reason: string): Promise<import('../types/cw').CWJob> {
    return request<import('../types/cw').CWJob>('/api/method/workshop.api.jobs.approve_gatepass', {
      method: 'POST',
      body: { id: jobId, reason },
    })
  },

  async listTasks(params: {
    jobId?: string
    status?: import('../types/cw').CWTaskStatus
    assignedTo?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWTask>> {
    return request<ApiListResponse<import('../types/cw').CWTask>>(
      `/api/method/workshop.api.tasks.list${buildQuery({
        jobId: params.jobId,
        status: params.status,
        assignedTo: params.assignedTo,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
    )
  },

  async myTasks(params: {
    status?: import('../types/cw').CWTaskStatus
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWTask>> {
    return request<ApiListResponse<import('../types/cw').CWTask>>(
      `/api/method/workshop.api.tasks.my_tasks${buildQuery(params)}`,
    )
  },

  async getTask(id: string): Promise<import('../types/cw').CWTask> {
    return request<import('../types/cw').CWTask>(`/api/method/workshop.api.tasks.get${buildQuery({ id })}`)
  },

  async myCalendar(params: { startAt: string; endAt: string; assignedTo?: string }): Promise<{ data: import('../types/cw').CWTask[] }> {
    return request<{ data: import('../types/cw').CWTask[] }>(
      `/api/method/workshop.api.tasks.my_calendar${buildQuery(params)}`,
    )
  },

  async listCallRecords(params: {
    appointmentId?: string
    customerId?: string
    direction?: 'inbound' | 'outbound'
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWCallRecord>> {
    return request<ApiListResponse<import('../types/cw').CWCallRecord>>(
      `/api/method/workshop.api.calls.list${buildQuery(params)}`,
    )
  },

  async createCallRecord(input: {
    appointmentId?: string
    customerId?: string
    customerName?: string
    direction: 'inbound' | 'outbound'
    durationSecs?: number
    startedAt?: string
    notes?: string
  }): Promise<import('../types/cw').CWCallRecord> {
    return request<import('../types/cw').CWCallRecord>('/api/method/workshop.api.calls.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async listReminders(params: {
    appointmentId?: string
    customerId?: string
    status?: import('../types/cw').CWReminderStatus
    type?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWReminder>> {
    return request<ApiListResponse<import('../types/cw').CWReminder>>(
      `/api/method/workshop.api.reminders.list${buildQuery(params)}`,
    )
  },

  async createReminder(input: {
    appointmentId: string
    customerId?: string
    customerName?: string
    vehicleReg?: string
    type?: string
    scheduledAt: string
    message: string
    status?: import('../types/cw').CWReminderStatus
    sentAt?: string
  }): Promise<import('../types/cw').CWReminder> {
    return request<import('../types/cw').CWReminder>('/api/method/workshop.api.reminders.create', {
      method: 'POST',
      body: { data: input },
    })
  },

  async markReminderSent(id: string): Promise<import('../types/cw').CWReminder> {
    return request<import('../types/cw').CWReminder>('/api/method/workshop.api.reminders.mark_sent', {
      method: 'POST',
      body: { id },
    })
  },

  async cancelReminder(id: string): Promise<import('../types/cw').CWReminder> {
    return request<import('../types/cw').CWReminder>('/api/method/workshop.api.reminders.cancel', {
      method: 'POST',
      body: { id },
    })
  },

  async transitionTask(taskId: string, status: import('../types/cw').CWTaskStatus, data: Record<string, unknown> = {}): Promise<import('../types/cw').CWTask> {
    return request<import('../types/cw').CWTask>('/api/method/workshop.api.tasks.transition', {
      method: 'POST',
      body: { id: taskId, status, data },
    })
  },

  async overrideTaskDependency(taskId: string, reason: string): Promise<import('../types/cw').CWTask> {
    return request<import('../types/cw').CWTask>('/api/method/workshop.api.tasks.override_dependency', {
      method: 'POST',
      body: { id: taskId, reason },
    })
  },

  async setTaskSourceConcern(taskId: string, concernId: string | null): Promise<import('../types/cw').CWTask> {
    return request<import('../types/cw').CWTask>('/api/method/workshop.api.tasks.set_source_concern', {
      method: 'POST',
      body: { id: taskId, concernId },
    })
  },

  async submitTaskValues(taskId: string, values: Record<string, unknown>): Promise<import('../types/cw').CWTask> {
    return request<import('../types/cw').CWTask>('/api/method/workshop.api.tasks.submit_values', {
      method: 'POST',
      body: { id: taskId, data: { values } },
    })
  },

  async addTaskComment(taskId: string, message: string): Promise<import('../types/cw').CWTaskComment> {
    return request<import('../types/cw').CWTaskComment>('/api/method/workshop.api.tasks.add_comment', {
      method: 'POST',
      body: { id: taskId, message },
    })
  },

  async uploadTaskAttachment(taskId: string, file: File): Promise<import('../types/cw').CWTaskAttachment> {
    const uploaded = await uploadFile({ file })
    return request<import('../types/cw').CWTaskAttachment>('/api/method/workshop.api.tasks.upload_attachment', {
      method: 'POST',
      body: {
        id: taskId,
        fileId: uploaded.name,
        data: {
          mimeType: file.type,
          sizeBytes: file.size,
        },
      },
    })
  },

  async removeTaskAttachment(attachmentId: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>('/api/method/workshop.api.tasks.remove_attachment', {
      method: 'POST',
      body: { attachmentId },
    })
  },

  async availableUsers(params: {
    shopId: string
    roleId: string
    startAt: string
    endAt: string
    page?: number
    pageSize?: number
  }): Promise<ApiListResponse<import('../types/cw').CWUser>> {
    return request<ApiListResponse<import('../types/cw').CWUser>>(
      `/api/method/workshop.api.scheduling.available_users${buildQuery(params)}`,
    )
  },

  async availableBays(params: {
    shopId: string
    startAt: string
    endAt: string
    page?: number
    pageSize?: number
  }): Promise<ApiListResponse<import('../types/cw').CWBay>> {
    return request<ApiListResponse<import('../types/cw').CWBay>>(
      `/api/method/workshop.api.scheduling.available_bays${buildQuery(params)}`,
    )
  },

  async assignQc(appointmentId: string, qcUserId: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.qc.assign', {
      method: 'POST',
      body: { appointmentId, qcUserId },
    })
  },

  async qcApprove(
    appointmentId: string,
    data: { items: Array<{ itemId: string; itemType: string; status: string; note?: string }> },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.qc.approve', {
      method: 'POST',
      body: { appointmentId, data },
    })
  },

  async qcReject(
    appointmentId: string,
    data: {
      rejectionNote: string
      items: Array<{ itemId: string; itemType: string; status: string; note?: string }>
    },
  ): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.qc.reject', {
      method: 'POST',
      body: { appointmentId, data },
    })
  },

  async confirmPayment(appointmentId: string, data: { actorName: string }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.release.confirm_payment', {
      method: 'POST',
      body: { appointmentId, data },
    })
  },

  async releaseVehicle(appointmentId: string): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.release.release_vehicle', {
      method: 'POST',
      body: { appointmentId },
    })
  },

  async assignConcernDiagnosis(input: {
    appointmentId: string
    concernItemId: string
    seUserId: string
    bayId?: string
    startAt?: string
    endAt?: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_concern_diagnosis', {
      method: 'POST',
      body: input,
    })
  },

  async assignConcernTechnicians(input: {
    appointmentId: string
    concernItemId: string
    technicianUserIds: string[]
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_concern_technicians', {
      method: 'POST',
      body: input,
    })
  },

  async setConcernWorkStatus(input: {
    appointmentId: string
    concernItemId: string
    status: import('../types/cw').CWConcernWorkStatus
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.transition_concern', {
      method: 'POST',
      body: input,
    })
  },

  async setServiceWorkStatus(input: {
    appointmentId: string
    serviceItemId: string
    status: import('../types/cw').CWServiceWorkStatus
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.transition_service', {
      method: 'POST',
      body: input,
    })
  },

  async assignServiceSE(input: {
    appointmentId: string
    serviceItemId: string
    seUserId: string
    bayId?: string
    startAt?: string
    endAt?: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_service_se', {
      method: 'POST',
      body: input,
    })
  },

  async assignServiceTechnicians(input: {
    appointmentId: string
    serviceItemId: string
    technicianUserIds: string[]
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_service_technicians', {
      method: 'POST',
      body: input,
    })
  },

  async assignStageSchedule(input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    bayId: string
    teamId?: string
    seUserId?: string
    startAt: string
    endAt: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_stage_schedule', {
      method: 'POST',
      body: input,
    })
  },

  async setStageWorkStatus(input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    status: import('../types/cw').CWStageWorkStatus
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.transition_stage', {
      method: 'POST',
      body: input,
    })
  },

  async assignStageTechnicians(input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    technicianUserIds: string[]
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.assign_stage_technicians', {
      method: 'POST',
      body: input,
    })
  },

  async submitInspectionComplete(input: {
    appointmentId: string
    actorName: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.submit_diagnosis_complete', {
      method: 'POST',
      body: input,
    })
  },

  async submitServiceComplete(input: {
    appointmentId: string
    actorName: string
  }): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.submit_service_complete', {
      method: 'POST',
      body: input,
    })
  },

  async startTechnicianTimer(input: Record<string, unknown>): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.timer_start', {
      method: 'POST',
      body: input,
    })
  },

  async pauseTechnicianTimer(input: Record<string, unknown>): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.timer_pause', {
      method: 'POST',
      body: input,
    })
  },

  async resumeTechnicianTimer(input: Record<string, unknown>): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.timer_resume', {
      method: 'POST',
      body: input,
    })
  },

  async completeTechnicianTimer(input: Record<string, unknown>): Promise<import('../types/cw').CWAppointment> {
    return request<import('../types/cw').CWAppointment>('/api/method/workshop.api.execution.timer_complete', {
      method: 'POST',
      body: input,
    })
  },

  async listHistoryVehicle(params: {
    registrationNo?: string
    vehicleId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>> {
    return request<ApiListResponse<{ job: import('../types/cw').CWJob; tasks: import('../types/cw').CWTask[] }>>(
      `/api/method/workshop.api.history.vehicle${buildQuery(params)}`,
    )
  },

  async listHistoryEmployee(params: {
    userId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<import('../types/cw').CWTask> & { meta: { completed?: number } }> {
    return request<ApiListResponse<import('../types/cw').CWTask> & { meta: { completed?: number } }>(
      `/api/method/workshop.api.history.employee${buildQuery(params)}`,
    )
  },

  async getAdminSummary(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/method/workshop.api.reports.admin_summary')
  },

  async getF1Report(params: {
    shopId?: string
    userId?: string
    vehicleId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ summary: Record<string, unknown>; data: unknown[]; meta: Record<string, unknown> }> {
    return request<{ summary: Record<string, unknown>; data: unknown[]; meta: Record<string, unknown> }>(
      `/api/method/workshop.api.reports.f1${buildQuery(params)}`,
    )
  },

  async flagF1Return(input: { originalTaskId: string; userId: string; reason: string }): Promise<unknown> {
    return request<unknown>('/api/method/workshop.api.reports.flag_f1_return', {
      method: 'POST',
      body: { data: input },
    })
  },

  async listNotifications(params: {
    unreadOnly?: boolean
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<unknown>> {
    return request<ApiListResponse<unknown>>(
      `/api/method/workshop.api.notifications.list${buildQuery(params)}`,
    )
  },

  async markNotificationRead(id: string): Promise<{ id: string; read: boolean }> {
    return request<{ id: string; read: boolean }>('/api/method/workshop.api.notifications.mark_read', {
      method: 'POST',
      body: { id },
    })
  },

  async listAudit(params: {
    actor?: string
    action?: string
    referenceDoctype?: string
    referenceName?: string
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<unknown>> {
    return request<ApiListResponse<unknown>>(
      `/api/method/workshop.api.audit.list${buildQuery(params)}`,
    )
  },

  async sendWhatsapp(input: {
    appointmentId: string
    direction: 'outbound' | 'inbound'
    message: string
  }): Promise<unknown> {
    return request<unknown>('/api/method/workshop.api.communications.send_whatsapp', {
      method: 'POST',
      body: input,
    })
  },

  async listWhatsapp(params: {
    appointmentId?: string
    direction?: 'outbound' | 'inbound'
    page?: number
    pageSize?: number
  } = {}): Promise<ApiListResponse<unknown>> {
    return request<ApiListResponse<unknown>>(
      `/api/method/workshop.api.communications.whatsapp_list${buildQuery(params)}`,
    )
  },
}
