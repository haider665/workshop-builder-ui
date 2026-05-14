import { create } from 'zustand'
import type {
  CWF1Config,
  CWBay,
  CWBayStatus,
  CWJob,
  CWJobStatus,
  CWPendingVehicle,
  CWPendingVehicleStatus,
  CWRole,
  CWRoleStatus,
  CWShop,
  CWShopStatus,
  CWShopType,
  CWTask,
  CWTaskAttachment,
  CWTaskComment,
  CWTaskField,
  CWTaskFieldType,
  CWTaskFieldValue,
  CWTaskStatus,
  CWTaskTemplate,
  CWTaskTemplateStatus,
  CWUser,
  CWUserStatus,
} from '../types/cw'

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export type CreateShopInput = {
  name: string
  type: CWShopType
  description?: string
  status?: CWShopStatus
}

export type UpdateShopInput = {
  name: string
  type: CWShopType
  description: string
}

export type CreateBayInput = {
  shopId: string
  name: string
  status?: CWBayStatus
}

export type UpdateBayInput = {
  name: string
  status: CWBayStatus
}

export type CreateRoleInput = {
  name: string
  status?: CWRoleStatus
}

export type UpdateRoleInput = {
  name: string
}

export type CreateUserInput = {
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status?: CWUserStatus
  password?: string
}

export type UpdateUserInput = {
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: CWUserStatus
  password?: string
}

export type CreateTaskTemplateInput = {
  shopId: string
  name: string
  description?: string
  status?: CWTaskTemplateStatus
}

export type UpdateTaskTemplateInput = {
  shopId: string
  name: string
  description: string
  status: CWTaskTemplateStatus
}

export type CreateTaskFieldInput = {
  label: string
  type: CWTaskFieldType
  required: boolean
  options?: string[]
}

export type UpdateTaskFieldInput = {
  label: string
  type: CWTaskFieldType
  required: boolean
  options?: string[]
}

export type CreateTaskFromTemplateInput = {
  templateId: string
  assignedToName: string
  assignedToNames?: string[]
  assignedRoleId?: string
  dependsOnTaskIds?: string[]
  title?: string
  registrationNo?: string
  bayId?: string
  plannedStartAt?: string
  plannedEndAt?: string
}

export type SetTaskStatusInput = {
  status: CWTaskStatus
  pendingReason?: string
}

export type CreatePendingVehicleInput = {
  registrationNo: string
}

export type CreateJobInput = {
  registrationNo: string
  pendingVehicleId?: string
  shopId: string
  bayId?: string
  assignedToName: string
  plannedStartAt?: string
  templateIds: string[]
}

export type CreateJobTaskInput = {
  templateId: string
  plannedStartAt: string
  plannedEndAt: string
  bayId?: string
  assignedRoleId?: string
  assignedToNames: string[]
  dependsOnTaskIndexes?: number[]
}

export type CreateJobWithTasksInput = {
  registrationNo: string
  pendingVehicleId?: string
  tasks: CreateJobTaskInput[]
}

