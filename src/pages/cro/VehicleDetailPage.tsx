import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const jobs = useCwStore((s) => s.jobs)
  const updateVehicle = useCwStore((s) => s.updateVehicle)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])

  const [odometerKm, setOdometerKm] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    if (!vehicle) return
    setOdometerKm(typeof vehicle.odometerKm === 'number' ? String(vehicle.odometerKm) : '')
  }, [vehicle?.id, vehicle?.odometerKm])

  if (!vehicle) {
    return (
      <Page
        title="CRO / Vehicles"
        subtitle="Vehicle not found."
        actions={
          <Button variant="outlined" onClick={() => navigate('/cro/vehicles')}>
            Back
          </Button>
        }
      >
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">No record for this vehicle id.</Typography>
        </Paper>
      </Page>
    )
  }

  const v = vehicle

  const customer = customerById.get(v.customerId)
  const jobCount = jobs.filter((j) => j.registrationNo === v.registrationNo).length

  function saveOdometer() {
    try {
      setError(null)
      const next = odometerKm.trim() ? Number(odometerKm.trim()) : undefined
      updateVehicle(v.id, {
        customerId: v.customerId,
        registrationNo: v.registrationNo,
        make: v.make,
        model: v.model,
        vin: v.vin,
        odometerKm: next,
        status: v.status,
      })
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page
      title={`CRO / Vehicles / ${v.registrationNo}`}
      subtitle="Vehicle detail and odometer update."
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/cro/vehicles')}>
            Back
          </Button>
          <Button variant="outlined" component={RouterLink} to={`/vehicle-history/${encodeURIComponent(v.registrationNo)}`}>
            History
          </Button>
        </Stack>
      }
    >
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Odometer updated
        </Alert>
      </Snackbar>

      <Stack spacing={2}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Summary</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`Customer: ${customer ? customer.fullName : '—'}`} />
              <Chip size="small" label={`Make/Model: ${[v.make, v.model].filter(Boolean).join(' ') || '—'}`} />
              <Chip size="small" label={`VIN: ${v.vin ?? '—'}`} />
              <Chip size="small" label={`Status: ${v.status}`} />
              <Chip size="small" label={`Jobs: ${jobCount}`} />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Odometer</Typography>
              <Typography variant="body2" color="text.secondary">
                Update at each visit.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Odometer km"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              fullWidth
            />

            <Divider />

            <Button variant="contained" size="large" onClick={saveOdometer} sx={{ fontWeight: 900 }}>
              Save
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Page>
  )
}
