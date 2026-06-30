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

  setStatus(taskId: string, input: SetTaskStatusInput) {
    cwStore.getState().setTaskStatus(taskId, input)
    void workshopApi.transitionTask(taskId, input.status, {
      pendingReason: input.pendingReason,
    }).catch((error) => {
      console.error('Failed to persist task status change', error)
    })
  },

  setFieldValue(taskId: string, fieldId: string, value: CWTaskFieldValue) {
    cwStore.getState().setTaskFieldValue(taskId, fieldId, value)
    void workshopApi.submitTaskValues(taskId, { [fieldId]: value }).catch((error) => {
      console.error('Failed to persist task field value', error)
    })
  },

  addComment(taskId: string, authorName: string, message: string): CWTaskComment {
    const comment = cwStore.getState().addTaskComment(taskId, authorName, message)
    void workshopApi.addTaskComment(taskId, message).catch((error) => {
      console.error('Failed to persist task comment', error)
    })
    return comment
  },

  addAttachment(taskId: string, file: File): CWTaskAttachment {
    const attachment = cwStore.getState().addTaskAttachment(taskId, file)
    void workshopApi.uploadTaskAttachment(taskId, file).catch((error) => {
      console.error('Failed to persist task attachment', error)
    })
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
