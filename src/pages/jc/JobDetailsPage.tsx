import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Paper,
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
import { ArrowDownward, ArrowUpward } from '@mui/icons-material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWJobStatus, CWTaskStatus } from '../../types/cw'

function toIsoFromLocal(value: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
  return <Chip size="small" color="success" label="Completed" />
}

function jobStatusChip(status: CWJobStatus) {
  if (status === 'Active') return <Chip color="info" label="Active" />
  if (status === 'Test Drive Approved') return <Chip color="warning" label="Test Drive Approved" />
  return <Chip color="success" label="Job Finished" />
}

export function JobDetailsPage() {
  const { jobId } = useParams()

  const jobs = useCwStore((s) => s.jobs)
  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const roles = useCwStore((s) => s.roles)
  const setJobStatus = useCwStore((s) => s.setJobStatus)
  const setJobTestDrive = useCwStore((s) => s.setJobTestDrive)
  const moveJobTask = useCwStore((s) => s.moveJobTask)
  const setTaskDependencyOverride = useCwStore((s) => s.setTaskDependencyOverride)

  const [error, setError] = useState<string | null>(null)
  const [overrideOpenForTaskId, setOverrideOpenForTaskId] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const [testDriveOpen, setTestDriveOpen] = useState(false)
  const [testDriveDriverName, setTestDriveDriverName] = useState('')
  const [testDriveDriverNid, setTestDriveDriverNid] = useState('')
  const [testDriveExpectedReturnLocal, setTestDriveExpectedReturnLocal] = useState('')

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId])

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
      <Page title="Job" subtitle="Invalid job.">
        <Alert severity="error">Missing job id.</Alert>
      </Page>
    )
  }

  if (!job) {
    return (
      <Page title={`Job ${jobId}`} subtitle="Not found.">
        <Alert severity="warning">Job not found.</Alert>
      </Page>
    )
  }

  return (
    <Page title={`Job ${job.registrationNo}`} subtitle="Job overview and linked tasks.">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <Typography sx={{ fontWeight: 900 }}>Status</Typography>
            {jobStatusChip(job.status)}
            <Box sx={{ flexGrow: 1 }} />
            <Button component={RouterLink} to="/jc/pending-vehicles" variant="outlined">
              Pending Vehicles
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Shops: {shopNames(job.shopIds) || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Created: {new Date(job.createdAt).toLocaleString()}
          </Typography>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Typography sx={{ fontWeight: 900 }}>Job actions</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ButtonGroup variant="outlined" size="small">
              <Button disabled={job.status === 'Active'} onClick={() => updateStatus('Active')}>
                Set Active
              </Button>
              <Button
                disabled={job.status === 'Test Drive Approved'}
                onClick={() => updateStatus('Test Drive Approved')}
              >
                Test Drive Approved
              </Button>
              <Button disabled={job.status === 'Job Finished'} onClick={() => updateStatus('Job Finished')}>
                Job Finished
              </Button>
            </ButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Tasks</Typography>
          <Typography variant="body2" color="text.secondary">
            Tasks created from templates.
          </Typography>
        </Box>
        <Divider />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Task</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Blocked</TableCell>
              <TableCell>Shop</TableCell>
              <TableCell>Bay</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Planned</TableCell>
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
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontWeight: 800 }}>{t.title}</TableCell>
                  <TableCell>{statusChip(t.status)}</TableCell>
                  <TableCell>
                    {blocked ? (
                      <Stack spacing={0.75}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                          <Chip size="small" color="warning" label="Blocked" />
                          <Button size="small" variant="outlined" onClick={() => openOverride(t.id)}>
                            Override
                          </Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          By: {summarizeBlockers(blockers)}
                        </Typography>
                      </Stack>
                    ) : t.dependencyOverrideReason ? (
                      <Stack spacing={0.75}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                          <Chip size="small" color="info" label="Override" />
                          <Button size="small" variant="outlined" onClick={() => clearOverride(t.id)}>
                            Clear
                          </Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Reason: {t.dependencyOverrideReason}
                        </Typography>
                      </Stack>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{shopNameById.get(t.shopId) ?? '—'}</TableCell>
                  <TableCell>{t.bayId ? bayNameById.get(t.bayId) ?? '—' : '—'}</TableCell>
                  <TableCell>{t.assignedRoleId ? roleNameById.get(t.assignedRoleId) ?? '—' : '—'}</TableCell>
                  <TableCell>{assignees.join(', ')}</TableCell>
                  <TableCell>
                    {t.plannedStartAt && t.plannedEndAt
                      ? `${new Date(t.plannedStartAt).toLocaleString()} → ${new Date(t.plannedEndAt).toLocaleTimeString()}`
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowUpward />}
                        disabled={idx === 0}
                        onClick={() => moveJobTask(job.id, t.id, 'up')}
                      >
                        Up
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowDownward />}
                        disabled={idx === jobTasks.length - 1}
                        onClick={() => moveJobTask(job.id, t.id, 'down')}
                      >
                        Down
                      </Button>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button component={RouterLink} to={`/tasks/${t.id}`} size="small" variant="outlined">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {jobTasks.length ? null : (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks linked.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!overrideOpenForTaskId} onClose={() => setOverrideOpenForTaskId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Override dependency block</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          <Button onClick={() => setOverrideOpenForTaskId(null)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={submitOverride} variant="contained">
            Apply Override
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={testDriveOpen} onClose={() => setTestDriveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve test drive</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          <Button onClick={() => setTestDriveOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitTestDrive} disabled={!testDriveDriverName.trim() || !testDriveDriverNid.trim()}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
