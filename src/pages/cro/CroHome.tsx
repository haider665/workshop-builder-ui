import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
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
  CalendarMonth,
  DirectionsCar,
  People,
  Schedule,
  Search,
  Visibility,
  WavingHand,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { colors, radii, shadows } from '../../theme/tokens'

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
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
    'Service Approved': 'success',
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

function actionNeeded(status: string) {
  const map: Record<string, string> = {
    'New': 'Assign Service Advisor',
    'SA Inspection': 'Awaiting SA Inspection',
    'SA Reviewed': 'Send for Customer Approval',
    'Customer Notified': 'Awaiting Customer Response',
    'Customer Approved': 'Assign JC / Diagnosis',
    'Customer Rejected': 'Follow Up with Customer',
    'Diagnosis Assigned': 'Awaiting Diagnosis',
    'Diagnosis In Progress': 'Diagnosis In Progress',
    'Diagnosis Complete': 'Review Diagnosis',
    'Service Assigned': 'Awaiting Service Start',
    'Service In Progress': 'Service In Progress',
    'Service Complete': 'Assign QC',
    'Service Approved': 'Assign QC',
    'QC Assigned': 'Awaiting QC',
    'QC Approved': 'Process Payment',
    'QC Rejected': 'Rework Required',
    'Payment Pending': 'Collect Payment',
    'Payment Done': 'Release Vehicle',
    'Released': 'Completed',
  }
  return map[status] ?? status
}

/* ─────────────── Stat Card (Figma-inspired dark) ────────── */

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

/* ─────────────── Section Card wrapper ────────────────────── */

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

