import { Box, Container, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function Page(props: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {props.title}
          </Typography>
          {props.subtitle ? (
            <Typography variant="body1" color="text.secondary">
              {props.subtitle}
            </Typography>
          ) : null}
        </Box>
        {props.actions ? <Box>{props.actions}</Box> : null}
      </Box>
      {props.children}
    </Container>
  )
}
