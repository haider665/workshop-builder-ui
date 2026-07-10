import {
  Alert,
  Box,
  Button,
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
import { Add, DirectionsCar, HourglassEmpty, CheckCircle, Search } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'

/* ─── chip helpers (defined outside component to prevent focus-loss) ─── */

function statusChip(status: string) {
  if (status === 'Pending')
    return <Chip size="small" color="warning" label="Pending" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="success" label="Job Created" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

function apptChip(status: string) {
  if (status === 'New') return <Chip size="small" color="info" label="New" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'SA Inspection') return <Chip size="small" color="primary" label="Inspection" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'Payment Done') return <Chip size="small" color="success" label="Paid" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'Released') return <Chip size="small" color="success" label="Released" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="default" label={status} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

export function PendingVehiclesPage() {
  const navigate = useNavigate()

  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const createPendingVehicle = useCwStore((s) => s.createPendingVehicle)

  const [registrationNo, setRegistrationNo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    return pendingVehicles.slice().sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
  }, [pendingVehicles])

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter((p) => p.registrationNo.toLowerCase().includes(q))
  }, [sorted, search])

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v] as const)), [vehicles])
  const appointmentById = useMemo(() => new Map(appointments.map((a) => [a.id, a] as const)), [appointments])

  const pendingCount = useMemo(() => pendingVehicles.filter((p) => p.status === 'Pending').length, [pendingVehicles])
  const completedCount = useMemo(() => pendingVehicles.filter((p) => p.status !== 'Pending').length, [pendingVehicles])

  function labelCustomer(customerId?: string) {
    if (!customerId) return '—'
    const c = customerById.get(customerId)
    return c ? `${c.fullName} (${c.phone})` : '—'
  }

  function labelVehicle(vehicleId?: string) {
    if (!vehicleId) return '—'
    const v = vehicleById.get(vehicleId)
    if (!v) return '—'
    const mm = [v.make, v.model].filter(Boolean).join(' ')
    return mm ? `${v.registrationNo} (${mm})` : v.registrationNo
  }

  function addPending() {
    try {
      setError(null)
      createPendingVehicle({ registrationNo })
      setRegistrationNo('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Pending Vehicles
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Gate entries waiting for job creation (links appointments when available).
            </Typography>
          </Box>
        </Stack>

        {/* ── Error ── */}
        {error ? (
          <Alert severity="error" sx={{ borderRadius: radii.sm }}>
            {error}
          </Alert>
        ) : null}

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="Total"
            value={pendingVehicles.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <StatCard
            icon={<HourglassEmpty fontSize="small" />}
            title="Pending"
            value={pendingCount}
            gradient="linear-gradient(135deg, #D97706 0%, #F59E0B 100%)"
          />
          <StatCard
            icon={<CheckCircle fontSize="small" />}
            title="Job Created"
            value={completedCount}
            gradient="linear-gradient(135deg, #059669 0%, #10B981 100%)"
          />
        </Stack>

        {/* ── Add Pending Vehicle ── */}
        <SectionCard title="Add Pending Vehicle" icon={<Add sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g., KL 01 AB 1234"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DirectionsCar sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radii.sm,
                  fontSize: '0.85rem',
                  bgcolor: colors.bg.page,
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={addPending}
              disabled={!registrationNo.trim()}
              sx={{
                bgcolor: colors.slate[900],
                fontWeight: 600,
                borderRadius: '10px',
                px: 2.5,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: colors.slate[800] },
              }}
            >
              Add
            </Button>
          </Stack>
          <Typography sx={{ mt: 1, fontSize: '0.78rem', color: colors.slate[400] }}>
            MVP note: pending vehicles created by Guard Entry.
          </Typography>
        </SectionCard>

        {/* ── Queue Table ── */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}>
                <HourglassEmpty sx={{ fontSize: '1rem' }} />
              </Box>
              <Typography sx={tableHeaderTitleSx}>Queue</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {filtered.length}
              </Box>
            </Stack>
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search registration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                '& .MuiOutlinedInput-root': {
                  borderRadius: radii.sm,
                  fontSize: '0.85rem',
                  bgcolor: colors.bg.page,
                },
                maxWidth: 240,
              }}
            />
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                <TableCell>Registration</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Appointment</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Arrived</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((p) => {
                const appt = p.appointmentId ? appointmentById.get(p.appointmentId) : undefined
                return (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      '& .MuiTableCell-body': bodyCellSx,
                      ...(p.isTemporary ? { backgroundColor: colors.bg.subtle } : undefined),
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: colors.slate[900] }}>{p.registrationNo}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        {p.isTemporary
                          ? <Chip size="small" color="warning" label="Temporary" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                          : <Chip size="small" label="Known" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {appt ? (
                        <Stack spacing={0.5}>
                          <Box>{apptChip(appt.status)}</Box>
                          <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                            {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString() : '—'}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ color: colors.slate[400] }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>{labelCustomer(p.customerId ?? appt?.customerId)}</TableCell>
                    <TableCell>{labelVehicle(p.vehicleId ?? appt?.vehicleId)}</TableCell>
                    <TableCell>{statusChip(p.status)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>
                        {new Date(p.arrivedAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        disabled={p.status !== 'Pending'}
                        onClick={() => navigate(`/jc/jobs/new?pendingVehicleId=${encodeURIComponent(p.id)}`)}
                        sx={{
                          bgcolor: colors.slate[900],
                          fontWeight: 600,
                          borderRadius: '10px',
                          px: 2,
                          fontSize: '0.78rem',
                          '&:hover': { bgcolor: colors.slate[800] },
                        }}
                      >
                        Create Job
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length ? null : (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>
                      No pending vehicles.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Box>
  )
}
