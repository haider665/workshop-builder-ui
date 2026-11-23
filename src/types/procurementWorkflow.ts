// ── Mock Procurement Workflow Types ──
// Phase A: Part Request Triage + Customer Approval
// Phase B: Procurement Pipeline (Store Review → Quotations → CS → Audit → Approval → PO → GRN)

import type { CWPartRequest } from './cw'

// ── Live Phase A bridge ──

export type LiveCustomerApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'

/**
 * Server-backed part request used by the Phase A screens. The public
 * `CWPartRequest` contract stays unchanged; these additive fields are mapped
 * from `workshop.api.mappers.part_request_to_dto`.
 */
export type LivePartRequest = CWPartRequest & {
  companyId?: string
  includeInProcurement?: boolean
  storeReviewStatus?: 'Pending' | 'Stock Available' | 'Local Shortage' | 'Foreign Required'
  procurementType?: 'Local' | 'Foreign'
  stockAvailable?: number
  storeReviewNote?: string
  triageCompleted?: boolean
  disposition?: PartDisposition
  pickedFromCounter?: boolean
  localVendorName?: string
  localPrice?: number
  localQuantity?: number
  localDeliveryDays?: number
  foreignNote?: string
  customerApprovalStatus?: LiveCustomerApprovalStatus
  customerApprovalNote?: string
  customerApprovalDecidedBy?: string
  customerApprovalDecidedAt?: string
}

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
  includeInProcurement?: boolean
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
  /** Live procurement case opened for this appointment, when available. */
  procurementCaseId?: string
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
  includeInProcurement?: boolean
}

// ── Quotation (multi-part per vendor) ──

export type QuotationLineItem = {
  casePartId: string
  partName: string
  unitPrice: number
  quantity: number
  totalPrice: number
  deliveryDays?: number
  /** Unit for the delivery lead time entered by the supplier. */
  deliveryUnit?: 'Hours' | 'Days' | 'Week' | 'Month' | 'Year'
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

export type ProcurementDecisionItem = CSDecisionItem & {
  partRequestId?: string | null
}

export type ProcurementDecisionRecord = {
  items: ProcurementDecisionItem[]
  note?: string
  decidedByUserId?: string
  decidedByRole?: string
  decidedAt?: string
  priceSuggestions?: AuditPriceSuggestion[]
}

export type AuditPriceSuggestion = {
  casePartId: string
  partRequestId?: string | null
  partName: string
  selectedQuotationId: string
  vendorName: string
  originalUnitPrice: number
  suggestedUnitPrice: number
  quantity: number
}

export type ProcurementApprovalStep = {
  stage: 'Audit Verification' | 'GM Approval' | 'Management Approval' | string
  authorizedUserId: string
  minAmount: number
  sequence: number
  acknowledgement?: string
}

export type ProcurementApprovalPolicy = {
  id?: string | null
  name?: string
  companyId: string
  enabled: boolean
  acknowledgement?: string
  specialCaseEnabled?: boolean
  specialCaseMinAmount?: number
  specialCaseApprover?: string | null
  specialCaseAuditApprover?: string | null
  approvalSteps?: ProcurementApprovalStep[]
  allowDeliveredProductSelection?: boolean
  allowPartialReceive?: boolean
  allowSingleProductReturn?: boolean
  allowIndividualItemReturn?: boolean
  allowCreditNoteReturn?: boolean
  allowDirectReturn?: boolean
  requireGmApproval?: boolean
  gmMinAmount?: number
  requireAuditVerification?: boolean
  auditVerificationMinAmount?: number
  requireManagementApproval?: boolean
  managementMinAmount?: number
  requirePhysicalAudit?: boolean
  physicalAuditMinAmount?: number
  requireAuditClearance?: boolean
  auditClearanceMinAmount?: number
  localEnlistedCsMinAmount?: number
  localEnlistedManagementMinAmount?: number
  localNonEnlistedCsMinAmount?: number
  localNonEnlistedManagementMinAmount?: number
  foreignCsMinAmount?: number
  foreignManagementMinAmount?: number
  routeThresholdsConfigured?: boolean
  notes?: string
}

export type ProcurementPolicySettings = Pick<
  ProcurementApprovalPolicy,
  'allowDeliveredProductSelection' | 'allowPartialReceive' | 'allowSingleProductReturn' |
  'allowIndividualItemReturn' | 'allowCreditNoteReturn' | 'allowDirectReturn' |
  'specialCaseEnabled' | 'specialCaseMinAmount'
>

export type SupplierReturn = {
  id: string
  receiptId: string
  procurementCaseId?: string | null
  mode: 'Single Product' | 'Individual Item' | 'Credit Note' | 'Direct Return' | string
  creditNoteId?: string | null
  status?: string
  docstatus?: number
  postingDate?: string
  items: Array<{
    id?: string
    itemCode: string
    itemName?: string
    qty: number
    sourceReceiptItemId?: string | null
  }>
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
  sourceReceiptItemId?: string | null
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
  status?: 'draft' | 'submitted'
  docstatus?: number
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

export type SupplierInvoiceTaxLine = {
  accountHead?: string
  description?: string
  chargeType?: string
  rate: number
  taxAmount: number
}

export type SupplierInvoice = {
  id: string
  status?: string
  docstatus?: number
  supplierName?: string
  billNo?: string
  billDate?: string
  postingDate?: string
  dueDate?: string
  currency?: string
  netTotal: number
  totalTaxesAndCharges: number
  grandTotal: number
  outstandingAmount: number
  taxesAndCharges?: string
  taxCategory?: string
  taxes: SupplierInvoiceTaxLine[]
}

export type SupplierPayment = {
  id: string
  status?: string
  docstatus?: number
  paymentType?: string
  amount: number
  paidAmount?: number
  modeOfPayment?: string
  referenceNo?: string
  referenceDate?: string
  postingDate?: string
}

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
  purchaseInvoiceId?: string
  paymentEntryId?: string
  supplierInvoice?: SupplierInvoice
  supplierPayment?: SupplierPayment
  // Trail
  history: StepRecord[]
  createdAt: string
  updatedAt: string
  /** Original server stage, retained while the mock route is being migrated. */
  backendStage?: string
  /** Approved compare sheet used to create the standard Purchase Order. */
  compareSheetId?: string
  csProposal?: ProcurementDecisionRecord
  auditDecision?: ProcurementDecisionRecord
  stageDecisions?: Record<string, ProcurementDecisionRecord>
  policyAcknowledgement?: string | null
  assignedApproverUserId?: string | null
  policySettings?: ProcurementPolicySettings
  supplierReturns?: SupplierReturn[]
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
