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
  ProcurementStep,
  StepRecord,
  Quotation,
  CSDecision,
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

  // ── Procurement Pipeline actions (Phase B) ──
  advanceProcurementStep: (caseId: string, record: Omit<StepRecord, 'step'>) => void
  rejectProcurementStep: (caseId: string, note: string, actionByName: string) => void
  addQuotation: (caseId: string, quotation: Omit<Quotation, 'id' | 'submittedAt'>) => void
  updateQuotation: (caseId: string, quotationId: string, updates: Partial<Omit<Quotation, 'id' | 'submittedAt'>>) => void
  removeQuotation: (caseId: string, quotationId: string) => void
  setCSDecision: (caseId: string, decision: Omit<CSDecision, 'decidedAt'>) => void
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
                      // Reset all disposition-specific fields first
                      pickedFromCounter: disposition === 'in_stock' ? false : undefined,
                      localVendorName: disposition === 'local_vendor' ? (details?.localVendorName ?? '') : undefined,
                      localPrice: disposition === 'local_vendor' ? (details?.localPrice ?? 0) : undefined,
                      localQuantity: disposition === 'local_vendor' ? (details?.localQuantity ?? li.quantity) : undefined,
                      localDeliveryDays: disposition === 'local_vendor' ? (details?.localDeliveryDays ?? 0) : undefined,
                      foreignNote: disposition === 'foreign_vendor' ? (details?.foreignNote ?? '') : undefined,
                      completed: false, // Reset completion on disposition change
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

    // Skip items that already have an approval
    const existingKeys = new Set(state.customerApprovals.map((a) => `${a.partRequestId}:${a.lineItemId}`))
    const newApprovals: MockCustomerApproval[] = needApproval
      .filter((li) => !existingKeys.has(`${requestId}:${li.id}`))
      .map((li) => ({
        id: newId(),
        partRequestId: requestId,
        lineItemId: li.id,
        partName: li.partName,
        partNumber: li.partNumber,
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

      // If approved, spawn a procurement case
      let newCases = state.procurementCases
      if (status === 'approved') {
        const approval = updatedApprovals.find((a) => a.id === approvalId)
        if (approval) {
          const existing = state.procurementCases.find(
            (c) => c.customerApprovalId === approvalId,
          )
          if (!existing) {
            const req = state.partRequests.find((r) => r.id === approval.partRequestId)
            const caseNum = `PC-${String(state.procurementCases.length + 1).padStart(3, '0')}`
            const newCase: ProcurementCase = {
              id: newId(),
              caseNumber: caseNum,
              partRequestId: approval.partRequestId,
              lineItemId: approval.lineItemId,
              customerApprovalId: approvalId,
              partName: approval.partName,
              partNumber: approval.partNumber,
              quantity: approval.quantity,
              disposition: approval.disposition,
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

  // ── Procurement Pipeline (Phase B) ──

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
        // Attach step record to the appropriate field
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
          // Final approval
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
}))

// ── Helpers to extract vehicle info from display string ──

function extractRegNo(vehicleName: string): string {
  const match = vehicleName.match(/\(([^)]+)\)/)
  return match ? match[1] : 'N/A'
}

function extractMake(vehicleName: string): string {
  return vehicleName.split(' ')[0] || 'Unknown'
}

function extractModel(vehicleName: string): string {
  const parts = vehicleName.split(' ')
  // Skip make, take until year or parenthesis
  const modelParts: string[] = []
  for (let i = 1; i < parts.length; i++) {
    if (/^\d{4}$/.test(parts[i]) || parts[i].startsWith('(')) break
    modelParts.push(parts[i])
  }
  return modelParts.join(' ') || 'Unknown'
}
