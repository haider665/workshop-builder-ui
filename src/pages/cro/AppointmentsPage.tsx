import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  CalendarMonth,
  CheckCircle,
  HourglassTop,
  Search,
  Visibility,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWAppointmentStatus } from '../../types/cw'

/* ─────────────────────── Helpers ─────────────────────────── */

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusColor(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    'New': 'info',
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
    Released: 'success',
  }
  return map[status] ?? 'default'
}

const ALL_STATUSES: CWAppointmentStatus[] = [
  'New',
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
  'Released',
]

/* ── Premium Stat Card ── */

const cardShine = {
  '@keyframes cardShine': {
    '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
    '100%': { transform: 'translateX(200%) skewX(-15deg)' },
  },
} as const

function StatCard({
  icon, title, value, gradient,
}: {
  icon: React.ReactNode; title: string; value: number; gradient: string
}) {
  return (
    <Box sx={{
      flex: 1, minWidth: 180, borderRadius: radii.lg, background: gradient,
      color: '#fff', p: 2.5, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s cubic-bezier(0.32,0.72,0,1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.12)',
        '& .card-shine': { animation: 'cardShine 0.6s ease forwards' },
      },
      '&::before': {
        content: '""', position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
      },
      '&::after': {
        content: '""', position: 'absolute', bottom: -40, left: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      },
      ...cardShine,
    }}>
      <Box className="card-shine" sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
      }} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, position: 'relative', zIndex: 2 }}>
        <Box sx={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 2, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Box>
  )
}

/* ── Styled table tokens ── */

const sectionSx = {
  borderRadius: radii.lg,
  border: `1px solid ${colors.border.default}`,
  background: colors.bg.card,
  boxShadow: shadows.card,
  overflow: 'hidden',
} as const

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
} as const

const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

/* ═══════════════════════ Main Component ═══════════════════ */

export function AppointmentsPage() {
  const appointments = useCwStore((s) => s.appointments)
  useCREData()
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<CWAppointmentStatus | ''>('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return appointments.filter((appt) => {
      if (filterStatus && appt.status !== filterStatus) return false
      if (q) {
        const cust = customers.find((c) => c.id === appt.customerId)
        const veh = vehicles.find((v) => v.id === appt.vehicleId)
        const haystack = [
          cust?.fullName ?? '',
          cust?.phone ?? '',
          veh?.registrationNo ?? '',
          veh?.make ?? '',
          veh?.model ?? '',
          appt.status,
          appt.slotDate ?? '',
          appt.notes ?? '',
        ].join(' ')
        if (!includesLoose(haystack, q)) return false
      }
      return true
    })
  }, [appointments, customers, vehicles, query, filterStatus])

  // Stats
  const totalCount = appointments.length
  const activeCount = appointments.filter((a) => a.status !== 'Released' && a.status !== 'Payment Done').length
  const completedCount = appointments.filter((a) => a.status === 'Released' || a.status === 'Payment Done').length

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Page Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{
              fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' },
              color: colors.slate[900], letterSpacing: '-0.02em',
            }}>
              Appointments
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              {totalCount} total · {filtered.length} shown
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={RouterLink}
            to="/cre/appointments/new"
            sx={{
              bgcolor: colors.slate[900],
              fontWeight: 600,
              borderRadius: '10px',
              px: 2.5,
              alignSelf: { xs: 'flex-start', md: 'center' },
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            New Appointment
          </Button>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<CalendarMonth fontSize="small" />}
            title="Total"
            value={totalCount}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <StatCard
            icon={<HourglassTop fontSize="small" />}
            title="Active"
            value={activeCount}
            gradient="linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)"
          />
          <StatCard
            icon={<CheckCircle fontSize="small" />}
            title="Completed"
            value={completedCount}
            gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          />
        </Stack>

        {/* ── Table Section ── */}
        <Box sx={sectionSx}>
          {/* Header with search + filter */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${colors.border.default}` }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                size="small"
                placeholder="Search customer, vehicle, reg…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: '2 1 220px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: radii.sm,
                    fontSize: '0.85rem',
                    bgcolor: colors.bg.page,
                  },
                }}
              />
              <FormControl size="small" sx={{ flex: '1 1 160px' }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as CWAppointmentStatus | '')}
                  sx={{ borderRadius: radii.sm, fontSize: '0.85rem' }}
                >
                  <MenuItem value="">— All —</MenuItem>
                  {ALL_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{
                bgcolor: colors.slate[100], borderRadius: radii.full,
                px: 1.5, py: 0.3, fontSize: '0.75rem', fontWeight: 700, color: colors.slate[600],
                whiteSpace: 'nowrap',
              }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </Box>
            </Stack>
          </Box>

          {/* Table */}
          {filtered.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                No appointments found.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Slot</TableCell>
                  <TableCell>Services</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((appt) => {
                  const cust = customers.find((c) => c.id === appt.customerId)
                  const veh = vehicles.find((v) => v.id === appt.vehicleId)
                  const totalBDT = appt.serviceItems?.reduce((s, i) => s + i.price, 0) ?? 0
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .MuiTableCell-body': bodyCellSx,
                        '&:hover': { background: colors.bg.cardHover },
                      }}
                      onClick={() => navigate(`/cre/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900], fontFamily: 'monospace' }}>
                          {veh?.registrationNo ?? '—'}
                        </Typography>
                        {(veh?.make || veh?.model) && (
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {[veh.make, veh.model].filter(Boolean).join(' ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {cust?.fullName ?? '—'}
                        </Typography>
                        {cust?.phone && (
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {cust.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appt.slotDate ? (
                          <Stack>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                              {fmtDate(appt.slotDate)}
                            </Typography>
                            {appt.slotTime && (
                              <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                                {appt.slotTime}
                              </Typography>
                            )}
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400] }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appt.serviceItems?.length ? (
                          <Stack>
                            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                              {appt.serviceItems.length} service{appt.serviceItems.length !== 1 ? 's' : ''}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                              BDT {totalBDT.toLocaleString('en-BD')}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400] }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={appt.status} color={statusColor(appt.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                          {fmtDate(appt.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View appointment">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            to={`/cre/appointments/${appt.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <Visibility fontSize="small" sx={{ color: colors.slate[500] }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
