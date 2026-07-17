import {
  Alert,
  Box,
  Button,
  Chip,

  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Assignment, CalendarMonth } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import type { CWAppointmentStatus, CWTask, CWTaskStatus, CWTaskTemplate } from '../../types/cw'
import { tasksService } from '../../services/tasks/tasksService'

function statusChip(status: CWTaskStatus) {
  const sx = { fontWeight: 700, fontSize: '0.72rem' }
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" sx={sx} />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" sx={sx} />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" sx={sx} />
  return <Chip size="small" color="success" label="Completed" sx={sx} />
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

const statusColorMap: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
  'SA Inspection': 'primary',
  'SA Reviewed': 'warning',
  'Customer Notified': 'warning',
  'Customer Approved': 'success',
  'Service In Progress': 'primary',
}

export function TasksHome() {
  const user = useSessionStore((s) => s.user)
  useBackendData()
  const navigate = useNavigate()

  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const templates = useCwStore((s) => s.taskTemplates)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const isSA = user?.roles.includes('Service Advisor') ?? false

  // SA appointments (show all with SA assignment at appointment level)
  const SA_ACTIVE: CWAppointmentStatus[] = ['SA Inspection', 'SA Reviewed', 'Customer Notified', 'Customer Approved', 'Customer Rejected', 'Diagnosis Assigned', 'Diagnosis In Progress', 'Diagnosis Complete', 'Service Approval Pending', 'Service Approved', 'Service Assigned', 'Service In Progress', 'Service Complete', 'Payment Pending', 'Payment Done']
  const saAppointments = useMemo(() => {
    if (!isSA) return []
    return appointments.filter((a) => {
      if (!SA_ACTIVE.includes(a.status as CWAppointmentStatus)) return false
      return !!a.assignedSAUserId
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              My Tasks
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Assigned tasks and execution forms.</Typography>
          </Box>
        </Stack>

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : null}

        {/* ── Stat cards ── */}
        {user && myTasks.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <StatCard
              icon={<Assignment fontSize="small" />}
              title="TOTAL"
              value={myTasks.length}
              gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
            />
            <StatCard
              icon={<Assignment fontSize="small" />}
              title="IN PROGRESS"
              value={byStatus['In Progress'].length}
              gradient="linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"
            />
            <StatCard
              icon={<Assignment fontSize="small" />}
              title="ASSIGNED"
              value={byStatus.Assigned.length}
              gradient="linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)"
            />
            <StatCard
              icon={<Assignment fontSize="small" />}
              title="COMPLETED"
              value={byStatus.Completed.length}
              gradient="linear-gradient(135deg, #065f46 0%, #10b981 100%)"
            />
          </Stack>
        )}

        {/* ── SA Appointments ── */}
        {isSA && (
          <Box sx={tableSectionSx}>
            <Box sx={tableHeaderSx}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={tableHeaderIconSx}><CalendarMonth sx={{ fontSize: '1rem' }} /></Box>
                <Typography sx={tableHeaderTitleSx}>Appointments</Typography>
                <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>{saAppointments.length}</Box>
              </Stack>
            </Box>
            {saAppointments.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No active appointments assigned to you.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Slot</TableCell>
                    <TableCell>Services</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saAppointments.map((appt) => {
                    const v = vehicles.find((x) => x.id === appt.vehicleId)
                    const c = customers.find((x) => x.id === appt.customerId)
                    return (
                      <TableRow
                        key={appt.id}
                        hover
                        sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx }}
                        onClick={() => navigate(`/sa/appointments/${appt.id}`)}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: colors.slate[900] }}>
                            {v?.registrationNo ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[900] }}>{c?.fullName ?? '—'}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{c?.phone ?? ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[900] }}>{appt.slotDate ?? '—'}</Typography>
                          {appt.slotTime && (
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{appt.slotTime}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[900] }}>{appt.serviceItems.length} service{appt.serviceItems.length !== 1 ? 's' : ''}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{appt.concernItems.length} concern{appt.concernItems.length !== 1 ? 's' : ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={appt.status}
                            size="small"
                            color={statusColorMap[appt.status] ?? 'default'}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* ── Create task (MVP) ── */}
        <SectionCard title="Create a Task (MVP)" icon={<Add sx={{ fontSize: '1rem' }} />}>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem', mb: 1.5 }}>
            Job Creation flow comes later. This simple action helps you test Task Templates and form execution UI.
          </Typography>
          {!availableTemplates.length ? (
            <Box>
              <Button
                variant="contained"
                component={RouterLink}
                to="/admin/task-templates"
                sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
              >
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
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
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
                sx={{ flexShrink: 0, bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
              >
                Create
              </Button>
            </Stack>
          )}
        </SectionCard>

        {/* ── Task list ── */}
        {!user ? (
          <SectionCard title="Sign In Required" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>Sign in to view your tasks.</Typography>
          </SectionCard>
        ) : !myTasks.length ? (
          <SectionCard title="No Tasks Assigned" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.slate[900], mb: 0.5 }}>No tasks assigned</Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
              In the full system, tasks are created by Job Creation and assigned to users.
            </Typography>
          </SectionCard>
        ) : (
          <Stack spacing={2.5}>
            {(['Assigned', 'In Progress', 'Pending', 'Completed'] as CWTaskStatus[]).map((status) => {
              const group = byStatus[status]
              if (!group.length) return null
              return (
                <Box key={status} sx={tableSectionSx}>
                  <Box sx={tableHeaderSx}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box sx={tableHeaderIconSx}><Assignment sx={{ fontSize: '1rem' }} /></Box>
                      <Typography sx={tableHeaderTitleSx}>{groupTitle(status)}</Typography>
                      <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>{group.length}</Box>
                    </Stack>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                        <TableCell>Task</TableCell>
                        <TableCell>Shop</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.map((t) => (
                        <TableRow
                          key={t.id}
                          hover
                          sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx }}
                          onClick={() => navigate(`/tasks/${t.id}`)}
                        >
                          <TableCell>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: colors.slate[900] }}>{t.title}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                              Template: {t.templateName}
                            </Typography>
                            {t.plannedEndAt ? (
                              <Typography sx={{ fontSize: '0.75rem', display: 'block', color: isOverdue(t) ? colors.status.error : colors.slate[500] }}>
                                Planned end: {new Date(t.plannedEndAt).toLocaleString()}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>{shopName(t.shopId)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              {statusChip(t.status)}
                              {isOverdue(t) ? <Chip size="small" color="error" label="Overdue" sx={{ fontWeight: 700, fontSize: '0.72rem' }} /> : null}
                              {isBlocked(t, tasksById) ? <Chip size="small" color="warning" label="Blocked" sx={{ fontWeight: 700, fontSize: '0.72rem' }} /> : null}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                              {new Date(t.updatedAt).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
