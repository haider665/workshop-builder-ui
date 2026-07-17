import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ChevronLeft, ChevronRight, Dashboard, Store, Today } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { StatCard } from '../../components/StatCard'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { colors, radii } from '../../theme/tokens'

function localDateToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = localDateToday()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  let prefix = ''
  if (dateStr === today) prefix = 'Today · '
  else if (dateStr === tomorrowStr) prefix = 'Tomorrow · '

  return prefix + d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function overlapsDate(startIso: string | undefined, endIso: string | undefined, dateStr: string): boolean {
  if (!startIso) return false
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime()
  const dayEnd = new Date(`${dateStr}T23:59:59.999`).getTime()
  const start = Date.parse(startIso)
  const end = endIso ? Date.parse(endIso) : start
  return start <= dayEnd && end >= dayStart
}

function bayChipColor(status: string, occupied: boolean): 'default' | 'warning' | 'success' {
  if (status === 'Inactive') return 'default'
  return occupied ? 'warning' : 'success'
}

function bayBorder(status: string, occupied: boolean): string {
  if (status === 'Inactive') return colors.slate[300]
  return occupied ? colors.status.warning : colors.status.success
}

function bayBg(status: string, occupied: boolean): string {
  if (status === 'Inactive') return colors.bg.subtle
  return occupied ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)'
}