export function CroHome() {
  const navigate = useNavigate()
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const users = useCwStore((s) => s.users)

  const [selectedGateEntryId, setSelectedGateEntryId] = useState<string | null>(null)
  const [make, setMake] = useState('') // repurposed: holds selected vehicleId
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.slotDate === todayStr),
    [appointments, todayStr],
  )
  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== 'Released' && a.status !== 'Payment Done'),
    [appointments],
  )

  // Walk-ins
  const walkIns = useMemo(() => {
    return pendingVehicles
      .filter((p) => p.status === 'Pending')
      .filter((p) => !p.appointmentId)
      .slice()
      .sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
  }, [pendingVehicles])

  const selectedGateEntry = useMemo(() => {
    if (!selectedGateEntryId) return null
    return pendingVehicles.find((p) => p.id === selectedGateEntryId) ?? null
  }, [pendingVehicles, selectedGateEntryId])

  function normalizeRegistrationNo(reg: string) {
    return reg.trim().replace(/\s+/g, ' ').toUpperCase()
  }

  const selectedKnownVehicle = useMemo(() => {
    if (!selectedGateEntry) return null
    const r = normalizeRegistrationNo(selectedGateEntry.registrationNo)
    return vehicles.find((v) => normalizeRegistrationNo(v.registrationNo) === r) ?? null
  }, [selectedGateEntry, vehicles])

  const selectedKnownCustomer = useMemo(() => {
    if (!selectedKnownVehicle) return null
    return customers.find((c) => c.id === selectedKnownVehicle.customerId) ?? null
  }, [customers, selectedKnownVehicle])

  function resetForm() {
    setSelectedGateEntryId(null)
    setMake('')
    setCreatedCustomerId(null)
  }

  function submitExistingWalkIn() {
    if (!selectedGateEntry || !selectedKnownVehicle) return
    navigate(`/cre/appointments/new?vehicleId=${selectedKnownVehicle.id}&pendingVehicleId=${selectedGateEntry.id}`)
  }

  // All appointments sorted + filtered
  const allAppointmentsSorted = useMemo(() => {
    let list = appointments.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) => {
        const veh = vehicles.find((v) => v.id === a.vehicleId)
        const cust = customers.find((c) => c.id === a.customerId)
        return (
          veh?.registrationNo.toLowerCase().includes(q) ||
          cust?.fullName.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [appointments, vehicles, customers, searchQuery])

  // Sub-stats for cards
  const walkinOrders = todayAppointments.filter((a) => pendingVehicles.some((p) => p.appointmentId === a.id)).length
  const previouslyBooked = todayAppointments.length - walkinOrders

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
              Your task stats are ready for today!
            </Typography>
          </Box>
          <Typography sx={{
            color: colors.slate[500],
            fontSize: '0.85rem',
            fontWeight: 500,
            textAlign: 'right',
            display: { xs: 'none', md: 'block' },
          }}>
            {todayFormatted}
          </Typography>
        </Stack>

        {/* ── Stat Cards (Dark, Figma-inspired) ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DashStatCard
            icon={<CalendarMonth fontSize="small" />}
            title="Orders"
            value={todayAppointments.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
            details={[
              { label: 'Walk-in orders', value: walkinOrders },
              { label: 'Previously Booked', value: previouslyBooked },
            ]}
          />
          <DashStatCard
            icon={<Schedule fontSize="small" />}
            title="Active / In Progress"
            value={activeAppointments.length}
            gradient="linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)"
            details={[
              { label: 'Individual', value: customers.filter((c) => c.type === 'Individual').length },
              { label: 'Corporate', value: customers.filter((c) => c.type === 'Corporate').length },
            ]}
          />
          <DashStatCard
            icon={<People fontSize="small" />}
            title="Total Customers"
            value={customers.length}
            gradient="linear-gradient(135deg, #334155 0%, #475569 100%)"
          />
          <DashStatCard
            icon={<DirectionsCar fontSize="small" />}
            title="Walk-ins Pending"
            value={walkIns.length}
            gradient={walkIns.length > 0 ? 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)' : 'linear-gradient(135deg, #334155 0%, #475569 100%)'}
          />
        </Stack>

        {/* ── Walk-ins Section ── */}
        {walkIns.length > 0 && (
          <Box sx={sectionSx}>
            <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                    Walk-ins ({walkIns.length})
                  </Typography>
                  <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                    Temporary gate entries needing customer + vehicle resolution.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Walk-in cards (horizontal scroll, Figma-inspired) */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              px: 3,
              pb: 2.5,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 3, background: colors.slate[300] },
            }}>
              {walkIns.map((p) => {
                const v = vehicles.find((vv) => normalizeRegistrationNo(vv.registrationNo) === normalizeRegistrationNo(p.registrationNo)) ?? null
                const c = v ? customers.find((cc) => cc.id === v.customerId) ?? null : null
                const isSelected = p.id === selectedGateEntryId
                return (
                  <Box
                    key={p.id}
                    sx={{
                      minWidth: 260,
                      maxWidth: 300,
                      borderRadius: radii.md,
                      border: isSelected ? `2px solid ${colors.slate[900]}` : `1px solid ${colors.border.default}`,
                      background: isSelected ? colors.slate[50] : colors.bg.card,
                      p: 2,
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: colors.slate[400] },
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900], mb: 0.5, fontFamily: 'monospace' }}>
                      {p.registrationNo}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mb: 0.5 }}>
                      {c ? c.fullName : 'New customer'} · {v ? [v.make, v.model].filter(Boolean).join(' ') : 'New vehicle'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400], mb: 1.5 }}>
                      {new Date(p.arrivedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    <Button
                      variant={isSelected ? 'outlined' : 'contained'}
                      size="small"
                      fullWidth
                      onClick={() => { setError(null); resetForm(); setSelectedGateEntryId(p.id) }}
                      sx={{
                        bgcolor: isSelected ? 'transparent' : colors.slate[900],
                        color: isSelected ? colors.slate[900] : '#fff',
                        borderColor: isSelected ? colors.slate[900] : undefined,
                        fontWeight: 700,
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        '&:hover': { bgcolor: isSelected ? colors.slate[100] : colors.slate[800] },
                      }}
                    >
                      {isSelected ? 'Selected' : 'Create appointment'}
                    </Button>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {/* ── Resolve Panel ── */}
        {selectedGateEntry && (
          <Box sx={{
            p: 2.5,
            borderRadius: radii.lg,
            border: `2px solid ${colors.slate[900]}`,
            background: colors.bg.card,
            boxShadow: shadows.elevated,
          }}>
            <Stack spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 700, color: colors.slate[900] }}>Resolve Walk-in</Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                  Registration: <strong>{selectedGateEntry.registrationNo}</strong>
                </Typography>
              </Box>
              {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}

              {selectedKnownVehicle && selectedKnownCustomer ? (
                <Stack spacing={2}>
                  <Box sx={{ p: 2, borderRadius: radii.md, border: `1px solid ${colors.border.default}`, background: colors.bg.subtle }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: colors.slate[900] }}>Existing vehicle found</Typography>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                      Customer: <strong>{selectedKnownCustomer.fullName}</strong> · {selectedKnownCustomer.phone}
                    </Typography>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                      Vehicle: <strong>{selectedKnownVehicle.registrationNo}</strong> · {[selectedKnownVehicle.make, selectedKnownVehicle.model].filter(Boolean).join(' ')}
                    </Typography>
                  </Box>
                  <Button variant="contained" size="large" onClick={submitExistingWalkIn} sx={{
                    fontWeight: 700,
                    bgcolor: colors.slate[900],
                    borderRadius: '10px',
                    '&:hover': { bgcolor: colors.slate[800] },
                  }}>
                    Create Appointment for Walk-in
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ borderRadius: '10px' }}>
                    No existing vehicle found for <strong>{selectedGateEntry.registrationNo}</strong>. Select an existing customer & vehicle or create new ones.
                  </Alert>

                  {/* Select existing customer */}
                  <Box sx={{ p: 2, borderRadius: radii.md, border: `1px solid ${colors.border.default}` }}>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, color: colors.slate[900], fontSize: '0.9rem' }}>1) Customer</Typography>
                    <TextField
                      select size="small" label="Select Existing Customer" fullWidth
                      value={createdCustomerId ?? ''}
                      onChange={(e) => setCreatedCustomerId(e.target.value || null)}
                    >
                      <MenuItem value="">— Select —</MenuItem>
                      {customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.fullName} · {c.phone}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="outlined" size="small" sx={{ mt: 1.5, fontWeight: 600, borderColor: colors.slate[300], color: colors.slate[700] }}
                      onClick={() => navigate('/cre/customers/new')}
                    >
                      + Create New Customer
                    </Button>
                  </Box>

                  {/* Select existing vehicle or create */}
                  <Box sx={{ p: 2, borderRadius: radii.md, border: `1px solid ${colors.border.default}` }}>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, color: colors.slate[900], fontSize: '0.9rem' }}>2) Vehicle</Typography>
                    {createdCustomerId ? (
                      <>
                        {(() => {
                          const custVehicles = vehicles.filter((v) => v.customerId === createdCustomerId)
                          if (custVehicles.length === 0) {
                            return (
                              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem', mb: 1 }}>
                                No vehicles for this customer.
                              </Typography>
                            )
                          }
                          return (
                            <TextField
                              select size="small" label="Select Vehicle" fullWidth
                              value={make}
                              onChange={(e) => setMake(e.target.value)}
                              sx={{ mb: 1 }}
                            >
                              <MenuItem value="">— Select —</MenuItem>
                              {custVehicles.map((v) => (
                                <MenuItem key={v.id} value={v.id}>
                                  {v.registrationNo} · {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                                </MenuItem>
                              ))}
                            </TextField>
                          )
                        })()}
                        <Stack direction="row" spacing={1.5}>
                          <Button
                            variant="outlined" size="small" sx={{ fontWeight: 600, borderColor: colors.slate[300], color: colors.slate[700] }}
                            onClick={() => navigate('/cre/vehicles/new')}
                          >
                            + Create New Vehicle
                          </Button>
                          <Button
                            variant="contained" size="large"
                            onClick={() => {
                              try {
                                setError(null)
                                if (!createdCustomerId) throw new Error('Select customer first')
                                const vehicleId = make
                                if (!vehicleId) throw new Error('Select a vehicle')
                                navigate(`/cre/appointments/new?vehicleId=${vehicleId}&pendingVehicleId=${selectedGateEntry!.id}`)
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e))
                              }
                            }}
                            sx={{ fontWeight: 700, bgcolor: colors.slate[900], borderRadius: '10px', '&:hover': { bgcolor: colors.slate[800] } }}
                            disabled={!make}
                          >
                            Create Appointment for Walk-in
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>Select a customer first.</Typography>
                    )}
                  </Box>
                </Stack>
              )}
              <Button variant="text" onClick={resetForm} sx={{ alignSelf: 'flex-start', color: colors.slate[500] }}>Cancel</Button>
            </Stack>
          </Box>
        )}

        {/* ── Appointments Section ── */}
        <Box sx={sectionSx}>
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                  Appointments
                </Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                  List of entered appointments
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Type to Search"
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
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/cre/appointments/new"
                  sx={{
                    bgcolor: colors.slate[900],
                    fontWeight: 600,
                    borderRadius: '10px',
                    px: 2.5,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: colors.slate[800] },
                  }}
                >
                  + New Appointment
                </Button>
              </Stack>
            </Stack>
          </Box>

          {allAppointmentsSorted.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>SA</TableCell>
                  <TableCell>Action Needed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allAppointmentsSorted.slice(0, 50).map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  const cust = customers.find((c) => c.id === a.customerId)
                  const sa = a.assignedSAUserId ? users.find((u) => u.id === a.assignedSAUserId) : null
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .MuiTableCell-body': bodyCellSx,
                        '&:hover': { background: colors.bg.cardHover },
                      }}
                      onClick={() => navigate(`/cre/appointments/${a.id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.slate[900], fontFamily: 'monospace' }}>
                          #{a.id.slice(-6).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {cust?.fullName ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                            {veh ? `${veh.make ?? ''} ${veh.model ?? ''}`.trim() || veh.registrationNo : '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {fmtDate(a.slotDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>
                          {sa?.fullName ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={actionNeeded(a.status)}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            bgcolor: colors.slate[100],
                            color: colors.slate[700],
                            border: `1px solid ${colors.border.default}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={a.status} color={statusColor(a.status)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View appointment">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            to={`/cre/appointments/${a.id}`}
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
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {searchQuery ? 'No appointments match your search.' : 'No appointments yet.'}
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
