import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { colors, shadows, radii, motion } from '../theme/tokens'

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  color?: string
}

export function StatCard({ icon, label, value, color = colors.slate[900] }: StatCardProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        flex: '1 1 180px',
        borderRadius: radii.lg,
        background: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        boxShadow: shadows.card,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: `box-shadow ${motion.normal} ${motion.springEase}`,
        '&:hover': {
          boxShadow: shadows.elevated,
        },
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderRadius: radii.md,
          bgcolor: color,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: colors.slate[900], lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500], fontWeight: 500, mt: 0.25 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}
