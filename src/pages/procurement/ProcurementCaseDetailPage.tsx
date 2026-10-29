import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
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
  Add,
  AttachFile,
  CheckCircle,
  Delete,
  DirectionsCar,
  History,
  Info,
  Inventory,
} from '@mui/icons-material'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { MOCK_VENDORS } from '../../store/mockProcurementData'
import { useSessionStore } from '../../store/sessionStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { ProcurementCase, ProcurementStep, Quotation } from '../../types/procurementWorkflow'
import { PROCUREMENT_STEPS, PROCUREMENT_STEP_LABELS } from '../../types/procurementWorkflow'

/* ── Step Progress Bar ── */

function StepProgressBar({ currentStep, status }: { currentStep: ProcurementStep; status: string }) {
  const currentIdx = PROCUREMENT_STEPS.indexOf(currentStep)
  const activeStep = status === 'approved' ? PROCUREMENT_STEPS.length : currentIdx

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        '& .MuiStepLabel-label': { fontSize: '0.75rem', fontWeight: 700 },
        '& .MuiStepIcon-root.Mui-completed': { color: '#059669' },
        '& .MuiStepIcon-root.Mui-active': { color: '#2563eb' },
      }}
    >
      {PROCUREMENT_STEPS.map((step) => (
        <Step key={step}>
          <StepLabel>{PROCUREMENT_STEP_LABELS[step]}</StepLabel>
        </Step>
      ))}
    </Stepper>
  )
}

/* ── Part Details Section (shown on all steps) ── */

function PartDetailsSection({ pc }: { pc: ProcurementCase }) {
  return (
    <SectionCard title="Part Details" icon={<Inventory />}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, p: 2 }}>
        <InfoField label="Part Name" value={pc.partName} />
        <InfoField label="Part Number" value={pc.partNumber || '—'} />
        <InfoField label="Quantity" value={String(pc.quantity)} />
        <InfoField label="Sourcing" value={pc.disposition === 'local_vendor' ? 'Local Vendor' : 'Foreign Vendor'} chipColor={pc.disposition === 'local_vendor' ? '#1d4ed8' : '#c2410c'} chipBg={pc.disposition === 'local_vendor' ? '#dbeafe' : '#ffedd5'} />
        <InfoField label="Customer" value={pc.customerName} />
        <InfoField label="Vehicle" value={pc.vehicleName} />
        <InfoField label="Case Number" value={pc.caseNumber} />
        <InfoField label="Created" value={new Date(pc.createdAt).toLocaleDateString()} />
      </Box>
    </SectionCard>
  )
}

/* ── Vehicle Info Section ── */

function VehicleInfoSection({ pc }: { pc: ProcurementCase }) {
  const v = pc.vehicleInfo
  return (
    <SectionCard title="Vehicle & Customer Info" icon={<DirectionsCar />} defaultCollapsed>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, p: 2 }}>
        <InfoField label="Registration No" value={v.registrationNo} />
        <InfoField label="Make" value={v.make} />
        <InfoField label="Model" value={v.model} />
        {v.vin ? <InfoField label="VIN" value={v.vin} /> : null}
        {v.modelYear ? <InfoField label="Year" value={String(v.modelYear)} /> : null}
        {v.category ? <InfoField label="Category" value={v.category} /> : null}
        {v.odometerKm ? <InfoField label="Odometer" value={`${v.odometerKm.toLocaleString()} km`} /> : null}
        <InfoField label="Customer" value={v.customerName} />
        <InfoField label="Phone" value={v.customerPhone} />
      </Box>
    </SectionCard>
  )
}

function InfoField({ label, value, chipColor, chipBg }: { label: string; value: string; chipColor?: string; chipBg?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: colors.slate[400], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      {chipColor ? (
        <Chip size="small" label={value} sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: chipBg, color: chipColor, mt: 0.25 }} />
      ) : (
        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: colors.slate[900] }}>
          {value}
        </Typography>
      )}
    </Box>
  )
}

/* ── Completed Step Record ── */

