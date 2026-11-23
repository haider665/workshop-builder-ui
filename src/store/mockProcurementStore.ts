// ── Mock Procurement Store ──
// Dedicated Zustand store for the mock procurement workflow.
// Keeps mock procurement state separate from the main cwStore.

import { create } from 'zustand'
import type {
  MockPartRequest,
  ProcurementCase,
  StepRecord,
  Quotation,
  CSDecision,
  PurchaseOrder,
  GRN,
  POStatus,
  ProcurementStep,
} from '../types/procurementWorkflow'
import { NEXT_STEP, PREVIOUS_STEP } from '../types/procurementWorkflow'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

type MockProcurementState = {
  partRequests: MockPartRequest[]
  procurementCases: ProcurementCase[]

  // ── Procurement Pipeline actions ──
  advanceProcurementStep: (caseId: string, record: Omit<StepRecord, 'step'>, skipSteps?: ProcurementStep[]) => void
  setProcurementPartSelection: (caseId: string, selections: Record<string, boolean>) => void
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
  partRequests: [],
  procurementCases: [],

  // ── Procurement Pipeline ──

  advanceProcurementStep: (caseId, record, skipSteps = []) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) => {
        if (c.id !== caseId) return c
        let nextStep = NEXT_STEP[c.currentStep]
        while (nextStep && skipSteps.includes(nextStep)) {
          nextStep = NEXT_STEP[nextStep]
        }
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

  setProcurementPartSelection: (caseId, selections) => {
    set((state) => ({
      procurementCases: state.procurementCases.map((c) => c.id !== caseId ? c : {
        ...c,
        parts: c.parts.map((part) => ({
          ...part,
          includeInProcurement: selections[part.lineItemId] ?? selections[part.id] ?? part.includeInProcurement ?? true,
        })),
        updatedAt: nowIso(),
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
