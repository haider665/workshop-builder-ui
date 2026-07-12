import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { colors } from '../theme/tokens'

export function Page(props: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
  fullWidth?: boolean
}) {
  return (
    <Box
      sx={{
        py: { xs: 3, md: 4 },
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexDirection: { xs: 'column', md: 'row' },
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              color: colors.slate[900],
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.5rem', md: '1.75rem' },
            }}
          >
            {props.title}
          </Typography>
          {props.subtitle ? (
            <Typography
              sx={{
                color: colors.slate[500],
                fontSize: '0.875rem',
                mt: 0.5,
                fontWeight: 400,
              }}
            >
              {props.subtitle}
            </Typography>
          ) : null}
        </Box>
        {props.actions ? <Box>{props.actions}</Box> : null}
      </Box>
      {props.children}
    </Box>
  )
}
