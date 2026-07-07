import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ width: 180, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  )
}

export function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const users = useCwStore((s) => s.users)

  const [successOpen, setSuccessOpen] = useState(false)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])

  if (!vehicle) {
    return (
      <Page
        title="Vehicle Information"
        actions={
          <Button variant="outlined" onClick={() => navigate('/cre/vehicles')}>Back</Button>
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

  // Service history from appointments
  const serviceHistory = useMemo(() => {
    return appointments
      .filter((a) => a.vehicleId === v.id)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a, idx) => {
        const sa = a.assignedSAUserId ? users.find((u) => u.id === a.assignedSAUserId) : null
        return {
          id: a.id,
          jobId: `AP-${String(idx + 1).padStart(3, '0')}`,
          vehicle: `${v.make ?? ''} ${v.model ?? ''}`.trim() || v.registrationNo,
          regNo: v.registrationNo,
          serviceAdvisor: sa?.fullName ?? '—',
          date: a.slotDate ? `${a.slotTime ?? ''}\n${a.slotDate}` : '—',
          deliveryDate: a.slotDate ? `${a.slotTime ?? ''}\n${a.slotDate}` : 'N/A',
          mileage: typeof v.odometerKm === 'number' ? `${v.odometerKm.toLocaleString()}km` : '—',
        }
      })
  }, [appointments, v, users])

  return (
    <Page
      title="Vehicle Information"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" sx={{ fontWeight: 700 }}>+ Edit Details</Button>
          <Button variant="outlined" sx={{ fontWeight: 700 }}>Ownership Transfer</Button>
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
          Updated successfully
        </Alert>
      </Snackbar>

      <Stack spacing={3}>
        {/* General Information + Customer — side by side */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* General Information */}
          <Paper sx={{ p: 3, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>General Information</Typography>
            <InfoRow label="Brand" value={v.make} />
            <InfoRow label="Model" value={v.model} />
            <InfoRow label="Vehicle Category" value={v.vehicleCategory} />
            <InfoRow label="Vehicle Size" value={v.vehicleSize} />
            <InfoRow label="Model Variant" value={v.modelVariant} />
            <InfoRow label="Country of Origin" value={v.countryOfOrigin} />
            <InfoRow label="Country of Assembly" value={v.countryOfAssembly} />
            <InfoRow label="VIN" value={v.vin} />
            <InfoRow label="Registration Number" value={v.registrationNo} />
          </Paper>

          {/* Customer */}
          <Paper sx={{ p: 3, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>Customer</Typography>
            <InfoRow label="Customer" value={customer?.fullName} />
            <InfoRow label="Phone Number" value={customer?.phone} />
            <InfoRow label="Email Address" value={customer?.email} />
            <InfoRow label="Driver" value={customer?.driverName ? 'Other Driver' : 'Self Driven'} />
            <InfoRow label="Driver Name" value={customer?.driverName ?? customer?.fullName} />
            <InfoRow label="Driver Number" value={customer?.driverPhone ?? customer?.phone} />
            <InfoRow label="User" value={
              (customer?.type ?? 'Individual') === 'Corporate' ? 'Corporate Use' : 'Personal Use'
            } />
          </Paper>
        </Stack>

        {/* Service History */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900 }}>Service History</Typography>
          </Box>
          {serviceHistory.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">No service history.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Job ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Service Advisor</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Delivery Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Last Recorded mileage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceHistory.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/cre/appointments/${row.id}`)}
                  >
                    <TableCell>{row.jobId}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.vehicle}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.regNo}</Typography>
                    </TableCell>
                    <TableCell>{row.serviceAdvisor}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{row.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{row.deliveryDate}</Typography>
                    </TableCell>
                    <TableCell>{row.mileage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Others */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Others</Typography>
          <InfoRow label="Exterior Colour" value={v.exteriorColor} />
          <InfoRow label="Exterior Colour Code" value={v.exteriorColorCode} />
          <InfoRow label="Interior Colour" value={v.interiorColor} />
          <InfoRow label="Interior Colour Code" value={v.interiorColorCode} />
          <InfoRow label="Tyre Size" value={v.tyreSize} />
          <InfoRow label="Additional Notes" value={v.additionalNotes} />
        </Paper>
      </Stack>
    </Page>
  )
}
