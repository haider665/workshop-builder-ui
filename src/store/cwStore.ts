import { create } from 'zustand'
import type {
  CWBay,
  CWBayStatus,
  CWRole,
  CWRoleStatus,
  CWShop,
  CWShopStatus,
  CWShopType,
  CWTaskField,
  CWTaskFieldType,
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

type CWState = {
  shops: CWShop[]
  bays: CWBay[]
  roles: CWRole[]
  users: CWUser[]
  taskTemplates: CWTaskTemplate[]

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
  const systemNames = ['Admin', 'Guard', 'Job Controller']
  return systemNames.map((name) => ({
    id: newId(),
    name,
    status: 'Active',
    isSystem: true,
    createdAt: ts,
    updatedAt: ts,
  }))
}

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
  shops: [],
  bays: [],
  roles: seedSystemRoles(),
  users: [],
  taskTemplates: [],

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
}))

// Non-hook access for service-layer functions.
export const cwStore = {
  getState: useCwStore.getState,
  setState: useCwStore.setState,
}