type CWState = {
  shops: CWShop[]
  bays: CWBay[]
  roles: CWRole[]
  users: CWUser[]
  taskTemplates: CWTaskTemplate[]
  f1Config: CWF1Config

  tasks: CWTask[]
  taskFieldValues: Record<string, Record<string, CWTaskFieldValue>>
  taskComments: CWTaskComment[]
  taskAttachments: CWTaskAttachment[]

  pendingVehicles: CWPendingVehicle[]
  jobs: CWJob[]

  createShop: (input: CreateShopInput) => CWShop
  updateShop: (shopId: string, input: UpdateShopInput) => void
  setShopStatus: (shopId: string, status: CWShopStatus) => void

  createBay: (input: CreateBayInput) => CWBay
  updateBay: (bayId: string, input: UpdateBayInput) => void
  setBayStatus: (bayId: string, status: CWBayStatus) => void

  createRole: (input: CreateRoleInput) => CWRole
  updateRole: (roleId: string, input: UpdateRoleInput) => void
  setRoleStatus: (roleId: string, status: CWRoleStatus) => void

  createUser: (input: CreateUserInput) => CWUser
  updateUser: (userId: string, input: UpdateUserInput) => void
  setUserStatus: (userId: string, status: CWUserStatus) => void

  createTaskTemplate: (input: CreateTaskTemplateInput) => CWTaskTemplate
  updateTaskTemplate: (templateId: string, input: UpdateTaskTemplateInput) => void
  setTaskTemplateStatus: (templateId: string, status: CWTaskTemplateStatus) => void

  addTaskField: (templateId: string, input: CreateTaskFieldInput) => CWTaskField
  updateTaskField: (templateId: string, fieldId: string, input: UpdateTaskFieldInput) => void
  removeTaskField: (templateId: string, fieldId: string) => void
  moveTaskField: (templateId: string, fieldId: string, direction: 'up' | 'down') => void

  setF1ReturnWindowDays: (days: number) => void

  createTaskFromTemplate: (input: CreateTaskFromTemplateInput) => CWTask
  setTaskStatus: (taskId: string, input: SetTaskStatusInput) => void
  setTaskFieldValue: (taskId: string, fieldId: string, value: CWTaskFieldValue) => void
  addTaskComment: (taskId: string, authorName: string, message: string) => CWTaskComment
  addTaskAttachment: (taskId: string, file: File) => CWTaskAttachment
  setTaskDependencyOverride: (taskId: string, reason: string | null) => void

  createPendingVehicle: (input: CreatePendingVehicleInput) => CWPendingVehicle
  setPendingVehicleStatus: (pendingVehicleId: string, status: CWPendingVehicleStatus) => void
  createJob: (input: CreateJobInput) => CWJob
  createJobWithTasks: (input: CreateJobWithTasksInput) => CWJob
  setJobStatus: (jobId: string, status: CWJobStatus) => void
  moveJobTask: (jobId: string, taskId: string, direction: 'up' | 'down') => void
}

function normalizeRoleName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function hasRoleName(roles: CWRole[], name: string, exceptId?: string) {
  const normalized = normalizeRoleName(name).toLowerCase()
  return roles.some((r) => r.id !== exceptId && r.name.toLowerCase() === normalized)
}

function seedSystemRoles(): CWRole[] {
  const ts = nowIso()
  const systemNames = ['Admin', 'Guard', 'Job Creation']
  return systemNames.map((name) => ({
    id: newId(),
    name,
    status: 'Active',
    isSystem: true,
    createdAt: ts,
    updatedAt: ts,
  }))
}

