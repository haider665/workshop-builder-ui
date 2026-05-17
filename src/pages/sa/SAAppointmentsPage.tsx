import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

import type { CWAppointmentStatus } from '../../types/cw'

const SA_STATUSES: CWAppointmentStatus[] = [
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Customer Notified',
  'Customer Approved',
  'Customer Rejected',
  'Service In Progress',
  'Closed',
]

function statusColor(
  status: string,
): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'warning',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Service In Progress': 'primary',
    'Closed': 'success',
  }
  return map[status] ?? 'default'
}

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SAAppointmentsPage() {
  const navigate = useNavigate()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CWAppointmentStatus | 'All'>('All')

  // All SA-relevant appointments (any that have SA assignments, no user filtering)
  const relevant = useMemo(
    () =>
      appointments.filter((a) => {
        if (!SA_STATUSES.includes(a.status as CWAppointmentStatus)) return false
        return a.concernItems.some((c) => c.assignedSAUserId) ||
          a.serviceItems.some((s) => s.assignedSAUserId)
      }),
    [appointments],
  )

  const filtered = useMemo(() => {
    let list = relevant
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => {
        const v = vehicles.find((x) => x.id === a.vehicleId)
        const c = customers.find((x) => x.id === a.customerId)
        return (
          v?.registrationNo.toLowerCase().includes(q) ||
          v?.make?.toLowerCase().includes(q) ||
          v?.model?.toLowerCase().includes(q) ||
          c?.fullName?.toLowerCase().includes(q) ||
          c?.phone?.toLowerCase().includes(q)
        )
      })
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [relevant, statusFilter, search, vehicles, customers])

  return (
    <Page title="SA Appointments">
      <Stack spacing={2}>
        {/* Filters */}
        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <TextField
              size="small"
              label="Search"
              placeholder="Reg, make, model, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: '1 1 260px' }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CWAppointmentStatus | 'All')}
              >
                <MenuItem value="All">All SA Statuses</MenuItem>
                {SA_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
        </Paper>

        {/* Table */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No appointments in SA workflow.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Slot</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Concerns / Services</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((appt) => {
                  const v = vehicles.find((x) => x.id === appt.vehicleId)
                  const c = customers.find((x) => x.id === appt.customerId)
                  const total = appt.serviceItems.reduce((s, i) => s + i.price, 0)
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/sa/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {v?.registrationNo ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {c?.fullName ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c?.phone ?? ''}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appt.slotDate ? fmtDate(appt.slotDate) : '—'}
                        </Typography>
                        {appt.slotTime && (
                          <Typography variant="caption" color="text.secondary">
                            {appt.slotTime}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appt.concernItems.length}C / {appt.serviceItems.length}S
                        </Typography>
                        {total > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {fmtBDT(total)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          size="small"
                          color={statusColor(appt.status)}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {fmtDate(appt.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
