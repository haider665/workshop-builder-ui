import {
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

const SE_STATUSES: CWAppointmentStatus[] = [
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
]

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
  }
  return map[status] ?? 'default'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SEAppointmentsPage() {
  const navigate = useNavigate()
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CWAppointmentStatus | 'All'>('All')

  const relevant = useMemo(
    () =>
      appointments.filter((a) => {
        if (!SE_STATUSES.includes(a.status as CWAppointmentStatus)) return false
        return a.concernItems.some((c) => c.assignedSEUserId) ||
          a.serviceItems.some((s) => s.assignedSEUserId || (s.stageItems && s.stageItems.some((st) => st.assignedSEUserId)))
      }),
    [appointments],
  )

  const filtered = useMemo(() => {
    let list = relevant
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((a) => {
        const v = vehicles.find((v) => v.id === a.vehicleId)
        const c = customers.find((c) => c.id === a.customerId)
        return (
          (v?.registrationNo ?? '').toLowerCase().includes(q) ||
          (c?.fullName ?? '').toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [relevant, statusFilter, search, vehicles, customers])

  return (
    <Page title="SE Appointments" subtitle="Appointments assigned to Service Engineers.">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by reg no, customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value as CWAppointmentStatus | 'All')}>
            <MenuItem value="All">All</MenuItem>
            {SE_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Concerns</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Services</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((a) => {
              const v = vehicles.find((v) => v.id === a.vehicleId)
              const c = customers.find((c) => c.id === a.customerId)
              return (
                <TableRow
                  key={a.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/se/appointments/${a.id}`)}
                >
                  <TableCell sx={{ fontWeight: 700 }}>{v?.registrationNo ?? '—'}</TableCell>
                  <TableCell>{c?.fullName ?? '—'}</TableCell>
                  <TableCell><Chip size="small" color={statusColor(a.status)} label={a.status} /></TableCell>
                  <TableCell>{a.concernItems.filter((c) => c.assignedSEUserId).length}</TableCell>
                  <TableCell>{a.serviceItems.filter((s) => s.assignedSEUserId).length}</TableCell>
                  <TableCell>{fmtDate(a.createdAt)}</TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No SE assignments found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Page>
  )
}
