import type {
  CWConcern,
  CWConcernCategory,
  CWConcernCategoryStatus,
  CWConcernStatus,
} from '../../types/cw'
import { workshopApi } from '../workshopApi'

export const concernsService = {
  async listCategories(params: {
    shopId?: string
    status?: CWConcernCategoryStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWConcernCategory[]> {
    const pageSize = params.pageSize ?? 200
    const first = await workshopApi.listConcernCategories({ ...params, page: params.page ?? 1, pageSize })
    const rows = [...first.data]
    const total = first.meta?.total ?? rows.length
    for (let page = (params.page ?? 1) + 1; rows.length < total; page += 1) {
      const response = await workshopApi.listConcernCategories({ ...params, page, pageSize })
      if (!response.data.length) break
      rows.push(...response.data)
    }
    return rows
  },

  async createCategory(input: {
    name: string
    shopId: string
    status?: CWConcernCategoryStatus
  }): Promise<CWConcernCategory> {
    return workshopApi.createConcernCategory(input)
  },

  async updateCategory(
    categoryId: string,
    input: {
      name: string
      shopId?: string
      status: CWConcernCategoryStatus
    },
  ): Promise<CWConcernCategory> {
    return workshopApi.updateConcernCategory(categoryId, input)
  },

  async setCategoryStatus(categoryId: string, status: CWConcernCategoryStatus): Promise<CWConcernCategory> {
    return workshopApi.setConcernCategoryStatus(categoryId, status)
  },

  async list(params: {
    categoryId?: string
    status?: CWConcernStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWConcern[]> {
    const pageSize = params.pageSize ?? 200
    const first = await workshopApi.listConcerns({ ...params, page: params.page ?? 1, pageSize })
    const rows = [...first.data]
    const total = first.meta?.total ?? rows.length
    for (let page = (params.page ?? 1) + 1; rows.length < total; page += 1) {
      const response = await workshopApi.listConcerns({ ...params, page, pageSize })
      if (!response.data.length) break
      rows.push(...response.data)
    }
    return rows
  },

  async create(input: {
    categoryId: string
    code: string
    name: string
    sourceSystem?: string
    externalReference?: string
    processTimeMins?: number
    status?: CWConcernStatus
  }): Promise<CWConcern> {
    return workshopApi.createConcern(input)
  },

  async update(
    concernId: string,
    input: {
      categoryId?: string
      code?: string
      name: string
      sourceSystem?: string
      externalReference?: string
      processTimeMins?: number
      status: CWConcernStatus
    },
  ): Promise<CWConcern> {
    return workshopApi.updateConcern(concernId, input)
  },

  async setStatus(concernId: string, status: CWConcernStatus): Promise<CWConcern> {
    return workshopApi.setConcernStatus(concernId, status)
  },
}
