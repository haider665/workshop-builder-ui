export type CWShopType =
  | 'Auto'
  | 'Paint'
  | 'Body'
  | 'Quick Service'
  | 'Diagnostics'
  | 'Custom'

export type CWShopStatus = 'Active' | 'Inactive'

export type CWShop = {
  id: string
  name: string
  type: CWShopType
  description: string
  status: CWShopStatus
  createdAt: string
  updatedAt: string
}

export type CWBayStatus = 'Available' | 'Occupied' | 'Inactive'

export type CWBay = {
  id: string
  shopId: string
  name: string
  status: CWBayStatus
  createdAt: string
  updatedAt: string
}

export type CWRoleStatus = 'Active' | 'Inactive'

export type CWRole = {
  id: string
  name: string
  status: CWRoleStatus
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export type CWUserStatus = 'Active' | 'Inactive' | 'Suspended'

export type CWUser = {
  id: string
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: CWUserStatus
  password?: string
  createdAt: string
  updatedAt: string
}

export type CWTaskFieldType =
  | 'Text Input'
  | 'Text Area'
  | 'Number'
  | 'Checkbox'
  | 'Checkbox Group'
  | 'Radio Button Group'
  | 'Dropdown'
  | 'Date Picker'
  | 'Image Upload'
  | 'File Upload'

export type CWTaskField = {
  id: string
  label: string
  type: CWTaskFieldType
  required: boolean
  options?: string[]
  order: number
}

export type CWTaskTemplateStatus = 'Active' | 'Inactive'

export type CWTaskTemplate = {
  id: string
  shopId: string
  name: string
  description: string
  status: CWTaskTemplateStatus
  fields: CWTaskField[]
  createdAt: string
  updatedAt: string
}
