import { Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { statusColor } from '../utils/statusColor'

type StatusChipProps = {
  status: string
  size?: ChipProps['size']
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return <Chip label={status} color={statusColor(status)} size={size} />
}
