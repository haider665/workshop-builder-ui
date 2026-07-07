import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CWAppointment } from '../types/cw'

type ViewMode = 'month' | 'week'

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function addDays(d: Date, days: number) {
  const x = new Date(d); x.setDate(x.getDate() + days); return x
}
function startOfWeekMonday(d: Date) {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}
function startOfMonth(d: Date) {
  const x = startOfDay(d); x.setDate(1); return x
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' {
  const m: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
    New: 'info', 'SA Inspection': 'primary', 'SA Reviewed': 'warning',
    'Customer Notified': 'warning', 'Customer Approved': 'success', 'Customer Rejected': 'error',
    'Diagnosis Assigned': 'info', 'Diagnosis In Progress': 'primary', 'Diagnosis Complete': 'success',
    'Service Assigned': 'info', 'Service In Progress': 'primary', 'Service Complete': 'success',
    'QC Assigned': 'info', 'QC Approved': 'success', 'QC Rejected': 'error',
    'Payment Pending': 'warning', 'Payment Done': 'success', Released: 'success',
  }
  return m[status] ?? 'default'
}

type Props = {
  appointments: CWAppointment[]
  vehicleRegById: Map<string, string>
  customerNameById: Map<string, string>
  /** Base path for navigation (e.g. '/cre/appointments' or '/sa/appointments') */
  basePath: string
  title?: string
}

export function AppointmentCalendar({ appointments, vehicleRegById, customerNameById, basePath, title }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState<Date>(() => new Date())

  const apptsByDay = useMemo(() => {
    const map = new Map<string, CWAppointment[]>()
    for (const a of appointments) {
      if (!a.slotDate) continue
      const arr = map.get(a.slotDate) ?? []
      arr.push(a)
      map.set(a.slotDate, arr)
    }
    return map
  }, [appointments])

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const monthGrid = useMemo(() => {
    const gridStart = startOfWeekMonday(startOfMonth(cursor))
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [cursor])

  function goPrev() {
    if (mode === 'month') { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d) }
    else setCursor(addDays(cursor, -7))
  }
  function goNext() {
    if (mode === 'month') { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d) }
    else setCursor(addDays(cursor, 7))
  }

  const todayKey = dayKey(new Date())

  function ApptBlock({ appt, compact }: { appt: CWAppointment; compact?: boolean }) {
    const reg = vehicleRegById.get(appt.vehicleId) ?? '—'
    const cust = customerNameById.get(appt.customerId) ?? ''
    return (
      <Paper
        variant="outlined"
        onClick={() => navigate(`${basePath}/${appt.id}`)}
        sx={{ p: compact ? 0.5 : 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: 'all 0.15s' }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }} noWrap>
          {reg}
        </Typography>
        {!compact && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {cust}
          </Typography>
        )}
        <Chip size="small" label={appt.status} color={statusColor(appt.status)} sx={{ height: 18, fontSize: '0.6rem', mt: 0.25 }} />
      </Paper>
    )
  }

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>
            {title ?? 'Appointment Calendar'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => { if (v) setMode(v) }} size="small">
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>
          <ButtonGroup variant="outlined" size="small">
            <Button onClick={goPrev} startIcon={<ChevronLeft />}>Prev</Button>
            <Button onClick={() => setCursor(new Date())} startIcon={<Today />}>Today</Button>
            <Button onClick={goNext} endIcon={<ChevronRight />}>Next</Button>
          </ButtonGroup>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </Typography>
      </Box>
      <Divider />

      {mode === 'week' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekDays.map((d) => {
            const key = dayKey(d)
            const dayAppts = apptsByDay.get(key) ?? []
            const isToday = key === todayKey
            return (
              <Box key={key} sx={{ p: 1.5, borderRight: '1px solid', borderColor: 'divider', bgcolor: isToday ? 'info.50' : undefined }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isToday ? 'info.main' : undefined }}>
                  {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.75}>
                  {dayAppts.map((a) => <ApptBlock key={a.id} appt={a} />)}
                  {!dayAppts.length && <Typography variant="caption" color="text.secondary">—</Typography>}
                </Stack>
              </Box>
            )
          })}
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
              <Box key={w} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{w}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthGrid.map((d) => {
              const key = dayKey(d)
              const inMonth = d.getMonth() === cursor.getMonth()
              const isToday = key === todayKey
              const dayAppts = apptsByDay.get(key) ?? []
              return (
                <Box
                  key={key}
                  sx={{
                    minHeight: 110,
                    p: 0.75,
                    borderTop: '1px solid',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isToday ? 'info.50' : !inMonth ? 'action.hover' : undefined,
                  }}
                >
                  <Typography
                    variant="caption"
                    color={isToday ? 'info.main' : inMonth ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: isToday ? 900 : 700 }}
                  >
                    {d.getDate()}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {dayAppts.slice(0, 3).map((a) => <ApptBlock key={a.id} appt={a} compact />)}
                    {dayAppts.length > 3 && (
                      <Typography variant="caption" color="text.secondary">+{dayAppts.length - 3} more</Typography>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </>
      )}
    </Paper>
  )
}
