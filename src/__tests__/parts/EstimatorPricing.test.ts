/**
 * Tests for Estimator pricing logic — Issue #6.
 * Validates pricing input and remarks handling.
 */
import { describe, it, expect } from 'vitest'

// ── Extracted logic from EstimatorPage ──

type PricingData = {
  lineId: string
  appointmentId: string
  partName: string
  partNumber?: string
  description: string
  sourcingType: string
  sellPrice: string
  quantity: string
  deliveryDate: string
  inStock: boolean
  remarks: string
}

function validatePricing(data: PricingData): string | null {
  const sp = parseFloat(data.sellPrice)
  if (isNaN(sp) || sp <= 0) {
    return 'Enter valid sell price'
  }
  return null
}

function buildPricePayload(data: PricingData) {
  const sp = parseFloat(data.sellPrice)
  const qty = parseInt(data.quantity, 10) || 1
  return {
    unitPrice: sp,
    sellPrice: sp,
    quantity: qty,
    sourcingType: data.sourcingType,
    estimatedDeliveryDate: data.deliveryDate || undefined,
    remarks: data.remarks.trim() || undefined,
  }
}

function calcTotal(sellPrice: string, quantity: string): number {
  const sp = parseFloat(sellPrice) || 0
  const qty = parseInt(quantity, 10) || 1
  return sp * qty
}

// ── Tests ──

describe('Estimator Pricing Validation', () => {
  const basePricing: PricingData = {
    lineId: 'line-1',
    appointmentId: 'appt-1',
    partName: 'Oil Filter',
    description: 'Engine oil filter',
    sourcingType: 'OEM',
    sellPrice: '350',
    quantity: '2',
    deliveryDate: '2024-03-15',
    inStock: true,
    remarks: '',
  }

  describe('validatePricing', () => {
    it('passes for valid price', () => {
      expect(validatePricing(basePricing)).toBeNull()
    })

    it('fails for empty sell price', () => {
      expect(validatePricing({ ...basePricing, sellPrice: '' })).toBeTruthy()
    })

    it('fails for zero price', () => {
      expect(validatePricing({ ...basePricing, sellPrice: '0' })).toBeTruthy()
    })

    it('fails for negative price', () => {
      expect(validatePricing({ ...basePricing, sellPrice: '-10' })).toBeTruthy()
    })

    it('fails for non-numeric price', () => {
      expect(validatePricing({ ...basePricing, sellPrice: 'abc' })).toBeTruthy()
    })

    it('passes for decimal price', () => {
      expect(validatePricing({ ...basePricing, sellPrice: '99.50' })).toBeNull()
    })
  })

  describe('buildPricePayload', () => {
    it('includes remarks when provided', () => {
      const payload = buildPricePayload({ ...basePricing, remarks: 'OEM part from Japan' })
      expect(payload.remarks).toBe('OEM part from Japan')
    })

    it('excludes remarks when empty', () => {
      const payload = buildPricePayload({ ...basePricing, remarks: '' })
      expect(payload.remarks).toBeUndefined()
    })

    it('trims whitespace-only remarks', () => {
      const payload = buildPricePayload({ ...basePricing, remarks: '   ' })
      expect(payload.remarks).toBeUndefined()
    })

    it('excludes empty delivery date', () => {
      const payload = buildPricePayload({ ...basePricing, deliveryDate: '' })
      expect(payload.estimatedDeliveryDate).toBeUndefined()
    })

    it('defaults quantity to 1 for invalid input', () => {
      const payload = buildPricePayload({ ...basePricing, quantity: '' })
      expect(payload.quantity).toBe(1)
    })

    it('parses quantity correctly', () => {
      const payload = buildPricePayload({ ...basePricing, quantity: '5' })
      expect(payload.quantity).toBe(5)
    })
  })

  describe('calcTotal', () => {
    it('multiplies price by quantity', () => {
      expect(calcTotal('350', '2')).toBe(700)
    })

    it('defaults to qty 1 for empty', () => {
      expect(calcTotal('350', '')).toBe(350)
    })

    it('returns 0 for empty price', () => {
      expect(calcTotal('', '2')).toBe(0)
    })

    it('handles decimals', () => {
      expect(calcTotal('99.50', '3')).toBeCloseTo(298.50)
    })
  })
})
