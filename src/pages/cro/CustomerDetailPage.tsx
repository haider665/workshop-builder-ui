import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Switch,
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

function InfoRow({ label, value }: { label: string; value?: string | number | null | boolean }) {
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value ?? '—'
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ width: 200, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
        {display}
      </Typography>
    </Stack>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', mb: 1 }}>{children}</Typography>
  )
}

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)

  const customer = customers.find((c) => c.id === customerId)

  if (!customer) {
    return (
      <Page
        title="Customer Information"
        actions={
          <Button variant="outlined" onClick={() => navigate('/cre/customers')}>Back</Button>
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

  const customerAppointments = appointments
    .filter((a) => a.customerId === customer.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const isCorporate = customer.type === 'Corporate'

  return (
    <Page
      title="Customer Information"
      subtitle={customer.fullName}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" sx={{ fontWeight: 700 }}>+ Edit Details</Button>
          <Button variant="outlined" onClick={() => navigate('/cre/customers')}>Back</Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {/* Contact */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Contact</SectionTitle>
          <InfoRow label="Customer" value={customer.fullName} />
          <InfoRow label="Phone Number" value={customer.phone} />
          <InfoRow label="Email Address" value={customer.email} />
          <InfoRow label="Type" value={customer.type ?? 'Individual'} />
        </Paper>

        {/* Address */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Address</SectionTitle>
          <InfoRow label="Division" value={customer.address?.division} />
          <InfoRow label="City" value={customer.address?.city} />
          <InfoRow label="Postal Code" value={customer.address?.postalCode} />
          <InfoRow label="Street Address" value={customer.address?.street} />
        </Paper>

        {/* Occupation */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Occupation</SectionTitle>
          <InfoRow label="Occupation Type" value={customer.occupation?.type} />
          <InfoRow label="Company Name" value={customer.occupation?.companyName} />
          <InfoRow label="Designation" value={customer.occupation?.designation} />
        </Paper>

        {/* Driver Info */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Driver</SectionTitle>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ width: 200, flexShrink: 0 }}>
              Driver
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={customer.isSelfDriven !== false} disabled size="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {customer.isSelfDriven !== false ? 'Self Driven' : 'Other Driver'}
              </Typography>
            </Box>
          </Stack>
          <InfoRow label="Driver Name" value={customer.driverName ?? customer.fullName} />
          <InfoRow label="Driver Number" value={customer.driverPhone ?? customer.phone} />
          <Stack
            direction="row"
            sx={{ alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ width: 200, flexShrink: 0 }}>
              User
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={customer.isPersonalUse !== false} disabled size="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {customer.isPersonalUse !== false ? 'Personal Use' : 'Corporate Use'}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Corporate Info (only if Corporate) */}
        {isCorporate && customer.corporate && (
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <SectionTitle>Corporate Details</SectionTitle>
            <InfoRow label="Parent Company" value={customer.corporate.parentCompanyName} />
            <InfoRow label="Transport Officer" value={customer.corporate.transportOfficerName} />
            <InfoRow label="Officer Phone" value={customer.corporate.transportOfficerPhone} />
            <InfoRow label="Officer Email" value={customer.corporate.transportOfficerEmail} />
            <InfoRow label="Transport Manager" value={customer.corporate.transportManagerName} />
            <InfoRow label="Manager Phone" value={customer.corporate.transportManagerPhone} />
            <InfoRow label="Manager Email" value={customer.corporate.transportManagerEmail} />
            <InfoRow label="Note" value={customer.corporate.note} />
          </Paper>
        )}

        {/* Socials */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Socials</SectionTitle>
          <InfoRow label="Whatsapp Link" value={customer.whatsappLink} />
          <InfoRow label="Facebook Link" value={customer.facebookLink} />
          <InfoRow label="Linkedin Link" value={customer.linkedinLink} />
          <InfoRow label="Google Link" value={customer.googleLink} />
        </Paper>

        {/* Vehicles */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle>Vehicles ({customerVehicles.length})</SectionTitle>
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to={`/cre/vehicles?customerId=${encodeURIComponent(customer.id)}`}
              >
                Register Vehicle
              </Button>
            </Stack>
          </Box>
          <Divider />
          {customerVehicles.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Registration</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Odometer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerVehicles.map((v) => (
                  <TableRow key={v.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cre/vehicles/${v.id}`)}>
                    <TableCell sx={{ fontWeight: 700 }}>{v.registrationNo}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.model || v.modelVariant || '—'}</Typography>
                      {v.make && <Typography variant="caption" color="text.secondary">{v.make}</Typography>}
                    </TableCell>
                    <TableCell>{typeof v.odometerKm === 'number' ? `${v.odometerKm.toLocaleString()} km` : '—'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" component={RouterLink} to={`/cre/vehicles/${v.id}`}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2.5 }}>
              <Typography color="text.secondary">No vehicles linked.</Typography>
            </Box>
          )}
        </Paper>

        {/* Appointments */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <SectionTitle>Appointments ({customerAppointments.length})</SectionTitle>
          </Box>
          <Divider />
          {customerAppointments.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerAppointments.map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/cre/appointments/${a.id}`)}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{veh?.registrationNo ?? '—'}</TableCell>
                      <TableCell>{a.slotDate ?? '—'}</TableCell>
                      <TableCell>{a.status}</TableCell>
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
      </Stack>
    </Page>
  )
}
