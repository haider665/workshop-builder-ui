import { create } from 'zustand'
import { workshopApi } from '../services/workshopApi'
import type {
  CWF1Config,
  CWAppointment,
  CWAppointmentConcernItem,
  CWAppointmentServiceItem,
  CWAppointmentServiceStageItem,
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
  CWCallRecord,
  CWPart,
  CWPartRequest,
  CWPartRequestStatus,
  CWPendingVehicle,
  CWPendingVehicleStatus,
  CWReminder,
  CWRole,
  CWRoleStatus,
  CWService,
  CWServiceSeverity,
  CWServiceStageDefinition,
  CWServiceStatus,
  CWServiceWorkStatus,
  CWStageWorkStatus,
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
  CWTechnicianAssignment,
  CWQCItemStatus,
  CWUser,
  CWUserStatus,
  CWVehicle,
  CWVehicleCategory,
  CWVehicleSize,
  CWVehicleStatus,
  CWWhatsappLog,
  CWPartStockUnit,
  CWStockUnitStatus,
  CWVendor,
  CWVendorPartPrice,
  CWEstimateLine,
  CWPurchaseOrder,
  CWPOLine,
  CWGoodsReceiptNote,
  CWGRNLine,
  CWRequisition,
  CWRequisitionLine,
  CWPartReturn,
  CWVendorClaim,
  CWNotification,
  CWNotificationCategory,
  CWInvoice,
  CWInvoiceLine,
} from '../types/cw'

function nowIso() {
  return new Date().toISOString()
}

