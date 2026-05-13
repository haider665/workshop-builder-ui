import type {
  CWTaskField,
  CWTaskTemplate,
  CWTaskTemplateStatus,
} from '../../types/cw'
import type {
  CreateTaskFieldInput,
  CreateTaskTemplateInput,
  UpdateTaskFieldInput,
  UpdateTaskTemplateInput,
} from '../../store/cwStore'
import { cwStore } from '../../store/cwStore'

export const taskTemplatesService = {
  list(): CWTaskTemplate[] {
    return cwStore.getState().taskTemplates
  },

  create(input: CreateTaskTemplateInput): CWTaskTemplate {
    return cwStore.getState().createTaskTemplate(input)
  },

  update(templateId: string, input: UpdateTaskTemplateInput) {
    cwStore.getState().updateTaskTemplate(templateId, input)
  },

  setStatus(templateId: string, status: CWTaskTemplateStatus) {
    cwStore.getState().setTaskTemplateStatus(templateId, status)
  },

  addField(templateId: string, input: CreateTaskFieldInput): CWTaskField {
    return cwStore.getState().addTaskField(templateId, input)
  },

  updateField(templateId: string, fieldId: string, input: UpdateTaskFieldInput) {
    cwStore.getState().updateTaskField(templateId, fieldId, input)
  },

  removeField(templateId: string, fieldId: string) {
    cwStore.getState().removeTaskField(templateId, fieldId)
  },

  moveField(templateId: string, fieldId: string, direction: 'up' | 'down') {
    cwStore.getState().moveTaskField(templateId, fieldId, direction)
  },
}
