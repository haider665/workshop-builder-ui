import type { GRN, ProcurementCase, ProcurementStep, PurchaseOrder, SupplierInvoice, SupplierPayment } from '../types/procurementWorkflow'

type BackendCase = Record<string, unknown>

const stageToStep: Record<string, ProcurementStep> = {
  Requested: 'store_review',
  'Procurement Review': 'store_review',
  'Counter Desk Fulfilment': 'store_review',
  'Foreign Customer Confirmation': 'quotations',
  'Foreign Advance Confirmation': 'quotations',
  'Quotation Collection': 'quotations',
  'Compare Sheet Preparation': 'cs',
  'Audit Verification': 'audit',
  'GM Approval': 'approval',
  'Management Approval': 'approval',
  'PO Creation': 'po',
  'Supplier Confirmation': 'po',
  'Chalan / GRN': 'grn',
  'Audit Physical Review': 'grn',
  'Procurement File Completion': 'grn',
  'Audit Clearance': 'grn',
  'Actual Accounts': 'grn',
  Reconciliation: 'grn',
  'Bill Settlement': 'grn',
  'Paid / Closed': 'grn',
}

function text(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return String(value)
}

function numberValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function booleanValue(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return ['1', 'true', 'yes'].includes(value.trim().toLowerCase())
  return Boolean(value)
}

function record(value: unknown): BackendCase {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as BackendCase : {}
}

