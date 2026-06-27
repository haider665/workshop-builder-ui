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
import { workshopApi } from '../workshopApi'

export const taskTemplatesService = {
  async list(params: {
    shopId?: string
    status?: CWTaskTemplateStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWTaskTemplate[]> {
    const response = await workshopApi.listTaskTemplates(params)
    return response.data
  },

  async create(input: CreateTaskTemplateInput): Promise<CWTaskTemplate> {
    return workshopApi.createTaskTemplate(input)
  },

  async update(templateId: string, input: UpdateTaskTemplateInput): Promise<CWTaskTemplate> {
    return workshopApi.updateTaskTemplate(templateId, input)
  },

  async setStatus(templateId: string, status: CWTaskTemplateStatus): Promise<CWTaskTemplate> {
    return workshopApi.setTaskTemplateStatus(templateId, status)
  },

  async addField(templateId: string, input: CreateTaskFieldInput): Promise<CWTaskField> {
    return workshopApi.addTaskTemplateField(templateId, input)
  },

  async updateField(templateId: string, fieldId: string, input: UpdateTaskFieldInput): Promise<CWTaskTemplate> {
    return workshopApi.updateTaskTemplateField(templateId, fieldId, input)
  },

  async removeField(templateId: string, fieldId: string): Promise<CWTaskTemplate> {
    return workshopApi.removeTaskTemplateField(templateId, fieldId)
  },

  async moveField(templateId: string, fieldId: string, direction: 'up' | 'down'): Promise<CWTaskTemplate> {
    return workshopApi.moveTaskTemplateField(templateId, fieldId, direction)
  },
}
