// ── Mock Procurement Workflow Types ──
// Phase A: Part Request Triage + Customer Approval
// Phase B: Procurement Pipeline (Store Review → Quotations → CS → Audit → Approval → PO → GRN)

// ── Step 1: Part Request Triage ──

export type PartDisposition = 'pending' | 'in_stock' | 'local_vendor' | 'foreign_vendor'

export type PartLineItem = {
  id: string
  partName: string
  partNumber?: string
  alternatePartNumbers?: string[]
  brand?: string
  unitOfMeasure?: string
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
  alternatePartNumbers?: string[]
  brand?: string
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

// ── Steps 2–8: Procurement Pipeline ──

export type ProcurementStep = 'store_review' | 'quotations' | 'cs' | 'audit' | 'approval' | 'po' | 'grn'

export type StepAction = 'approve' | 'reject' | 'change_request' | 'submit'

export type StepRecord = {
  step: ProcurementStep
  action: StepAction
  actionByName: string
  actionDate: string
  note?: string
  attachmentUrls?: string[]
}

// ── Part inside a Procurement Case ──

export type CasePart = {
  id: string
  lineItemId: string
  partName: string
  partNumber?: string
  alternatePartNumbers?: string[]
  brand?: string
  unitOfMeasure?: string
  quantity: number
  disposition: 'local_vendor' | 'foreign_vendor'
}

// ── Quotation (multi-part per vendor) ──

export type QuotationLineItem = {
  casePartId: string
  partName: string
  unitPrice: number
  quantity: number
  totalPrice: number
  deliveryDays?: number
  notes?: string
}

export type Quotation = {
  id: string
  vendorName: string
  vendorContact?: string
  sourcingType: 'Local' | 'Foreign'
  lineItems: QuotationLineItem[]
  grandTotal: number
  currency: string
  notes?: string
  attachmentUrls: string[]
  attachmentNames: string[]
  submittedAt: string
}

// ── CS Decision (per-part vendor selection) ──

export type CSDecisionItem = {
  casePartId: string
  partName: string
  selectedQuotationId: string
  selectedVendorName: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

export type CSDecision = {
  items: CSDecisionItem[]
  note: string
  decidedByName: string
  decidedAt: string
}

// ── Purchase Order ──

export type POLineItem = {
  casePartId: string
  partName: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

export type POStatus = 'draft' | 'placed' | 'in_transit' | 'delivered'

export type PurchaseOrder = {
  id: string
  poNumber: string
  vendorName: string
  vendorContact?: string
  sourcingType: 'Local' | 'Foreign'
  lineItems: POLineItem[]
  grandTotal: number
  currency: string
  status: POStatus
  placedAt?: string
  placedByName?: string
  expectedDeliveryDate?: string
  deliveredAt?: string
  trackingNote?: string
  createdAt: string
}

// ── GRN (Good Receive Note) ──

export type GRNItemCondition = 'good' | 'damaged' | 'partial'

export type GRNLineItem = {
  casePartId: string
  partName: string
  orderedQty: number
  receivedQty: number
  condition: GRNItemCondition
  notes?: string
}

export type GRN = {
  id: string
  grnNumber: string
  poId: string
  poNumber: string
  vendorName: string
  lineItems: GRNLineItem[]
  invoiceAttachmentUrls: string[]
  invoiceAttachmentNames: string[]
  receivedByName: string
  receivedAt: string
  notes?: string
}

// ── Vehicle Info ──

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

// ── Procurement Case (multi-part) ──

export type ProcurementCaseStatus = 'in_progress' | 'approved' | 'rejected'

export type ProcurementCase = {
  id: string
  caseNumber: string
  // Source
  partRequestId: string
  customerApprovalIds: string[]
  // Parts (multiple)
  parts: CasePart[]
  // Display context
  vehicleName: string
  customerName: string
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
  purchaseOrders: PurchaseOrder[]
  grns: GRN[]
  // Trail
  history: StepRecord[]
  createdAt: string
  updatedAt: string
}

// ── Step constants ──

export const PROCUREMENT_STEP_LABELS: Record<ProcurementStep, string> = {
  store_review: 'Store Review',
  quotations: 'Quotations',
  cs: 'Comparative Statement',
  audit: 'Audit',
  approval: 'Approval',
  po: 'Purchase Order',
  grn: 'GRN',
}

export const PROCUREMENT_STEPS: ProcurementStep[] = [
  'store_review',
  'quotations',
  'cs',
  'audit',
  'approval',
  'po',
  'grn',
]

export const PREVIOUS_STEP: Record<ProcurementStep, ProcurementStep | null> = {
  store_review: null,
  quotations: 'store_review',
  cs: 'quotations',
  audit: 'cs',
  approval: 'audit',
  po: 'approval',
  grn: 'po',
}

export const NEXT_STEP: Record<ProcurementStep, ProcurementStep | null> = {
  store_review: 'quotations',
  quotations: 'cs',
  cs: 'audit',
  audit: 'approval',
  approval: 'po',
  po: 'grn',
  grn: null,
}
