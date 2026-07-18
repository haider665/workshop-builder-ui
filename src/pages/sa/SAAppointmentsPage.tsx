import {
  Box,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
import {
  WavingHand,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  PendingActions,
  RateReview,
  DirectionsCar,
  Inventory,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { colors, radii, shadows, pageLayout } from '../../theme/tokens'

import type { CWAppointmentStatus } from '../../types/cw'

const SA_STATUSES: CWAppointmentStatus[] = [
  'SA Inspection',
  'SA Reviewed',
  'Customer Notified',
  'Customer Approved',
  'Customer Rejected',
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Approval Pending',
  'Service Approved',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
  'QC Assigned',
  'QC Approved',
  'QC Rejected',
  'Payment Pending',
  'Payment Done',
]

function statusColor(
  status: string,
): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    'SA Inspection': 'primary',
    'SA Reviewed': 'warning',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Approval Pending': 'warning',
    'Service Approved': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
  }
  return map[status] ?? 'default'
}

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const sectionSx = {
  borderRadius: radii.lg,
  border: `1px solid ${colors.border.default}`,
  background: colors.bg.card,
  boxShadow: shadows.card,
  overflow: 'hidden',
}

const headerCellSx = {
  background: colors.bg.subtle,
  borderBottom: `1px solid ${colors.border.default}`,
  color: colors.slate[600],
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
}

const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
}

const statCardSx = (gradient: string) => ({
  flex: 1,
  minWidth: 200,
  borderRadius: radii.lg,
  background: gradient,
  color: '#fff',
  p: 2.5,
  position: 'relative' as const,
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 28px rgba(0,0,0,0.2)' },
  '&::after': {
    content: '""', position: 'absolute', top: -20, right: -20,
    width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
  },
})

export function SAAppointmentsPage() {
  const navigate = useNavigate()
  useBackendData()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const partRequests = useCwStore((s) => s.partRequests)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CWAppointmentStatus | 'All'>('All')

  // All SA-relevant appointments (assigned to an SA at appointment level)
  const relevant = useMemo(
    () =>
      appointments.filter((a) => {
        if (!SA_STATUSES.includes(a.status as CWAppointmentStatus)) return false
        return !!a.assignedSAUserId
      }),
    [appointments],
  )

  const filtered = useMemo(() => {
    let list = relevant
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => {
        const v = vehicles.find((x) => x.id === a.vehicleId)
        const c = customers.find((x) => x.id === a.customerId)
        return (
          v?.registrationNo.toLowerCase().includes(q) ||
          v?.make?.toLowerCase().includes(q) ||
          v?.model?.toLowerCase().includes(q) ||
          c?.fullName?.toLowerCase().includes(q) ||
          c?.phone?.toLowerCase().includes(q)
        )
      })
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [relevant, statusFilter, search, vehicles, customers])

  const pendingInspection = relevant.filter((a) => a.status === 'SA Inspection').length
  const underReview = relevant.filter((a) => a.status === 'SA Reviewed').length
  const totalAssigned = relevant.length

  // Count appointments that have at least one part request completed (Labeled/Fulfilled) — SA needs to talk to customer
  const partsReadyCount = useMemo(() => {
    const apptIds = new Set(relevant.map((a) => a.id))
    const readyApptIds = new Set<string>()
    for (const pr of partRequests) {
      if (apptIds.has(pr.appointmentId) && (pr.status === 'Labeled' || pr.status === 'Fulfilled')) {
        readyApptIds.add(pr.appointmentId)
      }
    }
    return readyApptIds.size
  }, [relevant, partRequests])

  return (
    <Box sx={{ px: pageLayout.px, py: pageLayout.py, minHeight: '100vh', bgcolor: colors.bg.page }}>
      <Stack spacing={3}>
        {/* ── Greeting Header ── */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <WavingHand sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {getGreeting()}!
              </Typography>
            </Stack>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Service Advisor Dashboard
            </Typography>
          </Box>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={statCardSx('linear-gradient(135deg, #0F172A 0%, #1E293B 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PendingActions sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Inspection</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{pendingInspection}</Typography>
          </Box>

          <Box sx={statCardSx('linear-gradient(135deg, #B45309 0%, #F59E0B 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RateReview sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Under Review</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{underReview}</Typography>
          </Box>

          <Box sx={statCardSx('linear-gradient(135deg, #047857 0%, #10B981 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DirectionsCar sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Assigned</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{totalAssigned}</Typography>
          </Box>

          <Box sx={statCardSx('linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inventory sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parts Ready</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{partsReadyCount}</Typography>
          </Box>
        </Stack>

        {/* ── Table Section ── */}
        <Box sx={sectionSx}>
          {/* Section Header with Search & Filter */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              p: 2.5,
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              borderBottom: `1px solid ${colors.border.default}`,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <AssignmentIcon sx={{ color: colors.slate[400], fontSize: '1.2rem' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: colors.slate[800] }}>
                Appointments
              </Typography>
              <Box sx={{
                bgcolor: colors.slate[100], borderRadius: radii.full,
                px: 1.2, py: 0.2, fontSize: '0.75rem', fontWeight: 700, color: colors.slate[600],
              }}>
                {filtered.length}
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                size="small"
                placeholder="Search reg, make, customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: radii.sm,
                    fontSize: '0.85rem',
                    bgcolor: colors.bg.page,
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CWAppointmentStatus | 'All')}
                  sx={{ borderRadius: radii.sm, fontSize: '0.85rem', bgcolor: colors.bg.page }}
                >
                  <MenuItem value="All">All SA Statuses</MenuItem>
                  {SA_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {/* Table */}
          {filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[400], fontSize: '0.9rem' }}>No appointments in SA workflow.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Vehicle</TableCell>
                    <TableCell sx={headerCellSx}>Customer</TableCell>
                    <TableCell sx={headerCellSx}>Slot</TableCell>
                    <TableCell sx={headerCellSx}>Concerns / Services</TableCell>
                    <TableCell sx={headerCellSx}>Status</TableCell>
                    <TableCell sx={headerCellSx}>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((appt) => {
                    const v = vehicles.find((x) => x.id === appt.vehicleId)
                    const c = customers.find((x) => x.id === appt.customerId)
                    const total = appt.serviceItems.reduce((s, i) => s + i.price, 0)
                    return (
                      <TableRow
                        key={appt.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          '&:hover': { bgcolor: colors.bg.cardHover },
                        }}
                        onClick={() => navigate(`/sa/appointments/${appt.id}`)}
                      >
                        <TableCell sx={bodyCellSx}>
                          <Stack>
                            <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: colors.slate[800] }}>
                              {v?.registrationNo ?? '—'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                              {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Stack>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[800] }}>
                              {c?.fullName ?? '—'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                              {c?.phone ?? ''}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                            {appt.slotDate ? fmtDate(appt.slotDate) : '—'}
                          </Typography>
                          {appt.slotTime && (
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                              {appt.slotTime}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                            {appt.concernItems.length}C / {appt.serviceItems.length}S
                          </Typography>
                          {total > 0 && (
                            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                              {fmtBDT(total)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={appt.status}
                            size="small"
                            color={statusColor(appt.status)}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                            {fmtDate(appt.createdAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
