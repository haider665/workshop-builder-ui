import type { CWShop, CWShopStatus } from '../../types/cw'
import type { CreateShopInput, UpdateShopInput } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

export const shopsService = {
  async list(): Promise<CWShop[]> {
    const response = await workshopApi.listShops()
    return response.data
  },

  async create(input: CreateShopInput): Promise<CWShop> {
    return workshopApi.createShop(input)
  },

  async update(shopId: string, input: UpdateShopInput): Promise<CWShop> {
    return workshopApi.updateShop(shopId, input)
  },

  async setStatus(shopId: string, status: CWShopStatus): Promise<CWShop> {
    return workshopApi.setShopStatus(shopId, status)
  },
}
