export type Role =
  | 'Admin'
  | 'Guard'
  | 'Job Creation'
  | 'CRE'
  | 'Technician'
  | 'Service Advisor'
  | 'Service Engineer'
  | 'QC'
  | 'Parts'
  | 'Parts Manager'
  | 'Parts Buyer / Estimator'
  | 'Store Keeper'
  | 'Procurement'
  | 'Procurement User'
  | 'Procurement Manager'
  | 'Accounts'
  | 'Accounts User'
  | 'Accounts Manager'

export const CORE_ROLES: Role[] = ['Admin', 'Guard', 'Job Creation']

export const OPTIONAL_ROLES: Role[] = [
  'CRE',
  'Technician',
  'Service Advisor',
  'Service Engineer',
  'QC',
  'Parts',
  'Parts Manager',
  'Parts Buyer / Estimator',
  'Store Keeper',
  'Procurement',
  'Procurement User',
  'Procurement Manager',
  'Accounts',
  'Accounts User',
  'Accounts Manager',
]

export const ALL_ROLES: Role[] = [...CORE_ROLES, ...OPTIONAL_ROLES]
