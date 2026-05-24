import { create } from 'zustand'
import type {
  CWF1Config,
  CWAppointment,
  CWAppointmentConcernItem,
  CWAppointmentServiceItem,
  CWAppointmentStatus,
  CWBay,
  CWBayStatus,
  CWConcern,
  CWConcernCategory,
  CWConcernCategoryStatus,
  CWConcernStatus,
  CWConcernWorkStatus,
  CWCustomer,
  CWCustomerStatus,
  CWCustomerType,
  CWAddress,
  CWOccupation,
  CWCorporateInfo,
  CWInspectionCheck,
  CWJob,
  CWJobStatus,
  CWPart,
  CWPartRequest,
  CWPartRequestStatus,
  CWPendingVehicle,
  CWPendingVehicleStatus,
  CWRole,
  CWRoleStatus,
  CWService,
  CWServiceStatus,
  CWServiceWorkStatus,
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
  CWTeam,
  CWTeamStatus,
  CWTimelineEvent,
  CWUser,
  CWUserStatus,
  CWVehicle,
  CWVehicleCategory,
  CWVehicleSize,
  CWVehicleStatus,
  CWWhatsappLog,
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

export type CreateCustomerInput = {
  fullName: string
  phone: string
  email?: string
  status?: CWCustomerStatus
  type?: CWCustomerType
  address?: CWAddress
  occupation?: CWOccupation
  whatsappLink?: string
  facebookLink?: string
  linkedinLink?: string
  googleLink?: string
  corporate?: CWCorporateInfo
  isSelfDriven?: boolean
  driverName?: string
  driverPhone?: string
  isPersonalUse?: boolean
}

export type UpdateCustomerInput = {
  fullName: string
  phone: string
  email?: string
  status: CWCustomerStatus
}

export type CreateVehicleInput = {
  customerId: string
  registrationNo: string
  make?: string
  model?: string
  vin?: string
  odometerKm?: number
  vehicleCategory?: CWVehicleCategory
  vehicleSize?: CWVehicleSize
  modelVariant?: string
  countryOfOrigin?: string
  countryOfAssembly?: string
  exteriorColor?: string
  exteriorColorCode?: string
  interiorColor?: string
  interiorColorCode?: string
  tyreSize?: string
  additionalNotes?: string
  status?: CWVehicleStatus
}

export type UpdateVehicleInput = {
  customerId: string
  registrationNo: string
  make?: string
  model?: string
  vin?: string
  odometerKm?: number
  vehicleCategory?: CWVehicleCategory
  vehicleSize?: CWVehicleSize
  modelVariant?: string
  countryOfOrigin?: string
  countryOfAssembly?: string
  exteriorColor?: string
  exteriorColorCode?: string
  interiorColor?: string
  interiorColorCode?: string
  tyreSize?: string
  additionalNotes?: string
  status: CWVehicleStatus
}

export type CreateAppointmentConcernItemInput = {
  concernId: string
  concernName: string
  processTimeMins?: number
  remark: string
}
export type CreateAppointmentServiceItemInput = {
  serviceId: string
  serviceCode: string
  serviceDescription: string
  processTimeMins: number
  ratePerHr: number
  price: number
  remark: string
  addedBySA?: boolean
}

export type CreateAppointmentInput = {
  customerId: string
  vehicleId: string
  slotDate?: string
  slotTime?: string
  scheduledAt?: string
  concerns?: string
  notes?: string
  status?: CWAppointmentStatus
  gateEntryId?: string
  assignedSAUserId?: string
  concernItems?: CreateAppointmentConcernItemInput[]
  serviceItems?: CreateAppointmentServiceItemInput[]
}

export type UpdateAppointmentInput = {
  customerId: string
  vehicleId: string
  slotDate?: string
  slotTime?: string
  scheduledAt?: string
  concerns: string
  notes: string
  status: CWAppointmentStatus
  gateEntryId?: string
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
  customerId?: string
  vehicleId?: string
  appointmentId?: string
  isTemporary?: boolean
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
  appointmentId?: string
  tasks: CreateJobTaskInput[]
}

export type SetJobTestDriveInput = {
  driverName: string
  driverNid: string
  expectedReturnAt?: string
}

// ─── Concerns ─────────────────────────────────────────────────────────────────

export type CreateConcernCategoryInput = { name: string; shopId: string }
export type UpdateConcernCategoryInput = { name: string; shopId: string; status: CWConcernCategoryStatus }
export type CreateConcernInput = { categoryId: string; name: string; processTimeMins?: number }
export type UpdateConcernInput = { name: string; status: CWConcernStatus }

// ─── Services ─────────────────────────────────────────────────────────────────

export type CreateServiceInput = {
  code: string
  category: string
  description: string
  processTimeMins: number
  ratePerHr: number
  price: number
  shopId: string
  status?: CWServiceStatus
}
export type UpdateServiceInput = {
  code: string
  category: string
  description: string
  processTimeMins: number
  ratePerHr: number
  price: number
  shopId: string
  status: CWServiceStatus
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export type CreateTeamInput = {
  name: string
  seUserId: string
  technicianUserIds: string[]
  status?: CWTeamStatus
}
export type UpdateTeamInput = {
  name: string
  seUserId: string
  technicianUserIds: string[]
  status: CWTeamStatus
}

// ─── Parts ────────────────────────────────────────────────────────────────────

export type CreatePartInput = {
  name: string
  partNumber?: string
  price?: number
  status?: 'Active' | 'Inactive'
}
export type UpdatePartInput = {
  name: string
  partNumber?: string
  price?: number
  status: 'Active' | 'Inactive'
}

export type CreatePartRequestInput = {
  appointmentId: string
  concernItemId?: string
  partName: string
  quantity?: number
  requestedBy: string
}
export type LabelPartRequestInput = {
  partNumber: string
  price: number
  quantity: number
  deliveryDate?: string
  labeledBy: string
  status?: CWPartRequestStatus
}

// ─── Appointment workflow ──────────────────────────────────────────────────────

export type AddAppointmentConcernInput = {
  appointmentId: string
  concernId: string
  concernName: string
  remark: string
}
export type UpdateAppointmentConcernInput = { remark: string }
export type AddAppointmentServiceInput = {
  appointmentId: string
  serviceId: string
  serviceCode: string
  serviceDescription: string
  processTimeMins: number
  ratePerHr: number
  price: number
  remark: string
  addedBySA?: boolean
}
export type UpdateAppointmentServiceInput = {
  remark: string
  price: number
  addedBySA?: boolean
}
export type AddWhatsappLogInput = {
  appointmentId: string
  message: string
  direction: 'outbound' | 'inbound'
  authorName: string
}
export type SetCustomerApprovalInput = {
  appointmentId: string
  status: 'Approved' | 'Rejected'
  note?: string
}

export type UpdateServiceItemAssignmentInput = {
  appointmentId: string
  serviceItemId: string
  plannedStartAt?: string
  plannedEndAt?: string
  workStatus?: CWServiceWorkStatus
}

// ─── New flow: JC/SA assignment inputs ─────────────────────────────────────────

export type AssignConcernDiagnosisInput = {
  appointmentId: string
  concernItemId: string
  seUserId: string
  bayId?: string
  startAt: string
  endAt: string
}

export type AssignConcernTechniciansInput = {
  appointmentId: string
  concernItemId: string
  technicianUserIds: string[]
}

export type SetConcernWorkStatusInput = {
  appointmentId: string
  concernItemId: string
  status: CWConcernWorkStatus
}

export type AssignServiceSEInput = {
  appointmentId: string
  serviceItemId: string
  seUserId: string
  bayId?: string
  startAt?: string
  endAt?: string
}

export type AssignServiceTechniciansInput = {
  appointmentId: string
  serviceItemId: string
  technicianUserIds: string[]
}

export type SubmitInspectionInput = {
  appointmentId: string
  checks: CWInspectionCheck[]
  actorName: string
}

// ─── Technician timer inputs ──────────────────────────────────────────────────

export type TechnicianTimerInput = {
  appointmentId: string
  itemId: string
  itemType: 'concern' | 'service'
  techAssignmentId: string
}

export type CompleteTechnicianTimerInput = TechnicianTimerInput & {
  notes?: string
}

// ─── Phase completion inputs ──────────────────────────────────────────────────

export type SubmitDiagnosisCompleteInput = {
  appointmentId: string
  actorName: string
}

export type SubmitServiceCompleteInput = {
  appointmentId: string
  actorName: string
}

export type ConfirmPaymentInput = {
  appointmentId: string
  actorName: string
}

export type ReleaseVehicleInput = {
  appointmentId: string
}

// ─── QC inputs ────────────────────────────────────────────────────────────────

export type AssignQCInput = {
  appointmentId: string
  qcUserId: string
}

export type QCItemVerification = {
  itemId: string
  itemType: 'concern' | 'service'
  status: 'Passed' | 'Failed'
  note?: string
}

export type QCApproveInput = {
  appointmentId: string
  actorName: string
  items: QCItemVerification[]
}

export type QCRejectInput = {
  appointmentId: string
  actorName: string
  rejectionNote: string
  items: QCItemVerification[]
}

type CWState = {
  shops: CWShop[]
  bays: CWBay[]
  roles: CWRole[]
  users: CWUser[]
  customers: CWCustomer[]
  vehicles: CWVehicle[]
  appointments: CWAppointment[]
  taskTemplates: CWTaskTemplate[]
  f1Config: CWF1Config
  concernCategories: CWConcernCategory[]
  concerns: CWConcern[]
  services: CWService[]

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

  createCustomer: (input: CreateCustomerInput) => CWCustomer
  updateCustomer: (customerId: string, input: UpdateCustomerInput) => void

  createVehicle: (input: CreateVehicleInput) => CWVehicle
  updateVehicle: (vehicleId: string, input: UpdateVehicleInput) => void

  createAppointment: (input: CreateAppointmentInput) => CWAppointment
  updateAppointment: (appointmentId: string, input: UpdateAppointmentInput) => void
  setAppointmentStatus: (appointmentId: string, status: CWAppointmentStatus) => void
  setAppointmentGateEntry: (appointmentId: string, gateEntryId: string | undefined) => void
  addAppointmentConcern: (input: AddAppointmentConcernInput) => CWAppointmentConcernItem
  removeAppointmentConcern: (appointmentId: string, itemId: string) => void
  updateAppointmentConcernRemark: (appointmentId: string, itemId: string, remark: string) => void
  updateConcernItemServices: (appointmentId: string, itemId: string, serviceIds: string[]) => void
  updateConcernDiagnosisRemark: (appointmentId: string, itemId: string, remark: string) => void
  addAppointmentService: (input: AddAppointmentServiceInput) => CWAppointmentServiceItem
  removeAppointmentService: (appointmentId: string, itemId: string) => void
  updateAppointmentService: (appointmentId: string, itemId: string, input: UpdateAppointmentServiceInput) => void
  addWhatsappLog: (input: AddWhatsappLogInput) => CWWhatsappLog
  setCustomerApproval: (input: SetCustomerApprovalInput) => void
  updateServiceItemAssignment: (input: UpdateServiceItemAssignmentInput) => void

  // New flow: JC assigns SE to concerns/services, SE assigns technicians
  assignConcernDiagnosis: (input: AssignConcernDiagnosisInput) => void
  assignConcernTechnicians: (input: AssignConcernTechniciansInput) => void
  setConcernWorkStatus: (input: SetConcernWorkStatusInput) => void
  assignServiceSE: (input: AssignServiceSEInput) => void
  assignServiceTechnicians: (input: AssignServiceTechniciansInput) => void
  submitInspection: (input: SubmitInspectionInput) => void
  pushTimeline: (appointmentId: string, event: Omit<CWTimelineEvent, 'id' | 'timestamp'>) => void

  // V4: Technician timer actions
  startTechnicianTimer: (input: TechnicianTimerInput) => void
  pauseTechnicianTimer: (input: TechnicianTimerInput) => void
  resumeTechnicianTimer: (input: TechnicianTimerInput) => void
  completeTechnicianTimer: (input: CompleteTechnicianTimerInput) => void

  // V4: Phase completion actions
  submitDiagnosisComplete: (input: SubmitDiagnosisCompleteInput) => void
  submitServiceComplete: (input: SubmitServiceCompleteInput) => void
  confirmPayment: (input: ConfirmPaymentInput) => void
  releaseVehicle: (input: ReleaseVehicleInput) => void

  // QC actions
  assignQC: (input: AssignQCInput) => void
  qcApprove: (input: QCApproveInput) => void
  qcReject: (input: QCRejectInput) => void

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
  setTaskSourceConcern: (taskId: string, concernId: string | null) => void

  createPendingVehicle: (input: CreatePendingVehicleInput) => CWPendingVehicle
  setPendingVehicleStatus: (pendingVehicleId: string, status: CWPendingVehicleStatus) => void
  resolvePendingVehicle: (
    pendingVehicleId: string,
    input: { customerId: string; vehicleId: string; appointmentId?: string },
  ) => void
  createJob: (input: CreateJobInput) => CWJob
  createJobWithTasks: (input: CreateJobWithTasksInput) => CWJob
  setJobStatus: (jobId: string, status: CWJobStatus) => void
  setJobTestDrive: (jobId: string, input: SetJobTestDriveInput) => void
  moveJobTask: (jobId: string, taskId: string, direction: 'up' | 'down') => void

  // Concern admin
  createConcernCategory: (input: CreateConcernCategoryInput) => CWConcernCategory
  updateConcernCategory: (id: string, input: UpdateConcernCategoryInput) => void
  createConcern: (input: CreateConcernInput) => CWConcern
  updateConcern: (id: string, input: UpdateConcernInput) => void

  // Service admin
  createService: (input: CreateServiceInput) => CWService
  updateService: (id: string, input: UpdateServiceInput) => void
  setServiceStatus: (id: string, status: CWServiceStatus) => void

  // Team admin
  teams: CWTeam[]
  createTeam: (input: CreateTeamInput) => CWTeam
  updateTeam: (id: string, input: UpdateTeamInput) => void

  // Parts admin
  parts: CWPart[]
  partRequests: CWPartRequest[]
  createPart: (input: CreatePartInput) => CWPart
  updatePart: (id: string, input: UpdatePartInput) => void
  createPartRequest: (input: CreatePartRequestInput) => CWPartRequest
  labelPartRequest: (id: string, input: LabelPartRequestInput) => void
  setPartRequestStatus: (id: string, status: CWPartRequestStatus) => void

  // Bay availability check
  checkBayAvailability: (bayId: string, startTime: string, endTime: string, excludeAppointmentId?: string) => boolean
}

function normalizeRoleName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function hasRoleName(roles: CWRole[], name: string, exceptId?: string) {
  const normalized = normalizeRoleName(name).toLowerCase()
  return roles.some((r) => r.id !== exceptId && r.name.toLowerCase() === normalized)
}

function normalizeEmail(email?: string) {
  const v = (email ?? '').trim().toLowerCase()
  return v || null
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, ' ')
}

function normalizeRegistrationNo(reg: string) {
  return reg.trim().replace(/\s+/g, ' ').toUpperCase()
}

function hasCustomerPhone(customers: CWCustomer[], phone: string, exceptId?: string) {
  const p = normalizePhone(phone)
  return customers.some((c) => c.id !== exceptId && normalizePhone(c.phone) === p)
}

function hasCustomerEmail(customers: CWCustomer[], email?: string, exceptId?: string) {
  const e = normalizeEmail(email)
  if (!e) return false
  return customers.some((c) => c.id !== exceptId && normalizeEmail(c.email) === e)
}

function hasVehicleReg(vehicles: CWVehicle[], reg: string, exceptId?: string) {
  const r = normalizeRegistrationNo(reg)
  return vehicles.some((v) => v.id !== exceptId && normalizeRegistrationNo(v.registrationNo) === r)
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
    { id: newId(), name: 'SE', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'CRE', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'QC', status: 'Active', isSystem: false, createdAt: ts, updatedAt: ts },
  ]

  const roleByName = new Map(roles.map((r) => [r.name, r] as const))
  const techRole = roleByName.get('Technician')!
  const saRole = roleByName.get('SA')!
  const seRole = roleByName.get('SE')!
  const creRole = roleByName.get('CRE')!

  const qcRole = roleByName.get('QC')!

  const users: CWUser[] = [
    // ── Technicians (4) ──
    {
      id: newId(),
      fullName: 'Rafiq Ahmed',
      email: 'rafiq.ahmed@cw.local',
      mobile: '0170000001',
      roleIds: [techRole.id],
      shopIds: [autoShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Kamal Hossain',
      email: 'kamal.hossain@cw.local',
      mobile: '0170000002',
      roleIds: [techRole.id],
      shopIds: [autoShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Jamal Uddin',
      email: 'jamal.uddin@cw.local',
      mobile: '0170000003',
      roleIds: [techRole.id],
      shopIds: [paintShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Shahidul Islam',
      email: 'shahidul.islam@cw.local',
      mobile: '0170000004',
      roleIds: [techRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    // ── Service Advisors (3) ──
    {
      id: newId(),
      fullName: 'Farhan Kabir',
      email: 'farhan.kabir@cw.local',
      mobile: '0180000001',
      roleIds: [saRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Nusrat Jahan',
      email: 'nusrat.jahan@cw.local',
      mobile: '0180000002',
      roleIds: [saRole.id],
      shopIds: [autoShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Tanvir Rahman',
      email: 'tanvir.rahman@cw.local',
      mobile: '0180000003',
      roleIds: [saRole.id],
      shopIds: [autoShop.id, paintShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    // ── Service Engineers (3) ──
    {
      id: newId(),
      fullName: 'Arif Hasan',
      email: 'arif.hasan@cw.local',
      mobile: '0190000001',
      roleIds: [seRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Sadia Akter',
      email: 'sadia.akter@cw.local',
      mobile: '0190000002',
      roleIds: [seRole.id],
      shopIds: [autoShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Mehedi Haque',
      email: 'mehedi.haque@cw.local',
      mobile: '0190000003',
      roleIds: [seRole.id],
      shopIds: [paintShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    // ── CREs (2) ──
    {
      id: newId(),
      fullName: 'Rubina Khatun',
      email: 'rubina.khatun@cw.local',
      mobile: '0160000001',
      roleIds: [creRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Nazmul Huda',
      email: 'nazmul.huda@cw.local',
      mobile: '0160000002',
      roleIds: [creRole.id],
      shopIds: [autoShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    // ── QC Inspectors (2) ──
    {
      id: newId(),
      fullName: 'Zahid Hasan',
      email: 'zahid.hasan@cw.local',
      mobile: '0150000001',
      roleIds: [qcRole.id],
      shopIds: [autoShop.id, paintShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Moinul Islam',
      email: 'moinul.islam@cw.local',
      mobile: '0150000002',
      roleIds: [qcRole.id],
      shopIds: [autoShop.id, bodyShop.id],
      status: 'Active',
      password: 'demo',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const reg1 = 'CWA-1001'
  const reg2 = 'CWP-2002'

  const customers: CWCustomer[] = [
    {
      id: newId(),
      fullName: 'Ayesha Rahman',
      phone: '01700000000',
      email: 'ayesha@example.com',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      fullName: 'Imran Hossain',
      phone: '01800000000',
      email: 'imran@example.com',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const vehicles: CWVehicle[] = [
    {
      id: newId(),
      customerId: customers[0]!.id,
      registrationNo: reg1,
      make: 'Toyota',
      model: 'Axio',
      vin: 'VIN-DEMO-1001',
      odometerKm: 65200,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      customerId: customers[1]!.id,
      registrationNo: reg2,
      make: 'Honda',
      model: 'Civic',
      vin: 'VIN-DEMO-2002',
      odometerKm: 40850,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const appointments: CWAppointment[] = [
    {
      id: newId(),
      customerId: customers[0]!.id,
      vehicleId: vehicles[0]!.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      concerns: 'Engine noise, check brakes',
      notes: 'Customer prefers morning slot',
      status: 'New',
      inspectionChecks: [],
      vehicleViewChecks: [],
      photos: [],
      concernItems: [],
      serviceItems: [],
      customerApprovalStatus: 'Pending',
      whatsappLogs: [],
      timeline: [{ id: newId(), timestamp: ts, actor: 'System', action: 'Seed appointment created' }],
      paymentStatus: 'Pending',
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
      shopId: autoShop.id,
      name: 'Brake System',
      description: 'Inspect brake pads, discs, and fluid.',
      status: 'Active',
      fields: [{ id: newId(), label: 'Condition', type: 'Dropdown', required: true, options: ['Good', 'Average', 'Bad'], order: 1 }],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: autoShop.id,
      name: 'Exhaust System',
      description: 'Inspect exhaust pipes, silencer, and emissions.',
      status: 'Active',
      fields: [{ id: newId(), label: 'Condition', type: 'Dropdown', required: true, options: ['Good', 'Average', 'Bad'], order: 1 }],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: autoShop.id,
      name: 'Lights/Windshield',
      description: 'Check all exterior lights and windshield condition.',
      status: 'Active',
      fields: [{ id: newId(), label: 'Condition', type: 'Dropdown', required: true, options: ['Good', 'Average', 'Bad'], order: 1 }],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: autoShop.id,
      name: 'Steering',
      description: 'Inspect steering response and components.',
      status: 'Active',
      fields: [{ id: newId(), label: 'Condition', type: 'Dropdown', required: true, options: ['Good', 'Average', 'Bad'], order: 1 }],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      shopId: autoShop.id,
      name: 'Suspension',
      description: 'Check shocks, springs, and suspension arms.',
      status: 'Active',
      fields: [{ id: newId(), label: 'Condition', type: 'Dropdown', required: true, options: ['Good', 'Average', 'Bad'], order: 1 }],
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

  // ── Teams seed ──
  const seUsers = users.filter((u) => u.roleIds.includes(seRole.id))
  const techUsers = users.filter((u) => u.roleIds.includes(techRole.id))
  const teams: CWTeam[] = [
    {
      id: newId(),
      name: 'Alpha Team',
      seUserId: seUsers[0]!.id,
      technicianUserIds: [techUsers[0]!.id, techUsers[1]!.id],
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      name: 'Bravo Team',
      seUserId: seUsers[1]!.id,
      technicianUserIds: [techUsers[2]!.id, techUsers[3]!.id],
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      name: 'Charlie Team',
      seUserId: seUsers.length > 2 ? seUsers[2]!.id : seUsers[0]!.id,
      technicianUserIds: [techUsers[0]!.id, techUsers[2]!.id],
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  // ── Parts seed ──
  const parts: CWPart[] = [
    { id: newId(), name: 'Oil Filter', partNumber: 'OF-001', price: 350, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Brake Pad Set (Front)', partNumber: 'BP-F01', price: 2500, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Brake Pad Set (Rear)', partNumber: 'BP-R01', price: 2200, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Spark Plug (Iridium)', partNumber: 'SP-IR01', price: 800, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Air Filter', partNumber: 'AF-001', price: 450, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Cabin/AC Filter', partNumber: 'CF-001', price: 550, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Drive Belt (Serpentine)', partNumber: 'DB-S01', price: 1200, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Timing Belt Kit', partNumber: 'TB-K01', price: 5500, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Water Pump', partNumber: 'WP-001', price: 3800, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Thermostat', partNumber: 'TH-001', price: 900, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Radiator', partNumber: 'RD-001', price: 8500, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Alternator', partNumber: 'AL-001', price: 7500, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Starter Motor', partNumber: 'SM-001', price: 6000, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Brake Disc (Front, pair)', partNumber: 'BD-F01', price: 4500, status: 'Active', createdAt: ts, updatedAt: ts },
    { id: newId(), name: 'Clutch Kit (Disc+Cover+Bearing)', partNumber: 'CK-001', price: 12000, status: 'Active', createdAt: ts, updatedAt: ts },
  ]

  return {
    shops,
    bays,
    roles,
    users,
    customers,
    vehicles,
    appointments,
    taskTemplates,
    tasks,
    taskFieldValues,
    teams,
    parts,
  }
}

const DEMO_SEED = seedDemoData()

function seedConcernsData(autoShopId: string, paintShopId: string, bodyShopId: string): { concernCategories: CWConcernCategory[]; concerns: CWConcern[] } {
  const ts = nowIso()

  // ── Auto Shop categories ──
  const autoCategories = [
    'Sheet Metal',
    'Water Leaks',
    'Handles / Locks / Mechanisms',
    'Mirror Function',
    'Front Glass Wiping & Washing',
    'Rear Glass Wiping & Washing',
    'Lighting',
    'Seating',
    'Climate Control Function',
    'Interior Trim',
  ]

  // ── Paint Shop categories ──
  const paintCategories = [
    'Paint Defects',
    'Surface Preparation',
    'Paint Finish',
  ]

  // ── Body Shop categories ──
  const bodyCategories = [
    'Panel Damage',
    'Structural Repair',
    'Welding & Fabrication',
  ]

  const concernCategories: CWConcernCategory[] = [
    ...autoCategories.map((name) => ({
      id: newId(), name, shopId: autoShopId, status: 'Active' as const, createdAt: ts, updatedAt: ts,
    })),
    ...paintCategories.map((name) => ({
      id: newId(), name, shopId: paintShopId, status: 'Active' as const, createdAt: ts, updatedAt: ts,
    })),
    ...bodyCategories.map((name) => ({
      id: newId(), name, shopId: bodyShopId, status: 'Active' as const, createdAt: ts, updatedAt: ts,
    })),
  ]

  const catByName = new Map(concernCategories.map((c) => [c.name, c] as const))

  const rawConcerns: [string, string, number][] = [
    // Auto Shop concerns
    ['Sheet Metal', 'Hard to Open – Front Side Door', 30],
    ['Sheet Metal', 'Hard to Open – Hood', 30],
    ['Sheet Metal', 'Hard to Open – Rear Side Door', 30],
    ['Sheet Metal', 'Hard to Open – Trunk', 30],
    ['Water Leaks', 'Water Leak Around Windshield', 30],
    ['Water Leaks', 'Water Leak Around Front Side Door/Window', 30],
    ['Water Leaks', 'Water Leak Around Rear Side Door/Window', 30],
    ['Water Leaks', 'Water Leak Around Back Window', 30],
    ['Water Leaks', 'Water Leak Around Sliding Rear Window', 30],
    ['Water Leaks', 'Water Leak Around Trunk/Hatchback/Liftgate/Rear Cargo Door', 30],
    ['Water Leaks', 'Other Water Leaks (Sealing Issues Only)', 30],
    ['Handles / Locks / Mechanisms', 'Hood Latch Broken/Inoperable', 30],
    ['Handles / Locks / Mechanisms', 'Ignition Switch Troubles', 30],
    ['Handles / Locks / Mechanisms', 'Interior Door Handle Troubles', 30],
    ['Handles / Locks / Mechanisms', 'Key Troubles', 30],
    ['Handles / Locks / Mechanisms', 'Exterior Door Lock Controls – Power', 30],
    ['Handles / Locks / Mechanisms', 'Exterior Door Handle Troubles', 30],
    ['Mirror Function', 'Exterior Mirror Troubles', 30],
    ['Mirror Function', 'Interior Mirror Troubles', 30],
    ['Front Glass Wiping & Washing', 'Front Wiper Trouble', 30],
    ['Front Glass Wiping & Washing', 'Other Wiper/Washer Troubles (Including Leaks)', 30],
    ['Rear Glass Wiping & Washing', 'Rear Window Washer Troubles', 30],
    ['Lighting', 'Lights not Working – Exterior', 30],
    ['Lighting', 'Headlamp Aim/Alignment', 30],
    ['Lighting', 'Other Lighting Troubles (Including Leaks/Condensation)', 30],
    ['Seating', 'Other Seating Troubles', 30],
    ['Seating', 'Rear Seat Squeak/Rattle', 30],
    ['Seating', 'Seat Adjustment Troubles', 30],
    ['Seating', 'Seat Squeaks and Rattles', 30],
    ['Climate Control Function', 'A/C does not Work', 30],
    ['Climate Control Function', 'A/C Front – Does not Work', 30],
    ['Climate Control Function', 'A/C Rear – Does not Work', 30],
    ['Climate Control Function', 'A/C does not Maintain Temperature', 30],
    ['Climate Control Function', 'A/C Slow to Cool', 30],
    ['Climate Control Function', 'A/C not Cold Enough', 30],
    ['Climate Control Function', 'A/C Water Leak/Condensation Troubles', 30],
    ['Climate Control Function', 'A/C Heater/Defroster Odour', 30],
    ['Climate Control Function', 'Other Temperature Control Troubles', 30],
    ['Climate Control Function', 'Windshield Defrost/Defogging Slow to Clear', 30],
    ['Climate Control Function', 'Windshield Defrost/Defogging does not Work', 30],
    ['Climate Control Function', 'Back Window Defrost/Defogging does not Work', 30],
    // Paint Shop concerns
    ['Paint Defects', 'Paint Peeling – Hood', 45],
    ['Paint Defects', 'Paint Peeling – Roof', 45],
    ['Paint Defects', 'Paint Peeling – Door Panel', 45],
    ['Paint Defects', 'Paint Fading / Discolouration', 60],
    ['Paint Defects', 'Paint Bubbling / Blistering', 45],
    ['Paint Defects', 'Clear Coat Failure', 60],
    ['Paint Defects', 'Stone Chip Damage', 30],
    ['Paint Defects', 'Scratch Marks – Minor', 30],
    ['Paint Defects', 'Scratch Marks – Deep', 45],
    ['Surface Preparation', 'Rust Spot Treatment Required', 60],
    ['Surface Preparation', 'Primer Adhesion Issue', 45],
    ['Surface Preparation', 'Sanding Marks Visible', 30],
    ['Surface Preparation', 'Filler Cracking', 45],
    ['Paint Finish', 'Orange Peel Texture', 30],
    ['Paint Finish', 'Colour Mismatch Between Panels', 60],
    ['Paint Finish', 'Overspray on Trim/Glass', 30],
    ['Paint Finish', 'Run/Sag in Paint', 30],
    ['Paint Finish', 'Fish Eyes in Paint', 30],
    // Body Shop concerns
    ['Panel Damage', 'Front Fender Dent', 60],
    ['Panel Damage', 'Rear Fender Dent', 60],
    ['Panel Damage', 'Door Panel Dent', 45],
    ['Panel Damage', 'Hood Dent / Deformation', 60],
    ['Panel Damage', 'Trunk Lid Dent', 45],
    ['Panel Damage', 'Roof Panel Damage', 90],
    ['Panel Damage', 'Bumper Crack / Damage – Front', 45],
    ['Panel Damage', 'Bumper Crack / Damage – Rear', 45],
    ['Structural Repair', 'Frame Alignment Issue', 120],
    ['Structural Repair', 'A-Pillar Damage', 120],
    ['Structural Repair', 'B-Pillar Damage', 120],
    ['Structural Repair', 'Subframe Damage', 180],
    ['Structural Repair', 'Chassis Straightening Required', 180],
    ['Welding & Fabrication', 'Spot Weld Failure', 60],
    ['Welding & Fabrication', 'Panel Join Separation', 60],
    ['Welding & Fabrication', 'Bracket Fabrication Required', 45],
    ['Welding & Fabrication', 'Reinforcement Plate Installation', 60],
  ]

  const concerns: CWConcern[] = rawConcerns.map(([catName, name, mins]) => {
    const cat = catByName.get(catName)!
    return {
      id: newId(),
      categoryId: cat.id,
      name,
      processTimeMins: mins,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
  })

  return { concernCategories, concerns }
}

function seedServicesData(autoShopId: string, paintShopId: string, bodyShopId: string): CWService[] {
  const ts = nowIso()
  // Map categories to shops
  const paintShopCategories = new Set(['Paint Services'])
  const bodyShopCategories = new Set(['Body Repair', 'Glass & Trim'])
  function shopForCategory(cat: string) {
    if (paintShopCategories.has(cat)) return paintShopId
    if (bodyShopCategories.has(cat)) return bodyShopId
    return autoShopId
  }
  type Raw = [string, string, string, number, number, number]
  const raw: Raw[] = [
    ['Periodic Maintenance', 'PMS-001', '1,000 km Initial Service', 1, 1500, 1500],
    ['Periodic Maintenance', 'PMS-005', '5,000 km Periodic Maintenance', 1.2, 1500, 1800],
    ['Periodic Maintenance', 'PMS-010', '10,000 km Periodic Maintenance', 1.5, 1500, 2250],
    ['Periodic Maintenance', 'PMS-020', '20,000 km Major Service', 2, 1500, 3000],
    ['Periodic Maintenance', 'PMS-030', '30,000 km Major Service', 2.2, 1500, 3300],
    ['Periodic Maintenance', 'PMS-040', '40,000 km Major Service', 2.5, 1500, 3750],
    ['Periodic Maintenance', 'PMS-050', '50,000 km Major Service', 2.5, 1500, 3750],
    ['Periodic Maintenance', 'PMS-060', '60,000 km Major Service', 3, 1500, 4500],
    ['Periodic Maintenance', 'PMS-070', '70,000 km Service', 2.5, 1500, 3750],
    ['Periodic Maintenance', 'PMS-080', '80,000 km Service', 3, 1500, 4500],
    ['Periodic Maintenance', 'PMS-100', '100,000 km Major Service (Timing Belt etc.)', 4, 1500, 6000],
    ['Periodic Maintenance', 'PMS-110', 'Engine Oil & Filter Replacement', 0.5, 1500, 750],
    ['Periodic Maintenance', 'PMS-120', 'Oil Filter Only Replacement', 0.3, 1500, 450],
    ['Periodic Maintenance', 'PMS-130', 'Fuel Filter Replacement', 0.5, 1500, 750],
    ['Periodic Maintenance', 'PMS-140', 'Air Filter Replacement', 0.3, 1500, 450],
    ['Periodic Maintenance', 'PMS-150', 'Cabin/AC Filter Replacement', 0.3, 1500, 450],
    ['Periodic Maintenance', 'PMS-160', 'Coolant Replacement & Bleeding', 1, 1500, 1500],
    ['Periodic Maintenance', 'PMS-170', 'Brake Fluid Flush & Replacement', 1, 1500, 1500],
    ['Periodic Maintenance', 'PMS-180', 'Transmission Fluid Change (ATF)', 1, 1500, 1500],
    ['Periodic Maintenance', 'PMS-190', 'Differential Oil Change', 0.8, 1500, 1200],
    ['Engine', 'ENG-001', 'Spark Plug Replacement (4 cyl)', 0.5, 1500, 750],
    ['Engine', 'ENG-002', 'Spark Plug Replacement (6 cyl)', 0.8, 1500, 1200],
    ['Engine', 'ENG-003', 'Spark Plug Replacement (8 cyl)', 1, 1500, 1500],
    ['Engine', 'ENG-004', 'Ignition Coil Replacement (per piece)', 0.4, 1500, 600],
    ['Engine', 'ENG-005', 'Air Intake Hose Replacement', 0.5, 1500, 750],
    ['Engine', 'ENG-006', 'Fuel Injector Cleaning (per set – 4 cyl)', 1.5, 1500, 2250],
    ['Engine', 'ENG-007', 'Fuel Injector Replacement (per piece)', 0.8, 1500, 1200],
    ['Engine', 'ENG-008', 'Engine Oil Pan Removal & Reseal', 2, 1500, 3000],
    ['Engine', 'ENG-009', 'Valve Cover Gasket Replacement (4 cyl)', 1.5, 1500, 2250],
    ['Engine', 'ENG-010', 'Cylinder Head Gasket Replacement (4 cyl)', 6, 1500, 9000],
    ['Engine', 'ENG-011', 'Cylinder Head Gasket Replacement (6 cyl)', 8, 1500, 12000],
    ['Engine', 'ENG-012', 'Timing Belt Replacement (4 cyl)', 3, 1500, 4500],
    ['Engine', 'ENG-013', 'Timing Belt Replacement (6 cyl)', 4, 1500, 6000],
    ['Engine', 'ENG-014', 'Timing Chain Replacement (4 cyl)', 5, 1500, 7500],
    ['Engine', 'ENG-015', 'Water Pump Replacement', 2, 1500, 3000],
    ['Engine', 'ENG-016', 'Radiator Replacement', 1.5, 1500, 2250],
    ['Engine', 'ENG-017', 'Thermostat Replacement', 0.8, 1500, 1200],
    ['Engine', 'ENG-018', 'Engine Mount Replacement (per piece)', 1, 1500, 1500],
    ['Engine', 'ENG-019', 'Oil Pump Replacement', 4, 1500, 6000],
    ['Engine', 'ENG-020', 'Engine Overhaul (4 cyl) – Complete Rebuild', 20, 1500, 30000],
    ['Engine', 'ENG-021', 'Engine Overhaul (6 cyl) – Complete Rebuild', 25, 1500, 37500],
    ['Engine', 'ENG-022', 'Engine Overhaul (8 cyl) – Complete Rebuild', 30, 1500, 45000],
    ['Engine', 'ENG-023', 'Turbocharger Replacement (single)', 5, 1500, 7500],
    ['Engine', 'ENG-024', 'Turbocharger Cleaning & Service', 3, 1500, 4500],
    ['Engine', 'ENG-025', 'EGR Valve Cleaning', 1.5, 1500, 2250],
    ['Engine', 'ENG-026', 'EGR Valve Replacement', 2, 1500, 3000],
    ['Engine', 'ENG-027', 'Intake Manifold Cleaning (Carbon Clean)', 2.5, 1500, 3750],
    ['Engine', 'ENG-028', 'Throttle Body Cleaning', 0.8, 1500, 1200],
    ['Engine', 'ENG-029', 'Engine Removal & Refit (4 cyl)', 8, 1500, 12000],
    ['Engine', 'ENG-030', 'Engine Removal & Refit (6 cyl)', 10, 1500, 15000],
    ['Engine', 'ENG-031', 'Engine Removal & Refit (8 cyl)', 12, 1500, 18000],
    ['Engine', 'ENG-032', 'Alternator Replacement', 1.2, 1500, 1800],
    ['Engine', 'ENG-033', 'Starter Motor Replacement', 1, 1500, 1500],
    ['Engine', 'ENG-034', 'Drive Belt / Serpentine Belt Replacement', 0.5, 1500, 750],
    ['Engine', 'ENG-035', 'Crankshaft Seal Replacement', 4, 1500, 6000],
    ['Engine', 'ENG-036', 'Camshaft Seal Replacement', 3, 1500, 4500],
    ['Engine', 'ENG-037', 'Head Skimming & Reassembly (labour only)', 5, 1500, 7500],
    ['Engine', 'ENG-038', 'Piston Ring Replacement (4 cyl)', 12, 1500, 18000],
    ['Engine', 'ENG-039', 'Oil Change + Filter + Gasket Reseal Package', 1, 1500, 1500],
    ['Engine', 'ENG-040', 'Cooling System Pressure Test & Inspection', 0.5, 1500, 750],
    ['Transmission', 'TRN-001', 'Manual Transmission Oil Change', 1, 1500, 1500],
    ['Transmission', 'TRN-002', 'Automatic Transmission ATF Change', 1, 1500, 1500],
    ['Transmission', 'TRN-003', 'CVT Fluid Replacement', 1.5, 1500, 2250],
    ['Transmission', 'TRN-004', 'Clutch Overhaul (Disc, Cover, Bearing)', 3.5, 1500, 5250],
    ['Transmission', 'TRN-005', 'Clutch Master Cylinder Replacement', 1.2, 1500, 1800],
    ['Transmission', 'TRN-006', 'Clutch Slave Cylinder Replacement', 1, 1500, 1500],
    ['Transmission', 'TRN-007', 'Gear Shift Cable Replacement', 1.5, 1500, 2250],
    ['Transmission', 'TRN-008', 'Transmission Mount Replacement', 1, 1500, 1500],
    ['Transmission', 'TRN-009', 'Transmission Removal & Refit (M/T)', 6, 1500, 9000],
    ['Transmission', 'TRN-010', 'Transmission Removal & Refit (A/T)', 8, 1500, 12000],
    ['Transmission', 'TRN-011', 'Transmission Overhaul (M/T – 5 speed)', 15, 1500, 22500],
    ['Transmission', 'TRN-012', 'Transmission Overhaul (A/T – 4/5 speed)', 20, 1500, 30000],
    ['Transmission', 'TRN-013', 'Transmission Overhaul (CVT)', 22, 1500, 33000],
    ['Transmission', 'TRN-014', 'Transfer Case Oil Change', 0.8, 1500, 1200],
    ['Transmission', 'TRN-015', 'Transfer Case Overhaul', 8, 1500, 12000],
    ['Transmission', 'TRN-016', 'Propeller Shaft U-Joint Replacement', 1.5, 1500, 2250],
    ['Transmission', 'TRN-017', 'Propeller Shaft Replacement', 2.5, 1500, 3750],
    ['Transmission', 'TRN-018', 'Differential Oil Change', 1, 1500, 1500],
    ['Transmission', 'TRN-019', 'Differential Overhaul (Front)', 10, 1500, 15000],
    ['Transmission', 'TRN-020', 'Differential Overhaul (Rear)', 12, 1500, 18000],
    ['Transmission', 'TRN-021', 'Driveshaft Replacement (per side)', 2, 1500, 3000],
    ['Transmission', 'TRN-022', 'CV Joint Boot Replacement (per side)', 1.2, 1500, 1800],
    ['Transmission', 'TRN-023', 'Axle Seal Replacement (per side)', 1, 1500, 1500],
    ['Transmission', 'TRN-024', '4WD Hub Service', 1.5, 1500, 2250],
    ['Transmission', 'TRN-025', 'Transmission Control Module Reset / Reprogram', 1, 1500, 1500],
    ['Suspension', 'SUS-001', 'Front Shock Absorber Replacement (pair)', 2, 1500, 3000],
    ['Suspension', 'SUS-002', 'Rear Shock Absorber Replacement (pair)', 1.5, 1500, 2250],
    ['Suspension', 'SUS-003', 'Front Coil Spring Replacement (pair)', 2, 1500, 3000],
    ['Suspension', 'SUS-004', 'Rear Coil Spring Replacement (pair)', 1.5, 1500, 2250],
    ['Suspension', 'SUS-005', 'Front Lower Arm Replacement (per side)', 1.5, 1500, 2250],
    ['Suspension', 'SUS-006', 'Rear Control Arm Replacement (per side)', 1.2, 1500, 1800],
    ['Suspension', 'SUS-007', 'Ball Joint Replacement (per side)', 1, 1500, 1500],
    ['Suspension', 'SUS-008', 'Tie Rod End Replacement (per side)', 0.8, 1500, 1200],
    ['Suspension', 'SUS-009', 'Rack End Replacement (per side)', 1, 1500, 1500],
    ['Suspension', 'SUS-010', 'Steering Rack Overhaul', 8, 1500, 12000],
    ['Suspension', 'SUS-011', 'Steering Rack Boot Replacement', 1, 1500, 1500],
    ['Suspension', 'SUS-012', 'Steering Column Replacement', 2.5, 1500, 3750],
    ['Suspension', 'SUS-013', 'Steering Pump Replacement', 2, 1500, 3000],
    ['Suspension', 'SUS-014', 'Wheel Alignment (4-wheel)', 1, 1500, 1500],
    ['Suspension', 'SUS-015', 'Wheel Balancing (per wheel)', 0.3, 1500, 450],
    ['Suspension', 'SUS-016', 'Power Steering Fluid Flush', 1, 1500, 1500],
    ['Suspension', 'SUS-017', 'Stabilizer Link Replacement (per side)', 0.8, 1500, 1200],
    ['Suspension', 'SUS-018', 'Suspension Bush Replacement (per arm)', 1.2, 1500, 1800],
    ['Suspension', 'SUS-019', 'Front Hub Bearing Replacement (per side)', 2, 1500, 3000],
    ['Suspension', 'SUS-020', 'Rear Hub Bearing Replacement (per side)', 1.8, 1500, 2700],
    ['Suspension', 'SUS-021', 'Knuckle Replacement (per side)', 2.5, 1500, 3750],
    ['Suspension', 'SUS-022', 'Strut Mount Replacement (per side)', 1.5, 1500, 2250],
    ['Suspension', 'SUS-023', 'Wheel Bearing Greasing', 1, 1500, 1500],
    ['Suspension', 'SUS-024', 'Control Arm Bushing Press Service', 1.2, 1500, 1800],
    ['Suspension', 'SUS-025', 'Steering Angle Sensor Calibration', 0.8, 1500, 1200],
    ['Suspension', 'SUS-026', 'Steering Wheel Replacement', 0.5, 1500, 750],
    ['Suspension', 'SUS-027', 'Shock Mount Bushing Replacement', 1, 1500, 1500],
    ['Suspension', 'SUS-028', 'Power Steering Hose Replacement', 1.5, 1500, 2250],
    ['Suspension', 'SUS-029', 'Suspension Inspection Package', 0.8, 1500, 1200],
    ['Suspension', 'SUS-030', 'Steering Freeplay Adjustment', 0.5, 1500, 750],
    ['Brakes', 'BRK-001', 'Front Brake Pad Replacement', 1, 1500, 1500],
    ['Brakes', 'BRK-002', 'Rear Brake Pad Replacement', 1, 1500, 1500],
    ['Brakes', 'BRK-003', 'Front Disc Rotor Skimming (pair)', 1.5, 1500, 2250],
    ['Brakes', 'BRK-004', 'Rear Disc Rotor Skimming (pair)', 1.5, 1500, 2250],
    ['Brakes', 'BRK-005', 'Front Brake Disc Replacement (pair)', 2, 1500, 3000],
    ['Brakes', 'BRK-006', 'Rear Brake Disc Replacement (pair)', 2, 1500, 3000],
    ['Brakes', 'BRK-007', 'Brake Shoe Replacement (rear drum)', 2, 1500, 3000],
    ['Brakes', 'BRK-008', 'Brake Drum Skimming (pair)', 1.5, 1500, 2250],
    ['Brakes', 'BRK-009', 'Brake Caliper Overhaul (per side)', 2, 1500, 3000],
    ['Brakes', 'BRK-010', 'Brake Caliper Pin Greasing', 0.8, 1500, 1200],
    ['Brakes', 'BRK-011', 'Brake Hose Replacement (per side)', 1, 1500, 1500],
    ['Brakes', 'BRK-012', 'Brake Master Cylinder Replacement', 2, 1500, 3000],
    ['Brakes', 'BRK-013', 'Brake Booster Replacement', 2.5, 1500, 3750],
    ['Brakes', 'BRK-014', 'Brake Fluid Flush', 1, 1500, 1500],
    ['Brakes', 'BRK-015', 'ABS Sensor Replacement (per side)', 1, 1500, 1500],
    ['Brakes', 'BRK-016', 'ABS Module Replacement', 3, 1500, 4500],
    ['Brakes', 'BRK-017', 'Parking Brake Adjustment', 0.5, 1500, 750],
    ['Brakes', 'BRK-018', 'Parking Brake Cable Replacement', 2, 1500, 3000],
    ['Brakes', 'BRK-019', 'Brake System Bleeding (full vehicle)', 1.5, 1500, 2250],
    ['Brakes', 'BRK-020', 'Brake Inspection Package', 0.5, 1500, 750],
    ['Electrical', 'ELE-001', 'Battery Replacement & System Reset', 0.5, 1500, 750],
    ['Electrical', 'ELE-002', 'Alternator Replacement', 1.5, 1500, 2250],
    ['Electrical', 'ELE-003', 'Starter Motor Replacement', 1.2, 1500, 1800],
    ['Electrical', 'ELE-004', 'ECU Diagnostic Scan (GTS+)', 0.5, 1500, 750],
    ['Electrical', 'ELE-005', 'ECU Reprogramming / Update', 1, 1500, 1500],
    ['Electrical', 'ELE-006', 'Wiring Harness Repair (minor)', 1, 1500, 1500],
    ['Electrical', 'ELE-007', 'Wiring Harness Replacement (major)', 6, 1500, 9000],
    ['Electrical', 'ELE-008', 'Fuse Box Replacement', 1.5, 1500, 2250],
    ['Electrical', 'ELE-009', 'Relay Replacement', 0.5, 1500, 750],
    ['Electrical', 'ELE-010', 'Headlight Bulb Replacement (per bulb)', 0.3, 1500, 450],
    ['Electrical', 'ELE-011', 'Headlight Assembly Replacement', 1.5, 1500, 2250],
    ['Electrical', 'ELE-012', 'Tail Lamp Assembly Replacement', 1, 1500, 1500],
    ['Electrical', 'ELE-013', 'Fog Lamp Installation (pair)', 1.5, 1500, 2250],
    ['Electrical', 'ELE-014', 'Horn Replacement', 0.5, 1500, 750],
    ['Electrical', 'ELE-015', 'Power Window Motor Replacement', 1.5, 1500, 2250],
    ['Electrical', 'ELE-016', 'Door Lock Actuator Replacement', 1, 1500, 1500],
    ['Electrical', 'ELE-017', 'Instrument Cluster Replacement', 2, 1500, 3000],
    ['Electrical', 'ELE-018', 'Sensor Replacement (O2, MAF, etc.)', 1, 1500, 1500],
    ['Electrical', 'ELE-019', 'Camera / Parking Sensor Installation', 2, 1500, 3000],
    ['Electrical', 'ELE-020', 'Audio Head Unit Replacement', 1.5, 1500, 2250],
    ['Electrical', 'ELE-021', 'Speaker Installation (pair)', 1, 1500, 1500],
    ['Electrical', 'ELE-022', 'Navigation System Installation', 2.5, 1500, 3750],
    ['Electrical', 'ELE-023', 'Immobilizer / Key Programming', 1, 1500, 1500],
    ['Electrical', 'ELE-024', 'Hybrid System Diagnostic', 2, 1500, 3000],
    ['Electrical', 'ELE-025', 'EV Battery Pack Removal & Refit', 6, 1500, 9000],
    ['HVAC', 'AC-001', 'AC Gas Recharge & Leak Check', 1.5, 1500, 2250],
    ['HVAC', 'AC-002', 'AC Compressor Replacement', 3, 1500, 4500],
    ['HVAC', 'AC-003', 'AC Condenser Replacement', 2, 1500, 3000],
    ['HVAC', 'AC-004', 'Evaporator Cleaning', 2.5, 1500, 3750],
    ['HVAC', 'AC-005', 'Evaporator Replacement', 4, 1500, 6000],
    ['HVAC', 'AC-006', 'Expansion Valve Replacement', 2, 1500, 3000],
    ['HVAC', 'AC-007', 'Blower Motor Replacement', 1.5, 1500, 2250],
    ['HVAC', 'AC-008', 'Cabin Filter Replacement', 0.3, 1500, 450],
    ['HVAC', 'AC-009', 'Heater Core Replacement', 5, 1500, 7500],
    ['HVAC', 'AC-010', 'AC Pipe / Hose Replacement', 1.5, 1500, 2250],
    ['HVAC', 'AC-011', 'AC Control Panel Replacement', 1, 1500, 1500],
    ['HVAC', 'AC-012', 'Cooling Coil Service', 2.5, 1500, 3750],
    ['HVAC', 'AC-013', 'AC Pressure Test', 0.8, 1500, 1200],
    ['HVAC', 'AC-014', 'HVAC System Calibration', 1, 1500, 1500],
    ['HVAC', 'AC-015', 'AC Full Service Package', 4, 1500, 6000],
    ['Paint Services', 'PNT-001', 'Front Bumper Paint', 3, 1500, 4500],
    ['Paint Services', 'PNT-002', 'Rear Bumper Paint', 3, 1500, 4500],
    ['Paint Services', 'PNT-003', 'Door Paint (per door)', 3.5, 1500, 5250],
    ['Paint Services', 'PNT-004', 'Fender Paint (per fender)', 3, 1500, 4500],
    ['Paint Services', 'PNT-005', 'Hood Paint', 4, 1500, 6000],
    ['Paint Services', 'PNT-006', 'Trunk Paint', 3.5, 1500, 5250],
    ['Paint Services', 'PNT-007', 'Roof Paint', 4.5, 1500, 6750],
    ['Paint Services', 'PNT-008', 'Full Body Paint', 40, 1500, 60000],
    ['Paint Services', 'PNT-009', 'Scratch Removal & Polish (per panel)', 1.5, 1500, 2250],
    ['Paint Services', 'PNT-010', 'Underbody Coating', 3, 1500, 4500],
    ['Paint Services', 'PNT-011', 'Rust Treatment (per panel)', 2, 1500, 3000],
    ['Paint Services', 'PNT-012', 'Windshield Frame Paint', 3, 1500, 4500],
    ['Paint Services', 'PNT-013', 'Door Handle Paint (set of 4)', 2, 1500, 3000],
    ['Paint Services', 'PNT-014', 'Mirror Housing Paint (pair)', 1.5, 1500, 2250],
    ['Paint Services', 'PNT-015', 'Alloy Wheel Paint (per wheel)', 2, 1500, 3000],
    ['Body Repair', 'BDY-001', 'Panel Replacement (per panel)', 3, 1500, 4500],
    ['Body Repair', 'BDY-002', 'Dent Removal (minor)', 1.5, 1500, 2250],
    ['Body Repair', 'BDY-003', 'Dent Removal (major)', 4, 1500, 6000],
    ['Body Repair', 'BDY-004', 'Paintless Dent Removal (per panel)', 2, 1500, 3000],
    ['Body Repair', 'BDY-005', 'Body Inspection Package', 1, 1500, 1500],
    ['Body Repair', 'BDY-006', 'Frame Straightening', 8, 1500, 12000],
    ['Body Repair', 'BDY-007', 'Bumper Replacement – Front', 2, 1500, 3000],
    ['Body Repair', 'BDY-008', 'Bumper Replacement – Rear', 2, 1500, 3000],
    ['Body Repair', 'BDY-009', 'Fender Replacement (per side)', 2.5, 1500, 3750],
    ['Body Repair', 'BDY-010', 'Door Shell Replacement', 3, 1500, 4500],
    ['Glass & Trim', 'GLS-001', 'Windshield Replacement', 2.5, 1500, 3750],
    ['Glass & Trim', 'GLS-002', 'Rear Glass Replacement', 2.5, 1500, 3750],
    ['Glass & Trim', 'GLS-003', 'Side Glass Replacement (per glass)', 1.5, 1500, 2250],
    ['Glass & Trim', 'GLS-004', 'Quarter Glass Replacement', 1.5, 1500, 2250],
    ['Glass & Trim', 'GLS-005', 'Window Regulator Replacement', 1.5, 1500, 2250],
    ['Glass & Trim', 'GLS-006', 'Sunroof Glass Replacement', 3, 1500, 4500],
    ['Glass & Trim', 'GLS-007', 'Door Trim Removal & Refitting', 1, 1500, 1500],
    ['Glass & Trim', 'GLS-008', 'Dashboard Removal & Refitting', 4, 1500, 6000],
    ['Glass & Trim', 'GLS-009', 'Seat Removal & Refitting (per seat)', 1, 1500, 1500],
    ['Glass & Trim', 'GLS-010', 'Interior Trim Fitting (full car)', 5, 1500, 7500],
    ['Inspection', 'INS-001', 'Pre-Purchase Inspection (with GTS+)', 2, 1500, 3000],
    ['Inspection', 'INS-002', 'Paint Thickness & Auction Report Check', 1.5, 1500, 2250],
    ['Inspection', 'INS-003', 'Full Vehicle Diagnostic Scan', 1.5, 1500, 2250],
    ['Inspection', 'INS-004', 'Safety Inspection Package', 1, 1500, 1500],
    ['Inspection', 'INS-005', 'Emission Test & Report', 1, 1500, 1500],
    ['Inspection', 'INS-006', 'Suspension & Brake Health Check', 1, 1500, 1500],
    ['Inspection', 'INS-007', 'Airbag & Safety Systems Diagnostic', 1.2, 1500, 1800],
    ['Inspection', 'INS-008', 'Battery Health Test', 0.5, 1500, 750],
    ['Inspection', 'INS-009', 'Road Test & Performance Check', 1, 1500, 1500],
    ['Inspection', 'INS-010', 'Comprehensive Inspection Package', 3, 1500, 4500],
  ]

  return raw.map(([category, code, description, timeHrsRaw, ratePerHr, price]) => ({
    id: newId(),
    code,
    category,
    description,
    processTimeMins: Math.round((timeHrsRaw as number) * 60),
    ratePerHr,
    price,
    shopId: shopForCategory(category),
    status: 'Active' as CWServiceStatus,
    createdAt: ts,
    updatedAt: ts,
  }))
}

const _autoShopId = DEMO_SEED.shops[0].id
const _paintShopId = DEMO_SEED.shops[1].id
const _bodyShopId = DEMO_SEED.shops[2].id
const CONCERNS_SEED = seedConcernsData(_autoShopId, _paintShopId, _bodyShopId)
const SERVICES_SEED = seedServicesData(_autoShopId, _paintShopId, _bodyShopId)

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
  concernCategories: CONCERNS_SEED.concernCategories,
  concerns: CONCERNS_SEED.concerns,
  services: SERVICES_SEED,
  f1Config: {
    returnWindowDays: 7,
    updatedAt: nowIso(),
  },
  taskComments: [],
  taskAttachments: [],

  pendingVehicles: [],
  jobs: [],

  teams: DEMO_SEED.teams,
  parts: DEMO_SEED.parts,
  partRequests: [],

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

  createCustomer: (input) => {
    const fullName = input.fullName.trim()
    const phone = normalizePhone(input.phone)
    const email = (input.email ?? '').trim()

    if (!fullName) throw new Error('Customer name is required')
    if (!phone) throw new Error('Phone is required')

    const customers = get().customers
    if (hasCustomerPhone(customers, phone)) throw new Error('Duplicate phone')
    if (hasCustomerEmail(customers, email)) throw new Error('Duplicate email')

    const ts = nowIso()
    const customer: CWCustomer = {
      id: newId(),
      fullName,
      phone,
      email: email || undefined,
      type: input.type ?? 'Individual',
      address: input.address,
      occupation: input.occupation,
      whatsappLink: input.whatsappLink,
      facebookLink: input.facebookLink,
      linkedinLink: input.linkedinLink,
      googleLink: input.googleLink,
      corporate: input.corporate,
      isSelfDriven: input.isSelfDriven,
      driverName: input.driverName,
      driverPhone: input.driverPhone,
      isPersonalUse: input.isPersonalUse,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ customers: [customer, ...customers] })
    return customer
  },

  updateCustomer: (customerId, input) => {
    const fullName = input.fullName.trim()
    const phone = normalizePhone(input.phone)
    const email = (input.email ?? '').trim()

    if (!fullName) throw new Error('Customer name is required')
    if (!phone) throw new Error('Phone is required')

    const customers = get().customers
    if (hasCustomerPhone(customers, phone, customerId)) throw new Error('Duplicate phone')
    if (hasCustomerEmail(customers, email, customerId)) throw new Error('Duplicate email')

    set({
      customers: customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              fullName,
              phone,
              email: email || undefined,
              status: input.status,
              updatedAt: nowIso(),
            }
          : c,
      ),
    })
  },

  createVehicle: (input) => {
    const customerId = input.customerId
    const registrationNo = normalizeRegistrationNo(input.registrationNo)
    const make = (input.make ?? '').trim()
    const model = (input.model ?? '').trim()
    const vin = (input.vin ?? '').trim()
    const odometerKm = input.odometerKm

    if (!customerId) throw new Error('Customer is required')
    if (!registrationNo) throw new Error('Registration no is required')

    const customers = get().customers
    if (!customers.some((c) => c.id === customerId)) throw new Error('Customer not found')

    const vehicles = get().vehicles
    if (hasVehicleReg(vehicles, registrationNo)) throw new Error('Duplicate registration')

    if (typeof odometerKm === 'number' && !(odometerKm >= 0)) throw new Error('Invalid odometer')

    const ts = nowIso()
    const vehicle: CWVehicle = {
      id: newId(),
      customerId,
      registrationNo,
      make: make || undefined,
      model: model || undefined,
      vin: vin || undefined,
      odometerKm: typeof odometerKm === 'number' ? odometerKm : undefined,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ vehicles: [vehicle, ...vehicles] })
    return vehicle
  },

  updateVehicle: (vehicleId, input) => {
    const customerId = input.customerId
    const registrationNo = normalizeRegistrationNo(input.registrationNo)
    const make = (input.make ?? '').trim()
    const model = (input.model ?? '').trim()
    const vin = (input.vin ?? '').trim()
    const odometerKm = input.odometerKm

    if (!customerId) throw new Error('Customer is required')
    if (!registrationNo) throw new Error('Registration no is required')

    const customers = get().customers
    if (!customers.some((c) => c.id === customerId)) throw new Error('Customer not found')

    const vehicles = get().vehicles
    if (hasVehicleReg(vehicles, registrationNo, vehicleId)) throw new Error('Duplicate registration')
    if (typeof odometerKm === 'number' && !(odometerKm >= 0)) throw new Error('Invalid odometer')

    set({
      vehicles: vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              customerId,
              registrationNo,
              make: make || undefined,
              model: model || undefined,
              vin: vin || undefined,
              odometerKm: typeof odometerKm === 'number' ? odometerKm : undefined,
              status: input.status,
              updatedAt: nowIso(),
            }
          : v,
      ),
    })
  },

  createAppointment: (input) => {
    if (!input.customerId) throw new Error('Customer is required')
    if (!input.vehicleId) throw new Error('Vehicle is required')

    const customers = get().customers
    const vehicles = get().vehicles
    if (!customers.some((c) => c.id === input.customerId)) throw new Error('Customer not found')
    if (!vehicles.some((v) => v.id === input.vehicleId)) throw new Error('Vehicle not found')

    const scheduledAt = (input.scheduledAt ?? '').trim()
    if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) throw new Error('Invalid scheduled date')

    const ts = nowIso()

    const defaultChecks: CWInspectionCheck[] = [
      // System Component
      { id: newId(), category: 'System Component', section: 'Brake System', label: 'Brake system (including lines, hoses, and parking brake)', checked: false },
      { id: newId(), category: 'System Component', section: 'Exhaust System', label: 'Exhaust system and heat shield (leaks, damage)', checked: false },
      { id: newId(), category: 'System Component', section: 'Lights/Windshield', label: 'Lights and windshield condition', checked: false },
      { id: newId(), category: 'System Component', section: 'Steering', label: 'Steering linkage and suspension', checked: false },
      { id: newId(), category: 'System Component', section: 'Engine', label: 'Engine oil level and leaks', checked: false },
      { id: newId(), category: 'System Component', section: 'Cooling', label: 'Coolant level and hoses', checked: false },
      { id: newId(), category: 'System Component', section: 'Battery', label: 'Battery terminals and charge', checked: false },
      // Scheduled Maintenance
      { id: newId(), category: 'Scheduled Maintenance', section: 'Fluids', label: 'Engine oil change', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Fluids', label: 'Transmission fluid check', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Fluids', label: 'Brake fluid level', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Fluids', label: 'Power steering fluid', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Filters', label: 'Air filter inspection', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Filters', label: 'Cabin/AC filter', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Belts', label: 'Drive belt / serpentine belt', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Belts', label: 'Timing belt inspection', checked: false },
      { id: newId(), category: 'Scheduled Maintenance', section: 'Spark', label: 'Spark plug condition', checked: false },
      // Tire/Brake Wire
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Front', label: 'Tire Tread Depth', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Front', label: 'Tire Wear Pattern/Damage', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Front', label: 'Tire Pressure Set to Factory-Recommended PSI', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Front', label: 'Brake Lining', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Front', label: 'Tire Tread Depth', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Front', label: 'Tire Wear Pattern/Damage', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Front', label: 'Tire Pressure Set to Factory-Recommended PSI', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Front', label: 'Brake Lining', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Rear', label: 'Tire Tread Depth', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Rear', label: 'Tire Wear Pattern/Damage', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Left Rear', label: 'Brake Lining', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Rear', label: 'Tire Tread Depth', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Rear', label: 'Tire Wear Pattern/Damage', checked: false },
      { id: newId(), category: 'Tire/Brake Wire', section: 'Right Rear', label: 'Brake Lining', checked: false },
      // Underbody
      { id: newId(), category: 'Underbody', section: 'Frame', label: 'Frame and cross members (rust, cracks)', checked: false },
      { id: newId(), category: 'Underbody', section: 'Frame', label: 'Floor pan condition', checked: false },
      { id: newId(), category: 'Underbody', section: 'Suspension', label: 'Shock absorbers / struts', checked: false },
      { id: newId(), category: 'Underbody', section: 'Suspension', label: 'Control arms and bushings', checked: false },
      { id: newId(), category: 'Underbody', section: 'Exhaust', label: 'Exhaust pipe and muffler', checked: false },
      { id: newId(), category: 'Underbody', section: 'Exhaust', label: 'Catalytic converter', checked: false },
      { id: newId(), category: 'Underbody', section: 'Drivetrain', label: 'Drive shaft and CV joints', checked: false },
      { id: newId(), category: 'Underbody', section: 'Drivetrain', label: 'Transmission pan (leaks)', checked: false },
      { id: newId(), category: 'Underbody', section: 'Protection', label: 'Underbody coating / rust protection', checked: false },
      // Front View
      { id: newId(), category: 'Front View', section: 'Bumper', label: 'Front bumper condition', checked: false },
      { id: newId(), category: 'Front View', section: 'Bumper', label: 'Front grille condition', checked: false },
      { id: newId(), category: 'Front View', section: 'Lights', label: 'Headlight left', checked: false },
      { id: newId(), category: 'Front View', section: 'Lights', label: 'Headlight right', checked: false },
      { id: newId(), category: 'Front View', section: 'Lights', label: 'Fog lights', checked: false },
      { id: newId(), category: 'Front View', section: 'Glass', label: 'Windshield condition', checked: false },
      { id: newId(), category: 'Front View', section: 'Glass', label: 'Windshield wipers', checked: false },
      { id: newId(), category: 'Front View', section: 'Hood', label: 'Hood alignment and paint', checked: false },
      // Right View
      { id: newId(), category: 'Right View', section: 'Body', label: 'Right front fender', checked: false },
      { id: newId(), category: 'Right View', section: 'Body', label: 'Right front door', checked: false },
      { id: newId(), category: 'Right View', section: 'Body', label: 'Right rear door', checked: false },
      { id: newId(), category: 'Right View', section: 'Body', label: 'Right rear quarter panel', checked: false },
      { id: newId(), category: 'Right View', section: 'Glass', label: 'Right side windows', checked: false },
      { id: newId(), category: 'Right View', section: 'Mirror', label: 'Right side mirror', checked: false },
      { id: newId(), category: 'Right View', section: 'Trim', label: 'Right side molding / trim', checked: false },
      // Left View
      { id: newId(), category: 'Left View', section: 'Body', label: 'Left front fender', checked: false },
      { id: newId(), category: 'Left View', section: 'Body', label: 'Left front door', checked: false },
      { id: newId(), category: 'Left View', section: 'Body', label: 'Left rear door', checked: false },
      { id: newId(), category: 'Left View', section: 'Body', label: 'Left rear quarter panel', checked: false },
      { id: newId(), category: 'Left View', section: 'Glass', label: 'Left side windows', checked: false },
      { id: newId(), category: 'Left View', section: 'Mirror', label: 'Left side mirror', checked: false },
      { id: newId(), category: 'Left View', section: 'Trim', label: 'Left side molding / trim', checked: false },
      // Rear View
      { id: newId(), category: 'Rear View', section: 'Bumper', label: 'Rear bumper condition', checked: false },
      { id: newId(), category: 'Rear View', section: 'Lights', label: 'Tail light left', checked: false },
      { id: newId(), category: 'Rear View', section: 'Lights', label: 'Tail light right', checked: false },
      { id: newId(), category: 'Rear View', section: 'Lights', label: 'Brake light / third brake light', checked: false },
      { id: newId(), category: 'Rear View', section: 'Glass', label: 'Rear windshield', checked: false },
      { id: newId(), category: 'Rear View', section: 'Trunk', label: 'Trunk/tailgate condition', checked: false },
      { id: newId(), category: 'Rear View', section: 'Exhaust', label: 'Exhaust tip condition', checked: false },
      // Interior View
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'All Switches', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'AC System', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Horn', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Rear View Mirror', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Tissue Box', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Floor Mat', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Seat Cover', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Glove Compartment Function', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Reverse Camera', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Cigarette Lighter & Ashtray', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Room Light', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Illuminated Sun Visor', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Strap & Buckle Holder', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Sunroof Mechanism', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Stereo System', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Air Freshener', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Console Box', checked: false },
      { id: newId(), category: 'Interior View', section: 'Interior', label: 'Bonnet Operation', checked: false },
      // MIL Status
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'ABS (Anti-lock Braking System)', checked: false },
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'Airbag', checked: false },
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'Warning Triangle', checked: false },
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'Check Engine', checked: false },
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'Battery Warning', checked: false },
      { id: newId(), category: 'Interior View', section: 'MIL Status', label: 'Oil Pressure Warning', checked: false },
      // Photos
      { id: newId(), category: 'Photos', section: 'Mileage & Fuel', label: 'Current Mileage', checked: false },
      { id: newId(), category: 'Photos', section: 'Mileage & Fuel', label: 'Current Fuel Level', checked: false },
      { id: newId(), category: 'Photos', section: 'Vehicle Photos', label: 'Front side photo', checked: false },
      { id: newId(), category: 'Photos', section: 'Vehicle Photos', label: 'Rear side photo', checked: false },
      { id: newId(), category: 'Photos', section: 'Vehicle Photos', label: 'Right side photo', checked: false },
      { id: newId(), category: 'Photos', section: 'Vehicle Photos', label: 'Left side photo', checked: false },
    ]

    const appt: CWAppointment = {
      id: newId(),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      slotDate: input.slotDate,
      slotTime: input.slotTime,
      scheduledAt: scheduledAt || undefined,
      concerns: (input.concerns ?? '').trim(),
      notes: (input.notes ?? '').trim(),
      status: input.assignedSAUserId ? 'SA Inspection' : (input.status ?? 'New'),
      assignedSAUserId: input.assignedSAUserId,
      inspectionChecks: defaultChecks,
      vehicleViewChecks: [],
      photos: [],
      concernItems: (input.concernItems ?? []).map((c) => {
        // Lookup concern definition for processTimeMins if not provided
        const timeMins = c.processTimeMins ?? get().concerns.find((def) => def.id === c.concernId)?.processTimeMins
        return {
          id: newId(),
          concernId: c.concernId,
          concernName: c.concernName,
          remark: c.remark.trim(),
          processTimeMins: timeMins,
          technicianAssignments: [],
        }
      }),
      serviceItems: (input.serviceItems ?? []).map((s) => ({
        id: newId(),
        serviceId: s.serviceId,
        serviceCode: s.serviceCode,
        serviceDescription: s.serviceDescription,
        processTimeMins: s.processTimeMins,
        ratePerHr: s.ratePerHr,
        price: s.price,
        remark: s.remark.trim(),
        addedBySA: s.addedBySA ?? false,
        technicianAssignments: [],
      })),
      customerApprovalStatus: 'Pending',
      whatsappLogs: [],
      timeline: [
        { id: newId(), timestamp: ts, actor: 'CRE', action: 'Appointment created' },
      ],
      gateEntryId: input.gateEntryId,
      paymentStatus: 'Pending',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ appointments: [appt, ...get().appointments] })
    return appt
  },

  updateAppointment: (appointmentId, input) => {
    if (!input.customerId) throw new Error('Customer is required')
    if (!input.vehicleId) throw new Error('Vehicle is required')

    const customers = get().customers
    const vehicles = get().vehicles
    if (!customers.some((c) => c.id === input.customerId)) throw new Error('Customer not found')
    if (!vehicles.some((v) => v.id === input.vehicleId)) throw new Error('Vehicle not found')

    const scheduledAt = (input.scheduledAt ?? '').trim()
    if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) throw new Error('Invalid scheduled date')

    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              customerId: input.customerId,
              vehicleId: input.vehicleId,
              slotDate: input.slotDate,
              slotTime: input.slotTime,
              scheduledAt: scheduledAt || undefined,
              concerns: input.concerns.trim(),
              notes: input.notes.trim(),
              status: input.status,
              gateEntryId: input.gateEntryId,
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  setAppointmentStatus: (appointmentId, status) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              status,
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  setAppointmentGateEntry: (appointmentId, gateEntryId) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              gateEntryId,
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  addAppointmentConcern: (input) => {
    // Lookup concern definition for processTimeMins
    const concernDef = get().concerns.find((c) => c.id === input.concernId)
    const item: CWAppointmentConcernItem = {
      id: newId(),
      concernId: input.concernId,
      concernName: input.concernName,
      remark: input.remark.trim(),
      processTimeMins: concernDef?.processTimeMins,
      technicianAssignments: [],
    }
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? { ...a, concernItems: [...a.concernItems, item], updatedAt: nowIso() }
          : a,
      ),
    })
    return item
  },

  removeAppointmentConcern: (appointmentId, itemId) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? { ...a, concernItems: a.concernItems.filter((i) => i.id !== itemId), updatedAt: nowIso() }
          : a,
      ),
    })
  },

  updateAppointmentConcernRemark: (appointmentId, itemId, remark) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((i) =>
                i.id === itemId ? { ...i, remark: remark.trim() } : i,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  updateConcernItemServices: (appointmentId, itemId, serviceIds) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((i) =>
                i.id === itemId ? { ...i, serviceIds } : i,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  updateConcernDiagnosisRemark: (appointmentId, itemId, remark) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((i) =>
                i.id === itemId ? { ...i, diagnosisRemark: remark } : i,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  addAppointmentService: (input) => {
    const item: CWAppointmentServiceItem = {
      id: newId(),
      serviceId: input.serviceId,
      serviceCode: input.serviceCode,
      serviceDescription: input.serviceDescription,
      processTimeMins: input.processTimeMins,
      ratePerHr: input.ratePerHr,
      price: input.price,
      remark: input.remark.trim(),
      addedBySA: input.addedBySA ?? false,
      technicianAssignments: [],
    }
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? { ...a, serviceItems: [...a.serviceItems, item], updatedAt: nowIso() }
          : a,
      ),
    })
    return item
  },

  removeAppointmentService: (appointmentId, itemId) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? { ...a, serviceItems: a.serviceItems.filter((i) => i.id !== itemId), updatedAt: nowIso() }
          : a,
      ),
    })
  },

  updateAppointmentService: (appointmentId, itemId, input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((i) =>
                i.id === itemId
                  ? { ...i, remark: input.remark.trim(), price: input.price, addedBySA: input.addedBySA ?? i.addedBySA }
                  : i,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  addWhatsappLog: (input) => {
    const log: CWWhatsappLog = {
      id: newId(),
      sentAt: nowIso(),
      direction: input.direction,
      authorName: input.authorName,
      message: input.message.trim(),
    }
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? { ...a, whatsappLogs: [...a.whatsappLogs, log], updatedAt: nowIso() }
          : a,
      ),
    })
    return log
  },

  setCustomerApproval: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              customerApprovalStatus: input.status,
              customerApprovalNote: (input.note ?? '').trim() || undefined,
              status: input.status === 'Approved' ? 'Customer Approved' : 'Customer Rejected',
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  // ─── New flow: JC assigns SE to concerns/services, SE assigns technicians ────

  assignConcernDiagnosis: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((c) =>
                c.id === input.concernItemId
                  ? {
                      ...c,
                      assignedSEUserId: input.seUserId,
                      bayId: input.bayId,
                      plannedStartAt: input.startAt,
                      plannedEndAt: input.endAt,
                      workStatus: 'Pending' as const,
                    }
                  : c,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  assignConcernTechnicians: (input) => {
    const newAssignments = input.technicianUserIds.map((uid) => ({
      id: newId(),
      technicianUserId: uid,
      status: 'Assigned' as const,
      totalPausedMs: 0,
    }))
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((c) =>
                c.id === input.concernItemId
                  ? { ...c, technicianAssignments: [...c.technicianAssignments, ...newAssignments] }
                  : c,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  setConcernWorkStatus: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              concernItems: a.concernItems.map((c) =>
                c.id === input.concernItemId
                  ? { ...c, workStatus: input.status }
                  : c,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  assignServiceSE: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((s) =>
                s.id === input.serviceItemId
                  ? {
                      ...s,
                      assignedSEUserId: input.seUserId,
                      bayId: input.bayId,
                      plannedStartAt: input.startAt,
                      plannedEndAt: input.endAt,
                      workStatus: 'Pending' as const,
                    }
                  : s,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  assignServiceTechnicians: (input) => {
    const newAssignments = input.technicianUserIds.map((uid) => ({
      id: newId(),
      technicianUserId: uid,
      status: 'Assigned' as const,
      totalPausedMs: 0,
    }))
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((s) =>
                s.id === input.serviceItemId
                  ? { ...s, technicianAssignments: [...s.technicianAssignments, ...newAssignments] }
                  : s,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  submitInspection: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              inspectionChecks: input.checks,
              status: 'SA Reviewed' as const,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: nowIso(), actor: input.actorName, action: 'Inspection completed', details: `${input.checks.filter((c) => c.checked).length}/${input.checks.length} checks passed` },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  pushTimeline: (appointmentId, event) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              timeline: [
                ...a.timeline,
                { ...event, id: newId(), timestamp: nowIso() },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  // ─── V4: Technician timer actions ─────────────────────────────────────────

  startTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: { id: string }[]) =>
          ta.map((t: any) =>
            t.id === input.techAssignmentId
              ? { ...t, status: 'In Progress' as const, startedAt: t.startedAt ?? now }
              : t,
          )
        return {
          ...a,
          concernItems: input.itemType === 'concern'
            ? a.concernItems.map((c) => c.id === input.itemId ? { ...c, technicianAssignments: mapTech(c.technicianAssignments), workStatus: 'In Progress' as const } : c)
            : a.concernItems,
          serviceItems: input.itemType === 'service'
            ? a.serviceItems.map((s) => s.id === input.itemId ? { ...s, technicianAssignments: mapTech(s.technicianAssignments), workStatus: 'In Progress' as const } : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
  },

  pauseTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: any[]) =>
          ta.map((t: any) =>
            t.id === input.techAssignmentId
              ? { ...t, status: 'Paused' as const, pausedAt: now }
              : t,
          )
        return {
          ...a,
          concernItems: input.itemType === 'concern'
            ? a.concernItems.map((c) => c.id === input.itemId ? { ...c, technicianAssignments: mapTech(c.technicianAssignments) } : c)
            : a.concernItems,
          serviceItems: input.itemType === 'service'
            ? a.serviceItems.map((s) => s.id === input.itemId ? { ...s, technicianAssignments: mapTech(s.technicianAssignments) } : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
  },

  resumeTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: any[]) =>
          ta.map((t: any) => {
            if (t.id !== input.techAssignmentId) return t
            const pausedMs = t.pausedAt ? Date.now() - new Date(t.pausedAt).getTime() : 0
            return { ...t, status: 'In Progress' as const, pausedAt: undefined, totalPausedMs: (t.totalPausedMs || 0) + pausedMs }
          })
        return {
          ...a,
          concernItems: input.itemType === 'concern'
            ? a.concernItems.map((c) => c.id === input.itemId ? { ...c, technicianAssignments: mapTech(c.technicianAssignments) } : c)
            : a.concernItems,
          serviceItems: input.itemType === 'service'
            ? a.serviceItems.map((s) => s.id === input.itemId ? { ...s, technicianAssignments: mapTech(s.technicianAssignments) } : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
  },

  completeTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: any[]) =>
          ta.map((t: any) => {
            if (t.id !== input.techAssignmentId) return t
            // If paused, accumulate final pause duration
            const pausedMs = t.pausedAt ? Date.now() - new Date(t.pausedAt).getTime() : 0
            return {
              ...t,
              status: 'Completed' as const,
              completedAt: now,
              pausedAt: undefined,
              totalPausedMs: (t.totalPausedMs || 0) + pausedMs,
              notes: input.notes ?? t.notes,
            }
          })

        // Auto-mark item as Completed if all technicians are done
        const markItemComplete = (item: any) => {
          const updated = mapTech(item.technicianAssignments)
          const allDone = updated.every((t: any) => t.status === 'Completed')
          return { ...item, technicianAssignments: updated, workStatus: allDone ? 'Completed' as const : item.workStatus }
        }

        return {
          ...a,
          concernItems: input.itemType === 'concern'
            ? a.concernItems.map((c) => c.id === input.itemId ? markItemComplete(c) : c)
            : a.concernItems,
          serviceItems: input.itemType === 'service'
            ? a.serviceItems.map((s) => s.id === input.itemId ? markItemComplete(s) : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
  },

  // ─── V4: Phase completion actions ─────────────────────────────────────────

  submitDiagnosisComplete: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              status: 'Diagnosis Complete' as const,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: nowIso(), actor: input.actorName, action: 'Diagnosis completed — reviewing services' },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  submitServiceComplete: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              status: 'Service Complete' as const,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: nowIso(), actor: input.actorName, action: 'All services completed' },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  // ─── QC actions ──────────────────────────────────────────────────────────────

  assignQC: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              assignedQCUserId: input.qcUserId,
              status: 'QC Assigned' as const,
              // Clear previous QC marks on services only (QC doesn't verify concerns)
              serviceItems: a.serviceItems.map((s) => ({ ...s, qcStatus: undefined, qcNote: undefined })),
              qcRejectionNote: undefined,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: nowIso(), actor: 'SA', action: 'Assigned QC for verification' },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  qcApprove: (input) => {
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        // QC only verifies services, not concerns
        const serviceItems = a.serviceItems.map((s) => {
          const v = input.items.find((i) => i.itemId === s.id && i.itemType === 'service')
          return v ? { ...s, qcStatus: v.status as any, qcNote: v.note } : s
        })
        return {
          ...a,
          serviceItems,
          status: 'QC Approved' as const,
          timeline: [
            ...a.timeline,
            { id: newId(), timestamp: nowIso(), actor: input.actorName, action: 'QC approved — all services verified' },
          ],
          updatedAt: nowIso(),
        }
      }),
    })
  },

  qcReject: (input) => {
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const failedItems = input.items.filter((i) => i.status === 'Failed')
        // QC only verifies services, not concerns
        const serviceItems = a.serviceItems.map((s) => {
          const v = input.items.find((i) => i.itemId === s.id && i.itemType === 'service')
          if (!v) return s
          return {
            ...s,
            qcStatus: v.status as any,
            qcNote: v.note,
            ...(v.status === 'Failed' ? { workStatus: 'Pending' as const, technicianAssignments: [] } : {}),
          }
        })
        return {
          ...a,
          serviceItems,
          status: 'QC Rejected' as const,
          qcRejectionNote: input.rejectionNote,
          timeline: [
            ...a.timeline,
            {
              id: newId(),
              timestamp: nowIso(),
              actor: input.actorName,
              action: `QC rejected — ${failedItems.length} service(s) need rework`,
              details: input.rejectionNote,
            },
          ],
          updatedAt: nowIso(),
        }
      }),
    })
  },

  confirmPayment: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              status: 'Payment Done' as const,
              paymentStatus: 'Done' as const,
              gatePassIssuedAt: now,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: now, actor: input.actorName, action: 'Payment confirmed — gate pass issued' },
              ],
              updatedAt: now,
            }
          : a,
      ),
    })
  },

  releaseVehicle: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              status: 'Released' as const,
              releasedAt: now,
              timeline: [
                ...a.timeline,
                { id: newId(), timestamp: now, actor: 'Guard', action: 'Vehicle released from premises' },
              ],
              updatedAt: now,
            }
          : a,
      ),
    })
  },

  updateServiceItemAssignment: (input) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((s) =>
                s.id === input.serviceItemId
                  ? {
                      ...s,
                      ...(input.plannedStartAt !== undefined && { plannedStartAt: input.plannedStartAt }),
                      ...(input.plannedEndAt !== undefined && { plannedEndAt: input.plannedEndAt }),
                      ...(input.workStatus !== undefined && { workStatus: input.workStatus }),
                    }
                  : s,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
  },

  // ─── Concern Admin ──────────────────────────────────────────────────────────

  createConcernCategory: (input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Category name is required')
    if (!input.shopId) throw new Error('Shop is required')
    const ts = nowIso()
    const cat: CWConcernCategory = { id: newId(), name, shopId: input.shopId, status: 'Active', createdAt: ts, updatedAt: ts }
    set({ concernCategories: [cat, ...get().concernCategories] })
    return cat
  },

  updateConcernCategory: (id, input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Category name is required')
    set({
      concernCategories: get().concernCategories.map((c) =>
        c.id === id ? { ...c, name, shopId: input.shopId, status: input.status, updatedAt: nowIso() } : c,
      ),
    })
  },

  createConcern: (input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Concern name is required')
    if (!input.categoryId) throw new Error('Category is required')
    const ts = nowIso()
    const concern: CWConcern = {
      id: newId(),
      categoryId: input.categoryId,
      name,
      processTimeMins: input.processTimeMins,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ concerns: [concern, ...get().concerns] })
    return concern
  },

  updateConcern: (id, input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Concern name is required')
    set({
      concerns: get().concerns.map((c) =>
        c.id === id ? { ...c, name, status: input.status, updatedAt: nowIso() } : c,
      ),
    })
  },

  // ─── Service Admin ──────────────────────────────────────────────────────────

  createService: (input) => {
    const ts = nowIso()
    const svc: CWService = {
      id: newId(),
      code: input.code.trim(),
      category: input.category.trim(),
      description: input.description.trim(),
      processTimeMins: input.processTimeMins,
      ratePerHr: input.ratePerHr,
      price: input.price,
      shopId: input.shopId,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ services: [svc, ...get().services] })
    return svc
  },

  updateService: (id, input) => {
    set({
      services: get().services.map((s) =>
        s.id === id
          ? {
              ...s,
               code: input.code.trim(),
              category: input.category.trim(),
              description: input.description.trim(),
              processTimeMins: input.processTimeMins,
              ratePerHr: input.ratePerHr,
              price: input.price,
              shopId: input.shopId,
              status: input.status,
              updatedAt: nowIso(),
            }
          : s,
      ),
    })
  },

  setServiceStatus: (id, status) => {
    set({
      services: get().services.map((s) =>
        s.id === id ? { ...s, status, updatedAt: nowIso() } : s,
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

  setTaskSourceConcern: (taskId, concernId) => {
    set({
      tasks: get().tasks.map((t) =>
        t.id === taskId
          ? { ...t, sourceConcernId: concernId ?? undefined, updatedAt: nowIso() }
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
    const registrationNo = normalizeRegistrationNo(input.registrationNo)
    if (!registrationNo) throw new Error('Registration no is required')

    const existingActive = get().pendingVehicles.some(
      (p) => normalizeRegistrationNo(p.registrationNo) === registrationNo && p.status === 'Pending',
    )
    if (existingActive) throw new Error('Active entry already exists for this registration')

    if (input.customerId) {
      const exists = get().customers.some((c) => c.id === input.customerId)
      if (!exists) throw new Error('Customer not found')
    }
    if (input.vehicleId) {
      const exists = get().vehicles.some((v) => v.id === input.vehicleId)
      if (!exists) throw new Error('Vehicle not found')
    }
    if (input.appointmentId) {
      const exists = get().appointments.some((a) => a.id === input.appointmentId)
      if (!exists) throw new Error('Appointment not found')
    }

    const ts = nowIso()
    const pending: CWPendingVehicle = {
      id: newId(),
      registrationNo,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      appointmentId: input.appointmentId,
      isTemporary: input.isTemporary,
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

  resolvePendingVehicle: (pendingVehicleId, input) => {
    const pending = get().pendingVehicles.find((p) => p.id === pendingVehicleId)
    if (!pending) throw new Error('Gate entry not found')
    if (pending.status !== 'Pending') throw new Error('Gate entry not active')

    const customer = get().customers.find((c) => c.id === input.customerId)
    if (!customer) throw new Error('Customer not found')
    const vehicle = get().vehicles.find((v) => v.id === input.vehicleId)
    if (!vehicle) throw new Error('Vehicle not found')

    if (vehicle.customerId !== customer.id) throw new Error('Vehicle does not belong to customer')

    // Appointment is optional — walk-ins may not have one
    let appointmentId: string | undefined
    if (input.appointmentId) {
      const appt = get().appointments.find((a) => a.id === input.appointmentId)
      if (!appt) throw new Error('Appointment not found')
      if (appt.customerId !== customer.id) throw new Error('Appointment customer mismatch')
      if (appt.vehicleId !== vehicle.id) throw new Error('Appointment vehicle mismatch')
      appointmentId = appt.id
    }

    set({
      pendingVehicles: get().pendingVehicles.map((p) =>
        p.id === pendingVehicleId
          ? {
              ...p,
              customerId: customer.id,
              vehicleId: vehicle.id,
              appointmentId,
              isTemporary: false,
              status: 'Resolved' as CWPendingVehicleStatus,
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

    const pending = input.pendingVehicleId
      ? get().pendingVehicles.find((p) => p.id === input.pendingVehicleId)
      : undefined
    const appointmentId = pending?.appointmentId

    const job: CWJob = {
      id: newId(),
      registrationNo,
      pendingVehicleId: input.pendingVehicleId,
      appointmentId,
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
      appointments: appointmentId
        ? get().appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: 'SA Inspection' as const,
                  gateEntryId: a.gateEntryId ?? pending?.id,
                  updatedAt: nowIso(),
                }
              : a,
          )
        : get().appointments,
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
    const pending = input.pendingVehicleId
      ? get().pendingVehicles.find((p) => p.id === input.pendingVehicleId)
      : undefined
    const appointmentId = input.appointmentId ?? pending?.appointmentId

    const job: CWJob = {
      id: newId(),
      registrationNo,
      pendingVehicleId: input.pendingVehicleId,
      appointmentId,
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
      appointments: appointmentId
        ? get().appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: 'SA Inspection' as const,
                  gateEntryId: a.gateEntryId ?? pending?.id,
                  updatedAt: nowIso(),
                }
              : a,
          )
        : get().appointments,
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

  setJobTestDrive: (jobId, input) => {
    const driverName = input.driverName.trim()
    const driverNid = input.driverNid.trim()
    if (!driverName) throw new Error('Driver name is required')
    if (!driverNid) throw new Error('Driver NID is required')

    const expectedReturnAt = input.expectedReturnAt?.trim() || undefined
    if (expectedReturnAt) {
      const parsed = Date.parse(expectedReturnAt)
      if (!Number.isFinite(parsed)) throw new Error('Expected return must be a valid date/time')
    }

    set({
      jobs: get().jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'Test Drive Approved',
              testDriveDriverName: driverName,
              testDriveDriverNid: driverNid,
              testDriveExpectedReturnAt: expectedReturnAt,
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

  // ── Team actions ──────────────────────────────────────────────────────────────

  createTeam: (input) => {
    const ts = nowIso()
    const team: CWTeam = {
      id: newId(),
      name: input.name.trim(),
      seUserId: input.seUserId,
      technicianUserIds: [...new Set(input.technicianUserIds)],
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ teams: [team, ...get().teams] })
    return team
  },

  updateTeam: (id, input) => {
    set({
      teams: get().teams.map((t) =>
        t.id === id
          ? {
              ...t,
              name: input.name.trim(),
              seUserId: input.seUserId,
              technicianUserIds: [...new Set(input.technicianUserIds)],
              status: input.status,
              updatedAt: nowIso(),
            }
          : t,
      ),
    })
  },

  // ── Part actions ─────────────────────────────────────────────────────────────

  createPart: (input) => {
    const ts = nowIso()
    const part: CWPart = {
      id: newId(),
      name: input.name.trim(),
      partNumber: input.partNumber?.trim(),
      price: input.price,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ parts: [part, ...get().parts] })
    return part
  },

  updatePart: (id, input) => {
    set({
      parts: get().parts.map((p) =>
        p.id === id
          ? {
              ...p,
              name: input.name.trim(),
              partNumber: input.partNumber?.trim(),
              price: input.price,
              status: input.status,
              updatedAt: nowIso(),
            }
          : p,
      ),
    })
  },

  // ── Part request actions ──────────────────────────────────────────────────────

  createPartRequest: (input) => {
    const ts = nowIso()
    const req: CWPartRequest = {
      id: newId(),
      appointmentId: input.appointmentId,
      concernItemId: input.concernItemId,
      partName: input.partName.trim(),
      quantity: input.quantity,
      status: 'Requested',
      requestedBy: input.requestedBy,
      createdAt: ts,
      updatedAt: ts,
    }
    set({ partRequests: [req, ...get().partRequests] })
    return req
  },

  labelPartRequest: (id, input) => {
    set({
      partRequests: get().partRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              partNumber: input.partNumber.trim(),
              price: input.price,
              quantity: input.quantity,
              deliveryDate: input.deliveryDate,
              labeledBy: input.labeledBy,
              status: input.status ?? ('Labeled' as const),
              updatedAt: nowIso(),
            }
          : r,
      ),
    })
  },

  setPartRequestStatus: (id, status) => {
    set({
      partRequests: get().partRequests.map((r) =>
        r.id === id
          ? { ...r, status, updatedAt: nowIso() }
          : r,
      ),
    })
  },

  // ── Bay availability check ────────────────────────────────────────────────────

  checkBayAvailability: (bayId, startTime, endTime, excludeAppointmentId) => {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return false

    const appointments = get().appointments
    for (const appt of appointments) {
      if (excludeAppointmentId && appt.id === excludeAppointmentId) continue

      // Check concern items
      for (const c of appt.concernItems) {
        if (c.bayId === bayId && c.plannedStartAt && c.plannedEndAt) {
          const cStart = new Date(c.plannedStartAt).getTime()
          const cEnd = new Date(c.plannedEndAt).getTime()
          if (start < cEnd && end > cStart) return false // overlap
        }
      }
      // Check service items
      for (const s of appt.serviceItems) {
        if (s.bayId === bayId && s.plannedStartAt && s.plannedEndAt) {
          const sStart = new Date(s.plannedStartAt).getTime()
          const sEnd = new Date(s.plannedEndAt).getTime()
          if (start < sEnd && end > sStart) return false // overlap
        }
      }
    }
    return true
  },
}))

// Non-hook access for service-layer functions.
export const cwStore = {
  getState: useCwStore.getState,
  setState: useCwStore.setState,
}
