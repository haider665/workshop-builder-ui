import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function PendingVehiclesPage() {
  const navigate = useNavigate()

  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const createPendingVehicle = useCwStore((s) => s.createPendingVehicle)

  const [registrationNo, setRegistrationNo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return pendingVehicles.slice().sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
  }, [pendingVehicles])

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v] as const)), [vehicles])
  const appointmentById = useMemo(() => new Map(appointments.map((a) => [a.id, a] as const)), [appointments])

  function statusChip(status: string) {
    if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
    return <Chip size="small" color="success" label="Job Created" />
  }

  function apptChip(status: string) {
    if (status === 'Confirmed') return <Chip size="small" color="info" label="Confirmed" />
    if (status === 'Vehicle Arrived') return <Chip size="small" color="success" label="Vehicle Arrived" />
    if (status === 'Job Created') return <Chip size="small" color="success" label="Job Created" />
    if (status === 'Cancelled') return <Chip size="small" color="default" label="Cancelled" />
    return <Chip size="small" color="default" label="Draft" />
  }

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
    <Page title="Pending Vehicles" subtitle="Gate entries waiting for job creation (links appointments when available).">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Add pending vehicle</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            fullWidth
            label="Registration No"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            placeholder="e.g., KL 01 AB 1234"
          />
          <Button variant="contained" startIcon={<Add />} onClick={addPending} disabled={!registrationNo.trim()}>
            Add
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          MVP note: pending vehicles created by Guard Entry.
        </Typography>
      </Paper>

      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Queue</Typography>
          <Typography variant="body2" color="text.secondary">
            Create a job for pending vehicles.
          </Typography>
        </Box>
        <Divider />
        <Table size="small">
          <TableHead>
            <TableRow>
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
            {sorted.map((p) => {
              const appt = p.appointmentId ? appointmentById.get(p.appointmentId) : undefined
              return (
                <TableRow key={p.id} hover sx={p.isTemporary ? { backgroundColor: 'action.hover' } : undefined}>
                  <TableCell sx={{ fontWeight: 800 }}>{p.registrationNo}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      {p.isTemporary ? <Chip size="small" color="warning" label="Temporary" /> : <Chip size="small" label="Known" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {appt ? (
                      <Stack spacing={0.5}>
                        <Box>{apptChip(appt.status)}</Box>
                        <Typography variant="body2" color="text.secondary">
                          {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString() : '—'}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>{labelCustomer(p.customerId ?? appt?.customerId)}</TableCell>
                  <TableCell>{labelVehicle(p.vehicleId ?? appt?.vehicleId)}</TableCell>
                  <TableCell>{statusChip(p.status)}</TableCell>
                  <TableCell>{new Date(p.arrivedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={p.status !== 'Pending'}
                      onClick={() => navigate(`/jc/jobs/new?pendingVehicleId=${encodeURIComponent(p.id)}`)}
                    >
                      Create Job
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {sorted.length ? null : (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No pending vehicles.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Page>
  )
}
