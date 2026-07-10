import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, Assignment, Pause, PlayArrow, Stop, Timer } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore } from '../../store/cwStore'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { colors, radii, shadows } from '../../theme/tokens'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ── Info Row — label / value pair inside SectionCard ──────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

/* ── Status color map ─────────────────────────────────────── */
function timerGradient(status: string) {
  switch (status) {
    case 'In Progress': return 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    case 'Paused': return 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
    case 'Completed': return 'linear-gradient(135deg, #475569 0%, #64748B 100%)'
    default: return 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
  }
}

export function TechnicianTaskPage() {
  const navigate = useNavigate()
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
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Task not found.</Alert>
      </Box>
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

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
            <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              {item.name}
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              {vehicle?.registrationNo ?? '—'} · {customer?.fullName ?? ''}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={3} sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>
          {/* Vehicle + Customer Info */}
          <VehicleInfoBanner appointmentId={appointmentId!} />

          {/* Timer Display */}
          <Box sx={{
            p: 4,
            textAlign: 'center',
            background: timerGradient(assignment.status),
            color: 'white',
            borderRadius: radii.lg,
            boxShadow: shadows.elevated,
          }}>
            <Timer sx={{ fontSize: 48, mb: 1 }} />
            <Typography sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: 4, fontSize: { xs: '2.5rem', md: '3rem' } }}>
              {formatDuration(elapsed)}
            </Typography>
            <Typography sx={{ fontWeight: 700, mt: 1, textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              {assignment.status}
            </Typography>
            <Typography sx={{ mt: 0.5, opacity: 0.8, fontSize: '0.85rem' }}>
              {itemType === 'concern' ? 'Concern Diagnosis' : 'Service Task'}
            </Typography>
          </Box>

          {/* Task Info */}
          <SectionCard title="Task Details" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
            <InfoRow label="Task" value={item.name} />
            {item.remark && <InfoRow label="Remark" value={item.remark} />}
            <InfoRow label="Vehicle" value={`${vehicle?.registrationNo} · ${vehicle?.make} ${vehicle?.model}`} />
            <InfoRow label="Customer" value={customer?.fullName} />
          </SectionCard>

          {/* Controls */}
          {assignment.status === 'Assigned' && (
            <Button variant="contained" size="large" startIcon={<PlayArrow />}
              onClick={handleStart} sx={{
                py: 2, fontSize: 18, fontWeight: 900,
                bgcolor: colors.status.success, borderRadius: radii.md,
                '&:hover': { bgcolor: '#059669' },
              }}>
              Start
            </Button>
          )}

          {assignment.status === 'In Progress' && (
            <Stack direction="row" spacing={2}>
              <Button variant="contained" size="large" startIcon={<Pause />}
                onClick={handlePause} sx={{
                  py: 2, flex: 1, fontWeight: 900, fontSize: 16,
                  bgcolor: colors.status.warning, borderRadius: radii.md,
                  '&:hover': { bgcolor: '#d97706' },
                }}>
                Pause
              </Button>
              <Button variant="contained" size="large" startIcon={<Stop />}
                onClick={handleFinish} sx={{
                  py: 2, flex: 1, fontWeight: 900, fontSize: 16,
                  bgcolor: colors.status.error, borderRadius: radii.md,
                  '&:hover': { bgcolor: '#dc2626' },
                }}>
                Finish
              </Button>
            </Stack>
          )}

          {assignment.status === 'Paused' && (
            <Stack direction="row" spacing={2}>
              <Button variant="contained" size="large" startIcon={<PlayArrow />}
                onClick={handleResume} sx={{
                  py: 2, flex: 1, fontWeight: 900, fontSize: 16,
                  bgcolor: colors.status.success, borderRadius: radii.md,
                  '&:hover': { bgcolor: '#059669' },
                }}>
                Resume
              </Button>
              <Button variant="contained" size="large" startIcon={<Stop />}
                onClick={handleFinish} sx={{
                  py: 2, flex: 1, fontWeight: 900, fontSize: 16,
                  bgcolor: colors.status.error, borderRadius: radii.md,
                  '&:hover': { bgcolor: '#dc2626' },
                }}>
                Finish
              </Button>
            </Stack>
          )}

          {assignment.status === 'Completed' && (
            <Alert severity="success" sx={{ fontWeight: 700, borderRadius: radii.md }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radii.sm,
                  fontSize: '0.85rem',
                },
              }}
            />
          )}

          {/* Show notes after completion */}
          {assignment.status === 'Completed' && assignment.notes && (
            <SectionCard title="Notes" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700], py: 0.5 }}>{assignment.notes}</Typography>
            </SectionCard>
          )}
        </Stack>
      </Stack>

      {/* Pause Reason Dialog */}
      <Dialog open={pauseDialogOpen} onClose={() => setPauseDialogOpen(false)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: radii.lg, boxShadow: shadows.dialog } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: colors.status.warning }}>Pause Task</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 2 }}>
            Pausing will notify the Service Engineer for review. Please provide a reason.
          </Typography>
          <TextField
            autoFocus fullWidth size="small" label="Pause Reason" multiline rows={3}
            value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Why are you pausing this task?"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setPauseDialogOpen(false); setPauseReason('') }}
            sx={{ borderRadius: '10px', color: colors.slate[600] }}>Cancel</Button>
          <Button variant="contained" onClick={confirmPause} disabled={!pauseReason.trim()}
            sx={{ bgcolor: colors.status.warning, borderRadius: '10px', fontWeight: 600, '&:hover': { bgcolor: '#d97706' } }}>
            Confirm Pause
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
