import { Box, Chip, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import { useMemo, useState } from 'react'
import { useCwStore } from '../store/cwStore'

type ViewMode = 'task' | 'bay' | 'team'

const MODE_COLORS: Record<ViewMode, { pending: string; inProgress: string; completed: string }> = {
  task: { pending: '#ff9800', inProgress: '#2196f3', completed: '#4caf50' },
  bay: { pending: '#e91e63', inProgress: '#9c27b0', completed: '#673ab7' },
  team: { pending: '#00bcd4', inProgress: '#009688', completed: '#3f51b5' },
}

function localDateToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function JCGanttChart() {
  const appointments = useCwStore((s) => s.appointments)
  const bays = useCwStore((s) => s.bays)
  const teams = useCwStore((s) => s.teams)
  const vehicles = useCwStore((s) => s.vehicles)

  const [selectedDate, setSelectedDate] = useState(localDateToday())
  const [viewMode, setViewMode] = useState<ViewMode>('task')

  const vehicleRegById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.registrationNo)
    return m
  }, [vehicles])

  const bayNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of bays) m.set(b.id, b.name)
    return m
  }, [bays])

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  // Find team by SE userId
  const teamBySeUser = useMemo(() => {
    const m = new Map<string, typeof teams[0]>()
    for (const t of teams) m.set(t.seUserId, t)
    return m
  }, [teams])

  // Collect all scheduled items for selected date
  const ganttItems = useMemo(() => {
    const dayStart = new Date(`${selectedDate}T00:00:00`).getTime()
    const dayEnd = new Date(`${selectedDate}T23:59:59`).getTime()

    type GanttItem = {
      label: string
      type: 'concern' | 'service'
      status?: string
      bayId?: string
      teamId?: string
      start: number
      end: number
      vehicleReg: string
    }

    const items: GanttItem[] = []

    for (const a of appointments) {
      const vReg = vehicleRegById.get(a.vehicleId) ?? a.id.slice(0, 6)

      for (const c of a.concernItems) {
        if (!c.plannedStartAt || !c.plannedEndAt) continue
        const start = Date.parse(c.plannedStartAt)
        const end = Date.parse(c.plannedEndAt)
        if (end < dayStart || start > dayEnd) continue

        const team = c.assignedSEUserId ? teamBySeUser.get(c.assignedSEUserId) : undefined
        items.push({
          label: c.concernName,
          type: 'concern',
          status: c.workStatus,
          bayId: c.bayId,
          teamId: team?.id,
          start: Math.max(start, dayStart),
          end: Math.min(end, dayEnd),
          vehicleReg: vReg,
        })
      }

      for (const s of a.serviceItems) {
        if (!s.plannedStartAt || !s.plannedEndAt) continue
        const start = Date.parse(s.plannedStartAt)
        const end = Date.parse(s.plannedEndAt)
        if (end < dayStart || start > dayEnd) continue

        const team = s.assignedSEUserId ? teamBySeUser.get(s.assignedSEUserId) : undefined
        items.push({
          label: s.serviceDescription,
          type: 'service',
          status: s.workStatus,
          bayId: s.bayId,
          teamId: team?.id,
          start: Math.max(start, dayStart),
          end: Math.min(end, dayEnd),
          vehicleReg: vReg,
        })
      }
    }

    return items
  }, [appointments, selectedDate, vehicleRegById, teamBySeUser])

  function getColor(status?: string): string {
    const colors = MODE_COLORS[viewMode]
    switch (status) {
      case 'Completed': return colors.completed
      case 'In Progress': return colors.inProgress
      default: return colors.pending
    }
  }

  // Build Y categories and data series
  const chartOption = useMemo(() => {
    const categories: string[] = []
    const data: { name: string; value: [number, number, number, string]; itemStyle: { color: string } }[] = []

    const categoryIndex = (name: string) => {
      let idx = categories.indexOf(name)
      if (idx === -1) {
        idx = categories.length
        categories.push(name)
      }
      return idx
    }


    if (viewMode === 'task') {
      for (const item of ganttItems) {
        const catName = `📋 ${item.label}`
        const idx = categoryIndex(catName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getColor(item.status) },
        })
      }
    } else if (viewMode === 'bay') {
      for (const item of ganttItems) {
        if (!item.bayId) continue
        const bayName = `🔧 ${bayNameById.get(item.bayId) ?? 'Unknown Bay'}`
        const idx = categoryIndex(bayName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getColor(item.status) },
        })
      }
    } else if (viewMode === 'team') {
      for (const item of ganttItems) {
        if (!item.teamId) continue
        const tName = `👥 ${teamNameById.get(item.teamId) ?? 'Unknown Team'}`
        const idx = categoryIndex(tName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getColor(item.status) },
        })
      }
    }

    // Work hours: 8 AM to 8 PM
    const workStart = new Date(`${selectedDate}T08:00:00`).getTime()
    const workEnd = new Date(`${selectedDate}T20:00:00`).getTime()

    return {
      tooltip: {
        formatter: (params: { name: string; value: [number, number, number, string] }) => {
          const start = new Date(params.value[1])
          const end = new Date(params.value[2])
          const fmt = (d: Date) =>
            d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          const dur = Math.round((params.value[2] - params.value[1]) / 60000)
          return `<strong>${params.name}</strong><br/>
                  ${fmt(start)} — ${fmt(end)}<br/>
                  Duration: ${dur} mins`
        },
      },
      grid: {
        left: 180,
        right: 40,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'time' as const,
        min: workStart,
        max: workEnd,
        axisLabel: {
          formatter: (value: number) =>
            new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
        splitLine: {
          show: true,
          lineStyle: { type: 'dashed' as const, color: '#e0e0e0' },
        },
      },
      yAxis: {
        type: 'category' as const,
        data: categories,
        inverse: true,
        axisLabel: {
          fontSize: 12,
          fontWeight: 600 as const,
          width: 160,
          overflow: 'truncate' as const,
        },
      },
      series: [
        {
          type: 'custom',
          renderItem: (
            _params: { coordSys: { x: number; y: number; width: number; height: number } },
            api: {
              value: (idx: number) => number
              coord: (val: [number, number]) => [number, number]
              size: (val: [number, number]) => [number, number]
              style: () => Record<string, unknown>
            },
          ) => {
            const catIdx = api.value(0)
            const startVal = api.value(1)
            const endVal = api.value(2)

            const start = api.coord([startVal, catIdx])
            const end = api.coord([endVal, catIdx])
            const barHeight = api.size([0, 1])[1] * 0.6

            const style = api.style()

            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - barHeight / 2,
                width: Math.max(end[0] - start[0], 4),
                height: barHeight,
                r: 4,
              },
              style: {
                ...style,
                opacity: 0.85,
              },
            }
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data,
        },
      ],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganttItems, viewMode, selectedDate, bayNameById, teamNameById])

  const chartHeight = Math.max(200, (chartOption.yAxis.data?.length ?? 0) * 40 + 80)

  const colors = MODE_COLORS[viewMode]

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Daily Schedule (Gantt)</Typography>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ width: 170 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) setViewMode(newMode)
            }}
          >
            <ToggleButton value="task">📋 Tasks</ToggleButton>
            <ToggleButton value="bay">🔧 Bays</ToggleButton>
            <ToggleButton value="team">👥 Teams</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Legend */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Chip size="small" sx={{ bgcolor: colors.pending, color: 'white', fontWeight: 700 }} label="Pending" />
          <Chip size="small" sx={{ bgcolor: colors.inProgress, color: 'white', fontWeight: 700 }} label="In Progress" />
          <Chip size="small" sx={{ bgcolor: colors.completed, color: 'white', fontWeight: 700 }} label="Completed" />
        </Stack>

        {ganttItems.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No scheduled tasks for {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </Typography>
          </Box>
        ) : (
          <ReactECharts
            key={viewMode}
            option={chartOption}
            style={{ height: chartHeight, width: '100%' }}
            notMerge
          />
        )}
      </Box>
    </Paper>
  )
}
