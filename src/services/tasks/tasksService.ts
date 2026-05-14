import type { CWTask, CWTaskAttachment, CWTaskComment, CWTaskFieldValue, CWTaskStatus } from '../../types/cw'
import type { CreateTaskFromTemplateInput, SetTaskStatusInput } from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const tasksService = {
  list(): CWTask[] {
    return cwStore.getState().tasks
  },

  createFromTemplate(input: CreateTaskFromTemplateInput): CWTask {
    return cwStore.getState().createTaskFromTemplate(input)
  },

  setStatus(taskId: string, input: SetTaskStatusInput) {
    cwStore.getState().setTaskStatus(taskId, input)
  },

  setFieldValue(taskId: string, fieldId: string, value: CWTaskFieldValue) {
    cwStore.getState().setTaskFieldValue(taskId, fieldId, value)
  },

  addComment(taskId: string, authorName: string, message: string): CWTaskComment {
    return cwStore.getState().addTaskComment(taskId, authorName, message)
  },

  addAttachment(taskId: string, file: File): CWTaskAttachment {
    return cwStore.getState().addTaskAttachment(taskId, file)
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
