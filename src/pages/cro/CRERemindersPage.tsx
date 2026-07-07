import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { NotificationsActive, Send, Cancel } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWReminderType } from '../../types/cw'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TEMPLATES: { type: CWReminderType; label: string; message: string; daysFromNow: number }[] = [
  { type: 'follow-up', label: '3-Day Follow-up', message: 'Hi {name}, we hope your vehicle ({reg}) is running smoothly after service. Any concerns? We\'re here to help!', daysFromNow: 3 },
  { type: 'follow-up', label: '1-Week Check-in', message: 'Dear {name}, it\'s been a week since your vehicle ({reg}) was serviced. How is everything going? Feel free to reach out!', daysFromNow: 7 },
  { type: 'next-service', label: 'Next Service Reminder', message: 'Dear {name}, your vehicle ({reg}) is due for its next scheduled service. Would you like to book an appointment?', daysFromNow: 30 },
  { type: 'reminder', label: 'Custom Reminder', message: '', daysFromNow: 1 },
]

export function CRERemindersPage() {
  const reminders = useCwStore((s) => s.reminders)
  const createReminder = useCwStore((s) => s.createReminder)
  const markReminderSent = useCwStore((s) => s.markReminderSent)
  const cancelReminder = useCwStore((s) => s.cancelReminder)
  const appointments = useCwStore((s) => s.appointments)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [appointmentId, setAppointmentId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [customMessage, setCustomMessage] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')

  // Appointments that are completed (Payment Done / Released)
  const completedAppts = useMemo(() =>
    appointments.filter((a) => a.status === 'Payment Done' || a.status === 'Released')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [appointments],
  )

  const selectedAppt = useMemo(() => appointments.find((a) => a.id === appointmentId) ?? null, [appointments, appointmentId])
  const selectedCustomer = useMemo(() => selectedAppt ? customers.find((c) => c.id === selectedAppt.customerId) : null, [customers, selectedAppt])
  const selectedVehicle = useMemo(() => selectedAppt ? vehicles.find((v) => v.id === selectedAppt.vehicleId) : null, [vehicles, selectedAppt])

  function handleCreate() {
    if (!selectedAppt || !selectedCustomer || !selectedVehicle) return
    const tmpl = TEMPLATES[selectedTemplate]
    const msg = customMessage || tmpl.message
      .replace('{name}', selectedCustomer.fullName)
      .replace('{reg}', selectedVehicle.registrationNo)

    const scheduled = scheduledDate
      ? new Date(scheduledDate + 'T09:00:00').toISOString()
      : new Date(Date.now() + tmpl.daysFromNow * 86400000).toISOString()

    createReminder({
      appointmentId: selectedAppt.id,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.fullName,
      vehicleReg: selectedVehicle.registrationNo,
      type: tmpl.type,
      scheduledAt: scheduled,
      message: msg,
      status: 'Pending',
    })

    setDialogOpen(false)
    setAppointmentId('')
    setCustomMessage('')
    setScheduledDate('')
  }

  const pendingCount = reminders.filter((r) => r.status === 'Pending').length
  const sentCount = reminders.filter((r) => r.status === 'Sent').length

  return (
    <Page title="Reminders & Follow-ups" subtitle="Schedule WhatsApp follow-ups after service completion">
      <Stack spacing={2.5}>
        {/* Stats */}
        <Stack direction="row" spacing={2}>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.main' }}>{pendingCount}</Typography>
            <Typography variant="body2" color="text.secondary">Pending</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>{sentCount}</Typography>
            <Typography variant="body2" color="text.secondary">Sent</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{reminders.length}</Typography>
            <Typography variant="body2" color="text.secondary">Total</Typography>
          </Paper>
        </Stack>

        {/* Reminders Table */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>All Reminders</Typography>
              <Typography variant="body2" color="text.secondary">Follow-ups and reminders for completed services</Typography>
            </Box>
            <Button variant="contained" startIcon={<NotificationsActive />} onClick={() => setDialogOpen(true)} sx={{ fontWeight: 700 }}>
              Schedule Reminder
            </Button>
          </Box>
          {reminders.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Scheduled</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Message</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reminders.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{r.customerName}</TableCell>
                    <TableCell>{r.vehicleReg}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.type} color={r.type === 'follow-up' ? 'info' : r.type === 'next-service' ? 'warning' : 'default'} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{fmtDateTime(r.scheduledAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status}
                        color={r.status === 'Sent' ? 'success' : r.status === 'Cancelled' ? 'error' : 'warning'}
                        sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.message}
                    </TableCell>
                    <TableCell align="right">
                      {r.status === 'Pending' && (
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" variant="contained" color="success" startIcon={<Send />}
                            onClick={() => markReminderSent(r.id)} sx={{ fontWeight: 700 }}>
                            Send
                          </Button>
                          <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                            onClick={() => cancelReminder(r.id)} sx={{ fontWeight: 700 }}>
                            Cancel
                          </Button>
                        </Stack>
                      )}
                      {r.status === 'Sent' && r.sentAt && (
                        <Typography variant="caption" color="text.secondary">Sent {fmtDateTime(r.sentAt)}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2.5 }}>
              <Typography color="text.secondary">No reminders scheduled. Click "Schedule Reminder" to create one.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>

      {/* Create Reminder Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Schedule Reminder</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select size="small" label="Completed Appointment" fullWidth
              value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}
            >
              <MenuItem value="">— Select —</MenuItem>
              {completedAppts.map((a) => {
                const veh = vehicles.find((v) => v.id === a.vehicleId)
                const cust = customers.find((c) => c.id === a.customerId)
                return (
                  <MenuItem key={a.id} value={a.id}>
                    {veh?.registrationNo ?? '—'} · {cust?.fullName ?? '—'} · {a.status}
                  </MenuItem>
                )
              })}
            </TextField>

            <FormControl fullWidth size="small">
              <InputLabel>Template</InputLabel>
              <Select label="Template" value={selectedTemplate} onChange={(e) => {
                const idx = e.target.value as number
                setSelectedTemplate(idx)
                if (TEMPLATES[idx].message && selectedCustomer && selectedVehicle) {
                  setCustomMessage(TEMPLATES[idx].message
                    .replace('{name}', selectedCustomer.fullName)
                    .replace('{reg}', selectedVehicle.registrationNo))
                } else {
                  setCustomMessage('')
                }
              }}>
                {TEMPLATES.map((t, i) => <MenuItem key={i} value={i}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField size="small" label="Scheduled Date" type="date" fullWidth
              value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={!scheduledDate ? `Default: ${TEMPLATES[selectedTemplate].daysFromNow} days from now` : ''}
            />

            <TextField size="small" label="Message" multiline rows={4} fullWidth
              value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="WhatsApp message to send to the customer…" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!appointmentId}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
