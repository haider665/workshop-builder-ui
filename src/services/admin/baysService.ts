import type { CWBay, CWBayStatus } from '../../types/cw'
import type { CreateBayInput, UpdateBayInput } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

export const baysService = {
  async list(params: {
    shopId?: string
    status?: CWBayStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWBay[]> {
    const response = await workshopApi.listBays(params)
    return response.data
  },

  async create(input: CreateBayInput): Promise<CWBay> {
    return workshopApi.createBay(input)
  },

  async update(bayId: string, input: UpdateBayInput): Promise<CWBay> {
    return workshopApi.updateBay(bayId, input)
  },

  async setStatus(bayId: string, status: CWBayStatus): Promise<CWBay> {
    return workshopApi.setBayStatus(bayId, status)
  },
}
