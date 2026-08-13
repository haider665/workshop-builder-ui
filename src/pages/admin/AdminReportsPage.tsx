import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  Assessment,
  Assignment,
  Build,
  DirectionsCar,
  Groups,
  People,
  Store,
  TrendingUp,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { headerCellSx, bodyCellSx } from '../../theme/tableStyles'
import { useCwStore } from '../../store/cwStore'
import { colors } from '../../theme/tokens'
import { workshopApi } from '../../services/workshopApi'

/* ─────────────────── Main Component ─────────────────────── */

export function AdminReportsPage() {
	const [performance, setPerformance] = useState<Array<{ userId: string; fullName: string; completed: number; standardMinutes: number; activeMinutes: number; varianceMinutes: number; efficiencyPercent: number | null; unstandardized: number }>>([])
	const [performanceError, setPerformanceError] = useState('')
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const services = useCwStore((s) => s.services)
  const shops = useCwStore((s) => s.shops)
  const teams = useCwStore((s) => s.teams)
  const bays = useCwStore((s) => s.bays)
  const users = useCwStore((s) => s.users)

	useEffect(() => { let active = true; workshopApi.getTechnicianPerformance().then((result) => { if (active) setPerformance(result.data) }).catch((error) => { if (active) setPerformanceError(error instanceof Error ? error.message : 'Unable to load technician performance') }); return () => { active = false } }, [])

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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
            Reports
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Workshop analytics and operational overview</Typography>
        </Box>

        {/* ── KPI Cards ── */}
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
          <StatCard icon={<Assignment />} label="Total Appointments" value={appointments.length} />
          <StatCard icon={<TrendingUp />} label="Active" value={activeAppts.length} color="#f59e0b" />
          <StatCard icon={<Build />} label="Completed" value={completedAppts.length} color="#10b981" />
          <StatCard icon={<DirectionsCar />} label="Vehicles" value={vehicles.length} color="#3b82f6" />
          <StatCard icon={<People />} label="Customers" value={customers.length} color="#8b5cf6" />
          <StatCard icon={<Groups />} label="Teams" value={teams.length} color="#06b6d4" />
        </Stack>

        {/* ── Revenue ── */}
        <SectionCard title="Revenue & Metrics" icon={<TrendingUp sx={{ fontSize: '1rem' }} />}>
          <Stack direction="row" spacing={4} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>Total Revenue (Completed)</Typography>
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                BDT {totalRevenue.toLocaleString('en-BD')}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>Avg. Service Duration</Typography>
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: colors.slate[900] }}>
                {avgServiceTime}h
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>Total Services Available</Typography>
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: colors.slate[900] }}>
                {services.length}
              </Typography>
            </Box>
          </Stack>
        </SectionCard>

        {/* ── Status Breakdown + Shop Utilization ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          {/* Status Breakdown */}
          <Box sx={{ flex: 1 }}>
            <SectionCard title="Status Breakdown" icon={<Assessment sx={{ fontSize: '1rem' }} />}>
              <Stack spacing={1}>
                {statusBreakdown.map(([status, count]) => (
                  <Stack key={status} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip size="small" label={status} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    <Typography sx={{ fontWeight: 700, color: colors.slate[900] }}>{count}</Typography>
                  </Stack>
                ))}
                {statusBreakdown.length === 0 && (
                  <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>No appointments yet.</Typography>
                )}
              </Stack>
            </SectionCard>
          </Box>

          {/* Shop Utilization */}
          <Box sx={{ flex: 1 }}>
            <SectionCard title="Shop & Bay Utilization" icon={<Store sx={{ fontSize: '1rem' }} />}>
              <Stack spacing={1.5}>
                {shopUtilization.map((s) => {
                  const pct = s.total > 0 ? Math.round((s.occupied / s.total) * 100) : 0
                  return (
                    <Box key={s.name}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[900] }}>{s.name}</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
                          {s.occupied}/{s.total} bays ({pct}%)
                        </Typography>
                      </Stack>
                      <Box sx={{ height: 8, bgcolor: colors.slate[100], borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981', borderRadius: 4, transition: 'width 0.5s' }} />
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            </SectionCard>
          </Box>
        </Stack>

        {/* ── Top Services ── */}
        <SectionCard title="Top 10 Services" icon={<Build sx={{ fontSize: '1rem' }} />}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                <TableCell>#</TableCell>
                <TableCell>Service</TableCell>
                <TableCell align="right">Bookings</TableCell>
                <TableCell align="right">Revenue (BDT)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topServices.map((s, i) => (
                <TableRow key={i} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                  <TableCell sx={{ color: colors.slate[400] }}>#{i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: colors.slate[900] }}>{s.desc}</TableCell>
                  <TableCell align="right" sx={{ color: colors.slate[700] }}>{s.count}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: colors.slate[900] }}>{s.revenue.toLocaleString('en-BD')}</TableCell>
                </TableRow>
              ))}
              {topServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>No service data yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </SectionCard>

        {/* ── Team Workload ── */}
        <SectionCard title="Team Workload" icon={<Groups sx={{ fontSize: '1rem' }} />}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                <TableCell>Service Engineer</TableCell>
                <TableCell align="right">Active Tasks</TableCell>
                <TableCell align="right">Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamWorkload.map((t, i) => (
                <TableRow key={i} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                  <TableCell sx={{ fontWeight: 600, color: colors.slate[900] }}>{t.se}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={t.active} color={t.active > 3 ? 'error' : t.active > 1 ? 'warning' : 'success'} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ color: colors.slate[700] }}>{t.completed}</TableCell>
                </TableRow>
              ))}
              {teamWorkload.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>No workload data.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </SectionCard>

		<SectionCard title="Labour Standard & Technician Performance" icon={<TrendingUp sx={{ fontSize: '1rem' }} />}>
		  <Typography sx={{ mb: 2, color: colors.slate[500], fontSize: '.8rem' }}>Active time excludes recorded pauses. Results are operational guidance until HR approves the performance policy.</Typography>
		  {performanceError ? <Typography color="error" sx={{ mb: 1 }}>{performanceError}</Typography> : null}
		  <Table size="small"><TableHead><TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}><TableCell>Technician</TableCell><TableCell align="right">Completed</TableCell><TableCell align="right">LTS</TableCell><TableCell align="right">Active</TableCell><TableCell align="right">Variance</TableCell><TableCell align="right">Efficiency</TableCell></TableRow></TableHead><TableBody>{performance.map((row) => <TableRow key={row.userId} sx={{ '& .MuiTableCell-body': bodyCellSx }}><TableCell><Typography sx={{ fontWeight: 700 }}>{row.fullName}</Typography><Typography sx={{ fontSize: '.72rem', color: colors.slate[500] }}>{row.unstandardized ? `${row.unstandardized} without standard` : 'All work standardized'}</Typography></TableCell><TableCell align="right">{row.completed}</TableCell><TableCell align="right">{Math.round(row.standardMinutes)} min</TableCell><TableCell align="right">{Math.round(row.activeMinutes)} min</TableCell><TableCell align="right">{Math.round(row.varianceMinutes)} min</TableCell><TableCell align="right"><Chip size="small" label={row.efficiencyPercent == null ? '—' : `${row.efficiencyPercent}%`} color={row.efficiencyPercent != null && row.efficiencyPercent >= 90 ? 'success' : 'default'} /></TableCell></TableRow>)}</TableBody></Table>
		  {!performance.length && !performanceError ? <Typography sx={{ py: 2, color: colors.slate[500] }}>Complete technician timer assignments to populate this report.</Typography> : null}
		</SectionCard>
      </Stack>
    </Box>
  )
}
