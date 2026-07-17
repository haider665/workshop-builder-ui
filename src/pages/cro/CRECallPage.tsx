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
import { Call, CallMade, CallReceived } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { StatCard } from '../../components/StatCard'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii, shadows } from '../../theme/tokens'
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
  useCREData()
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Call History
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Log and track all customer calls (CDR)</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Call />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Log Call
          </Button>
        </Stack>

        {/* Stats */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<Call fontSize="small" />}
            title="Total Calls"
            value={callRecords.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <StatCard
            icon={<CallMade fontSize="small" />}
            title="Outbound"
            value={callRecords.filter((r) => r.direction === 'outbound').length}
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
          />
          <StatCard
            icon={<CallReceived fontSize="small" />}
            title="Inbound"
            value={callRecords.filter((r) => r.direction === 'inbound').length}
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          />
        </Stack>

        {/* Call Log Table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><Call sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>Call Detail Records</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {callRecords.length}
              </Box>
            </Stack>
          </Box>
          {callRecords.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Direction</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {callRecords.map((r) => (
                  <TableRow key={r.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={r.direction === 'outbound' ? <CallMade /> : <CallReceived />}
                        label={r.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                        color={r.direction === 'outbound' ? 'primary' : 'success'}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
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
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No calls logged yet. Click "Log Call" to record a call.</Typography>
            </Box>
          )}
        </Box>
      </Stack>

      {/* Log Call Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: radii.lg,
              boxShadow: shadows.dialog,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', color: colors.slate[900], borderBottom: `1px solid ${colors.border.default}`, px: 3, py: 2 }}>
          Log Call
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Direction</InputLabel>
              <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value as CWCallDirection)} sx={{ borderRadius: radii.sm, fontSize: '0.85rem' }}>
                <MenuItem value="outbound">Outbound (CRE → Customer)</MenuItem>
                <MenuItem value="inbound">Inbound (Customer → CRE)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              select size="small" label="Customer" fullWidth
              value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAppointmentId('') }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
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
                onChange={(e) => setDurationMins(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }}
                slotProps={{ htmlInput: { min: 0 } }} />
              <TextField size="small" label="Seconds" type="number" value={durationSecs}
                onChange={(e) => setDurationSecs(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }}
                slotProps={{ htmlInput: { min: 0, max: 59 } }} />
            </Stack>

            <TextField size="small" label="Notes / Summary" multiline rows={3} fullWidth
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Call summary, topics discussed, action items…"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${colors.border.default}` }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: colors.slate[600], fontWeight: 600, borderRadius: '10px' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!customerId}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Log Call
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
