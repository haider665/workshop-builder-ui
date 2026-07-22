/**
 * Tests for the Picker & Receiver requisition workflow.
 * Verifies auto-creation, status transitions, and line tagging.
 */
import { describe, it, expect } from 'vitest'
import type { CWRequisitionLine, CWRequisitionStatus } from '../../types/cw'

// ── Extracted logic: auto-requisition line builder ──

type ApprovedEstimateLine = {
  id: string
  appointmentId: string
  partId: string | null
  partNumber: string | null
  partName: string | null
  quantity: number
  concernItemId: string | null
  status: string
}

type ConcernItem = {
  id: string
  bayId?: string
}

function buildRequisitionLines(
  approvedLines: ApprovedEstimateLine[],
  concernItems: ConcernItem[],
): Array<{ partId: string; partNumber: string; partName: string; quantity: number; bayId?: string; concernItemId?: string; estimateLineId: string }> {
  const concernBayMap = new Map<string, string>()
  for (const ci of concernItems) {
    if (ci.bayId) concernBayMap.set(ci.id, ci.bayId)
  }
  const linesWithParts = approvedLines.filter((el) => el.partId && el.status === 'Approved')
  return linesWithParts.map((el) => ({
    partId: el.partId!,
    partNumber: el.partNumber ?? '',
    partName: el.partName ?? '',
    quantity: el.quantity,
    estimateLineId: el.id,
    bayId: el.concernItemId ? concernBayMap.get(el.concernItemId) : undefined,
    concernItemId: el.concernItemId ?? undefined,
  }))
}

// ── Extracted logic: requisition status transitions ──

const VALID_ACKNOWLEDGE_FROM: CWRequisitionStatus[] = ['Created', 'Sent to Store']
const VALID_PICK_FROM: CWRequisitionStatus[] = ['Request Received', 'Sent to Store', 'Partially Ready', 'Part Ready', 'Picked']
const VALID_COLLECT_FROM: CWRequisitionStatus[] = ['Picked', 'Part Ready', 'Partially Ready']
const VALID_RECEIVE_FROM: CWRequisitionStatus[] = ['Picked']

function canAcknowledge(status: CWRequisitionStatus): boolean {
  return VALID_ACKNOWLEDGE_FROM.includes(status)
}

function canPick(status: CWRequisitionStatus): boolean {
  return VALID_PICK_FROM.includes(status)
}

function canCollect(status: CWRequisitionStatus): boolean {
  return VALID_COLLECT_FROM.includes(status)
}

function canReceive(status: CWRequisitionStatus): boolean {
  return VALID_RECEIVE_FROM.includes(status)
}

function allLinesPicked(lines: CWRequisitionLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.status === 'Picked')
}

// ── Tests ──

