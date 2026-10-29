// ── Mock Procurement Workflow Types ──
// Phase A: Part Request Triage + Customer Approval
// Phase B: Procurement Pipeline (Steps 2–6)

// ── Step 1: Part Request Triage ──

export type PartDisposition = 'pending' | 'in_stock' | 'local_vendor' | 'foreign_vendor'

export type PartLineItem = {
  id: string
  partName: string
  partNumber?: string
  quantity: number
  disposition: PartDisposition
  // For in_stock
  pickedFromCounter?: boolean
  // For local_vendor (rough quote for customer)
  localVendorName?: string
  localPrice?: number
  localQuantity?: number
  localDeliveryDays?: number
  // For foreign_vendor
  foreignNote?: string
  // Common
  completed: boolean
}

export type MockPartRequest = {
  id: string
  requestNumber: string
  vehicleName: string
  customerName: string
  customerPhone: string
  requestedByName: string
  requestedAt: string
  lineItems: PartLineItem[]
  notes?: string
}

// ── Customer Approval ──

export type CustomerApprovalStatus = 'pending' | 'approved' | 'rejected'

export type MockCustomerApproval = {
  id: string
  partRequestId: string
  lineItemId: string
  partName: string
  partNumber?: string
  quantity: number
  customerName: string
  customerPhone: string
  vehicleName: string
  disposition: 'local_vendor' | 'foreign_vendor'
  estimatedPrice?: number
  estimatedDeliveryDays?: number
  vendorName?: string
  foreignNote?: string
  status: CustomerApprovalStatus
  approvedAt?: string
  rejectedAt?: string
  rejectionNote?: string
  createdAt: string
}

// ── Steps 2–6: Procurement Case ──

export type ProcurementStep = 'store_review' | 'quotations' | 'cs' | 'audit' | 'approval'

export type StepAction = 'approve' | 'reject' | 'change_request' | 'submit'

export type StepRecord = {
  step: ProcurementStep
  action: StepAction
  actionByName: string
  actionDate: string
  note?: string
  attachmentUrls?: string[]
}

export type Quotation = {
  id: string
  vendorName: string
  vendorContact?: string
  sourcingType: 'Local' | 'Foreign'
  unitPrice: number
  quantity: number
  totalPrice: number
  deliveryDays?: number
  currency: string
  notes?: string
  attachmentUrls: string[]
  attachmentNames: string[]
  submittedAt: string
}

export type CSDecision = {
  selectedQuotationId: string
  selectedVendorName: string
  note: string
  decidedByName: string
  decidedAt: string
}

export type MockVehicleInfo = {
  registrationNo: string
  make: string
  model: string
  vin?: string
  modelYear?: number
  category?: string
  odometerKm?: number
  customerName: string
  customerPhone: string
}

export type ProcurementCaseStatus = 'in_progress' | 'approved' | 'rejected'

export type ProcurementCase = {
  id: string
  caseNumber: string
  // Source
  partRequestId: string
  lineItemId: string
  customerApprovalId: string
  // Part info
  partName: string
  partNumber?: string
  quantity: number
  disposition: 'local_vendor' | 'foreign_vendor'
  // Display context
  vehicleName: string
  customerName: string
  // Vehicle info (self-contained mock)
  vehicleInfo: MockVehicleInfo
  // Workflow
  currentStep: ProcurementStep
  status: ProcurementCaseStatus
  // Step data
  storeReview?: StepRecord
  quotations: Quotation[]
  csDecision?: CSDecision
  auditReview?: StepRecord
  managementApproval?: StepRecord
  // Trail
  history: StepRecord[]
  createdAt: string
  updatedAt: string
}

// ── Step label mapping ──

export const PROCUREMENT_STEP_LABELS: Record<ProcurementStep, string> = {
  store_review: 'Store Review',
  quotations: 'Quotations',
  cs: 'Comparative Statement',
  audit: 'Audit',
  approval: 'Approval',
}

export const PROCUREMENT_STEPS: ProcurementStep[] = [
  'store_review',
  'quotations',
  'cs',
  'audit',
  'approval',
]

export const PREVIOUS_STEP: Record<ProcurementStep, ProcurementStep | null> = {
  store_review: null,
  quotations: 'store_review',
  cs: 'quotations',
  audit: 'cs',
  approval: 'audit',
}

export const NEXT_STEP: Record<ProcurementStep, ProcurementStep | null> = {
  store_review: 'quotations',
  quotations: 'cs',
  cs: 'audit',
  audit: 'approval',
  approval: null,
}
