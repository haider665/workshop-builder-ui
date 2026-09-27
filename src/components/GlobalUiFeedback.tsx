import { Box, LinearProgress, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

/** Non-blocking background activity indicator. It never captures pointer/keyboard input. */
export function GlobalUiFeedback() {
  const [pending, setPending] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const listener = (event: Event) => {
      const delta = Number((event as CustomEvent<{ delta?: number }>).detail?.delta || 0)
      setPending((current) => Math.max(0, current + delta))
    }
    window.addEventListener('cw:api-activity', listener)
    return () => window.removeEventListener('cw:api-activity', listener)
  }, [])

  useEffect(() => {
    if (!pending) { setVisible(false); return }
    const timer = window.setTimeout(() => setVisible(true), 180)
    return () => window.clearTimeout(timer)
  }, [pending])

  if (!visible || pending === 0) return null
  return (
    <Paper elevation={4} role="status" aria-live="polite" sx={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: (theme) => theme.zIndex.tooltip + 20,
      borderRadius: 0, pointerEvents: 'none', overflow: 'hidden', bgcolor: 'background.paper',
    }}>
      <LinearProgress sx={{ height: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: .75, py: .35 }}>
        <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: 'text.secondary' }}>Updating data in the background…</Typography>
      </Box>
    </Paper>
  )
}
