import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material'
import { KeyboardArrowDown } from '@mui/icons-material'
import { useState, type ReactNode } from 'react'
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
  /** Allow the section body to be expanded and collapsed */
  collapsible?: boolean
  /** Initial state when collapse support is enabled */
  defaultCollapsed?: boolean
  children: ReactNode
}

export function SectionCard({
  title,
  icon,
  children,
  actions,
  collapsible = true,
  defaultCollapsed = true,
}: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed)

  function toggleCollapsed() {
    if (collapsible) setCollapsed((value) => !value)
  }

  return (
    <Box sx={{
      borderRadius: radii.lg,
      border: `1px solid ${colors.border.default}`,
      background: colors.bg.card,
      boxShadow: shadows.card,
      overflow: 'hidden',
    }}>
      <Box
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? !collapsed : undefined}
        onClick={toggleCollapsed}
        onKeyDown={(event) => {
          if (collapsible && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            toggleCollapsed()
          }
        }}
        sx={{
        px: { xs: 1.75, sm: 3 }, py: { xs: 1.4, sm: 1.75 },
        borderBottom: `1px solid ${colors.border.default}`,
        background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: colors.slate[900], borderRadius: '0 4px 4px 0',
        },
        cursor: collapsible ? 'pointer' : 'default',
      }}>
        <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: 'center', minWidth: 0 }}>
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
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} onClick={(event) => event.stopPropagation()}>
          {actions}
          {collapsible && (
            <IconButton
              size="small"
              aria-label={collapsed ? 'Expand ' + title : 'Collapse ' + title}
              onClick={toggleCollapsed}
              sx={{
                border: '1px solid',
                borderColor: colors.border.default,
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 180ms ease',
              }}
            >
              <KeyboardArrowDown fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Box>
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5, minWidth: 0, overflow: 'hidden' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  )
}
