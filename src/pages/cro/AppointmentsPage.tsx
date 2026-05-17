import {
  Box,
  Button,
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
import { Add } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus } from '../../types/cw'

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function statusColor(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    'New': 'info',
    'SA Inspection': 'primary',
    'SA Reviewed': 'warning',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Approval Pending': 'warning',
    'Service Approved': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    Released: 'success',
  }
  return map[status] ?? 'default'
}

const ALL_STATUSES: CWAppointmentStatus[] = [
  'New',
  'SA Inspection',
  'SA Reviewed',
  'Customer Notified',
  'Customer Approved',
  'Customer Rejected',
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Approval Pending',
  'Service Approved',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
  'Payment Pending',
  'Payment Done',
  'Released',
]

export function AppointmentsPage() {
  const appointments = useCwStore((s) => s.appointments)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<CWAppointmentStatus | ''>('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return appointments.filter((appt) => {
      if (filterStatus && appt.status !== filterStatus) return false
      if (q) {
        const cust = customers.find((c) => c.id === appt.customerId)
        const veh = vehicles.find((v) => v.id === appt.vehicleId)
        const haystack = [
          cust?.fullName ?? '',
          cust?.phone ?? '',
          veh?.registrationNo ?? '',
          veh?.make ?? '',
          veh?.model ?? '',
          appt.status,
          appt.slotDate ?? '',
          appt.notes ?? '',
        ].join(' ')
        if (!includesLoose(haystack, q)) return false
      }
      return true
    })
  }, [appointments, customers, vehicles, query, filterStatus])

  return (
    <Page
      title="Appointments"
      subtitle={`${appointments.length} total · ${filtered.length} shown`}
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          component={RouterLink}
          to="/cro/appointments/new"
        >
          New Appointment
        </Button>
      }
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: '2 1 220px' }}
            placeholder="Customer, vehicle, reg number…"
          />
          <FormControl size="small" sx={{ flex: '1 1 160px' }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CWAppointmentStatus | '')}
            >
              <MenuItem value="">— All —</MenuItem>
              {ALL_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Paper variant="outlined">
          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No appointments found.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Slot</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Services</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((appt) => {
                  const cust = customers.find((c) => c.id === appt.customerId)
                  const veh = vehicles.find((v) => v.id === appt.vehicleId)
                  const totalBDT = appt.serviceItems?.reduce((s, i) => s + i.price, 0) ?? 0
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/cro/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {veh?.registrationNo ?? '—'}
                        </Typography>
                        {(veh?.make || veh?.model) && (
                          <Typography variant="caption" color="text.secondary">
                            {[veh.make, veh.model].filter(Boolean).join(' ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cust?.fullName ?? '—'}</Typography>
                        {cust?.phone && (
                          <Typography variant="caption" color="text.secondary">{cust.phone}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appt.slotDate ? (
                          <Stack>
                            <Typography variant="body2">{appt.slotDate}</Typography>
                            {appt.slotTime && (
                              <Typography variant="caption" color="text.secondary">{appt.slotTime}</Typography>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appt.serviceItems?.length ? (
                          <Stack>
                            <Typography variant="body2">{appt.serviceItems.length} service{appt.serviceItems.length !== 1 ? 's' : ''}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              BDT {totalBDT.toLocaleString('en-BD')}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={appt.status} color={statusColor(appt.status)} size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(appt.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
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