function syncBackend(promise: Promise<unknown>, label: string) {
  void promise.catch((error) => {
    console.error(`Failed to sync ${label}`, error)
  })
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Default vehicle health-check items — shared across all paths that set SA Inspection */
export function buildDefaultInspectionChecks(): CWInspectionCheck[] {
  return [
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
    { id: newId(), category: 'Scheduled Maintenance', section: 'Filters', label: 'Cabin air filter', checked: false },
    { id: newId(), category: 'Scheduled Maintenance', section: 'Filters', label: 'Fuel filter', checked: false },
    { id: newId(), category: 'Scheduled Maintenance', section: 'Belts', label: 'Drive belt inspection', checked: false },
    { id: newId(), category: 'Scheduled Maintenance', section: 'Belts', label: 'Timing belt/chain condition', checked: false },
    // Tyre/Brake Wire
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Tyres', label: 'Front left tyre tread & pressure', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Tyres', label: 'Front right tyre tread & pressure', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Tyres', label: 'Rear left tyre tread & pressure', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Tyres', label: 'Rear right tyre tread & pressure', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Tyres', label: 'Spare tyre condition', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Brakes', label: 'Front brake pads', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Brakes', label: 'Rear brake pads', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Brakes', label: 'Brake discs/rotors', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Wires', label: 'Spark plug wires', checked: false },
    { id: newId(), category: 'Tyre/Brake Wire', section: 'Wires', label: 'Ignition coil & wiring', checked: false },
    // Underbody
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'Oil pan condition', checked: false },
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'Transmission pan', checked: false },
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'CV joints and boots', checked: false },
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'Exhaust pipe and muffler', checked: false },
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'Suspension components', checked: false },
    { id: newId(), category: 'Underbody', section: 'Underbody', label: 'Frame and subframe condition', checked: false },
    // Front View
    { id: newId(), category: 'Front View', section: 'Front', label: 'Headlights (low/high beam)', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Fog lights', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Turn signals (front)', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Front bumper condition', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Grille condition', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Windshield (chips/cracks)', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Wiper blades', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Washer fluid level', checked: false },
    { id: newId(), category: 'Front View', section: 'Front', label: 'Hood alignment', checked: false },
    // Right View
    { id: newId(), category: 'Right View', section: 'Right Side', label: 'Right fender condition', checked: false },
    { id: newId(), category: 'Right View', section: 'Right Side', label: 'Right doors (open/close)', checked: false },
    { id: newId(), category: 'Right View', section: 'Right Side', label: 'Right mirror condition', checked: false },
    { id: newId(), category: 'Right View', section: 'Right Side', label: 'Right side trim/moulding', checked: false },
    { id: newId(), category: 'Right View', section: 'Right Side', label: 'Right window operation', checked: false },
    // Left View
    { id: newId(), category: 'Left View', section: 'Left Side', label: 'Left fender condition', checked: false },
    { id: newId(), category: 'Left View', section: 'Left Side', label: 'Left doors (open/close)', checked: false },
    { id: newId(), category: 'Left View', section: 'Left Side', label: 'Left mirror condition', checked: false },
    { id: newId(), category: 'Left View', section: 'Left Side', label: 'Left side trim/moulding', checked: false },
    { id: newId(), category: 'Left View', section: 'Left Side', label: 'Left window operation', checked: false },
    // Rear View
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Tail lights', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Brake lights', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Reverse lights', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Rear bumper condition', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Trunk/boot operation', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Rear windshield condition', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Rear wiper', checked: false },
    { id: newId(), category: 'Rear View', section: 'Rear', label: 'Exhaust tip condition', checked: false },
    // Interior View
    { id: newId(), category: 'Interior View', section: 'Dashboard', label: 'Dashboard lights and gauges', checked: false },
    { id: newId(), category: 'Interior View', section: 'Dashboard', label: 'Air conditioning', checked: false },
    { id: newId(), category: 'Interior View', section: 'Dashboard', label: 'Heater operation', checked: false },
    { id: newId(), category: 'Interior View', section: 'Seats', label: 'Driver seat adjustment', checked: false },
    { id: newId(), category: 'Interior View', section: 'Seats', label: 'Seat belts all positions', checked: false },
    { id: newId(), category: 'Interior View', section: 'Interior', label: 'Horn operation', checked: false },
    { id: newId(), category: 'Interior View', section: 'Interior', label: 'Interior lights', checked: false },
    { id: newId(), category: 'Interior View', section: 'Interior', label: 'Rear View Mirror', checked: false },
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
  vehicleSize: CWVehicleSize
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
  vehicleSize: CWVehicleSize
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
  ratePerHr?: number
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
export type CreateConcernInput = { categoryId: string; code: string; name: string; processTimeMins?: number }
export type UpdateConcernInput = { name: string; code?: string; status: CWConcernStatus }

// ─── Services ─────────────────────────────────────────────────────────────────

export type CreateServiceInput = {
  code: string
  category: string
  section?: string
  description: string
  vehicleSize?: CWVehicleSize
  severity?: CWServiceSeverity
  processTimeMins: number
  ratePerHr?: number
  price: number
  shopId: string
  stages?: CWServiceStageDefinition[]
  status?: CWServiceStatus
}
export type UpdateServiceInput = {
  code: string
  category: string
  section?: string
  description: string
  vehicleSize?: CWVehicleSize
  severity?: CWServiceSeverity
  processTimeMins: number
  ratePerHr?: number
  price: number
  shopId: string
  stages?: CWServiceStageDefinition[]
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
  partNumber: string
  description?: string
  category?: string
  brand?: string
  modelVariant?: string
  vehicleFitment?: string[]
  alternatePartNumbers?: string[]
  mediaUrls?: string[]
  rackLocation?: string
  binNumber?: string
  reorderLevel?: number
  defaultSellPrice?: number
  stockCount?: number
  status?: 'Active' | 'Inactive'
  createdByUserId?: string
}
export type UpdatePartInput = {
  name: string
  partNumber: string
  description?: string
  category?: string
  brand?: string
  modelVariant?: string
  vehicleFitment?: string[]
  alternatePartNumbers?: string[]
  mediaUrls?: string[]
  rackLocation?: string
  binNumber?: string
  reorderLevel?: number
  stockCount?: number
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
export type CreateVendorInput = {
  name: string
  code: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  sourcingType: 'Local' | 'Foreign'
  preferred?: boolean
}
export type UpdateVendorInput = CreateVendorInput & {
  status: 'Active' | 'Inactive'
}
export type UpsertVendorPartPriceInput = {
  vendorId: string
  partId: string
  unitPrice: number
  currency: 'BDT' | 'USD' | 'EUR'
  leadTimeDays: number
  sourcingType: 'OEM' | 'Genuine' | 'Aftermarket'
  moq?: number
}

// Estimation inputs
export type CreateEstimateLineInput = {
  appointmentId: string
  concernItemId?: string
  description: string
  mediaUrls?: string[]
  requestedByUserId: string
  quantity?: number
}

export type IdentifyEstimateLineInput = {
  partId: string
  partNumber: string
  partName: string
  identifiedByUserId: string
}

export type PriceEstimateLineInput = {
  vendorId: string
  unitPrice: number
  sellPrice: number
  quantity: number
  sourcingType: 'OEM' | 'Genuine' | 'Aftermarket'
  currency?: 'BDT' | 'USD' | 'EUR'
  inStock: boolean
  estimatedDeliveryDate?: string
  advanceRequired?: boolean
  pricedByUserId: string
  options?: Array<{
    vendorId: string
    vendorName: string
    sourcingType: 'OEM' | 'Genuine' | 'Aftermarket'
    unitPrice: number
    sellPrice: number
  }>
}

// Purchase Order inputs
export type CreatePurchaseOrderInput = {
  vendorId: string
  currency: 'BDT' | 'USD' | 'EUR'
  sourcingType: 'Local' | 'Foreign'
  expectedArrivalDate: string
  advanceRequired: boolean
  lines: Array<{
    partId: string
    partNumber: string
    partName: string
    quantity: number
    unitPrice: number
    discount?: number
    estimateLineId?: string
  }>
  createdByUserId: string
}

export type CreateGRNInput = {
  poId: string
  receivedByUserId: string
  lines: Array<{
    poLineId: string
    partId: string
    receivedQty: number
    acceptedQty: number
    rejectedQty: number
    sellPrice: number
    condition: 'Good' | 'Damaged' | 'Wrong Item'
    notes?: string
  }>
  notes?: string
  discrepancyNotes?: string
}

// Requisition inputs
export type CreateRequisitionInput = {
  appointmentId: string
  requestedByUserId: string
  lines: Array<{
    partId: string
    partNumber: string
    partName: string
    quantity: number
    estimateLineId?: string
  }>
}

// Return inputs
export type CreatePartReturnInput = {
  requisitionId: string
  requisitionLineId: string
  partId: string
  stockUnitId: string
  appointmentId: string
  reasonCode: 'Defective' | 'Wrong Part' | 'Not Used' | 'Excess'
  raisedByUserId: string
  photoUrl?: string
}

// Notification input
export type CreateNotificationInput = {
  title: string
  message: string
  category: CWNotificationCategory
  targetRoles: string[]
  targetUserId?: string
  actionUrl?: string
  referenceId?: string
}

// Invoice inputs
export type CreateInvoiceInput = {
  appointmentId: string
  lines: Array<{
    partId: string
    partNumber: string
    partName: string
    quantity: number
    unitPrice: number
    sellPrice: number
    requisitionLineId?: string
  }>
  taxRate: number
  advanceApplied?: number
  createdByUserId: string
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
  ratePerHr?: number
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
  itemType: 'concern' | 'service' | 'stage'
  techAssignmentId: string
  stageItemId?: string  // required when itemType === 'stage'
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
  assignConcernDiagnosis: (input: AssignConcernDiagnosisInput) => Promise<void>
  assignConcernTechnicians: (input: AssignConcernTechniciansInput) => void
  setConcernWorkStatus: (input: SetConcernWorkStatusInput) => void
  assignServiceSE: (input: AssignServiceSEInput) => Promise<void>
  assignServiceTechnicians: (input: AssignServiceTechniciansInput) => void
  // Stage-level scheduling (JC assigns per stage)
  assignStageSchedule: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    bayId: string
    teamId?: string
    seUserId?: string
    startAt: string
    endAt: string
  }) => void
  setStageWorkStatus: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    status: CWStageWorkStatus
  }) => void
  assignStageTechnicians: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    technicianUserIds: string[]
  }) => void
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

  // Assign SA to existing appointment
  assignSA: (appointmentId: string, saUserId: string) => void

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

  // Parts Division (Phase 2)
  parts: CWPart[]
  partRequests: CWPartRequest[]
  partStockUnits: CWPartStockUnit[]
  vendors: CWVendor[]
  vendorPartPrices: CWVendorPartPrice[]
  estimateLines: CWEstimateLine[]
  purchaseOrders: CWPurchaseOrder[]
  goodsReceiptNotes: CWGoodsReceiptNote[]
  requisitions: CWRequisition[]
  partReturns: CWPartReturn[]
  vendorClaims: CWVendorClaim[]

  // Part catalog actions
  createPart: (input: CreatePartInput) => CWPart
  updatePart: (id: string, input: UpdatePartInput) => void

  // Part request actions (legacy)
  createPartRequest: (input: CreatePartRequestInput) => CWPartRequest
  labelPartRequest: (id: string, input: LabelPartRequestInput) => void
  setPartRequestStatus: (id: string, status: CWPartRequestStatus) => Promise<void>
  refreshPartRequests: () => Promise<void>
  refreshAppointments: () => Promise<void>

  // Vendor actions
  createVendor: (input: CreateVendorInput) => CWVendor
  updateVendor: (id: string, input: UpdateVendorInput) => void
  upsertVendorPartPrice: (input: UpsertVendorPartPriceInput) => void

  // Estimation actions
  createEstimateLine: (input: CreateEstimateLineInput) => CWEstimateLine
  identifyEstimateLine: (id: string, input: IdentifyEstimateLineInput) => void
  priceEstimateLine: (id: string, input: PriceEstimateLineInput) => void
  submitEstimateLines: (appointmentId: string, submittedByUserId: string) => void
  approveEstimateLine: (id: string, approvedByUserId: string) => void
  declineEstimateLine: (id: string, declinedByUserId: string) => void
  getEstimateLinesForAppointment: (appointmentId: string) => CWEstimateLine[]

  // Purchase Order actions
  createPurchaseOrder: (input: CreatePurchaseOrderInput) => CWPurchaseOrder
  submitPurchaseOrder: (id: string, submittedByUserId: string) => void
  approvePurchaseOrder: (id: string, approvedByUserId: string) => void
  rejectPurchaseOrder: (id: string, reason: string, rejectedByUserId: string) => void
  confirmAdvance: (id: string, confirmedByUserId: string) => void
  cancelPurchaseOrder: (id: string) => void
  createGRN: (input: CreateGRNInput) => CWGoodsReceiptNote

  // Stock Unit actions
  addStockUnits: (units: CWPartStockUnit[]) => void
  getStockUnitsForPart: (partId: string) => CWPartStockUnit[]
  getFIFOSellPrice: (partId: string) => number | undefined
  getAvailableStock: (partId: string) => number
  deductStock: (partId: string, qty: number) => Array<{ stockUnitId: string; quantityTaken: number; costPrice: number; sellPrice: number }>

  // Requisition actions
  createRequisition: (input: CreateRequisitionInput) => CWRequisition
  acknowledgeRequisition: (id: string, acknowledgedByUserId: string) => void
  pickRequisitionLine: (reqId: string, lineId: string, pickedByUserId: string) => void
  collectRequisition: (id: string, proofUrl: string) => void
  receiveRequisition: (id: string, proofUrl: string) => void

  // Return actions
  createPartReturn: (input: CreatePartReturnInput) => CWPartReturn
  receiveReturn: (id: string, receivedByUserId: string) => void
  disposeReturn: (id: string, disposition: 'Restockable' | 'Defective-RTV', disposedByUserId: string) => void

  // Notification actions
  notifications: CWNotification[]
  createNotification: (input: CreateNotificationInput) => CWNotification
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  getUnreadCount: () => number

  // Invoice actions
  invoices: CWInvoice[]
  createInvoice: (input: CreateInvoiceInput) => CWInvoice
  issueInvoice: (id: string, issuedByUserId: string) => void
  markInvoicePaid: (id: string) => void

  // Inventory helpers
  getPartStockStatus: (part: CWPart) => 'In Stock' | 'Low Stock' | 'Out of Stock'
  getLowStockParts: () => CWPart[]
  getSlowMovers: () => CWPart[]

  // Bay availability check
  checkBayAvailability: (bayId: string, startTime: string, endTime: string, excludeAppointmentId?: string) => boolean
  hydrateFromBackend: () => Promise<void>

  // Call records (CRE CDR)
  callRecords: CWCallRecord[]
  addCallRecord: (input: Omit<CWCallRecord, 'id'>) => CWCallRecord

  // Reminders (CRE follow-ups)
  reminders: CWReminder[]
  createReminder: (input: Omit<CWReminder, 'id' | 'createdAt'>) => CWReminder
  markReminderSent: (id: string) => void
  cancelReminder: (id: string) => void
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
      vehicleSize: 'Medium',
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
      vehicleSize: 'Small',
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
  const parts: CWPart[] = []

  // ── Vendors seed ──
  const vendors: CWVendor[] = []

  const vendorPartPrices: CWVendorPartPrice[] = []

  // ── Notifications seed ──
  const notifications: CWNotification[] = []

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
    vendors,
    vendorPartPrices,
    notifications,
  }
}

const DEMO_SEED = seedDemoData()

// Client CSV seed data — 268 concerns, 4341 services
// Built from instructions/Customer_Concern_Codes_0526.csv and instructions/Task_Master_Full.csv
import { buildConcernsSeed, buildServicesSeed } from './seedBuilder'

function seedConcernsData(autoShopId: string, _paintShopId: string, _bodyShopId: string): { concernCategories: CWConcernCategory[]; concerns: CWConcern[] } {
  void _paintShopId
  void _bodyShopId
  return buildConcernsSeed(autoShopId)
}

function seedServicesData(autoShopId: string, paintShopId: string, bodyShopId: string): CWService[] {
  return buildServicesSeed(autoShopId, paintShopId, bodyShopId)
}

