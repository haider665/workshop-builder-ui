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
  /** ID of the appointment concern this task was created from (JC decomposition) */
  sourceConcernId?: string
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

export type CWCustomerStatus = 'Active' | 'Inactive'

export type CWCustomer = {
  id: string
  fullName: string
  phone: string
  email?: string
  status: CWCustomerStatus
  createdAt: string
  updatedAt: string
}

export type CWVehicleStatus = 'Active' | 'Inactive'

export type CWVehicle = {
  id: string
  customerId: string
  registrationNo: string
  make?: string
  model?: string
  vin?: string
  odometerKm?: number
  status: CWVehicleStatus
  createdAt: string
  updatedAt: string
}

export type CWPendingVehicleStatus = 'Pending' | 'Job Created'

export type CWPendingVehicle = {
  id: string
  registrationNo: string
  customerId?: string
  vehicleId?: string
  appointmentId?: string
  isTemporary?: boolean
  status: CWPendingVehicleStatus
  arrivedAt: string
  updatedAt: string
}

// ─── Concerns (Admin-managed) ────────────────────────────────────────────────

export type CWConcernCategoryStatus = 'Active' | 'Inactive'

export type CWConcernCategory = {
  id: string
  name: string
  status: CWConcernCategoryStatus
  createdAt: string
  updatedAt: string
}

export type CWConcernStatus = 'Active' | 'Inactive'

export type CWConcern = {
  id: string
  categoryId: string
  name: string
  status: CWConcernStatus
  createdAt: string
  updatedAt: string
}

// ─── Services (Admin-managed, seeded from CSV) ────────────────────────────────

export type CWServiceStatus = 'Active' | 'Inactive'

export type CWService = {
  id: string
  code: string
  category: string
  description: string
  timeHrs: number
  ratePerHr: number
  price: number
  status: CWServiceStatus
  createdAt: string
  updatedAt: string
}

// ─── Per-technician assignment with timer ──────────────────────────────────────

export type CWTechnicianAssignmentStatus = 'Assigned' | 'In Progress' | 'Paused' | 'Completed'

export type CWTechnicianAssignment = {
  id: string
  technicianUserId: string
  status: CWTechnicianAssignmentStatus
  startedAt?: string
  pausedAt?: string
  completedAt?: string
  totalPausedMs: number
  notes?: string
}

// ─── Appointment concern / service line items ─────────────────────────────────

export type CWConcernWorkStatus = 'Pending' | 'In Progress' | 'Completed'

export type CWAppointmentConcernItem = {
  id: string
  concernId: string
  concernName: string
  remark: string
  // JC assigns SE + bay:
  assignedSEUserId?: string
  bayId?: string
  plannedStartAt?: string
  plannedEndAt?: string
  // SE assigns technicians:
  technicianAssignments: CWTechnicianAssignment[]
  workStatus?: CWConcernWorkStatus
}

export type CWServiceWorkStatus = 'Pending' | 'In Progress' | 'Completed'

export type CWAppointmentServiceItem = {
  id: string
  serviceId: string
  serviceCode: string
  serviceDescription: string
  timeHrs: number
  ratePerHr: number
  price: number
  remark: string
  addedBySA: boolean
  // JC assigns SE + bay:
  assignedSEUserId?: string
  bayId?: string
  // SE assigns technicians:
  technicianAssignments: CWTechnicianAssignment[]
  workStatus?: CWServiceWorkStatus
  plannedStartAt?: string
  plannedEndAt?: string
}

export type CWWhatsappLog = {
  id: string
  sentAt: string
  direction: 'outbound' | 'inbound'
  authorName: string
  message: string
}

// ─── Inspection checklist ─────────────────────────────────────────────────────

export type CWInspectionCheck = {
  id: string
  label: string
  checked: boolean
  note?: string
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type CWTimelineEvent = {
  id: string
  timestamp: string
  actor: string
  action: string
  details?: string
}

// ─── 16-status workflow ───────────────────────────────────────────────────────

export type CWAppointmentStatus =
  | 'New'
  | 'SA Inspection'
  | 'SA Reviewed'
  | 'Customer Notified'
  | 'Customer Approved'
  | 'Customer Rejected'
  | 'Diagnosis Assigned'
  | 'Diagnosis In Progress'
  | 'Diagnosis Complete'
  | 'Service Approval Pending'
  | 'Service Approved'
  | 'Service Assigned'
  | 'Service In Progress'
  | 'Service Complete'
  | 'Payment Pending'
  | 'Payment Done'
  | 'Released'

export type CWAppointment = {
  id: string
  customerId: string
  vehicleId: string
  /** Legacy free-text concerns (kept for backward compat) */
  concerns: string
  notes: string
  slotDate?: string
  slotTime?: string
  scheduledAt?: string
  status: CWAppointmentStatus
  // CRO assigns SA
  assignedSAUserId?: string
  // SA inspection
  inspectionChecks: CWInspectionCheck[]
  // Structured concern/service items
  concernItems: CWAppointmentConcernItem[]
  serviceItems: CWAppointmentServiceItem[]
  // Customer approval (used for both approval rounds)
  customerApprovalStatus: 'Pending' | 'Approved' | 'Rejected'
  customerApprovalNote?: string
  whatsappLogs: CWWhatsappLog[]
  // Workflow timeline
  timeline: CWTimelineEvent[]
  // Gate entry link
  gateEntryId?: string
  // Payment & release
  paymentStatus: 'Pending' | 'Done'
  gatePassIssuedAt?: string
  releasedAt?: string
  createdAt: string
  updatedAt: string
}

export type CWJobStatus = 'Active' | 'Test Drive Approved' | 'Job Finished'

export type CWJob = {
  id: string
  registrationNo: string
  pendingVehicleId?: string
  appointmentId?: string
  shopIds: string[]
  taskIds: string[]
  status: CWJobStatus
  testDriveDriverName?: string
  testDriveDriverNid?: string
  testDriveExpectedReturnAt?: string
  createdAt: string
  updatedAt: string
}
