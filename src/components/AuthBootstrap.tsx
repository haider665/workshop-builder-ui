import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useSessionStore } from '../store/sessionStore'

export function AuthBootstrap(props: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const restore = useSessionStore((s) => s.restore)

  useEffect(() => {
    if (status === 'idle') void restore()
  }, [restore, status])

  if (status === 'idle' || status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Checking session...
          </Typography>
        </Box>
      </Box>
    )
  }

  return props.children
}

