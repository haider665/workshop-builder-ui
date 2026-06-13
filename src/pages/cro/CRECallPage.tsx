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
import { Call, CallMade, CallReceived } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWCallDirection } from '../../types/cw'

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function CRECallPage() {
  const callRecords = useCwStore((s) => s.callRecords)
  const addCallRecord = useCwStore((s) => s.addCallRecord)
  const customers = useCwStore((s) => s.customers)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [direction, setDirection] = useState<CWCallDirection>('outbound')
  const [durationMins, setDurationMins] = useState('')
  const [durationSecs, setDurationSecs] = useState('')
  const [notes, setNotes] = useState('')

  // Filter appointments by selected customer
  const customerAppointments = useMemo(() => {
    if (!customerId) return []
    return appointments.filter((a) => a.customerId === customerId)
  }, [appointments, customerId])

  function handleSubmit() {
    const cust = customers.find((c) => c.id === customerId)
    if (!cust) return
    const totalSecs = (parseInt(durationMins || '0') * 60) + parseInt(durationSecs || '0')
    addCallRecord({
      customerId,
      appointmentId: appointmentId || undefined,
      customerName: cust.fullName,
      direction,
      durationSecs: totalSecs,
      startedAt: new Date().toISOString(),
      notes: notes.trim(),
      createdBy: 'CRE',
    })
    setDialogOpen(false)
    setCustomerId('')
    setAppointmentId('')
    setDirection('outbound')
    setDurationMins('')
    setDurationSecs('')
    setNotes('')
  }

  return (
    <Page title="Call History" subtitle="Log and track all customer calls (CDR)">
      <Stack spacing={2.5}>
        {/* Stats */}
        <Stack direction="row" spacing={2}>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{callRecords.length}</Typography>
            <Typography variant="body2" color="text.secondary">Total Calls</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {callRecords.filter((r) => r.direction === 'outbound').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Outbound</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {callRecords.filter((r) => r.direction === 'inbound').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Inbound</Typography>
          </Paper>
        </Stack>

        {/* Call Log Table */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Call Detail Records</Typography>
              <Typography variant="body2" color="text.secondary">All logged customer calls</Typography>
            </Box>
            <Button variant="contained" startIcon={<Call />} onClick={() => setDialogOpen(true)} sx={{ fontWeight: 700 }}>
              Log Call
            </Button>
          </Box>
          {callRecords.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Direction</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {callRecords.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={r.direction === 'outbound' ? <CallMade /> : <CallReceived />}
                        label={r.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                        color={r.direction === 'outbound' ? 'primary' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.customerName}</TableCell>
                    <TableCell>{fmtDateTime(r.startedAt)}</TableCell>
                    <TableCell>{fmtDuration(r.durationSecs)}</TableCell>
                    <TableCell>{r.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2.5 }}>
              <Typography color="text.secondary">No calls logged yet. Click "Log Call" to record a call.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>

      {/* Log Call Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Log Call</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Direction</InputLabel>
              <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value as CWCallDirection)}>
                <MenuItem value="outbound">Outbound (CRE → Customer)</MenuItem>
                <MenuItem value="inbound">Inbound (Customer → CRE)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              select size="small" label="Customer" fullWidth
              value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAppointmentId('') }}
            >
              <MenuItem value="">— Select Customer —</MenuItem>
              {customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.fullName} · {c.phone}</MenuItem>
              ))}
            </TextField>

            {customerId && customerAppointments.length > 0 && (
              <TextField
                select size="small" label="Link to Appointment (optional)" fullWidth
                value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}
              >
                <MenuItem value="">— None —</MenuItem>
                {customerAppointments.map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  return (
                    <MenuItem key={a.id} value={a.id}>
                      {veh?.registrationNo ?? '—'} · {a.status} · {a.slotDate ?? '—'}
                    </MenuItem>
                  )
                })}
              </TextField>
            )}

            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Minutes" type="number" value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)} sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0 } }} />
              <TextField size="small" label="Seconds" type="number" value={durationSecs}
                onChange={(e) => setDurationSecs(e.target.value)} sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0, max: 59 } }} />
            </Stack>

            <TextField size="small" label="Notes / Summary" multiline rows={3} fullWidth
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Call summary, topics discussed, action items…" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!customerId}>Log Call</Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
