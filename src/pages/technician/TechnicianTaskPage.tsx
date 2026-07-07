import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Pause, PlayArrow, Stop, Timer } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TechnicianTaskPage() {
  const { appointmentId, itemType, itemId } = useParams<{
    appointmentId: string
    itemType: string
    itemId: string
  }>()
  const [searchParams] = useSearchParams()
  const taId = searchParams.get('ta') ?? ''
  const stageId = searchParams.get('stageId') ?? ''

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const startTimer = useCwStore((s) => s.startTechnicianTimer)
  const pauseTimer = useCwStore((s) => s.pauseTechnicianTimer)
  const resumeTimer = useCwStore((s) => s.resumeTechnicianTimer)
  const completeTimer = useCwStore((s) => s.completeTechnicianTimer)
  const pushTimeline = useCwStore((s) => s.pushTimeline)

  const [notes, setNotes] = useState('')
  const [tick, setTick] = useState(0)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [pauseReason, setPauseReason] = useState('')

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

  // Find the item and assignment
  const { item, assignment } = useMemo(() => {
    if (!appt) return { item: null, assignment: null }

    if (itemType === 'concern') {
      const concern = appt.concernItems.find((c) => c.id === itemId)
      const ta = concern?.technicianAssignments.find((t) => t.id === taId)
      return { item: concern ? { name: concern.concernName, remark: concern.remark } : null, assignment: ta ?? null }
    } else if (itemType === 'stage') {
      // Stage: itemId is serviceItemId, stageId from query
      const service = appt.serviceItems.find((s) => s.id === itemId)
      const stage = service?.stageItems?.find((st) => st.id === stageId)
      const ta = stage?.technicianAssignments.find((t) => t.id === taId)
      return { item: stage ? { name: `${stage.stageName} — ${service!.serviceDescription}`, remark: '' } : null, assignment: ta ?? null }
    } else {
      const service = appt.serviceItems.find((s) => s.id === itemId)
      const ta = service?.technicianAssignments.find((t) => t.id === taId)
      return { item: service ? { name: service.serviceDescription, remark: service.remark } : null, assignment: ta ?? null }
    }
  }, [appt, itemType, itemId, taId, stageId])

  // Live ticking timer
  useEffect(() => {
    if (!assignment || assignment.status !== 'In Progress') return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [assignment?.status])

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (!assignment) return 0
    void tick // trigger re-calc
    if (assignment.status === 'Assigned') return 0
    if (assignment.status === 'Completed') {
      if (!assignment.startedAt || !assignment.completedAt) return 0
      return new Date(assignment.completedAt).getTime() - new Date(assignment.startedAt).getTime() - (assignment.totalPausedMs || 0)
    }
    if (assignment.status === 'Paused') {
      if (!assignment.startedAt || !assignment.pausedAt) return 0
      return new Date(assignment.pausedAt).getTime() - new Date(assignment.startedAt).getTime() - (assignment.totalPausedMs || 0)
    }
    // In Progress
    if (!assignment.startedAt) return 0
    return Date.now() - new Date(assignment.startedAt).getTime() - (assignment.totalPausedMs || 0)
  }, [assignment, tick])

  if (!appt || !item || !assignment) {
    return (
      <Page title="Task Not Found">
        <Alert severity="error">Task not found.</Alert>
      </Page>
    )
  }

  const timerInput = {
    appointmentId: appt.id,
    itemId: itemId!,
    itemType: itemType as 'concern' | 'service' | 'stage',
    techAssignmentId: taId,
    ...(itemType === 'stage' ? { stageItemId: stageId } : {}),
  }

  function handleStart() {
    startTimer(timerInput)
    pushTimeline(appt!.id, { actor: userNameById.get(assignment!.technicianUserId) ?? 'Technician', action: `Started ${itemType}: ${item!.name}` })
  }

  function handlePause() {
    setPauseDialogOpen(true)
  }

  function confirmPause() {
    pauseTimer(timerInput)
    const techName = userNameById.get(assignment!.technicianUserId) ?? 'Technician'
    pushTimeline(appt!.id, {
      actor: techName,
      action: `Paused ${itemType}: ${item!.name}`,
      details: pauseReason.trim() ? `Reason: ${pauseReason.trim()}` : undefined,
    })
    // Pause recorded in timeline — SE will see it on appointment detail page
    setPauseDialogOpen(false)
    setPauseReason('')
  }

  function handleResume() {
    resumeTimer(timerInput)
    pushTimeline(appt!.id, { actor: userNameById.get(assignment!.technicianUserId) ?? 'Technician', action: `Resumed ${itemType}: ${item!.name}` })
  }

  function handleFinish() {
    completeTimer({ ...timerInput, notes: notes.trim() || undefined })
    pushTimeline(appt!.id, {
      actor: userNameById.get(assignment!.technicianUserId) ?? 'Technician',
      action: `Completed ${itemType}: ${item!.name}`,
      details: notes.trim() ? `Notes: ${notes.trim()}` : undefined,
    })
  }

  const statusBgColor =
    assignment.status === 'In Progress' ? 'success.main'
    : assignment.status === 'Paused' ? 'warning.main'
    : assignment.status === 'Completed' ? 'grey.600'
    : 'info.main'

  return (
    <Page title={item.name} subtitle={`${vehicle?.registrationNo ?? '—'} · ${customer?.fullName ?? ''}`}>
      <Stack spacing={3} sx={{ maxWidth: 600, mx: 'auto' }}>
        {/* Vehicle + Customer Info */}
        <VehicleInfoBanner appointmentId={appointmentId!} />

        {/* Timer Display */}
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: statusBgColor, color: 'white', borderRadius: 3 }}>
          <Timer sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h2" sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: 4 }}>
            {formatDuration(elapsed)}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, textTransform: 'uppercase' }}>
            {assignment.status}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            {itemType === 'concern' ? 'Concern Diagnosis' : 'Service Task'}
          </Typography>
        </Paper>

        {/* Task Info */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Box>
              <Typography variant="body2" color="text.secondary">Task</Typography>
              <Typography sx={{ fontWeight: 800 }}>{item.name}</Typography>
            </Box>
            {item.remark && (
              <Box>
                <Typography variant="body2" color="text.secondary">Remark</Typography>
                <Typography variant="body2">{item.remark}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="body2" color="text.secondary">Vehicle</Typography>
              <Typography variant="body2">{vehicle?.registrationNo} · {vehicle?.make} {vehicle?.model}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Customer</Typography>
              <Typography variant="body2">{customer?.fullName}</Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Controls */}
        {assignment.status === 'Assigned' && (
          <Button variant="contained" color="success" size="large" startIcon={<PlayArrow />}
            onClick={handleStart} sx={{ py: 2, fontSize: 18, fontWeight: 900 }}>
            Start
          </Button>
        )}

        {assignment.status === 'In Progress' && (
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="warning" size="large" startIcon={<Pause />}
              onClick={handlePause} sx={{ py: 2, flex: 1, fontWeight: 900, fontSize: 16 }}>
              Pause
            </Button>
            <Button variant="contained" color="error" size="large" startIcon={<Stop />}
              onClick={handleFinish} sx={{ py: 2, flex: 1, fontWeight: 900, fontSize: 16 }}>
              Finish
            </Button>
          </Stack>
        )}

        {assignment.status === 'Paused' && (
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="success" size="large" startIcon={<PlayArrow />}
              onClick={handleResume} sx={{ py: 2, flex: 1, fontWeight: 900, fontSize: 16 }}>
              Resume
            </Button>
            <Button variant="contained" color="error" size="large" startIcon={<Stop />}
              onClick={handleFinish} sx={{ py: 2, flex: 1, fontWeight: 900, fontSize: 16 }}>
              Finish
            </Button>
          </Stack>
        )}

        {assignment.status === 'Completed' && (
          <Alert severity="success" sx={{ fontWeight: 700 }}>
            Task completed. Total time: {formatDuration(elapsed)}
          </Alert>
        )}

        {/* Notes (before finish) */}
        {assignment.status !== 'Completed' && (
          <TextField
            label="Notes (optional — added on finish)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        )}

        {/* Show notes after completion */}
        {assignment.status === 'Completed' && assignment.notes && (
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">Notes</Typography>
            <Typography variant="body2">{assignment.notes}</Typography>
          </Paper>
        )}
      </Stack>

      {/* Pause Reason Dialog */}
      <Dialog open={pauseDialogOpen} onClose={() => setPauseDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: 'warning.main' }}>Pause Task</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pausing will notify the Service Engineer for review. Please provide a reason.
          </Typography>
          <TextField
            autoFocus fullWidth size="small" label="Pause Reason" multiline rows={3}
            value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Why are you pausing this task?"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setPauseDialogOpen(false); setPauseReason('') }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={confirmPause} disabled={!pauseReason.trim()}>
            Confirm Pause
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
