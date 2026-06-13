import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from '@mui/material'
import { DirectionsCar, ExpandMore } from '@mui/icons-material'
import { useCwStore } from '../store/cwStore'

type Props = {
  appointmentId: string
  defaultExpanded?: boolean
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  )
}

export function VehicleInfoBanner({ appointmentId, defaultExpanded = false }: Props) {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const appt = appointments.find((a) => a.id === appointmentId)
  if (!appt) return null

  const vehicle = vehicles.find((v) => v.id === appt.vehicleId)
  const customer = customers.find((c) => c.id === appt.customerId)

  const brandModel = vehicle
    ? [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
    : '—'

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        '&:before': { display: 'none' },
        boxShadow: 'none',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{ bgcolor: 'action.hover', minHeight: 48, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, my: 0.5 } }}
      >
        <DirectionsCar fontSize="small" color="primary" />
        <Typography sx={{ fontWeight: 800 }}>
          {vehicle?.registrationNo ?? '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {brandModel}
        </Typography>
        <Chip size="small" label={customer?.fullName ?? '—'} sx={{ fontWeight: 600, ml: 'auto', mr: 1 }} />
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          {/* Vehicle fields */}
          <Field label="Registration" value={vehicle?.registrationNo} />
          <Field label="Brand / Model" value={brandModel} />
          <Field label="VIN" value={vehicle?.vin} />
          <Field label="Category" value={vehicle?.vehicleCategory} />
          <Field label="Size" value={vehicle?.vehicleSize} />
          <Field label="Variant" value={vehicle?.modelVariant} />
          <Field label="Ext. Color" value={vehicle?.exteriorColor} />
          <Field label="Int. Color" value={vehicle?.interiorColor} />
          <Field label="Tyre Size" value={vehicle?.tyreSize} />
          <Field label="Odometer" value={
            typeof vehicle?.odometerKm === 'number'
              ? `${vehicle.odometerKm.toLocaleString()} km`
              : undefined
          } />
          {/* Customer fields */}
          <Field label="Customer" value={customer?.fullName} />
          <Field label="Phone" value={customer?.phone} />
          <Field label="Email" value={customer?.email} />
          <Field label="Type" value={customer?.type} />
          {/* Appointment */}
          <Field label="Status" value={appt.status} />
          {appt.currentMileage && <Field label="Mileage (Check-in)" value={`${appt.currentMileage.toLocaleString()} km`} />}
          {appt.currentFuelLevel && <Field label="Fuel Level" value={appt.currentFuelLevel} />}
        </Stack>
        {vehicle?.additionalNotes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            <strong>Notes:</strong> {vehicle.additionalNotes}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
