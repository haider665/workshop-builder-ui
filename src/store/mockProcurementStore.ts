// ── Mock Procurement Store ──
// Dedicated Zustand store for the mock procurement workflow.
// Keeps mock procurement state separate from the main cwStore.

import { create } from 'zustand'
import type {
  MockPartRequest,
  MockCustomerApproval,
  ProcurementCase,
  PartDisposition,
  CustomerApprovalStatus,
  StepRecord,
  Quotation,
  CSDecision,
  PurchaseOrder,
  GRN,
  POStatus,
  CasePart,
} from '../types/procurementWorkflow'
import { NEXT_STEP, PREVIOUS_STEP } from '../types/procurementWorkflow'
import {
  MOCK_PART_REQUESTS,
  MOCK_CUSTOMER_APPROVALS,
  MOCK_PROCUREMENT_CASES,
} from './mockProcurementData'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

type MockProcurementState = {
  partRequests: MockPartRequest[]
  customerApprovals: MockCustomerApproval[]
  procurementCases: ProcurementCase[]

  // ── Step 1: Triage actions ──
  setLineItemDisposition: (
    requestId: string,
    lineItemId: string,
    disposition: PartDisposition,
    details?: {
      localVendorName?: string
      localPrice?: number
      localQuantity?: number
      localDeliveryDays?: number
      foreignNote?: string
    },
  ) => void
  markLineItemCompleted: (requestId: string, lineItemId: string) => void

  // ── Customer Approval actions ──
  spawnCustomerApprovals: (requestId: string) => void
  setCustomerApprovalStatus: (approvalId: string, status: CustomerApprovalStatus, note?: string) => void

  // ── Procurement Pipeline actions ──
  advanceProcurementStep: (caseId: string, record: Omit<StepRecord, 'step'>) => void
  rejectProcurementStep: (caseId: string, note: string, actionByName: string) => void
  addQuotation: (caseId: string, quotation: Omit<Quotation, 'id' | 'submittedAt'>) => void
  updateQuotation: (caseId: string, quotationId: string, updates: Partial<Omit<Quotation, 'id' | 'submittedAt'>>) => void
  removeQuotation: (caseId: string, quotationId: string) => void
  setCSDecision: (caseId: string, decision: Omit<CSDecision, 'decidedAt'>) => void

  // ── PO actions ──
  generatePurchaseOrders: (caseId: string) => void
  placeOrder: (caseId: string, poId: string, byName: string, expectedDate?: string) => void
  updateOrderStatus: (caseId: string, poId: string, status: POStatus, note?: string) => void

  // ── GRN actions ──
  recordGRN: (caseId: string, grn: Omit<GRN, 'id' | 'grnNumber'>) => void
}

