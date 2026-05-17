import {
  Alert,
  Box,
  Button,
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
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function CroHome() {
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const createCustomer = useCwStore((s) => s.createCustomer)
  const createVehicle = useCwStore((s) => s.createVehicle)
  const createAppointment = useCwStore((s) => s.createAppointment)
  const resolvePendingVehicle = useCwStore((s) => s.resolvePendingVehicle)

  const [selectedGateEntryId, setSelectedGateEntryId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vin, setVin] = useState('')
  const [odometerKm, setOdometerKm] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [concerns, setConcerns] = useState('')
  const [notes, setNotes] = useState('')

  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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
    setScheduledAt('')
    setConcerns('')
    setNotes('')

    setCreatedCustomerId(null)
    setCreatedVehicleId(null)
  }

  function resetResolveFields() {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setMake('')
    setModel('')
    setVin('')
    setOdometerKm('')
    setScheduledAt('')
    setConcerns('')
    setNotes('')
    setCreatedCustomerId(null)
    setCreatedVehicleId(null)
  }

  function submitExistingWalkIn() {
    try {
      setError(null)
      if (!selectedGateEntry) throw new Error('Select walk-in gate entry')
      if (!selectedGateEntry.isTemporary) throw new Error('Gate entry already resolved')
      if (!selectedKnownVehicle || !selectedKnownCustomer) throw new Error('No existing vehicle found for this registration')

      const createdAppointment = createAppointment({
        customerId: selectedKnownCustomer.id,
        vehicleId: selectedKnownVehicle.id,
        scheduledAt: scheduledAt.trim() || undefined,
        concerns: concerns.trim(),
        notes: notes.trim(),
        status: 'New',
        gateEntryId: selectedGateEntry.id,
      })

      resolvePendingVehicle(selectedGateEntry.id, {
        customerId: selectedKnownCustomer.id,
        vehicleId: selectedKnownVehicle.id,
        appointmentId: createdAppointment.id,
      })

      setSuccessMessage(`Walk-in resolved (existing): ${selectedGateEntry.registrationNo}`)
      setSuccessOpen(true)
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitNewCustomer() {
    try {
      setError(null)
      if (!selectedGateEntry) throw new Error('Select walk-in gate entry')
      if (!selectedGateEntry.isTemporary) throw new Error('Gate entry already resolved')
      if (selectedKnownVehicle) throw new Error('Vehicle already exists for this registration')
      if (!customerName.trim()) throw new Error('Customer full name required')
      if (!customerPhone.trim()) throw new Error('Customer phone required')

      const createdCustomer = createCustomer({
        fullName: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
      })
      setCreatedCustomerId(createdCustomer.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitNewVehicle() {
    try {
      setError(null)
      if (!selectedGateEntry) throw new Error('Select walk-in gate entry')
      if (!createdCustomerId) throw new Error('Create customer first')
      if (!selectedGateEntry.isTemporary) throw new Error('Gate entry already resolved')
      if (selectedKnownVehicle) throw new Error('Vehicle already exists for this registration')

      const odo = odometerKm.trim() ? Number(odometerKm.trim()) : undefined
      if (odometerKm.trim() && Number.isNaN(odo)) throw new Error('Odometer must be a number')

      const createdVehicle = createVehicle({
        customerId: createdCustomerId,
        registrationNo: selectedGateEntry.registrationNo,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        vin: vin.trim() || undefined,
        odometerKm: odo,
      })

      setCreatedVehicleId(createdVehicle.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitNewAppointmentAndResolve() {
    try {
      setError(null)
      if (!selectedGateEntry) throw new Error('Select walk-in gate entry')
      if (!selectedGateEntry.isTemporary) throw new Error('Gate entry already resolved')
      if (!createdCustomerId) throw new Error('Create customer first')
      if (!createdVehicleId) throw new Error('Create vehicle first')

      const createdAppointment = createAppointment({
        customerId: createdCustomerId,
        vehicleId: createdVehicleId,
        scheduledAt: scheduledAt.trim() || undefined,
        concerns: concerns.trim() || undefined,
        notes: notes.trim() || undefined,
        status: 'New',
        gateEntryId: selectedGateEntry.id,
      })

      resolvePendingVehicle(selectedGateEntry.id, {
        customerId: createdCustomerId,
        vehicleId: createdVehicleId,
        appointmentId: createdAppointment.id,
      })

      setSuccessMessage(`Walk-in resolved (new): ${selectedGateEntry.registrationNo}`)
      setSuccessOpen(true)
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page title="CRO" subtitle="Walk-ins, customers, vehicles, appointments.">
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography color="text.secondary">
          UI-only MVP (in-memory). Refresh clears data.
        </Typography>
      </Paper>

      <Paper sx={{ mt: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Walk-ins</Typography>
          <Typography variant="body2" color="text.secondary">
            Temporary gate entries (unknown vehicle). If registration already exists, reuse vehicle + customer.
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
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {walkIns.map((p) => (
                (() => {
                  const v = vehicles.find((vv) => normalizeRegistrationNo(vv.registrationNo) === normalizeRegistrationNo(p.registrationNo)) ?? null
                  const c = v ? customers.find((cc) => cc.id === v.customerId) ?? null : null
                  return (
                <TableRow key={p.id} hover selected={p.id === selectedGateEntryId}>
                  <TableCell sx={{ fontWeight: 800 }}>{p.registrationNo}</TableCell>
                  <TableCell>{c ? c.fullName : <Typography color="text.secondary">New</Typography>}</TableCell>
                  <TableCell>
                    {v ? (
                      <Typography>
                        {v.make || v.model ? `${v.make ?? ''}${v.make && v.model ? ' ' : ''}${v.model ?? ''}` : '—'}
                      </Typography>
                    ) : (
                      <Typography color="text.secondary">New</Typography>
                    )}
                  </TableCell>
                  <TableCell>{new Date(p.arrivedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={p.id === selectedGateEntryId ? 'outlined' : 'contained'}
                      onClick={() => {
                        setError(null)
                        resetResolveFields()
                        setSelectedGateEntryId(p.id)
                      }}
                      sx={{ fontWeight: 900 }}
                    >
                      {p.id === selectedGateEntryId ? 'Selected' : 'Resolve'}
                    </Button>
                  </TableCell>
                </TableRow>
                  )
                })()
              ))}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">No walk-ins right now.</Typography>
          </Box>
        )}
      </Paper>

      {selectedGateEntry ? (
        <Paper sx={{ mt: 2, p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Resolve walk-in</Typography>
              <Typography variant="body2" color="text.secondary">
                Registration: <strong>{selectedGateEntry.registrationNo}</strong>
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {selectedKnownVehicle && selectedKnownCustomer ? (
              <Stack spacing={2}>
                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 900 }}>Existing vehicle found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Customer: <strong>{selectedKnownCustomer.fullName}</strong> ({selectedKnownCustomer.phone})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vehicle:{' '}
                    <strong>
                      {selectedKnownVehicle.registrationNo}
                      {selectedKnownVehicle.make || selectedKnownVehicle.model
                        ? ` · ${selectedKnownVehicle.make ?? ''}${selectedKnownVehicle.make && selectedKnownVehicle.model ? ' ' : ''}${selectedKnownVehicle.model ?? ''}`
                        : ''}
                    </strong>
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 900 }}>Appointment</Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                    <TextField
                      label="Scheduled at (optional)"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      type="datetime-local"
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                    <TextField label="Concerns (optional)" value={concerns} onChange={(e) => setConcerns(e.target.value)} fullWidth />
                    <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
                  </Stack>

                  <Button variant="contained" size="large" onClick={submitExistingWalkIn} sx={{ mt: 2, fontWeight: 900 }}>
                    Create appointment + resolve walk-in
                  </Button>
                </Paper>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 900 }}>1) Customer</Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                    <TextField
                      label="Customer full name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      fullWidth
                      disabled={Boolean(createdCustomerId)}
                    />
                    <TextField
                      label="Customer phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      fullWidth
                      disabled={Boolean(createdCustomerId)}
                    />
                    <TextField
                      label="Customer email (optional)"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      fullWidth
                      disabled={Boolean(createdCustomerId)}
                    />
                  </Stack>

                  <Button variant="contained" onClick={submitNewCustomer} sx={{ mt: 2, fontWeight: 900 }} disabled={Boolean(createdCustomerId)}>
                    {createdCustomerId ? 'Customer created' : 'Create customer'}
                  </Button>
                </Paper>

                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 900 }}>2) Vehicle</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Registration: <strong>{selectedGateEntry.registrationNo}</strong>
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                    <TextField label="Make (optional)" value={make} onChange={(e) => setMake(e.target.value)} fullWidth disabled={!createdCustomerId || Boolean(createdVehicleId)} />
                    <TextField label="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} fullWidth disabled={!createdCustomerId || Boolean(createdVehicleId)} />
                    <TextField label="VIN (optional)" value={vin} onChange={(e) => setVin(e.target.value)} fullWidth disabled={!createdCustomerId || Boolean(createdVehicleId)} />
                    <TextField
                      label="Odometer km (optional)"
                      value={odometerKm}
                      onChange={(e) => setOdometerKm(e.target.value)}
                      fullWidth
                      disabled={!createdCustomerId || Boolean(createdVehicleId)}
                    />
                  </Stack>

                  <Button
                    variant="contained"
                    onClick={submitNewVehicle}
                    sx={{ mt: 2, fontWeight: 900 }}
                    disabled={!createdCustomerId || Boolean(createdVehicleId)}
                  >
                    {createdVehicleId ? 'Vehicle created' : 'Create vehicle'}
                  </Button>
                </Paper>

                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 900 }}>3) Appointment</Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                    <TextField
                      label="Scheduled at (optional)"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      type="datetime-local"
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      disabled={!createdVehicleId}
                    />
                    <TextField label="Concerns (optional)" value={concerns} onChange={(e) => setConcerns(e.target.value)} fullWidth disabled={!createdVehicleId} />
                    <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth disabled={!createdVehicleId} />
                  </Stack>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={submitNewAppointmentAndResolve}
                    sx={{ mt: 2, fontWeight: 900 }}
                    disabled={!createdVehicleId}
                  >
                    Create appointment + resolve walk-in
                  </Button>
                </Paper>
              </Stack>
            )}

            <Button variant="text" onClick={resetForm} sx={{ alignSelf: 'flex-start' }}>
              Cancel
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Page>
  )
}
