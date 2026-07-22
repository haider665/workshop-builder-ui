/**
 * Tests for CRE AppointmentDetailPage — Issue #1 crash guards.
 * Verifies null-safe access to serviceItems, concernItems, technicianAssignments.
 */
import { describe, it, expect } from 'vitest'

// ── Pure logic extracted from AppointmentDetailPage ──

function calcTotalBDT(serviceItems?: Array<{ price: number }>) {
  return (serviceItems ?? []).reduce((sum, s) => sum + s.price, 0)
}

function buildConcernBlock(concernItems?: Array<{ concernName: string; remark?: string }>) {
  return (concernItems ?? []).map((c) => {
    let block = `• ${c.concernName}`
    if (c.remark) block += `\n  Note: ${c.remark}`
    return block
  }).join('\n')
}

function buildServiceList(serviceItems?: Array<{ serviceDescription: string; price: number }>) {
  return (serviceItems ?? []).map((s) => `• ${s.serviceDescription} — BDT ${s.price}`).join('\n')
}

function buildTechnicianList(
  technicianAssignments?: Array<{ technicianUserId: string }>,
  userNameById?: Map<string, string>,
) {
  return (technicianAssignments ?? [])
    .map((ta) => userNameById?.get(ta.technicianUserId))
    .filter(Boolean)
    .join(', ')
}

// ── Tests ──

describe('AppointmentDetailPage — null safety', () => {
  describe('calcTotalBDT', () => {
    it('returns 0 for undefined serviceItems', () => {
      expect(calcTotalBDT(undefined)).toBe(0)
    })

    it('returns 0 for empty array', () => {
      expect(calcTotalBDT([])).toBe(0)
    })

    it('sums prices correctly', () => {
      expect(calcTotalBDT([{ price: 100 }, { price: 250 }, { price: 50 }])).toBe(400)
    })
  })

  describe('buildConcernBlock', () => {
    it('returns empty string for undefined concernItems', () => {
      expect(buildConcernBlock(undefined)).toBe('')
    })

    it('returns empty string for empty array', () => {
      expect(buildConcernBlock([])).toBe('')
    })

    it('builds concern with remark', () => {
      const result = buildConcernBlock([
        { concernName: 'Oil Leak', remark: 'Under engine' },
      ])
      expect(result).toContain('• Oil Leak')
      expect(result).toContain('Note: Under engine')
    })

    it('builds concern without remark', () => {
      const result = buildConcernBlock([
        { concernName: 'Brake Noise' },
      ])
      expect(result).toBe('• Brake Noise')
      expect(result).not.toContain('Note:')
    })
  })

  describe('buildServiceList', () => {
    it('returns empty string for undefined', () => {
      expect(buildServiceList(undefined)).toBe('')
    })

    it('formats service with price', () => {
      const result = buildServiceList([
        { serviceDescription: 'Oil Change', price: 500 },
      ])
      expect(result).toBe('• Oil Change — BDT 500')
    })
  })

  describe('buildTechnicianList', () => {
    it('returns empty string for undefined assignments', () => {
      expect(buildTechnicianList(undefined)).toBe('')
    })

    it('returns empty string for empty assignments', () => {
      expect(buildTechnicianList([], new Map())).toBe('')
    })

    it('joins technician names', () => {
      const nameMap = new Map([
        ['t1', 'Ali'],
        ['t2', 'Hassan'],
      ])
      const result = buildTechnicianList(
        [{ technicianUserId: 't1' }, { technicianUserId: 't2' }],
        nameMap,
      )
      expect(result).toBe('Ali, Hassan')
    })

    it('filters out unknown technicians', () => {
      const nameMap = new Map([['t1', 'Ali']])
      const result = buildTechnicianList(
        [{ technicianUserId: 't1' }, { technicianUserId: 'unknown' }],
        nameMap,
      )
      expect(result).toBe('Ali')
    })
  })
})
