import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

export function AuthBootstrap(props: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const restore = useSessionStore((s) => s.restore)
  const hydrateFromBackend = useCwStore((s) => s.hydrateFromBackend)
  const [hydrating, setHydrating] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (status === 'idle') void restore()
  }, [restore, status])

  useEffect(() => {
    if (status === 'authenticated' && !hydrated && !hydrating) {
      setHydrating(true)
      void hydrateFromBackend()
        .then(() => setHydrated(true))
        .catch((error) => {
          console.error('Failed to hydrate backend data', error)
          // Still mark hydrated so user can see the app (with empty data)
          setHydrated(true)
        })
        .finally(() => setHydrating(false))
    }
  }, [hydrateFromBackend, status, hydrated, hydrating])

  if (status === 'idle' || status === 'loading' || (status === 'authenticated' && !hydrated)) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {status === 'authenticated' ? 'Loading data...' : 'Checking session...'}
          </Typography>
        </Box>
      </Box>
    )
  }

  return props.children
}
