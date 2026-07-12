/** Maps appointment/workflow status to MUI Chip color */
export type ChipColor = 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'

const STATUS_MAP: Record<string, ChipColor> = {
  'New': 'info',
  'SA Inspection': 'primary',
  'SA Reviewed': 'warning',
  'Customer Notified': 'warning',
  'Customer Approved': 'success',
  'Customer Rejected': 'error',
  'Diagnosis Assigned': 'info',
  'Diagnosis In Progress': 'primary',
  'Diagnosis Complete': 'success',
  'Service Assigned': 'info',
  'Service In Progress': 'primary',
  'Service Complete': 'success',
  'QC Assigned': 'info',
  'QC Approved': 'success',
  'QC Rejected': 'error',
  'Payment Pending': 'warning',
  'Payment Done': 'success',
  'Released': 'success',
}

export function statusColor(status: string): ChipColor {
  return STATUS_MAP[status] ?? 'default'
}
