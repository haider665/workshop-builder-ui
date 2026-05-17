import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus } from '../../types/cw'

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
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
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

// JC sees everything except Released (finished)
const JC_RELEVANT_STATUSES: CWAppointmentStatus[] = [
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
]

export function JobControllerHome() {
  const navigate = useNavigate()
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const relevant = useMemo(
    () =>
      appointments
        .filter((a) => JC_RELEVANT_STATUSES.includes(a.status))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [appointments],
  )

  const needsAction = useMemo(
    () => relevant.filter((a) => ['Customer Approved', 'Service Approved'].includes(a.status)),
    [relevant],
  )

  return (
    <Page title="Job Controller" subtitle="Appointment queue, diagnosis & service assignment.">
      {/* Stats */}
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Overview</Typography>
            <Typography variant="body2" color="text.secondary">
              Appointments needing assignment and active workflow.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <Chip color={needsAction.length ? 'warning' : 'default'} label={`Needs action: ${needsAction.length}`} />
            <Chip color={relevant.length ? 'info' : 'default'} label={`In pipeline: ${relevant.length}`} />
          </Stack>
        </Stack>
      </Paper>

      {/* Appointment Queue */}
      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Appointment Queue</Typography>
          <Typography variant="body2" color="text.secondary">
            Click to assign SA + time for diagnosis, or SA + bay for services.
          </Typography>
        </Box>

        {relevant.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No appointments in queue.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Concerns</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Services</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relevant.map((appt) => {
                const v = vehicles.find((x) => x.id === appt.vehicleId)
                const c = customers.find((x) => x.id === appt.customerId)
                return (
                  <TableRow
                    key={appt.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jc/appointments/${appt.id}`)}
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
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c?.fullName ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{appt.concernItems.length}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{appt.serviceItems.length}</Typography>
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
    </Page>
  )
}