function records(value: unknown): BackendCase[] {
  return Array.isArray(value)
    ? value.filter((item): item is BackendCase => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []
}

function stepFor(stage: string | undefined): ProcurementStep {
  return stageToStep[stage || ''] || 'store_review'
}

function requestContextCaseData(source: BackendCase): Pick<ProcurementCase, 'vehicleName' | 'customerName' | 'vehicleInfo' | 'parts'> {
  const context = record(source.requestContext)
  const vehicle = record(context.vehicle)
  const customer = record(context.customer)
  const appointment = record(context.appointment)
  return {
    vehicleName: [text(vehicle.registrationNo), text(vehicle.make), text(vehicle.model)].filter(Boolean).join(' ') || 'Vehicle not linked',
    customerName: text(customer.name) || 'Customer not linked',
    vehicleInfo: {
      registrationNo: text(vehicle.registrationNo) || '—',
      make: text(vehicle.make) || '—',
      model: text(vehicle.model) || '—',
      vin: text(vehicle.vin),
      modelYear: numberValue(vehicle.modelYear) || undefined,
      category: text(vehicle.modelVariant),
      odometerKm: numberValue(appointment.mileage) || undefined,
      customerName: text(customer.name) || '—',
      customerPhone: text(customer.phone) || '—',
    },
    parts: records(context.parts).map((part) => ({
      id: text(part.id) || '',
      lineItemId: text(part.id) || '',
      partName: text(part.partName) || text(part.partNumber) || 'Requested part',
      partNumber: text(part.partNumber),
      quantity: numberValue(part.quantity),
      disposition: part.procurementType === 'Foreign' ? 'foreign_vendor' as const : 'local_vendor' as const,
      includeInProcurement: booleanValue(part.includeInProcurement, true),
      unitOfMeasure: 'pcs',
    })),
  }
}

export function mapBackendPurchaseOrder(
  source: BackendCase,
  procurementType: string | undefined,
  receipt?: BackendCase | null,
): PurchaseOrder {
  const items = records(source.items)
  const receiptRow = receipt ? record(receipt) : null
  const submitted = numberValue(source.docstatus) === 1
  const received = Boolean(receiptRow && numberValue(receiptRow.docstatus) === 1)
  const deliveryStatus = text(source.deliveryStatus)
  const poId = text(source.id) || ''
  const receiptPostingDate = receiptRow ? text(receiptRow.postingDate) : undefined
  const status: PurchaseOrder['status'] = received || deliveryStatus === 'Delivered'
    ? 'delivered'
    : deliveryStatus === 'In Transit'
      ? 'in_transit'
      : submitted || deliveryStatus === 'Placed'
        ? 'placed'
        : 'draft'
  return {
    id: poId,
    poNumber: poId,
    vendorName: text(source.supplierName) || text(source.supplierId) || 'Supplier',
    sourcingType: procurementType === 'Foreign' ? 'Foreign' : 'Local',
    lineItems: items.map((item, index) => ({
      casePartId: text(item.id) || text(item.itemCode) || `po-item-${index}`,
      partName: text(item.description) || text(item.itemName) || text(item.itemCode) || 'Part',
      unitPrice: numberValue(item.rate),
      quantity: numberValue(item.qty),
      totalPrice: numberValue(item.amount),
    })),
    grandTotal: numberValue(source.grandTotal) || numberValue(source.totalAmount),
    currency: text(source.currency) || 'BDT',
    status,
    placedAt: text(source.placedAt) || (status !== 'draft' ? text(source.transactionDate) : undefined),
    placedByName: text(source.placedByName) || text(source.owner),
    expectedDeliveryDate: text(source.deliveryEta) || text(source.scheduleDate),
    deliveredAt: text(source.deliveredAt) || (received ? receiptPostingDate : undefined),
    createdAt: text(source.createdAt) || new Date().toISOString(),
  }
}

function grnCondition(value: unknown): GRN['lineItems'][number]['condition'] {
  const normalized = String(value || '').toLowerCase()
  return normalized === 'damaged' || normalized === 'partial' ? normalized : 'good'
}

export function mapBackendPurchaseReceipt(source: BackendCase, purchaseOrder?: PurchaseOrder): GRN {
  const items = records(source.items)
  const attachments = records(source.attachments)
  const poId = purchaseOrder?.id || text(items[0]?.purchaseOrderId) || ''
  return {
    id: text(source.id) || '',
    grnNumber: text(source.id) || '',
    poId,
    poNumber: purchaseOrder?.poNumber || poId || 'Purchase Order',
    vendorName: text(source.supplierName) || text(source.supplierId) || purchaseOrder?.vendorName || 'Supplier',
    lineItems: items.map((item, index) => {
      const casePartId = text(item.purchaseOrderItemId) || text(item.itemCode) || `receipt-item-${index}`
      const orderedQty = purchaseOrder?.lineItems.find((line) => line.casePartId === casePartId)?.quantity
        ?? purchaseOrder?.lineItems[index]?.quantity
        ?? numberValue(item.qty)
      return {
        casePartId,
        partName: text(item.description) || text(item.itemName) || text(item.itemCode) || 'Part',
        orderedQty,
        receivedQty: numberValue(item.receivedQty ?? item.qty),
        condition: grnCondition(item.condition),
      }
    }),
    invoiceAttachmentUrls: attachments.map((file) => text(file.fileUrl) || '').filter(Boolean),
    invoiceAttachmentNames: attachments.map((file, index) => text(file.fileName) || `file-${index + 1}`),
    receivedByName: text(source.owner) || 'Store Keeper',
    receivedAt: text(source.updatedAt) || text(source.postingDate) || new Date().toISOString(),
    notes: text(source.remarks),
    status: numberValue(source.docstatus) === 1 ? 'submitted' : 'draft',
    docstatus: numberValue(source.docstatus),
  }
}

export function mapBackendSupplierInvoice(source: BackendCase): SupplierInvoice {
  const taxes = records(source.taxes)
  return {
    id: text(source.id) || '',
    status: text(source.status),
    docstatus: numberValue(source.docstatus),
    supplierName: text(source.supplierName) || text(source.supplierId),
    billNo: text(source.billNo),
    billDate: text(source.billDate),
    postingDate: text(source.postingDate),
    dueDate: text(source.dueDate),
    currency: text(source.currency) || 'BDT',
    netTotal: numberValue(source.netTotal),
    totalTaxesAndCharges: numberValue(source.totalTaxesAndCharges),
    grandTotal: numberValue(source.grandTotal) || numberValue(source.totalAmount),
    outstandingAmount: numberValue(source.outstandingAmount),
    taxesAndCharges: text(source.taxesAndCharges),
    taxCategory: text(source.taxCategory),
    taxes: taxes.map((line) => ({
      accountHead: text(line.accountHead),
      description: text(line.description),
      chargeType: text(line.chargeType),
      rate: numberValue(line.rate),
      taxAmount: numberValue(line.taxAmount),
    })),
  }
}

export function mapBackendSupplierPayment(source: BackendCase): SupplierPayment {
  return {
    id: text(source.id) || '',
    status: text(source.status),
    docstatus: numberValue(source.docstatus),
    paymentType: text(source.paymentType),
    amount: numberValue(source.paidAmount) || numberValue(source.receivedAmount) || numberValue(source.amount),
    paidAmount: numberValue(source.paidAmount),
    modeOfPayment: text(source.modeOfPayment),
    referenceNo: text(source.referenceNo),
    referenceDate: text(source.referenceDate),
    postingDate: text(source.postingDate),
  }
}

export function mapBackendProcurementCase(source: BackendCase): ProcurementCase {
  const contextual = requestContextCaseData(source)
  const parts = contextual.parts.length
    ? contextual.parts
    : [{
        id: text(source.partRequestId) || text(source.id) || '',
        lineItemId: text(source.partRequestId) || text(source.id) || '',
        partName: text(source.title) || 'Requested part',
        quantity: 1,
        disposition: source.procurementType === 'Foreign' ? 'foreign_vendor' as const : 'local_vendor' as const,
        unitOfMeasure: 'pcs',
      }]
  const status = source.status === 'Completed' ? 'approved' : source.status === 'Rejected' ? 'rejected' : 'in_progress'
  const quotations = records(source.supplierQuotations).map((quote) => ({
    id: text(quote.id) || '',
    vendorName: text(quote.supplierName) || text(quote.supplierId) || 'Supplier',
    sourcingType: 'Local' as const,
    lineItems: [],
    grandTotal: numberValue(quote.grandTotal),
    currency: text(quote.currency) || 'BDT',
    attachmentUrls: [],
    attachmentNames: [],
    submittedAt: text(quote.createdAt) || text(source.updatedAt) || new Date().toISOString(),
  }))
  const activities = records(source.activity)
  const auditActivity = [...activities].reverse().find((activity) => {
    const action = String(activity.action || '').toLowerCase()
    return action.includes('audit_verified') || action.includes('audit_verify') || action.includes('audit endorsed')
  })
  const auditReview = auditActivity ? {
    step: 'audit' as const,
    action: 'approve' as const,
    actionByName: text(auditActivity.actorRole) || text(auditActivity.actorId) || 'Audit team',
    actionDate: text(auditActivity.eventAt) || text(source.updatedAt) || new Date().toISOString(),
    note: text(auditActivity.comment) || text(record(auditActivity.payload).note) || '',
  } : undefined
  return {
    id: text(source.id) || '',
    caseNumber: text(source.id) || '',
    partRequestId: text(source.partRequestId) || text(source.materialRequestId) || text(source.id) || '',
    customerApprovalIds: [],
    parts,
    vehicleName: contextual.vehicleName,
    customerName: contextual.customerName,
    vehicleInfo: contextual.vehicleInfo,
    currentStep: stepFor(text(source.currentStage)),
    status,
    quotations,
    auditReview,
    purchaseOrders: [],
    grns: [],
    history: [],
    createdAt: text(source.createdAt) || new Date().toISOString(),
    updatedAt: text(source.updatedAt) || new Date().toISOString(),
    backendStage: text(source.currentStage),
    compareSheetId: text(source.compareSheetId),
    purchaseInvoiceId: text(source.purchaseInvoiceId),
    paymentEntryId: text(source.paymentEntryId),
  }
}
