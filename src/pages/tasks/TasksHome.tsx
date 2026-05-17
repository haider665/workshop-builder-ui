import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus, CWTask, CWTaskStatus, CWTaskTemplate } from '../../types/cw'
import { tasksService } from '../../services/tasks/tasksService'

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
  return <Chip size="small" color="success" label="Completed" />
}

function groupTitle(status: CWTaskStatus) {
  if (status === 'Assigned') return 'Assigned'
  if (status === 'In Progress') return 'In Progress'
  if (status === 'Pending') return 'Pending'
  return 'Completed'
}

function sortTasks(tasks: CWTask[]) {
  return tasks.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function isOverdue(t: CWTask) {
  if (t.status === 'Completed') return false
  if (!t.plannedEndAt) return false
  return Date.parse(t.plannedEndAt) < Date.now()
}

function isBlocked(t: CWTask, tasksById: Map<string, CWTask>) {
  if (t.dependencyOverrideReason) return false
  const deps = t.dependsOnTaskIds ?? []
  if (!deps.length) return false
  return deps.some((id) => {
    const dep = tasksById.get(id)
    if (!dep) return false
    return dep.status !== 'Completed'
  })
}

function activeTemplates(templates: CWTaskTemplate[]) {
  return templates
    .filter((t) => t.status === 'Active')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function TasksHome() {
  const user = useSessionStore((s) => s.user)
  const navigate = useNavigate()

  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const templates = useCwStore((s) => s.taskTemplates)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const isSA = user?.roles.includes('Service Advisor') ?? false

  // SA appointments (no user filtering — show all with SA assignments)
  const SA_ACTIVE: CWAppointmentStatus[] = ['Diagnosis In Progress', 'Diagnosis Complete', 'Customer Notified', 'Customer Approved', 'Customer Rejected', 'JC Assigning Services', 'Service In Progress', 'Closed']
  const saAppointments = useMemo(() => {
    if (!isSA) return []
    return appointments.filter((a) => {
      if (!SA_ACTIVE.includes(a.status as CWAppointmentStatus)) return false
      return a.concernItems.some((c) => c.assignedSAUserId) ||
        a.serviceItems.some((s) => s.assignedSAUserId)
    })
  }, [appointments, isSA])

  const [templateId, setTemplateId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const myTasks = useMemo(() => {
    if (!user) return []
    return tasks.filter((t) => {
      if (t.assignedToName === user.name) return true
      return (t.assignedToNames ?? []).includes(user.name)
    })
  }, [tasks, user])

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks])

  const byStatus = useMemo(() => {
    const groups: Record<CWTaskStatus, CWTask[]> = {
      Assigned: [],
      'In Progress': [],
      Pending: [],
      Completed: [],
    }
    for (const t of myTasks) groups[t.status].push(t)
    return {
      Assigned: sortTasks(groups.Assigned),
      'In Progress': sortTasks(groups['In Progress']),
      Pending: sortTasks(groups.Pending),
      Completed: sortTasks(groups.Completed),
    }
  }, [myTasks])

  const availableTemplates = useMemo(() => activeTemplates(templates), [templates])

  function shopName(shopId: string) {
    return shops.find((s) => s.id === shopId)?.name ?? '—'
  }

  function createTaskFromTemplate() {
    if (!user) return
    if (!templateId) return
    try {
      setError(null)
      const created = tasksService.createFromTemplate({
        templateId,
        assignedToName: user.name,
      })
      navigate(`/tasks/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page title="My Tasks" subtitle="Assigned tasks and execution forms.">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {/* ── SA Appointments ── */}
      {isSA && (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Appointments</Typography>
            <Chip size="small" label={`${saAppointments.length}`} color={saAppointments.length > 0 ? 'info' : 'default'} />
          </Stack>
          <Divider />
          {saAppointments.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="body2">No active appointments assigned to you.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Slot</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Services</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {saAppointments.map((appt) => {
                  const v = vehicles.find((x) => x.id === appt.vehicleId)
                  const c = customers.find((x) => x.id === appt.customerId)
                  const statusColorMap: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
                    'Diagnosis In Progress': 'primary',
                    'Diagnosis Complete': 'warning',
                    'Customer Notified': 'warning',
                    'Customer Approved': 'success',
                    'Service In Progress': 'primary',
                  }
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/sa/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {v?.registrationNo ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c?.fullName ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{c?.phone ?? ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{appt.slotDate ?? '—'}</Typography>
                        {appt.slotTime && (
                          <Typography variant="caption" color="text.secondary">{appt.slotTime}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{appt.serviceItems.length} service{appt.serviceItems.length !== 1 ? 's' : ''}</Typography>
                        <Typography variant="caption" color="text.secondary">{appt.concernItems.length} concern{appt.concernItems.length !== 1 ? 's' : ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          size="small"
                          color={statusColorMap[appt.status] ?? 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Create a task (MVP)
          </Typography>
          <Typography color="text.secondary">
            Job Creation flow comes later. This simple action helps you test Task Templates and form execution UI.
          </Typography>
          {!availableTemplates.length ? (
            <Box>
              <Button variant="contained" component={RouterLink} to="/admin/task-templates">
                Create a Task Template first
              </Button>
            </Box>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                label="Task template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                select
                fullWidth
              >
                {availableTemplates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={<Add />}
                disabled={!user || !templateId}
                onClick={createTaskFromTemplate}
                sx={{ flexShrink: 0 }}
              >
                Create
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {!user ? (
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">Sign in to view your tasks.</Typography>
        </Paper>
      ) : !myTasks.length ? (
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>No tasks assigned</Typography>
            <Typography color="text.secondary">
              In the full system, tasks are created by Job Creation and assigned to users.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {(['Assigned', 'In Progress', 'Pending', 'Completed'] as CWTaskStatus[]).map((status) => {
            const group = byStatus[status]
            if (!group.length) return null
            return (
              <Paper key={status} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    {groupTitle(status)}
                  </Typography>
                  <Chip size="small" label={`${group.length}`} />
                </Stack>
                <Divider />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.map((t) => (
                      <TableRow
                        key={t.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/tasks/${t.id}`)}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 800 }}>{t.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Template: {t.templateName}
                          </Typography>
                          {t.plannedEndAt ? (
                            <Typography variant="caption" color={isOverdue(t) ? 'error.main' : 'text.secondary'} sx={{ display: 'block' }}>
                              Planned end: {new Date(t.plannedEndAt).toLocaleString()}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>{shopName(t.shopId)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {statusChip(t.status)}
                            {isOverdue(t) ? <Chip size="small" color="error" label="Overdue" /> : null}
                            {isBlocked(t, tasksById) ? <Chip size="small" color="warning" label="Blocked" /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(t.updatedAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )
          })}
        </Stack>
      )}
    </Page>
  )
}
