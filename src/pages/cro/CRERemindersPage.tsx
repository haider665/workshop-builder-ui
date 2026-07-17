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
import { NotificationsActive, Send, Cancel, Schedule, CheckCircle, Inbox } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { StatCard } from '../../components/StatCard'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
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
  useCREData()
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Reminders & Follow-ups
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Schedule WhatsApp follow-ups after service completion</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<NotificationsActive />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Schedule Reminder
          </Button>
        </Stack>

        {/* Stats */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<Schedule fontSize="small" />} title="PENDING" value={pendingCount} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" />
          <StatCard icon={<CheckCircle fontSize="small" />} title="SENT" value={sentCount} gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" />
          <StatCard icon={<Inbox fontSize="small" />} title="TOTAL" value={reminders.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
        </Stack>

        {/* Reminders Table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><NotificationsActive sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>All Reminders</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {reminders.length}
              </Box>
            </Stack>
          </Box>
          {reminders.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reminders.map((r) => (
                  <TableRow key={r.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell sx={{ fontWeight: 700, color: colors.slate[900] }}>{r.customerName}</TableCell>
                    <TableCell>{r.vehicleReg}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.type} color={r.type === 'follow-up' ? 'info' : r.type === 'next-service' ? 'warning' : 'default'} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell>{fmtDateTime(r.scheduledAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status}
                        color={r.status === 'Sent' ? 'success' : r.status === 'Cancelled' ? 'error' : 'warning'}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.message}
                    </TableCell>
                    <TableCell align="right">
                      {r.status === 'Pending' && (
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" variant="contained" color="success" startIcon={<Send />}
                            onClick={() => markReminderSent(r.id)} sx={{ fontWeight: 700, borderRadius: radii.sm, fontSize: '0.75rem' }}>
                            Send
                          </Button>
                          <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                            onClick={() => cancelReminder(r.id)} sx={{ fontWeight: 700, borderRadius: radii.sm, fontSize: '0.75rem' }}>
                            Cancel
                          </Button>
                        </Stack>
                      )}
                      {r.status === 'Sent' && r.sentAt && (
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>Sent {fmtDateTime(r.sentAt)}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No reminders scheduled. Click "Schedule Reminder" to create one.</Typography>
            </Box>
          )}
        </Box>
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
          <Button variant="contained" onClick={handleCreate} disabled={!appointmentId}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', '&:hover': { bgcolor: colors.slate[800] } }}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
