import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { colors, radii, shadows } from '../theme/tokens'

/* ─────────────────────────────────────────────────────────── */
/*  SectionCard — reusable section wrapper with accent header */
/* ─────────────────────────────────────────────────────────── */

type SectionCardProps = {
  /** Section title — rendered uppercase in the header */
  title: string
  /** Optional icon shown in a rounded pill */
  icon?: ReactNode
  /** Optional actions (buttons) rendered on the right of the header */
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, icon, children, actions }: SectionCardProps) {
  return (
    <Box sx={{
      borderRadius: radii.lg,
      border: `1px solid ${colors.border.default}`,
      background: colors.bg.card,
      boxShadow: shadows.card,
      overflow: 'hidden',
    }}>
      <Box sx={{
        px: 3, py: 1.75,
        borderBottom: `1px solid ${colors.border.default}`,
        background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: colors.slate[900], borderRadius: '0 4px 4px 0',
        },
      }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {icon && (
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px',
              background: colors.slate[100], display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: colors.slate[900],
            }}>
              {icon}
            </Box>
          )}
          <Typography sx={{
            fontWeight: 800, fontSize: '0.88rem',
            color: colors.slate[900], letterSpacing: '0.01em',
            textTransform: 'uppercase',
          }}>
            {title}
          </Typography>
        </Stack>
        {actions}
      </Box>
      <Box sx={{ px: 3, py: 1.5 }}>
        {children}
      </Box>
    </Box>
  )
}
