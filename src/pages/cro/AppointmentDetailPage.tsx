import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepConnector,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  CheckCircle,
  Delete,
  Done,
  ExpandLess,
  ExpandMore,
  PauseCircle,
  PendingActions,
  PlayArrow,
  RadioButtonUnchecked,
  Send,
  WhatsApp,
} from '@mui/icons-material'
import { Fragment, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FieldRenderer } from '../../components/FieldRenderer'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { useSessionStore } from '../../store/sessionStore'
import { tasksService } from '../../services/tasks/tasksService'
import type { CWConcern, CWService, CWTaskField, CWTaskFieldValue, CWTaskStatus } from '../../types/cw'

function sortTaskFields(fields: CWTaskField[]) {
  return fields.slice().sort((a, b) => a.order - b.order)
}

function validateTaskRequired(fields: CWTaskField[], values: Record<string, CWTaskFieldValue>) {
  const missing: string[] = []
  for (const f of fields) {
    if (!f.required) continue
    const v = values[f.id]
    const ok =
      v !== null &&
      v !== undefined &&
      (typeof v === 'boolean' || typeof v === 'number' || (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0))
    if (!ok) missing.push(f.label)
  }
  return missing
}

function taskStatusChip(status: CWTaskStatus) {
  const map: Record<CWTaskStatus, { label: string; color: 'default' | 'info' | 'primary' | 'warning' | 'success' }> = {
    Assigned: { label: 'Assigned', color: 'info' },
    'In Progress': { label: 'In Progress', color: 'primary' },
    Pending: { label: 'Pending', color: 'warning' },
    Completed: { label: 'Completed', color: 'success' },
  }
  const { label, color } = map[status] ?? { label: status, color: 'default' }
  return <Chip size="small" label={label} color={color} />
}

