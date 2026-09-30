import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Divider,
  Tab,
  Tabs,
  TextField,
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
  Print,
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
	const [adminSummary, setAdminSummary] = useState<Record<string, any> | null>(null)
	const [workforce, setWorkforce] = useState<Record<string, any> | null>(null)
	const [financial, setFinancial] = useState<Record<string, any> | null>(null)
	const [activeTab, setActiveTab] = useState(0)
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const services = useCwStore((s) => s.services)
  const shops = useCwStore((s) => s.shops)
  const teams = useCwStore((s) => s.teams)
  const bays = useCwStore((s) => s.bays)
  const users = useCwStore((s) => s.users)

  const reportAppointments = useMemo(() => appointments.filter((appointment) => {
    const date = appointment.slotDate || appointment.createdAt?.slice(0, 10) || ''
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
  }), [appointments, fromDate, toDate])
  const reportSales = useMemo(() => reportAppointments.flatMap((appointment) => appointment.serviceItems.map((item) => ({ appointment, item }))), [reportAppointments])
  const reportStatus = useMemo(() => Array.from(reportAppointments.reduce((map, row) => map.set(row.status, (map.get(row.status) || 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]), [reportAppointments])
  const satisfaction = useMemo(() => ({ responses: adminSummary?.feedback?.total || 0, recommended: adminSummary?.feedback?.byRecommendation?.Yes || 0 }), [adminSummary])
  const satisfactionRatings = useMemo(() => ([
    ['overall_rating', 'Overall experience'],
    ['service_advisor_rating', 'Service advisor'],
    ['service_quality_rating', 'Service quality'],
    ['delivery_time_rating', 'Delivery time'],
    ['vehicle_condition_rating', 'Vehicle condition'],
    ['facility_rating', 'Workshop facility'],
  ] as const), [])
  const financialMonths = financial?.monthly || []
  const maxFinancialValue = Math.max(1, ...financialMonths.flatMap((row: { sales?: number; purchases?: number; collections?: number }) => [row.sales || 0, row.purchases || 0, row.collections || 0]))

	useEffect(() => { let active = true; setPerformanceError(''); const range = { fromDate: fromDate || undefined, toDate: toDate || undefined }; Promise.all([workshopApi.getTechnicianPerformance(range), workshopApi.getAdminSummary(), workshopApi.getWorkforceMetrics(range), workshopApi.getFinancialSnapshot(range)]).then(([result, summary, people, money]) => { if (active) { setPerformance(result.data); setAdminSummary(summary); setWorkforce(people); setFinancial(money) } }).catch((error) => { if (active) setPerformanceError(error instanceof Error ? error.message : 'Unable to load reporting data') }); return () => { active = false } }, [fromDate, toDate])

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
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Automotive workshop performance, revenue, customer satisfaction, utilization and workforce intelligence</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2, alignItems: { sm: 'center' }, flexWrap: 'wrap' }} useFlexGap>
            <TextField type="date" size="small" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" size="small" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <Button variant="outlined" startIcon={<Print />} onClick={() => { const report = (['overview', 'sales', 'satisfaction', 'people', 'capacity', 'audit'] as const)[activeTab]; window.open(workshopApi.reportPrintUrl(report === 'capacity' ? 'overview' : report, { fromDate: fromDate || undefined, toDate: toDate || undefined }), '_blank', 'noopener,noreferrer') }} sx={{ fontWeight: 700 }}>Print official report</Button>
            {(fromDate || toDate) && <Button size="small" onClick={() => { setFromDate(''); setToDate('') }}>Clear filters</Button>}
          </Stack>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
            <Tab label="Executive overview" /><Tab label="Sales & services" /><Tab label="Customer satisfaction" /><Tab label="People & workload" /><Tab label="Capacity & quality" /><Tab label="Audit & governance" />
          </Tabs>
        </Box>

        {activeTab === 0 && <>
        {/* ── KPI Cards ── */}
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
          <StatCard icon={<Assignment />} label="Total Appointments" value={appointments.length} />
          <StatCard icon={<TrendingUp />} label="Active" value={activeAppts.length} color="#f59e0b" />
          <StatCard icon={<Build />} label="Completed" value={completedAppts.length} color="#10b981" />
          <StatCard icon={<DirectionsCar />} label="Vehicles" value={vehicles.length} color="#3b82f6" />
          <StatCard icon={<People />} label="Customers" value={customers.length} color="#8b5cf6" />
          <StatCard icon={<Groups />} label="Teams" value={teams.length} color="#06b6d4" />
          <StatCard icon={<People />} label="Enabled Users" value={adminSummary?.users?.total ?? '—'} color="#7c3aed" />
          <StatCard icon={<Assessment />} label="Feedback Entries" value={adminSummary?.feedback?.total ?? '—'} color="#db2777" />
          <StatCard icon={<Assignment />} label="Comments" value={adminSummary?.comments?.total ?? '—'} color="#0891b2" />
        </Stack>
        </>}

        {activeTab === 1 && <SectionCard title="Sales & Services Intelligence" icon={<TrendingUp sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Service revenue by service line</Typography>{topServices.map((service) => { const max = Math.max(...topServices.map((row) => row.revenue), 1); return <Box key={service.desc} sx={{ mb: 1.25 }}><Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography sx={{ fontSize: '.8rem' }}>{service.desc}</Typography><Typography sx={{ fontSize: '.78rem', fontWeight: 700 }}>BDT {service.revenue.toLocaleString('en-BD')}</Typography></Stack><Box sx={{ height: 10, bgcolor: colors.slate[100], borderRadius: 5 }}><Box sx={{ width: `${Math.round(service.revenue / max * 100)}%`, height: '100%', bgcolor: '#0ea5e9', borderRadius: 5 }} /></Box></Box> })}<Divider sx={{ my: 2 }} /><Typography sx={{ fontWeight: 800, mb: 1 }}>Financial proposition</Typography><Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Posted sales</Typography><Typography sx={{ fontWeight: 800 }}>BDT {(financial?.sales?.gross || 0).toLocaleString('en-BD')}</Typography></Box><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Receivables</Typography><Typography sx={{ fontWeight: 800 }}>BDT {(financial?.sales?.outstanding || 0).toLocaleString('en-BD')}</Typography></Box><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Payables</Typography><Typography sx={{ fontWeight: 800 }}>BDT {(financial?.purchases?.outstanding || 0).toLocaleString('en-BD')}</Typography></Box></Stack></Box>
            <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Pipeline by appointment status</Typography>{reportStatus.map(([status, count]) => <Stack key={status} direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}><Typography sx={{ width: 150, fontSize: '.8rem' }}>{status}</Typography><Box sx={{ flex: 1, height: 12, bgcolor: colors.slate[100], borderRadius: 6 }}><Box sx={{ width: `${Math.round(count / Math.max(reportAppointments.length, 1) * 100)}%`, height: '100%', bgcolor: '#8b5cf6', borderRadius: 6 }} /></Box><Typography sx={{ fontWeight: 800 }}>{count}</Typography></Stack>)}</Box>
          </Stack>
          <Divider sx={{ my: 2 }} /><Typography sx={{ fontWeight: 800, mb: 1 }}>Financial movement by month</Typography>
          {financialMonths.length ? <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', minHeight: 150, overflowX: 'auto', pb: 1 }}>
            {financialMonths.map((row: { month: string; sales?: number; purchases?: number; collections?: number }) => <Box key={row.month} sx={{ minWidth: 74, textAlign: 'center' }}>
              <Stack direction="row" spacing={0.5} sx={{ height: 112, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Box title={`Sales: BDT ${(row.sales || 0).toLocaleString('en-BD')}`} sx={{ width: 16, height: `${Math.max(3, ((row.sales || 0) / maxFinancialValue) * 100)}%`, bgcolor: '#0ea5e9', borderRadius: '4px 4px 0 0' }} />
                <Box title={`Purchases: BDT ${(row.purchases || 0).toLocaleString('en-BD')}`} sx={{ width: 16, height: `${Math.max(3, ((row.purchases || 0) / maxFinancialValue) * 100)}%`, bgcolor: '#f97316', borderRadius: '4px 4px 0 0' }} />
                <Box title={`Collections: BDT ${(row.collections || 0).toLocaleString('en-BD')}`} sx={{ width: 16, height: `${Math.max(3, ((row.collections || 0) / maxFinancialValue) * 100)}%`, bgcolor: '#10b981', borderRadius: '4px 4px 0 0' }} />
              </Stack><Typography sx={{ fontSize: '.68rem', color: colors.slate[500] }}>{row.month}</Typography>
            </Box>)}
          </Stack> : <Typography sx={{ color: colors.slate[500], fontSize: '.82rem' }}>No posted financial transactions in this period.</Typography>}
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}><Chip size="small" label="Sales" sx={{ bgcolor: '#e0f2fe' }} /><Chip size="small" label="Purchases" sx={{ bgcolor: '#ffedd5' }} /><Chip size="small" label="Collections" sx={{ bgcolor: '#d1fae5' }} /></Stack>
          <Divider sx={{ my: 2 }} /><Typography sx={{ fontSize: '.82rem', color: colors.slate[500] }}>Filtered appointments: {reportAppointments.length} · Service lines: {reportSales.length} · Estimated service value: BDT {reportSales.reduce((sum, row) => sum + (row.item.price || 0), 0).toLocaleString('en-BD')}</Typography>
        </SectionCard>}

        {activeTab === 2 && <SectionCard title="Customer Satisfaction" icon={<People sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}><Box><Typography sx={{ color: colors.slate[500], fontSize: '.8rem' }}>Feedback responses</Typography><Typography sx={{ fontSize: '2rem', fontWeight: 800 }}>{satisfaction.responses}</Typography></Box><Box><Typography sx={{ color: colors.slate[500], fontSize: '.8rem' }}>Would recommend</Typography><Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>{satisfaction.recommended}</Typography></Box><Box><Typography sx={{ color: colors.slate[500], fontSize: '.8rem' }}>Recommendation rate</Typography><Typography sx={{ fontSize: '2rem', fontWeight: 800 }}>{satisfaction.responses ? `${Math.round(satisfaction.recommended / satisfaction.responses * 100)}%` : '—'}</Typography></Box></Stack>
          <Divider sx={{ my: 2 }} /><Typography sx={{ fontWeight: 800, mb: 1 }}>Rating profile (out of 5)</Typography>
          <Stack spacing={1}>{satisfactionRatings.map(([key, label]) => { const value = adminSummary?.feedback?.averageRatings?.[key] as number | null | undefined; return <Stack key={key} direction="row" sx={{ alignItems: 'center', gap: 1 }}><Typography sx={{ width: { xs: 140, sm: 190 }, fontSize: '.78rem' }}>{label}</Typography><Box sx={{ flex: 1, height: 10, bgcolor: colors.slate[100], borderRadius: 5 }}><Box sx={{ width: `${Math.min(100, ((value || 0) / 5) * 100)}%`, height: '100%', bgcolor: value && value >= 4 ? '#10b981' : value && value >= 3 ? '#f59e0b' : '#ef4444', borderRadius: 5 }} /></Box><Typography sx={{ width: 36, textAlign: 'right', fontWeight: 800, fontSize: '.78rem' }}>{value == null ? '—' : value.toFixed(1)}</Typography></Stack> })}</Stack>
          <Typography sx={{ mt: 3, fontWeight: 800, mb: 1 }}>Satisfaction interpretation</Typography><Typography sx={{ color: colors.slate[600], fontSize: '.85rem' }}>Use feedback trends alongside delivery time, repeat visits, service quality and complaint comments. Individual responses remain traceable from the appointment record.</Typography>
        </SectionCard>}

        {activeTab === 3 && <SectionCard title="People, Assignments & Performance" icon={<Groups sx={{ fontSize: '1rem' }} />}>
          <Typography sx={{ color: colors.slate[500], fontSize: '.82rem', mb: 2 }}>Assigned work, completion, labour standards, job-card throughput, quality returns, presence and overtime indicators.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Job cards</Typography><Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>{workforce?.jobs?.total ?? '—'}</Typography></Box><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Online now</Typography><Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{workforce?.presence?.online ?? '—'}</Typography></Box><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>F1 returns</Typography><Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{workforce?.f1?.total ?? '—'}</Typography></Box><Box><Typography sx={{ fontSize: '.75rem', color: colors.slate[500] }}>Overtime hours</Typography><Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>{workforce?.overtime?.totalHours ?? '—'}</Typography></Box></Stack>
          <Table size="small"><TableHead><TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}><TableCell>Employee</TableCell><TableCell align="right">Completed</TableCell><TableCell align="right">Active</TableCell><TableCell align="right">F1 returns</TableCell><TableCell align="right">F1 rate</TableCell><TableCell align="right">Presence</TableCell><TableCell align="right">Efficiency</TableCell></TableRow></TableHead><TableBody>{performance.map((row) => { const f1 = workforce?.f1?.byUser?.find((item: { userId: string }) => item.userId === row.userId)?.f1Count || 0; const presence = workforce?.presence?.users?.find((item: { userId: string }) => item.userId === row.userId); return <TableRow key={row.userId}><TableCell sx={bodyCellSx}>{row.fullName}</TableCell><TableCell align="right" sx={bodyCellSx}>{row.completed}</TableCell><TableCell align="right" sx={bodyCellSx}>{Math.max(0, Math.round(row.activeMinutes))} min</TableCell><TableCell align="right" sx={bodyCellSx}>{f1}</TableCell><TableCell align="right" sx={bodyCellSx}>{row.completed ? `${Math.round(f1 / row.completed * 100)}%` : '—'}</TableCell><TableCell align="right" sx={bodyCellSx}><Chip size="small" label={presence?.online ? 'Online' : 'Offline'} color={presence?.online ? 'success' : 'default'} /></TableCell><TableCell align="right" sx={bodyCellSx}>{row.efficiencyPercent == null ? '—' : `${row.efficiencyPercent}%`}</TableCell></TableRow>})}</TableBody></Table>
          {workforce?.jobs?.byStatus ? <><Typography sx={{ fontWeight: 800, mt: 2, mb: 1 }}>Job-card status distribution</Typography><Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', minHeight: 110 }}>{Object.entries(workforce.jobs.byStatus as Record<string, number>).map(([status, count]) => <Box key={status} sx={{ minWidth: 78, textAlign: 'center' }}><Box title={`${status}: ${count}`} sx={{ height: `${Math.max(8, (count / Math.max(...Object.values(workforce.jobs.byStatus as Record<string, number>), 1)) * 85)}px`, bgcolor: '#6366f1', borderRadius: '5px 5px 0 0' }} /><Typography sx={{ fontSize: '.68rem', mt: .5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status}</Typography><Typography sx={{ fontSize: '.72rem', fontWeight: 800 }}>{count}</Typography></Box>)}</Stack></> : null}
          {workforce?.overtime?.rows?.length ? <><Typography sx={{ fontWeight: 800, mt: 2, mb: 1 }}>Attendance and overtime indicators</Typography><Table size="small"><TableHead><TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}><TableCell>Employee</TableCell><TableCell>Date</TableCell><TableCell align="right">Worked hours</TableCell><TableCell align="right">Overtime hours</TableCell></TableRow></TableHead><TableBody>{workforce.overtime.rows.map((row: { employeeId: string; date: string; workedHours: number; overtimeHours: number }) => <TableRow key={`${row.employeeId}-${row.date}`}><TableCell sx={bodyCellSx}>{row.employeeId}</TableCell><TableCell sx={bodyCellSx}>{row.date}</TableCell><TableCell align="right" sx={bodyCellSx}>{row.workedHours}</TableCell><TableCell align="right" sx={bodyCellSx}>{row.overtimeHours}</TableCell></TableRow>)}</TableBody></Table></> : <Typography sx={{ mt: 2, fontSize: '.8rem', color: colors.slate[500] }}>No complete IN/OUT pairs are available for overtime calculation in this period.</Typography>}
        </SectionCard>}

        {activeTab === 4 && <SectionCard title="Capacity, Quality & Control" icon={<Assessment sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Bay capacity</Typography>{shopUtilization.map((shop) => <Stack key={shop.name} direction="row" sx={{ gap: 1, alignItems: 'center', mb: 1 }}><Typography sx={{ width: 130, fontSize: '.8rem' }}>{shop.name}</Typography><Box sx={{ flex: 1, height: 12, bgcolor: colors.slate[100], borderRadius: 6 }}><Box sx={{ width: `${shop.total ? Math.round(shop.occupied / shop.total * 100) : 0}%`, height: '100%', bgcolor: '#f59e0b', borderRadius: 6 }} /></Box><Typography sx={{ fontSize: '.8rem' }}>{shop.occupied}/{shop.total}</Typography></Stack>)}</Box><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Control indicators</Typography><Typography sx={{ fontSize: '.84rem', mb: .75 }}>Open appointments: <strong>{activeAppts.length}</strong></Typography><Typography sx={{ fontSize: '.84rem', mb: .75 }}>Completed appointments: <strong>{completedAppts.length}</strong></Typography><Typography sx={{ fontSize: '.84rem' }}>F1 returns: <strong>{adminSummary?.f1?.total ?? 0}</strong></Typography></Box></Stack>
          <Divider sx={{ my: 2 }} /><Typography sx={{ fontWeight: 800, mb: 1 }}>Quality returns by employee</Typography>
          {workforce?.f1?.byUser?.length ? <Stack spacing={1}>{workforce.f1.byUser.slice(0, 10).map((row: { userId: string; f1Count: number }) => <Stack key={row.userId} direction="row" sx={{ alignItems: 'center', gap: 1 }}><Typography sx={{ width: { xs: 140, sm: 190 }, fontSize: '.78rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.userId}</Typography><Box sx={{ flex: 1, height: 10, bgcolor: colors.slate[100], borderRadius: 5 }}><Box sx={{ width: `${Math.min(100, row.f1Count * 10)}%`, height: '100%', bgcolor: '#ef4444', borderRadius: 5 }} /></Box><Typography sx={{ width: 30, textAlign: 'right', fontWeight: 800, fontSize: '.78rem' }}>{row.f1Count}</Typography></Stack>)}</Stack> : <Typography sx={{ color: colors.slate[500], fontSize: '.82rem' }}>No quality-return records in this period.</Typography>}
        </SectionCard>}

        {activeTab === 5 && <SectionCard title="Audit & Governance" icon={<Assessment sx={{ fontSize: '1rem' }} />}>
          <Typography sx={{ color: colors.slate[600], fontSize: '.9rem', mb: 2 }}>The official audit report records who performed each material action, when it happened, which record was affected, and the recorded reason or evidence. Use the date filters above, then print the controlled PDF for review, sign-off, or audit submission.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><Box sx={{ flex: 1, p: 2, bgcolor: colors.slate[50], borderRadius: 2 }}><Typography sx={{ fontWeight: 800 }}>Audit trail coverage</Typography><Typography sx={{ fontSize: '.8rem', color: colors.slate[500], mt: .5 }}>Appointments, job cards, assignments, approvals, quality returns, master-data changes, accounting controls and administrative actions.</Typography></Box><Box sx={{ flex: 1, p: 2, bgcolor: colors.slate[50], borderRadius: 2 }}><Typography sx={{ fontWeight: 800 }}>Official output</Typography><Typography sx={{ fontSize: '.8rem', color: colors.slate[500], mt: .5 }}>Company identity, authenticated preparer, timestamp, reporting period, immutable event rows and controlled-copy notice.</Typography></Box></Stack>
        </SectionCard>}

        {activeTab === 0 && <>
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
        </>}
      </Stack>
    </Box>
  )
}
