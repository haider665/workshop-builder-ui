import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import { useCwStore } from '../store/cwStore'

type ViewMode = 'task' | 'bay' | 'team'


const STATUS_COLORS = {
  pending:    '#9e9e9e',
  scheduled:  '#ff9800',
  inProgress: '#2196f3',
  completed:  '#4caf50',
}

function localDateToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusColor(status?: string): string {
  switch (status) {
    case 'Completed': return STATUS_COLORS.completed
    case 'In Progress': return STATUS_COLORS.inProgress
    case 'Scheduled': return STATUS_COLORS.scheduled
    default: return STATUS_COLORS.pending
  }
}

type GanttItem = {
  label: string
  type: 'concern' | 'service' | 'stage'
  status?: string
  bayId?: string
  teamId?: string
  shopId?: string
  start: number
  end: number
  vehicleReg: string
  stageName?: string
  parentLabel?: string  // service description for stages
}

export function JCGanttChart({ fullPage = false }: { fullPage?: boolean } = {}) {
  const appointments = useCwStore((s) => s.appointments)
  const bays = useCwStore((s) => s.bays)
  const teams = useCwStore((s) => s.teams)
  const vehicles = useCwStore((s) => s.vehicles)
  const shops = useCwStore((s) => s.shops)
  const services = useCwStore((s) => s.services)
  const refreshAppointments = useCwStore((s) => s.refreshAppointments)

  // Fetch fresh appointments from backend on mount
  useEffect(() => { refreshAppointments().catch(console.error) }, [refreshAppointments])

  const [selectedDate, setSelectedDate] = useState(localDateToday())
  const [viewMode, setViewMode] = useState<ViewMode>('task')
  const [filterShop, setFilterShop] = useState('')
  const [filterBay, setFilterBay] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

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

  // shopNameById not currently needed — filter uses shopId directly

  const bayShopId = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of bays) m.set(b.id, b.shopId)
    return m
  }, [bays])

  const serviceById = useMemo(() => {
    const m = new Map<string, typeof services[0]>()
    for (const s of services) m.set(s.id, s)
    return m
  }, [services])

  const teamBySeUser = useMemo(() => {
    const m = new Map<string, typeof teams[0]>()
    for (const t of teams) m.set(t.seUserId, t)
    return m
  }, [teams])

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const activeBays = useMemo(() => bays.filter((b) => b.status !== 'Inactive'), [bays])
  const activeTeams = useMemo(() => teams.filter((t) => t.status === 'Active'), [teams])

  // Collect all scheduled items for selected date
  const ganttItems = useMemo(() => {
    const dayStart = new Date(`${selectedDate}T00:00:00`).getTime()
    const dayEnd = new Date(`${selectedDate}T23:59:59`).getTime()
    const items: GanttItem[] = []

    for (const a of appointments) {
      const vReg = vehicleRegById.get(a.vehicleId) ?? a.id.slice(0, 6)

      // Concerns (unchanged)
      for (const c of a.concernItems) {
        if (!c.plannedStartAt) continue
        const start = Date.parse(c.plannedStartAt)
        let end = c.plannedEndAt ? Date.parse(c.plannedEndAt) : start
        // If start === end (zero-duration), extend by processTimeMins or default 30min
        if (end <= start) {
          end = start + ((c.processTimeMins ?? 30) * 60000)
        }
        if (end < dayStart || start > dayEnd) continue

        const team = c.assignedSEUserId ? teamBySeUser.get(c.assignedSEUserId) : undefined
        items.push({
          label: c.concernName,
          type: 'concern',
          status: c.workStatus,
          bayId: c.bayId,
          teamId: team?.id,
          shopId: c.bayId ? bayShopId.get(c.bayId) : undefined,
          start: Math.max(start, dayStart),
          end: Math.min(end, dayEnd),
          vehicleReg: vReg,
        })
      }

      // Services
      for (const s of a.serviceItems) {
        const svc = serviceById.get(s.serviceId)

        // If service has stageItems → emit stage-level bars
        if (s.stageItems && s.stageItems.length > 0) {
          for (const stage of s.stageItems) {
            if (!stage.plannedStartAt) continue
            const start = Date.parse(stage.plannedStartAt)
            let end = stage.plannedEndAt ? Date.parse(stage.plannedEndAt) : start
            if (end <= start) {
              end = start + ((stage.durationMins ?? 30) * 60000)
            }
            if (end < dayStart || start > dayEnd) continue

            items.push({
              label: `${stage.stageName} — ${s.serviceDescription}`,
              type: 'stage',
              status: stage.workStatus,
              bayId: stage.bayId,
              teamId: stage.teamId,
              shopId: stage.bayId ? bayShopId.get(stage.bayId) : svc?.shopId,
              start: Math.max(start, dayStart),
              end: Math.min(end, dayEnd),
              vehicleReg: vReg,
              stageName: stage.stageName,
              parentLabel: s.serviceDescription,
            })
          }
        } else {
          // No stages → single service bar (current behavior)
          if (!s.plannedStartAt) continue
          const start = Date.parse(s.plannedStartAt)
          let end = s.plannedEndAt ? Date.parse(s.plannedEndAt) : start
          if (end <= start) {
            end = start + ((s.processTimeMins ?? 30) * 60000)
          }
          if (end < dayStart || start > dayEnd) continue

          const team = s.assignedSEUserId ? teamBySeUser.get(s.assignedSEUserId) : undefined
          items.push({
            label: s.serviceDescription,
            type: 'service',
            status: s.workStatus,
            bayId: s.bayId,
            teamId: team?.id,
            shopId: s.bayId ? bayShopId.get(s.bayId) : svc?.shopId,
            start: Math.max(start, dayStart),
            end: Math.min(end, dayEnd),
            vehicleReg: vReg,
          })
        }
      }
    }

    return items
  }, [appointments, selectedDate, vehicleRegById, teamBySeUser, bayShopId, serviceById])

  // Apply filters
  const filteredItems = useMemo(() => {
    return ganttItems.filter((item) => {
      if (filterShop && item.shopId !== filterShop) return false
      if (filterBay && item.bayId !== filterBay) return false
      if (filterTeam && item.teamId !== filterTeam) return false
      if (filterVehicle) {
        const q = filterVehicle.toLowerCase()
        if (!item.vehicleReg.toLowerCase().includes(q)) return false
      }
      if (filterStatus) {
        const st = (item.status ?? 'Pending')
        if (st !== filterStatus) return false
      }
      return true
    })
  }, [ganttItems, filterShop, filterBay, filterTeam, filterVehicle, filterStatus])

  // Unique stage names in current view (for legend)


  function getItemColor(item: GanttItem): string {
    return statusColor(item.status)
  }

  // Build chart
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
      for (const item of filteredItems) {
        const catName = item.type === 'stage'
          ? `  ↳ ${item.stageName ?? item.label}`
          : `📋 ${item.label}`
        // For stages, ensure parent service row exists first
        if (item.type === 'stage' && item.parentLabel) {
          const parentCat = `📋 ${item.parentLabel}`
          categoryIndex(parentCat) // register parent row (may be empty)
        }
        const idx = categoryIndex(catName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getItemColor(item) },
        })
      }
    } else if (viewMode === 'bay') {
      for (const item of filteredItems) {
        if (!item.bayId) continue
        const bayName = `🔧 ${bayNameById.get(item.bayId) ?? 'Unknown Bay'}`
        const idx = categoryIndex(bayName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getItemColor(item) },
        })
      }
    } else if (viewMode === 'team') {
      for (const item of filteredItems) {
        if (!item.teamId) continue
        const tName = `👥 ${teamNameById.get(item.teamId) ?? 'Unknown Team'}`
        const idx = categoryIndex(tName)
        data.push({
          name: `${item.vehicleReg} — ${item.label}`,
          value: [idx, item.start, item.end, item.vehicleReg],
          itemStyle: { color: getItemColor(item) },
        })
      }
    }

    const defaultStart = new Date(`${selectedDate}T08:00:00`).getTime()
    const defaultEnd = new Date(`${selectedDate}T20:00:00`).getTime()

    // Compute axis range from actual data, padded by 30 mins
    let dataMin = defaultStart
    let dataMax = defaultEnd
    for (const d of data) {
      if (d.value[1] < dataMin) dataMin = d.value[1]
      if (d.value[2] > dataMax) dataMax = d.value[2]
    }
    const PAD = 30 * 60 * 1000 // 30 min padding
    const workStart = Math.min(defaultStart, dataMin - PAD)
    const workEnd = Math.max(defaultEnd, dataMax + PAD)

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
        left: fullPage ? 140 : 180,
        right: fullPage ? 20 : 40,
        top: 20,
        bottom: 40,
      },
      dataZoom: categories.length > 15 ? [
        {
          type: 'slider',
          yAxisIndex: 0,
          filterMode: 'none',
          width: 20,
          right: 10,
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none',
        },
      ] : undefined,
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
            const barHeight = api.size([0, 1])[1] * (fullPage ? 0.7 : 0.6)

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
  }, [filteredItems, viewMode, selectedDate, bayNameById, teamNameById])

  const barPx = fullPage ? 50 : 40
  const chartHeight = Math.max(300, (chartOption.yAxis.data?.length ?? 0) * barPx + 80)

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5 }}>
        {/* Title + date + view mode */}
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

        {/* ── Filter bar ── */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Shop</InputLabel>
            <Select label="Shop" value={filterShop} onChange={(e) => setFilterShop(e.target.value)}>
              <MenuItem value="">All Shops</MenuItem>
              {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Bay</InputLabel>
            <Select label="Bay" value={filterBay} onChange={(e) => setFilterBay(e.target.value)}>
              <MenuItem value="">All Bays</MenuItem>
              {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Team</InputLabel>
            <Select label="Team" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              <MenuItem value="">All Teams</MenuItem>
              {activeTeams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Vehicle"
            placeholder="Reg. no."
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            sx={{ width: 140 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Scheduled">Scheduled</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Status legend */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip size="small" sx={{ bgcolor: STATUS_COLORS.pending, color: 'white', fontWeight: 700 }} label="Pending" />
          <Chip size="small" sx={{ bgcolor: STATUS_COLORS.scheduled, color: 'white', fontWeight: 700 }} label="Scheduled" />
          <Chip size="small" sx={{ bgcolor: STATUS_COLORS.inProgress, color: 'white', fontWeight: 700 }} label="In Progress" />
          <Chip size="small" sx={{ bgcolor: STATUS_COLORS.completed, color: 'white', fontWeight: 700 }} label="Completed" />
        </Stack>

        {/* Stage legend (only if stages are visible) */}


        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Showing {filteredItems.length} of {ganttItems.length} items
        </Typography>

        {filteredItems.length === 0 ? (
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
