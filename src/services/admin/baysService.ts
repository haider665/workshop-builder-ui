import type { CWBay, CWBayStatus } from '../../types/cw'
import type { CreateBayInput, UpdateBayInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const baysService = {
  list(): CWBay[] {
    return cwStore.getState().bays
  },

  create(input: CreateBayInput): CWBay {
    return cwStore.getState().createBay(input)
  },

  update(bayId: string, input: UpdateBayInput) {
    cwStore.getState().updateBay(bayId, input)
  },

  setStatus(bayId: string, status: CWBayStatus) {
    cwStore.getState().setBayStatus(bayId, status)
  },
}
