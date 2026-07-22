/**
 * Tests for SA vehicle inspection validation — Issue #2/3.
 * SA must fill required vehicle fields before submitting inspection.
 */
import { describe, it, expect } from 'vitest'

// ── Extracted validation logic from SAAppointmentDetailPage ──

type VehicleFields = {
  model: string
  modelVariant: string
  modelYear: string
  exteriorColor: string
  exteriorColorCode: string
}

function validateVehicleFields(fields: VehicleFields): string | null {
  if (
    !fields.model.trim() ||
    !fields.modelVariant.trim() ||
    !fields.modelYear.trim() ||
    !fields.exteriorColor.trim() ||
    !fields.exteriorColorCode.trim()
  ) {
    return 'Please fill all required vehicle fields before submitting inspection.'
  }
  return null
}

function parseModelYear(value: string): number | undefined {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

// ── Tests ──

describe('SA Vehicle Inspection Validation', () => {
  const validFields: VehicleFields = {
    model: 'Civic',
    modelVariant: 'EX',
    modelYear: '2024',
    exteriorColor: 'Pearl White',
    exteriorColorCode: 'NH-731P',
  }

  it('passes when all fields filled', () => {
    expect(validateVehicleFields(validFields)).toBeNull()
  })

  it('fails when model empty', () => {
    expect(validateVehicleFields({ ...validFields, model: '' })).toBeTruthy()
  })

  it('fails when model is whitespace only', () => {
    expect(validateVehicleFields({ ...validFields, model: '   ' })).toBeTruthy()
  })

  it('fails when modelVariant empty', () => {
    expect(validateVehicleFields({ ...validFields, modelVariant: '' })).toBeTruthy()
  })

  it('fails when modelYear empty', () => {
    expect(validateVehicleFields({ ...validFields, modelYear: '' })).toBeTruthy()
  })

  it('fails when exteriorColor empty', () => {
    expect(validateVehicleFields({ ...validFields, exteriorColor: '' })).toBeTruthy()
  })

  it('fails when exteriorColorCode empty', () => {
    expect(validateVehicleFields({ ...validFields, exteriorColorCode: '' })).toBeTruthy()
  })

  it('fails when ALL fields empty', () => {
    expect(validateVehicleFields({
      model: '',
      modelVariant: '',
      modelYear: '',
      exteriorColor: '',
      exteriorColorCode: '',
    })).toBeTruthy()
  })
})

describe('parseModelYear', () => {
  it('parses valid year', () => {
    expect(parseModelYear('2024')).toBe(2024)
  })

  it('returns undefined for empty', () => {
    expect(parseModelYear('')).toBeUndefined()
  })

  it('returns undefined for non-numeric', () => {
    expect(parseModelYear('abc')).toBeUndefined()
  })

  it('parses year with leading zeros', () => {
    expect(parseModelYear('02024')).toBe(2024)
  })
})
