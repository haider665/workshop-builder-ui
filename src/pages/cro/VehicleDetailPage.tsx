import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
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
import {
  ArrowBack,
  DirectionsCarOutlined,
  HistoryOutlined,
  MoreHorizOutlined,
  Person,
  DescriptionOutlined,
  OpenInNewOutlined,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { DocumentEvidenceEditor } from '../../components/DocumentEvidenceEditor'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useSessionStore } from '../../store/sessionStore'
import { useCREData } from '../../hooks/useCREData'
import { colors, radii } from '../../theme/tokens'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import type { CWVehicle, CWVehicleCategory, CWVehicleDocumentType, CWVehicleSize } from '../../types/cw'

const VEHICLE_DOCUMENT_TYPES: CWVehicleDocumentType[] = ['Registration Certificate', 'Tax Token', 'Fitness Certificate', 'Insurance', 'Route Permit', 'Other']
const VEHICLE_CATEGORIES: CWVehicleCategory[] = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Van', 'Truck', 'Bus', 'Other']
const VEHICLE_SIZES: CWVehicleSize[] = ['Small', 'Medium', 'Large']

/* ── InfoRow — key-value pair row inside SectionCard ────── */

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}
    >
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  )
}

export function VehicleDetailPage() {
  const { vehicleId } = useParams()
  useCREData()
  const navigate = useNavigate()

  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const users = useCwStore((s) => s.users)

  const [successOpen, setSuccessOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<CWVehicle | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const sessionUser = useSessionStore((state) => state.user)
  const canEdit = Boolean(sessionUser?.roles.some((role) => role === 'Admin' || role === 'CRE'))

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])

  if (!vehicle) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/cre/vehicles')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Vehicle Information
            </Typography>
          </Stack>
          <SectionCard title="NOT FOUND" icon={<DirectionsCarOutlined sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No record for this vehicle id.</Typography>
          </SectionCard>
        </Stack>
      </Box>
    )
  }

  const v = vehicle
  const customer = customerById.get(v.customerId)

  async function saveVehicle() {
    if (!editDraft) return
    try {
      setSaving(true); setEditError(null)
      const updated = await workshopApi.updateVehicle(v.id, editDraft)
      useCwStore.setState((state) => ({ vehicles: state.vehicles.map((item) => item.id === v.id ? updated : item) }))
      setEditDraft(null); setSuccessOpen(true)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to update vehicle')
    } finally { setSaving(false) }
  }

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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/cre/vehicles')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                Vehicle Information
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {v.make} {v.model} — {v.registrationNo}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={!canEdit} onClick={() => setEditDraft({ ...v, vehicleDocuments: [...(v.vehicleDocuments ?? [])] })} sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}>
              + Edit Details
            </Button>
            <Button variant="outlined" sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5, borderColor: colors.border.strong, color: colors.slate[700] }}>
              Ownership Transfer
            </Button>
          </Stack>
        </Stack>

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

        <Dialog open={Boolean(editDraft)} onClose={() => !saving && setEditDraft(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 800 }}>Edit vehicle details</DialogTitle>
          <DialogContent dividers>
            {editDraft ? <Stack spacing={2} sx={{ pt: 1 }}>
              {editError ? <Alert severity="error">{editError}</Alert> : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Registration number" value={editDraft.registrationNo} onChange={(e) => setEditDraft({ ...editDraft, registrationNo: e.target.value })} required fullWidth /><TextField label="VIN" value={editDraft.vin ?? ''} onChange={(e) => setEditDraft({ ...editDraft, vin: e.target.value })} fullWidth /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Brand" value={editDraft.make ?? ''} onChange={(e) => setEditDraft({ ...editDraft, make: e.target.value })} fullWidth /><TextField label="Model" value={editDraft.model ?? ''} onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })} fullWidth /><TextField label="Variant" value={editDraft.modelVariant ?? ''} onChange={(e) => setEditDraft({ ...editDraft, modelVariant: e.target.value })} fullWidth /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select label="Category" value={editDraft.vehicleCategory ?? ''} onChange={(e) => setEditDraft({ ...editDraft, vehicleCategory: e.target.value as CWVehicleCategory })} fullWidth>{VEHICLE_CATEGORIES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField select label="Size" value={editDraft.vehicleSize} onChange={(e) => setEditDraft({ ...editDraft, vehicleSize: e.target.value as CWVehicleSize })} fullWidth>{VEHICLE_SIZES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField type="number" label="Odometer (km)" value={editDraft.odometerKm ?? ''} onChange={(e) => setEditDraft({ ...editDraft, odometerKm: Number(e.target.value) })} fullWidth /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Exterior colour" value={editDraft.exteriorColor ?? ''} onChange={(e) => setEditDraft({ ...editDraft, exteriorColor: e.target.value })} fullWidth /><TextField label="Interior colour" value={editDraft.interiorColor ?? ''} onChange={(e) => setEditDraft({ ...editDraft, interiorColor: e.target.value })} fullWidth /><TextField label="Tyre size" value={editDraft.tyreSize ?? ''} onChange={(e) => setEditDraft({ ...editDraft, tyreSize: e.target.value })} fullWidth /></Stack>
              <TextField label="Additional notes" value={editDraft.additionalNotes ?? ''} onChange={(e) => setEditDraft({ ...editDraft, additionalNotes: e.target.value })} multiline minRows={3} fullWidth />
              <DocumentEvidenceEditor title="Vehicle papers and CRE/Admin review" documents={editDraft.vehicleDocuments ?? []} documentTypes={VEHICLE_DOCUMENT_TYPES} onChange={(vehicleDocuments) => setEditDraft({ ...editDraft, vehicleDocuments })} />
            </Stack> : null}
          </DialogContent>
          <DialogActions><Button onClick={() => setEditDraft(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void saveVehicle()} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></DialogActions>
        </Dialog>

        {/* General Information + Customer — side by side */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* General Information */}
          <Box sx={{ flex: 1 }}>
            <SectionCard title="GENERAL INFORMATION" icon={<DirectionsCarOutlined sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="Brand" value={v.make} />
              <InfoRow label="Model" value={v.model} />
              <InfoRow label="Vehicle Category" value={v.vehicleCategory} />
              <InfoRow label="Vehicle Size" value={v.vehicleSize} />
              <InfoRow label="Model Variant" value={v.modelVariant} />
              <InfoRow label="Country of Origin" value={v.countryOfOrigin} />
              <InfoRow label="Country of Assembly" value={v.countryOfAssembly} />
              <InfoRow label="VIN" value={v.vin} />
              <InfoRow label="Registration Number" value={v.registrationNo} />
            </SectionCard>
          </Box>

          {/* Customer */}
          <Box sx={{ flex: 1 }}>
            <SectionCard title="CUSTOMER" icon={<Person sx={{ fontSize: '1rem' }} />}>
              <InfoRow label="Customer" value={customer?.fullName} />
              <InfoRow label="Phone Number" value={customer?.phone} />
              <InfoRow label="Email Address" value={customer?.email} />
              <InfoRow label="Driver" value={customer?.driverName ? 'Other Driver' : 'Self Driven'} />
              <InfoRow label="Driver Name" value={customer?.driverName ?? customer?.fullName} />
              <InfoRow label="Driver Number" value={customer?.driverPhone ?? customer?.phone} />
              <InfoRow label="User" value={
                (customer?.type ?? 'Individual') === 'Corporate' ? 'Corporate Use' : 'Personal Use'
              } />
            </SectionCard>
          </Box>
        </Stack>

        <SectionCard title="VEHICLE PAPERS" icon={<DescriptionOutlined sx={{ fontSize: '1rem' }} />}>
          {!v.vehicleDocuments?.length ? (
            <Alert severity="info">No vehicle papers have been captured yet. The guard can upload and verify them during entry.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ minWidth: 680 }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Paper</TableCell><TableCell>Number</TableCell><TableCell>Status</TableCell><TableCell>Verified by</TableCell><TableCell>Evidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {v.vehicleDocuments.map((document, index) => (
                    <TableRow key={document.id ?? `${document.fileUrl}-${index}`} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell sx={{ fontWeight: 700 }}>{document.documentType}</TableCell>
                      <TableCell>{document.documentNumber ?? '-'}</TableCell>
                      <TableCell><Box component="span" sx={{ px: 1, py: 0.35, borderRadius: 5, fontSize: '0.72rem', fontWeight: 800, color: document.verificationStatus === 'Verified' ? '#047857' : document.verificationStatus === 'Rejected' ? '#b91c1c' : '#92400e', bgcolor: document.verificationStatus === 'Verified' ? '#d1fae5' : document.verificationStatus === 'Rejected' ? '#fee2e2' : '#fef3c7' }}>{document.verificationStatus}</Box></TableCell>
                      <TableCell>{document.verifiedByUserId ?? '-'}{document.verifiedAt ? <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500] }}>{new Date(document.verifiedAt).toLocaleString()}</Typography> : null}</TableCell>
                      <TableCell><Button size="small" component="a" href={document.fileUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewOutlined />}>Open</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>

        {/* Service History */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><HistoryOutlined sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>SERVICE HISTORY</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {serviceHistory.length}
              </Box>
            </Stack>
          </Box>
          {serviceHistory.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No service history.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Service Advisor</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Delivery Date</TableCell>
                  <TableCell>Last Recorded Mileage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceHistory.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx }}
                    onClick={() => navigate(`/cre/appointments/${row.id}`)}
                  >
                    <TableCell>{row.jobId}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>{row.vehicle}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{row.regNo}</Typography>
                    </TableCell>
                    <TableCell>{row.serviceAdvisor}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{row.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{row.deliveryDate}</Typography>
                    </TableCell>
                    <TableCell>{row.mileage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        {/* Others */}
        <SectionCard title="OTHERS" icon={<MoreHorizOutlined sx={{ fontSize: '1rem' }} />}>
          <InfoRow label="Exterior Colour" value={v.exteriorColor} />
          <InfoRow label="Exterior Colour Code" value={v.exteriorColorCode} />
          <InfoRow label="Interior Colour" value={v.interiorColor} />
          <InfoRow label="Interior Colour Code" value={v.interiorColorCode} />
          <InfoRow label="Tyre Size" value={v.tyreSize} />
          <InfoRow label="Additional Notes" value={v.additionalNotes} />
        </SectionCard>
      </Stack>
    </Box>
  )
}
