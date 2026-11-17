import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Inventory,
  LocalShipping,
  Public,
  ReceiptLong,
} from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { LivePartRequest, PartDisposition, PartLineItem } from '../../types/procurementWorkflow'

const DISPOSITION_OPTIONS: { value: PartDisposition; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'local_vendor', label: 'Local Vendor' },
  { value: 'foreign_vendor', label: 'Foreign Vendor' },
]

const dispositionColor: Record<PartDisposition, string> = {
  pending: colors.slate[400],
  in_stock: '#059669',
  local_vendor: '#2563eb',
  foreign_vendor: '#d97706',
}

function lineItemFromServer(row: LivePartRequest): PartLineItem {
  return {
    id: row.id,
    partName: row.partName,
    partNumber: row.partNumber,
    quantity: row.quantity ?? 1,
    disposition: row.disposition ?? 'pending',
    pickedFromCounter: row.pickedFromCounter,
    localVendorName: row.localVendorName,
    localPrice: row.localPrice,
    localQuantity: row.localQuantity,
    localDeliveryDays: row.localDeliveryDays,
    foreignNote: row.foreignNote,
    completed: Boolean(row.triageCompleted) || row.status === 'Fulfilled' || row.status === 'Rejected',
  }
}

type TriageSave = {
  disposition: PartDisposition
  localVendorName?: string
  localPrice?: number
  localQuantity?: number
  localDeliveryDays?: number
  foreignNote?: string
}