// Keep legacy markers for reference — original inline seed data removed
// Old: 65 concerns across 16 categories (demo data)
// New: 268 concerns across 37 categories (client CSV)
// Old: ~200 services (demo data)
// New: 4341 services with stages (client Task Master)

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
  // Override seed data — backend provides via hydrateFromBackend
  users: [],
  customers: [],
  vehicles: [],
  appointments: [],
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
  partStockUnits: [],
  vendors: DEMO_SEED.vendors,
  vendorPartPrices: DEMO_SEED.vendorPartPrices,
  estimateLines: [],
  purchaseOrders: [],
  goodsReceiptNotes: [],
  requisitions: [],
  partReturns: [],
  vendorClaims: [],
  callRecords: [],
  reminders: [],
  notifications: DEMO_SEED.notifications,
  invoices: [],

  hydrateFromBackend: async () => {
    const fetchAll = async <T,>(
      loader: (page: number, pageSize: number) => Promise<{ data: T[]; meta: { total: number } }>,
    ) => {
      const pageSize = 100
      const first = await loader(1, pageSize)
      const total = first.meta.total ?? first.data.length
      if (first.data.length >= total) return first.data
      const pages = [first.data]
      let page = 2
      while ((page - 1) * pageSize < total) {
        const next = await loader(page, pageSize)
        pages.push(next.data)
        if (!next.data.length) break
        page += 1
      }
      return pages.flat()
    }

    const [
      shops,
      bays,
      roles,
      users,
      customers,
      vehicles,
      appointments,
      concernCategories,
      concerns,
      services,
      teams,
      taskTemplates,
      pendingVehicles,
      jobs,
      tasks,
      callRecords,
      reminders,
      partRequests,
    ] = await Promise.all([
      workshopApi.listShops(),
      fetchAll((page, pageSize) => workshopApi.listBays({ page, pageSize })),
      workshopApi.listRoles(false),
      fetchAll((page, pageSize) => workshopApi.listUsers({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listCustomers({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listVehicles({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listAppointments({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listConcernCategories({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listConcerns({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listServices({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listTeams({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listTaskTemplates({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listPendingVehicles({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listJobs({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listTasks({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listCallRecords({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listReminders({ page, pageSize })),
      fetchAll((page, pageSize) => workshopApi.listPartRequests({ page, pageSize })),
    ])

    set({
      shops: shops.data,
      bays,
      roles: roles.data,
      users,
      customers,
      vehicles,
      appointments,
      concernCategories,
      concerns,
      services,
      teams,
      taskTemplates,
      pendingVehicles,
      jobs,
      tasks,
      callRecords,
      reminders,
      partRequests,
    })
  },

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
    syncBackend(workshopApi.updateShop(shopId, input), 'update shop')
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
    syncBackend(workshopApi.createUser(input), 'create user')
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
    syncBackend(workshopApi.updateUser(userId, input), 'update user')
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
    syncBackend(workshopApi.setUserStatus(userId, status), 'user status')
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
    syncBackend(workshopApi.createCustomer(input), 'create customer')
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
    syncBackend(workshopApi.updateCustomer(customerId, input), 'update customer')
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
    if (!input.vehicleSize) throw new Error('Vehicle size is required')

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
      vehicleCategory: input.vehicleCategory || undefined,
      vehicleSize: input.vehicleSize,
      modelVariant: (input.modelVariant ?? '').trim() || undefined,
      countryOfOrigin: input.countryOfOrigin || undefined,
      countryOfAssembly: input.countryOfAssembly || undefined,
      exteriorColor: input.exteriorColor || undefined,
      exteriorColorCode: (input.exteriorColorCode ?? '').trim() || undefined,
      interiorColor: input.interiorColor || undefined,
      interiorColorCode: (input.interiorColorCode ?? '').trim() || undefined,
      tyreSize: input.tyreSize || undefined,
      additionalNotes: (input.additionalNotes ?? '').trim() || undefined,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }

    set({ vehicles: [vehicle, ...vehicles] })
    syncBackend(workshopApi.createVehicle(input), 'create vehicle')
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
    const existingVehicle = vehicles.find((v) => v.id === vehicleId)
    if (!existingVehicle) throw new Error('Vehicle not found')

    // Prevent customer reassignment if vehicle has active appointments
    if (existingVehicle.customerId !== customerId) {
      const activeAppointments = get().appointments.filter(
        (a) => a.vehicleId === vehicleId && !['Released', 'Payment Done'].includes(a.status)
      )
      if (activeAppointments.length > 0) {
        throw new Error(
          `Cannot reassign vehicle to different customer — ${activeAppointments.length} active appointment(s) exist. Complete or cancel them first.`
        )
      }
    }

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
              vehicleCategory: input.vehicleCategory || undefined,
              vehicleSize: input.vehicleSize,
              modelVariant: (input.modelVariant ?? '').trim() || undefined,
              countryOfOrigin: input.countryOfOrigin || undefined,
              countryOfAssembly: input.countryOfAssembly || undefined,
              exteriorColor: input.exteriorColor || undefined,
              exteriorColorCode: (input.exteriorColorCode ?? '').trim() || undefined,
              interiorColor: input.interiorColor || undefined,
              interiorColorCode: (input.interiorColorCode ?? '').trim() || undefined,
              tyreSize: input.tyreSize || undefined,
              additionalNotes: (input.additionalNotes ?? '').trim() || undefined,
              status: input.status,
              updatedAt: nowIso(),
            }
          : v,
      ),
    })
    syncBackend(workshopApi.updateVehicle(vehicleId, input), 'update vehicle')
  },

  createAppointment: (input) => {
    if (!input.customerId) throw new Error('Customer is required')
    if (!input.vehicleId) throw new Error('Vehicle is required')

    const customers = get().customers
    const vehicles = get().vehicles
    if (!customers.some((c) => c.id === input.customerId)) throw new Error('Customer not found')
    const vehicle = vehicles.find((v) => v.id === input.vehicleId)
    if (!vehicle) throw new Error('Vehicle not found')
    if (vehicle.customerId !== input.customerId) throw new Error('Vehicle does not belong to selected customer')

    const scheduledAt = (input.scheduledAt ?? '').trim()
    if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) throw new Error('Invalid scheduled date')

    const allServices = get().services
    const ts = nowIso()

    const defaultChecks = buildDefaultInspectionChecks()

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
      serviceItems: (input.serviceItems ?? []).map((s) => {
        // Auto-populate stageItems from service stage definitions
        const svcDef = allServices.find((sv) => sv.id === s.serviceId)
        const stages = svcDef?.stages
        let stageItems: CWAppointmentServiceStageItem[] | undefined
        if (stages && stages.length > 0) {
          const sorted = [...stages].sort((a, b) => a.order - b.order)
          let prevId: string | undefined
          stageItems = sorted.map((stage) => {
            const itemId = newId()
            const item: CWAppointmentServiceStageItem = {
              id: itemId,
              stageDefinitionId: stage.id,
              stageName: stage.name,
              stageOrder: stage.order,
              durationMins: stage.durationMins,
              technicianAssignments: [],
              dependsOnStageId: prevId,
              workStatus: 'Pending',
            }
            prevId = itemId
            return item
          })
        }
        return {
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
          stageItems,
        }
      }),
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
    syncBackend(workshopApi.createAppointment(input), 'create appointment')
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
    syncBackend(workshopApi.updateAppointment(appointmentId, input), 'update appointment')
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
    syncBackend(workshopApi.transitionAppointment(appointmentId, status), 'appointment status')
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
    syncBackend(workshopApi.updateAppointment(appointmentId, { gateEntryId }), 'appointment gate entry')
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
    syncBackend(
      workshopApi.addAppointmentConcern(input.appointmentId, {
        concernId: input.concernId,
        remark: input.remark,
      }),
      'appointment concern add',
    )
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
    syncBackend(workshopApi.removeAppointmentConcern(appointmentId, itemId), 'appointment concern remove')
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
    syncBackend(
      workshopApi.updateAppointmentConcern(appointmentId, itemId, { remark: remark.trim() }),
      'appointment concern remark',
    )
  },

  updateConcernItemServices: (appointmentId, itemId, serviceIds) => {
    const allServices = get().services
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== appointmentId) return a

        // Update concern item serviceIds
        const updatedConcerns = a.concernItems.map((i) =>
          i.id === itemId ? { ...i, serviceIds } : i,
        )

        // Collect all service catalog IDs referenced by ANY concern in this appointment
        const allConcernServiceIds = new Set<string>()
        for (const c of updatedConcerns) {
          for (const sid of c.serviceIds ?? []) allConcernServiceIds.add(sid)
        }

        // Add new services to serviceItems that aren't already present
        const existingServiceIds = new Set(a.serviceItems.map((s) => s.serviceId))
        const newServiceItems = [...a.serviceItems]
        for (const sid of serviceIds) {
          if (!existingServiceIds.has(sid)) {
            const catalogSvc = allServices.find((s) => s.id === sid)
            if (catalogSvc) {
              newServiceItems.push({
                id: newId(),
                serviceId: catalogSvc.id,
                serviceCode: catalogSvc.code,
                serviceDescription: catalogSvc.description,
                processTimeMins: catalogSvc.processTimeMins,
                ratePerHr: catalogSvc.ratePerHr,
                price: catalogSvc.price,
                remark: '',
                addedBySA: false,
                technicianAssignments: [],
              })
            }
          }
        }

        // Remove serviceItems that were unlinked from ALL concerns and were concern-sourced
        // (only remove if serviceId is no longer in any concern's serviceIds)
        const prevConcernServiceIds = new Set<string>()
        for (const c of a.concernItems) {
          for (const sid of c.serviceIds ?? []) prevConcernServiceIds.add(sid)
        }
        const removedServiceIds = new Set<string>()
        for (const sid of prevConcernServiceIds) {
          if (!allConcernServiceIds.has(sid)) removedServiceIds.add(sid)
        }
        const finalServiceItems = newServiceItems.filter(
          (s) => !removedServiceIds.has(s.serviceId),
        )

        return {
          ...a,
          concernItems: updatedConcerns,
          serviceItems: finalServiceItems,
          updatedAt: nowIso(),
        }
      }),
    })
    syncBackend(
      workshopApi.updateAppointmentConcern(appointmentId, itemId, { serviceIds }),
      'appointment concern services',
    )
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
    syncBackend(
      workshopApi.updateAppointmentConcern(appointmentId, itemId, { remark }),
      'appointment diagnosis remark',
    )
  },

  addAppointmentService: (input) => {
    // Look up the service to check for stages
    const service = get().services.find((s) => s.id === input.serviceId)
    const stages = service?.stages

    // Auto-populate stageItems from service stage definitions
    let stageItems: CWAppointmentServiceStageItem[] | undefined
    if (stages && stages.length > 0) {
      const sorted = [...stages].sort((a, b) => a.order - b.order)
      let prevId: string | undefined
      stageItems = sorted.map((stage) => {
        const itemId = newId()
        const item: CWAppointmentServiceStageItem = {
          id: itemId,
          stageDefinitionId: stage.id,
          stageName: stage.name,
          stageOrder: stage.order,
          durationMins: stage.durationMins,
          technicianAssignments: [],
          dependsOnStageId: prevId,
          workStatus: 'Pending',
        }
        prevId = itemId
        return item
      })
    }

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
      stageItems,
    }
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? { ...a, serviceItems: [...a.serviceItems, item], updatedAt: nowIso() }
          : a,
      ),
    })
    syncBackend(
      workshopApi.addAppointmentService(input.appointmentId, {
        serviceId: input.serviceId,
        remark: input.remark,
        addedBySA: input.addedBySA,
      }),
      'appointment service add',
    )
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
    syncBackend(workshopApi.removeAppointmentService(appointmentId, itemId), 'appointment service remove')
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
    syncBackend(
      workshopApi.updateAppointmentService(appointmentId, itemId, {
        remark: input.remark,
        price: input.price,
        addedBySA: input.addedBySA,
      }),
      'appointment service update',
    )
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
    syncBackend(
      workshopApi.sendWhatsapp({
        appointmentId: input.appointmentId,
        direction: input.direction,
        message: input.message,
      }),
      'whatsapp log',
    )
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
    syncBackend(
      workshopApi.setCustomerApproval(input.appointmentId, { status: input.status, note: input.note }),
      'customer approval',
    )
  },

  // ─── New flow: JC assigns SE to concerns/services, SE assigns technicians ────

  assignConcernDiagnosis: async (input) => {
    // Optimistic local update
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
    try {
      const updated = await workshopApi.assignConcernDiagnosis(input)
      // Merge backend response into store to ensure persisted state
      set({
        appointments: get().appointments.map((a) =>
          a.id === updated.id ? updated : a,
        ),
      })
    } catch (err) {
      console.error('Failed to assign concern diagnosis', err)
      throw err
    }
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
    syncBackend(workshopApi.assignConcernTechnicians(input), 'assign concern technicians')
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
    syncBackend(workshopApi.setConcernWorkStatus(input), 'concern work status')
  },

  assignServiceSE: async (input) => {
    // Optimistic local update
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
    try {
      const updated = await workshopApi.assignServiceSE(input)
      set({
        appointments: get().appointments.map((a) =>
          a.id === updated.id ? updated : a,
        ),
      })
    } catch (err) {
      console.error('Failed to assign service SE', err)
      throw err
    }
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
    syncBackend(workshopApi.assignServiceTechnicians(input), 'assign service technicians')
  },

  // ─── Stage-level scheduling (JC assigns per stage) ─────────────────────────

  assignStageSchedule: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    bayId: string
    teamId?: string
    seUserId?: string
    startAt: string
    endAt: string
  }) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((s) =>
                s.id === input.serviceItemId && s.stageItems
                  ? {
                      ...s,
                      stageItems: s.stageItems.map((st) =>
                        st.id === input.stageItemId
                          ? {
                              ...st,
                              bayId: input.bayId,
                              teamId: input.teamId,
                              assignedSEUserId: input.seUserId,
                              plannedStartAt: input.startAt,
                              plannedEndAt: input.endAt,
                              workStatus: 'Scheduled' as const,
                            }
                          : st,
                      ),
                    }
                  : s,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
    syncBackend(workshopApi.assignStageSchedule(input), 'stage schedule')
  },

  setStageWorkStatus: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    status: CWStageWorkStatus
  }) => {
    const ts = nowIso()
    set({
      appointments: get().appointments.map((a) =>
        a.id === input.appointmentId
          ? {
              ...a,
              serviceItems: a.serviceItems.map((s) => {
                if (s.id !== input.serviceItemId || !s.stageItems) return s
                const updatedStages = s.stageItems.map((st) =>
                  st.id === input.stageItemId
                    ? {
                        ...st,
                        workStatus: input.status,
                        ...(input.status === 'In Progress' && !st.actualStartAt ? { actualStartAt: ts } : {}),
                        ...(input.status === 'Completed' ? { actualEndAt: ts } : {}),
                      }
                    : st,
                )
                const allStagesDone = updatedStages.every((st) => st.workStatus === 'Completed')
                return {
                  ...s,
                  stageItems: updatedStages,
                  workStatus: allStagesDone ? 'Completed' as const : s.workStatus,
                }
              }),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
    syncBackend(workshopApi.setStageWorkStatus(input), 'stage work status')
  },

  assignStageTechnicians: (input: {
    appointmentId: string
    serviceItemId: string
    stageItemId: string
    technicianUserIds: string[]
  }) => {
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
                s.id === input.serviceItemId && s.stageItems
                  ? {
                      ...s,
                      stageItems: s.stageItems.map((st) =>
                        st.id === input.stageItemId
                          ? { ...st, technicianAssignments: [...st.technicianAssignments, ...newAssignments] }
                          : st,
                      ),
                    }
                  : s,
              ),
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
    syncBackend(workshopApi.assignStageTechnicians(input), 'assign stage technicians')
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
    syncBackend(workshopApi.submitAppointmentInspection(input), 'submit inspection')
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
        const mapTech = (ta: CWTechnicianAssignment[]) =>
          ta.map((t) =>
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
            : input.itemType === 'stage'
            ? a.serviceItems.map((s) => s.id === input.itemId && s.stageItems
                ? { ...s, stageItems: s.stageItems.map((st) => st.id === input.stageItemId ? { ...st, technicianAssignments: mapTech(st.technicianAssignments), workStatus: 'In Progress' as const } : st) }
                : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
    syncBackend(workshopApi.startTechnicianTimer(input), 'start technician timer')
  },

  pauseTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: CWTechnicianAssignment[]) =>
          ta.map((t) =>
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
            : input.itemType === 'stage'
            ? a.serviceItems.map((s) => s.id === input.itemId && s.stageItems
                ? { ...s, stageItems: s.stageItems.map((st) => st.id === input.stageItemId ? { ...st, technicianAssignments: mapTech(st.technicianAssignments) } : st) }
                : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
    syncBackend(workshopApi.pauseTechnicianTimer(input), 'pause technician timer')
  },

  resumeTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: CWTechnicianAssignment[]) =>
          ta.map((t) => {
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
            : input.itemType === 'stage'
            ? a.serviceItems.map((s) => s.id === input.itemId && s.stageItems
                ? { ...s, stageItems: s.stageItems.map((st) => st.id === input.stageItemId ? { ...st, technicianAssignments: mapTech(st.technicianAssignments) } : st) }
                : s)
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
    syncBackend(workshopApi.resumeTechnicianTimer(input), 'resume technician timer')
  },

  completeTechnicianTimer: (input) => {
    const now = nowIso()
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        const mapTech = (ta: CWTechnicianAssignment[]) =>
          ta.map((t) => {
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
        const markItemComplete = <T extends { technicianAssignments: CWTechnicianAssignment[]; workStatus?: CWConcernWorkStatus | CWServiceWorkStatus | CWStageWorkStatus }>(item: T) => {
          const updated = mapTech(item.technicianAssignments)
          const allDone = updated.every((t) => t.status === 'Completed')
          return { ...item, technicianAssignments: updated, workStatus: allDone ? 'Completed' as const : item.workStatus }
        }

        return {
          ...a,
          concernItems: input.itemType === 'concern'
            ? a.concernItems.map((c) => c.id === input.itemId ? markItemComplete(c) : c)
            : a.concernItems,
          serviceItems: input.itemType === 'service'
            ? a.serviceItems.map((s) => s.id === input.itemId ? markItemComplete(s) : s)
            : input.itemType === 'stage'
            ? a.serviceItems.map((s) => {
                if (s.id !== input.itemId || !s.stageItems) return s
                const updatedStages = s.stageItems.map((st) => st.id === input.stageItemId ? markItemComplete(st) : st)
                const allStagesDone = updatedStages.every((st) => st.workStatus === 'Completed')
                return { ...s, stageItems: updatedStages, workStatus: allStagesDone ? 'Completed' as const : s.workStatus }
              })
            : a.serviceItems,
          updatedAt: now,
        }
      }),
    })
    syncBackend(workshopApi.completeTechnicianTimer(input), 'complete technician timer')
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
    syncBackend(workshopApi.submitInspectionComplete({ appointmentId: input.appointmentId, actorName: input.actorName }), 'diagnosis complete')
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
    syncBackend(workshopApi.submitServiceComplete({ appointmentId: input.appointmentId, actorName: input.actorName }), 'service complete')
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
    syncBackend(workshopApi.assignQc(input.appointmentId, input.qcUserId), 'assign qc')
  },

  qcApprove: (input) => {
    set({
      appointments: get().appointments.map((a) => {
        if (a.id !== input.appointmentId) return a
        // QC only verifies services, not concerns
        const serviceItems = a.serviceItems.map((s) => {
          const v = input.items.find((i) => i.itemId === s.id && i.itemType === 'service')
          return v ? { ...s, qcStatus: v.status as CWQCItemStatus, qcNote: v.note } : s
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
    syncBackend(
      workshopApi.qcApprove(input.appointmentId, {
        items: input.items as Array<{ itemId: string; itemType: string; status: string; note?: string }>,
      }),
      'qc approve',
    )
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
            qcStatus: v.status as CWQCItemStatus,
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
    syncBackend(
      workshopApi.qcReject(input.appointmentId, {
        rejectionNote: input.rejectionNote,
        items: input.items as Array<{ itemId: string; itemType: string; status: string; note?: string }>,
      }),
      'qc reject',
    )
  },

  assignSA: (appointmentId, saUserId) => {
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              assignedSAUserId: saUserId,
              status: a.status === 'New' ? 'SA Inspection' as const : a.status,
              inspectionChecks: a.status === 'New' && a.inspectionChecks.length === 0 ? buildDefaultInspectionChecks() : a.inspectionChecks,
              timeline: [
                ...a.timeline,
                {
                  id: newId(),
                  timestamp: nowIso(),
                  actor: 'CRE',
                  action: `Service Advisor assigned`,
                },
              ],
              updatedAt: nowIso(),
            }
          : a,
      ),
    })
    syncBackend(workshopApi.assignAppointmentSa(appointmentId, saUserId), 'assign sa')
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
    syncBackend(workshopApi.confirmPayment(input.appointmentId, { actorName: input.actorName }), 'confirm payment')
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
    syncBackend(workshopApi.releaseVehicle(input.appointmentId), 'release vehicle')
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
    if (input.workStatus !== undefined) {
      syncBackend(
        workshopApi.setServiceWorkStatus({
          appointmentId: input.appointmentId,
          serviceItemId: input.serviceItemId,
          status: input.workStatus,
        }),
        'service work status',
      )
    }
  },

  // ─── Concern Admin ──────────────────────────────────────────────────────────

  createConcernCategory: (input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Category name is required')
    if (!input.shopId) throw new Error('Shop is required')
    const ts = nowIso()
    const cat: CWConcernCategory = { id: newId(), name, shopId: input.shopId, status: 'Active', createdAt: ts, updatedAt: ts }
    set({ concernCategories: [cat, ...get().concernCategories] })
    syncBackend(workshopApi.createConcernCategory(input), 'create concern category')
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
    syncBackend(workshopApi.updateConcernCategory(id, input), 'update concern category')
  },

  createConcern: (input) => {
    const name = input.name.trim()
    const code = (input.code ?? '').trim()
    if (!name) throw new Error('Concern name is required')
    if (!input.categoryId) throw new Error('Category is required')
    const ts = nowIso()
    const concern: CWConcern = {
      id: newId(),
      categoryId: input.categoryId,
      code,
      name,
      processTimeMins: input.processTimeMins,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ concerns: [concern, ...get().concerns] })
    syncBackend(workshopApi.createConcern(input), 'create concern')
    return concern
  },

  updateConcern: (id, input) => {
    const name = input.name.trim()
    if (!name) throw new Error('Concern name is required')
    set({
      concerns: get().concerns.map((c) =>
        c.id === id ? { ...c, name, code: input.code !== undefined ? input.code : c.code, status: input.status, updatedAt: nowIso() } : c,
      ),
    })
    syncBackend(workshopApi.updateConcern(id, input), 'update concern')
  },

  // ─── Service Admin ──────────────────────────────────────────────────────────

  createService: (input) => {
    const ts = nowIso()
    const svc: CWService = {
      id: newId(),
      code: input.code.trim(),
      category: input.category.trim(),
      section: input.section?.trim() || undefined,
      description: input.description.trim(),
      vehicleSize: input.vehicleSize,
      severity: input.severity,
      processTimeMins: input.processTimeMins,
      ratePerHr: input.ratePerHr,
      price: input.price,
      shopId: input.shopId,
      stages: input.stages,
      status: input.status ?? 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ services: [svc, ...get().services] })
    syncBackend(workshopApi.createService(input), 'create service')
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
              section: input.section?.trim() || undefined,
              description: input.description.trim(),
              vehicleSize: input.vehicleSize,
              severity: input.severity,
              processTimeMins: input.processTimeMins,
              ratePerHr: input.ratePerHr,
              price: input.price,
              shopId: input.shopId,
              stages: input.stages,
              status: input.status,
              updatedAt: nowIso(),
            }
          : s,
      ),
    })
    syncBackend(workshopApi.updateService(id, input), 'update service')
  },

  setServiceStatus: (id, status) => {
    set({
      services: get().services.map((s) =>
        s.id === id ? { ...s, status, updatedAt: nowIso() } : s,
      ),
    })
    syncBackend(workshopApi.setServiceStatus(id, status), 'service status')
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
    syncBackend(workshopApi.createTaskTemplate(input), 'create task template')
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
    syncBackend(workshopApi.updateTaskTemplate(templateId, input), 'update task template')
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
    syncBackend(workshopApi.setTaskTemplateStatus(templateId, status), 'task template status')
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
    syncBackend(workshopApi.overrideTaskDependency(taskId, normalized), 'task dependency override')
  },

  setTaskSourceConcern: (taskId, concernId) => {
    set({
      tasks: get().tasks.map((t) =>
        t.id === taskId
          ? { ...t, sourceConcernId: concernId ?? undefined, updatedAt: nowIso() }
          : t,
      ),
    })
    syncBackend(workshopApi.setTaskSourceConcern(taskId, concernId ?? null), 'task source concern')
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
    syncBackend(workshopApi.guardEntry({ registrationNo, appointmentId: input.appointmentId }), 'pending vehicle entry')
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
    syncBackend(workshopApi.setPendingVehicleStatus(pendingVehicleId, status), 'pending vehicle status')
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
    syncBackend(
      workshopApi.resolvePendingVehicle(pendingVehicleId, {
        customerId: input.customerId,
        vehicleId: input.vehicleId,
      }),
      'resolve pending vehicle',
    )
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
                  inspectionChecks: a.inspectionChecks.length === 0 ? buildDefaultInspectionChecks() : a.inspectionChecks,
                  gateEntryId: a.gateEntryId ?? pending?.id,
                  updatedAt: nowIso(),
                }
              : a,
          )
        : get().appointments,
    })
    syncBackend(
      workshopApi.createJob({
        registrationNo,
        appointmentId,
      }),
      'create job',
    )

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
                  inspectionChecks: a.inspectionChecks.length === 0 ? buildDefaultInspectionChecks() : a.inspectionChecks,
                  gateEntryId: a.gateEntryId ?? pending?.id,
                  updatedAt: nowIso(),
                }
              : a,
          )
        : get().appointments,
    })
    syncBackend(
      workshopApi.createJobWithTasks({
        registrationNo,
        pendingVehicleId: input.pendingVehicleId,
        appointmentId,
        tasks: input.tasks,
      }),
      'create job with tasks',
    )

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
    syncBackend(workshopApi.transitionJob(jobId, status), 'job status')
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
    syncBackend(workshopApi.initiateTestDrive(jobId, input), 'job test drive')
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
    syncBackend(workshopApi.moveJobTask(jobId, taskId, direction), 'move job task')
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
    syncBackend(workshopApi.createTeam(input), 'create team')
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
    syncBackend(workshopApi.updateTeam(id, input), 'update team')
  },

  // ── Part actions ─────────────────────────────────────────────────────────────

  createPart: (input) => {
    const ts = nowIso()
    const part: CWPart = {
      id: newId(),
      name: input.name.trim(),
      partNumber: input.partNumber.trim(),
      description: input.description,
      category: input.category,
      brand: input.brand,
      modelVariant: input.modelVariant,
      vehicleFitment: input.vehicleFitment,
      alternatePartNumbers: input.alternatePartNumbers,
      mediaUrls: input.mediaUrls,
      rackLocation: input.rackLocation,
      binNumber: input.binNumber,
      reorderLevel: input.reorderLevel,
      defaultSellPrice: input.defaultSellPrice,
      stockCount: input.stockCount ?? 0,
      status: input.status ?? 'Active',
      createdByUserId: input.createdByUserId,
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
              partNumber: input.partNumber.trim(),
              description: input.description,
              category: input.category,
              brand: input.brand,
              modelVariant: input.modelVariant,
              vehicleFitment: input.vehicleFitment,
              alternatePartNumbers: input.alternatePartNumbers,
              mediaUrls: input.mediaUrls,
              rackLocation: input.rackLocation,
              binNumber: input.binNumber,
              reorderLevel: input.reorderLevel,
              stockCount: input.stockCount,
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
    syncBackend(workshopApi.createPartRequest(input), 'create part request')
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
    syncBackend(workshopApi.labelPartRequest(id, input), 'label part request')
  },

  setPartRequestStatus: async (id, status) => {
    const prev = get().partRequests.find((r) => r.id === id)
    const prevStatus = prev?.status
    // Optimistic update
    set({
      partRequests: get().partRequests.map((r) =>
        r.id === id
          ? { ...r, status, updatedAt: nowIso() }
          : r,
      ),
    })
    try {
      await workshopApi.setPartRequestStatus(id, status)
    } catch (err) {
      // Rollback on failure
      if (prevStatus) {
        set({
          partRequests: get().partRequests.map((r) =>
            r.id === id
              ? { ...r, status: prevStatus, updatedAt: nowIso() }
              : r,
          ),
        })
      }
      throw err
    }
  },

  refreshPartRequests: async () => {
    const pageSize = 100
    const first = await workshopApi.listPartRequests({ page: 1, pageSize })
    const total = first.meta.total ?? first.data.length
    if (first.data.length >= total) {
      set({ partRequests: first.data })
      return
    }
    const pages = [first.data]
    let page = 2
    while ((page - 1) * pageSize < total) {
      const next = await workshopApi.listPartRequests({ page, pageSize })
      pages.push(next.data)
      if (!next.data.length) break
      page += 1
    }
    set({ partRequests: pages.flat() })
  },

  refreshAppointments: async () => {
    const pageSize = 100
    const first = await workshopApi.listAppointments({ page: 1, pageSize })
    const total = first.meta.total ?? first.data.length
    if (first.data.length >= total) {
      set({ appointments: first.data })
      return
    }
    const pages = [first.data]
    let page = 2
    while ((page - 1) * pageSize < total) {
      const next = await workshopApi.listAppointments({ page, pageSize })
      pages.push(next.data)
      if (!next.data.length) break
      page += 1
    }
    set({ appointments: pages.flat() })
  },

  // ── Vendor actions ──────────────────────────────────────────────────────────

  createVendor: (input) => {
    const ts = nowIso()
    const vendor: CWVendor = {
      id: newId(),
      name: input.name.trim(),
      code: input.code.trim(),
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      address: input.address,
      sourcingType: input.sourcingType,
      qualityRating: 100,
      returnsHistory: 0,
      preferred: input.preferred ?? false,
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ vendors: [vendor, ...get().vendors] })
    return vendor
  },

  updateVendor: (id, input) => {
    set({
      vendors: get().vendors.map((v) =>
        v.id === id
          ? {
              ...v,
              name: input.name.trim(),
              code: input.code.trim(),
              contactPerson: input.contactPerson,
              phone: input.phone,
              email: input.email,
              address: input.address,
              sourcingType: input.sourcingType,
              preferred: input.preferred ?? v.preferred,
              status: input.status,
              updatedAt: nowIso(),
            }
          : v,
      ),
    })
  },

  upsertVendorPartPrice: (input) => {
    const existing = get().vendorPartPrices.find(
      (vp) => vp.vendorId === input.vendorId && vp.partId === input.partId && vp.sourcingType === input.sourcingType
    )
    if (existing) {
      set({
        vendorPartPrices: get().vendorPartPrices.map((vp) =>
          vp.id === existing.id
            ? { ...vp, unitPrice: input.unitPrice, currency: input.currency, leadTimeDays: input.leadTimeDays, moq: input.moq, lastUpdated: nowIso() }
            : vp,
        ),
      })
    } else {
      const vp: CWVendorPartPrice = {
        id: newId(),
        ...input,
        lastUpdated: nowIso(),
      }
      set({ vendorPartPrices: [...get().vendorPartPrices, vp] })
    }
  },

  // ── Estimation actions ────────────────────────────────────────────────────

  createEstimateLine: (input) => {
    const ts = nowIso()
    const line: CWEstimateLine = {
      id: newId(),
      appointmentId: input.appointmentId,
      concernItemId: input.concernItemId,
      description: input.description,
      mediaUrls: input.mediaUrls,
      requestedByUserId: input.requestedByUserId,
      quantity: input.quantity ?? 1,
      inStock: false,
      advanceRequired: false,
      status: 'Requested',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ estimateLines: [line, ...get().estimateLines] })
    return line
  },

  identifyEstimateLine: (id, input) => {
    set({
      estimateLines: get().estimateLines.map((l) =>
        l.id === id && l.status === 'Requested'
          ? {
              ...l,
              partId: input.partId,
              partNumber: input.partNumber,
              partName: input.partName,
              identifiedByUserId: input.identifiedByUserId,
              status: 'Identified' as const,
              updatedAt: nowIso(),
            }
          : l,
      ),
    })
  },

  priceEstimateLine: (id, input) => {
    set({
      estimateLines: get().estimateLines.map((l) =>
        l.id === id && (l.status === 'Identified' || l.status === 'Requested')
          ? {
              ...l,
              vendorId: input.vendorId,
              unitPrice: input.unitPrice,
              sellPrice: input.sellPrice,
              quantity: input.quantity,
              sourcingType: input.sourcingType,
              currency: input.currency ?? 'BDT',
              inStock: input.inStock,
              estimatedDeliveryDate: input.estimatedDeliveryDate,
              advanceRequired: input.advanceRequired ?? false,
              pricedByUserId: input.pricedByUserId,
              options: input.options,
              status: 'Priced' as const,
              updatedAt: nowIso(),
            }
          : l,
      ),
    })
  },

  // PRICE LOCK: after submission, no edits allowed
  submitEstimateLines: (appointmentId, submittedByUserId) => {
    const ts = nowIso()
    set({
      estimateLines: get().estimateLines.map((l) =>
        l.appointmentId === appointmentId && l.status === 'Priced'
          ? { ...l, status: 'Submitted' as const, submittedByUserId, submittedAt: ts, updatedAt: ts }
          : l,
      ),
    })
  },

  approveEstimateLine: (id, approvedByUserId) => {
    const ts = nowIso()
    set({
      estimateLines: get().estimateLines.map((l) =>
        l.id === id && l.status === 'Submitted'
          ? { ...l, status: 'Approved' as const, approvedByUserId, approvedAt: ts, updatedAt: ts }
          : l,
      ),
    })
  },

  declineEstimateLine: (id, declinedByUserId) => {
    const ts = nowIso()
    set({
      estimateLines: get().estimateLines.map((l) =>
        l.id === id && l.status === 'Submitted'
          ? { ...l, status: 'Declined' as const, declinedByUserId, declinedAt: ts, updatedAt: ts }
          : l,
      ),
    })
  },

  getEstimateLinesForAppointment: (appointmentId) => {
    return get().estimateLines.filter((l) => l.appointmentId === appointmentId)
  },

  // ── Purchase Order actions ──────────────────────────────────────────────

  createPurchaseOrder: (input) => {
    const ts = nowIso()
    const lines: CWPOLine[] = input.lines.map((l) => ({
      id: newId(),
      partId: l.partId,
      partNumber: l.partNumber,
      partName: l.partName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      lineTotal: l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100),
      receivedQty: 0,
      estimateLineId: l.estimateLineId,
    }))
    const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const poCount = get().purchaseOrders.length
    const po: CWPurchaseOrder = {
      id: newId(),
      poNumber: `PO-${String(poCount + 1).padStart(4, '0')}`,
      vendorId: input.vendorId,
      status: input.advanceRequired && input.sourcingType === 'Foreign' ? 'Awaiting Advance' : 'Draft',
      currency: input.currency,
      sourcingType: input.sourcingType,
      expectedArrivalDate: input.expectedArrivalDate,
      totalAmount,
      advanceRequired: input.advanceRequired,
      blockedAppointmentIds: [],
      lines,
      createdByUserId: input.createdByUserId,
      createdAt: ts,
      updatedAt: ts,
    }
    set({ purchaseOrders: [po, ...get().purchaseOrders] })
    return po
  },

  submitPurchaseOrder: (id, submittedByUserId) => {
    const ts = nowIso()
    set({
      purchaseOrders: get().purchaseOrders.map((po) =>
        po.id === id && po.status === 'Draft'
          ? { ...po, status: 'Pending Approval' as const, submittedByUserId, submittedAt: ts, updatedAt: ts }
          : po,
      ),
    })
  },

  approvePurchaseOrder: (id, approvedByUserId) => {
    const ts = nowIso()
    set({
      purchaseOrders: get().purchaseOrders.map((po) =>
        po.id === id && po.status === 'Pending Approval'
          ? { ...po, status: 'Issued' as const, approvedAt: ts, approvedByUserId, updatedAt: ts }
          : po,
      ),
    })
  },

  rejectPurchaseOrder: (id, reason, rejectedByUserId) => {
    const ts = nowIso()
    set({
      purchaseOrders: get().purchaseOrders.map((po) =>
        po.id === id && po.status === 'Pending Approval'
          ? { ...po, status: 'Rejected' as const, rejectedByUserId, rejectedAt: ts, rejectionReason: reason, updatedAt: ts }
          : po,
      ),
    })
  },

  // FOREIGN ADVANCE GATE: no PO progression without advance confirmation
  confirmAdvance: (id, confirmedByUserId) => {
    const ts = nowIso()
    set({
      purchaseOrders: get().purchaseOrders.map((po) =>
        po.id === id && po.status === 'Awaiting Advance'
          ? { ...po, status: 'Draft' as const, advanceConfirmedAt: ts, advanceConfirmedByUserId: confirmedByUserId, updatedAt: ts }
          : po,
      ),
    })
  },

  cancelPurchaseOrder: (id) => {
    set({
      purchaseOrders: get().purchaseOrders.map((po) =>
        po.id === id && !['Received', 'Closed', 'Cancelled'].includes(po.status)
          ? { ...po, status: 'Cancelled' as const, updatedAt: nowIso() }
          : po,
      ),
    })
  },

  createGRN: (input) => {
    const ts = nowIso()
    const grnCount = get().goodsReceiptNotes.length
    const grnLines: CWGRNLine[] = input.lines.map((l) => ({
      id: newId(),
      poLineId: l.poLineId,
      partId: l.partId,
      receivedQty: l.receivedQty,
      acceptedQty: l.acceptedQty,
      rejectedQty: l.rejectedQty,
      sellPrice: l.sellPrice,
      condition: l.condition,
      notes: l.notes,
    }))
    const grn: CWGoodsReceiptNote = {
      id: newId(),
      grnNumber: `GRN-${String(grnCount + 1).padStart(4, '0')}`,
      poId: input.poId,
      receivedByUserId: input.receivedByUserId,
      receivedAt: ts,
      createdAt: ts,
      lines: grnLines,
      notes: input.notes,
      discrepancyNotes: input.discrepancyNotes,
    }
    set({ goodsReceiptNotes: [grn, ...get().goodsReceiptNotes] })
    // Update PO line received quantities and PO status
    const po = get().purchaseOrders.find((p) => p.id === input.poId)
    if (po) {
      const updatedLines = po.lines.map((pl) => {
        const grnLine = grnLines.find((gl) => gl.poLineId === pl.id)
        // receivedQty = total physically received (accepted + rejected)
        return grnLine ? { ...pl, receivedQty: pl.receivedQty + grnLine.receivedQty } : pl
      })
      const allReceived = updatedLines.every((l) => l.receivedQty >= l.quantity)
      const anyReceived = updatedLines.some((l) => l.receivedQty > 0)
      set({
        purchaseOrders: get().purchaseOrders.map((p) =>
          p.id === input.poId
            ? {
                ...p,
                lines: updatedLines,
                status: allReceived ? ('Received' as const) : anyReceived ? ('Partially Received' as const) : p.status,
                updatedAt: ts,
              }
            : p,
        ),
      })
    }

    // Auto-create stock units from accepted GRN lines
    const newStockUnits: CWPartStockUnit[] = []
    for (const grnLine of grnLines) {
      if (grnLine.acceptedQty > 0) {
        const poLine = po?.lines.find(l => l.id === grnLine.poLineId)
        const vendor = po ? get().vendors.find(v => v.id === po.vendorId) : undefined
        const part = get().parts.find(p => p.id === grnLine.partId)
        newStockUnits.push({
          id: newId(),
          partId: grnLine.partId,
          quantity: grnLine.acceptedQty,
          initialQuantity: grnLine.acceptedQty,
          status: 'Available' as const,
          costPrice: poLine?.unitPrice ?? 0,
          sellPrice: grnLine.sellPrice,
          poId: input.poId,
          poNumber: po?.poNumber,
          grnId: grn.id,
          grnNumber: grn.grnNumber,
          vendorId: po?.vendorId,
          vendorName: vendor?.name,
          rackLocation: part?.rackLocation,
          createdAt: ts,
          updatedAt: ts,
        })
      }
    }
    if (newStockUnits.length > 0) {
      // Add new stock units
      set({ partStockUnits: [...get().partStockUnits, ...newStockUnits] })
      // Update Part.stockCount for each affected part
      const partUpdates = new Map<string, number>()
      for (const su of newStockUnits) {
        partUpdates.set(su.partId, (partUpdates.get(su.partId) || 0) + su.quantity)
      }
      set({
        parts: get().parts.map(p => {
          const addQty = partUpdates.get(p.id)
          if (!addQty) return p
          return { ...p, stockCount: (p.stockCount ?? 0) + addQty, updatedAt: ts }
        }),
      })
    }

    return grn
  },

  // ── Stock Unit FIFO actions ──────────────────────────────────────────

  addStockUnits: (units) => {
    if (units.length === 0) return
    set({ partStockUnits: [...get().partStockUnits, ...units] })
  },

  getStockUnitsForPart: (partId) => {
    return get().partStockUnits
      .filter(u => u.partId === partId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  getFIFOSellPrice: (partId) => {
    const units = get().partStockUnits
      .filter(u => u.partId === partId && u.status === 'Available' && u.quantity > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return units.length > 0 ? units[0].sellPrice : undefined
  },

  getAvailableStock: (partId) => {
    return get().partStockUnits
      .filter(u => u.partId === partId && u.status === 'Available')
      .reduce((sum, u) => sum + u.quantity, 0)
  },

  deductStock: (partId, qty) => {
    const ts = nowIso()
    const units = get().partStockUnits
      .filter(u => u.partId === partId && u.status === 'Available' && u.quantity > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    let remaining = qty
    const deductions: Array<{ stockUnitId: string; quantityTaken: number; costPrice: number; sellPrice: number }> = []
    const updatedIds = new Map<string, { quantity: number; status: CWStockUnitStatus }>()

    for (const unit of units) {
      if (remaining <= 0) break
      const take = Math.min(unit.quantity, remaining)
      const newQty = unit.quantity - take
      updatedIds.set(unit.id, {
        quantity: newQty,
        status: newQty === 0 ? 'Consumed' : 'Available',
      })
      deductions.push({
        stockUnitId: unit.id,
        quantityTaken: take,
        costPrice: unit.costPrice,
        sellPrice: unit.sellPrice,
      })
      remaining -= take
    }

    // Update stock units
    set({
      partStockUnits: get().partStockUnits.map(u => {
        const update = updatedIds.get(u.id)
        if (!update) return u
        return { ...u, quantity: update.quantity, status: update.status, updatedAt: ts }
      }),
    })

    // Update Part.stockCount
    const totalAvailable = get().partStockUnits
      .filter(u => u.partId === partId && u.status === 'Available')
      .reduce((sum, u) => sum + u.quantity, 0)
    set({
      parts: get().parts.map(p =>
        p.id === partId ? { ...p, stockCount: totalAvailable, updatedAt: ts } : p
      ),
    })

    return deductions
  },

  // ── Requisition actions ──────────────────────────────────────────────

  // Auto-approved: no second approval needed after customer estimate approval
  createRequisition: (input) => {
    const ts = nowIso()
    const reqCount = get().requisitions.length
    const lines: CWRequisitionLine[] = input.lines.map((l) => ({
      id: newId(),
      partId: l.partId,
      partNumber: l.partNumber,
      partName: l.partName,
      quantity: l.quantity,
      stockUnitIds: [],
      estimateLineId: l.estimateLineId,
      status: 'Pending',
    }))
    const req: CWRequisition = {
      id: newId(),
      requisitionNumber: `PR-${String(reqCount + 1).padStart(3, '0')}`,
      appointmentId: input.appointmentId,
      requestedByUserId: input.requestedByUserId,
      status: 'Created',
      lines,
      createdAt: ts,
      updatedAt: ts,
    }
    set({ requisitions: [req, ...get().requisitions] })
    return req
  },

  acknowledgeRequisition: (id, acknowledgedByUserId) => {
    const ts = nowIso()
    set({
      requisitions: get().requisitions.map((r) =>
        r.id === id && r.status === 'Created'
          ? { ...r, status: 'Request Received' as const, acknowledgedByUserId, acknowledgedAt: ts, updatedAt: ts }
          : r,
      ),
    })
  },

  pickRequisitionLine: (reqId, lineId, pickedByUserId) => {
    const ts = nowIso()
    set({
      requisitions: get().requisitions.map((r) => {
        if (r.id !== reqId) return r
        const updatedLines = r.lines.map((l) =>
          l.id === lineId && l.status === 'Pending'
            ? { ...l, pickedQty: l.quantity, pickedByUserId, pickedAt: ts, status: 'Picked' as const }
            : l,
        )
        const allPicked = updatedLines.every((l) => l.status === 'Picked')
        return {
          ...r,
          lines: updatedLines,
          status: allPicked ? ('Picked' as const) : r.status,
          updatedAt: ts,
        }
      }),
    })

    // FIFO stock deduction
    const reqLine = get().requisitions.find(r => r.id === reqId)?.lines.find(l => l.id === lineId)
    if (reqLine) {
      get().deductStock(reqLine.partId, reqLine.quantity)
    }
  },

  collectRequisition: (id, proofUrl) => {
    const ts = nowIso()
    set({
      requisitions: get().requisitions.map((r) =>
        r.id === id && r.status === 'Picked'
          ? {
              ...r,
              status: 'Picked' as const,
              pickProofUrl: proofUrl,
              pickedAt: ts,
              updatedAt: ts,
            }
          : r,
      ),
    })
  },

  receiveRequisition: (id, proofUrl) => {
    const ts = nowIso()
    set({
      requisitions: get().requisitions.map((r) =>
        r.id === id && r.status === 'Picked'
          ? {
              ...r,
              status: 'Received' as const,
              receiveProofUrl: proofUrl,
              receivedAt: ts,
              updatedAt: ts,
            }
          : r,
      ),
    })
  },

  // ── Return actions ────────────────────────────────────────────────────

  createPartReturn: (input) => {
    const ts = nowIso()
    const ret: CWPartReturn = {
      id: newId(),
      requisitionId: input.requisitionId,
      requisitionLineId: input.requisitionLineId,
      partId: input.partId,
      stockUnitId: input.stockUnitId,
      appointmentId: input.appointmentId,
      reasonCode: input.reasonCode,
      photoUrl: input.photoUrl,
      raisedByUserId: input.raisedByUserId,
      raisedAt: ts,
      status: 'Raised',
      createdAt: ts,
      updatedAt: ts,
    }
    set({ partReturns: [ret, ...get().partReturns] })
    return ret
  },

  receiveReturn: (id, receivedByUserId) => {
    const ts = nowIso()
    set({
      partReturns: get().partReturns.map((r) =>
        r.id === id && r.status === 'Raised'
          ? { ...r, status: 'Received at Store' as const, receivedByUserId, receivedAt: ts, updatedAt: ts }
          : r,
      ),
    })
  },

  disposeReturn: (id, disposition, disposedByUserId) => {
    const ts = nowIso()
    set({
      partReturns: get().partReturns.map((r) =>
        r.id === id && r.status === 'Received at Store'
          ? { ...r, status: 'Dispositioned' as const, disposition, dispositionedByUserId: disposedByUserId, dispositionedAt: ts, updatedAt: ts }
          : r,
      ),
    })
  },

  // ── Inventory helpers ──────────────────────────────────────────────────────

  getPartStockStatus: (part) => {
    if ((part.stockCount ?? 0) === 0) return 'Out of Stock'
    if ((part.stockCount ?? 0) <= (part.reorderLevel ?? 0)) return 'Low Stock'
    return 'In Stock'
  },

  getLowStockParts: () => {
    return get().parts.filter((p) => {
      const count = p.stockCount ?? 0
      return p.status === 'Active' && count <= (p.reorderLevel ?? 0)
    })
  },

  getSlowMovers: () => {
    // For demo: return parts with stockCount > 0 but low count (simulating slow movement)
    return get().parts.filter((p) => {
      const count = p.stockCount ?? 0
      return p.status === 'Active' && count > 0 && count <= 5
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
      // Check service items (service-level bay)
      for (const s of appt.serviceItems) {
        if (s.bayId === bayId && s.plannedStartAt && s.plannedEndAt) {
          const sStart = new Date(s.plannedStartAt).getTime()
          const sEnd = new Date(s.plannedEndAt).getTime()
          if (start < sEnd && end > sStart) return false // overlap
        }
        // Check stage-level bay bookings
        if (s.stageItems) {
          for (const st of s.stageItems) {
            if (st.bayId === bayId && st.plannedStartAt && st.plannedEndAt) {
              const stStart = new Date(st.plannedStartAt).getTime()
              const stEnd = new Date(st.plannedEndAt).getTime()
              if (start < stEnd && end > stStart) return false
            }
          }
        }
      }
    }
    return true
  },

  // ── Call Records (CDR) ──
  addCallRecord: (input) => {
    const rec: CWCallRecord = { ...input, id: newId() }
    set({ callRecords: [rec, ...get().callRecords] })
    syncBackend(workshopApi.createCallRecord(input), 'call record')
    return rec
  },

  // ── Reminders ──
  createReminder: (input) => {
    const rem: CWReminder = { ...input, id: newId(), createdAt: nowIso() }
    set({ reminders: [rem, ...get().reminders] })
    syncBackend(workshopApi.createReminder(input), 'reminder')
    return rem
  },

  markReminderSent: (id) => {
    set({
      reminders: get().reminders.map((r) =>
        r.id === id ? { ...r, status: 'Sent' as const, sentAt: nowIso() } : r,
      ),
    })
    syncBackend(workshopApi.markReminderSent(id), 'reminder sent')
  },

  cancelReminder: (id) => {
    set({
      reminders: get().reminders.map((r) =>
        r.id === id ? { ...r, status: 'Cancelled' as const } : r,
      ),
    })
    syncBackend(workshopApi.cancelReminder(id), 'reminder cancel')
  },

  // ── Notifications ──
  markNotificationRead: (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })
    syncBackend(workshopApi.markNotificationRead(id), 'notification read')
  },

  markAllNotificationsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    })
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length
  },

  // ── Notification create ──
  createNotification: (input) => {
    const notif: CWNotification = {
      id: newId(),
      title: input.title,
      message: input.message,
      category: input.category,
      targetRoles: input.targetRoles,
      targetUserId: input.targetUserId,
      actionUrl: input.actionUrl,
      referenceId: input.referenceId,
      read: false,
      createdAt: nowIso(),
    }
    set({ notifications: [notif, ...get().notifications] })
    return notif
  },

  // ── Invoice actions ──
  createInvoice: (input) => {
    const ts = nowIso()
    const invCount = get().invoices.length
    const lines: CWInvoiceLine[] = input.lines.map((l) => ({
      id: newId(),
      partId: l.partId,
      partNumber: l.partNumber,
      partName: l.partName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      sellPrice: l.sellPrice,
      lineTotal: l.quantity * l.sellPrice,
      requisitionLineId: l.requisitionLineId,
    }))
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const tax = subtotal * (input.taxRate / 100)
    const total = subtotal + tax
    const advanceApplied = input.advanceApplied ?? 0
    const inv: CWInvoice = {
      id: newId(),
      invoiceNumber: `INV-${String(invCount + 1).padStart(4, '0')}`,
      appointmentId: input.appointmentId,
      status: 'Draft',
      lines,
      subtotal,
      tax,
      taxRate: input.taxRate,
      total,
      advanceApplied,
      netPayable: total - advanceApplied,
      createdByUserId: input.createdByUserId,
      createdAt: ts,
      updatedAt: ts,
    }
    set({ invoices: [inv, ...get().invoices] })
    return inv
  },

  issueInvoice: (id, issuedByUserId) => {
    const ts = nowIso()
    set({
      invoices: get().invoices.map((inv) =>
        inv.id === id && inv.status === 'Draft'
          ? { ...inv, status: 'Issued' as const, issuedByUserId, issuedAt: ts, updatedAt: ts }
          : inv,
      ),
    })
  },

  markInvoicePaid: (id) => {
    const ts = nowIso()
    set({
      invoices: get().invoices.map((inv) =>
        inv.id === id && inv.status === 'Issued'
          ? { ...inv, status: 'Paid' as const, paidAt: ts, updatedAt: ts }
          : inv,
      ),
    })
  },
}))

// Non-hook access for service-layer functions.
export const cwStore = {
  getState: useCwStore.getState,
  setState: useCwStore.setState,
}
