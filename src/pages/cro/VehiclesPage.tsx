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

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function VehiclesPage() {
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const createVehicle = useCwStore((s) => s.createVehicle)

  const [searchParams] = useSearchParams()

  const [customerId, setCustomerId] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vin, setVin] = useState('')
  const [odometerKm, setOdometerKm] = useState<string>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const fromQuery = (searchParams.get('customerId') ?? '').trim()
    if (fromQuery && customers.some((c) => c.id === fromQuery)) setCustomerId(fromQuery)
  }, [searchParams, customers])

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return vehicles
    return vehicles.filter((v) => {
      if (includesLoose(v.registrationNo, q)) return true
      const c = customerById.get(v.customerId)
      if (c && (includesLoose(c.fullName, q) || includesLoose(c.phone, q) || (c.email && includesLoose(c.email, q)))) return true
      if (v.make && includesLoose(v.make, q)) return true
      if (v.model && includesLoose(v.model, q)) return true
      if (v.vin && includesLoose(v.vin, q)) return true
      return false
    })
  }, [vehicles, query, customerById])

  function submit() {
    try {
      setError(null)
      const odo = odometerKm.trim() ? Number(odometerKm.trim()) : undefined
      const created = createVehicle({
        customerId,
        registrationNo,
        make,
        model,
        vin,
        odometerKm: odo,
      })
      setRegistrationNo('')
      setMake('')
      setModel('')
      setVin('')
      setOdometerKm('')
      setSuccessMessage(`Vehicle registered: ${created.registrationNo}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function customerLabel(id: string) {
    const c = customerById.get(id)
    return c ? `${c.fullName} (${c.phone})` : '—'
  }

  return (
    <Page title="CRO / Vehicles" subtitle="Register and search vehicles. Update odometer at each visit.">
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
              <Typography sx={{ fontWeight: 900 }}>Register vehicle</Typography>
              <Typography variant="body2" color="text.secondary">
                Duplicate registration blocked.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(String(e.target.value))}>
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
              <TextField label="Registration No" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Make (optional)" value={make} onChange={(e) => setMake(e.target.value)} fullWidth />
              <TextField label="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} fullWidth />
              <TextField label="VIN (optional)" value={vin} onChange={(e) => setVin(e.target.value)} fullWidth />
              <TextField
                label="Odometer km (optional)"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                fullWidth
              />
            </Stack>

            <Button variant="contained" size="large" onClick={submit} sx={{ fontWeight: 900 }}>
              Register
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Vehicles</Typography>
            <Typography variant="body2" color="text.secondary">
              Search by registration, customer, VIN, make/model.
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
                  <TableCell sx={{ fontWeight: 800 }}>Registration</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Odometer</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{v.registrationNo}</TableCell>
                      <TableCell>{customerLabel(v.customerId)}</TableCell>
                      <TableCell>
                        {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>{typeof v.odometerKm === 'number' ? `${v.odometerKm}` : '—'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" component={RouterLink} to={`/cro/vehicles/${v.id}`}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No vehicles found.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
