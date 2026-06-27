export type Role =
  | 'Admin'
  | 'Guard'
  | 'Job Creation'
  | 'CRE'
  | 'Technician'
  | 'Service Advisor'
  | 'Service Engineer'
  | 'QC'

export const CORE_ROLES: Role[] = ['Admin', 'Guard', 'Job Creation']

export const OPTIONAL_ROLES: Role[] = [
  'CRE',
  'Technician',
  'Service Advisor',
  'Service Engineer',
  'QC',
]

export const ALL_ROLES: Role[] = [...CORE_ROLES, ...OPTIONAL_ROLES]