export function JCBayManagementPage() {
  const bays = useCwStore((s) => s.bays)
  useBackendData()
  const shops = useCwStore((s) => s.shops)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const users = useCwStore((s) => s.users)

  const [selectedDate, setSelectedDate] = useState(localDateToday())
  const [filterShop, setFilterShop] = useState('')

  const shopNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of shops) m.set(s.id, s.name)
    return m
  }, [shops])

  const vehicleRegById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.registrationNo)
    return m
  }, [vehicles])

  const userNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.fullName)
    return m
  }, [users])

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])

  // Group bays by shop, apply shop filter
  const baysByShop = useMemo(() => {
    const filtered = filterShop ? bays.filter((b) => b.shopId === filterShop) : bays
    const map = new Map<string, typeof bays>()
    for (const b of filtered) {
      const list = map.get(b.shopId) ?? []
      list.push(b)
      map.set(b.shopId, list)
    }
    return map
  }, [bays, filterShop])

  // Build bay occupancy filtered by selected date
  const bayOccupancy = useMemo(() => {
    const map = new Map<string, { vehicleReg: string; label: string; status: string; seName: string; startAt?: string; endAt?: string }[]>()
    for (const appt of appointments) {
      if (appt.status === 'Released' || appt.status === 'Payment Done') continue
      const vReg = vehicleRegById.get(appt.vehicleId) ?? '?'

      for (const c of appt.concernItems) {
        if (!c.bayId) continue
        if (!overlapsDate(c.plannedStartAt, c.plannedEndAt, selectedDate)) continue
        const items = map.get(c.bayId) ?? []
        items.push({
          vehicleReg: vReg,
          label: c.concernName,
          status: c.workStatus ?? 'Pending',
          seName: c.assignedSEUserId ? (userNameById.get(c.assignedSEUserId) ?? '—') : '—',
          startAt: c.plannedStartAt,
          endAt: c.plannedEndAt,
        })
        map.set(c.bayId, items)
      }

      for (const s of appt.serviceItems) {
        if (s.stageItems?.length) {
          for (const st of s.stageItems) {
            if (!st.bayId) continue
            if (!overlapsDate(st.plannedStartAt, st.plannedEndAt, selectedDate)) continue
            const items = map.get(st.bayId) ?? []
            items.push({
              vehicleReg: vReg,
              label: `${s.serviceDescription} → ${st.stageName}`,
              status: st.workStatus,
              seName: st.assignedSEUserId ? (userNameById.get(st.assignedSEUserId) ?? '—') : '—',
              startAt: st.plannedStartAt,
              endAt: st.plannedEndAt,
            })
            map.set(st.bayId, items)
          }
        } else if (s.bayId) {
          if (!overlapsDate(s.plannedStartAt, s.plannedEndAt, selectedDate)) continue
          const items = map.get(s.bayId) ?? []
          items.push({
            vehicleReg: vReg,
            label: s.serviceDescription,
            status: s.workStatus ?? 'Pending',
            seName: s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—',
            startAt: s.plannedStartAt,
            endAt: s.plannedEndAt,
          })
          map.set(s.bayId, items)
        }
      }
    }
    return map
  }, [appointments, vehicleRegById, userNameById, selectedDate])

  const filteredBays = useMemo(() => {
    const all = filterShop ? bays.filter((b) => b.shopId === filterShop) : bays
    return all.filter((b) => b.status !== 'Inactive')
  }, [bays, filterShop])

  const occupiedCount = filteredBays.filter((b) => (bayOccupancy.get(b.id)?.length ?? 0) > 0).length

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
            Bay Management
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
            View bay occupancy by date
          </Typography>
        </Box>

        {/* Filters: Date + Shop */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          {/* Date navigation */}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <IconButton size="small" onClick={() => shiftDate(-1)} sx={{ color: colors.slate[600] }}>
              <ChevronLeft />
            </IconButton>
            <TextField
              type="date"
              size="small"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }}
            />
            <IconButton size="small" onClick={() => shiftDate(1)} sx={{ color: colors.slate[600] }}>
              <ChevronRight />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Today />}
              onClick={() => setSelectedDate(localDateToday())}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: radii.sm, whiteSpace: 'nowrap' }}
            >
              Today
            </Button>
          </Stack>

          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[700], whiteSpace: 'nowrap' }}>
            {fmtDateLabel(selectedDate)}
          </Typography>

          {/* Shop filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Shop</InputLabel>
            <Select
              label="Shop"
              value={filterShop}
              onChange={(e) => setFilterShop(e.target.value)}
              sx={{ borderRadius: radii.sm }}
            >
              <MenuItem value="">All Shops</MenuItem>
              {activeShops.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Stats */}
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          <StatCard icon={<Dashboard fontSize="small" />} title="Total Bays" value={filteredBays.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<Dashboard fontSize="small" />} title="Occupied" value={occupiedCount} gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" />
          <StatCard icon={<Dashboard fontSize="small" />} title="Available" value={filteredBays.length - occupiedCount} gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)" />
        </Stack>

        {/* Bays grouped by shop */}
        {Array.from(baysByShop.entries()).map(([shopId, shopBays]) => (
          <SectionCard
            key={shopId}
            title={shopNameById.get(shopId) ?? 'Unknown Shop'}
            icon={<Store sx={{ fontSize: '1rem' }} />}
            actions={
              <Chip size="small" label={`${shopBays.length} bay${shopBays.length !== 1 ? 's' : ''}`}
                sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: colors.slate[100], color: colors.slate[600] }} />
            }
          >
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              {shopBays.map((bay) => {
                const items = bayOccupancy.get(bay.id) ?? []
                const isOccupied = items.length > 0
                return (
                  <Box
                    key={bay.id}
                    sx={{
                      p: 2, minWidth: 240, flex: '1 1 240px', maxWidth: 360,
                      borderRadius: radii.sm,
                      border: `2px solid ${bayBorder(bay.status, isOccupied)}`,
                      bgcolor: bayBg(bay.status, isOccupied),
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>{bay.name}</Typography>
                      <Chip
                        size="small"
                        label={bay.status === 'Inactive' ? 'Inactive' : isOccupied ? `Occupied (${items.length})` : 'Available'}
                        color={bayChipColor(bay.status, isOccupied)}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </Stack>

                    {items.length > 0 ? (
                      <Stack spacing={1}>
                        {items.slice(0, 3).map((item, idx) => (
                          <Box key={idx} sx={{
                            p: 1, bgcolor: colors.bg.card, borderRadius: radii.sm,
                            border: `1px solid ${colors.border.default}`,
                          }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: colors.slate[900] }}>{item.vehicleReg}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{item.label}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                              <Chip size="small" label={item.status}
                                color={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'primary' : 'default'}
                                sx={{ fontWeight: 600, fontSize: '0.65rem' }} />
                              <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>
                                {fmtTime(item.startAt)} – {fmtTime(item.endAt)}
                              </Typography>
                            </Stack>
                            <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>SE: {item.seName}</Typography>
                          </Box>
                        ))}
                        {items.length > 3 && (
                          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>+{items.length - 3} more</Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], fontStyle: 'italic' }}>
                        No assignments for this date
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </SectionCard>
        ))}
      </Stack>
    </Box>
  )
}
