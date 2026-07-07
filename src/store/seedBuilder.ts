/**
 * Seed data builder: Converts raw CSV-generated arrays into fully typed store objects.
 */
import type {
  CWConcern,
  CWConcernCategory,
  CWService,
  CWServiceSeverity,
  CWServiceStatus,
  CWVehicleSize,
} from '../types/cw'
import { CONCERN_CATEGORIES, RAW_CONCERNS, RAW_SERVICES } from './seedData'

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function buildConcernsSeed(autoShopId: string): {
  concernCategories: CWConcernCategory[]
  concerns: CWConcern[]
} {
  const ts = nowIso()

  const concernCategories: CWConcernCategory[] = CONCERN_CATEGORIES.map((name) => ({
    id: newId(),
    name,
    shopId: autoShopId,
    status: 'Active' as const,
    createdAt: ts,
    updatedAt: ts,
  }))

  const catByName = new Map(concernCategories.map((c) => [c.name, c] as const))

  const concerns: CWConcern[] = RAW_CONCERNS.map((r) => {
    const cat = catByName.get(r.category) ?? concernCategories[0]
    return {
      id: newId(),
      categoryId: cat.id,
      code: r.code,
      name: r.name,
      processTimeMins: r.processTimeMins,
      status: 'Active' as const,
      createdAt: ts,
      updatedAt: ts,
    }
  })

  return { concernCategories, concerns }
}

export function buildServicesSeed(
  autoShopId: string,
  paintShopId: string,
  bodyShopId: string,
): CWService[] {
  const ts = nowIso()

  const shopMap: Record<string, string> = {
    Auto: autoShopId,
    Paint: paintShopId,
    Body: bodyShopId,
  }

  return RAW_SERVICES.map((r) => ({
    id: newId(),
    code: r.code,
    category: r.category,
    section: r.section || undefined,
    description: r.description || r.name,
    vehicleSize: (r.vehicleSize as CWVehicleSize) || undefined,
    severity: (r.severity as CWServiceSeverity) || undefined,
    processTimeMins: r.processTimeMins,
    ratePerHr: undefined,
    price: r.mrp,
    shopId: shopMap[r.shopType] ?? autoShopId,
    stages: r.stages?.map((s) => ({
      id: newId(),
      name: s.name,
      order: s.order,
      durationMins: s.durationMins,
    })),
    status: 'Active' as CWServiceStatus,
    createdAt: ts,
    updatedAt: ts,
  }))
}