function LineItemRow({
  item,
  onSave,
}: {
  item: PartLineItem
  onSave?: (details: TriageSave) => Promise<void>
}) {
  const [selectedDisposition, setSelectedDisposition] = useState<PartDisposition>(item.disposition)
  const [saving, setSaving] = useState(false)

  const [localVendorName, setLocalVendorName] = useState(item.localVendorName ?? '')
  const [localPrice, setLocalPrice] = useState(item.localPrice ?? 0)
  const [localQty, setLocalQty] = useState(item.localQuantity ?? item.quantity)
  const [localDays, setLocalDays] = useState(item.localDeliveryDays ?? 0)
  const [foreignNote, setForeignNote] = useState(item.foreignNote ?? '')

  const save = async (details: TriageSave) => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(details)
    } finally {
      setSaving(false)
    }
  }

  if (item.completed) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: radii.sm,
          border: `1px solid ${colors.border.subtle}`,
          bgcolor: 'rgba(5,150,105,0.04)',
          opacity: 0.7,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <CheckCircle sx={{ color: '#059669', fontSize: '1.1rem', mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
                {item.partName}
              </Typography>
              {item.brand ? (
                <Chip
                  size="small"
                  label={item.brand}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 20,
                    bgcolor: colors.slate[100],
                    color: colors.slate[700],
                    borderRadius: radii.sm,
                  }}
                />
              ) : null}
              {item.partNumber ? (
                <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                  #{item.partNumber}
                </Typography>
              ) : null}
              <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                × {item.quantity}{item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
              </Typography>
              <Chip
                size="small"
                label={
                  item.disposition === 'in_stock'
                    ? 'Picked from counter'
                    : item.disposition === 'local_vendor'
                      ? `Local: ${item.localVendorName} — ৳${item.localPrice?.toLocaleString()}`
                      : 'Foreign vendor required'
                }
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  bgcolor: `${dispositionColor[item.disposition]}15`,
                  color: dispositionColor[item.disposition],
                  borderRadius: radii.sm,
                }}
              />
            </Stack>
            {item.alternatePartNumbers && item.alternatePartNumbers.length > 0 ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500] }}>Alt:</Typography>
                {item.alternatePartNumbers.map((alt) => (
                  <Chip
                    key={alt}
                    size="small"
                    label={alt}
                    sx={{
                      fontSize: '0.68rem',
                      height: 18,
                      bgcolor: colors.slate[100],
                      color: colors.slate[600],
                      borderRadius: radii.sm,
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Box>
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: radii.sm,
        border: `1px solid ${colors.border.default}`,
        bgcolor: colors.bg.card,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[900] }}>
                {item.partName}
              </Typography>
              {item.brand ? (
                <Chip
                  size="small"
                  label={item.brand}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    height: 22,
                    bgcolor: colors.slate[100],
                    color: colors.slate[700],
                    borderRadius: radii.sm,
                  }}
                />
              ) : null}
              {item.partNumber ? (
                <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                  #{item.partNumber}
                </Typography>
              ) : null}
            </Stack>
            {item.alternatePartNumbers && item.alternatePartNumbers.length > 0 ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500] }}>Alt:</Typography>
                {item.alternatePartNumbers.map((alt) => (
                  <Chip
                    key={alt}
                    size="small"
                    label={alt}
                    sx={{
                      fontSize: '0.68rem',
                      height: 18,
                      bgcolor: colors.slate[100],
                      color: colors.slate[600],
                      borderRadius: radii.sm,
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Box>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
              Qty: {item.quantity}{item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
            </Typography>
            <TextField
              select
              size="small"
              value={selectedDisposition}
              onChange={(e) => setSelectedDisposition(e.target.value as PartDisposition)}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }}
            >
              {DISPOSITION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        {selectedDisposition === 'in_stock' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Inventory />}
            disabled={saving}
            onClick={() => void save({ disposition: 'in_stock' })}
            sx={{
              alignSelf: 'flex-start',
              bgcolor: '#059669',
              fontWeight: 700,
              borderRadius: radii.sm,
              textTransform: 'none',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Pick from Counter
          </Button>
        )}

        {selectedDisposition === 'local_vendor' && (
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Vendor Name"
                value={localVendorName}
                onChange={(e) => setLocalVendorName(e.target.value)}
                sx={{ flex: 2 }}
              />
              <TextField
                size="small"
                label="Price (৳)"
                type="number"
                value={localPrice || ''}
                onChange={(e) => setLocalPrice(Number(e.target.value))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Quantity"
                type="number"
                value={localQty || ''}
                onChange={(e) => setLocalQty(Number(e.target.value))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Delivery (days)"
                type="number"
                value={localDays || ''}
                onChange={(e) => setLocalDays(Number(e.target.value))}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Button
              variant="contained"
              size="small"
              startIcon={<LocalShipping />}
              disabled={saving || !localVendorName.trim() || !localPrice}
              onClick={() => {
                void save({
                  disposition: 'local_vendor',
                  localVendorName: localVendorName.trim(),
                  localPrice,
                  localQuantity: localQty,
                  localDeliveryDays: localDays,
                })
              }}
              sx={{
                alignSelf: 'flex-start',
                bgcolor: '#2563eb',
                fontWeight: 700,
                borderRadius: radii.sm,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1d4ed8' },
              }}
            >
              Mark Completed
            </Button>
          </Stack>
        )}

        {selectedDisposition === 'foreign_vendor' && (
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label="Note (why foreign vendor is needed)"
              value={foreignNote}
              onChange={(e) => setForeignNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<Public />}
              disabled={saving || !foreignNote.trim()}
              onClick={() => {
                void save({
                  disposition: 'foreign_vendor',
                  foreignNote: foreignNote.trim(),
                })
              }}
              sx={{
                alignSelf: 'flex-start',
                bgcolor: '#d97706',
                fontWeight: 700,
                borderRadius: radii.sm,
                textTransform: 'none',
                '&:hover': { bgcolor: '#b45309' },
              }}
            >
              Mark Completed
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

export function MockPartRequestsPage() {
  const navigate = useNavigate()
  const partRequests = useMockProcurementStore((s) => s.partRequests)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [snack, setSnack] = useState<string | null>(null)
  const [snackError, setSnackError] = useState(false)
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)

  const handleSave = async (requestId: string, partRequestId: string, details: TriageSave) => {
    try {
      const updated = await workshopApi.savePartRequestTriage(partRequestId, details)
      useMockProcurementStore.setState((state) => ({
        partRequests: state.partRequests.map((request) =>
          request.id !== requestId
            ? request
            : {
                ...request,
                lineItems: request.lineItems.map((line) =>
                  line.id !== partRequestId ? line : lineItemFromServer(updated),
                ),
              },
        ),
      }))
      setSnackError(false)
      setSnack(details.disposition === 'in_stock' ? 'Part picked from stock and saved' : 'Triage saved')
    } catch (error) {
      setSnackError(true)
      setSnack(error instanceof Error ? error.message : 'Could not save triage')
    }
  }

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    void Promise.all([
      workshopApi.listPartRequests({ page: 1, pageSize: 100 }),
      workshopApi.procurementCases(selectedCompanyId).catch(() => ({ data: [] as Array<{ id: string; appointmentId?: string }> })),
    ]).then(async ([response, casesResponse]) => {
      if (cancelled) return
      const liveRows = response.data as LivePartRequest[]
      if (!liveRows.length) {
        useMockProcurementStore.setState({ partRequests: [] })
        return
      }
      const caseByAppointment = new Map(
        casesResponse.data
          .filter((item) => item.appointmentId)
          .map((item) => [String(item.appointmentId), item.id]),
      )
      const grouped = new Map<string, LivePartRequest[]>()
      liveRows.forEach((row) => grouped.set(row.appointmentId, [...(grouped.get(row.appointmentId) || []), row]))
      const mapped = await Promise.all([...grouped.entries()].map(async ([appointmentId, rows]) => {
        // The part-request endpoint intentionally returns only request data.
        // Hydrate the appointment's customer and vehicle here so the mock
        // workflow remains the same appointment-centred file used by the
        // real procurement case screen.
        const appointment = await workshopApi.getAppointment(appointmentId).catch(() => null)
        const [customer, vehicle] = appointment
          ? await Promise.all([
              appointment.customerId ? workshopApi.getCustomer(appointment.customerId).catch(() => null) : Promise.resolve(null),
              appointment.vehicleId ? workshopApi.getVehicle(appointment.vehicleId).catch(() => null) : Promise.resolve(null),
            ])
          : [null, null]
        return {
          id: appointmentId,
          procurementCaseId: caseByAppointment.get(appointmentId),
          requestNumber: appointmentId,
          vehicleName: vehicle ? [vehicle.registrationNo, vehicle.make, vehicle.model].filter(Boolean).join(' · ') : 'Appointment vehicle',
          customerName: customer?.fullName || 'Workshop customer',
          customerPhone: customer?.phone || '',
          requestedByName: rows[0].requestedBy,
          requestedAt: rows[0].createdAt,
          notes: appointment?.concerns || appointment?.notes || undefined,
          lineItems: rows.map(lineItemFromServer),
        }
      }))
      // Keep the established visual component and hydrate its data from the API.
      useMockProcurementStore.setState({ partRequests: mapped })
    }).catch(() => {
      if (!cancelled) useMockProcurementStore.setState({ partRequests: [] })
    })
    return () => { cancelled = true }
  }, [selectedCompanyId])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}
          >
            <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
          </IconButton>
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}
            >
              Part Requests — Triage
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
              Review parts, check stock, and prepare for customer approval
            </Typography>
          </Box>
        </Stack>

        <Snackbar
          open={Boolean(snack)}
          onClose={() => setSnack(null)}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnack(null)} severity={snackError ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
            {snack}
          </Alert>
        </Snackbar>

        {partRequests.map((req) => {
          const completedCount = req.lineItems.filter((li) => li.completed).length
          const total = req.lineItems.length
          const allCompleted = completedCount === total
          const isExpanded = expanded[req.id] ?? false
          const hasNonStockCompleted = req.lineItems.some(
            (li) => li.completed && li.disposition !== 'in_stock',
          )

          return (
            <Box
              key={req.id}
              sx={{
                borderRadius: radii.md,
                border: `1px solid ${allCompleted ? '#059669' : colors.border.default}`,
                bgcolor: colors.bg.card,
                boxShadow: shadows.card,
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
              }}
            >
              {/* Request header */}
              <Box
                onClick={() => setExpanded((p) => ({ ...p, [req.id]: !isExpanded }))}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: colors.slate[50] },
                  transition: 'background 0.15s ease',
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <ReceiptLong sx={{ color: colors.slate[400], fontSize: '1.3rem' }} />
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: colors.slate[900] }}>
                        {req.requestNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                        {req.vehicleName}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={req.customerName}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        bgcolor: colors.slate[100],
                        color: colors.slate[700],
                      }}
                    />
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
                      by {req.requestedByName} · {new Date(req.requestedAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    {req.procurementCaseId ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/mock-procurement/pipeline/${req.procurementCaseId}`)
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: radii.sm }}
                      >
                        Open procurement case
                      </Button>
                    ) : null}
                    <Chip
                      size="small"
                      label={`${completedCount}/${total} completed`}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        bgcolor: allCompleted ? '#d1fae5' : colors.slate[100],
                        color: allCompleted ? '#047857' : colors.slate[600],
                      }}
                    />
                    {isExpanded ? <ExpandLess sx={{ color: colors.slate[400] }} /> : <ExpandMore sx={{ color: colors.slate[400] }} />}
                  </Stack>
                </Stack>
              </Box>

              {/* Expanded line items */}
              <Collapse in={isExpanded}>
                <Box sx={{ px: 2.5, pb: 2.5 }}>
                  <Stack spacing={1.5}>
                    {req.notes ? (
                      <Alert severity="info" sx={{ borderRadius: radii.sm, fontSize: '0.82rem' }}>
                        {req.notes}
                      </Alert>
                    ) : null}

                    {req.lineItems.map((li) => (
                      <LineItemRow
                        key={li.id}
                        item={li}
                        onSave={(details) => handleSave(req.id, li.id, details)}
                      />
                    ))}

                    {allCompleted && hasNonStockCompleted ? (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/mock-procurement/approvals')}
                        sx={{
                          mt: 1,
                          bgcolor: colors.slate[900],
                          fontWeight: 700,
                          borderRadius: radii.sm,
                          textTransform: 'none',
                          '&:hover': { bgcolor: colors.slate[800] },
                        }}
                      >
                        Review Customer Approvals
                      </Button>
                    ) : null}

                    {allCompleted && !hasNonStockCompleted ? (
                      <Alert severity="success" sx={{ borderRadius: radii.sm }}>
                        All items picked from stock. No procurement needed.
                      </Alert>
                    ) : null}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