function CompletedStepBadge({ label, byName, date, note }: { label: string; byName: string; date: string; note?: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: radii.sm, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CheckCircle sx={{ color: '#059669', fontSize: '1rem' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#047857' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
          by {byName} · {new Date(date).toLocaleDateString()}
        </Typography>
      </Stack>
      {note ? (
        <Typography sx={{ mt: 0.5, pl: 3, fontSize: '0.78rem', color: colors.slate[600], fontStyle: 'italic' }}>
          &quot;{note}&quot;
        </Typography>
      ) : null}
    </Box>
  )
}

/* ── Quotation Add/Edit Dialog with Vendor Dropdown ── */

function QuotationDialog({
  open,
  onClose,
  onSave,
  initial,
  partQty,
}: {
  open: boolean
  onClose: () => void
  onSave: (q: Omit<Quotation, 'id' | 'submittedAt'>) => void
  initial?: Quotation
  partQty: number
}) {
  const [vendorId, setVendorId] = useState(initial ? MOCK_VENDORS.find((v) => v.name === initial.vendorName)?.id ?? '' : '')
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0)
  const [qty, setQty] = useState(initial?.quantity ?? partQty)
  const [deliveryDays, setDeliveryDays] = useState(initial?.deliveryDays ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [files, setFiles] = useState<{ name: string; url: string }[]>(
    initial?.attachmentUrls?.map((url, i) => ({ name: initial.attachmentNames?.[i] ?? `file-${i + 1}`, url })) ?? [],
  )

  const selectedVendor = MOCK_VENDORS.find((v) => v.id === vendorId)

  const handleSave = () => {
    if (!selectedVendor) return
    onSave({
      vendorName: selectedVendor.name,
      vendorContact: selectedVendor.phone,
      sourcingType: selectedVendor.sourcingType,
      unitPrice,
      quantity: qty,
      totalPrice: unitPrice * qty,
      deliveryDays: deliveryDays || undefined,
      currency: 'BDT',
      notes: notes.trim() || undefined,
      attachmentUrls: files.map((f) => f.url),
      attachmentNames: files.map((f) => f.name),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{initial ? 'Edit Quotation' : 'Add Quotation'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            size="small"
            label="Select Vendor *"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            fullWidth
          >
            {MOCK_VENDORS.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.85rem' }}>{v.name}</Typography>
                  <Chip
                    size="small"
                    label={v.sourcingType}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.6rem',
                      height: 18,
                      bgcolor: v.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5',
                      color: v.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c',
                    }}
                  />
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          {selectedVendor ? (
            <Box sx={{ p: 1, borderRadius: radii.sm, bgcolor: colors.slate[50], fontSize: '0.78rem', color: colors.slate[600] }}>
              Contact: {selectedVendor.contact} · {selectedVendor.phone} · <b>{selectedVendor.sourcingType}</b>
            </Box>
          ) : null}
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Unit Price (৳)" type="number" value={unitPrice || ''} onChange={(e) => setUnitPrice(Number(e.target.value))} sx={{ flex: 1 }} />
            <TextField size="small" label="Quantity" type="number" value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} sx={{ flex: 1 }} />
            <TextField size="small" label="Delivery (days)" type="number" value={deliveryDays || ''} onChange={(e) => setDeliveryDays(Number(e.target.value))} sx={{ flex: 1 }} />
          </Stack>
          <Box sx={{ p: 1.5, borderRadius: radii.sm, bgcolor: colors.slate[50], textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>Total</Typography>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: colors.slate[900] }}>
              ৳{(unitPrice * qty).toLocaleString()}
            </Typography>
          </Box>
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colors.slate[600], mb: 1 }}>Proof / Attachments</Typography>
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<AttachFile />}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, mb: 1 }}
            >
              Upload Files
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files ?? []).map((f) => ({
                    name: f.name,
                    url: URL.createObjectURL(f),
                  }))
                  setFiles((prev) => [...prev, ...newFiles])
                  e.target.value = ''
                }}
              />
            </Button>
            {files.length > 0 ? (
              <Stack spacing={0.5}>
                {files.map((f, i) => (
                  <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <AttachFile sx={{ fontSize: '0.85rem', color: colors.slate[400] }} />
                    <Typography sx={{ fontSize: '0.78rem', color: colors.slate[700], flex: 1 }}>{f.name}</Typography>
                    <IconButton size="small" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <Delete sx={{ fontSize: '0.85rem', color: '#ef4444' }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>No files attached</Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!vendorId || !unitPrice}>
          {initial ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ── Quotations Table (used in Quotations step + read-only sections) ── */

function QuotationsTable({
  quotations,
  editable,
  onEdit,
  onRemove,
  selectedId,
  onSelect,
}: {
  quotations: Quotation[]
  editable?: boolean
  onEdit?: (q: Quotation) => void
  onRemove?: (id: string) => void
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  if (quotations.length === 0) {
    return (
      <Alert severity="warning" sx={{ borderRadius: radii.sm }}>
        No quotations available.
      </Alert>
    )
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {onSelect ? <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Select</TableCell> : null}
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Vendor</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Local/Foreign</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Unit Price</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Qty</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Total</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Delivery</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Proof</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Notes</TableCell>
            {editable ? <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Actions</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {quotations.map((q) => (
            <TableRow
              key={q.id}
              hover={Boolean(onSelect)}
              onClick={onSelect ? () => onSelect(q.id) : undefined}
              sx={{
                cursor: onSelect ? 'pointer' : 'default',
                bgcolor: selectedId === q.id ? '#eff6ff' : 'transparent',
                border: selectedId === q.id ? '2px solid #2563eb' : '2px solid transparent',
              }}
            >
              {onSelect ? (
                <TableCell>
                  <Box
                    sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: selectedId === q.id ? '5px solid #2563eb' : `2px solid ${colors.slate[300]}`,
                    }}
                  />
                </TableCell>
              ) : null}
              <TableCell>
                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{q.vendorName}</Typography>
                {q.vendorContact ? <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>{q.vendorContact}</Typography> : null}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={q.sourcingType}
                  sx={{
                    fontWeight: 700, fontSize: '0.65rem',
                    bgcolor: q.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5',
                    color: q.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c',
                  }}
                />
              </TableCell>
              <TableCell>৳{q.unitPrice.toLocaleString()}</TableCell>
              <TableCell>{q.quantity}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>৳{q.totalPrice.toLocaleString()}</TableCell>
              <TableCell>{q.deliveryDays ? `${q.deliveryDays}d` : '—'}</TableCell>
              <TableCell>
                {q.attachmentUrls.length > 0 ? (
                  <Stack spacing={0.25}>
                    {q.attachmentUrls.map((url, i) => (
                      <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <AttachFile sx={{ fontSize: '0.7rem', color: colors.slate[400] }} />
                        <Typography
                          component="a"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '0.68rem', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {q.attachmentNames?.[i] ?? `file-${i + 1}`}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>—</Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.notes || '—'}
                </Typography>
              </TableCell>
              {editable ? (
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" onClick={() => onEdit?.(q)} sx={{ fontSize: '0.7rem', minWidth: 0, textTransform: 'none' }}>Edit</Button>
                    <IconButton size="small" color="error" onClick={() => onRemove?.(q.id)}><Delete sx={{ fontSize: '0.9rem' }} /></IconButton>
                  </Stack>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

/* ── History Timeline ── */

function HistoryTimeline({ pc }: { pc: ProcurementCase }) {
  if (pc.history.length === 0) {
    return <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400], p: 2 }}>No history yet.</Typography>
  }
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {pc.history.map((h, i) => (
        <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: h.action === 'reject' ? '#ef4444' : h.action === 'approve' ? '#059669' : '#2563eb', mt: 0.7, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[900] }}>
              <Box component="span" sx={{ fontWeight: 700 }}>{PROCUREMENT_STEP_LABELS[h.step]}</Box>
              {' — '}
              <Box component="span" sx={{ fontWeight: 600, color: h.action === 'reject' ? '#b91c1c' : '#047857' }}>
                {h.action.charAt(0).toUpperCase() + h.action.slice(1)}
              </Box>
              {' by '}{h.actionByName}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>{new Date(h.actionDate).toLocaleString()}</Typography>
            {h.note ? <Typography sx={{ fontSize: '0.75rem', color: colors.slate[600], mt: 0.25, fontStyle: 'italic' }}>&quot;{h.note}&quot;</Typography> : null}
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

/* ── All Previous Steps Summary (for Approval) ── */

function AllStepsSummary({ pc }: { pc: ProcurementCase }) {
  return (
    <Stack spacing={2}>
      {pc.storeReview ? (
        <CompletedStepBadge label="Store Review" byName={pc.storeReview.actionByName} date={pc.storeReview.actionDate} note={pc.storeReview.note} />
      ) : null}
      {pc.quotations.length > 0 ? (
        <SectionCard title={`Quotations (${pc.quotations.length})`} icon={<Info />}>
          <QuotationsTable quotations={pc.quotations} />
        </SectionCard>
      ) : null}
      {pc.csDecision ? (
        <CompletedStepBadge
          label={`CS Decision — ${pc.csDecision.selectedVendorName}`}
          byName={pc.csDecision.decidedByName}
          date={pc.csDecision.decidedAt}
          note={pc.csDecision.note}
        />
      ) : null}
      {pc.auditReview ? (
        <CompletedStepBadge label="Audit Review" byName={pc.auditReview.actionByName} date={pc.auditReview.actionDate} note={pc.auditReview.note} />
      ) : null}
    </Stack>
  )
}

/* ── Main Page ── */

export function ProcurementCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const userName = useSessionStore((s) => s.user?.name ?? 'System')
  const cases = useMockProcurementStore((s) => s.procurementCases)
  const advanceStep = useMockProcurementStore((s) => s.advanceProcurementStep)
  const rejectStep = useMockProcurementStore((s) => s.rejectProcurementStep)
  const addQuotation = useMockProcurementStore((s) => s.addQuotation)
  const updateQuotation = useMockProcurementStore((s) => s.updateQuotation)
  const removeQuotation = useMockProcurementStore((s) => s.removeQuotation)
  const setCSDecisionStore = useMockProcurementStore((s) => s.setCSDecision)

  const pc = cases.find((c) => c.id === caseId)

  const [snack, setSnack] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [quotationDialog, setQuotationDialog] = useState(false)
  const [editQuotation, setEditQuotation] = useState<Quotation | undefined>(undefined)
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null)
  const [csNote, setCsNote] = useState('')

  if (!pc) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[600] }}>Case not found</Typography>
        <Button onClick={() => navigate('/mock-procurement/pipeline')} sx={{ mt: 2 }}>Back to Pipeline</Button>
      </Box>
    )
  }

  const currentIdx = PROCUREMENT_STEPS.indexOf(pc.currentStep)
  const isCompleted = pc.status === 'approved' || pc.status === 'rejected'

  const handleApprove = () => {
    advanceStep(pc.id, {
      action: pc.currentStep === 'quotations' ? 'submit' : 'approve',
      actionByName: userName,
      actionDate: new Date().toISOString(),
      note: actionNote.trim() || undefined,
    })
    setActionNote('')
    setSnack(`${PROCUREMENT_STEP_LABELS[pc.currentStep]} — ${pc.currentStep === 'quotations' ? 'Submitted' : 'Approved'}`)
  }

  const handleReject = () => {
    rejectStep(pc.id, rejectNote.trim() || 'Rejected', userName)
    setRejectNote('')
    setShowReject(false)
    setSnack(`${PROCUREMENT_STEP_LABELS[pc.currentStep]} — Rejected, sent back`)
  }

  const handleCSSubmit = () => {
    if (!selectedQuotationId) {
      setSnack('Select a vendor first')
      return
    }
    const q = pc.quotations.find((q) => q.id === selectedQuotationId)
    if (!q) return
    setCSDecisionStore(pc.id, {
      selectedQuotationId,
      selectedVendorName: q.vendorName,
      note: csNote.trim() || `Selected ${q.vendorName}`,
      decidedByName: userName,
    })
    advanceStep(pc.id, {
      action: 'submit',
      actionByName: userName,
      actionDate: new Date().toISOString(),
      note: csNote.trim() || `Selected vendor: ${q.vendorName} — ৳${q.totalPrice.toLocaleString()}`,
    })
    setSnack('CS Decision submitted')
    setCsNote('')
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Snackbar open={Boolean(snack)} onClose={() => setSnack(null)} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSnack(null)} severity="success" variant="filled" sx={{ width: '100%' }}>{snack}</Alert>
        </Snackbar>

        {/* Header */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/mock-procurement/pipeline')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
            <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.6rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {pc.caseNumber}
              </Typography>
              <Chip size="small" label={pc.disposition === 'local_vendor' ? 'Local Vendor' : 'Foreign Vendor'}
                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: pc.disposition === 'local_vendor' ? '#dbeafe' : '#ffedd5', color: pc.disposition === 'local_vendor' ? '#1d4ed8' : '#c2410c' }} />
              <Chip size="small" label={isCompleted ? pc.status.toUpperCase() : PROCUREMENT_STEP_LABELS[pc.currentStep]}
                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: isCompleted ? (pc.status === 'approved' ? '#d1fae5' : '#fee2e2') : '#e0e7ff', color: isCompleted ? (pc.status === 'approved' ? '#047857' : '#b91c1c') : '#3730a3' }} />
            </Stack>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
              {pc.partName} {pc.partNumber ? `(#${pc.partNumber})` : ''} × {pc.quantity} — {pc.customerName}
            </Typography>
          </Box>
        </Stack>

        {/* Step Progress */}
        <Box sx={{ p: 2, borderRadius: radii.md, bgcolor: colors.bg.card, boxShadow: shadows.card, border: `1px solid ${colors.border.subtle}` }}>
          <StepProgressBar currentStep={pc.currentStep} status={pc.status} />
        </Box>

        {/* Part Details — always visible */}
        <PartDetailsSection pc={pc} />

        {/* Vehicle Info */}
        <VehicleInfoSection pc={pc} />

        {/* ── Accumulated completed steps ── */}
        {pc.storeReview && currentIdx > 0 ? (
          <CompletedStepBadge label="Store Review" byName={pc.storeReview.actionByName} date={pc.storeReview.actionDate} note={pc.storeReview.note} />
        ) : null}

        {/* Read-only quotations summary (when past quotations step but not on approval) */}
        {currentIdx > 1 && pc.currentStep !== 'approval' && !isCompleted ? (
          <SectionCard title={`Quotations (${pc.quotations.length})`} icon={<Info />} defaultCollapsed>
            <QuotationsTable quotations={pc.quotations} />
          </SectionCard>
        ) : null}

        {pc.csDecision && currentIdx > 2 ? (
          <CompletedStepBadge label={`CS Decision — ${pc.csDecision.selectedVendorName}`} byName={pc.csDecision.decidedByName} date={pc.csDecision.decidedAt} note={pc.csDecision.note} />
        ) : null}

        {pc.auditReview && currentIdx > 3 ? (
          <CompletedStepBadge label="Audit Review" byName={pc.auditReview.actionByName} date={pc.auditReview.actionDate} note={pc.auditReview.note} />
        ) : null}

        {/* ── Active Step Action Panel ── */}
        {!isCompleted ? (
          <Box sx={{ p: 3, borderRadius: radii.md, border: '2px solid #2563eb', bgcolor: '#f8faff', boxShadow: shadows.elevated }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1d4ed8', mb: 2 }}>
              Action: {PROCUREMENT_STEP_LABELS[pc.currentStep]}
            </Typography>

            {/* ── Store Review ── */}
            {pc.currentStep === 'store_review' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>
                  Review the part and vehicle information above. Confirm that the part is not in stock and should proceed to procurement.
                </Alert>
                <TextField size="small" label="Note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                    Approve & Send to Quotations
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Reject
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* ── Quotations ── */}
            {pc.currentStep === 'quotations' && (
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[700] }}>
                    Quotations ({pc.quotations.length})
                  </Typography>
                  <Button size="small" startIcon={<Add />} variant="contained"
                    onClick={() => { setEditQuotation(undefined); setQuotationDialog(true) }}
                    sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Add Quotation
                  </Button>
                </Stack>

                <QuotationsTable
                  quotations={pc.quotations}
                  editable
                  onEdit={(q) => { setEditQuotation(q); setQuotationDialog(true) }}
                  onRemove={(id) => removeQuotation(pc.id, id)}
                />

                <Divider />
                <TextField size="small" label="Submission note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} disabled={pc.quotations.length === 0}
                    sx={{ bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}>
                    Submit Quotations for CS
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Reject (Back to Store Review)
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* ── CS ── */}
            {pc.currentStep === 'cs' && (
              <Stack spacing={2}>
                <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                  Compare quotations and select the best vendor for <b>{pc.partName}</b>.
                </Typography>
                <QuotationsTable quotations={pc.quotations} selectedId={selectedQuotationId} onSelect={setSelectedQuotationId} />
                <Divider />
                <TextField size="small" label="Decision note" value={csNote} onChange={(e) => setCsNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleCSSubmit} disabled={!selectedQuotationId}
                    sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                    Submit CS Decision
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Reject (Back to Quotations)
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* ── Audit ── */}
            {pc.currentStep === 'audit' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>
                  Review all details — part info, vehicle, quotations with attachments, and CS decision. Approve to send for final approval.
                </Alert>
                {/* Show quotations with attachments for audit review */}
                <SectionCard title={`Quotations & Attachments (${pc.quotations.length})`} icon={<AttachFile />}>
                  <QuotationsTable quotations={pc.quotations} />
                </SectionCard>
                <TextField size="small" label="Audit note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove}
                    sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                    Approve & Send to Management
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Reject (Back to CS)
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* ── Approval — shows ALL previous step info ── */}
            {pc.currentStep === 'approval' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>
                  Final approval. Review all accumulated information below and approve to complete procurement.
                </Alert>
                <AllStepsSummary pc={pc} />
                <Divider />
                <TextField size="small" label="Approval note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove}
                    sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                    Final Approve ✓
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                    Reject (Back to Audit)
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        ) : (
          <Alert severity={pc.status === 'approved' ? 'success' : 'error'} sx={{ borderRadius: radii.md, fontWeight: 700 }}>
            {pc.status === 'approved' ? 'This procurement case has been fully approved.' : 'This procurement case has been rejected.'}
          </Alert>
        )}

        {pc.managementApproval ? (
          <CompletedStepBadge label="Management Approval" byName={pc.managementApproval.actionByName} date={pc.managementApproval.actionDate} note={pc.managementApproval.note} />
        ) : null}

        {/* Reject Dialog */}
        <Dialog open={showReject} onClose={() => setShowReject(false)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 800 }}>Reject — {PROCUREMENT_STEP_LABELS[pc.currentStep]}</DialogTitle>
          <DialogContent>
            <TextField label="Rejection reason" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} multiline minRows={2} fullWidth sx={{ mt: 1 }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleReject}>Reject & Send Back</Button>
          </DialogActions>
        </Dialog>

        {/* Quotation Dialog */}
        <QuotationDialog
          open={quotationDialog}
          onClose={() => setQuotationDialog(false)}
          onSave={(q) => {
            if (editQuotation) updateQuotation(pc.id, editQuotation.id, q)
            else addQuotation(pc.id, q)
          }}
          initial={editQuotation}
          partQty={pc.quantity}
        />

        {/* History */}
        <SectionCard title="History" icon={<History />} defaultCollapsed>
          <HistoryTimeline pc={pc} />
        </SectionCard>
      </Stack>
    </Box>
  )
}
