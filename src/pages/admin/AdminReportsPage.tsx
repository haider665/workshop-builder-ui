import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  Assignment,
  Build,
  DirectionsCar,
  Groups,
  People,
  TrendingUp,
} from '@mui/icons-material'
import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <Paper sx={{ p: 2.5, flex: '1 1 180px', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: color ?? 'primary.main', color: 'white', display: 'flex' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  )
}

export function AdminReportsPage() {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const services = useCwStore((s) => s.services)
  const shops = useCwStore((s) => s.shops)
  const teams = useCwStore((s) => s.teams)
  const bays = useCwStore((s) => s.bays)
  const users = useCwStore((s) => s.users)

  // ── Computed Metrics ──
  const activeAppts = useMemo(
    () => appointments.filter((a) => !['Released', 'Payment Done'].includes(a.status)),
    [appointments],
  )

  const completedAppts = useMemo(
    () => appointments.filter((a) => a.status === 'Released' || a.status === 'Payment Done'),
    [appointments],
  )

  const totalRevenue = useMemo(
    () => completedAppts.reduce((sum, a) => sum + a.serviceItems.reduce((s2, si) => s2 + si.price, 0), 0),
    [completedAppts],
  )

  const avgServiceTime = useMemo(() => {
    const withTime = completedAppts.filter((a) => a.createdAt && a.updatedAt)
    if (withTime.length === 0) return 0
    const totalMs = withTime.reduce((sum, a) => sum + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()), 0)
    return Math.round(totalMs / withTime.length / 3600000) // hours
  }, [completedAppts])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of appointments) {
      map.set(a.status, (map.get(a.status) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [appointments])

  // Shop utilization
  const shopUtilization = useMemo(() => {
    const shopNames = new Map(shops.map((s) => [s.id, s.name]))
    const shopBays = new Map<string, number>()
    const shopOccupied = new Map<string, number>()
    for (const b of bays) {
      if (b.status === 'Inactive') continue
      shopBays.set(b.shopId, (shopBays.get(b.shopId) ?? 0) + 1)
    }
    // Count occupied bays
    const occupiedBayIds = new Set<string>()
    for (const a of activeAppts) {
      for (const c of a.concernItems) if (c.bayId) occupiedBayIds.add(c.bayId)
      for (const s of a.serviceItems) {
        if (s.bayId) occupiedBayIds.add(s.bayId)
        if (s.stageItems) for (const st of s.stageItems) if (st.bayId) occupiedBayIds.add(st.bayId)
      }
    }
    for (const b of bays) {
      if (occupiedBayIds.has(b.id)) shopOccupied.set(b.shopId, (shopOccupied.get(b.shopId) ?? 0) + 1)
    }
    return Array.from(shopBays.entries()).map(([shopId, total]) => ({
      name: shopNames.get(shopId) ?? shopId,
      total,
      occupied: shopOccupied.get(shopId) ?? 0,
    }))
  }, [shops, bays, activeAppts])

  // Top services by frequency
  const topServices = useMemo(() => {
    const map = new Map<string, { desc: string; count: number; revenue: number }>()
    for (const a of appointments) {
      for (const si of a.serviceItems) {
        const key = si.serviceId || si.serviceCode
        const existing = map.get(key)
        if (existing) {
          existing.count++
          existing.revenue += si.price
        } else {
          map.set(key, { desc: si.serviceDescription, count: 1, revenue: si.price })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [appointments])

  // Team workload
  const teamWorkload = useMemo(() => {
    const teamNames = new Map(teams.map((t) => [t.seUserId, t.name]))
    const userNames = new Map(users.map((u) => [u.id, u.fullName]))
    const load = new Map<string, { name: string; se: string; active: number; completed: number }>()
    for (const a of appointments) {
      for (const c of a.concernItems) {
        if (!c.assignedSEUserId) continue
        const key = c.assignedSEUserId
        const existing = load.get(key) ?? { name: teamNames.get(key) ?? '—', se: userNames.get(key) ?? '—', active: 0, completed: 0 }
        if (c.workStatus === 'Completed') existing.completed++
        else existing.active++
        load.set(key, existing)
      }
      for (const s of a.serviceItems) {
        if (!s.assignedSEUserId) continue
        const key = s.assignedSEUserId
        const existing = load.get(key) ?? { name: teamNames.get(key) ?? '—', se: userNames.get(key) ?? '—', active: 0, completed: 0 }
        if (s.workStatus === 'Completed') existing.completed++
        else existing.active++
        load.set(key, existing)
      }
    }
    return Array.from(load.values()).sort((a, b) => b.active - a.active)
  }, [appointments, teams, users])

  return (
    <Page title="Reports" subtitle="Workshop analytics and operational overview">
      <Stack spacing={3}>
        {/* ── KPI Cards ── */}
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
          <StatCard icon={<Assignment />} label="Total Appointments" value={appointments.length} />
          <StatCard icon={<TrendingUp />} label="Active" value={activeAppts.length} color="#ff9800" />
          <StatCard icon={<Build />} label="Completed" value={completedAppts.length} color="#4caf50" />
          <StatCard icon={<DirectionsCar />} label="Vehicles" value={vehicles.length} color="#2196f3" />
          <StatCard icon={<People />} label="Customers" value={customers.length} color="#9c27b0" />
          <StatCard icon={<Groups />} label="Teams" value={teams.length} color="#00bcd4" />
        </Stack>

        {/* ── Revenue ── */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Revenue (Completed)</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>
                BDT {totalRevenue.toLocaleString('en-BD')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Avg. Service Duration</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {avgServiceTime}h
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Services Available</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {services.length}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* ── Status Breakdown + Shop Utilization ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          {/* Status Breakdown */}
          <Paper sx={{ p: 2.5, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Appointment Status Breakdown</Typography>
            <Stack spacing={1}>
              {statusBreakdown.map(([status, count]) => (
                <Stack key={status} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip size="small" label={status} sx={{ fontWeight: 600 }} />
                  <Typography sx={{ fontWeight: 800 }}>{count}</Typography>
                </Stack>
              ))}
              {statusBreakdown.length === 0 && (
                <Typography variant="body2" color="text.secondary">No appointments yet.</Typography>
              )}
            </Stack>
          </Paper>

          {/* Shop Utilization */}
          <Paper sx={{ p: 2.5, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Shop & Bay Utilization</Typography>
            <Stack spacing={1.5}>
              {shopUtilization.map((s) => {
                const pct = s.total > 0 ? Math.round((s.occupied / s.total) * 100) : 0
                return (
                  <Box key={s.name}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {s.occupied}/{s.total} bays ({pct}%)
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: pct > 80 ? 'error.main' : pct > 50 ? 'warning.main' : 'success.main', borderRadius: 4, transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        </Stack>

        {/* ── Top Services ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900 }}>Top 10 Services</Typography>
            <Typography variant="body2" color="text.secondary">Most frequently booked services</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Bookings</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Revenue (BDT)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topServices.map((s, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: 'text.secondary' }}>#{i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{s.desc}</TableCell>
                  <TableCell align="right">{s.count}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{s.revenue.toLocaleString('en-BD')}</TableCell>
                </TableRow>
              ))}
              {topServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">No service data yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Team Workload ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900 }}>Team Workload</Typography>
            <Typography variant="body2" color="text.secondary">Active and completed tasks per SE</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800 }}>Service Engineer</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Active Tasks</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamWorkload.map((t, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{t.se}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={t.active} color={t.active > 3 ? 'error' : t.active > 1 ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell align="right">{t.completed}</TableCell>
                </TableRow>
              ))}
              {teamWorkload.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">No workload data.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </Page>
  )
}
