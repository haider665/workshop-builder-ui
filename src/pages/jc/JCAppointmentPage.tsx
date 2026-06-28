import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  IconButton,
} from '@mui/material'
import { SwapHoriz, ExpandMore } from '@mui/icons-material'
import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

type ConcernForm = Record<string, { teamId: string; seUserId: string; bayId: string; startLocal: string; endLocal: string; bufferMins: string }>
type ServiceForm = Record<string, { teamId: string; seUserId: string; bayId: string; startLocal: string; endLocal: string; bufferMins: string }>

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
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

export function JCAppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const assignConcernDiagnosis = useCwStore((s) => s.assignConcernDiagnosis)
  const assignServiceSE = useCwStore((s) => s.assignServiceSE)
  const assignStageSchedule = useCwStore((s) => s.assignStageSchedule)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const teams = useCwStore((s) => s.teams)
  const services = useCwStore((s) => s.services)
  const partRequests = useCwStore((s) => s.partRequests)
  const shops = useCwStore((s) => s.shops)
  const allConcerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const roles = useCwStore((s) => s.roles)
  const seRoleId = useMemo(
    () => roles.find((r) => r.name === 'Service Engineer' || r.name === 'SE')?.id,
    [roles],
  )
  const seUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && seRoleId && u.roleIds.includes(seRoleId)),
    [users, seRoleId],
  )

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

  const activeBays = useMemo(() => bays.filter((b) => b.status !== 'Inactive'), [bays])

  const [concernForm, setConcernForm] = useState<ConcernForm>({})
  const [serviceForm, setServiceForm] = useState<ServiceForm>({})
  const [error, setError] = useState<string | null>(null)
  const [concernShopFilter, setConcernShopFilter] = useState('')
  const [serviceShopFilter, setServiceShopFilter] = useState('')

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])

  // Shop lookup for concern items: concernId → concern → categoryId → category → shopId
  const concernShopId = useMemo(() => {
    const cMap = new Map(allConcerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (concernId: string) => {
      const concern = cMap.get(concernId)
      if (!concern) return ''
      return catMap.get(concern.categoryId)?.shopId ?? ''
    }
  }, [allConcerns, concernCategories])

  // Shop lookup for service items: serviceId → service → shopId
  const serviceShopIdMap = useMemo(() => new Map(services.map((s) => [s.id, s.shopId])), [services])

  // Bay conflict confirmation dialog state
  const [bayConflictDialog, setBayConflictDialog] = useState<{ open: boolean; conflicts: string[]; phase: 'diagnosis' | 'service' }>({ open: false, conflicts: [], phase: 'diagnosis' })

  // Relocate dialog state
  const [relocateDialog, setRelocateDialog] = useState<{
    open: boolean
    itemType: 'concern' | 'service'
    itemId: string
    itemName: string
    bayId: string
    seUserId: string
    startLocal: string
    endLocal: string
  }>({ open: false, itemType: 'concern', itemId: '', itemName: '', bayId: '', seUserId: '', startLocal: '', endLocal: '' })

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  // Phase 1: Customer Approved → assign SE+bay to CONCERNS only → Diagnosis Assigned
  const isDiagnosisPhase = appt.status === 'Customer Approved'
  // Phase 2: Service Approved → assign SE+bay to SERVICES only → Service Assigned
  const isServicePhase = appt.status === 'Service Approved'
  // Phase 3: QC Rejected → reassign SE for FAILED items only → Service Assigned
  const isQCRejectedPhase = appt.status === 'QC Rejected'

  // Get QC-failed services for rework assignment (QC only verifies services)
  const failedServices = useMemo(
    () => isQCRejectedPhase ? appt.serviceItems.filter((s) => s.qcStatus === 'Failed') : [],
    [isQCRejectedPhase, appt.serviceItems],
  )

  function toIso(local: string) {
    if (!local) return ''
    const d = new Date(local)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }

  function getConcernFormVal(id: string) {
    return concernForm[id] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
  }

  function getServiceFormVal(id: string) {
    return serviceForm[id] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
  }

  // ── Bay conflict detection ──────────────────────────────────────────
  function getBayBookings() {
    const bookings: { bayId: string; start: number; end: number; label: string }[] = []
    for (const a of appointments) {
      if (a.id === appointmentId) continue // skip current appointment
      for (const c of a.concernItems) {
        if (c.bayId && c.plannedStartAt && c.plannedEndAt) {
          bookings.push({ bayId: c.bayId, start: Date.parse(c.plannedStartAt), end: Date.parse(c.plannedEndAt), label: `Concern "${c.concernName}" in appt #${a.id.slice(0, 6)}` })
        }
      }
      for (const s of a.serviceItems) {
        if (s.bayId && s.plannedStartAt && s.plannedEndAt) {
          bookings.push({ bayId: s.bayId, start: Date.parse(s.plannedStartAt), end: Date.parse(s.plannedEndAt), label: `Service "${s.serviceDescription}" in appt #${a.id.slice(0, 6)}` })
        }
      }
    }
    return bookings
  }

  function checkBayConflict(bayId: string, startIso: string, endIso: string): string | null {
    if (!bayId || !startIso || !endIso) return null
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    if (Number.isNaN(start) || Number.isNaN(end)) return null
    const bookings = getBayBookings()
    for (const b of bookings) {
      if (b.bayId !== bayId) continue
      if (start < b.end && end > b.start) {
        const bayName = bayNameById.get(bayId) ?? bayId
        return `Bay "${bayName}" conflict: overlaps with ${b.label}`
      }
    }
    return null
  }

  // ── Team conflict detection ──────────────────────────────────────────
  function getTeamBookings() {
    const bookings: { teamId: string; start: number; end: number; label: string }[] = []
    for (const a of appointments) {
      if (a.id === appointmentId) continue
      for (const c of a.concernItems) {
        if (c.plannedStartAt && c.plannedEndAt) {
          // Find which team this SE belongs to
          const team = teams.find((t) => t.seUserId === c.assignedSEUserId)
          if (team) {
            bookings.push({ teamId: team.id, start: Date.parse(c.plannedStartAt), end: Date.parse(c.plannedEndAt), label: `Concern "${c.concernName}" in appt #${a.id.slice(0, 6)}` })
          }
        }
      }
    }
    return bookings
  }

  function checkTeamConflict(teamId: string, startIso: string, endIso: string): string | null {
    if (!teamId || !startIso || !endIso) return null
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    if (Number.isNaN(start) || Number.isNaN(end)) return null
    const bookings = getTeamBookings()
    for (const b of bookings) {
      if (b.teamId !== teamId) continue
      if (start < b.end && end > b.start) {
        const teamName = teams.find((t) => t.id === teamId)?.name ?? teamId
        return `Team "${teamName}" conflict: overlaps with ${b.label}`
      }
    }
    return null
  }

  // Detect different teams sharing same bay within current form (intra-assignment)
  function detectSimultaneousBayWork(formEntries: { id: string; label: string; teamId: string; bayId: string; startIso: string; endIso: string }[]): string[] {
    const conflicts: string[] = []
    for (let i = 0; i < formEntries.length; i++) {
      for (let j = i + 1; j < formEntries.length; j++) {
        const a = formEntries[i]
        const b = formEntries[j]
        if (!a.bayId || !b.bayId || a.bayId !== b.bayId) continue
        if (!a.teamId || !b.teamId || a.teamId === b.teamId) continue
        // Same bay, different teams — check time overlap
        const aStart = Date.parse(a.startIso)
        const aEnd = Date.parse(a.endIso)
        const bStart = Date.parse(b.startIso)
        const bEnd = Date.parse(b.endIso)
        if (Number.isNaN(aStart) || Number.isNaN(aEnd) || Number.isNaN(bStart) || Number.isNaN(bEnd)) continue
        if (aStart < bEnd && aEnd > bStart) {
          const bayName = bayNameById.get(a.bayId) ?? a.bayId
          const teamA = teams.find((t) => t.id === a.teamId)?.name ?? a.teamId
          const teamB = teams.find((t) => t.id === b.teamId)?.name ?? b.teamId
          conflicts.push(`Bay "${bayName}": Team "${teamA}" (${a.label}) and Team "${teamB}" (${b.label}) will work simultaneously.`)
        }
      }
    }
    return conflicts
  }

  function validateDiagnosisForm() {
    for (const c of appt!.concernItems) {
      const form = getConcernFormVal(c.id)
      if (!form.seUserId) throw new Error(`Select SE for concern: ${c.concernName}`)
      if (!form.bayId) throw new Error(`Select Bay for concern: ${c.concernName}`)
      const start = toIso(form.startLocal)
      if (!start) throw new Error(`Set start time for concern: ${c.concernName}`)
      const end = toIso(form.endLocal) || start

      const bayConflict = checkBayConflict(form.bayId, start, end)
      if (bayConflict) throw new Error(bayConflict)

      if (form.teamId) {
        const teamConflict = checkTeamConflict(form.teamId, start, end)
        if (teamConflict) throw new Error(teamConflict)
      }
    }
  }

  function submitDiagnosisAssignment(skipBayWarning = false) {
    try {
      setError(null)
      validateDiagnosisForm()

      // Check for simultaneous bay work (different teams, same bay)
      if (!skipBayWarning) {
        const entries = appt!.concernItems.map((c) => {
          const form = getConcernFormVal(c.id)
          return { id: c.id, label: c.concernName, teamId: form.teamId, bayId: form.bayId, startIso: toIso(form.startLocal), endIso: toIso(form.endLocal) || toIso(form.startLocal) }
        })
        const conflicts = detectSimultaneousBayWork(entries)
        if (conflicts.length > 0) {
          setBayConflictDialog({ open: true, conflicts, phase: 'diagnosis' })
          return
        }
      }

      for (const c of appt!.concernItems) {
        const form = getConcernFormVal(c.id)
        const start = toIso(form.startLocal)
        const end = toIso(form.endLocal) || start

        assignConcernDiagnosis({
          appointmentId: appt!.id,
          concernItemId: c.id,
          seUserId: form.seUserId,
          bayId: form.bayId,
          startAt: start,
          endAt: end,
        })
      }

      setAppointmentStatus(appt!.id, 'Diagnosis Assigned')
      pushTimeline(appt!.id, { actor: 'JC', action: 'SE + Bay assigned to all concerns for diagnosis' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function validateServiceForm() {
    for (const s of appt!.serviceItems) {
      const hasStages = s.stageItems && s.stageItems.length > 0

      if (hasStages) {
        // Validate each stage
        for (const stage of s.stageItems!) {
          const stageKey = `${s.id}_${stage.id}`
          const form = serviceForm[stageKey] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
          if (!form.bayId) throw new Error(`Select Bay for stage "${stage.stageName}" of ${s.serviceDescription}`)
          const startIso = toIso(form.startLocal)
          if (!startIso) throw new Error(`Set start time for stage "${stage.stageName}" of ${s.serviceDescription}`)
          const endIso = toIso(form.endLocal) || startIso

          const bayConflict = checkBayConflict(form.bayId, startIso, endIso)
          if (bayConflict) throw new Error(bayConflict)
        }
      } else {
        // Non-staged: existing validation
        const form = getServiceFormVal(s.id)
        if (!form.seUserId) throw new Error(`Select SE for service: ${s.serviceDescription}`)
        if (!form.bayId) throw new Error(`Select Bay for service: ${s.serviceDescription}`)

        const startIso = toIso(form.startLocal)
        if (!startIso) throw new Error(`Set start time for service: ${s.serviceDescription}`)
        const endIso = toIso(form.endLocal) || startIso

        const bayConflict = checkBayConflict(form.bayId, startIso, endIso)
        if (bayConflict) throw new Error(bayConflict)

        if (form.teamId) {
          const teamConflict = checkTeamConflict(form.teamId, startIso, endIso)
          if (teamConflict) throw new Error(teamConflict)
        }
      }
    }
  }

  function submitServiceAssignment(skipBayWarning = false) {
    try {
      setError(null)
      validateServiceForm()

      // Check for simultaneous bay work (different teams, same bay)
      if (!skipBayWarning) {
        const entries: { id: string; label: string; teamId: string; bayId: string; startIso: string; endIso: string }[] = []
        for (const s of appt!.serviceItems) {
          if (s.stageItems && s.stageItems.length > 0) {
            for (const stage of s.stageItems) {
              const stageKey = `${s.id}_${stage.id}`
              const form = serviceForm[stageKey] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
              entries.push({ id: stage.id, label: `${stage.stageName} (${s.serviceDescription})`, teamId: form.teamId, bayId: form.bayId, startIso: toIso(form.startLocal), endIso: toIso(form.endLocal) || toIso(form.startLocal) })
            }
          } else {
            const form = getServiceFormVal(s.id)
            entries.push({ id: s.id, label: s.serviceDescription, teamId: form.teamId, bayId: form.bayId, startIso: toIso(form.startLocal), endIso: toIso(form.endLocal) || toIso(form.startLocal) })
          }
        }
        const conflicts = detectSimultaneousBayWork(entries)
        if (conflicts.length > 0) {
          setBayConflictDialog({ open: true, conflicts, phase: 'service' })
          return
        }
      }

      for (const s of appt!.serviceItems) {
        if (s.stageItems && s.stageItems.length > 0) {
          // Stage-level scheduling
          for (const stage of s.stageItems) {
            const stageKey = `${s.id}_${stage.id}`
            const form = serviceForm[stageKey] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
            const startIso = toIso(form.startLocal)
            const endIso = toIso(form.endLocal) || startIso

            assignStageSchedule({
              appointmentId: appt!.id,
              serviceItemId: s.id,
              stageItemId: stage.id,
              bayId: form.bayId,
              teamId: form.teamId || undefined,
              seUserId: form.seUserId || undefined,
              startAt: startIso,
              endAt: endIso,
            })
          }
        } else {
          // Non-staged: existing flow
          const form = getServiceFormVal(s.id)
          const startIso = toIso(form.startLocal)
          const endIso = toIso(form.endLocal) || startIso

          assignServiceSE({
            appointmentId: appt!.id,
            serviceItemId: s.id,
            seUserId: form.seUserId,
            bayId: form.bayId,
            startAt: startIso,
            endAt: endIso,
          })
        }
      }

      setAppointmentStatus(appt!.id, 'Service Assigned')
      pushTimeline(appt!.id, { actor: 'JC', action: 'SE + Bay assigned to all services' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitQCReworkAssignment(skipBayWarning = false) {
    try {
      setError(null)

      // Validate and assign only the failed services
      const formEntries: { id: string; label: string; teamId: string; bayId: string; startIso: string; endIso: string }[] = []

      for (const s of failedServices) {
        const form = getServiceFormVal(s.id)
        if (!form.seUserId) throw new Error(`Select SE for service: ${s.serviceDescription}`)
        if (!form.bayId) throw new Error(`Select Bay for service: ${s.serviceDescription}`)
        const startIso = toIso(form.startLocal)
        if (!startIso) throw new Error(`Set start time for service: ${s.serviceDescription}`)
        const endIso = toIso(form.endLocal) || startIso
        const bayConflict = checkBayConflict(form.bayId, startIso, endIso)
        if (bayConflict) throw new Error(bayConflict)
        formEntries.push({ id: s.id, label: s.serviceDescription, teamId: form.teamId, bayId: form.bayId, startIso: startIso, endIso: endIso })
      }

      if (!skipBayWarning) {
        const conflicts = detectSimultaneousBayWork(formEntries)
        if (conflicts.length > 0) {
          setBayConflictDialog({ open: true, conflicts, phase: 'service' })
          return
        }
      }

      // Assign failed services
      for (const s of failedServices) {
        const form = getServiceFormVal(s.id)
        const startIso = toIso(form.startLocal)
        const endIso = toIso(form.endLocal) || startIso
        assignServiceSE({
          appointmentId: appt!.id,
          serviceItemId: s.id,
          seUserId: form.seUserId,
          bayId: form.bayId,
          startAt: startIso,
          endAt: endIso,
        })
      }

      setAppointmentStatus(appt!.id, 'Service Assigned')
      pushTimeline(appt!.id, {
        actor: 'JC',
        action: `Reassigned ${failedServices.length} QC-failed service(s) for rework`,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const totalBDT = appt.serviceItems.reduce((sum, s) => sum + s.price, 0)

  return (
    <Page title="JC — Appointment" subtitle={`#${appt.id.slice(0, 8)}`}>
      {/* Simultaneous bay work confirmation dialog */}
      <Dialog open={bayConflictDialog.open} onClose={() => setBayConflictDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: 'warning.main' }}>⚠ Simultaneous Bay Work</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Multiple teams with different concerns will be working in the same bay at the same time:
            </Typography>
            {bayConflictDialog.conflicts.map((msg, i) => (
              <Alert key={i} severity="warning" sx={{ fontWeight: 600 }}>{msg}</Alert>
            ))}
            <Typography sx={{ fontWeight: 600 }}>Do you want to proceed?</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" size="large" onClick={() => setBayConflictDialog((d) => ({ ...d, open: false }))} sx={{ fontWeight: 900 }}>
            Decline
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="large"
            sx={{ fontWeight: 900 }}
            onClick={() => {
              setBayConflictDialog((d) => ({ ...d, open: false }))
              if (bayConflictDialog.phase === 'diagnosis') submitDiagnosisAssignment(true)
              else submitServiceAssignment(true)
            }}
          >
            Approve & Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

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
              <Typography variant="body2" color="text.secondary">SA</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {appt.assignedSAUserId ? (userNameById.get(appt.assignedSAUserId) ?? '—') : '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={appt.status} size="small" color={statusColor(appt.status)} sx={{ fontWeight: 700, mt: 0.5 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>{fmtBDT(totalBDT)}</Typography>
            </Box>
          </Stack>
        </Paper>

        {/* ── Vehicle + Customer Info ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* ── Workflow Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* SA Health Check Report (readonly, collapsible) */}
        {appt.inspectionChecks.length > 0 && (
          <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'info.main', '&:before': { display: 'none' }, boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'info.main', color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }}>
              <Typography sx={{ fontWeight: 900 }}>SA Health Check Report</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5 }}>
              <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly />
            </AccordionDetails>
          </Accordion>
        )}

        {/* ── Concerns Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 900 }}>Concerns ({appt.concernItems.length})</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={concernShopFilter} onChange={(e) => setConcernShopFilter(e.target.value as string)}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            {concernShopFilter && <Chip label={shopById.get(concernShopFilter)?.name} onDelete={() => setConcernShopFilter('')} color="primary" size="small" />}
          </Stack>
          {appt.concernItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No concerns listed.</Typography>
          ) : (
            <Stack spacing={2}>
              {appt.concernItems.filter((c) => !concernShopFilter || concernShopId(c.concernId) === concernShopFilter).map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                return (
                  <Box key={c.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: c.workStatus === 'Completed' ? 'success.main' : 'divider' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {c.concernName}
                        {typeof c.processTimeMins === 'number' && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'info.main', color: 'white', borderRadius: 1, fontWeight: 700 }}>
                            {c.processTimeMins}m
                          </Typography>
                        )}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {c.assignedSEUserId && <Chip size="small" label={userNameById.get(c.assignedSEUserId) ?? '—'} variant="outlined" />}
                        {c.bayId && <Chip size="small" label={bayNameById.get(c.bayId) ?? '—'} variant="outlined" />}
                        {c.workStatus ? (
                          <Chip label={c.workStatus} size="small" color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700 }} />
                        ) : null}
                        {c.bayId && c.workStatus !== 'Completed' && (
                          <IconButton size="small" color="primary" title="Relocate"
                            onClick={() => setRelocateDialog({
                              open: true, itemType: 'concern', itemId: c.id, itemName: c.concernName,
                              bayId: c.bayId ?? '', seUserId: c.assignedSEUserId ?? '',
                              startLocal: c.plannedStartAt ? new Date(c.plannedStartAt).toISOString().slice(0, 16) : '',
                              endLocal: c.plannedEndAt ? new Date(c.plannedEndAt).toISOString().slice(0, 16) : '',
                            })}>
                            <SwapHoriz fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                    {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}
                    {c.plannedStartAt && (
                      <Typography variant="caption" color="text.secondary">
                        {fmtDateTime(c.plannedStartAt)} → {fmtDateTime(c.plannedEndAt)}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Parts for this concern */}
                    {concernParts.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>Parts:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {concernParts.map((pr) => (
                            <Stack key={pr.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5, bgcolor: 'white', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{pr.partName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                  {typeof pr.price === 'number' ? ` · ${fmtBDT(pr.price)}` : ''}
                                  {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                </Typography>
                              </Box>
                              <Chip size="small" label={pr.status}
                                color={pr.status === 'Fulfilled' ? 'success' : pr.status === 'Labeled' ? 'info' : pr.status === 'Rejected' ? 'error' : 'warning'}
                              />
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </Paper>

        {/* ── Services Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 900 }}>Services ({appt.serviceItems.length})</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={serviceShopFilter} onChange={(e) => setServiceShopFilter(e.target.value as string)}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            {serviceShopFilter && <Chip label={shopById.get(serviceShopFilter)?.name} onDelete={() => setServiceShopFilter('')} color="primary" size="small" />}
          </Stack>
          {appt.serviceItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Assigned SE</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.filter((s) => !serviceShopFilter || (serviceShopIdMap.get(s.serviceId) ?? '') === serviceShopFilter).map((s) => (
                  <React.Fragment key={s.id}>
                    <TableRow>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription} ({s.processTimeMins} mins)</Typography>
                        <Typography variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                        {s.stageItems && s.stageItems.length > 0 && (
                          <Chip size="small" label={`${s.stageItems.length} stages`} color="info" variant="outlined" sx={{ ml: 1, fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell><Typography variant="body2">{fmtBDT(s.price)}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : s.stageItems?.length ? 'Per stage' : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : s.stageItems?.length ? 'Per stage' : '—'}</Typography></TableCell>
                      <TableCell>
                        {s.workStatus ? (
                          <Chip label={s.workStatus} size="small" color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700 }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {s.bayId && s.workStatus !== 'Completed' && !s.stageItems?.length && (
                          <IconButton size="small" color="primary" title="Relocate"
                            onClick={() => setRelocateDialog({
                              open: true, itemType: 'service', itemId: s.id, itemName: s.serviceDescription,
                              bayId: s.bayId ?? '', seUserId: s.assignedSEUserId ?? '',
                              startLocal: s.plannedStartAt ? new Date(s.plannedStartAt).toISOString().slice(0, 16) : '',
                              endLocal: s.plannedEndAt ? new Date(s.plannedEndAt).toISOString().slice(0, 16) : '',
                            })}>
                            <SwapHoriz fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Stage detail rows */}
                    {s.stageItems && s.stageItems.length > 0 && s.stageItems.some((st) => st.workStatus !== 'Pending') && s.stageItems.map((st) => (
                      <TableRow key={st.id} sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ pl: 5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Stage {st.stageOrder}: {st.stageName} ({st.durationMins}m)
                          </Typography>
                        </TableCell>
                        <TableCell />
                        <TableCell><Typography variant="caption">{st.assignedSEUserId ? (userNameById.get(st.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{st.bayId ? (bayNameById.get(st.bayId) ?? '—') : '—'}</Typography></TableCell>
                        <TableCell>
                          <Chip label={st.workStatus} size="small"
                            color={st.workStatus === 'Completed' ? 'success' : st.workStatus === 'In Progress' ? 'primary' : st.workStatus === 'Scheduled' ? 'info' : 'default'}
                            sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Phase 1: Assign SE + Bay to CONCERNS (Diagnosis) ── */}
        {isDiagnosisPhase && appt.concernItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'warning.main' }}>
              Assign SE + Bay for Diagnosis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customer approved. Assign SE and Bay to each concern for diagnosis.
            </Typography>

            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const form = getConcernFormVal(c.id)
                return (
                  <Box key={c.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {c.concernName}
                      </Typography>
                      {c.remark && <Typography variant="caption" color="text.secondary">— {c.remark}</Typography>}
                      {typeof c.processTimeMins === 'number' && (
                        <Chip
                          size="small"
                          label={`⏱ ${c.processTimeMins} mins`}
                          color="info"
                          sx={{ fontWeight: 800, fontSize: '0.8rem' }}
                        />
                      )}
                      {form.endLocal && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="success"
                          label={`End: ${new Date(form.endLocal).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr' }, gap: 1.5 }}>
                      <TextField
                        select size="small" label="Team"
                        value={form.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value
                          setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), teamId, seUserId: '' } }))
                        }}
                      >
                        <MenuItem value="">— Select Team —</MenuItem>
                        {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Service Engineer"
                        value={form.seUserId}
                        onChange={(e) => setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), seUserId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select SE —</MenuItem>
                        {(() => {
                          const team = teams.find((t) => t.id === form.teamId)
                          const filteredSEs = team
                            ? seUsers.filter((u) => u.id === team.seUserId)
                            : seUsers
                          return filteredSEs.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                        })()}
                      </TextField>
                      <TextField
                        select size="small" label="Bay"
                        value={form.bayId}
                        onChange={(e) => setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), bayId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select Bay —</MenuItem>
                        {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Start Time" type="datetime-local" value={form.startLocal}
                        onChange={(e) => {
                          const startVal = e.target.value
                          const updates: Partial<typeof form> = { startLocal: startVal }
                          const mins = typeof c.processTimeMins === 'number' ? c.processTimeMins : 0
                          if (startVal && mins > 0) {
                            const d = new Date(startVal)
                            d.setMinutes(d.getMinutes() + mins)
                            updates.endLocal = d.toISOString().slice(0, 16)
                          }
                          setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), ...updates } }))
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" color="warning" size="large" onClick={() => submitDiagnosisAssignment()} sx={{ fontWeight: 900 }}>
                Assign SE & Start Diagnosis
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Phase 2: Assign SE + Bay to SERVICES ── */}
        {isServicePhase && appt.serviceItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'success.main' }}>
              Assign SE + Bay for Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Services approved. Assign SE and Bay to each service{appt.serviceItems.some((s) => s.stageItems && s.stageItems.length > 0) ? ' (staged services require per-stage assignment)' : ''}.
            </Typography>

            <Stack spacing={2}>
              {appt.serviceItems.map((s) => {
                const hasStages = s.stageItems && s.stageItems.length > 0

                if (hasStages) {
                  // ── Stage-wise assignment ──
                  return (
                    <Box key={s.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {s.serviceDescription}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">— {s.serviceCode} · {fmtBDT(s.price)}</Typography>
                        <Chip size="small" label={`${s.stageItems!.length} stages`} color="info" variant="outlined" sx={{ fontWeight: 700 }} />
                        <Chip size="small" label={`Total: ${s.processTimeMins} mins`} color="success" sx={{ fontWeight: 800, fontSize: '0.8rem' }} />
                      </Stack>

                      <Stack spacing={1.5}>
                        {s.stageItems!.map((stage, idx) => {
                          const stageKey = `${s.id}_${stage.id}`
                          const form = serviceForm[stageKey] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
                          const prevStage = idx > 0 ? s.stageItems![idx - 1] : null
                          const prevKey = prevStage ? `${s.id}_${prevStage.id}` : null
                          const prevEnd = prevKey ? serviceForm[prevKey]?.endLocal : null

                          return (
                            <Box key={stage.id} sx={{ p: 1.5, bgcolor: idx % 2 === 0 ? 'grey.50' : 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                <Chip size="small" label={`Stage ${stage.stageOrder}`} sx={{ fontWeight: 800, bgcolor: 'info.main', color: 'white' }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{stage.stageName}</Typography>
                                <Chip size="small" label={`⏱ ${stage.durationMins} mins`} color="default" sx={{ fontWeight: 700 }} />
                                {idx > 0 && !prevEnd && (
                                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                                    ⚠ Set previous stage time first
                                  </Typography>
                                )}
                              </Stack>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr' }, gap: 1.5 }}>
                                <TextField
                                  select size="small" label="Team" value={form.teamId}
                                  onChange={(e) => {
                                    const teamId = e.target.value
                                    setServiceForm((prev) => ({ ...prev, [stageKey]: { ...form, teamId, seUserId: '' } }))
                                  }}
                                >
                                  <MenuItem value="">— Select —</MenuItem>
                                  {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                                </TextField>
                                <TextField
                                  select size="small" label="SE" value={form.seUserId}
                                  onChange={(e) => setServiceForm((prev) => ({ ...prev, [stageKey]: { ...form, seUserId: e.target.value } }))}
                                >
                                  <MenuItem value="">— Select —</MenuItem>
                                  {(() => {
                                    const team = teams.find((t) => t.id === form.teamId)
                                    const filtered = team ? seUsers.filter((u) => u.id === team.seUserId) : seUsers
                                    return filtered.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                                  })()}
                                </TextField>
                                <TextField
                                  select size="small" label="Bay" value={form.bayId}
                                  onChange={(e) => setServiceForm((prev) => ({ ...prev, [stageKey]: { ...form, bayId: e.target.value } }))}
                                >
                                  <MenuItem value="">— Select —</MenuItem>
                                  {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </TextField>
                                <TextField
                                  size="small" label="Start Time" type="datetime-local"
                                  value={form.startLocal}
                                  onChange={(e) => {
                                    const startVal = e.target.value
                                    const updates: Partial<typeof form> = { startLocal: startVal }
                                    if (startVal && stage.durationMins > 0) {
                                      const d = new Date(startVal)
                                      d.setMinutes(d.getMinutes() + stage.durationMins)
                                      updates.endLocal = d.toISOString().slice(0, 16)
                                    }
                                    setServiceForm((prev) => {
                                      const updated = { ...prev, [stageKey]: { ...form, ...updates } }
                                      // Auto-chain: set next stage start = this stage end
                                      if (updates.endLocal && idx < s.stageItems!.length - 1) {
                                        const nextStage = s.stageItems![idx + 1]
                                        const nextKey = `${s.id}_${nextStage.id}`
                                        const nextForm = prev[nextKey] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
                                        const nextEnd = new Date(updates.endLocal)
                                        nextEnd.setMinutes(nextEnd.getMinutes() + nextStage.durationMins)
                                        updated[nextKey] = { ...nextForm, startLocal: updates.endLocal, endLocal: nextEnd.toISOString().slice(0, 16) }
                                      }
                                      return updated
                                    })
                                  }}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                              </Box>
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  )
                }

                // ── Non-staged service (existing behavior) ──
                const form = getServiceFormVal(s.id)
                return (
                  <Box key={s.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {s.serviceDescription}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">— {s.serviceCode} · {fmtBDT(s.price)}</Typography>
                      {typeof s.processTimeMins === 'number' && s.processTimeMins > 0 && (
                        <Chip
                          size="small"
                          label={`⏱ ${s.processTimeMins} mins`}
                          color="success"
                          sx={{ fontWeight: 800, fontSize: '0.8rem' }}
                        />
                      )}
                      {form.endLocal && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="success"
                          label={`End: ${new Date(form.endLocal).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr' }, gap: 1.5 }}>
                      <TextField
                        select size="small" label="Team"
                        value={form.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), teamId, seUserId: '' } }))
                        }}
                      >
                        <MenuItem value="">— Select Team —</MenuItem>
                        {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Service Engineer"
                        value={form.seUserId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), seUserId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select SE —</MenuItem>
                        {(() => {
                          const team = teams.find((t) => t.id === form.teamId)
                          const filteredSEs = team
                            ? seUsers.filter((u) => u.id === team.seUserId)
                            : seUsers
                          return filteredSEs.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                        })()}
                      </TextField>
                      <TextField
                        select size="small" label="Bay"
                        value={form.bayId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), bayId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select Bay —</MenuItem>
                        {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Start Time" type="datetime-local" value={form.startLocal}
                        onChange={(e) => {
                          const startVal = e.target.value
                          const updates: Partial<typeof form> = { startLocal: startVal }
                          const mins = typeof s.processTimeMins === 'number' ? s.processTimeMins : 0
                          if (startVal && mins > 0) {
                            const d = new Date(startVal)
                            d.setMinutes(d.getMinutes() + mins)
                            updates.endLocal = d.toISOString().slice(0, 16)
                          }
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), ...updates } }))
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" color="success" size="large" onClick={() => submitServiceAssignment()} sx={{ fontWeight: 900 }}>
                Assign SE & Start Services
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Phase 3: QC Rejected — Reassign failed items for rework ── */}
        {isQCRejectedPhase && failedServices.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'error.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'error.main' }}>
              QC Rejected — Reassign Failed Services for Rework
            </Typography>
            {appt.qcRejectionNote && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>QC Note:</strong> {appt.qcRejectionNote}
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {failedServices.length} service(s) failed QC. Assign SE and Bay for rework.
            </Typography>

            <Stack spacing={2}>
              {/* Failed services */}
              {failedServices.map((s) => {
                const form = getServiceFormVal(s.id)
                return (
                  <Box key={s.id} sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1, p: 2, bgcolor: 'error.50' }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label="SERVICE" color="info" sx={{ fontWeight: 800 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                      {s.qcNote && <Typography variant="caption" color="error.main">QC: {s.qcNote}</Typography>}
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr' }, gap: 1.5, mt: 1 }}>
                      <TextField
                        select size="small" label="Team" value={form.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), teamId, seUserId: '' } }))
                        }}
                      >
                        <MenuItem value="">— Select Team —</MenuItem>
                        {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Service Engineer" value={form.seUserId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), seUserId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select SE —</MenuItem>
                        {(() => {
                          const team = teams.find((t) => t.id === form.teamId)
                          const filteredSEs = team ? seUsers.filter((u) => u.id === team.seUserId) : seUsers
                          return filteredSEs.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                        })()}
                      </TextField>
                      <TextField
                        select size="small" label="Bay" value={form.bayId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), bayId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select Bay —</MenuItem>
                        {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Start Time" type="datetime-local" value={form.startLocal}
                        onChange={(e) => {
                          const startVal = e.target.value
                          const updates: Partial<typeof form> = { startLocal: startVal }
                          const mins = typeof s.processTimeMins === 'number' ? s.processTimeMins : 0
                          if (startVal && mins > 0) {
                            const d = new Date(startVal)
                            d.setMinutes(d.getMinutes() + mins)
                            updates.endLocal = d.toISOString().slice(0, 16)
                          }
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), ...updates } }))
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" color="error" size="large" onClick={() => submitQCReworkAssignment()} sx={{ fontWeight: 900 }}>
                Reassign Failed Services for Rework
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Status info ── */}
        {appt.status === 'SA Inspection' && (
          <Alert severity="info">SA is performing vehicle inspection.</Alert>
        )}
        {appt.status === 'SA Reviewed' && (
          <Alert severity="info">SA reviewed — awaiting customer communication.</Alert>
        )}
        {appt.status === 'Customer Notified' && (
          <Alert severity="warning">Customer notified — waiting for approval.</Alert>
        )}
        {appt.status === 'Customer Rejected' && (
          <Alert severity="error">Customer rejected. SA may re-negotiate.</Alert>
        )}
        {appt.status === 'Diagnosis Assigned' && (
          <Alert severity="info">SE assigned for diagnosis — waiting for technicians.</Alert>
        )}
        {appt.status === 'Diagnosis In Progress' && (
          <Alert severity="info">Diagnosis in progress — technicians working.</Alert>
        )}
        {appt.status === 'Diagnosis Complete' && (
          <Alert severity="success">Diagnosis complete — SA reviewing services.</Alert>
        )}
        {appt.status === 'Service Approval Pending' && (
          <Alert severity="warning">Service approval sent to customer.</Alert>
        )}
        {appt.status === 'Service Assigned' && (
          <Alert severity="info">SE assigned for services — waiting for technicians.</Alert>
        )}
        {appt.status === 'Service In Progress' && (
          <Alert severity="info">Services in progress — technicians working.</Alert>
        )}
        {appt.status === 'Service Complete' && (
          <Alert severity="success">Services complete — SA assigning QC for verification.</Alert>
        )}
        {appt.status === 'QC Assigned' && (
          <Alert severity="info">QC inspector assigned — verifying work quality.</Alert>
        )}
        {appt.status === 'QC Approved' && (
          <Alert severity="success">QC approved — SA handling payment.</Alert>
        )}
        {appt.status === 'Payment Pending' && (
          <Alert severity="warning">Payment pending.</Alert>
        )}
        {appt.status === 'Payment Done' && (
          <Alert severity="success">Payment done — gate pass issued.</Alert>
        )}
        {appt.status === 'Released' && (
          <Alert severity="success">Vehicle released.</Alert>
        )}
      </Stack>

      {/* ── Relocate Dialog ── */}
      <Dialog open={relocateDialog.open} onClose={() => setRelocateDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: 'primary.main' }}>
          Relocate: {relocateDialog.itemName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reassign bay, SE, or time for this {relocateDialog.itemType} item.
          </Typography>
          <Stack spacing={2}>
            <TextField
              select size="small" label="Bay" fullWidth
              value={relocateDialog.bayId}
              onChange={(e) => setRelocateDialog((d) => ({ ...d, bayId: e.target.value }))}
            >
              <MenuItem value="">— Select Bay —</MenuItem>
              {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Service Engineer" fullWidth
              value={relocateDialog.seUserId}
              onChange={(e) => setRelocateDialog((d) => ({ ...d, seUserId: e.target.value }))}
            >
              <MenuItem value="">— Select SE —</MenuItem>
              {seUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
            </TextField>
            <TextField
              size="small" label="Start" type="datetime-local" fullWidth
              value={relocateDialog.startLocal}
              onChange={(e) => setRelocateDialog((d) => ({ ...d, startLocal: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small" label="End" type="datetime-local" fullWidth
              value={relocateDialog.endLocal}
              onChange={(e) => setRelocateDialog((d) => ({ ...d, endLocal: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRelocateDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={!relocateDialog.bayId || !relocateDialog.seUserId} onClick={() => {
            const d = relocateDialog
            const startIso = d.startLocal ? new Date(d.startLocal).toISOString() : ''
            const endIso = d.endLocal ? new Date(d.endLocal).toISOString() : startIso
            if (d.itemType === 'concern') {
              assignConcernDiagnosis({
                appointmentId: appt.id,
                concernItemId: d.itemId,
                seUserId: d.seUserId,
                bayId: d.bayId,
                startAt: startIso,
                endAt: endIso,
              })
            } else {
              assignServiceSE({
                appointmentId: appt.id,
                serviceItemId: d.itemId,
                seUserId: d.seUserId,
                bayId: d.bayId,
                startAt: startIso,
                endAt: endIso,
              })
            }
            pushTimeline(appt.id, {
              actor: 'JC',
              action: `Relocated ${d.itemType} "${d.itemName}" to bay ${bayNameById.get(d.bayId) ?? d.bayId}`,
            })
            setRelocateDialog((prev) => ({ ...prev, open: false }))
          }}>
            Relocate
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
