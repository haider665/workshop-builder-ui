import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function QCAppointmentsPage() {
  const navigate = useNavigate()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  // QC sees only appointments assigned to QC that are in QC Assigned status
  const relevant = useMemo(
    () =>
      appointments.filter((a) => !!a.assignedQCUserId && a.status === 'QC Assigned'),
    [appointments],
  )

  const sorted = useMemo(
    () => [...relevant].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [relevant],
  )

  return (
    <Page title="QC Appointments">
      <Stack spacing={2}>
        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {sorted.length} appointment{sorted.length !== 1 ? 's' : ''} pending QC verification
          </Typography>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {sorted.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No appointments pending QC verification.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Concerns / Services</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((appt) => {
                  const v = vehicles.find((x) => x.id === appt.vehicleId)
                  const c = customers.find((x) => x.id === appt.customerId)
                  const total = appt.serviceItems.reduce((s, i) => s + i.price, 0)
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/qc/appointments/${appt.id}`)}
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
                          color="info"
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
