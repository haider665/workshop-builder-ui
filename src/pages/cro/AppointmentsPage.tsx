import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus } from '../../types/cw'

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function AppointmentsPage() {
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const roles = useCwStore((s) => s.roles)
  const users = useCwStore((s) => s.users)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const appointments = useCwStore((s) => s.appointments)
  const createAppointment = useCwStore((s) => s.createAppointment)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const setAppointmentGateEntry = useCwStore((s) => s.setAppointmentGateEntry)
  const resolvePendingVehicle = useCwStore((s) => s.resolvePendingVehicle)

  const [searchParams] = useSearchParams()

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [concerns, setConcerns] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CWAppointmentStatus>('Draft')
  const [gateEntryId, setGateEntryId] = useState<string>('')
  const [assignedRoleId, setAssignedRoleId] = useState<string>('')
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])

  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const fromQuery = (searchParams.get('customerId') ?? '').trim()
    if (fromQuery && customers.some((c) => c.id === fromQuery)) setCustomerId(fromQuery)
  }, [searchParams, customers])

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v] as const)), [vehicles])
  const pendingById = useMemo(() => new Map(pendingVehicles.map((p) => [p.id, p] as const)), [pendingVehicles])

  const selectedGateEntry = useMemo(() => {
    if (!gateEntryId) return null
    return pendingById.get(gateEntryId) ?? null
  }, [gateEntryId, pendingById])

  const vehiclesForCustomer = useMemo(() => {
    if (!customerId) return []
    return vehicles
      .filter((v) => v.customerId === customerId)
      .slice()
      .sort((a, b) => a.registrationNo.localeCompare(b.registrationNo))
  }, [vehicles, customerId])

  const usersForRole = useMemo(() => {
    const roleId = assignedRoleId.trim()
    if (!roleId) return users
    return users.filter((u) => u.roleIds.includes(roleId))
  }, [users, assignedRoleId])

  const gateEntryOptions = useMemo(() => {
    return pendingVehicles
      .filter((p) => p.status === 'Pending')
      .filter((p) => !p.appointmentId)
      .filter((p) => !p.isTemporary)
      .slice()
      .sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
  }, [pendingVehicles])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return appointments

    return appointments.filter((a) => {
      if (includesLoose(a.status, q)) return true
      if (a.scheduledAt && includesLoose(a.scheduledAt, q)) return true

      const c = customerById.get(a.customerId)
      const v = vehicleById.get(a.vehicleId)
      if (c && (includesLoose(c.fullName, q) || includesLoose(c.phone, q) || (c.email && includesLoose(c.email, q)))) return true
      if (v && includesLoose(v.registrationNo, q)) return true
      if (a.concerns && includesLoose(a.concerns, q)) return true
      if (a.notes && includesLoose(a.notes, q)) return true
      return false
    })
  }, [appointments, query, customerById, vehicleById])

  function submit() {
    try {
      setError(null)

      if (!customerId) throw new Error('Customer is required')
      if (!vehicleId) throw new Error('Vehicle is required')
      if (selectedGateEntry?.isTemporary) throw new Error('Resolve walk-in from CRO home')

      const created = createAppointment({
        customerId,
        vehicleId,
        scheduledAt: scheduledAt.trim() || undefined,
        concerns: concerns.trim(),
        notes: notes.trim(),
        status,
        assignedRoleId: assignedRoleId.trim() || undefined,
        assignedUserIds,
        gateEntryId: gateEntryId || undefined,
      })

      if (gateEntryId) {
        resolvePendingVehicle(gateEntryId, {
          customerId,
          vehicleId,
          appointmentId: created.id,
        })
      }

      setVehicleId('')
      setScheduledAt('')
      setConcerns('')
      setNotes('')
      setGateEntryId('')
      setStatus('Draft')
      setAssignedRoleId('')
      setAssignedUserIds([])

      setSuccessMessage('Appointment created')
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function labelCustomer(id: string) {
    const c = customerById.get(id)
    return c ? `${c.fullName} (${c.phone})` : '—'
  }

  function labelVehicle(id: string) {
    const v = vehicleById.get(id)
    if (!v) return '—'
    const mm = [v.make, v.model].filter(Boolean).join(' ')
    return mm ? `${v.registrationNo} (${mm})` : v.registrationNo
  }

  function labelGateEntry(id?: string) {
    if (!id) return '—'
    const p = pendingById.get(id)
    if (!p) return '—'
    return `${p.registrationNo}${p.isTemporary ? ' (temp)' : ''}`
  }

  return (
    <Page title="CRO / Appointments" subtitle="Create and manage appointments. Guard entry auto-links when exists.">
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

      <Stack spacing={2}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Create appointment</Typography>
              <Typography variant="body2" color="text.secondary">
                Create and link appointments.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  label="Customer"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(String(e.target.value))
                    setVehicleId('')
                  }}
                >
                  {customers
                    .slice()
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.fullName} ({c.phone})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!customerId}>
                <InputLabel>Vehicle</InputLabel>
                <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(String(e.target.value))}>
                  {vehiclesForCustomer.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {labelVehicle(v.id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Scheduled at (optional)"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as CWAppointmentStatus)}>
                  {(['Draft', 'Confirmed', 'Vehicle Arrived', 'Cancelled'] as CWAppointmentStatus[]).map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Role (optional)</InputLabel>
                <Select
                  label="Role (optional)"
                  value={assignedRoleId}
                  onChange={(e) => {
                    const next = String(e.target.value)
                    setAssignedRoleId(next)
                    setAssignedUserIds((prev) => {
                      if (!next) return prev
                      const allowed = new Set(users.filter((u) => u.roleIds.includes(next)).map((u) => u.id))
                      return prev.filter((id) => allowed.has(id))
                    })
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {roles
                    .filter((r) => r.status === 'Active')
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Users (optional)</InputLabel>
                <Select
                  label="Users (optional)"
                  multiple
                  value={assignedUserIds}
                  onChange={(e) => {
                    const v = e.target.value
                    setAssignedUserIds(typeof v === 'string' ? v.split(',') : (v as string[]))
                  }}
                >
                  {usersForRole
                    .filter((u) => u.status === 'Active')
                    .slice()
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.fullName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Gate entry (optional)</InputLabel>
                <Select
                  label="Gate entry (optional)"
                  value={gateEntryId}
                  onChange={(e) => {
                    const id = String(e.target.value)
                    setGateEntryId(id)
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {gateEntryOptions.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.registrationNo} — {new Date(p.arrivedAt).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Concerns (optional)"
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                fullWidth
              />
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
            </Stack>
            <Button variant="contained" size="large" onClick={submit} sx={{ fontWeight: 900 }}>
              Create
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Appointments</Typography>
            <Typography variant="body2" color="text.secondary">
              Search by reg, customer, status.
            </Typography>
          </Box>
          <Divider />

          <Box sx={{ p: 2 }}>
            <TextField label="Search" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
          </Box>

          <Divider />

          {filtered.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Scheduled</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Gate entry</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice()
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map((a) => {
                    const v = vehicleById.get(a.vehicleId)
                    return (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>{labelVehicle(a.vehicleId)}</TableCell>
                        <TableCell>{labelCustomer(a.customerId)}</TableCell>
                        <TableCell>{a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={a.gateEntryId ?? ''}
                              onChange={(e) => {
                                const next = String(e.target.value) || undefined
                                setAppointmentGateEntry(a.id, next)
                              }}
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {pendingVehicles
                                .filter((p) => p.status === 'Pending')
                                .slice()
                                .sort((x, y) => y.arrivedAt.localeCompare(x.arrivedAt))
                                .map((p) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    {labelGateEntry(p.id)}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={a.status}
                              onChange={(e) => setAppointmentStatus(a.id, e.target.value as CWAppointmentStatus)}
                            >
                              {([
                                'Draft',
                                'Confirmed',
                                'Vehicle Arrived',
                                'Job Created',
                                'Cancelled',
                              ] as CWAppointmentStatus[]).map((s) => (
                                <MenuItem key={s} value={s}>
                                  {s}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="right">
                          {v ? (
                            <Button size="small" variant="contained" component={RouterLink} to={`/cro/vehicles/${v.id}`}>
                              Vehicle
                            </Button>
                          ) : (
                            <Button size="small" variant="outlined" disabled>
                              —
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No appointments found.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