describe('Auto-Requisition Line Builder', () => {
  const approvedLines: ApprovedEstimateLine[] = [
    { id: 'el-1', appointmentId: 'appt-1', partId: 'part-oil', partNumber: 'OIL-001', partName: 'Oil Filter', quantity: 1, concernItemId: 'ci-1', status: 'Approved' },
    { id: 'el-2', appointmentId: 'appt-1', partId: 'part-brake', partNumber: 'BRK-002', partName: 'Brake Pad', quantity: 2, concernItemId: 'ci-2', status: 'Approved' },
    { id: 'el-3', appointmentId: 'appt-1', partId: null, partNumber: null, partName: null, quantity: 1, concernItemId: 'ci-1', status: 'Approved' },
    { id: 'el-4', appointmentId: 'appt-1', partId: 'part-air', partNumber: 'AIR-003', partName: 'Air Filter', quantity: 1, concernItemId: 'ci-1', status: 'Priced' },
  ]

  const concernItems: ConcernItem[] = [
    { id: 'ci-1', bayId: 'bay-A' },
    { id: 'ci-2', bayId: 'bay-B' },
  ]

  it('only includes lines with partId and Approved status', () => {
    const lines = buildRequisitionLines(approvedLines, concernItems)
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.partId)).toEqual(['part-oil', 'part-brake'])
  })

  it('maps bayId from concern items', () => {
    const lines = buildRequisitionLines(approvedLines, concernItems)
    expect(lines[0].bayId).toBe('bay-A')
    expect(lines[1].bayId).toBe('bay-B')
  })

  it('preserves estimateLineId', () => {
    const lines = buildRequisitionLines(approvedLines, concernItems)
    expect(lines[0].estimateLineId).toBe('el-1')
    expect(lines[1].estimateLineId).toBe('el-2')
  })

  it('handles missing concernItemId gracefully', () => {
    const noCI: ApprovedEstimateLine[] = [
      { id: 'el-x', appointmentId: 'appt-1', partId: 'part-1', partNumber: 'P-1', partName: 'Part', quantity: 1, concernItemId: null, status: 'Approved' },
    ]
    const lines = buildRequisitionLines(noCI, concernItems)
    expect(lines[0].bayId).toBeUndefined()
    expect(lines[0].concernItemId).toBeUndefined()
  })

  it('handles missing bay on concern item', () => {
    const noBay: ConcernItem[] = [{ id: 'ci-1' }]
    const lines = buildRequisitionLines(approvedLines, noBay)
    expect(lines[0].bayId).toBeUndefined()
  })

  it('returns empty array when no approved lines with parts', () => {
    const noParts: ApprovedEstimateLine[] = [
      { id: 'el-x', appointmentId: 'appt-1', partId: null, partNumber: null, partName: null, quantity: 1, concernItemId: 'ci-1', status: 'Approved' },
    ]
    expect(buildRequisitionLines(noParts, concernItems)).toHaveLength(0)
  })
})

describe('Requisition Status Transitions', () => {
  it('can acknowledge from Created and Sent to Store', () => {
    expect(canAcknowledge('Created')).toBe(true)
    expect(canAcknowledge('Sent to Store')).toBe(true)
    expect(canAcknowledge('Picked')).toBe(false)
    expect(canAcknowledge('Received')).toBe(false)
  })

  it('can pick from Request Received and Partially Ready', () => {
    expect(canPick('Request Received')).toBe(true)
    expect(canPick('Partially Ready')).toBe(true)
    expect(canPick('Created')).toBe(false)
    expect(canPick('Received')).toBe(false)
  })

  it('can collect from Picked', () => {
    expect(canCollect('Picked')).toBe(true)
    expect(canCollect('Request Received')).toBe(false)
    expect(canCollect('Received')).toBe(false)
  })

  it('can receive from Picked only', () => {
    expect(canReceive('Picked')).toBe(true)
    expect(canReceive('Part Ready')).toBe(false)
    expect(canReceive('Request Received')).toBe(false)
    expect(canReceive('Closed')).toBe(false)
  })
})

describe('Requisition Line Status', () => {
  it('allLinesPicked returns true when all picked', () => {
    const lines: CWRequisitionLine[] = [
      { id: '1', partId: 'p1', partNumber: 'PN1', partName: 'Part 1', quantity: 1, stockUnitIds: [], status: 'Picked' },
      { id: '2', partId: 'p2', partNumber: 'PN2', partName: 'Part 2', quantity: 2, stockUnitIds: [], status: 'Picked' },
    ]
    expect(allLinesPicked(lines)).toBe(true)
  })

  it('allLinesPicked returns false when some pending', () => {
    const lines: CWRequisitionLine[] = [
      { id: '1', partId: 'p1', partNumber: 'PN1', partName: 'Part 1', quantity: 1, stockUnitIds: [], status: 'Picked' },
      { id: '2', partId: 'p2', partNumber: 'PN2', partName: 'Part 2', quantity: 2, stockUnitIds: [], status: 'Pending' },
    ]
    expect(allLinesPicked(lines)).toBe(false)
  })

  it('allLinesPicked returns false for empty lines', () => {
    expect(allLinesPicked([])).toBe(false)
  })
})