export const useMockProcurementStore = create<MockProcurementState>((set, get) => ({
  partRequests: MOCK_PART_REQUESTS,
  customerApprovals: MOCK_CUSTOMER_APPROVALS,
  procurementCases: MOCK_PROCUREMENT_CASES,

  // ── Step 1: Triage ──

  setLineItemDisposition: (requestId, lineItemId, disposition, details) => {
    set((state) => ({
      partRequests: state.partRequests.map((req) =>
        req.id !== requestId
          ? req
          : {
              ...req,
              lineItems: req.lineItems.map((li) =>
                li.id !== lineItemId
                  ? li
                  : {
                      ...li,
                      disposition,
                      pickedFromCounter: disposition === 'in_stock' ? false : undefined,
                      localVendorName: disposition === 'local_vendor' ? (details?.localVendorName ?? '') : undefined,
                      localPrice: disposition === 'local_vendor' ? (details?.localPrice ?? 0) : undefined,
                      localQuantity: disposition === 'local_vendor' ? (details?.localQuantity ?? li.quantity) : undefined,
                      localDeliveryDays: disposition === 'local_vendor' ? (details?.localDeliveryDays ?? 0) : undefined,
                      foreignNote: disposition === 'foreign_vendor' ? (details?.foreignNote ?? '') : undefined,
                      completed: false,
                    },
              ),
            },
      ),
    }))
  },

  markLineItemCompleted: (requestId, lineItemId) => {
    set((state) => ({
      partRequests: state.partRequests.map((req) =>
        req.id !== requestId
          ? req
          : {
              ...req,
              lineItems: req.lineItems.map((li) =>
                li.id !== lineItemId
                  ? li
                  : { ...li, completed: true, pickedFromCounter: li.disposition === 'in_stock' ? true : li.pickedFromCounter },
              ),
            },
      ),
    }))
  },

  // ── Customer Approval ──

  spawnCustomerApprovals: (requestId) => {
    const state = get()
    const req = state.partRequests.find((r) => r.id === requestId)
    if (!req) return

    const needApproval = req.lineItems.filter(
      (li) => li.completed && (li.disposition === 'local_vendor' || li.disposition === 'foreign_vendor'),
    )

    const existingKeys = new Set(state.customerApprovals.map((a) => `${a.partRequestId}:${a.lineItemId}`))
    const newApprovals: MockCustomerApproval[] = needApproval
      .filter((li) => !existingKeys.has(`${requestId}:${li.id}`))
      .map((li) => ({
        id: newId(),
        partRequestId: requestId,
        lineItemId: li.id,
        partName: li.partName,
        partNumber: li.partNumber,
        alternatePartNumbers: li.alternatePartNumbers,
        brand: li.brand,
        quantity: li.quantity,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        vehicleName: req.vehicleName,
        disposition: li.disposition as 'local_vendor' | 'foreign_vendor',
        estimatedPrice: li.localPrice,
        estimatedDeliveryDays: li.localDeliveryDays,
        vendorName: li.localVendorName,
        foreignNote: li.foreignNote,
        status: 'pending' as const,
        createdAt: nowIso(),
      }))

    if (newApprovals.length > 0) {
      set((state) => ({
        customerApprovals: [...state.customerApprovals, ...newApprovals],
      }))
    }
  },

  setCustomerApprovalStatus: (approvalId, status, note) => {
    set((state) => {
      const updatedApprovals = state.customerApprovals.map((a) =>
        a.id !== approvalId
          ? a
          : {
              ...a,
              status,
              approvedAt: status === 'approved' ? nowIso() : a.approvedAt,
              rejectedAt: status === 'rejected' ? nowIso() : a.rejectedAt,
              rejectionNote: status === 'rejected' ? note : a.rejectionNote,
            },
      )

      let newCases = state.procurementCases
      if (status === 'approved') {
        const approval = updatedApprovals.find((a) => a.id === approvalId)
        if (approval) {
          // Group: find or create a case for this partRequest
          const existingCase = state.procurementCases.find(
            (c) => c.partRequestId === approval.partRequestId,
          )
          if (existingCase) {
            // Add part to existing case if not already there
            const alreadyHasPart = existingCase.parts.some((p) => p.lineItemId === approval.lineItemId)
            if (!alreadyHasPart) {
              const newPart: CasePart = {
                id: newId(),
                lineItemId: approval.lineItemId,
                partName: approval.partName,
                partNumber: approval.partNumber,
                alternatePartNumbers: approval.alternatePartNumbers,
                brand: approval.brand,
                quantity: approval.quantity,
                disposition: approval.disposition,
              }
              newCases = state.procurementCases.map((c) =>
                c.id !== existingCase.id
                  ? c
                  : {
                      ...c,
                      parts: [...c.parts, newPart],
                      customerApprovalIds: [...c.customerApprovalIds, approvalId],
                      updatedAt: nowIso(),
                    },
              )
            }
          } else {
            // Create new case with this part
            const req = state.partRequests.find((r) => r.id === approval.partRequestId)
            const caseNum = `PC-${String(state.procurementCases.length + 1).padStart(3, '0')}`
            const newCase: ProcurementCase = {
              id: newId(),
              caseNumber: caseNum,
              partRequestId: approval.partRequestId,
              customerApprovalIds: [approvalId],
              parts: [{
                id: newId(),
                lineItemId: approval.lineItemId,
                partName: approval.partName,
                partNumber: approval.partNumber,
                alternatePartNumbers: approval.alternatePartNumbers,
                brand: approval.brand,
                quantity: approval.quantity,
                disposition: approval.disposition,
              }],
              vehicleName: approval.vehicleName,
              customerName: approval.customerName,
              vehicleInfo: {
                registrationNo: extractRegNo(approval.vehicleName),
                make: extractMake(approval.vehicleName),
                model: extractModel(approval.vehicleName),
                customerName: approval.customerName,
                customerPhone: approval.customerPhone,
              },
              currentStep: 'store_review',
              status: 'in_progress',
              quotations: [],
              purchaseOrders: [],
              grns: [],
              history: [],
              createdAt: nowIso(),
              updatedAt: nowIso(),
            }
            newCases = [...state.procurementCases, newCase]
          }
        }
      }

      return { customerApprovals: updatedApprovals, procurementCases: newCases }
    })
  },

  // ── Procurement Pipeline ──

  advanceProcurementStep: (caseId, record) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) => {
        if (c.id !== caseId) return c
        const nextStep = NEXT_STEP[c.currentStep]
        const stepRecord: StepRecord = { ...record, step: c.currentStep }
        const updated: ProcurementCase = {
          ...c,
          history: [...c.history, stepRecord],
          updatedAt: nowIso(),
        }
        switch (c.currentStep) {
          case 'store_review':
            updated.storeReview = stepRecord
            break
          case 'audit':
            updated.auditReview = stepRecord
            break
          case 'approval':
            updated.managementApproval = stepRecord
            break
        }
        if (nextStep) {
          updated.currentStep = nextStep
        } else {
          updated.status = 'approved'
        }
        return updated
      }),
    }))
  },

  rejectProcurementStep: (caseId, note, actionByName) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) => {
        if (c.id !== caseId) return c
        const prevStep = PREVIOUS_STEP[c.currentStep]
        const stepRecord: StepRecord = {
          step: c.currentStep,
          action: 'reject',
          actionByName,
          actionDate: nowIso(),
          note,
        }
        return {
          ...c,
          currentStep: prevStep ?? c.currentStep,
          history: [...c.history, stepRecord],
          updatedAt: nowIso(),
        }
      }),
    }))
  },

  addQuotation: (caseId, quotation) => {
    const q: Quotation = { ...quotation, id: newId(), submittedAt: nowIso() }
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId ? c : { ...c, quotations: [...c.quotations, q], updatedAt: nowIso() },
      ),
    }))
  },

  updateQuotation: (caseId, quotationId, updates) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              quotations: c.quotations.map((q) =>
                q.id !== quotationId ? q : { ...q, ...updates },
              ),
              updatedAt: nowIso(),
            },
      ),
    }))
  },

  removeQuotation: (caseId, quotationId) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId
          ? c
          : { ...c, quotations: c.quotations.filter((q) => q.id !== quotationId), updatedAt: nowIso() },
      ),
    }))
  },

  setCSDecision: (caseId, decision) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId
          ? c
          : { ...c, csDecision: { ...decision, decidedAt: nowIso() }, updatedAt: nowIso() },
      ),
    }))
  },

  // ── PO ──

  generatePurchaseOrders: (caseId) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) => {
        if (c.id !== caseId || !c.csDecision || c.purchaseOrders.length > 0) return c
        // Group CS decision items by vendor
        const byVendor = new Map<string, typeof c.csDecision.items>()
        for (const item of c.csDecision.items) {
          const list = byVendor.get(item.selectedVendorName) ?? []
          list.push(item)
          byVendor.set(item.selectedVendorName, list)
        }
        const pos: PurchaseOrder[] = []
        let poIdx = 1
        for (const [vendorName, items] of byVendor) {
          // Find vendor info from quotations
          const vendorQuot = c.quotations.find((q) => q.vendorName === vendorName)
          pos.push({
            id: newId(),
            poNumber: `${c.caseNumber}-PO-${String(poIdx).padStart(2, '0')}`,
            vendorName,
            vendorContact: vendorQuot?.vendorContact,
            sourcingType: vendorQuot?.sourcingType ?? 'Local',
            lineItems: items.map((item) => ({
              casePartId: item.casePartId,
              partName: item.partName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            })),
            grandTotal: items.reduce((sum, i) => sum + i.totalPrice, 0),
            currency: 'BDT',
            status: 'draft',
            createdAt: nowIso(),
          })
          poIdx++
        }
        return { ...c, purchaseOrders: pos, updatedAt: nowIso() }
      }),
    }))
  },

  placeOrder: (caseId, poId, byName, expectedDate) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              purchaseOrders: c.purchaseOrders.map((po) =>
                po.id !== poId
                  ? po
                  : { ...po, status: 'placed' as const, placedAt: nowIso(), placedByName: byName, expectedDeliveryDate: expectedDate },
              ),
              updatedAt: nowIso(),
            },
      ),
    }))
  },

  updateOrderStatus: (caseId, poId, status, note) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              purchaseOrders: c.purchaseOrders.map((po) =>
                po.id !== poId
                  ? po
                  : {
                      ...po,
                      status,
                      trackingNote: note ?? po.trackingNote,
                      deliveredAt: status === 'delivered' ? nowIso() : po.deliveredAt,
                    },
              ),
              updatedAt: nowIso(),
            },
      ),
    }))
  },

  // ── GRN ──

  recordGRN: (caseId, grn) => {
    const grnCount = get().procurementCases.find((c) => c.id === caseId)?.grns.length ?? 0
    const newGRN: GRN = {
      ...grn,
      id: newId(),
      grnNumber: `GRN-${String(grnCount + 1).padStart(3, '0')}`,
    }
    set((state) => ({
      procurementCases: state.procurementCases.map((c) =>
        c.id !== caseId ? c : { ...c, grns: [...c.grns, newGRN], updatedAt: nowIso() },
      ),
    }))
  },
}))

// ── Helpers ──

function extractRegNo(vehicleName: string): string {
  const match = vehicleName.match(/\(([^)]+)\)/)
  return match ? match[1] : 'N/A'
}

function extractMake(vehicleName: string): string {
  return vehicleName.split(' ')[0] || 'Unknown'
}

function extractModel(vehicleName: string): string {
  const parts = vehicleName.split(' ')
  const modelParts: string[] = []
  for (let i = 1; i < parts.length; i++) {
    if (/^\d{4}$/.test(parts[i]) || parts[i].startsWith('(')) break
    modelParts.push(parts[i])
  }
  return modelParts.join(' ') || 'Unknown'
}
