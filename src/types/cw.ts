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

export type CWF1Config = {
  returnWindowDays: number
  updatedAt: string
}

export type CWTaskStatus = 'Assigned' | 'In Progress' | 'Pending' | 'Completed'

export type CWTaskFieldValue = string | number | boolean | string[] | null

export type CWTask = {
  id: string
  shopId: string
  bayId?: string
  registrationNo?: string
  templateId: string
  templateName: string
  title: string
  assignedToName: string
  assignedToNames?: string[]
  assignedRoleId?: string
  status: CWTaskStatus
  pendingReason?: string
  plannedStartAt?: string
  plannedEndAt?: string
  dependsOnTaskIds?: string[]
  dependencyOverrideReason?: string
  fields: CWTaskField[]
  createdAt: string
  updatedAt: string
}

export type CWTaskComment = {
  id: string
  taskId: string
  authorName: string
  message: string
  createdAt: string
}

export type CWTaskAttachment = {
  id: string
  taskId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type CWPendingVehicleStatus = 'Pending' | 'Job Created'

export type CWPendingVehicle = {
  id: string
  registrationNo: string
  status: CWPendingVehicleStatus
  arrivedAt: string
  updatedAt: string
}

export type CWJobStatus = 'Active' | 'Test Drive Approved' | 'Job Finished'

export type CWJob = {
  id: string
  registrationNo: string
  shopIds: string[]
  taskIds: string[]
  status: CWJobStatus
  createdAt: string
  updatedAt: string
}
