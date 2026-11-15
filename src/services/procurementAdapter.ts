import type { ProcurementCase, ProcurementStep } from '../types/procurementWorkflow'

type BackendCase = Record<string, any>

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

function stepFor(stage: string | undefined): ProcurementStep {
  return stageToStep[stage || ''] || 'store_review'
}

function requestContextCaseData(source: BackendCase) {
  const context = source.requestContext || {}
  const vehicle = context.vehicle || {}
  const customer = context.customer || {}
  return {
    vehicleName: [vehicle.registrationNo, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle not linked',
    customerName: customer.name || 'Customer not linked',
    vehicleInfo: {
      registrationNo: vehicle.registrationNo || '—',
      make: vehicle.make || '—',
      model: vehicle.model || '—',
      vin: vehicle.vin || undefined,
      modelYear: vehicle.modelYear || undefined,
      category: vehicle.modelVariant || undefined,
      odometerKm: context.appointment?.mileage || undefined,
      customerName: customer.name || '—',
      customerPhone: customer.phone || '—',
    },
    parts: (context.parts || []).map((part: BackendCase) => ({
      id: part.id,
      lineItemId: part.id,
      partName: part.partName || part.partNumber || 'Requested part',
      partNumber: part.partNumber || undefined,
      quantity: Number(part.quantity || 0),
      disposition: part.procurementType === 'Foreign' ? 'foreign_vendor' : 'local_vendor',
      unitOfMeasure: 'pcs',
    })),
  }
}

export function mapBackendProcurementCase(source: BackendCase): ProcurementCase {
  const contextual = requestContextCaseData(source)
  const parts = contextual.parts.length
    ? contextual.parts
    : [{ id: source.partRequestId || source.id, lineItemId: source.partRequestId || source.id, partName: source.title || 'Requested part', quantity: 1, disposition: source.procurementType === 'Foreign' ? 'foreign_vendor' : 'local_vendor', unitOfMeasure: 'pcs' }]
  const status = source.status === 'Completed' ? 'approved' : source.status === 'Rejected' ? 'rejected' : 'in_progress'
  const quotations = (source.supplierQuotations || []).map((quote: BackendCase) => ({
    id: quote.id,
    vendorName: quote.supplierName || quote.supplierId || 'Supplier',
    sourcingType: 'Local' as const,
    lineItems: [],
    grandTotal: Number(quote.grandTotal || 0),
    currency: quote.currency || 'BDT',
    attachmentUrls: [],
    attachmentNames: [],
    submittedAt: quote.createdAt || source.updatedAt || new Date().toISOString(),
  }))
  return {
    id: source.id,
    caseNumber: source.id,
    partRequestId: source.partRequestId || source.materialRequestId || source.id,
    customerApprovalIds: [],
    parts,
    vehicleName: contextual.vehicleName,
    customerName: contextual.customerName,
    vehicleInfo: contextual.vehicleInfo,
    currentStep: stepFor(source.currentStage),
    status,
    quotations,
    purchaseOrders: [],
    grns: [],
    history: [],
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: source.updatedAt || new Date().toISOString(),
    backendStage: source.currentStage,
  }
}
