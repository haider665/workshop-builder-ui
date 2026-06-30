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
  Assignment,
  Build,
  DirectionsCar,
  Groups,
  People,
  TrendingUp,
} from '@mui/icons-material'
import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { StatCard } from '../../components/StatCard'
import { useCwStore } from '../../store/cwStore'
import { colors, radii, shadows } from '../../theme/tokens'

/* ─────────────────── Card wrapper helper ─────────────────── */

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        borderRadius: radii.lg,
        border: `1px solid ${colors.border.default}`,
        background: colors.bg.card,
        boxShadow: shadows.card,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: subtitle ? 0.5 : 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[900] }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem', mt: 0.25 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  )
}

/* ─────────────────── Main Component ─────────────────────── */

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
          <StatCard icon={<TrendingUp />} label="Active" value={activeAppts.length} color="#f59e0b" />
          <StatCard icon={<Build />} label="Completed" value={completedAppts.length} color="#10b981" />
          <StatCard icon={<DirectionsCar />} label="Vehicles" value={vehicles.length} color="#3b82f6" />
          <StatCard icon={<People />} label="Customers" value={customers.length} color="#8b5cf6" />
          <StatCard icon={<Groups />} label="Teams" value={teams.length} color="#06b6d4" />
        </Stack>

        {/* ── Revenue ── */}
        <Box
          sx={{
            p: 3,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.default}`,
            background: colors.bg.card,
            boxShadow: shadows.card,
          }}
        >
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
        </Box>

        {/* ── Status Breakdown + Shop Utilization ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          {/* Status Breakdown */}
          <Box
            sx={{
              flex: 1,
              p: 3,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border.default}`,
              background: colors.bg.card,
              boxShadow: shadows.card,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 2 }}>
              Appointment Status Breakdown
            </Typography>
            <Stack spacing={1}>
              {statusBreakdown.map(([status, count]) => (
                <Stack key={status} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip size="small" label={status} sx={{ fontWeight: 600 }} />
                  <Typography sx={{ fontWeight: 700, color: colors.slate[900] }}>{count}</Typography>
                </Stack>
              ))}
              {statusBreakdown.length === 0 && (
                <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>No appointments yet.</Typography>
              )}
            </Stack>
          </Box>

          {/* Shop Utilization */}
          <Box
            sx={{
              flex: 1,
              p: 3,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border.default}`,
              background: colors.bg.card,
              boxShadow: shadows.card,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 2 }}>
              Shop & Bay Utilization
            </Typography>
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
          </Box>
        </Stack>

        {/* ── Top Services ── */}
        <SectionCard title="Top 10 Services" subtitle="Most frequently booked services">
          <Table size="small">
            <TableHead>
              <TableRow sx={{
                '& .MuiTableCell-head': {
                  background: colors.bg.subtle,
                  borderBottom: `1px solid ${colors.border.default}`,
                  color: colors.slate[600],
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  '&:first-of-type': { pl: 3 },
                  '&:last-of-type': { pr: 3 },
                },
              }}>
                <TableCell>#</TableCell>
                <TableCell>Service</TableCell>
                <TableCell align="right">Bookings</TableCell>
                <TableCell align="right">Revenue (BDT)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topServices.map((s, i) => (
                <TableRow key={i} hover sx={{
                  '& .MuiTableCell-body': {
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    py: 1.5,
                    '&:first-of-type': { pl: 3 },
                    '&:last-of-type': { pr: 3 },
                  },
                }}>
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
        <SectionCard title="Team Workload" subtitle="Active and completed tasks per SE">
          <Table size="small">
            <TableHead>
              <TableRow sx={{
                '& .MuiTableCell-head': {
                  background: colors.bg.subtle,
                  borderBottom: `1px solid ${colors.border.default}`,
                  color: colors.slate[600],
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  '&:first-of-type': { pl: 3 },
                  '&:last-of-type': { pr: 3 },
                },
              }}>
                <TableCell>Service Engineer</TableCell>
                <TableCell align="right">Active Tasks</TableCell>
                <TableCell align="right">Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamWorkload.map((t, i) => (
                <TableRow key={i} hover sx={{
                  '& .MuiTableCell-body': {
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    py: 1.5,
                    '&:first-of-type': { pl: 3 },
                    '&:last-of-type': { pr: 3 },
                  },
                }}>
                  <TableCell sx={{ fontWeight: 600, color: colors.slate[900] }}>{t.se}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={t.active} color={t.active > 3 ? 'error' : t.active > 1 ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
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
      </Stack>
    </Page>
  )
}
