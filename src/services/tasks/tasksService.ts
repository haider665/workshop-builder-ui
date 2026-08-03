import type { CWTask, CWTaskAttachment, CWTaskComment, CWTaskFieldValue, CWTaskStatus } from '../../types/cw'
import type { CreateTaskFromTemplateInput, SetTaskStatusInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'
import { workshopApi } from '../workshopApi'

export const tasksService = {
  list(): CWTask[] {
    return cwStore.getState().tasks
  },

  createFromTemplate(input: CreateTaskFromTemplateInput): CWTask {
    return cwStore.getState().createTaskFromTemplate(input)
  },

  async setStatus(taskId: string, input: SetTaskStatusInput) {
    await workshopApi.transitionTask(taskId, input.status, {
      pendingReason: input.pendingReason,
    })
    cwStore.getState().setTaskStatus(taskId, input)
  },

  async setFieldValue(taskId: string, fieldId: string, value: CWTaskFieldValue) {
    await workshopApi.submitTaskValues(taskId, { [fieldId]: value })
    cwStore.getState().setTaskFieldValue(taskId, fieldId, value)
  },

  async addComment(taskId: string, authorName: string, message: string): Promise<CWTaskComment> {
    await workshopApi.addTaskComment(taskId, message)
    const comment = cwStore.getState().addTaskComment(taskId, authorName, message)
    return comment
  },

  async addAttachment(taskId: string, file: File): Promise<CWTaskAttachment> {
    await workshopApi.uploadTaskAttachment(taskId, file)
    const attachment = cwStore.getState().addTaskAttachment(taskId, file)
    return attachment
  },

  allowedTransitions(current: CWTaskStatus): CWTaskStatus[] {
    const allowed: Record<CWTaskStatus, CWTaskStatus[]> = {
      Assigned: ['In Progress'],
      'In Progress': ['Pending', 'Completed'],
      Pending: ['In Progress'],
      Completed: [],
    }
    return allowed[current]
  },
}
