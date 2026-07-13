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
  Engineering as EngineeringIcon,
  Search as SearchIcon,
  BugReport,
  HourglassTop,
  CheckCircle,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { colors, radii, shadows, pageLayout } from '../../theme/tokens'
import type { CWAppointmentStatus } from '../../types/cw'

const SE_STATUSES: CWAppointmentStatus[] = [
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
]

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
  }
  return map[status] ?? 'default'
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

export function SEAppointmentsPage() {
  const navigate = useNavigate()
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CWAppointmentStatus | 'All'>('All')

  const relevant = useMemo(
    () =>
      appointments.filter((a) => {
        if (!SE_STATUSES.includes(a.status as CWAppointmentStatus)) return false
        // Status alone proves SE relevance. Item-level assignedSEUserId may not
        // be populated by backend, so don't gate on it.
        return true
      }),
    [appointments],
  )

  const filtered = useMemo(() => {
    let list = relevant
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((a) => {
        const v = vehicles.find((v) => v.id === a.vehicleId)
        const c = customers.find((c) => c.id === a.customerId)
        return (
          (v?.registrationNo ?? '').toLowerCase().includes(q) ||
          (c?.fullName ?? '').toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [relevant, statusFilter, search, vehicles, customers])

  const diagnosisAssigned = relevant.filter((a) => a.status === 'Diagnosis Assigned' || a.status === 'Service Assigned').length
  const inProgress = relevant.filter((a) => a.status === 'Diagnosis In Progress' || a.status === 'Service In Progress').length
  const completed = relevant.filter((a) => a.status === 'Diagnosis Complete' || a.status === 'Service Complete').length

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
              Service Engineer Dashboard
            </Typography>
          </Box>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={statCardSx('linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BugReport sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{diagnosisAssigned}</Typography>
          </Box>

          <Box sx={statCardSx('linear-gradient(135deg, #9333EA 0%, #A855F7 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HourglassTop sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Progress</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{inProgress}</Typography>
          </Box>

          <Box sx={statCardSx('linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)')}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed</Typography>
            </Stack>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{completed}</Typography>
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
              <EngineeringIcon sx={{ color: colors.slate[400], fontSize: '1.2rem' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: colors.slate[800] }}>
                Assignments
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
                placeholder="Search reg no, customer…"
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
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as CWAppointmentStatus | 'All')}
                  sx={{ borderRadius: radii.sm, fontSize: '0.85rem', bgcolor: colors.bg.page }}
                >
                  <MenuItem value="All">All</MenuItem>
                  {SE_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {/* Table */}
          {filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[400], fontSize: '0.9rem' }}>No SE assignments found.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Vehicle</TableCell>
                    <TableCell sx={headerCellSx}>Customer</TableCell>
                    <TableCell sx={headerCellSx}>Status</TableCell>
                    <TableCell sx={headerCellSx}>Concerns</TableCell>
                    <TableCell sx={headerCellSx}>Services</TableCell>
                    <TableCell sx={headerCellSx}>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((a) => {
                    const v = vehicles.find((v) => v.id === a.vehicleId)
                    const c = customers.find((c) => c.id === a.customerId)
                    return (
                      <TableRow
                        key={a.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          '&:hover': { bgcolor: colors.bg.cardHover },
                        }}
                        onClick={() => navigate(`/se/appointments/${a.id}`)}
                      >
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: colors.slate[800] }}>
                            {v?.registrationNo ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[800] }}>
                            {c?.fullName ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {c?.phone ?? ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip size="small" color={statusColor(a.status)} label={a.status} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700], fontWeight: 600 }}>
                            {a.concernItems.filter((c) => c.assignedSEUserId).length}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700], fontWeight: 600 }}>
                            {a.serviceItems.filter((s) => s.assignedSEUserId).length}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                            {fmtDate(a.createdAt)}
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
