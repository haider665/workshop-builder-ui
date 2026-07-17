import {
  Box,
  Chip,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Assignment,
  FiberNew,
  MedicalServices,
  Search,
  Warning,
  WavingHand,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWAppointmentStatus } from '../../types/cw'

/* ─────────────────────── Helpers ─────────────────────────── */

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

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
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
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

// JC sees everything except Released (finished)
const JC_RELEVANT_STATUSES: CWAppointmentStatus[] = [
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
]

const DIAGNOSIS_SERVICE_STATUSES: CWAppointmentStatus[] = [
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Approval Pending',
  'Service Approved',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
]

/* ─────────────── Stat Card (Dark, Figma-inspired) ────────── */

function DashStatCard({
  icon,
  title,
  value,
  gradient,
  details,
}: {
  icon: React.ReactNode
  title: string
  value: number
  gradient: string
  details?: { label: string; value: number }[]
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 200,
        borderRadius: radii.lg,
        background: gradient,
        color: '#fff',
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{
          bgcolor: 'rgba(255,255,255,0.18)',
          borderRadius: '10px',
          p: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, mb: details ? 1.5 : 0 }}>
        {value}
      </Typography>
      {details && (
        <Stack spacing={0.5} sx={{ mt: 'auto' }}>
          {details.map((d) => (
            <Stack key={d.label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.75 }}>{d.label}</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{d.value}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  )
}

/* ─────────────── Section + Table styles ───────────────────── */

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

export function JobControllerHome() {
  const navigate = useNavigate()
  useBackendData()
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const [searchQuery, setSearchQuery] = useState('')

  const relevant = useMemo(
    () =>
      appointments
        .filter((a) => JC_RELEVANT_STATUSES.includes(a.status))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [appointments],
  )

  const needsAction = useMemo(
    () => relevant.filter((a) => ['Customer Approved', 'Service Approved', 'QC Rejected'].includes(a.status)),
    [relevant],
  )

  const newAppointments = useMemo(
    () => relevant.filter((a) => a.status === 'New'),
    [relevant],
  )

  const diagnosisServiceStage = useMemo(
    () => relevant.filter((a) => DIAGNOSIS_SERVICE_STATUSES.includes(a.status)),
    [relevant],
  )

  // Search-filtered list
  const filteredRelevant = useMemo(() => {
    if (!searchQuery.trim()) return relevant
    const q = searchQuery.toLowerCase()
    return relevant.filter((a) => {
      const veh = vehicles.find((v) => v.id === a.vehicleId)
      const cust = customers.find((c) => c.id === a.customerId)
      return (
        veh?.registrationNo.toLowerCase().includes(q) ||
        [veh?.make, veh?.model].filter(Boolean).join(' ').toLowerCase().includes(q) ||
        cust?.fullName.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      )
    })
  }, [relevant, vehicles, customers, searchQuery])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Greeting Header ── */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <WavingHand sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <Typography sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}>
                {getGreeting()}!
              </Typography>
            </Stack>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Job Controller Dashboard — Assignment queue, diagnosis & service workflow
            </Typography>
          </Box>
        </Stack>

        {/* ── Stat Cards (Dark, Figma-inspired) ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DashStatCard
            icon={<Warning fontSize="small" />}
            title="Needs Action"
            value={needsAction.length}
            gradient={needsAction.length > 0
              ? 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)'
              : 'linear-gradient(135deg, #334155 0%, #475569 100%)'}
            details={[
              { label: 'Customer Approved', value: needsAction.filter((a) => a.status === 'Customer Approved').length },
              { label: 'Service Approved', value: needsAction.filter((a) => a.status === 'Service Approved').length },
              { label: 'QC Rejected', value: needsAction.filter((a) => a.status === 'QC Rejected').length },
            ]}
          />
          <DashStatCard
            icon={<Assignment fontSize="small" />}
            title="In Pipeline"
            value={relevant.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <DashStatCard
            icon={<FiberNew fontSize="small" />}
            title="New Appointments"
            value={newAppointments.length}
            gradient="linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
          />
          <DashStatCard
            icon={<MedicalServices fontSize="small" />}
            title="Diagnosis / Service"
            value={diagnosisServiceStage.length}
            gradient="linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)"
            details={[
              { label: 'Diagnosis stage', value: diagnosisServiceStage.filter((a) => a.status.startsWith('Diagnosis')).length },
              { label: 'Service stage', value: diagnosisServiceStage.filter((a) => a.status.startsWith('Service')).length },
            ]}
          />
        </Stack>

        {/* ── Appointment Queue ── */}
        <Box sx={sectionSx}>
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                  Appointment Queue
                </Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                  Click to assign SA + time for diagnosis, or SA + bay for services.
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search by reg, name, status…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 260 }}
              />
            </Stack>
          </Box>

          {filteredRelevant.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {searchQuery ? 'No appointments match your search.' : 'No appointments in queue.'}
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Concerns</TableCell>
                  <TableCell>Services</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRelevant.map((appt) => {
                  const v = vehicles.find((x) => x.id === appt.vehicleId)
                  const c = customers.find((x) => x.id === appt.customerId)
                  return (
                    <TableRow
                      key={appt.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .MuiTableCell-body': bodyCellSx,
                        '&:hover': { background: colors.bg.cardHover },
                      }}
                      onClick={() => navigate(`/jc/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        <Stack>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: colors.slate[900] }}>
                            {v?.registrationNo ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {[v?.make, v?.model].filter(Boolean).join(' ') || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {c?.fullName ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                          {appt.concernItems.length}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                          {appt.serviceItems.length}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          size="small"
                          color={statusColor(appt.status)}
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {fmtDate(appt.createdAt)}
                        </Typography>
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
