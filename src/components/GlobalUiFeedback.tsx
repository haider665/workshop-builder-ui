import { Backdrop, Box, CircularProgress, Paper, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { CWNotification } from '../types/cw'
import { workshopApi } from '../services/workshopApi'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

export function GlobalUiFeedback() {
  const status = useSessionStore((state) => state.status)
  const [pending, setPending] = useState(0)
  const [visible, setVisible] = useState(false)
  const seen = useRef<Set<string> | null>(null)

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

  useEffect(() => {
    if (status !== 'authenticated') { seen.current = null; return }
    let active = true
    const refresh = async () => {
      try {
        const result = await workshopApi.listNotifications({ page: 1, pageSize: 100 })
        if (!active) return
        const rows = result.data as CWNotification[]
        const incoming = new Set(rows.map((row) => row.id))
        if (seen.current) {
          rows.filter((row) => !row.read && !seen.current?.has(row.id)).reverse().forEach((row) => {
            window.dispatchEvent(new CustomEvent('cw:notification-toast', { detail: { message: row.title ? `${row.title}: ${row.message}` : row.message } }))
          })
        }
        seen.current = incoming
        useCwStore.setState((state) => ({
          notifications: [...rows, ...state.notifications.filter((row) => !incoming.has(row.id))],
        }))
      } catch { /* the API client already presents a friendly error */ }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 20000)
    return () => { active = false; window.clearInterval(timer) }
  }, [status])

  return <Backdrop open={visible && pending > 0} sx={{ zIndex: (theme) => theme.zIndex.modal + 200, bgcolor: 'rgba(15,23,42,.22)', backdropFilter: 'blur(2px)' }}>
    <Paper elevation={12} sx={{ px: 2.5, py: 1.75, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <CircularProgress size={24} thickness={4.5} />
      <Box><Typography sx={{ fontWeight: 800, lineHeight: 1.25 }}>Working on it…</Typography><Typography variant="caption" color="text.secondary">Please keep this window open.</Typography></Box>
    </Paper>
  </Backdrop>
}