function toIso(local: string) {
  if (!local) return ''
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function overlaps(as: number, ae: number, bs: number, be: number) {
  return as < be && bs < ae
}

const CYCLE_STAGES = [
  'Appointment Created',
  'Assigned SA',
  'SA Reviewed',
  'Customer Notified',
  'Customer Approved',
  'Service Processing',
  'Closed',
]

function stageIndex(status: string): number {
  const map: Record<string, number> = {
    Draft: 0,
    Confirmed: 0,
    'SA Review': 1,
    'SA Reviewed': 2,
    'Customer Notified': 3,
    'Customer Approved': 4,
    'Customer Rejected': 3,
    'Service Processing': 5,
    Closed: 6,
  }
  return map[status] ?? 0
}

function statusColor(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    Draft: 'default',
    Confirmed: 'primary',
    'SA Review': 'info',
    'SA Reviewed': 'info',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Service Processing': 'primary',
    Closed: 'success',
  }
  return map[status] ?? 'default'
}

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const services = useCwStore((s) => s.services)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const addAppointmentConcern = useCwStore((s) => s.addAppointmentConcern)
  const removeAppointmentConcern = useCwStore((s) => s.removeAppointmentConcern)
  const addAppointmentService = useCwStore((s) => s.addAppointmentService)
  const removeAppointmentService = useCwStore((s) => s.removeAppointmentService)
  const concerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)
  const activeConcerns = useMemo(() => concerns.filter((c) => c.status === 'Active'), [concerns])
  const catById = useMemo(() => new Map(concernCategories.map((c) => [c.id, c])), [concernCategories])
  const addWhatsappLog = useCwStore((s) => s.addWhatsappLog)
  const setCustomerApproval = useCwStore((s) => s.setCustomerApproval)
  const updateServiceItemAssignment = useCwStore((s) => s.updateServiceItemAssignment)

  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const taskTemplates = useCwStore((s) => s.taskTemplates)
  const tasks = useCwStore((s) => s.tasks)
  const taskFieldValues = useCwStore((s) => s.taskFieldValues)
  const createTaskFromTemplate = useCwStore((s) => s.createTaskFromTemplate)
  const addSATaskToAppointment = useCwStore((s) => s.addSATaskToAppointment)

  const appt = useMemo(() => appointments.find((a) => a.id === appointmentId), [appointments, appointmentId])

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) ?? null : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) ?? null : null), [customers, appt])
  const saUser = useMemo(() => (appt?.assignedServiceAdvisorId ? users.find((u) => u.id === appt.assignedServiceAdvisorId) ?? null : null), [users, appt])


  const sessionUser = useSessionStore((s) => s.user)
  const isSA = useMemo(() => sessionUser?.roles.some((r) => r === 'Service Advisor') ?? false, [sessionUser])

  const activeServices = useMemo(() => services.filter((s) => s.status === 'Active'), [services])

  // Task builder helpers
  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const activeRoles = useMemo(() => roles.filter((r) => r.status === 'Active'), [roles])
  // SA task builder form state
  const [taskShopId, setTaskShopId] = useState('')
  const [taskTemplateId, setTaskTemplateId] = useState('')
  const [taskStartLocal, setTaskStartLocal] = useState('')
  const [taskEndLocal, setTaskEndLocal] = useState('')
  const [taskRoleIds, setTaskRoleIds] = useState<string[]>([])
  const [taskBayId, setTaskBayId] = useState('')
  const [taskUserIds, setTaskUserIds] = useState<string[]>([])
  const [taskError, setTaskError] = useState<string | null>(null)
  const activeTemplatesForShop = useMemo(
    () => taskTemplates.filter((t) => t.status === 'Active' && (taskShopId ? t.shopId === taskShopId : true)),
    [taskTemplates, taskShopId],
  )
  const baysByShop = useMemo(() => {
    const map = new Map<string, typeof bays>()
    for (const b of bays) {
      if (b.status === 'Inactive') continue
      const arr = map.get(b.shopId) ?? []
      arr.push(b)
      map.set(b.shopId, arr)
    }
    return map
  }, [bays])
  const roleNameById = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles])
  const templateById = useMemo(() => new Map(taskTemplates.map((t) => [t.id, t])), [taskTemplates])
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.fullName])), [users])
  const saTaskObjects = useMemo(
    () => (appt ? (appt.saTaskIds ?? []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks : []),
    [tasks, appt],
  )

  // Available users for the inline add form
  const addFormAvailableUsers = useMemo(() => {
    const startIso = toIso(taskStartLocal)
    const endIso = toIso(taskEndLocal)
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    const windowValid = Number.isFinite(start) && Number.isFinite(end) && end > start
    const busyNames = new Set<string>()
    if (windowValid) {
      for (const t of tasks) {
        if (t.status === 'Completed' || !t.plannedStartAt || !t.plannedEndAt) continue
        const ts = Date.parse(t.plannedStartAt), te = Date.parse(t.plannedEndAt)
        if (!overlaps(start, end, ts, te)) continue
        const assignees = t.assignedToNames?.length ? t.assignedToNames : [t.assignedToName]
        for (const n of assignees) busyNames.add(n)
      }
    }
    return users
      .filter((u) => u.status === 'Active')
      .filter((u) => (taskRoleIds.length ? taskRoleIds.some((rid) => u.roleIds.includes(rid)) : true))
      .filter((u) => (taskShopId && u.shopIds.length ? u.shopIds.includes(taskShopId) : true))
      .map((u) => ({ ...u, busy: busyNames.has(u.fullName) }))
      .sort((a, b) => Number(a.busy) - Number(b.busy) || a.fullName.localeCompare(b.fullName))
  }, [tasks, users, taskStartLocal, taskEndLocal, taskRoleIds, taskShopId])

  function addDraftTask() {
    if (!appt) return
    if (!taskShopId || !taskTemplateId) return
    if (!taskStartLocal || !taskEndLocal) { setTaskError('Set start and end time.'); return }
    if (taskUserIds.length === 0) { setTaskError('Assign at least one person.'); return }
    const startIso = toIso(taskStartLocal)
    const endIso = toIso(taskEndLocal)
    if (Date.parse(endIso) <= Date.parse(startIso)) { setTaskError('End must be after start.'); return }
    const tpl = templateById.get(taskTemplateId)
    if (!tpl) { setTaskError('Template not found.'); return }
    setTaskError(null)
    const primaryName = users.find((u) => u.id === taskUserIds[0])!.fullName
    const allNames = taskUserIds.map((id) => users.find((u) => u.id === id)!.fullName)
    const task = createTaskFromTemplate({
      templateId: taskTemplateId,
      assignedToName: primaryName,
      assignedToNames: allNames,
      assignedRoleId: taskRoleIds.length === 1 ? taskRoleIds[0] : undefined,
      bayId: taskBayId || undefined,
      plannedStartAt: startIso,
      plannedEndAt: endIso,
      title: tpl.name,
    })
    addSATaskToAppointment(appt.id, task.id)
    // Reset form except shop
    setTaskTemplateId('')
    setTaskStartLocal('')
    setTaskEndLocal('')
    setTaskRoleIds([])
    setTaskBayId('')
    setTaskUserIds([])
  }

  // SA existing task inline editing
  const [selectedExistingTaskId, setSelectedExistingTaskId] = useState<string | null>(null)

  // SA add concern
  const [selConcern, setSelConcern] = useState<CWConcern | null>(null)
  const [concernRemark, setConcernRemark] = useState('')

  // SA add service
  const [selService, setSelService] = useState<CWService | null>(null)
  const [serviceRemark, setServiceRemark] = useState('')

  // SA reassign

  // Per-service form state for Service Process panel (keyed by serviceItemId)
  const [svcForm, setSvcForm] = useState<Record<string, { userIds: string[]; startLocal: string; endLocal: string }>>({})

  // WhatsApp compose
  const [waDialogOpen, setWaDialogOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')

  // Customer approval note
  const [approvalNote, setApprovalNote] = useState('')

  const [error] = useState<string | null>(null)

  if (!appt) {
    return (
      <Page title="Appointment not found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const currentStage = stageIndex(appt.status)
  const totalBDT = appt.serviceItems.reduce((s, i) => s + i.price, 0)

  function addSAConcern() {
    if (!selConcern) return
    addAppointmentConcern({
      appointmentId: appt!.id,
      concernId: selConcern.id,
      concernName: selConcern.name,
      remark: concernRemark.trim(),
    })
    setSelConcern(null)
    setConcernRemark('')
  }

  function addSAService() {
    if (!selService) return
    addAppointmentService({
      appointmentId: appt!.id,
      serviceId: selService.id,
      serviceCode: selService.code,
      serviceDescription: selService.description,
      timeHrs: selService.timeHrs,
      ratePerHr: selService.ratePerHr,
      price: selService.price,
      remark: serviceRemark.trim(),
      addedBySA: true,
    })
    setSelService(null)
    setServiceRemark('')
  }

  function sendWhatsapp() {
    if (!waMessage.trim()) return
    addWhatsappLog({
      appointmentId: appt!.id,
      message: waMessage.trim(),
      authorName: sessionUser?.name ?? 'CRO',
      direction: 'outbound',
    })
    setAppointmentStatus(appt!.id, 'Customer Notified')
    setWaDialogOpen(false)
    setWaMessage('')
  }

  function handleApproval(decision: 'Approved' | 'Rejected') {
    setCustomerApproval({
      appointmentId: appt!.id,
      status: decision,
      note: approvalNote.trim() || undefined,
    })
    setAppointmentStatus(appt!.id, decision === 'Approved' ? 'Customer Approved' : 'Customer Rejected')
  }

  function sendToSAReview() {
    setAppointmentStatus(appt!.id, 'SA Review')
  }

  function saveServiceAssignment(svcId: string) {
    const f = svcForm[svcId]
    if (!f || !f.userIds.length || !f.startLocal || !f.endLocal) return
    updateServiceItemAssignment({
      appointmentId: appt!.id,
      serviceItemId: svcId,
      assignedUserIds: f.userIds,
      plannedStartAt: toIso(f.startLocal),
      plannedEndAt: toIso(f.endLocal),
      workStatus: 'Pending',
    })
  }

  return (
    <Page
      title={`Appointment · ${vehicle?.registrationNo ?? '—'}`}
      subtitle={`${customer?.fullName ?? '—'} · Created ${fmtDateTime(appt.createdAt)}`}
      actions={
        <Chip label={appt.status} color={statusColor(appt.status)} sx={{ fontWeight: 700 }} />
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Cycle tracker ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 3, overflow: 'auto' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Workshop Cycle</Typography>
          <Stepper
            activeStep={currentStage}
            connector={<StepConnector />}
            sx={{ overflowX: 'auto', pb: 1 }}
          >
            {CYCLE_STAGES.map((label, idx) => (
              <Step key={label} completed={idx < currentStage}>
                <StepLabel
                  slots={{ stepIcon: () => {
                    if (idx < currentStage) return <CheckCircle sx={{ color: 'success.main', fontSize: 22 }} />
                    if (idx === currentStage) return <PendingActions sx={{ color: 'primary.main', fontSize: 22 }} />
                    return <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 22 }} />
                  }}}
                >
                  <Typography variant="caption" sx={{ fontWeight: idx === currentStage ? 800 : 400 }}>
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Workflow buttons */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {appt.status === 'Draft' && (
              <Button variant="outlined" size="small" onClick={sendToSAReview}>
                Send to SA Review
              </Button>
            )}
            {appt.status === 'SA Reviewed' && !isSA && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<WhatsApp />}
                onClick={() => setWaDialogOpen(true)}
              >
                Notify Customer
              </Button>
            )}
            {appt.status === 'Customer Approved' && !isSA && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => setAppointmentStatus(appt.id, 'Service Processing')}
              >
                Start Service Processing
              </Button>
            )}
          </Box>
        </Paper>

        {/* ── Vehicle & Customer ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Vehicle & Customer</Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Registration', value: vehicle?.registrationNo },
              { label: 'Make', value: vehicle?.make },
              { label: 'Model', value: vehicle?.model },
              { label: 'VIN', value: vehicle?.vin },
              { label: 'Customer', value: customer?.fullName },
              { label: 'Phone', value: customer?.phone },
              { label: 'Email', value: customer?.email },
              { label: 'Slot Date', value: appt.slotDate },
              { label: 'Slot Time', value: appt.slotTime },
              { label: 'Service Advisor', value: saUser?.fullName },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{value ?? '—'}</Typography>
              </Box>
            ))}
          </Box>
          {appt.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Note</Typography>
              <Typography variant="body2">{appt.notes}</Typography>
            </Box>
          )}
        </Paper>

        {/* ── Concerns ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Concerns</Typography>
          {appt.concernItems.length > 0 ? (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>SI</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                  {['SA Review', 'Customer Notified'].includes(appt.status) && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.concernItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ color: 'text.secondary' }}>#{idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.concernName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{item.remark || '—'}</Typography>
                    </TableCell>
                    {['SA Review', 'Customer Notified'].includes(appt.status) && (
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeAppointmentConcern(appt.id, item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No concerns listed.</Typography>
          )}

          {/* SA can add concerns during SA Review or Customer Notified */}
          {['SA Review', 'Customer Notified'].includes(appt.status) && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Add concern (SA)</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: 'flex-start' }}>
                <Autocomplete
                  size="small"
                  options={activeConcerns}
                  groupBy={(o) => catById.get(o.categoryId)?.name ?? 'Other'}
                  getOptionLabel={(o) => o.name}
                  value={selConcern}
                  onChange={(_, val) => setSelConcern(val)}
                  sx={{ flex: '2 1 280px' }}
                  renderInput={(params) => <TextField {...params} label="Concern" />}
                />
                <TextField
                  size="small"
                  label="Remark"
                  value={concernRemark}
                  onChange={(e) => setConcernRemark(e.target.value)}
                  sx={{ flex: '2 1 200px' }}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={addSAConcern}
                  disabled={!selConcern}
                  sx={{ height: 40 }}
                >
                  Add
                </Button>
              </Box>
            </>
          )}
        </Paper>

        {/* ── Service Items ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Service Requests</Typography>
            <Chip label={`Total: ${fmtBDT(totalBDT)}`} color="primary" sx={{ fontWeight: 700 }} />
          </Box>

          {appt.serviceItems.length > 0 ? (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>SI</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Price (BDT)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>By</TableCell>
                  {['SA Review', 'Customer Notified'].includes(appt.status) && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ color: 'text.secondary' }}>#{idx + 1}</TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.serviceDescription}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {item.serviceCode}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{item.remark || '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">{item.timeHrs}h</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>{item.price.toLocaleString('en-BD')}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.addedBySA ? (
                        <Chip label="SA" size="small" color="info" />
                      ) : (
                        <Chip label="CRO" size="small" />
                      )}
                    </TableCell>
                    {['SA Review', 'Customer Notified'].includes(appt.status) && (
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeAppointmentService(appt.id, item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'right', fontWeight: 800, border: 'none' }}>
                    Total Labour Estimate
                  </TableCell>
                  <TableCell align="right" sx={{ border: 'none' }}>
                    <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>
                      {totalBDT.toLocaleString('en-BD')}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={2} sx={{ border: 'none' }} />
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No services added yet.
            </Typography>
          )}

          {/* SA can add services during SA Review or Customer Notified */}
          {['SA Review', 'Customer Notified'].includes(appt.status) && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Add service (SA)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: 'flex-start' }}>
                <Autocomplete
                  size="small"
                  options={activeServices}
                  groupBy={(o) => o.category}
                  getOptionLabel={(o) => `${o.code} – ${o.description}`}
                  value={selService}
                  onChange={(_, val) => setSelService(val)}
                  sx={{ flex: '2 1 280px' }}
                  renderInput={(params) => <TextField {...params} label="Service" />}
                />
                <TextField
                  size="small"
                  label="Remark"
                  value={serviceRemark}
                  onChange={(e) => setServiceRemark(e.target.value)}
                  sx={{ flex: '2 1 200px' }}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={addSAService}
                  disabled={!selService}
                  sx={{ height: 40 }}
                >
                  Add
                </Button>
              </Box>
            </>
          )}
        </Paper>

        {/* ── SA Tasks ── */}
        {isSA && (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Tasks</Typography>

          {/* Existing SA tasks */}
          {saTaskObjects.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Assigned To</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Time Window</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saTaskObjects.map((t) => {
                    const isExpanded = selectedExistingTaskId === t.id
                    const fieldVals = taskFieldValues[t.id] ?? {}
                    const orderedFields = sortTaskFields(t.fields)
                    const missing = validateTaskRequired(orderedFields, fieldVals)
                    const canStart = t.status === 'Assigned'
                    const canMarkInProgress = t.status === 'In Progress'
                    const canComplete = t.status === 'In Progress' && missing.length === 0
                    const canResume = t.status === 'Pending'
                    return (
                      <Fragment key={t.id}>
                        <TableRow
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedExistingTaskId(isExpanded ? null : t.id)}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{t.templateName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {(t.assignedToNames?.length ? t.assignedToNames : [t.assignedToName]).join(', ')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                              {' → '}
                              {t.plannedEndAt ? new Date(t.plannedEndAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{taskStatusChip(t.status)}</TableCell>
                          <TableCell sx={{ width: 32, p: 0.5 }}>
                            <IconButton size="small">
                              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${t.id}-detail`}>
                            <TableCell colSpan={5} sx={{ p: 0, bgcolor: 'action.hover' }}>
                              <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>Fill task fields on behalf of technician</Typography>
                                  {(canStart || canResume) && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="primary"
                                      startIcon={<PlayArrow />}
                                      onClick={(e) => { e.stopPropagation(); tasksService.setStatus(t.id, { status: 'In Progress' }) }}
                                    >
                                      Start
                                    </Button>
                                  )}
                                  {canMarkInProgress && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      startIcon={<PauseCircle />}
                                      onClick={(e) => { e.stopPropagation(); tasksService.setStatus(t.id, { status: 'Pending' }) }}
                                    >
                                      Mark Pending
                                    </Button>
                                  )}
                                  {canComplete && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      startIcon={<Done />}
                                      onClick={(e) => { e.stopPropagation(); tasksService.setStatus(t.id, { status: 'Completed' }) }}
                                    >
                                      Complete
                                    </Button>
                                  )}
                                  {t.status === 'In Progress' && missing.length > 0 && (
                                    <Typography variant="caption" color="error">Fill required: {missing.join(', ')}</Typography>
                                  )}
                                </Box>
                                {orderedFields.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">No fields for this template.</Typography>
                                ) : (
                                  <Stack spacing={1.5}>
                                    {orderedFields.map((f) => (
                                      <Box key={f.id}>
                                        <FieldRenderer
                                          field={f}
                                          value={fieldVals[f.id] ?? null}
                                          onChange={(val: CWTaskFieldValue) => tasksService.setFieldValue(t.id, f.id, val)}
                                        />
                                      </Box>
                                    ))}
                                  </Stack>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Finish SA Work: notify customer once all tasks complete */}
              {isSA && saTaskObjects.every((t) => t.status === 'Completed') && appt.status === 'SA Review' && (
                <Box sx={{ mt: 1.5 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<Send />}
                    onClick={() => setAppointmentStatus(appt.id, 'SA Reviewed')}
                  >
                    All Tasks Done — Notify CRO
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {saTaskObjects.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No tasks assigned yet.</Typography>
          )}

          {taskError && <Alert severity="error" sx={{ mb: 2 }}>{taskError}</Alert>}

          {/* Add task form — all fields inline */}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>Add Task</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <TextField
              select
              size="small"
              label="Shop"
              value={taskShopId}
              onChange={(e) => { setTaskShopId(e.target.value); setTaskTemplateId(''); setTaskBayId(''); setTaskUserIds([]) }}
            >
              <MenuItem value="">— Select shop —</MenuItem>
              {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField
              select
              size="small"
              label="Task Template"
              value={taskTemplateId}
              onChange={(e) => setTaskTemplateId(e.target.value)}
              disabled={!taskShopId}
            >
              <MenuItem value="">— Select template —</MenuItem>
              {activeTemplatesForShop.filter((t) => t.shopId === taskShopId).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Start Time"
              type="datetime-local"
              value={taskStartLocal}
              onChange={(e) => { setTaskStartLocal(e.target.value); setTaskUserIds([]) }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="End Time"
              type="datetime-local"
              value={taskEndLocal}
              onChange={(e) => { setTaskEndLocal(e.target.value); setTaskUserIds([]) }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              size="small"
              label="Role Filter (optional)"
              value={taskRoleIds}
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value as unknown
                const ids = Array.isArray(v) ? (v as string[]) : [String(v)]
                setTaskRoleIds(ids.filter(Boolean))
                setTaskUserIds([])
              }}
              slotProps={{ select: { multiple: true, renderValue: (s) => (s as string[]).map((id) => roleNameById.get(id)).filter(Boolean).join(', ') || '—' } }}
            >
              {activeRoles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Checkbox checked={taskRoleIds.includes(r.id)} size="small" />
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Bay (optional)"
              value={taskBayId}
              onChange={(e) => setTaskBayId(e.target.value)}
              disabled={!taskShopId}
            >
              <MenuItem value="">— None —</MenuItem>
              {(baysByShop.get(taskShopId) ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField
              select
              size="small"
              label="Assign People"
              value={taskUserIds}
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value as unknown
                const ids = Array.isArray(v) ? (v as string[]) : [String(v)]
                setTaskUserIds(ids.filter(Boolean))
              }}
              helperText={taskStartLocal && taskEndLocal ? 'Filtered by availability & role.' : 'Set times to filter availability.'}
              slotProps={{ select: { multiple: true, renderValue: (s) => (s as string[]).map((id) => userNameById.get(id)).filter(Boolean).join(', ') || '—' } }}
              sx={{ gridColumn: { sm: 'span 2' } }}
            >
              {addFormAvailableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={taskUserIds.includes(u.id)} size="small" />
                  <Box>
                    <Typography variant="body2" sx={{ color: u.busy ? 'text.disabled' : 'text.primary' }}>{u.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {u.roleIds.map((rid) => roleNameById.get(rid)).filter(Boolean).join(', ') || '—'}
                      {u.busy ? ' · Busy' : ''}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              {addFormAvailableUsers.length === 0 && <MenuItem value="" disabled>No matching users</MenuItem>}
            </TextField>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addDraftTask}
              disabled={!taskShopId || !taskTemplateId}
            >
              Add Task
            </Button>
          </Box>
        </Paper>
        )}

        {/* ── SA Assignment ── */}
        {!isSA && (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Service Advisor</Typography>
          <Typography variant="body2">
            {saUser ? `${saUser.fullName} (${saUser.mobile ?? '—'})` : 'Not assigned'}
          </Typography>
        </Paper>
        )}

        {/* ── WhatsApp Log ── */}
        {!isSA && (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>WhatsApp Communication</Typography>
            <Button
              variant="outlined"
              size="small"
              color="success"
              startIcon={<WhatsApp />}
              onClick={() => {
                const parts = []
                parts.push(`*Appointment Summary*`)
                if (customer) parts.push(`Customer: ${customer.fullName}`)
                if (vehicle) parts.push(`Vehicle: ${vehicle.registrationNo} - ${vehicle.make ?? ''} ${vehicle.model ?? ''}`)
                parts.push(`\n*Services Requested:*`)
                appt.serviceItems.forEach((s, i) => {
                  parts.push(`${i + 1}. ${s.serviceDescription} — BDT ${s.price.toLocaleString('en-BD')}`)
                })
                parts.push(`\n*Total Estimate: ${fmtBDT(totalBDT)}*`)
                parts.push(`\nPlease confirm your approval.`)
                setWaMessage(parts.join('\n'))
                setWaDialogOpen(true)
              }}
            >
              Compose
            </Button>
          </Box>

          {appt.whatsappLogs.length > 0 ? (
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
                    <TableCell>
                      <Typography variant="caption">{fmtDateTime(log.sentAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.direction}
                        size="small"
                        color={log.direction === 'outbound' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{log.authorName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {log.message}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No messages sent yet.
            </Typography>
          )}

          {/* ── Customer Approval (inside WA section) ── */}
          {['Customer Notified', 'Customer Approved', 'Customer Rejected'].includes(appt.status) && (
            <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 900, mb: 2 }}>Customer Approval</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 2 }}>
                <Typography variant="body2">Status:</Typography>
                <Chip
                  label={appt.customerApprovalStatus}
                  color={
                    appt.customerApprovalStatus === 'Approved'
                      ? 'success'
                      : appt.customerApprovalStatus === 'Rejected'
                      ? 'error'
                      : 'default'
                  }
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              {appt.customerApprovalStatus === 'Pending' && (
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Note (optional)"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    sx={{ maxWidth: 400 }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="success" onClick={() => handleApproval('Approved')}>
                      Mark Approved
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleApproval('Rejected')}>
                      Mark Rejected
                    </Button>
                  </Stack>
                </Stack>
              )}

              {appt.customerApprovalStatus !== 'Pending' && appt.customerApprovalNote && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Note</Typography>
                  <Typography variant="body2">{appt.customerApprovalNote}</Typography>
                </Box>
              )}

              {appt.customerApprovalStatus === 'Approved' && appt.status === 'Customer Approved' && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', mb: 1 }}>
                    ✓ Customer approved — click "Start Service Processing" above to proceed
                  </Typography>
                </Box>
              )}

              {appt.customerApprovalStatus === 'Rejected' && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark', mb: 1 }}>
                    Customer rejected — revise and send back to SA for review
                  </Typography>
                  <Button variant="outlined" color="warning" size="small" onClick={() => setAppointmentStatus(appt.id, 'SA Review')}>
                    Send Back to SA Review
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
        )}

        {/* ── Service Process ── */}
        {isSA && ['Service Processing', 'Closed'].includes(appt.status) && appt.serviceItems.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Service Process</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign technicians + time to each service and track progress.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {appt.serviceItems.map((svc) => {
                const hasAssignment = svc.assignedUserIds && svc.assignedUserIds.length > 0
                const form = svcForm[svc.id] ?? { userIds: [], startLocal: '', endLocal: '' }
                const workStatusColor =
                  svc.workStatus === 'Completed' ? 'success' :
                  svc.workStatus === 'In Progress' ? 'primary' :
                  svc.workStatus === 'Pending' ? 'warning' : 'default'

                return (
                  <Box key={svc.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{svc.serviceDescription}</Typography>
                        <Typography variant="caption" color="text.secondary">{svc.serviceCode} · {fmtBDT(svc.price)}</Typography>
                        {svc.remark && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({svc.remark})</Typography>}
                      </Box>
                      {hasAssignment && svc.workStatus && (
                        <Chip
                          label={svc.workStatus}
                          color={workStatusColor as 'success' | 'primary' | 'warning' | 'default'}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    {!hasAssignment ? (
                      // Assignment form
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Assign Technicians</InputLabel>
                          <Select
                            label="Assign Technicians"
                            multiple
                            value={form.userIds}
                            onChange={(e) => {
                              const v = e.target.value as string[]
                              setSvcForm((p) => ({ ...p, [svc.id]: { ...form, userIds: v } }))
                            }}
                            renderValue={(sel) => (sel as string[]).map((id) => userNameById.get(id)).filter(Boolean).join(', ')}
                          >
                            {users.filter((u) => u.status === 'Active').map((u) => (
                              <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          label="Start Time"
                          type="datetime-local"
                          value={form.startLocal}
                          onChange={(e) => setSvcForm((p) => ({ ...p, [svc.id]: { ...form, startLocal: e.target.value } }))}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          size="small"
                          label="End Time"
                          type="datetime-local"
                          value={form.endLocal}
                          onChange={(e) => setSvcForm((p) => ({ ...p, [svc.id]: { ...form, endLocal: e.target.value } }))}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={!form.userIds.length || !form.startLocal || !form.endLocal}
                            onClick={() => saveServiceAssignment(svc.id)}
                          >
                            Save Assignment
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      // Assignment summary + status buttons
                      <Box>
                        <Typography variant="caption" color="text.secondary">Assigned to:</Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {(svc.assignedUserIds ?? []).map((id) => userNameById.get(id)).filter(Boolean).join(', ')}
                        </Typography>
                        {svc.plannedStartAt && svc.plannedEndAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            {new Date(svc.plannedStartAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {' → '}
                            {new Date(svc.plannedEndAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {svc.workStatus !== 'In Progress' && svc.workStatus !== 'Completed' && (
                            <Button size="small" variant="outlined" color="primary"
                              onClick={() => updateServiceItemAssignment({ appointmentId: appt.id, serviceItemId: svc.id, workStatus: 'In Progress' })}
                            >
                              Mark In Progress
                            </Button>
                          )}
                          {svc.workStatus === 'In Progress' && (
                            <>
                              <Button size="small" variant="outlined" color="warning"
                                onClick={() => updateServiceItemAssignment({ appointmentId: appt.id, serviceItemId: svc.id, workStatus: 'Pending' })}
                              >
                                Mark Pending
                              </Button>
                              <Button size="small" variant="contained" color="success"
                                onClick={() => updateServiceItemAssignment({ appointmentId: appt.id, serviceItemId: svc.id, workStatus: 'Completed' })}
                              >
                                Mark Completed
                              </Button>
                            </>
                          )}
                          {svc.workStatus === 'Completed' && (
                            <Chip label="✓ Completed" color="success" size="small" sx={{ fontWeight: 700 }} />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>

            {/* Close Appointment when all done */}
            {appt.status === 'Service Processing' && appt.serviceItems.every((s) => s.workStatus === 'Completed') && (
              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="success.dark" sx={{ fontWeight: 700, mb: 1 }}>
                  ✓ All services completed — ready to close.
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setAppointmentStatus(appt.id, 'Closed')}
                >
                  Close Appointment
                </Button>
              </Box>
            )}

            {appt.status === 'Closed' && (
              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Chip label="✓ Appointment Closed" color="success" sx={{ fontWeight: 700 }} />
              </Box>
            )}
          </Paper>
        )}
      </Stack>

      {/* WhatsApp compose dialog */}
      <Dialog open={waDialogOpen} onClose={() => setWaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
            <WhatsApp color="success" />
            <Typography sx={{ fontWeight: 700 }}>Send WhatsApp Message</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {customer?.phone && (
              <Typography variant="body2" color="text.secondary">
                To: {customer.phone} ({customer.fullName})
              </Typography>
            )}
            <TextField
              label="Message"
              multiline
              minRows={6}
              fullWidth
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Send />}
            onClick={sendWhatsapp}
            disabled={!waMessage.trim()}
          >
            Log &amp; Send
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
