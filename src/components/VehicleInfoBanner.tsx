import { Box, Paper, Stack, Typography } from '@mui/material'
import { useCwStore } from '../store/cwStore'

type Props = {
  appointmentId: string
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value ?? '—'}
      </Typography>
    </Box>
  )
}

export function VehicleInfoBanner({ appointmentId }: Props) {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const appt = appointments.find((a) => a.id === appointmentId)
  if (!appt) return null

  const vehicle = vehicles.find((v) => v.id === appt.vehicleId)
  const customer = customers.find((c) => c.id === appt.customerId)

  return (
    <Paper
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <Field label="Registration" value={vehicle?.registrationNo} />
        <Field label="Brand / Model" value={
          vehicle
            ? [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
            : '—'
        } />
        <Field label="VIN" value={vehicle?.vin} />
        <Field label="Category" value={vehicle?.vehicleCategory} />
        <Field label="Customer" value={customer?.fullName} />
        <Field label="Phone" value={customer?.phone} />
        <Field label="Odometer" value={
          typeof vehicle?.odometerKm === 'number'
            ? `${vehicle.odometerKm.toLocaleString()} km`
            : '—'
        } />
        <Field label="Status" value={appt.status} />
      </Stack>
    </Paper>
  )
}
