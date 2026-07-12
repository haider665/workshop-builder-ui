import type { CWService, CWServiceStatus } from '../../types/cw'
import { workshopApi } from '../workshopApi'

export const servicesService = {
  async list(params: {
    shopId?: string
    status?: CWServiceStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWService[]> {
    const response = await workshopApi.listServices(params)
    return response.data
  },

  async create(input: {
    code: string
    category: string
    section?: string
    description: string
    vehicleSize?: CWService['vehicleSize']
    severity?: CWService['severity']
    processTimeMins: number
    ratePerHr?: number
    price: number
    shopId: string
    stages?: CWService['stages']
    status?: CWServiceStatus
  }): Promise<CWService> {
    return workshopApi.createService(input)
  },

  async update(
    serviceId: string,
    input: {
      code: string
      category: string
      section?: string
      description: string
      vehicleSize?: CWService['vehicleSize']
      severity?: CWService['severity']
      processTimeMins: number
      ratePerHr?: number
      price: number
      shopId: string
      stages?: CWService['stages']
      status: CWServiceStatus
    },
  ): Promise<CWService> {
    return workshopApi.updateService(serviceId, input)
  },

  async setStatus(serviceId: string, status: CWServiceStatus): Promise<CWService> {
    return workshopApi.setServiceStatus(serviceId, status)
  },
}
