import type { CWF1Config } from '../../types/cw'
import { cwStore } from '../../store/cwStore'

export const f1Service = {
  getConfig(): CWF1Config {
    return cwStore.getState().f1Config
  },

  setReturnWindowDays(days: number) {
    cwStore.getState().setF1ReturnWindowDays(days)
  },
}
