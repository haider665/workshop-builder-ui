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
    const response = await workshopApi.listConcernCategories(params)
    return response.data
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
    const response = await workshopApi.listConcerns(params)
    return response.data
  },

  async create(input: {
    categoryId: string
    code: string
    name: string
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
