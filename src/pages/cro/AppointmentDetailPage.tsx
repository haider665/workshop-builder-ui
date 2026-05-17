import {
  Alert,
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
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { useCwStore } from '../../store/cwStore'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
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
    Released: 'success',
  }
  return map[status] ?? 'default'
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const totalBDT = appt.serviceItems.reduce((sum, s) => sum + s.price, 0)

  return (
    <Page title="Appointment" subtitle={`#${appt.id.slice(0, 8)}`}>
      <Stack spacing={2.5}>
        {/* ── Workflow Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* ── Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Vehicle</Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {vehicle?.registrationNo ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Customer</Typography>
              <Typography sx={{ fontWeight: 700 }}>{customer?.fullName ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{customer?.phone ?? ''}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={appt.status} size="small" color={statusColor(appt.status)} sx={{ fontWeight: 700, mt: 0.5 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>{fmtBDT(totalBDT)}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Typography variant="body2">{fmtDate(appt.createdAt)}</Typography>
            </Box>
          </Stack>
          {appt.slotDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Slot: {fmtDate(appt.slotDate)} {appt.slotTime ?? ''}
            </Typography>
          )}
          {appt.concerns && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Notes: {appt.concerns}
            </Typography>
          )}
        </Paper>

        {/* ── Concerns ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Concerns ({appt.concernItems.length})
          </Typography>
          {appt.concernItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No concerns listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Remark</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SA</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Technicians</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.concernItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{c.concernName}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{c.remark || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{c.assignedSEUserId ? (userNameById.get(c.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {c.plannedStartAt ? `${fmtDateTime(c.plannedStartAt)} → ${fmtDateTime(c.plannedEndAt)}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.workStatus ? (
                        <Chip
                          label={c.workStatus}
                          size="small"
                          color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Services ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Services ({appt.serviceItems.length})
          </Typography>
          {appt.serviceItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SA</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Technicians</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{fmtBDT(s.price)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip
                          label={s.workStatus}
                          size="small"
                          color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── WhatsApp Log ── */}
        {appt.whatsappLogs.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>WhatsApp Communication</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Direction</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Author</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.whatsappLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell><Typography variant="caption">{fmtDateTime(log.sentAt)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={log.direction} size="small" color={log.direction === 'outbound' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell><Typography variant="caption">{log.authorName}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{log.message}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* ── Customer Approval Status ── */}
        {appt.customerApprovalStatus !== 'Pending' && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Customer Approval</Typography>
            <Chip
              label={appt.customerApprovalStatus}
              color={appt.customerApprovalStatus === 'Approved' ? 'success' : 'error'}
              sx={{ fontWeight: 700 }}
            />
            {appt.customerApprovalNote && (
              <Typography variant="body2" sx={{ mt: 1 }}>Note: {appt.customerApprovalNote}</Typography>
            )}
          </Paper>
        )}
      </Stack>
    </Page>
  )
}
