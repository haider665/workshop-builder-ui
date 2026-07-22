/**
 * Tests for CWVehicle type integrity and API payload construction.
 * Ensures modelYear and other vehicle fields are correctly handled.
 */
import { describe, it, expect } from 'vitest'

// ── Extracted logic from CreateVehiclePage ──

type CreateVehicleInput = {
  customerId: string
  registrationNo: string
  make?: string
  model?: string
  vehicleSize: string
  modelYear?: string
  modelVariant?: string
  exteriorColor?: string
  exteriorColorCode?: string
}

function buildCreatePayload(input: CreateVehicleInput) {
  return {
    customerId: input.customerId,
    registrationNo: input.registrationNo,
    make: input.make?.trim() || undefined,
    model: input.model?.trim() || undefined,
    vehicleSize: input.vehicleSize,
    modelYear: input.modelYear ? parseInt(input.modelYear, 10) : undefined,
    modelVariant: input.modelVariant?.trim() || undefined,
    exteriorColor: input.exteriorColor || undefined,
    exteriorColorCode: input.exteriorColorCode?.trim() || undefined,
  }
}

function validateCreateVehicle(input: CreateVehicleInput): string | null {
  if (!input.customerId) return 'Select a customer'
  if (!input.registrationNo) return 'Registration number is required'
  if (!input.vehicleSize) return 'Vehicle size is required'
  return null
}

// ── Tests ──

describe('Create Vehicle Payload', () => {
  const base: CreateVehicleInput = {
    customerId: 'cust-1',
    registrationNo: 'DHA-KA-11-1234',
    vehicleSize: 'Medium',
  }

  it('includes modelYear when provided', () => {
    const payload = buildCreatePayload({ ...base, modelYear: '2024' })
    expect(payload.modelYear).toBe(2024)
  })

  it('excludes modelYear when empty', () => {
    const payload = buildCreatePayload({ ...base, modelYear: '' })
    expect(payload.modelYear).toBeUndefined()
  })

  it('excludes modelYear when not provided', () => {
    const payload = buildCreatePayload(base)
    expect(payload.modelYear).toBeUndefined()
  })

  it('trims whitespace from make/model', () => {
    const payload = buildCreatePayload({ ...base, make: '  Toyota  ', model: '  Corolla  ' })
    expect(payload.make).toBe('Toyota')
    expect(payload.model).toBe('Corolla')
  })

  it('converts empty string fields to undefined', () => {
    const payload = buildCreatePayload({ ...base, make: '', model: '', modelVariant: '' })
    expect(payload.make).toBeUndefined()
    expect(payload.model).toBeUndefined()
    expect(payload.modelVariant).toBeUndefined()
  })
})

describe('Create Vehicle Validation', () => {
  const valid: CreateVehicleInput = {
    customerId: 'cust-1',
    registrationNo: 'DHA-KA-11-1234',
    vehicleSize: 'Medium',
  }

  it('passes with required fields', () => {
    expect(validateCreateVehicle(valid)).toBeNull()
  })

  it('fails without customerId', () => {
    expect(validateCreateVehicle({ ...valid, customerId: '' })).toBeTruthy()
  })

  it('fails without registrationNo', () => {
    expect(validateCreateVehicle({ ...valid, registrationNo: '' })).toBeTruthy()
  })

  it('fails without vehicleSize', () => {
    expect(validateCreateVehicle({ ...valid, vehicleSize: '' })).toBeTruthy()
  })
})
