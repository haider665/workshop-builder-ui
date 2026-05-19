import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { CalendarMonth, DirectionsCar, People, Schedule } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(time?: string) {
  return time ?? ''
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', flex: 1, minWidth: 180 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ bgcolor: `${color}`, color: 'white', borderRadius: 2, p: 1, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  )
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
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

export function CroHome() {
  const navigate = useNavigate()
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const users = useCwStore((s) => s.users)
  const createCustomer = useCwStore((s) => s.createCustomer)
  const createVehicle = useCwStore((s) => s.createVehicle)
  const resolvePendingVehicle = useCwStore((s) => s.resolvePendingVehicle)

  const [selectedGateEntryId, setSelectedGateEntryId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vin, setVin] = useState('')
  const [odometerKm, setOdometerKm] = useState('')
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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
  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => a.slotDate && a.slotDate > todayStr).sort((a, b) => (a.slotDate ?? '').localeCompare(b.slotDate ?? '')),
    [appointments, todayStr],
  )

  // Walk-ins
  const walkIns = useMemo(() => {
    return pendingVehicles
      .filter((p) => p.status === 'Pending')
      .filter((p) => p.isTemporary)
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
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setMake('')
    setModel('')
    setVin('')
    setOdometerKm('')
    setCreatedCustomerId(null)
  }

  function submitExistingWalkIn() {
    try {
      setError(null)
      if (!selectedGateEntry || !selectedKnownVehicle || !selectedKnownCustomer) throw new Error('No existing vehicle found')
      resolvePendingVehicle(selectedGateEntry.id, {
        customerId: selectedKnownCustomer.id,
        vehicleId: selectedKnownVehicle.id,
      })
      setSuccessMessage(`Walk-in resolved: ${selectedGateEntry.registrationNo}`)
      setSuccessOpen(true)
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitNewCustomer() {
    try {
      setError(null)
      if (!customerName.trim()) throw new Error('Customer name required')
      if (!customerPhone.trim()) throw new Error('Customer phone required')
      const created = createCustomer({
        fullName: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
      })
      setCreatedCustomerId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitNewVehicleAndResolve() {
    try {
      setError(null)
      if (!selectedGateEntry || !createdCustomerId) throw new Error('Create customer first')
      const odo = odometerKm.trim() ? Number(odometerKm.trim()) : undefined
      const createdVehicle = createVehicle({
        customerId: createdCustomerId,
        registrationNo: selectedGateEntry.registrationNo,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        vin: vin.trim() || undefined,
        odometerKm: odo,
      })
      resolvePendingVehicle(selectedGateEntry.id, {
        customerId: createdCustomerId,
        vehicleId: createdVehicle.id,
      })
      setSuccessMessage(`Walk-in resolved (new): ${selectedGateEntry.registrationNo}`)
      setSuccessOpen(true)
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // All appointments sorted by date
  const allAppointmentsSorted = useMemo(
    () => appointments.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [appointments],
  )

  return (
    <Page title="CRE Dashboard" subtitle="Customer Relationship Executive">
      <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Stack spacing={3}>
        {/* Stats */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<CalendarMonth />} label="Today's Appointments" value={todayAppointments.length} color="#1976d2" />
          <StatCard icon={<Schedule />} label="Active / In Progress" value={activeAppointments.length} color="#ed6c02" />
          <StatCard icon={<People />} label="Total Customers" value={customers.length} color="#2e7d32" />
          <StatCard icon={<DirectionsCar />} label="Walk-ins Pending" value={walkIns.length} color="#9c27b0" />
        </Stack>

        {/* Walk-ins */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>
              Walk-ins ({walkIns.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Temporary gate entries needing customer + vehicle resolution.
            </Typography>
          </Box>
          <Divider />
          {walkIns.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Registration</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Arrived</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {walkIns.map((p) => {
                  const v = vehicles.find((vv) => normalizeRegistrationNo(vv.registrationNo) === normalizeRegistrationNo(p.registrationNo)) ?? null
                  const c = v ? customers.find((cc) => cc.id === v.customerId) ?? null : null
                  return (
                    <TableRow key={p.id} hover selected={p.id === selectedGateEntryId}>
                      <TableCell sx={{ fontWeight: 800 }}>{p.registrationNo}</TableCell>
                      <TableCell>{c ? c.fullName : <Typography variant="body2" color="text.secondary">New</Typography>}</TableCell>
                      <TableCell>{v ? [v.make, v.model].filter(Boolean).join(' ') || '—' : <Typography variant="body2" color="text.secondary">New</Typography>}</TableCell>
                      <TableCell>{new Date(p.arrivedAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant={p.id === selectedGateEntryId ? 'outlined' : 'contained'}
                          onClick={() => { setError(null); resetForm(); setSelectedGateEntryId(p.id) }}
                          sx={{ fontWeight: 900 }}
                        >
                          {p.id === selectedGateEntryId ? 'Selected' : 'Resolve'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2.5 }}>
              <Typography color="text.secondary">No walk-ins pending.</Typography>
            </Box>
          )}
        </Paper>

        {/* Resolve Panel */}
        {selectedGateEntry && (
          <Paper sx={{ p: 2.5, border: '2px solid', borderColor: 'warning.main' }}>
            <Stack spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Resolve Walk-in</Typography>
                <Typography variant="body2" color="text.secondary">
                  Registration: <strong>{selectedGateEntry.registrationNo}</strong>
                </Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}

              {selectedKnownVehicle && selectedKnownCustomer ? (
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>Existing vehicle found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customer: <strong>{selectedKnownCustomer.fullName}</strong> · {selectedKnownCustomer.phone}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vehicle: <strong>{selectedKnownVehicle.registrationNo}</strong> · {[selectedKnownVehicle.make, selectedKnownVehicle.model].filter(Boolean).join(' ')}
                    </Typography>
                  </Paper>
                  <Button variant="contained" size="large" onClick={submitExistingWalkIn} sx={{ fontWeight: 900 }}>
                    Resolve walk-in
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1.5 }}>1) Customer</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField label="Full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth disabled={!!createdCustomerId} />
                      <TextField label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} fullWidth disabled={!!createdCustomerId} />
                      <TextField label="Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} fullWidth disabled={!!createdCustomerId} />
                    </Stack>
                    <Button variant="contained" onClick={submitNewCustomer} sx={{ mt: 2, fontWeight: 900 }} disabled={!!createdCustomerId}>
                      {createdCustomerId ? 'Customer created ✓' : 'Create customer'}
                    </Button>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1.5 }}>2) Vehicle</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField label="Make" value={make} onChange={(e) => setMake(e.target.value)} fullWidth disabled={!createdCustomerId} />
                      <TextField label="Model" value={model} onChange={(e) => setModel(e.target.value)} fullWidth disabled={!createdCustomerId} />
                      <TextField label="VIN" value={vin} onChange={(e) => setVin(e.target.value)} fullWidth disabled={!createdCustomerId} />
                      <TextField label="Odometer km" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} fullWidth disabled={!createdCustomerId} />
                    </Stack>
                    <Button variant="contained" size="large" onClick={submitNewVehicleAndResolve} sx={{ mt: 2, fontWeight: 900 }} disabled={!createdCustomerId}>
                      Create vehicle + resolve
                    </Button>
                  </Paper>
                </Stack>
              )}
              <Button variant="text" onClick={resetForm} sx={{ alignSelf: 'flex-start' }}>Cancel</Button>
            </Stack>
          </Paper>
        )}

        {/* All Appointments List */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>
                  All Appointments ({appointments.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Follow up, remind, and manage all customer appointments.
                </Typography>
              </Box>
              <Button variant="contained" component={RouterLink} to="/cre/appointments/new" sx={{ fontWeight: 700 }}>
                + New Appointment
              </Button>
            </Stack>
          </Box>
          <Divider />
          {allAppointmentsSorted.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SA</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allAppointmentsSorted.slice(0, 50).map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  const cust = customers.find((c) => c.id === a.customerId)
                  const sa = a.assignedSAUserId ? users.find((u) => u.id === a.assignedSAUserId) : null
                  return (
                    <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cre/appointments/${a.id}`)}>
                      <TableCell sx={{ fontWeight: 700 }}>{veh?.registrationNo ?? '—'}</TableCell>
                      <TableCell>{cust?.fullName ?? '—'}</TableCell>
                      <TableCell>{fmtDate(a.slotDate)}</TableCell>
                      <TableCell>{fmtTime(a.slotTime)}</TableCell>
                      <TableCell>{sa?.fullName ?? '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={a.status} color={statusColor(a.status)} sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" component={RouterLink} to={`/cre/appointments/${a.id}`}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2.5 }}>
              <Typography color="text.secondary">No appointments yet.</Typography>
            </Box>
          )}
        </Paper>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>
                Upcoming ({upcomingAppointments.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Follow up and remind customers of upcoming appointments.
              </Typography>
            </Box>
            <Divider />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingAppointments.slice(0, 20).map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  const cust = customers.find((c) => c.id === a.customerId)
                  return (
                    <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cre/appointments/${a.id}`)}>
                      <TableCell sx={{ fontWeight: 700 }}>{veh?.registrationNo ?? '—'}</TableCell>
                      <TableCell>{cust?.fullName ?? '—'}</TableCell>
                      <TableCell>{fmtDate(a.slotDate)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={a.status} color={statusColor(a.status)} sx={{ fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        )}
        {/* Calendar */}
        <AppointmentCalendar
          appointments={appointments}
          vehicleRegById={useMemo(() => {
            const m = new Map<string, string>()
            for (const v of vehicles) m.set(v.id, v.registrationNo)
            return m
          }, [vehicles])}
          customerNameById={useMemo(() => {
            const m = new Map<string, string>()
            for (const c of customers) m.set(c.id, c.fullName)
            return m
          }, [customers])}
          basePath="/cre/appointments"
        />
      </Stack>
    </Page>
  )
}
