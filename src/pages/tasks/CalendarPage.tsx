export function CalendarPage() {
  return <TasksCalendarPage />
  useBackendData()
}

import { Box, Button, ButtonGroup, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ChevronLeft, ChevronRight, CalendarMonth, Today } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { colors, radii, shadows } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import type { CWTask } from '../../types/cw'

type ViewMode = 'month' | 'week'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfWeekMonday(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 (Sun) .. 6 (Sat)
  const diff = (day + 6) % 7
  return addDays(x, -diff)
}

function startOfMonth(d: Date) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

function formatMonthTitle(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

function taskStart(t: CWTask) {
  return Date.parse(t.plannedStartAt ?? t.createdAt)
}

function dayKeyLocal(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeRange(t: CWTask) {
  const startIso = t.plannedStartAt
  const endIso = t.plannedEndAt
  if (!startIso || !endIso) return '—'
  const start = new Date(startIso)
  const end = new Date(endIso)
  const s = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const e = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${s}–${e}`
}

function isTaskBlocked(task: CWTask, tasksById: Map<string, CWTask>) {
  if (task.dependencyOverrideReason) return false
  const deps = task.dependsOnTaskIds ?? []
  if (!deps.length) return false
  return deps.some((id) => {
    const dep = tasksById.get(id)
    if (!dep) return false
    return dep.status !== 'Completed'
  })
}

function TaskBlock(props: {
  task: CWTask
  shopName: string
  bayName: string
  onClick: () => void
  compact?: boolean
  blocked?: boolean
}) {
  const { task, shopName, bayName, onClick, compact, blocked } = props

  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      sx={{
        p: compact ? 0.75 : 1,
        cursor: 'pointer',
        borderRadius: radii.sm,
        border: `1px solid ${colors.border.subtle}`,
        bgcolor: colors.bg.card,
        transition: 'all 0.15s ease',
        '&:hover': { bgcolor: colors.bg.cardHover, boxShadow: shadows.card, borderColor: colors.border.default },
      }}
    >
      <Typography noWrap={compact} sx={{ fontWeight: 800, fontSize: compact ? '0.72rem' : '0.82rem', color: colors.slate[900] }}>
        {task.title}
      </Typography>
      <Typography noWrap={compact} sx={{ fontSize: compact ? '0.65rem' : '0.75rem', color: colors.slate[500] }}>
        {task.registrationNo ?? '—'} · {shopName} · {bayName}
        {blocked ? ' · Blocked' : ''}
      </Typography>
      <Typography noWrap={compact} sx={{ fontSize: compact ? '0.65rem' : '0.75rem', color: colors.slate[400] }}>
        {formatTimeRange(task)}
      </Typography>
    </Box>
  )
}

function TasksCalendarPage() {
  const user = useSessionStore((s) => s.user)
  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const navigate = useNavigate()

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks])

  const [mode, setMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState<Date>(() => new Date())

  const myTasks = useMemo(() => {
    if (!user) return []
    return tasks
      .filter((t) => {
        if (t.assignedToName === user.name) return true
        return (t.assignedToNames ?? []).includes(user.name)
      })
      .slice()
      .sort((a, b) => taskStart(a) - taskStart(b))
  }, [tasks, user])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CWTask[]>()
    for (const t of myTasks) {
      const start = new Date(taskStart(t))
      const key = dayKeyLocal(startOfDay(start))
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return map
  }, [myTasks])

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

  const title = mode === 'month' ? formatMonthTitle(cursor) : 'This Week'

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor)
    const gridStart = startOfWeekMonday(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [cursor])

  function goPrev() {
    if (mode === 'month') {
      const d = new Date(cursor)
      d.setMonth(d.getMonth() - 1)
      setCursor(d)
    } else {
      setCursor(addDays(cursor, -7))
    }
  }

  function goNext() {
    if (mode === 'month') {
      const d = new Date(cursor)
      d.setMonth(d.getMonth() + 1)
      setCursor(d)
    } else {
      setCursor(addDays(cursor, 7))
    }
  }

  const navBtnSx = { borderColor: colors.border.strong, color: colors.slate[700], fontWeight: 600, fontSize: '0.82rem' }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Calendar
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Read-only task calendar (month/week views).</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => {
                if (!v) return
                setMode(v)
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  borderRadius: radii.sm,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  textTransform: 'none',
                  px: 2,
                },
              }}
            >
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
            </ToggleButtonGroup>
            <ButtonGroup variant="outlined" size="small">
              <Button onClick={goPrev} startIcon={<ChevronLeft />} sx={navBtnSx}>Prev</Button>
              <Button onClick={() => setCursor(new Date())} startIcon={<Today />} sx={navBtnSx}>Today</Button>
              <Button onClick={goNext} endIcon={<ChevronRight />} sx={navBtnSx}>Next</Button>
            </ButtonGroup>
          </Stack>
        </Stack>

        {/* Calendar info */}
        <SectionCard title={title} icon={<CalendarMonth sx={{ fontSize: '1rem' }} />}>
          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
            Showing tasks assigned to {user?.name ?? '—'}.
          </Typography>
        </SectionCard>

        {/* Calendar grid */}
        {mode === 'week' ? (
          <Box sx={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.default}`,
            bgcolor: colors.bg.card,
            boxShadow: shadows.card,
            overflow: 'hidden',
          }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekDays.map((d) => (
                <Box key={dayKeyLocal(d)} sx={{ p: 1.5, borderRight: `1px solid ${colors.border.subtle}` }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: colors.slate[900], mb: 1 }}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Typography>
                  <Box sx={{ height: '1px', bgcolor: colors.border.default, mb: 1 }} />
                  <Stack spacing={1}>
                    {(tasksByDay.get(dayKeyLocal(d)) ?? []).map((t) => (
                      <TaskBlock
                        key={t.id}
                        task={t}
                        shopName={shopNameById.get(t.shopId) ?? '—'}
                        bayName={t.bayId ? bayNameById.get(t.bayId) ?? '—' : '—'}
                        blocked={isTaskBlocked(t, tasksById)}
                        onClick={() => navigate(`/tasks/${t.id}`)}
                      />
                    ))}
                    {(tasksByDay.get(dayKeyLocal(d)) ?? []).length ? null : (
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
                        —
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.default}`,
            bgcolor: colors.bg.card,
            boxShadow: shadows.card,
            overflow: 'hidden',
          }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                <Box key={w} sx={{ p: 1, borderBottom: `1px solid ${colors.border.default}`, bgcolor: colors.bg.subtle }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.slate[600], letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {w}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {monthGrid.map((d) => {
                const key = dayKeyLocal(d)
                const inMonth = d.getMonth() === cursor.getMonth()
                const dayTasks = tasksByDay.get(key) ?? []
                return (
                  <Box
                    key={key}
                    sx={{
                      minHeight: 120,
                      p: 1,
                      borderTop: `1px solid ${colors.border.subtle}`,
                      borderRight: `1px solid ${colors.border.subtle}`,
                      backgroundColor: inMonth ? 'transparent' : colors.bg.subtle,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: inMonth ? colors.slate[900] : colors.slate[400] }}>
                      {d.getDate()}
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      {dayTasks.slice(0, 3).map((t) => (
                        <TaskBlock
                          key={t.id}
                          compact
                          task={t}
                          shopName={shopNameById.get(t.shopId) ?? '—'}
                          bayName={t.bayId ? bayNameById.get(t.bayId) ?? '—' : '—'}
                          blocked={isTaskBlocked(t, tasksById)}
                          onClick={() => navigate(`/tasks/${t.id}`)}
                        />
                      ))}
                      {dayTasks.length > 3 ? (
                        <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500], fontWeight: 600 }}>
                          +{dayTasks.length - 3} more
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
