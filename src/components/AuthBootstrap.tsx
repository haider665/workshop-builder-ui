import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

export function AuthBootstrap(props: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const restore = useSessionStore((s) => s.restore)
  const hydrateFromBackend = useCwStore((s) => s.hydrateFromBackend)

  useEffect(() => {
    if (status === 'idle') void restore()
  }, [restore, status])

  useEffect(() => {
    if (status === 'authenticated') {
      void hydrateFromBackend().catch((error) => {
        console.error('Failed to hydrate backend data', error)
      })
    }
  }, [hydrateFromBackend, status])

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
