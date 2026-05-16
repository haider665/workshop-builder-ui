import {
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
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const jobs = useCwStore((s) => s.jobs)

  const customer = customers.find((c) => c.id === customerId)

  if (!customer) {
    return (
      <Page
        title="CRO / Customers"
        subtitle="Customer not found."
        actions={
          <Button variant="outlined" onClick={() => navigate('/cro/customers')}>
            Back
          </Button>
        }
      >
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">No record for this customer id.</Typography>
        </Paper>
      </Page>
    )
  }

  const customerVehicles = vehicles
    .filter((v) => v.customerId === customer.id)
    .slice()
    .sort((a, b) => a.registrationNo.localeCompare(b.registrationNo))

  function jobCountForReg(registrationNo: string) {
    return jobs.filter((j) => j.registrationNo === registrationNo).length
  }

  return (
    <Page
      title={`CRO / Customers / ${customer.fullName}`}
      subtitle="Customer detail (vehicles + history)."
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/cro/customers')}>
            Back
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            to={`/cro/vehicles?customerId=${encodeURIComponent(customer.id)}`}
          >
            Register vehicle
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Summary</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`Phone: ${customer.phone}`} />
              <Chip size="small" label={`Email: ${customer.email ?? '—'}`} />
              <Chip size="small" label={`Status: ${customer.status}`} />
              <Chip size="small" label={`Vehicles: ${customerVehicles.length}`} />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Vehicles</Typography>
            <Typography variant="body2" color="text.secondary">
              Linked vehicles for this customer.
            </Typography>
          </Box>
          <Divider />

          {customerVehicles.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Registration</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Odometer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Jobs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerVehicles.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{v.registrationNo}</TableCell>
                    <TableCell>{[v.make, v.model].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{typeof v.odometerKm === 'number' ? `${v.odometerKm}` : '—'}</TableCell>
                    <TableCell>{jobCountForReg(v.registrationNo)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button size="small" variant="outlined" component={RouterLink} to={`/vehicle-history/${encodeURIComponent(v.registrationNo)}`}>
                          History
                        </Button>
                        <Button size="small" variant="contained" component={RouterLink} to={`/cro/vehicles/${v.id}`}>
                          View
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No vehicles linked.</Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900 }}>Appointments</Typography>
          <Typography variant="body2" color="text.secondary">
            Appointment history comes in Milestone 3 (Appointments).
          </Typography>
        </Paper>
      </Stack>
    </Page>
  )
}
