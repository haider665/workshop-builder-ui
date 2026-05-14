export function CalendarPage() {
  return <TasksCalendarPage />
}

import { Box, Button, ButtonGroup, Divider, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'
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

  const titleVariant = compact ? 'caption' : 'body2'
  const metaVariant = compact ? 'caption' : 'caption'
  const timeVariant = compact ? 'caption' : 'caption'

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      sx={{
        p: compact ? 0.75 : 1,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Typography variant={titleVariant} sx={{ fontWeight: 900 }} noWrap={compact}>
        {task.title}
      </Typography>
      <Typography variant={metaVariant} color="text.secondary" noWrap={compact}>
        {task.registrationNo ?? '—'} · {shopName} · {bayName}
        {blocked ? ' · Blocked' : ''}
      </Typography>
      <Typography variant={timeVariant} color="text.secondary" noWrap={compact}>
        {formatTimeRange(task)}
      </Typography>
    </Paper>
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

  return (
    <Page title="Calendar" subtitle="Read-only task calendar (month/week views).">
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => {
              if (!v) return
              setMode(v)
            }}
            size="small"
          >
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flexGrow: 1 }} />
          <ButtonGroup variant="outlined" size="small">
            <Button onClick={goPrev} startIcon={<ChevronLeft />}>Prev</Button>
            <Button onClick={() => setCursor(new Date())} startIcon={<Today />}>Today</Button>
            <Button onClick={goNext} endIcon={<ChevronRight />}>Next</Button>
          </ButtonGroup>
        </Stack>
        <Typography sx={{ mt: 1, fontWeight: 900 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          Showing tasks assigned to {user?.name ?? '—'}.
        </Typography>
      </Paper>

      {mode === 'week' ? (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((d) => (
              <Box key={dayKeyLocal(d)} sx={{ p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Typography>
                <Divider sx={{ my: 1 }} />
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
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
              <Box key={w} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
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
                    borderTop: '1px solid',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: inMonth ? 'transparent' : 'action.hover',
                  }}
                >
                  <Typography variant="caption" color={inMonth ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: 800 }}>
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
                      <Typography variant="caption" color="text.secondary">
                        +{dayTasks.length - 3} more
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}
    </Page>
  )
}
