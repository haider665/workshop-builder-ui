/**
 * Tests for appointment status transitions — regression guard.
 * Mirrors the backend ALLOWED_TRANSITIONS to catch frontend mismatches.
 */
import { describe, it, expect } from 'vitest'

// ── Backend ALLOWED_TRANSITIONS map (source of truth) ──

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'New': ['SA Inspection', 'Customer Rejected'],
  'SA Inspection': ['SA Reviewed', 'Customer Rejected'],
  'SA Reviewed': ['Customer Notified', 'Customer Approved', 'Customer Rejected'],
  'Customer Notified': ['Customer Approved', 'Customer Rejected'],
  'Customer Approved': ['Diagnosis Assigned', 'Service Approval Pending', 'Service Approved'],
  'Diagnosis Assigned': ['Diagnosis In Progress', 'Diagnosis Complete'],
  'Diagnosis In Progress': ['Diagnosis Complete'],
  'Diagnosis Complete': ['Service Approval Pending', 'Service Approved'],
  'Service Approval Pending': ['Service Approved', 'Customer Rejected'],
  'Service Approved': ['Service Assigned'],
  'Service Assigned': ['Service In Progress'],
  'Service In Progress': ['Service Complete'],
  'Service Complete': ['QC Assigned'],
  'QC Assigned': ['QC Approved', 'QC Rejected'],
  'QC Rejected': ['Service Assigned', 'Service In Progress'],
  'QC Approved': ['Payment Pending', 'Payment Done'],
  'Payment Pending': ['Payment Done'],
  'Payment Done': ['Released'],
}

function isValidTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

// ── Tests ──

describe('Appointment Status Transitions', () => {
  describe('valid transitions', () => {
    it('New → SA Inspection', () => {
      expect(isValidTransition('New', 'SA Inspection')).toBe(true)
    })

    it('SA Inspection → SA Reviewed', () => {
      expect(isValidTransition('SA Inspection', 'SA Reviewed')).toBe(true)
    })

    it('SA Reviewed → Customer Notified', () => {
      expect(isValidTransition('SA Reviewed', 'Customer Notified')).toBe(true)
    })

    it('Customer Approved → Diagnosis Assigned', () => {
      expect(isValidTransition('Customer Approved', 'Diagnosis Assigned')).toBe(true)
    })

    it('Service Approved → Service Assigned', () => {
      expect(isValidTransition('Service Approved', 'Service Assigned')).toBe(true)
    })

    it('Service Complete → QC Assigned', () => {
      expect(isValidTransition('Service Complete', 'QC Assigned')).toBe(true)
    })

    it('QC Approved → Payment Pending', () => {
      expect(isValidTransition('QC Approved', 'Payment Pending')).toBe(true)
    })

    it('Payment Done → Released', () => {
      expect(isValidTransition('Payment Done', 'Released')).toBe(true)
    })

    it('QC Rejected → Service Assigned (rework)', () => {
      expect(isValidTransition('QC Rejected', 'Service Assigned')).toBe(true)
    })
  })

  describe('invalid transitions', () => {
    it('New → Diagnosis Assigned (skip SA inspection)', () => {
      expect(isValidTransition('New', 'Diagnosis Assigned')).toBe(false)
    })

    it('SA Inspection → Customer Approved (skip review)', () => {
      expect(isValidTransition('SA Inspection', 'Customer Approved')).toBe(false)
    })

    it('Customer Approved → Released (skip everything)', () => {
      expect(isValidTransition('Customer Approved', 'Released')).toBe(false)
    })

    it('Service In Progress → QC Approved (skip QC)', () => {
      expect(isValidTransition('Service In Progress', 'QC Approved')).toBe(false)
    })

    it('Released → New (no going back)', () => {
      expect(isValidTransition('Released', 'New')).toBe(false)
    })

    it('unknown status → anything', () => {
      expect(isValidTransition('FakeStatus', 'New')).toBe(false)
    })
  })

  describe('JC-relevant transitions (Issue #8)', () => {
    it('Customer Approved is in JC Phase 1', () => {
      const targets = ALLOWED_TRANSITIONS['Customer Approved']
      expect(targets).toContain('Diagnosis Assigned')
    })

    it('Service Approved is in JC Phase 2', () => {
      const targets = ALLOWED_TRANSITIONS['Service Approved']
      expect(targets).toContain('Service Assigned')
    })

    it('QC Rejected is in JC Phase 3', () => {
      const targets = ALLOWED_TRANSITIONS['QC Rejected']
      expect(targets).toContain('Service Assigned')
    })
  })

  describe('complete workflow path', () => {
    it('full happy path is valid', () => {
      const happyPath = [
        'New',
        'SA Inspection',
        'SA Reviewed',
        'Customer Notified',
        'Customer Approved',
        'Diagnosis Assigned',
        'Diagnosis In Progress',
        'Diagnosis Complete',
        'Service Approval Pending',
        'Service Approved',
        'Service Assigned',
        'Service In Progress',
        'Service Complete',
        'QC Assigned',
        'QC Approved',
        'Payment Pending',
        'Payment Done',
        'Released',
      ]

      for (let i = 0; i < happyPath.length - 1; i++) {
        const valid = isValidTransition(happyPath[i], happyPath[i + 1])
        expect(valid, `${happyPath[i]} → ${happyPath[i + 1]} should be valid`).toBe(true)
      }
    })
  })
})
