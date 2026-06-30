import type { CWF1Config } from '../../types/cw'
import { workshopApi } from '../workshopApi'

export const f1Service = {
  async getConfig(): Promise<CWF1Config> {
    return workshopApi.getF1Config()
  },

  async setReturnWindowDays(days: number): Promise<CWF1Config> {
    return workshopApi.setF1Config({ returnWindowDays: days })
  },
}
