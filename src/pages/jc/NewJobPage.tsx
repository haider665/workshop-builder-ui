import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, ArrowBack, ArrowDownward, ArrowUpward, Delete, DirectionsCar, Assignment, ListAlt } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { headerCellSx, bodyCellSx, tableSectionSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii, pageLayout } from '../../theme/tokens'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import type { CWTaskTemplate } from '../../types/cw'

function toIsoFromLocal(value: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

function hasValidTimeWindow(t: { startLocal: string; endLocal: string }) {
  const startIso = toIsoFromLocal(t.startLocal)
  const endIso = toIsoFromLocal(t.endLocal)
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  return Number.isFinite(start) && Number.isFinite(end) && end > start
}

type DraftJobTask = {
  key: string
  shopId: string
  templateId: string
  startLocal: string
  endLocal: string
  roleIds: string[]
  assignedUserIds: string[]
  bayId: string
  dependsOnKeys: string[]
}

/* ── Shared field sx ────────────────────────────────────── */
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: radii.sm,
    fontSize: '0.85rem',
    bgcolor: colors.bg.page,
  },
} as const

export function NewJobPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const templates = useCwStore((s) => s.taskTemplates)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const tasks = useCwStore((s) => s.tasks)

  const pendingVehicleId = params.get('pendingVehicleId') ?? undefined
  const appointmentIdParam = params.get('appointmentId') ?? undefined
  const pendingVehicle = pendingVehicleId
    ? pendingVehicles.find((p) => p.id === pendingVehicleId)
    : undefined

  const linkedAppointment = useMemo(() => {
    const id = appointmentIdParam ?? pendingVehicle?.appointmentId
    if (!id) return undefined
    return appointments.find((a) => a.id === id)
  }, [appointments, appointmentIdParam, pendingVehicle?.appointmentId])

  const appointmentVehicle = useMemo(() => {
    if (!linkedAppointment) return undefined
    return vehicles.find((v) => v.id === linkedAppointment.vehicleId)
  }, [linkedAppointment, vehicles])

  const initialRegistrationNo = pendingVehicle?.registrationNo ?? appointmentVehicle?.registrationNo ?? ''
  const [registrationNo, setRegistrationNo] = useState(initialRegistrationNo)
  const [shopId, setShopId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [draftTasks, setDraftTasks] = useState<DraftJobTask[]>([])
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])

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

  const activeTemplatesForShop = useMemo(() => {
    return templates
      .filter((t) => t.status === 'Active' && (shopId ? t.shopId === shopId : true))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [templates, shopId])

  const activeRoles = useMemo(() => roles.filter((r) => r.status === 'Active'), [roles])

  const shopNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shops) map.set(s.id, s.name)
    return map
  }, [shops])

  const templateById = useMemo(() => {
    const map = new Map<string, CWTaskTemplate>()
    for (const t of templates) map.set(t.id, t)
    return map
  }, [templates])

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roles) map.set(r.id, r.name)
    return map
  }, [roles])

  const roleNamesForUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      const names = (u.roleIds ?? [])
        .map((rid) => roleNameById.get(rid))
        .filter(Boolean) as string[]
      map.set(u.id, names.length ? names.join(', ') : '—')
    }
    return map
  }, [users, roleNameById])

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  // Legacy prefill removed — appointments no longer carry assignedRoleId/assignedUserIds
  const appointmentPrefillRoleId: string | undefined = undefined
  const appointmentPrefillUserIds: string[] = []
  const appointmentPrefillSummary: string | null = null

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  const selectedTask = useMemo(() => {
    if (!selectedTaskKey) return null
    return draftTasks.find((t) => t.key === selectedTaskKey) ?? null
  }, [draftTasks, selectedTaskKey])

  function updateDraftTask(key: string, next: Partial<DraftJobTask>) {
    setDraftTasks((prev) => prev.map((t) => (t.key === key ? { ...t, ...next } : t)))
  }

  function sanitizeDependsOn(next: DraftJobTask[]) {
    const indexByKey = new Map(next.map((t, idx) => [t.key, idx] as const))
    return next.map((t, idx) => {
      const cleaned = (t.dependsOnKeys ?? []).filter((k) => (indexByKey.get(k) ?? Number.POSITIVE_INFINITY) < idx)
      return cleaned.length === t.dependsOnKeys.length ? t : { ...t, dependsOnKeys: cleaned }
    })
  }

  function availableUsersForTask(task: DraftJobTask) {
    const startIso = toIsoFromLocal(task.startLocal)
    const endIso = toIsoFromLocal(task.endLocal)
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []

    const busyNames = new Set<string>()
    // Existing tasks in the system.
    for (const t of tasks) {
      if (t.status === 'Completed') continue
      if (!t.plannedStartAt || !t.plannedEndAt) continue
      const ts = Date.parse(t.plannedStartAt)
      const te = Date.parse(t.plannedEndAt)
      if (!Number.isFinite(ts) || !Number.isFinite(te)) continue
      if (!overlaps(start, end, ts, te)) continue
      const assignees = t.assignedToNames?.length ? t.assignedToNames : [t.assignedToName]
      for (const n of assignees) busyNames.add(n)
    }
    // Draft tasks being created right now (avoid double-booking).
    for (const dt of draftTasks) {
      if (dt.key === task.key) continue
      const dsIso = toIsoFromLocal(dt.startLocal)
      const deIso = toIsoFromLocal(dt.endLocal)
      const ds = Date.parse(dsIso)
      const de = Date.parse(deIso)
      if (!Number.isFinite(ds) || !Number.isFinite(de)) continue
      if (!overlaps(start, end, ds, de)) continue

      for (const uid of dt.assignedUserIds) {
        const u = users.find((x) => x.id === uid)
        if (u) busyNames.add(u.fullName)
      }
    }

    return users
      .filter((u) => u.status === 'Active')
      .filter((u) => (task.roleIds?.length ? task.roleIds.some((rid) => u.roleIds.includes(rid)) : true))
      .filter((u) => (u.shopIds.length ? u.shopIds.includes(task.shopId) : true))
      .filter((u) => !busyNames.has(u.fullName))
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }

  function candidateUsersForTask(task: DraftJobTask) {
    return users
      .filter((u) => u.status === 'Active')
      .filter((u) => (task.roleIds?.length ? task.roleIds.some((rid) => u.roleIds.includes(rid)) : true))
      .filter((u) => (u.shopIds.length ? u.shopIds.includes(task.shopId) : true))
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }

  function addTask() {
    const selectedTemplate = templates.find((t) => t.id === templateId)
    if (!selectedTemplate) return

    const key = crypto.randomUUID()
    const startLocal = ''
    const endLocal = ''

    const prefillRoleIds = appointmentPrefillRoleId ? [appointmentPrefillRoleId] : []
    const prefillAssignedUserIds = appointmentPrefillUserIds.filter((id) => {
      const u = users.find((x) => x.id === id)
      if (!u) return false
      if (u.shopIds.length && !u.shopIds.includes(selectedTemplate.shopId)) return false
      if (prefillRoleIds.length && !prefillRoleIds.some((rid) => u.roleIds.includes(rid))) return false
      return true
    })

    setDraftTasks((prev) =>
      sanitizeDependsOn([
        ...prev,
        {
          key,
          shopId: selectedTemplate.shopId,
          templateId: selectedTemplate.id,
          startLocal,
          endLocal,
          roleIds: prefillRoleIds,
          assignedUserIds: prefillAssignedUserIds,
          bayId: '',
          dependsOnKeys: [],
        },
      ]),
    )
    setSelectedTaskKey(key)
  }

  function removeTask(key: string) {
    setDraftTasks((prev) => {
      const remaining = prev.filter((t) => t.key !== key)
      const cleaned = remaining.map((t) => ({ ...t, dependsOnKeys: (t.dependsOnKeys ?? []).filter((k) => k !== key) }))
      return sanitizeDependsOn(cleaned)
    })
    setSelectedTaskKey((cur) => (cur === key ? null : cur))
  }

  function moveTask(key: string, direction: 'up' | 'down') {
    setDraftTasks((prev) => {
      const idx = prev.findIndex((t) => t.key === key)
      if (idx < 0) return prev
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[idx]!
      next[idx] = next[swapWith]!
      next[swapWith] = tmp
      return sanitizeDependsOn(next)
    })
  }

  async function submit() {
    try {
      setError(null)

      const tasksInput = draftTasks.map((t) => {
        const startIso = toIsoFromLocal(t.startLocal)
        const endIso = toIsoFromLocal(t.endLocal)
        if (!startIso || !endIso) throw new Error('Each task must have a valid start/end time')
        const start = Date.parse(startIso)
        const end = Date.parse(endIso)
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          throw new Error('Each task must have an end time after start time')
        }

        const available = availableUsersForTask(t)
        const availableIds = new Set(available.map((u) => u.id))
        const chosenIds = t.assignedUserIds.filter((id) => availableIds.has(id))
        const chosenNames = chosenIds
          .map((id) => users.find((u) => u.id === id)?.fullName)
          .filter(Boolean) as string[]
        if (!chosenNames.length) throw new Error('Each task must be assigned to at least one available user')

        const dependsOnTaskIndexes = t.dependsOnKeys
          .map((k) => draftTasks.findIndex((x) => x.key === k))
          .filter((i) => i >= 0)

        return {
          templateId: t.templateId,
          plannedStartAt: startIso,
          plannedEndAt: endIso,
          bayId: t.bayId || undefined,
          assignedRoleId: t.roleIds.length === 1 ? t.roleIds[0] : undefined,
          assignedToNames: chosenNames,
          dependsOnTaskIndexes,
        }
      })

      const job = await workshopApi.createJobWithTasks({
        registrationNo,
        pendingVehicleId,
        appointmentId: appointmentIdParam,
        tasks: tasksInput,
      })
      navigate(`/jc/jobs/${job.job.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* ── Header ─────────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/jc/pending-vehicles')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                Create Job
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                Create a job and generate tasks from templates.
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert>
        ) : null}

        {/* ── Vehicle Section ────────────────────────────────── */}
        <SectionCard title="Vehicle" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
              {pendingVehicleId ? 'Pre-filled from pending vehicles.' : appointmentIdParam ? 'Pre-filled from appointment.' : 'Enter registration number.'}
            </Typography>
            {appointmentPrefillSummary ? (
              <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
                From appointment: {appointmentPrefillSummary}
              </Typography>
            ) : null}

            <TextField
              label="Registration No"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              fullWidth
              size="small"
              disabled={!!pendingVehicleId || !!appointmentIdParam}
              sx={fieldSx}
            />
          </Stack>
        </SectionCard>

        {/* ── Build Job Tasks Section ────────────────────────── */}
        <SectionCard title="Build Job Tasks" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
              Select a shop to see its templates, then add tasks. A job can include tasks from multiple shops.
            </Typography>

            <TextField
              select
              label="Shop"
              fullWidth
              size="small"
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value)
                setTemplateId('')
              }}
              sx={fieldSx}
            >
              {activeShops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
              {activeShops.length ? null : (
                <MenuItem value="" disabled>
                  No active shops
                </MenuItem>
              )}
            </TextField>

            <TextField
              select
              label="Task Template"
              fullWidth
              size="small"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!shopId}
              sx={fieldSx}
            >
              {activeTemplatesForShop
                .filter((t) => t.shopId === shopId)
                .map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
            </TextField>

            <Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={addTask}
                disabled={!registrationNo.trim() || !shopId || !templateId}
                sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
              >
                Add Task
              </Button>
            </Box>
          </Stack>
        </SectionCard>

        {/* ── Task Plan Section ──────────────────────────────── */}
        <SectionCard title="Task Plan" icon={<ListAlt sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
              For each task: choose time window, role, available users, and bay.
            </Typography>

            {/* ─── Selected task editor ───────────────────────── */}
            <Box sx={{ borderRadius: radii.sm, border: `1px solid ${colors.border.default}`, p: 2.5, bgcolor: colors.bg.page }}>
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>Selected task</Typography>
                {selectedTask ? (
                  <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                      {templateById.get(selectedTask.templateId)?.name ?? '—'}
                    </Typography>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                      <TextField
                        size="small"
                        label="Start"
                        type="datetime-local"
                        value={selectedTask.startLocal}
                        onChange={(e) => updateDraftTask(selectedTask.key, { startLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ flex: 1, ...fieldSx }}
                      />
                      <TextField
                        size="small"
                        label="End"
                        type="datetime-local"
                        value={selectedTask.endLocal}
                        onChange={(e) => updateDraftTask(selectedTask.key, { endLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ flex: 1, ...fieldSx }}
                      />
                    </Stack>

                    {(() => {
                      const idx = draftTasks.findIndex((t) => t.key === selectedTask.key)
                      const previous = draftTasks.slice(0, idx).map((p) => {
                        const ptpl = templateById.get(p.templateId)
                        return { key: p.key, label: ptpl?.name ?? '—' }
                      })
                      const previousKeys = new Set(previous.map((p) => p.key))
                      const dependsOnKeys = (selectedTask.dependsOnKeys ?? []).filter((k) => previousKeys.has(k))

                      const windowValid = hasValidTimeWindow(selectedTask)
                      const baseUsers = windowValid ? availableUsersForTask(selectedTask) : candidateUsersForTask(selectedTask)
                      const baseIds = new Set(baseUsers.map((u) => u.id))

                      const selectedUsers = (selectedTask.assignedUserIds ?? [])
                        .map((id) => users.find((u) => u.id === id))
                        .filter((u): u is (typeof users)[number] => Boolean(u))

                      const mergedUsers = [...baseUsers]
                      for (const u of selectedUsers) {
                        if (!baseIds.has(u.id)) mergedUsers.push(u)
                      }
                      mergedUsers.sort((a, b) => a.fullName.localeCompare(b.fullName))

                      const mergedIds = new Set(mergedUsers.map((u) => u.id))
                      const selectedIds = (selectedTask.assignedUserIds ?? []).filter((id) => mergedIds.has(id))

                      const bayOptions = baysByShop.get(selectedTask.shopId) ?? []

                      return (
                        <Stack spacing={1.5}>
                          <TextField
                            select
                            size="small"
                            label="Dependencies"
                            value={dependsOnKeys}
                            onChange={(e) => {
                              const v = (e.target as HTMLInputElement).value as unknown
                              const keys = Array.isArray(v) ? (v as string[]) : String(v).split(',')
                              updateDraftTask(selectedTask.key, { dependsOnKeys: keys.filter((k) => previousKeys.has(k)) })
                            }}
                            fullWidth
                            disabled={idx <= 0}
                            sx={fieldSx}
                            slotProps={{
                              select: {
                                multiple: true,
                                renderValue: (selected) => {
                                  const keys = (selected as unknown as string[]) ?? []
                                  const labels = keys
                                    .map((k) => previous.find((p) => p.key === k)?.label)
                                    .filter(Boolean)
                                  return labels.length ? labels.join(', ') : '—'
                                },
                              },
                            }}
                          >
                            {previous.map((p) => (
                              <MenuItem key={p.key} value={p.key}>
                                <Checkbox checked={dependsOnKeys.includes(p.key)} />
                                <Typography>{p.label}</Typography>
                              </MenuItem>
                            ))}
                            {idx <= 0 ? (
                              <MenuItem value="" disabled>
                                First task cannot depend on others
                              </MenuItem>
                            ) : null}
                          </TextField>

                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField
                              select
                              size="small"
                              label="Role"
                              value={selectedTask.roleIds}
                              onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value as unknown
                                const ids = Array.isArray(v) ? (v as string[]) : String(v).split(',')
                                updateDraftTask(selectedTask.key, { roleIds: ids.filter(Boolean) })
                              }}
                              sx={{ flex: 1, ...fieldSx }}
                              slotProps={{
                                select: {
                                  multiple: true,
                                  renderValue: (selected) => {
                                    const ids = (selected as unknown as string[]) ?? []
                                    const names = ids.map((id) => roleNameById.get(id)).filter(Boolean)
                                    return names.length ? names.join(', ') : '—'
                                  },
                                },
                              }}
                            >
                              {activeRoles.map((r) => (
                                <MenuItem key={r.id} value={r.id}>
                                  <Checkbox checked={selectedTask.roleIds.includes(r.id)} />
                                  <Typography>{r.name}</Typography>
                                </MenuItem>
                              ))}
                            </TextField>

                            <TextField
                              select
                              size="small"
                              label="Bay"
                              value={selectedTask.bayId}
                              onChange={(e) => updateDraftTask(selectedTask.key, { bayId: e.target.value })}
                              sx={{ flex: 1, ...fieldSx }}
                            >
                              <MenuItem value="">—</MenuItem>
                              {bayOptions.map((b) => (
                                <MenuItem key={b.id} value={b.id}>
                                  {b.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Stack>

                          <TextField
                            select
                            size="small"
                            label="Users"
                            value={selectedIds}
                            onChange={(e) => {
                              const v = (e.target as HTMLInputElement).value as unknown
                              const ids = Array.isArray(v) ? (v as string[]) : String(v).split(',')
                              updateDraftTask(selectedTask.key, { assignedUserIds: ids })
                            }}
                            fullWidth
                            helperText={
                              windowValid
                              ? 'Availability filtered by time window (and selected roles if any).'
                              : 'Set start/end to filter availability. Showing candidates (role filtered if set).'
                            }
                            sx={fieldSx}
                            slotProps={{
                              select: {
                                multiple: true,
                                renderValue: (selected) => {
                                  const ids = (selected as unknown as string[]) ?? []
                                  const names = ids.map((id) => userNameById.get(id)).filter(Boolean)
                                  return names.length ? names.join(', ') : '—'
                                },
                              },
                            }}
                          >
                            {mergedUsers.map((u) => (
                              <MenuItem key={u.id} value={u.id}>
                                <Checkbox checked={selectedIds.includes(u.id)} />
                                <Box>
                                  <Typography>{u.fullName}</Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: colors.slate[500] }}>
                                    Roles: {roleNamesForUserId.get(u.id) ?? '—'}
                                    {windowValid && !baseIds.has(u.id) ? ' • Unavailable for selected time' : ''}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                            {mergedUsers.length ? null : (
                              <MenuItem value="" disabled>
                                No users match role/shop
                              </MenuItem>
                            )}
                          </TextField>
                        </Stack>
                      )
                    })()}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                    Select a task row to edit time, dependencies, role, users, and bay.
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* ─── Tasks table ────────────────────────────────── */}
            <Box sx={tableSectionSx}>
              <Box sx={tableHeaderSx}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={tableHeaderIconSx}><ListAlt sx={{ fontSize: '1rem' }} /></Box>
                  <Typography sx={tableHeaderTitleSx}>Tasks</Typography>
                  <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                    {draftTasks.length}
                  </Box>
                </Stack>
              </Box>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1200 }}>
                  <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                      <TableCell>Task</TableCell>
                      <TableCell>Time window</TableCell>
                      <TableCell>Depends on</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Users (available)</TableCell>
                      <TableCell>Bay</TableCell>
                      <TableCell align="right">Order</TableCell>
                      <TableCell align="right">Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {draftTasks.map((t, idx) => {
                      const tpl = templateById.get(t.templateId)
                      const shopName = shopNameById.get(t.shopId) ?? '—'
                      const timeLabel = t.startLocal && t.endLocal ? `${t.startLocal} → ${t.endLocal}` : '—'
                      const dependsLabels = (t.dependsOnKeys ?? [])
                        .map((k) => {
                          const dep = draftTasks.find((x) => x.key === k)
                          if (!dep) return null
                          return templateById.get(dep.templateId)?.name ?? '—'
                        })
                        .filter(Boolean) as string[]
                      const roleLabel = t.roleIds.length
                        ? t.roleIds
                            .map((id) => roleNameById.get(id))
                            .filter(Boolean)
                            .join(', ')
                        : '—'
                      const userLabels = (t.assignedUserIds ?? []).map((id) => userNameById.get(id)).filter(Boolean) as string[]
                      const bayLabel = t.bayId ? (bayNameById.get(t.bayId) ?? '—') : '—'

                      return (
                        <TableRow
                          key={t.key}
                          hover
                          selected={t.key === selectedTaskKey}
                          onClick={() => setSelectedTaskKey(t.key)}
                          sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx }}
                        >
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.slate[900] }}>
                              {tpl?.name ?? '—'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                              {shopName}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{timeLabel}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{dependsLabels.length ? dependsLabels.join(', ') : '—'}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{roleLabel}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{userLabels.length ? userLabels.join(', ') : '—'}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{bayLabel}</Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveTask(t.key, 'up')
                                }}
                                disabled={idx === 0}
                                startIcon={<ArrowUpward />}
                                sx={{ borderRadius: radii.sm, fontSize: '0.75rem', borderColor: colors.border.default, color: colors.slate[700] }}
                              >
                                Up
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveTask(t.key, 'down')
                                }}
                                disabled={idx === draftTasks.length - 1}
                                startIcon={<ArrowDownward />}
                                sx={{ borderRadius: radii.sm, fontSize: '0.75rem', borderColor: colors.border.default, color: colors.slate[700] }}
                              >
                                Down
                              </Button>
                            </Stack>
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              startIcon={<Delete />}
                              onClick={(e) => {
                                e.stopPropagation()
                                removeTask(t.key)
                              }}
                              sx={{ borderRadius: radii.sm, fontSize: '0.75rem' }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {draftTasks.length ? null : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                            No tasks added yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </SectionCard>

        {/* ── Footer Actions ─────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/jc/pending-vehicles')}
            sx={{ borderRadius: '10px', borderColor: colors.border.default, color: colors.slate[700], fontWeight: 600, px: 2.5 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={!registrationNo.trim() || !draftTasks.length}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Create Job
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
