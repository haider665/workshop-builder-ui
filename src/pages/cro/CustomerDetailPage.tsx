import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  Business,
  CalendarMonth,
  DirectionsCar,
  Edit,
  Email,
  Facebook,
  LinkedIn,
  Person,
  Phone,
  Visibility,
  WhatsApp,
  Work,
} from '@mui/icons-material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { colors, radii, shadows } from '../../theme/tokens'

/* ─────────────── Helpers (outside component) ─────────────── */

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null | boolean; icon?: React.ReactNode }) {
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value ?? '—'
  const isEmpty = display === '—'
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}
    >
      {icon && (
        <Box sx={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1 }}>
          {icon}
        </Box>
      )}
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: isEmpty ? 400 : 600, color: isEmpty ? colors.slate[400] : colors.slate[900], flex: 1 }}>
        {display}
      </Typography>
    </Stack>
  )
}

function SectionCard({ title, icon, children, actions }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode
}) {
  return (
    <Box sx={{
      borderRadius: radii.lg,
      border: `1px solid ${colors.border.default}`,
      background: colors.bg.card,
      boxShadow: shadows.card,
      overflow: 'hidden',
    }}>
      <Box sx={{
        px: 3, py: 1.75,
        borderBottom: `1px solid ${colors.border.default}`,
        background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: colors.slate[900], borderRadius: '0 4px 4px 0',
        },
      }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {icon && (
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px',
              background: colors.slate[100], display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: colors.slate[900],
            }}>
              {icon}
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900], letterSpacing: '0.01em', textTransform: 'uppercase' }}>
            {title}
          </Typography>
        </Stack>
        {actions}
      </Box>
      <Box sx={{ px: 3, py: 1.5 }}>
        {children}
      </Box>
    </Box>
  )
}

function statusColor(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
    'New': 'info', 'SA Inspection': 'primary', 'SA Reviewed': 'warning',
    'Customer Approved': 'success', 'Customer Rejected': 'error',
    'Diagnosis In Progress': 'primary', 'Diagnosis Complete': 'success',
    'Service In Progress': 'primary', 'Service Complete': 'success',
    'QC Approved': 'success', 'QC Rejected': 'error',
    'Payment Pending': 'warning', 'Payment Done': 'success', 'Released': 'success',
  }
  return map[status] ?? 'default'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Table Styles ── */

const headerCellSx = {
  background: colors.bg.subtle,
  borderBottom: `1px solid ${colors.border.default}`,
  color: colors.slate[600],
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', py: 1.5,
  '&:first-of-type': { pl: 3 }, '&:last-of-type': { pr: 3 },
} as const

const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 }, '&:last-of-type': { pr: 3 },
} as const

/* ═══════════════════════ Main Component ═══════════════════ */

