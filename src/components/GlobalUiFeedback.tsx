import { Backdrop, Box, CircularProgress, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

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
    const timer = window.setTimeout(() => setVisible(true), 280)
    return () => window.clearTimeout(timer)
  }, [pending])



  return <Backdrop open={visible && pending > 0} sx={{ zIndex: (theme) => theme.zIndex.modal + 200, bgcolor: 'rgba(15,23,42,.22)', backdropFilter: 'blur(2px)' }}>
    <Paper elevation={12} sx={{ px: 2.5, py: 1.75, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <CircularProgress size={24} thickness={4.5} />
      <Box><Typography sx={{ fontWeight: 800, lineHeight: 1.25 }}>Working on it…</Typography><Typography variant="caption" color="text.secondary">Please keep this window open.</Typography></Box>
    </Paper>
  </Backdrop>
}
