export type Role =
  | 'Admin'
  | 'Guard'
  | 'Job Controller'
  | 'CRO'
  | 'Technician'
  | 'Service Advisor'
  | 'Service Engineer'
  | 'Custom Role'

export const CORE_ROLES: Role[] = ['Admin', 'Guard', 'Job Controller']

export const OPTIONAL_ROLES: Role[] = [
  'CRO',
  'Technician',
  'Service Advisor',
  'Service Engineer',
  'Custom Role',
]

export const ALL_ROLES: Role[] = [...CORE_ROLES, ...OPTIONAL_ROLES]