export function CustomerDetailPage() {
  const { customerId } = useParams()
  useCREData()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)

  const customer = customers.find((c) => c.id === customerId)

  if (!customer) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Button variant="outlined" onClick={() => navigate('/cre/customers')} startIcon={<ArrowBack />}
            sx={{ alignSelf: 'flex-start', borderRadius: '10px', fontWeight: 600, borderColor: colors.slate[300], color: colors.slate[700] }}>
            Back
          </Button>
          <Box sx={{
            borderRadius: radii.lg, border: `1px solid ${colors.border.default}`,
            background: colors.bg.card, boxShadow: shadows.card, p: 4, textAlign: 'center',
          }}>
            <Typography sx={{ color: colors.slate[500] }}>No record for this customer id.</Typography>
          </Box>
        </Stack>
      </Box>
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        {/* ── Page Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/cre/customers')}
              sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.25 }}>
                <Typography sx={{
                  fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.7rem' },
                  color: colors.slate[900], letterSpacing: '-0.02em',
                }}>
                  {customer.fullName}
                </Typography>
                <Chip
                  label={customer.type ?? 'Individual'}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.72rem',
                    bgcolor: isCorporate ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
                    color: isCorporate ? '#4F46E5' : '#B45309',
                  }}
                />
              </Stack>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                Customer Information
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Edit sx={{ fontSize: '1rem !important' }} />}
            sx={{
              bgcolor: colors.slate[900], fontWeight: 600,
              borderRadius: '10px', px: 2.5,
              alignSelf: { xs: 'flex-start', md: 'center' },
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            Edit Details
          </Button>
        </Stack>

        {/* ── Info Grid — 2 columns on desktop ── */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* Left column */}
          <Stack spacing={3} sx={{ flex: 1 }}>
            {/* Contact */}
            <SectionCard title="Contact" icon={<Phone sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="Full Name" value={customer.fullName} icon={<Person sx={{ fontSize: '0.95rem', color: colors.slate[400] }} />} />
              <InfoRow label="Phone" value={customer.phone} icon={<Phone sx={{ fontSize: '0.95rem', color: colors.slate[400] }} />} />
              <InfoRow label="Email" value={customer.email} icon={<Email sx={{ fontSize: '0.95rem', color: colors.slate[400] }} />} />
            </SectionCard>

            {/* Address */}
            <SectionCard title="Address" icon={<Business sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="Division" value={customer.address?.division} />
              <InfoRow label="City" value={customer.address?.city} />
              <InfoRow label="Postal Code" value={customer.address?.postalCode} />
              <InfoRow label="Street Address" value={customer.address?.street} />
            </SectionCard>

            {/* Occupation */}
            <SectionCard title="Occupation" icon={<Work sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="Type" value={customer.occupation?.type} />
              <InfoRow label="Company" value={customer.occupation?.companyName} />
              <InfoRow label="Designation" value={customer.occupation?.designation} />
            </SectionCard>
          </Stack>

          {/* Right column */}
          <Stack spacing={3} sx={{ flex: 1 }}>
            {/* Driver */}
            <SectionCard title="Driver" icon={<Person sx={{ fontSize: '1rem' }} />}>
              <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>
                  Driver
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch checked={customer.isSelfDriven !== false} disabled size="small" />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>
                    {customer.isSelfDriven !== false ? 'Self Driven' : 'Other Driver'}
                  </Typography>
                </Box>
              </Stack>
              <InfoRow label="Driver Name" value={customer.driverName ?? customer.fullName} />
              <InfoRow label="Driver Phone" value={customer.driverPhone ?? customer.phone} />
              <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>
                  Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch checked={customer.isPersonalUse !== false} disabled size="small" />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>
                    {customer.isPersonalUse !== false ? 'Personal Use' : 'Corporate Use'}
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>

            {/* Corporate (conditional) */}
            {isCorporate && customer.corporate && (
              <SectionCard title="Corporate Details" icon={<Business sx={{ fontSize: '1rem' }} />}>
                <InfoRow label="Parent Company" value={customer.corporate.parentCompanyName} />
                <InfoRow label="Transport Officer" value={customer.corporate.transportOfficerName} />
                <InfoRow label="Officer Phone" value={customer.corporate.transportOfficerPhone} />
                <InfoRow label="Officer Email" value={customer.corporate.transportOfficerEmail} />
                <InfoRow label="Transport Manager" value={customer.corporate.transportManagerName} />
                <InfoRow label="Manager Phone" value={customer.corporate.transportManagerPhone} />
                <InfoRow label="Manager Email" value={customer.corporate.transportManagerEmail} />
                <InfoRow label="Note" value={customer.corporate.note} />
              </SectionCard>
            )}

            {/* Socials */}
            <SectionCard title="Socials" icon={<WhatsApp sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="WhatsApp" value={customer.whatsappLink} icon={<WhatsApp sx={{ fontSize: '0.95rem', color: '#25D366' }} />} />
              <InfoRow label="Facebook" value={customer.facebookLink} icon={<Facebook sx={{ fontSize: '0.95rem', color: '#1877F2' }} />} />
              <InfoRow label="LinkedIn" value={customer.linkedinLink} icon={<LinkedIn sx={{ fontSize: '0.95rem', color: '#0A66C2' }} />} />
              <InfoRow label="Google" value={customer.googleLink} />
            </SectionCard>
          </Stack>
        </Stack>

        {/* ── Vehicles Table ── */}
        <Box sx={{
          borderRadius: radii.lg, border: `1px solid ${colors.border.default}`,
          background: colors.bg.card, boxShadow: shadows.card, overflow: 'hidden',
        }}>
          <Box sx={{
            px: 3, py: 1.75, borderBottom: `1px solid ${colors.border.default}`,
            background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative',
            '&::before': {
              content: '""', position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 4, background: colors.slate[900], borderRadius: '0 4px 4px 0',
            },
          }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: colors.slate[100], display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.slate[900] }}>
                <DirectionsCar sx={{ fontSize: '1rem' }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900], letterSpacing: '0.01em', textTransform: 'uppercase' }}>
                Vehicles
              </Typography>
              <Box sx={{
                bgcolor: colors.slate[100], borderRadius: radii.full,
                px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600],
              }}>
                {customerVehicles.length}
              </Box>
            </Stack>
            <Button
              size="small" variant="outlined"
              component={RouterLink}
              to={`/cre/vehicles?customerId=${encodeURIComponent(customer.id)}`}
              sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', borderColor: colors.slate[300], color: colors.slate[700] }}
            >
              Register Vehicle
            </Button>
          </Box>
          {customerVehicles.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Registration</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Odometer</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerVehicles.map((v) => (
                  <TableRow key={v.id} hover
                    sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx, '&:hover': { background: colors.bg.cardHover } }}
                    onClick={() => navigate(`/cre/vehicles/${v.id}`)}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900], fontFamily: 'monospace' }}>
                        {v.registrationNo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[800] }}>
                        {v.model || v.modelVariant || '—'}
                      </Typography>
                      {v.make && <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{v.make}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                        {typeof v.odometerKm === 'number' ? `${v.odometerKm.toLocaleString()} km` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View vehicle">
                        <IconButton size="small" component={RouterLink} to={`/cre/vehicles/${v.id}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Visibility fontSize="small" sx={{ color: colors.slate[500] }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No vehicles linked.</Typography>
            </Box>
          )}
        </Box>

        {/* ── Appointments Table ── */}
        <Box sx={{
          borderRadius: radii.lg, border: `1px solid ${colors.border.default}`,
          background: colors.bg.card, boxShadow: shadows.card, overflow: 'hidden',
        }}>
          <Box sx={{
            px: 3, py: 1.75, borderBottom: `1px solid ${colors.border.default}`,
            background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
            display: 'flex', alignItems: 'center',
            position: 'relative',
            '&::before': {
              content: '""', position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 4, background: colors.slate[900], borderRadius: '0 4px 4px 0',
            },
          }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: colors.slate[100], display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.slate[900] }}>
                <CalendarMonth sx={{ fontSize: '1rem' }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900], letterSpacing: '0.01em', textTransform: 'uppercase' }}>
                Appointments
              </Typography>
              <Box sx={{
                bgcolor: colors.slate[100], borderRadius: radii.full,
                px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600],
              }}>
                {customerAppointments.length}
              </Box>
            </Stack>
          </Box>
          {customerAppointments.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerAppointments.map((a) => {
                  const veh = vehicles.find((v) => v.id === a.vehicleId)
                  return (
                    <TableRow
                      key={a.id} hover
                      sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx, '&:hover': { background: colors.bg.cardHover } }}
                      onClick={() => navigate(`/cre/appointments/${a.id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900], fontFamily: 'monospace' }}>
                          {veh?.registrationNo ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                          {fmtDate(a.slotDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={a.status} color={statusColor(a.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View appointment">
                          <IconButton size="small" component={RouterLink} to={`/cre/appointments/${a.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Visibility fontSize="small" sx={{ color: colors.slate[500] }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No appointments yet.</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