function seedDemoData() {
  const ts = nowIso()

  const shops: CWShop[] = [
    {
      id: newId(),
      name: 'Auto Shop',
      type: 'Auto',
      description: 'Mechanical service tasks.',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      name: 'Paint Shop',
      type: 'Paint',
      description: 'Paint prep and finishing.',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      name: 'Body Shop',
      type: 'Body',
      description: 'Body repair tasks.',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const byShopName = new Map(shops.map((s) => [s.name, s] as const))
  const autoShop = byShopName.get('Auto Shop')!
  const paintShop = byShopName.get('Paint Shop')!
  const bodyShop = byShopName.get('Body Shop')!

  const bays: CWBay[] = [
    { id: newId(), shopId: autoShop.id, name: 'A-01', status: 'Available', createdAt: ts, updatedAt: ts },
    { id: newId(), shopId: autoShop.id, name: 'A-02', status: 'Available', createdAt: ts, updatedAt: ts },
    { id: newId(), shopId: paintShop.id, name: 'P-01', status: 'Available', createdAt: ts, updatedAt: ts },
    { id: newId(), shopId: paintShop.id, name: 'P-02', status: 'Available', createdAt: ts, updatedAt: ts },
    { id: newId(), shopId: bodyShop.id, name: 'B-01', status: 'Available', createdAt: ts, updatedAt: ts },
    { id: newId(), shopId: bodyShop.id, name: 'B-02', status: 'Available', createdAt: ts, updatedAt: ts },
  ]

  const roles: CWRole[] = [
    ...seedSystemRoles(),
    { id: newId(), name: 'Technician', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'SA', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'CRE', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
  ]

  const roleByName = new Map(roles.map((r) => [r.name, r] as const))
  const techRole = roleByName.get('Technician')!
  const saRole = roleByName.get('SA')!
  const creRole = roleByName.get('CRE')!

  const users: CWUser[] = [
    {
      id: newId(),
      fullName: 'Demo User',
      email: 'demo.user@cw.local',
      mobile: '0000000000',
      roleIds: [techRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Demo SA',
      email: 'demo.sa@cw.local',
      mobile: '0000000001',
      roleIds: [saRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Demo CRE',
      email: 'demo.cre@cw.local',
      mobile: '0000000002',
      roleIds: [creRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  function threeDefaultFields(): CWTaskField[] {
    return [
      {
        id: newId(),
        label: 'Checklist complete',
        type: 'Checkbox',
        required: true,
        order: 1,
      },
      {
        id: newId(),
        label: 'Remarks',
        type: 'Text Area',
        required: false,
        order: 2,
      },
      {
        id: newId(),
        label: 'QC result',
        type: 'Dropdown',
        required: true,
        options: ['Pass', 'Fail'],
        order: 3,
      },
    ]
  }

  const taskTemplates: CWTaskTemplate[] = [
    {
      id: newId(),
      shopId: autoShop.id,
      name: 'Oil Change',
      description: 'Basic oil + filter service.',
      status: 'Active',
      fields: threeDefaultFields(),
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: paintShop.id,
      name: 'Paint Prep',
      description: 'Masking, sanding, prep checks.',
      status: 'Active',
      fields: threeDefaultFields(),
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: bodyShop.id,
      name: 'Dent Repair',
      description: 'Panel inspection + repair.',
      status: 'Active',
      fields: threeDefaultFields(),
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const tplByName = new Map(taskTemplates.map((t) => [t.name, t] as const))

  function snapshotFields(template: CWTaskTemplate) {
    return template.fields.map((f) => ({
      ...f,
      options: f.options ? [...f.options] : undefined,
    }))
  }

  const reg1 = 'CWA-1001'
  const reg2 = 'CWP-2002'

  const oil = tplByName.get('Oil Change')!
  const prep = tplByName.get('Paint Prep')!
  const dent = tplByName.get('Dent Repair')!

  const start1 = ts
  const end1 = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const start2 = new Date(Date.now() + 90 * 60 * 1000).toISOString()
  const end2 = new Date(Date.now() + 150 * 60 * 1000).toISOString()

  const task1: CWTask = {
    id: newId(),
    shopId: oil.shopId,
    bayId: bays.find((b) => b.shopId === oil.shopId)?.id,
    registrationNo: reg1,
    templateId: oil.id,
    templateName: oil.name,
    title: oil.name,
    assignedToName: 'Demo User',
    assignedToNames: ['Demo User'],
    assignedRoleId: techRole.id,
    status: 'In Progress',
    fields: snapshotFields(oil),
    plannedStartAt: start1,
    plannedEndAt: end1,
    dependsOnTaskIds: [],
    createdAt: ts,
    updatedAt: ts,
  }

  const task2: CWTask = {
    id: newId(),
    shopId: prep.shopId,
    bayId: bays.find((b) => b.shopId === prep.shopId)?.id,
    registrationNo: reg2,
    templateId: prep.id,
    templateName: prep.name,
    title: prep.name,
    assignedToName: 'Demo User',
    assignedToNames: ['Demo User'],
    assignedRoleId: techRole.id,
    status: 'Assigned',
    fields: snapshotFields(prep),
    plannedStartAt: start2,
    plannedEndAt: end2,
    dependsOnTaskIds: [],
    createdAt: ts,
    updatedAt: ts,
  }

  const task3: CWTask = {
    id: newId(),
    shopId: dent.shopId,
    bayId: bays.find((b) => b.shopId === dent.shopId)?.id,
    registrationNo: reg1,
    templateId: dent.id,
    templateName: dent.name,
    title: dent.name,
    assignedToName: 'Demo User',
    assignedToNames: ['Demo User'],
    assignedRoleId: techRole.id,
    status: 'Assigned',
    fields: snapshotFields(dent),
    plannedStartAt: start2,
    plannedEndAt: end2,
    dependsOnTaskIds: [task1.id],
    createdAt: ts,
    updatedAt: ts,
  }

  const tasks: CWTask[] = [task3, task2, task1]

  const taskFieldValues: Record<string, Record<string, CWTaskFieldValue>> = {}
  for (const t of tasks) taskFieldValues[t.id] = {}

  return {
    shops,
    bays,
    roles,
    users,
    taskTemplates,
    tasks,
    taskFieldValues,
  }
}

const DEMO_SEED = seedDemoData()

function normalizeOptions(options?: string[]) {
  if (!options) return undefined
  const cleaned = options
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => o.replace(/\s+/g, ' '))
  const uniq = [...new Set(cleaned)]
  return uniq.length ? uniq : undefined
}

function nextFieldOrder(fields: CWTaskField[]) {
  return fields.length ? Math.max(...fields.map((f) => f.order)) + 1 : 1
}

function reindexFields(fields: CWTaskField[]) {
  return fields
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((f, idx) => ({ ...f, order: idx + 1 }))
}

// MVP rule: in-memory only. No persistence.
export const useCwStore = create<CWState>((set, get) => ({
  ...DEMO_SEED,
  f1Config: {
    returnWindowDays: 7,
    updatedAt: nowIso(),
  },
  taskComments: [],
  taskAttachments: [],

  pendingVehicles: [],
  jobs: [],

  createShop: (input) => {
    const ts = nowIso()
    const shop: CWShop = {
      id: newId(),
      name: input.name.trim(),
      type: input.type,
      description: (input.description ?? '').trim(),
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ shops: [shop, ...get().shops] })
    return shop
  },

  updateShop: (shopId, input) => {
    set({
      shops: get().shops.map((s) =>
        s.id === shopId
          ? {
              ...s,
              name: input.name.trim(),
              type: input.type,
              description: input.description.trim(),
              updatedAt: nowIso(),
            }
          : s,
      ),
    })
  },

  setShopStatus: (shopId, status) => {
    set({
      shops: get().shops.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status,
              updatedAt: nowIso(),
            }
          : s,
      ),
    })
  },

  createBay: (input) => {
    const ts = nowIso()
    const bay: CWBay = {
      id: newId(),
      shopId: input.shopId,
      name: input.name.trim(),
      status: input.status ?? 'Available',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ bays: [bay, ...get().bays] })
    return bay
  },

  updateBay: (bayId, input) => {
    set({
      bays: get().bays.map((b) =>
        b.id === bayId
          ? {
              ...b,
              name: input.name.trim(),
              status: input.status,
              updatedAt: nowIso(),
            }
          : b,
      ),
    })
  },

  setBayStatus: (bayId, status) => {
    set({
      bays: get().bays.map((b) =>
        b.id === bayId
          ? {
              ...b,
              status,
              updatedAt: nowIso(),
            }
          : b,
      ),
    })
  },

  createRole: (input) => {
    const name = normalizeRoleName(input.name)
    if (!name) throw new Error('Role name is required')
    if (hasRoleName(get().roles, name)) throw new Error('Role name already exists')

    const ts = nowIso()
    const role: CWRole = {
      id: newId(),
      name,
      status: input.status ?? 'Active',
      isSystem: false,
      createdAt: ts,
      updatedAt: ts,
    }

    set({ roles: [role, ...get().roles] })
    return role
  },

  updateRole: (roleId, input) => {
    const current = get().roles.find((r) => r.id === roleId)
    if (!current) return
    if (current.isSystem) return
    const name = normalizeRoleName(input.name)
    if (!name) throw new Error('Role name is required')
    if (hasRoleName(get().roles, name, roleId)) throw new Error('Role name already exists')

    set({
      roles: get().roles.map((r) =>
        r.id === roleId
          ? {
              ...r,
              name,
              updatedAt: nowIso(),
            }
          : r,
      ),
    })
  },

  setRoleStatus: (roleId, status) => {
    const role = get().roles.find((r) => r.id === roleId)
    if (!role) return
    if (role.isSystem) return

    set({
      roles: get().roles.map((r) =>
        r.id === roleId
          ? {
              ...r,
              status,
              updatedAt: nowIso(),
            }
          : r,
      ),
    })
  },

  createUser: (input) => {
    const fullName = input.fullName.trim()
    const email = input.email.trim()
    const mobile = input.mobile.trim()
    if (!fullName) throw new Error('Full name is required')
    if (!email) throw new Error('Email is required')
    if (!mobile) throw new Error('Mobile is required')
    if (!input.roleIds.length) throw new Error('Select at least one role')
    if (!input.shopIds.length) throw new Error('Select at least one shop')

    const ts = nowIso()
    const user: CWUser = {
      id: newId(),
      fullName,
      email,
      mobile,
      roleIds: [...new Set(input.roleIds)],
      shopIds: [...new Set(input.shopIds)],
      status: input.status ?? 'Active',
      password: input.password,
      createdAt: ts,
      updatedAt: ts,
    }

    set({ users: [user, ...get().users] })
    return user
  },

  updateUser: (userId, input) => {
    set({
      users: get().users.map((u) =>
        u.id === userId
          ? {
              ...u,
              fullName: input.fullName.trim(),
              email: input.email.trim(),
              mobile: input.mobile.trim(),
              roleIds: [...new Set(input.roleIds)],
              shopIds: [...new Set(input.shopIds)],
              status: input.status,
              password: input.password,
              updatedAt: nowIso(),
            }
          : u,
      ),
    })
  },

  setUserStatus: (userId, status) => {
    set({
      users: get().users.map((u) =>
        u.id === userId
          ? {
              ...u,
              status,
              updatedAt: nowIso(),
            }
          : u,
      ),
    })
  },

  createTaskTemplate: (input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Template name is required')
    if (!input.shopId) throw new Error('Shop is required')

    const ts = nowIso()
    const template: CWTaskTemplate = {
      id: newId(),
      shopId: input.shopId,
      name,
      description: (input.description ?? '').trim(),
      status: input.status ?? 'Active',
      fields: [],
      createdAt: ts,
      updatedAt: ts,
    }

    set({ taskTemplates: [template, ...get().taskTemplates] })
    return template
  },

  updateTaskTemplate: (templateId, input) => {
    if (!input.shopId) throw new Error('Shop is required')
    const name = input.name.trim()
    if (!name) throw new Error('Template name is required')

    set({
      taskTemplates: get().taskTemplates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              shopId: input.shopId,
              name,
              description: input.description.trim(),
              status: input.status,
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  setTaskTemplateStatus: (templateId, status) => {
    set({
      taskTemplates: get().taskTemplates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              status,
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  addTaskField: (templateId, input) => {
    const label = input.label.trim()
    if (!label) throw new Error('Field label is required')
    const options = normalizeOptions(input.options)
    const needsOptions =
      input.type === 'Checkbox Group' ||
      input.type === 'Radio Button Group' ||
      input.type === 'Dropdown'
    if (needsOptions && (!options || !options.length)) {
      throw new Error('Options are required for this field type')
    }

    const template = get().taskTemplates.find((t) => t.id === templateId)
    if (!template) throw new Error('Template not found')

    const ts = nowIso()
    const field: CWTaskField = {
      id: newId(),
      label,
      type: input.type,
      required: input.required,
      options,
      order: nextFieldOrder(template.fields),
    }

    set({
      taskTemplates: get().taskTemplates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              fields: reindexFields([...t.fields, field]),
              updatedAt: ts,
            }
          : t,
      ),
    })

    return field
  },

  updateTaskField: (templateId, fieldId, input) => {
    const label = input.label.trim()
    if (!label) throw new Error('Field label is required')
    const options = normalizeOptions(input.options)
    const needsOptions =
      input.type === 'Checkbox Group' ||
      input.type === 'Radio Button Group' ||
      input.type === 'Dropdown'
    if (needsOptions && (!options || !options.length)) {
      throw new Error('Options are required for this field type')
    }

    set({
      taskTemplates: get().taskTemplates.map((t) => {
        if (t.id !== templateId) return t
        const nextFields = t.fields.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                label,
                type: input.type,
                required: input.required,
                options,
              }
            : f,
        )
        return { ...t, fields: reindexFields(nextFields), updatedAt: nowIso() }
      }),
    })
  },

  removeTaskField: (templateId, fieldId) => {
    set({
      taskTemplates: get().taskTemplates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              fields: reindexFields(t.fields.filter((f) => f.id !== fieldId)),
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  moveTaskField: (templateId, fieldId, direction) => {
    const template = get().taskTemplates.find((t) => t.id === templateId)
    if (!template) return
    const sorted = template.fields.slice().sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((f) => f.id === fieldId)
    if (idx < 0) return

    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= sorted.length) return

    const next = sorted.slice()
    const tmp = next[idx]!
    next[idx] = next[swapWith]!
    next[swapWith] = tmp

    const reindexed = reindexFields(next)
    set({
      taskTemplates: get().taskTemplates.map((t) =>
        t.id === templateId
          ? { ...t, fields: reindexed, updatedAt: nowIso() }
          : t,
      ),
    })
  },

  setF1ReturnWindowDays: (days) => {
    if (!Number.isFinite(days)) throw new Error('Return window must be a number')
    const value = Math.trunc(days)
    if (value < 1 || value > 365) {
      throw new Error('Return window must be between 1 and 365 days')
    }

    set({
      f1Config: {
        returnWindowDays: value,
        updatedAt: nowIso(),
      },
    })
  },

  createTaskFromTemplate: (input) => {
    const template = get().taskTemplates.find((t) => t.id === input.templateId)
    if (!template) throw new Error('Task template not found')
    if (!template.shopId) throw new Error('Template shop is missing')

    const assignedToName = input.assignedToName.trim()
    if (!assignedToName) throw new Error('Assigned user name is required')
    const assignedToNames = (input.assignedToNames ?? [])
      .map((n) => n.trim())
      .filter(Boolean)
    const normalizedAssignees = assignedToNames.length
      ? [...new Set(assignedToNames)]
      : [assignedToName]

    const ts = nowIso()
    const start = input.plannedStartAt ?? ts
    const end =
      input.plannedEndAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const fieldsSnapshot = template.fields.map((f) => ({
      ...f,
      options: f.options ? [...f.options] : undefined,
    }))

    const task: CWTask = {
      id: newId(),
      shopId: template.shopId,
      bayId: input.bayId,
      registrationNo: input.registrationNo?.trim() || undefined,
      templateId: template.id,
      templateName: template.name,
      title: (input.title ?? template.name).trim() || template.name,
      assignedToName,
      assignedToNames: normalizedAssignees,
      assignedRoleId: input.assignedRoleId,
      status: 'Assigned',
      fields: fieldsSnapshot,
      plannedStartAt: start,
      plannedEndAt: end,
      dependsOnTaskIds: input.dependsOnTaskIds?.slice() ?? [],
      createdAt: ts,
      updatedAt: ts,
    }

    set({
      tasks: [task, ...get().tasks],
      taskFieldValues: {
        ...get().taskFieldValues,
        [task.id]: {},
      },
    })

    return task
  },

  setTaskStatus: (taskId, input) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    const next = input.status
    const current = task.status

    const allowed: Record<CWTaskStatus, CWTaskStatus[]> = {
      Assigned: ['In Progress'],
      'In Progress': ['Pending', 'Completed'],
      Pending: ['In Progress'],
      Completed: [],
    }

    if (!allowed[current].includes(next)) {
      throw new Error(`Invalid transition: ${current} → ${next}`)
    }

    const dependencyIds = task.dependsOnTaskIds ?? []
    const hasIncompleteDependency = dependencyIds.some((id) => {
      const dep = get().tasks.find((t) => t.id === id)
      if (!dep) return false
      return dep.status !== 'Completed'
    })
    if ((next === 'In Progress' || next === 'Completed') && hasIncompleteDependency) {
      if (!task.dependencyOverrideReason) {
        throw new Error('Task is blocked by dependencies')
      }
    }

    const pendingReason = (input.pendingReason ?? '').trim()
    if (next === 'Pending' && !pendingReason) {
      throw new Error('Pending reason is required')
    }

    set({
      tasks: get().tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: next,
              pendingReason: next === 'Pending' ? pendingReason : undefined,
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  setTaskDependencyOverride: (taskId, reason) => {
    const normalized = (reason ?? '').trim()
    set({
      tasks: get().tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              dependencyOverrideReason: normalized || undefined,
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  setTaskFieldValue: (taskId, fieldId, value) => {
    const existing = get().taskFieldValues[taskId] ?? {}
    set({
      taskFieldValues: {
        ...get().taskFieldValues,
        [taskId]: {
          ...existing,
          [fieldId]: value,
        },
      },
      tasks: get().tasks.map((t) =>
        t.id === taskId ? { ...t, updatedAt: nowIso() } : t,
      ),
    })
  },

  addTaskComment: (taskId, authorName, message) => {
    const msg = message.trim()
    const author = authorName.trim()
    if (!msg) throw new Error('Comment message is required')
    if (!author) throw new Error('Author is required')
    const ts = nowIso()
    const comment: CWTaskComment = {
      id: newId(),
      taskId,
      authorName: author,
      message: msg,
      createdAt: ts,
    }

    set({
      taskComments: [...get().taskComments, comment],
      tasks: get().tasks.map((t) =>
        t.id === taskId ? { ...t, updatedAt: ts } : t,
      ),
    })
    return comment
  },

  addTaskAttachment: (taskId, file) => {
    const ts = nowIso()
    const attachment: CWTaskAttachment = {
      id: newId(),
      taskId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      createdAt: ts,
    }

    set({
      taskAttachments: [...get().taskAttachments, attachment],
      tasks: get().tasks.map((t) =>
        t.id === taskId ? { ...t, updatedAt: ts } : t,
      ),
    })
    return attachment
  },

  createPendingVehicle: (input) => {
    const registrationNo = input.registrationNo.trim()
    if (!registrationNo) throw new Error('Registration no is required')

    const ts = nowIso()
    const pending: CWPendingVehicle = {
      id: newId(),
      registrationNo,
      status: 'Pending',
      arrivedAt: ts,
      updatedAt: ts,
    }
    set({ pendingVehicles: [pending, ...get().pendingVehicles] })
    return pending
  },

  setPendingVehicleStatus: (pendingVehicleId, status) => {
    set({
      pendingVehicles: get().pendingVehicles.map((p) =>
        p.id === pendingVehicleId
          ? {
              ...p,
              status,
              updatedAt: nowIso(),
            }
          : p,
      ),
    })
  },

  createJob: (input) => {
    const registrationNo = input.registrationNo.trim()
    if (!registrationNo) throw new Error('Registration no is required')
    if (!input.shopId) throw new Error('Shop is required')
    if (!input.templateIds.length) throw new Error('Select at least one task template')

    const assignedToName = input.assignedToName.trim()
    if (!assignedToName) throw new Error('Assigned user name is required')

    const shop = get().shops.find((s) => s.id === input.shopId)
    if (!shop) throw new Error('Shop not found')

    const templates = input.templateIds.map((id) => {
      const t = get().taskTemplates.find((x) => x.id === id)
      if (!t) throw new Error('Task template not found')
      if (t.shopId !== input.shopId) throw new Error('Template does not belong to selected shop')
      return t
    })

    const ts = nowIso()
    const baseStart = input.plannedStartAt ? new Date(input.plannedStartAt) : new Date()
    const taskIds: string[] = []

    for (let i = 0; i < templates.length; i++) {
      const start = new Date(baseStart.getTime() + i * 60 * 60 * 1000)
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      const task = get().createTaskFromTemplate({
        templateId: templates[i]!.id,
        assignedToName,
        registrationNo,
        bayId: input.bayId,
        plannedStartAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
        title: templates[i]!.name,
      })
      taskIds.push(task.id)
    }

    const job: CWJob = {
      id: newId(),
      registrationNo,
      shopIds: [shop.id],
      taskIds,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({
      jobs: [job, ...get().jobs],
      pendingVehicles: input.pendingVehicleId
        ? get().pendingVehicles.map((p) =>
            p.id === input.pendingVehicleId
              ? { ...p, status: 'Job Created', updatedAt: nowIso() }
              : p,
          )
        : get().pendingVehicles,
    })

    return job
  },

  createJobWithTasks: (input) => {
    const registrationNo = input.registrationNo.trim()
    if (!registrationNo) throw new Error('Registration no is required')
    if (!input.tasks.length) throw new Error('Add at least one task')

    const createdTaskIds: string[] = []

    // Create tasks in the provided order.
    for (let idx = 0; idx < input.tasks.length; idx++) {
      const item = input.tasks[idx]!
      const template = get().taskTemplates.find((t) => t.id === item.templateId)
      if (!template) throw new Error('Task template not found')

      const dependsOnTaskIds = (item.dependsOnTaskIndexes ?? [])
        .map((i) => createdTaskIds[i])
        .filter(Boolean) as string[]

      const primaryAssignee = item.assignedToNames[0]?.trim() ?? ''
      if (!primaryAssignee) throw new Error('Each task must have at least one user')

      const task = get().createTaskFromTemplate({
        templateId: item.templateId,
        assignedToName: primaryAssignee,
        assignedToNames: item.assignedToNames,
        assignedRoleId: item.assignedRoleId,
        dependsOnTaskIds,
        registrationNo,
        bayId: item.bayId,
        plannedStartAt: item.plannedStartAt,
        plannedEndAt: item.plannedEndAt,
        title: template.name,
      })
      createdTaskIds.push(task.id)
    }

    const shopIds = [...new Set(createdTaskIds
      .map((taskId) => get().tasks.find((t) => t.id === taskId)?.shopId)
      .filter(Boolean) as string[])]

    const ts = nowIso()
    const job: CWJob = {
      id: newId(),
      registrationNo,
      shopIds,
      taskIds: createdTaskIds,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({
      jobs: [job, ...get().jobs],
      pendingVehicles: input.pendingVehicleId
        ? get().pendingVehicles.map((p) =>
            p.id === input.pendingVehicleId
              ? { ...p, status: 'Job Created', updatedAt: nowIso() }
              : p,
          )
        : get().pendingVehicles,
    })

    return job
  },

  setJobStatus: (jobId, status) => {
    set({
      jobs: get().jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status,
              updatedAt: nowIso(),
            }
          : j,
      ),
    })
  },

  moveJobTask: (jobId, taskId, direction) => {
    const job = get().jobs.find((j) => j.id === jobId)
    if (!job) return

    const idx = job.taskIds.findIndex((id) => id === taskId)
    if (idx < 0) return

    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= job.taskIds.length) return

    const nextIds = job.taskIds.slice()
    const tmp = nextIds[idx]!
    nextIds[idx] = nextIds[swapWith]!
    nextIds[swapWith] = tmp

    set({
      jobs: get().jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              taskIds: nextIds,
              updatedAt: nowIso(),
            }
          : j,
      ),
    })
  },
}))

// Non-hook access for service-layer functions.
export const cwStore = {
  getState: useCwStore.getState,
  setState: useCwStore.setState,
}
