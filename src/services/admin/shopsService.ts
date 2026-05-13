import type { CWShop, CWShopStatus } from '../../types/cw'
import type { CreateShopInput, UpdateShopInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const shopsService = {
  list(): CWShop[] {
    return cwStore.getState().shops
  },

  create(input: CreateShopInput): CWShop {
    return cwStore.getState().createShop(input)
  },

  update(shopId: string, input: UpdateShopInput) {
    cwStore.getState().updateShop(shopId, input)
  },

  setStatus(shopId: string, status: CWShopStatus) {
    cwStore.getState().setShopStatus(shopId, status)
  },
}
