import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  ArrowDownward,
  ArrowUpward,
  Assignment,
  DirectionsCar,
  Info,
  ListAlt,
} from '@mui/icons-material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii, pageLayout } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import type { CWJobStatus, CWTaskStatus } from '../../types/cw'

function toIsoFromLocal(value: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="success" label="Completed" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

function jobStatusChip(status: CWJobStatus) {
  if (status === 'Active') return <Chip color="info" label="Active" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'Test Drive Approved') return <Chip color="warning" label="Test Drive Approved" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip color="success" label="Job Finished" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

export function JobDetailsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const jobs = useCwStore((s) => s.jobs)
  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const roles = useCwStore((s) => s.roles)
  const appointments = useCwStore((s) => s.appointments)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const setJobStatus = useCwStore((s) => s.setJobStatus)
  const setJobTestDrive = useCwStore((s) => s.setJobTestDrive)
  const moveJobTask = useCwStore((s) => s.moveJobTask)
  const setTaskDependencyOverride = useCwStore((s) => s.setTaskDependencyOverride)
  const setTaskSourceConcern = useCwStore((s) => s.setTaskSourceConcern)

  const [error, setError] = useState<string | null>(null)
  const [overrideOpenForTaskId, setOverrideOpenForTaskId] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const [testDriveOpen, setTestDriveOpen] = useState(false)
  const [testDriveDriverName, setTestDriveDriverName] = useState('')
  const [testDriveDriverNid, setTestDriveDriverNid] = useState('')
  const [testDriveExpectedReturnLocal, setTestDriveExpectedReturnLocal] = useState('')

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId])

  const linkedAppointment = useMemo(() => {
    if (!job) return undefined
    if (job.appointmentId) return appointments.find((a) => a.id === job.appointmentId)

    const pending = job.pendingVehicleId
      ? pendingVehicles.find((p) => p.id === job.pendingVehicleId)
      : undefined
    const apptId = pending?.appointmentId
    return apptId ? appointments.find((a) => a.id === apptId) : undefined
  }, [appointments, job, pendingVehicles])



  const jobTasks = useMemo(() => {
    if (!job) return []
    const byId = new Map(tasks.map((t) => [t.id, t] as const))
    return job.taskIds
      .map((id) => byId.get(id))
      .filter((t): t is (typeof tasks)[number] => Boolean(t))
  }, [job, tasks])

  const tasksById = useMemo(() => {
    const map = new Map<string, (typeof tasks)[number]>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  function dependencyBlockers(task: (typeof tasks)[number]) {
    if (task.dependencyOverrideReason) return []
    const deps = task.dependsOnTaskIds ?? []
    if (!deps.length) return []
    const blockers: (typeof tasks)[number][] = []
    for (const id of deps) {
      const dep = tasksById.get(id)
      if (!dep) continue
      if (dep.status !== 'Completed') blockers.push(dep)
    }
    return blockers
  }

  function summarizeBlockers(blockers: (typeof tasks)[number][]) {
    if (!blockers.length) return ''
    const parts = blockers.map((b) => `${b.title} (${b.status})`)
    if (parts.length <= 2) return parts.join(', ')
    return `${parts.slice(0, 2).join(', ')} +${parts.length - 2} more`
  }

  function openOverride(taskId: string) {
    setOverrideOpenForTaskId(taskId)
    setOverrideReason('')
  }

  function submitOverride() {
    if (!overrideOpenForTaskId) return
    try {
      setError(null)
      const reason = overrideReason.trim()
      if (!reason) throw new Error('Override reason is required')
      setTaskDependencyOverride(overrideOpenForTaskId, reason)
      setOverrideOpenForTaskId(null)
      setOverrideReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function clearOverride(taskId: string) {
    try {
      setError(null)
      setTaskDependencyOverride(taskId, null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const shopNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shops) map.set(s.id, s.name)
    return map
  }, [shops])

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roles) map.set(r.id, r.name)
    return map
  }, [roles])

  function shopNames(shopIds: string[]) {
    return shopIds
      .map((id) => shops.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  function updateStatus(next: CWJobStatus) {
    if (!job) return
    try {
      setError(null)
      if (next === 'Test Drive Approved') {
        setTestDriveDriverName(job.testDriveDriverName ?? '')
        setTestDriveDriverNid(job.testDriveDriverNid ?? '')
        setTestDriveExpectedReturnLocal(
          job.testDriveExpectedReturnAt ? new Date(job.testDriveExpectedReturnAt).toISOString().slice(0, 16) : '',
        )
        setTestDriveOpen(true)
        return
      }
      setJobStatus(job.id, next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitTestDrive() {
    if (!job) return
    try {
      setError(null)
      const expectedReturnAt = testDriveExpectedReturnLocal ? toIsoFromLocal(testDriveExpectedReturnLocal) : undefined
      setJobTestDrive(job.id, {
        driverName: testDriveDriverName,
        driverNid: testDriveDriverNid,
        expectedReturnAt,
      })
      setTestDriveOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!jobId) {
    return (
      <Box sx={{ ...pageLayout, py: pageLayout.py, px: pageLayout.px }}>
        <Alert severity="error">Missing job id.</Alert>
      </Box>
    )
  }

  if (!job) {
    return (
      <Box sx={{ ...pageLayout, py: pageLayout.py, px: pageLayout.px }}>
        <Alert severity="warning">Job not found.</Alert>
      </Box>
    )
  }

  const completedCount = jobTasks.filter((t) => t.status === 'Completed').length
  const inProgressCount = jobTasks.filter((t) => t.status === 'In Progress').length
  const blockedCount = jobTasks.filter((t) => dependencyBlockers(t).length > 0).length

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/jc/jobs')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                Job {job.registrationNo}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Job overview and linked tasks.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {jobStatusChip(job.status)}
            <Button component={RouterLink} to="/jc/pending-vehicles" variant="contained" sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}>
              Pending Vehicles
            </Button>
          </Stack>
        </Stack>

        {/* ── Error ── */}
        {error ? (
          <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert>
        ) : null}

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<ListAlt fontSize="small" />} title="Total Tasks" value={jobTasks.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<Assignment fontSize="small" />} title="Completed" value={completedCount} gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)" />
          <StatCard icon={<Info fontSize="small" />} title="In Progress" value={inProgressCount} gradient="linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" />
          {blockedCount > 0 && (
            <StatCard icon={<Info fontSize="small" />} title="Blocked" value={blockedCount} gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" />
          )}
        </Stack>

        {/* ── Job Info Section ── */}
        <SectionCard title="Job Details" icon={<Info sx={{ fontSize: '1rem' }} />} actions={
          <ButtonGroup variant="outlined" size="small">
            <Button disabled={job.status === 'Active'} onClick={() => updateStatus('Active')} sx={{ borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
              Set Active
            </Button>
            <Button disabled={job.status === 'Test Drive Approved'} onClick={() => updateStatus('Test Drive Approved')} sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Test Drive Approved
            </Button>
            <Button disabled={job.status === 'Job Finished'} onClick={() => updateStatus('Job Finished')} sx={{ borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
              Job Finished
            </Button>
          </ButtonGroup>
        }>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Shops</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{shopNames(job.shopIds) || '—'}</Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Created</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{new Date(job.createdAt).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25 }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Status</Typography>
            <Box sx={{ flex: 1 }}>{jobStatusChip(job.status)}</Box>
          </Stack>
        </SectionCard>

        {/* ── Linked Appointment ── */}
        {linkedAppointment ? (
          <SectionCard title="Linked Appointment" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
            <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
              <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Status</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>
                {linkedAppointment.status}
                {linkedAppointment.scheduledAt ? ` • Scheduled: ${new Date(linkedAppointment.scheduledAt).toLocaleString()}` : ''}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', py: 1.25 }}>
              <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Items</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>
                Concerns: {linkedAppointment.concernItems.length} • Services: {linkedAppointment.serviceItems.length}
              </Typography>
            </Stack>
          </SectionCard>
        ) : null}

        {/* ── Concerns Table ── */}
        {linkedAppointment && linkedAppointment.concernItems.length > 0 && (
          <Box sx={tableSectionSx}>
            <Box sx={tableHeaderSx}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={tableHeaderIconSx}><Assignment sx={{ fontSize: '1rem' }} /></Box>
                <Typography sx={tableHeaderTitleSx}>Job Card — Concerns</Typography>
                <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                  {linkedAppointment.concernItems.length}
                </Box>
              </Stack>
            </Box>
            <Typography sx={{ px: 3, pt: 1.5, pb: 1, fontSize: '0.8rem', color: colors.slate[500] }}>
              Concerns captured at diagnosis. Decompose into tasks and link each task to its source concern below.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>#</TableCell>
                  <TableCell>Concern</TableCell>
                  <TableCell>Remark</TableCell>
                  <TableCell>Tasks linked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {linkedAppointment.concernItems.map((c, idx) => {
                  const linkedTasks = jobTasks.filter((t) => t.sourceConcernId === c.id)
                  return (
                    <TableRow key={c.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: colors.slate[400] }}>#{idx + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate[900] }}>{c.concernName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{c.remark || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {linkedTasks.length > 0 ? (
                          <Stack spacing={0.5}>
                            {linkedTasks.map((t) => (
                              <Chip key={t.id} size="small" label={t.title} color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                            ))}
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>None yet</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ── Tasks Table ── */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><ListAlt sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>Tasks</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {jobTasks.length}
              </Box>
            </Stack>
          </Box>
          <Typography sx={{ px: 3, pt: 1.5, pb: 1, fontSize: '0.8rem', color: colors.slate[500] }}>
            Tasks created from templates. Use Source Concern to link each task back to the job card.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                <TableCell>Task</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Blocked</TableCell>
                <TableCell>Shop</TableCell>
                <TableCell>Bay</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Planned</TableCell>
                {linkedAppointment && linkedAppointment.concernItems.length > 0 && <TableCell>Source Concern</TableCell>}
                <TableCell align="right">Order</TableCell>
                <TableCell align="right">Open</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobTasks.map((t, idx) => {
                const assignees = t.assignedToNames?.length ? t.assignedToNames : [t.assignedToName]
                const blockers = dependencyBlockers(t)
                const blocked = blockers.length > 0
                return (
                  <TableRow key={t.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.slate[900] }}>{t.title}</Typography>
                    </TableCell>
                    <TableCell>{statusChip(t.status)}</TableCell>
                    <TableCell>
                      {blocked ? (
                        <Stack spacing={0.75}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                            <Chip size="small" color="warning" label="Blocked" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                            <Button size="small" variant="outlined" onClick={() => openOverride(t.id)} sx={{ borderRadius: radii.sm, fontSize: '0.75rem' }}>
                              Override
                            </Button>
                          </Stack>
                          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                            By: {summarizeBlockers(blockers)}
                          </Typography>
                        </Stack>
                      ) : t.dependencyOverrideReason ? (
                        <Stack spacing={0.75}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                            <Chip size="small" color="info" label="Override" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                            <Button size="small" variant="outlined" onClick={() => clearOverride(t.id)} sx={{ borderRadius: radii.sm, fontSize: '0.75rem' }}>
                              Clear
                            </Button>
                          </Stack>
                          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                            Reason: {t.dependencyOverrideReason}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400] }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{shopNameById.get(t.shopId) ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{t.bayId ? bayNameById.get(t.bayId) ?? '—' : '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{t.assignedRoleId ? roleNameById.get(t.assignedRoleId) ?? '—' : '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{assignees.join(', ')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                        {t.plannedStartAt && t.plannedEndAt
                          ? `${new Date(t.plannedStartAt).toLocaleString()} → ${new Date(t.plannedEndAt).toLocaleTimeString()}`
                          : '—'}
                      </Typography>
                    </TableCell>
                    {linkedAppointment && linkedAppointment.concernItems.length > 0 && (
                      <TableCell sx={{ minWidth: 160 }}>
                        <Select
                          size="small"
                          displayEmpty
                          value={t.sourceConcernId ?? ''}
                          onChange={(e) => setTaskSourceConcern(t.id, e.target.value || null)}
                          sx={{ fontSize: '0.75rem', minWidth: 140, borderRadius: radii.sm }}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {linkedAppointment.concernItems.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.concernName}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ArrowUpward />}
                          disabled={idx === 0}
                          onClick={() => moveJobTask(job.id, t.id, 'up')}
                          sx={{ borderRadius: radii.sm, fontSize: '0.75rem' }}
                        >
                          Up
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ArrowDownward />}
                          disabled={idx === jobTasks.length - 1}
                          onClick={() => moveJobTask(job.id, t.id, 'down')}
                          sx={{ borderRadius: radii.sm, fontSize: '0.75rem' }}
                        >
                          Down
                        </Button>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to={`/tasks/${t.id}`}
                        size="small"
                        variant="contained"
                        sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2, '&:hover': { bgcolor: colors.slate[800] }, fontSize: '0.75rem' }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {jobTasks.length ? null : (
                <TableRow>
                  <TableCell colSpan={linkedAppointment && linkedAppointment.concernItems.length > 0 ? 10 : 9}>
                    <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                      No tasks linked.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* ── Override Dialog ── */}
        <Dialog open={!!overrideOpenForTaskId} onClose={() => setOverrideOpenForTaskId(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: colors.slate[900] }}>Override dependency block</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 2 }}>
              This allows the task to proceed even if its dependencies are incomplete.
            </Typography>
            <TextField
              label="Reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOverrideOpenForTaskId(null)} variant="outlined" sx={{ borderRadius: '10px' }}>
              Cancel
            </Button>
            <Button onClick={submitOverride} variant="contained" sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}>
              Apply Override
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Test Drive Dialog ── */}
        <Dialog open={testDriveOpen} onClose={() => setTestDriveOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: colors.slate[900] }}>Approve test drive</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 2 }}>
              Required for Guard exit check.
            </Typography>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Driver full name"
                value={testDriveDriverName}
                onChange={(e) => setTestDriveDriverName(e.target.value)}
                fullWidth
                autoFocus
                required
              />
              <TextField
                label="Driver NID"
                value={testDriveDriverNid}
                onChange={(e) => setTestDriveDriverNid(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Expected return"
                type="datetime-local"
                value={testDriveExpectedReturnLocal}
                onChange={(e) => setTestDriveExpectedReturnLocal(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTestDriveOpen(false)} sx={{ borderRadius: '10px' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={submitTestDrive}
              disabled={!testDriveDriverName.trim() || !testDriveDriverNid.trim()}
              sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
