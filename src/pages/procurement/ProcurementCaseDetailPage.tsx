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
  Inventory,
  LocalShipping,
  Receipt,
} from '@mui/icons-material'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { MOCK_VENDORS } from '../../store/mockProcurementData'
import { useSessionStore } from '../../store/sessionStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { ProcurementCase, ProcurementStep, Quotation, QuotationLineItem, CSDecisionItem, GRNLineItem } from '../../types/procurementWorkflow'
import { PROCUREMENT_STEPS, PROCUREMENT_STEP_LABELS } from '../../types/procurementWorkflow'

/* ═══ Helpers ═══ */

function StepProgressBar({ currentStep, status }: { currentStep: ProcurementStep; status: string }) {
  const currentIdx = PROCUREMENT_STEPS.indexOf(currentStep)
  const activeStep = status === 'approved' ? PROCUREMENT_STEPS.length : currentIdx
  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem', fontWeight: 700 }, '& .MuiStepIcon-root.Mui-completed': { color: '#059669' }, '& .MuiStepIcon-root.Mui-active': { color: '#2563eb' } }}>
      {PROCUREMENT_STEPS.map((step) => (<Step key={step}><StepLabel>{PROCUREMENT_STEP_LABELS[step]}</StepLabel></Step>))}
    </Stepper>
  )
}

function InfoField({ label, value, chipColor, chipBg }: { label: string; value: string; chipColor?: string; chipBg?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: colors.slate[400], textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      {chipColor ? <Chip size="small" label={value} sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: chipBg, color: chipColor, mt: 0.25 }} /> : <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: colors.slate[900] }}>{value}</Typography>}
    </Box>
  )
}

function CompletedStepBadge({ label, byName, date, note }: { label: string; byName: string; date: string; note?: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: radii.sm, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <CheckCircle sx={{ color: '#059669', fontSize: '1rem' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#047857' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>by {byName} · {new Date(date).toLocaleString()}</Typography>
      </Stack>
      {note ? <Typography sx={{ mt: 0.5, pl: 3, fontSize: '0.78rem', color: colors.slate[600], fontStyle: 'italic' }}>&quot;{note}&quot;</Typography> : null}
    </Box>
  )
}

/* ═══ CS Decision Summary — part-centric view ═══ */

function CSDecisionSummary({ pc }: { pc: ProcurementCase }) {
  if (!pc.csDecision) return null
  return (
    <Box sx={{ p: 2, borderRadius: radii.sm, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
        <CheckCircle sx={{ color: '#059669', fontSize: '1rem' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#047857' }}>CS Decision</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>by {pc.csDecision.decidedByName} · {new Date(pc.csDecision.decidedAt).toLocaleString()}</Typography>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Selected Vendor</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Unit Price</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Qty</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pc.csDecision.items.map((item) => (
            <TableRow key={item.casePartId}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{item.partName}</TableCell>
              <TableCell>
                <Chip size="small" label={item.selectedVendorName} sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#dbeafe', color: '#1d4ed8' }} />
              </TableCell>
              <TableCell>৳{item.unitPrice.toLocaleString()}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>৳{item.totalPrice.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} sx={{ fontWeight: 800, textAlign: 'right', fontSize: '0.82rem' }}>Combined Total</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>৳{pc.csDecision.items.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {pc.csDecision.note ? <Typography sx={{ mt: 1, fontSize: '0.78rem', color: colors.slate[600], fontStyle: 'italic' }}>&quot;{pc.csDecision.note}&quot;</Typography> : null}
    </Box>
  )
}

/* ═══ Parts Details Table ═══ */

function PartsDetailsSection({ pc }: { pc: ProcurementCase }) {
  return (
    <SectionCard title={`Parts (${pc.parts.length})`} icon={<Inventory />}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part #</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Alternates</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Brand</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pc.parts.map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.partName}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>{p.partNumber || '—'}</TableCell>
                <TableCell>
                  {p.alternatePartNumbers?.length ? (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {p.alternatePartNumbers.map((alt) => (
                        <Chip key={alt} size="small" label={alt} sx={{ fontSize: '0.62rem', height: 20, fontWeight: 600, bgcolor: colors.slate[100] }} />
                      ))}
                    </Stack>
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{p.brand || '—'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{p.quantity} {p.unitOfMeasure || 'pcs'}</TableCell>
                <TableCell>
                  <Chip size="small" label={p.disposition === 'local_vendor' ? 'Local' : 'Foreign'} sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: p.disposition === 'local_vendor' ? '#dbeafe' : '#ffedd5', color: p.disposition === 'local_vendor' ? '#1d4ed8' : '#c2410c' }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </SectionCard>
  )
}

/* ═══ Vehicle Info ═══ */

function VehicleInfoSection({ pc }: { pc: ProcurementCase }) {
  const v = pc.vehicleInfo
  return (
    <SectionCard title="Vehicle & Customer" icon={<DirectionsCar />} defaultCollapsed>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, p: 2 }}>
        <InfoField label="Registration" value={v.registrationNo} />
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

/* ═══ Multi-Part Quotation Dialog ═══ */

function QuotationDialog({ open, onClose, onSave, parts, initial }: {
  open: boolean
  onClose: () => void
  onSave: (q: Omit<Quotation, 'id' | 'submittedAt'>) => void
  parts: ProcurementCase['parts']
  initial?: Quotation
}) {
  const [vendorId, setVendorId] = useState(initial ? MOCK_VENDORS.find((v) => v.name === initial.vendorName)?.id ?? '' : '')
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>(
    initial?.lineItems ?? parts.map((p) => ({ casePartId: p.id, partName: p.partName, unitPrice: 0, quantity: p.quantity, totalPrice: 0 })),
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [files, setFiles] = useState<{ name: string; url: string }[]>(
    initial?.attachmentUrls?.map((url, i) => ({ name: initial.attachmentNames?.[i] ?? `file-${i + 1}`, url })) ?? [],
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedVendor = MOCK_VENDORS.find((v) => v.id === vendorId)

  const updateLine = (idx: number, field: keyof QuotationLineItem, value: number | string) => {
    setLineItems((prev) => prev.map((li, i) => {
      if (i !== idx) return li
      const updated = { ...li, [field]: value }
      if (field === 'unitPrice' || field === 'quantity') updated.totalPrice = (updated.unitPrice ?? 0) * (updated.quantity ?? 0)
      return updated
    }))
  }

  const grandTotal = lineItems.reduce((s, li) => s + (li.totalPrice || 0), 0)

  const handleSave = () => {
    if (!selectedVendor) return
    onSave({
      vendorName: selectedVendor.name,
      vendorContact: selectedVendor.phone,
      sourcingType: selectedVendor.sourcingType,
      lineItems,
      grandTotal,
      currency: 'BDT',
      notes: notes.trim() || undefined,
      attachmentUrls: files.map((f) => f.url),
      attachmentNames: files.map((f) => f.name),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{initial ? 'Edit Quotation' : 'Add Quotation'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select size="small" label="Select Vendor *" value={vendorId} onChange={(e) => setVendorId(e.target.value)} fullWidth>
            {MOCK_VENDORS.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.85rem' }}>{v.name}</Typography>
                  <Chip size="small" label={v.sourcingType} sx={{ fontWeight: 700, fontSize: '0.6rem', height: 18, bgcolor: v.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5', color: v.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c' }} />
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          {selectedVendor ? (
            <Box sx={{ p: 1, borderRadius: radii.sm, bgcolor: colors.slate[50], fontSize: '0.78rem', color: colors.slate[600] }}>
              Contact: {selectedVendor.contact} · {selectedVendor.phone} · <b>{selectedVendor.sourcingType}</b>
            </Box>
          ) : null}

          {/* Per-part line items */}
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[700] }}>Price per Part</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 120 }}>Unit Price (৳)</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 80 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 100 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 100 }}>Delivery</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((li, idx) => (
                  <TableRow key={li.casePartId}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{li.partName}</TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.unitPrice || ''} onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))} sx={{ width: 110 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.quantity || ''} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} sx={{ width: 70 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>৳{(li.totalPrice || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.deliveryDays || ''} onChange={(e) => updateLine(idx, 'deliveryDays', Number(e.target.value))} sx={{ width: 80 }} placeholder="days" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: radii.sm, bgcolor: colors.slate[50], textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>Grand Total</Typography>
            <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: colors.slate[900] }}>৳{grandTotal.toLocaleString()}</Typography>
          </Box>
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colors.slate[600], mb: 1 }}>Proof / Attachments</Typography>
            <Button component="label" variant="outlined" size="small" startIcon={<AttachFile />} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, mb: 1 }}>
              Upload Files
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { const nf = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })); setFiles((p) => [...p, ...nf]); e.target.value = '' }} />
            </Button>
            {files.length > 0 ? (
              <Stack spacing={0.5}>
                {files.map((f, i) => (
                  <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <AttachFile sx={{ fontSize: '0.85rem', color: colors.slate[400] }} />
                    <Typography sx={{ fontSize: '0.78rem', color: colors.slate[700], flex: 1 }}>{f.name}</Typography>
                    <IconButton size="small" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><Delete sx={{ fontSize: '0.85rem', color: '#ef4444' }} /></IconButton>
                  </Stack>
                ))}
              </Stack>
            ) : <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>No files attached</Typography>}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!vendorId || lineItems.every((li) => !li.unitPrice)}>
          {initial ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══ Quotations Summary Table ═══ */

function QuotationsSummaryTable({ quotations, editable, onEdit, onRemove }: {
  quotations: Quotation[]
  editable?: boolean
  onEdit?: (q: Quotation) => void
  onRemove?: (id: string) => void
}) {
  if (!quotations.length) return <Alert severity="warning" sx={{ borderRadius: radii.sm }}>No quotations.</Alert>
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Vendor</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Local/Foreign</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Parts</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Grand Total</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Proof</TableCell>
            {editable ? <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Actions</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {quotations.map((q) => (
            <TableRow key={q.id}>
              <TableCell>
                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{q.vendorName}</Typography>
                {q.vendorContact ? <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>{q.vendorContact}</Typography> : null}
              </TableCell>
              <TableCell>
                <Chip size="small" label={q.sourcingType} sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: q.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5', color: q.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c' }} />
              </TableCell>
              <TableCell>
                <Stack spacing={0.25}>
                  {q.lineItems.map((li) => (
                    <Typography key={li.casePartId} sx={{ fontSize: '0.72rem', color: colors.slate[700] }}>
                      {li.partName}: ৳{li.unitPrice.toLocaleString()} × {li.quantity} = <b>৳{li.totalPrice.toLocaleString()}</b>
                    </Typography>
                  ))}
                </Stack>
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669' }}>৳{q.grandTotal.toLocaleString()}</TableCell>
              <TableCell>
                {q.attachmentUrls.length > 0 ? (
                  <Stack spacing={0.25}>
                    {q.attachmentUrls.map((url, i) => (
                      <Typography key={i} component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.68rem', color: '#2563eb', textDecoration: 'underline' }}>
                        {q.attachmentNames?.[i] ?? `file-${i + 1}`}
                      </Typography>
                    ))}
                  </Stack>
                ) : <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>—</Typography>}
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

/* ═══ CS Comparison Matrix ═══ */

function CSMatrix({ pc, selections, onSelect }: {
  pc: ProcurementCase
  selections: Record<string, { quotationId: string; vendorName: string; unitPrice: number; quantity: number; totalPrice: number }>
  onSelect: (casePartId: string, quotationId: string, vendorName: string, unitPrice: number, quantity: number, totalPrice: number) => void
}) {
  const vendors = pc.quotations
  if (!vendors.length || !pc.parts.length) return <Alert severity="warning" sx={{ borderRadius: radii.sm }}>No quotations to compare.</Alert>

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', position: 'sticky', left: 0, bgcolor: colors.bg.card, zIndex: 1 }}>Part</TableCell>
            {vendors.map((q) => (
              <TableCell key={q.id} sx={{ fontWeight: 700, fontSize: '0.72rem', textAlign: 'center', minWidth: 140 }}>
                {q.vendorName}
                <br />
                <Chip size="small" label={q.sourcingType} sx={{ fontWeight: 700, fontSize: '0.58rem', height: 16, bgcolor: q.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5', color: q.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c', mt: 0.25 }} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pc.parts.map((part) => (
            <TableRow key={part.id}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', position: 'sticky', left: 0, bgcolor: colors.bg.card, zIndex: 1 }}>
                {part.partName}
                <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>Qty: {part.quantity}</Typography>
              </TableCell>
              {vendors.map((q) => {
                const li = q.lineItems.find((l) => l.casePartId === part.id)
                const isSelected = selections[part.id]?.quotationId === q.id
                return (
                  <TableCell
                    key={q.id}
                    onClick={li ? () => onSelect(part.id, q.id, q.vendorName, li.unitPrice, li.quantity, li.totalPrice) : undefined}
                    sx={{
                      textAlign: 'center',
                      cursor: li ? 'pointer' : 'default',
                      bgcolor: isSelected ? '#eff6ff' : 'transparent',
                      border: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                      borderRadius: radii.sm,
                      '&:hover': li ? { bgcolor: isSelected ? '#eff6ff' : colors.slate[50] } : {},
                    }}
                  >
                    {li ? (
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#1d4ed8' : colors.slate[900] }}>
                          ৳{li.unitPrice.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>
                          Total: ৳{li.totalPrice.toLocaleString()}
                        </Typography>
                        {li.deliveryDays ? <Typography sx={{ fontSize: '0.65rem', color: colors.slate[400] }}>{li.deliveryDays}d delivery</Typography> : null}
                        {isSelected ? <CheckCircle sx={{ color: '#2563eb', fontSize: '0.9rem', mt: 0.25 }} /> : null}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[300] }}>—</Typography>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

/* ═══ PO Panel ═══ */

function POPanel({ pc, userName, navigate }: { pc: ProcurementCase; userName: string; navigate: (path: string) => void }) {
  const generatePOs = useMockProcurementStore((s) => s.generatePurchaseOrders)
  const placeOrder = useMockProcurementStore((s) => s.placeOrder)
  const updateStatus = useMockProcurementStore((s) => s.updateOrderStatus)
  const advanceStep = useMockProcurementStore((s) => s.advanceProcurementStep)
  const [expectedDates, setExpectedDates] = useState<Record<string, string>>({})
  const [snack, setSnack] = useState<string | null>(null)

  const allPlaced = pc.purchaseOrders.length > 0 && pc.purchaseOrders.every((po) => po.status !== 'draft')
  const allDelivered = pc.purchaseOrders.length > 0 && pc.purchaseOrders.every((po) => po.status === 'delivered')

  const statusColors: Record<string, { bgcolor: string; color: string }> = {
    draft: { bgcolor: colors.slate[100], color: colors.slate[600] },
    placed: { bgcolor: '#dbeafe', color: '#1d4ed8' },
    in_transit: { bgcolor: '#fef3c7', color: '#92400e' },
    delivered: { bgcolor: '#d1fae5', color: '#047857' },
  }

  return (
    <Stack spacing={2}>
      <Snackbar open={Boolean(snack)} onClose={() => setSnack(null)} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack(null)} severity="success" variant="filled">{snack}</Alert>
      </Snackbar>

      {pc.purchaseOrders.length === 0 ? (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: radii.sm }}>Generate Purchase Orders from the CS decision. One PO per vendor.</Alert>
          <Button variant="contained" onClick={() => { generatePOs(pc.id); setSnack('Purchase Orders generated') }}
            sx={{ alignSelf: 'flex-start', bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}>
            Generate Purchase Orders
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          {pc.purchaseOrders.map((po) => (
            <Box key={po.id} sx={{ p: 2.5, borderRadius: radii.md, border: `1px solid ${colors.border.default}`, bgcolor: colors.bg.card }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{po.poNumber}</Typography>
                  <Chip size="small" label={po.vendorName} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                  <Chip size="small" label={po.sourcingType} sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: po.sourcingType === 'Local' ? '#dbeafe' : '#ffedd5', color: po.sourcingType === 'Local' ? '#1d4ed8' : '#c2410c' }} />
                </Stack>
                <Chip size="small" label={po.status.replace('_', ' ').toUpperCase()} sx={{ fontWeight: 700, fontSize: '0.68rem', ...statusColors[po.status] }} />
              </Stack>

              <Table size="small">
                <TableBody>
                  {po.lineItems.map((li) => (
                    <TableRow key={li.casePartId}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{li.partName}</TableCell>
                      <TableCell>৳{li.unitPrice.toLocaleString()} × {li.quantity}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>৳{li.totalPrice.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontWeight: 800, textAlign: 'right' }}>Grand Total</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: '#059669' }}>৳{po.grandTotal.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {po.status === 'draft' && (
                <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center' }}>
                  <TextField size="small" type="date" label="Expected Delivery" value={expectedDates[po.id] || ''} onChange={(e) => setExpectedDates((p) => ({ ...p, [po.id]: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
                  <Button variant="contained" size="small" startIcon={<LocalShipping />} onClick={() => { placeOrder(pc.id, po.id, userName, expectedDates[po.id]); setSnack(`${po.poNumber} placed`) }}
                    sx={{ bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}>
                    Place Order
                  </Button>
                </Stack>
              )}

              {(po.status === 'placed' || po.status === 'in_transit') && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {po.placedByName ? <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>Placed by {po.placedByName} · {po.placedAt ? new Date(po.placedAt).toLocaleString() : ''}</Typography> : null}
                  {po.expectedDeliveryDate ? <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>Expected: {po.expectedDeliveryDate}</Typography> : null}
                  {/* Delivery tracker */}
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {['placed', 'in_transit', 'delivered'].map((s, i, arr) => {
                      const idx = arr.indexOf(po.status)
                      const done = i <= idx
                      return (
                        <Stack key={s} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: done ? '#059669' : colors.slate[200], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {done ? <CheckCircle sx={{ fontSize: '0.9rem', color: '#fff' }} /> : <Typography sx={{ fontSize: '0.6rem', color: colors.slate[500] }}>{i + 1}</Typography>}
                          </Box>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: done ? 700 : 400, color: done ? '#047857' : colors.slate[400] }}>
                            {s === 'placed' ? 'Placed' : s === 'in_transit' ? 'In Transit' : 'Delivered'}
                          </Typography>
                          {i < arr.length - 1 ? <Box sx={{ width: 20, height: 2, bgcolor: done ? '#059669' : colors.slate[200] }} /> : null}
                        </Stack>
                      )
                    })}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {po.status === 'placed' && (
                      <Button size="small" variant="outlined" onClick={() => { updateStatus(pc.id, po.id, 'in_transit'); setSnack(`${po.poNumber} → In Transit`) }} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                        Mark In Transit
                      </Button>
                    )}
                    {po.status === 'in_transit' && (
                      <Button size="small" variant="contained" onClick={() => { updateStatus(pc.id, po.id, 'delivered'); setSnack(`${po.poNumber} → Delivered`) }}
                        sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                        Mark Delivered
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}

              {po.status === 'delivered' && (
                <Box sx={{ mt: 1.5, p: 1, borderRadius: radii.sm, bgcolor: '#f0fdf4' }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>✓ Delivered {po.deliveredAt ? new Date(po.deliveredAt).toLocaleString() : ''}</Typography>
                </Box>
              )}
            </Box>
          ))}

          {allPlaced && !allDelivered && (
            <Alert severity="info" sx={{ borderRadius: radii.sm }}>Waiting for all orders to be delivered before GRN can be recorded.</Alert>
          )}
          {allDelivered && (
            <Button variant="contained" size="large" onClick={() => {
              advanceStep(pc.id, { action: 'approve', actionByName: userName, actionDate: new Date().toISOString(), note: `All ${pc.purchaseOrders.length} POs delivered` })
              navigate('/mock-procurement/pipeline')
            }}
              sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
              All Delivered — Proceed to GRN →
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  )
}

/* ═══ GRN Panel ═══ */

function GRNPanel({ pc, userName, navigate }: { pc: ProcurementCase; userName: string; navigate: (path: string) => void }) {
  const recordGRN = useMockProcurementStore((s) => s.recordGRN)
  const advanceStep = useMockProcurementStore((s) => s.advanceProcurementStep)
  const [snack, setSnack] = useState<string | null>(null)

  // Build GRN forms per delivered PO
  const deliveredPOs = pc.purchaseOrders.filter((po) => po.status === 'delivered')
  const existingGRNPoIds = new Set(pc.grns.map((g) => g.poId))
  const pendingPOs = deliveredPOs.filter((po) => !existingGRNPoIds.has(po.id))

  const [activePoId, setActivePoId] = useState(pendingPOs[0]?.id ?? '')
  const activePO = pc.purchaseOrders.find((po) => po.id === activePoId)
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>(
    activePO?.lineItems.map((li) => ({ casePartId: li.casePartId, partName: li.partName, orderedQty: li.quantity, receivedQty: li.quantity, condition: 'good' as const })) ?? [],
  )
  const [grnNote, setGrnNote] = useState('')
  const [invoiceFiles, setInvoiceFiles] = useState<{ name: string; url: string }[]>([])

  const allGRNsRecorded = deliveredPOs.length > 0 && pendingPOs.length === 0

  const handleRecordGRN = () => {
    if (!activePO) return
    recordGRN(pc.id, {
      poId: activePO.id,
      poNumber: activePO.poNumber,
      vendorName: activePO.vendorName,
      lineItems: grnLines,
      invoiceAttachmentUrls: invoiceFiles.map((f) => f.url),
      invoiceAttachmentNames: invoiceFiles.map((f) => f.name),
      receivedByName: userName,
      receivedAt: nowIso(),
      notes: grnNote.trim() || undefined,
    })
    setGrnNote('')
    setInvoiceFiles([])

    // Check if this was the last pending PO
    const remainingAfter = pendingPOs.filter((po) => po.id !== activePO.id)
    if (remainingAfter.length === 0) {
      // All GRNs recorded — complete the step
      advanceStep(pc.id, { action: 'approve', actionByName: userName, actionDate: new Date().toISOString(), note: `All GRNs recorded` })
      navigate('/mock-procurement/pipeline')
    } else {
      // Move to next pending PO
      setSnack(`GRN recorded for ${activePO.poNumber}`)
      const nextPo = remainingAfter[0]
      setActivePoId(nextPo.id)
      const nextPoData = pc.purchaseOrders.find((po) => po.id === nextPo.id)
      setGrnLines(nextPoData?.lineItems.map((li) => ({ casePartId: li.casePartId, partName: li.partName, orderedQty: li.quantity, receivedQty: li.quantity, condition: 'good' as const })) ?? [])
    }
  }

  const handleCompleteGRN = () => {
    advanceStep(pc.id, { action: 'approve', actionByName: userName, actionDate: new Date().toISOString(), note: `All ${pc.grns.length + (allGRNsRecorded ? 0 : 1)} GRNs recorded` })
    navigate('/mock-procurement/pipeline')
  }

  return (
    <Stack spacing={2}>
      <Snackbar open={Boolean(snack)} onClose={() => setSnack(null)} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack(null)} severity="success" variant="filled">{snack}</Alert>
      </Snackbar>

      {/* Existing GRNs */}
      {pc.grns.length > 0 && (
        <SectionCard title={`Recorded GRNs (${pc.grns.length})`} icon={<Receipt />}>
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {pc.grns.map((grn) => (
              <Box key={grn.id} sx={{ p: 2, borderRadius: radii.sm, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <CheckCircle sx={{ color: '#059669', fontSize: '1rem' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#047857' }}>{grn.grnNumber} — {grn.vendorName}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>by {grn.receivedByName} · {new Date(grn.receivedAt).toLocaleString()}</Typography>
                </Stack>
                {grn.lineItems.map((li) => (
                  <Typography key={li.casePartId} sx={{ fontSize: '0.78rem', color: colors.slate[700], pl: 3 }}>
                    {li.partName}: received {li.receivedQty}/{li.orderedQty} — {li.condition}
                  </Typography>
                ))}
                {grn.invoiceAttachmentNames.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ pl: 3, mt: 0.5 }}>
                    <AttachFile sx={{ fontSize: '0.8rem', color: colors.slate[400] }} />
                    {grn.invoiceAttachmentNames.map((name, i) => (
                      <Typography key={i} component="a" href={grn.invoiceAttachmentUrls[i]} target="_blank" sx={{ fontSize: '0.72rem', color: '#2563eb', textDecoration: 'underline' }}>{name}</Typography>
                    ))}
                  </Stack>
                ) : null}
              </Box>
            ))}
          </Stack>
        </SectionCard>
      )}

      {/* Pending GRN form */}
      {pendingPOs.length > 0 && activePO ? (
        <Box sx={{ p: 2.5, borderRadius: radii.md, border: `1px solid ${colors.border.default}`, bgcolor: colors.bg.card }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 2 }}>Record GRN for {activePO.poNumber} — {activePO.vendorName}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Ordered</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 80 }}>Received</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 130 }}>Condition</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grnLines.map((li, idx) => (
                <TableRow key={li.casePartId}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{li.partName}</TableCell>
                  <TableCell>{li.orderedQty}</TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={li.receivedQty} onChange={(e) => setGrnLines((p) => p.map((l, i) => i === idx ? { ...l, receivedQty: Number(e.target.value) } : l))} sx={{ width: 70 }} />
                  </TableCell>
                  <TableCell>
                    <TextField select size="small" value={li.condition} onChange={(e) => setGrnLines((p) => p.map((l, i) => i === idx ? { ...l, condition: e.target.value as GRNLineItem['condition'] } : l))} sx={{ width: 120 }}>
                      <MenuItem value="good">Good</MenuItem>
                      <MenuItem value="damaged">Damaged</MenuItem>
                      <MenuItem value="partial">Partial</MenuItem>
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField size="small" label="Note (optional)" value={grnNote} onChange={(e) => setGrnNote(e.target.value)} multiline minRows={2} fullWidth />
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colors.slate[600], mb: 0.5 }}>Invoice Attachment</Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<AttachFile />} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                Upload Invoice
                <input type="file" multiple hidden onChange={(e) => { const nf = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })); setInvoiceFiles((p) => [...p, ...nf]); e.target.value = '' }} />
              </Button>
              {invoiceFiles.map((f, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
                  <AttachFile sx={{ fontSize: '0.8rem', color: colors.slate[400] }} />
                  <Typography sx={{ fontSize: '0.78rem', flex: 1 }}>{f.name}</Typography>
                  <IconButton size="small" onClick={() => setInvoiceFiles((p) => p.filter((_, j) => j !== i))}><Delete sx={{ fontSize: '0.85rem', color: '#ef4444' }} /></IconButton>
                </Stack>
              ))}
            </Box>
            <Button variant="contained" onClick={handleRecordGRN}
              sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
              Record GRN
            </Button>
          </Stack>
        </Box>
      ) : null}

      {allGRNsRecorded && (
        <Button variant="contained" size="large" onClick={handleCompleteGRN}
          sx={{ bgcolor: colors.slate[900], fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: colors.slate[800] } }}>
          Complete — All Goods Received ✓
        </Button>
      )}
    </Stack>
  )
}

function nowIso() { return new Date().toISOString() }

/* ═══ History ═══ */

function HistoryTimeline({ pc }: { pc: ProcurementCase }) {
  if (!pc.history.length) return <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400], p: 2 }}>No history yet.</Typography>
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {pc.history.map((h, i) => (
        <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: h.action === 'reject' ? '#ef4444' : h.action === 'approve' ? '#059669' : '#2563eb', mt: 0.7, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[900] }}>
              <Box component="span" sx={{ fontWeight: 700 }}>{PROCUREMENT_STEP_LABELS[h.step]}</Box>
              {' — '}<Box component="span" sx={{ fontWeight: 600, color: h.action === 'reject' ? '#b91c1c' : '#047857' }}>{h.action.charAt(0).toUpperCase() + h.action.slice(1)}</Box>
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

/* ═══ Main Page ═══ */

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
  const generatePOs = useMockProcurementStore((s) => s.generatePurchaseOrders)

  const pc = cases.find((c) => c.id === caseId)
  const [snack, setSnack] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [quotationDialog, setQuotationDialog] = useState(false)
  const [editQuotation, setEditQuotation] = useState<Quotation | undefined>(undefined)
  // CS selections: casePartId → { quotationId, vendorName, ... }
  const [csSelections, setCsSelections] = useState<Record<string, { quotationId: string; vendorName: string; unitPrice: number; quantity: number; totalPrice: number }>>({})
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
    // Special: after approval step, also auto-generate POs
    if (pc.currentStep === 'approval') {
      advanceStep(pc.id, { action: 'approve', actionByName: userName, actionDate: new Date().toISOString(), note: actionNote.trim() || undefined })
      // Generate POs right after advancing to PO step
      setTimeout(() => generatePOs(pc.id), 0)
    } else {
      advanceStep(pc.id, { action: pc.currentStep === 'quotations' ? 'submit' : 'approve', actionByName: userName, actionDate: new Date().toISOString(), note: actionNote.trim() || undefined })
    }
    setActionNote('')
    setSnack(`${PROCUREMENT_STEP_LABELS[pc.currentStep]} — Done`)
    navigate('/mock-procurement/pipeline')
  }

  const handleReject = () => {
    rejectStep(pc.id, rejectNote.trim() || 'Rejected', userName)
    setRejectNote('')
    setShowReject(false)
    setSnack(`${PROCUREMENT_STEP_LABELS[pc.currentStep]} — Rejected`)
    navigate('/mock-procurement/pipeline')
  }

  const handleCSSubmit = () => {
    if (Object.keys(csSelections).length !== pc.parts.length) {
      setSnack('Select a vendor for every part')
      return
    }
    const items: CSDecisionItem[] = Object.entries(csSelections).map(([casePartId, sel]) => {
      const part = pc.parts.find((p) => p.id === casePartId)
      return {
        casePartId,
        partName: part?.partName ?? '',
        selectedQuotationId: sel.quotationId,
        selectedVendorName: sel.vendorName,
        unitPrice: sel.unitPrice,
        quantity: sel.quantity,
        totalPrice: sel.totalPrice,
      }
    })
    setCSDecisionStore(pc.id, { items, note: csNote.trim() || 'CS decision submitted', decidedByName: userName })
    advanceStep(pc.id, { action: 'submit', actionByName: userName, actionDate: new Date().toISOString(), note: csNote.trim() || `Vendors selected for ${items.length} parts` })
    setSnack('CS Decision submitted')
    navigate('/mock-procurement/pipeline')
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
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.6rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>{pc.caseNumber}</Typography>
              <Chip size="small" label={`${pc.parts.length} parts`} sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: colors.slate[100] }} />
              <Chip size="small" label={isCompleted ? pc.status.toUpperCase() : PROCUREMENT_STEP_LABELS[pc.currentStep]}
                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: isCompleted ? (pc.status === 'approved' ? '#d1fae5' : '#fee2e2') : '#e0e7ff', color: isCompleted ? (pc.status === 'approved' ? '#047857' : '#b91c1c') : '#3730a3' }} />
            </Stack>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
              {pc.parts.map((p) => p.partName).join(', ')} — {pc.customerName}
            </Typography>
          </Box>
        </Stack>

        {/* Step Progress */}
        <Box sx={{ p: 2, borderRadius: radii.md, bgcolor: colors.bg.card, boxShadow: shadows.card, border: `1px solid ${colors.border.subtle}` }}>
          <StepProgressBar currentStep={pc.currentStep} status={pc.status} />
        </Box>

        {/* Parts Details — always visible */}
        <PartsDetailsSection pc={pc} />
        <VehicleInfoSection pc={pc} />

        {/* Accumulated completed steps */}
        {pc.storeReview && currentIdx > 0 ? <CompletedStepBadge label="Store Review" byName={pc.storeReview.actionByName} date={pc.storeReview.actionDate} note={pc.storeReview.note} /> : null}
        {currentIdx > 1 && pc.currentStep !== 'approval' && !isCompleted ? (
          <SectionCard title={`Quotations (${pc.quotations.length})`} icon={<Add />} defaultCollapsed>
            <QuotationsSummaryTable quotations={pc.quotations} />
          </SectionCard>
        ) : null}
        {pc.csDecision && currentIdx > 2 ? <CSDecisionSummary pc={pc} /> : null}
        {pc.auditReview && currentIdx > 3 ? <CompletedStepBadge label="Audit Review" byName={pc.auditReview.actionByName} date={pc.auditReview.actionDate} note={pc.auditReview.note} /> : null}
        {pc.managementApproval && currentIdx > 4 ? <CompletedStepBadge label="Approval" byName={pc.managementApproval.actionByName} date={pc.managementApproval.actionDate} note={pc.managementApproval.note} /> : null}

        {/* ═══ Active Step Panel ═══ */}
        {!isCompleted ? (
          <Box sx={{ p: 3, borderRadius: radii.md, border: '2px solid #2563eb', bgcolor: '#f8faff', boxShadow: shadows.elevated }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1d4ed8', mb: 2 }}>Action: {PROCUREMENT_STEP_LABELS[pc.currentStep]}</Typography>

            {/* Store Review */}
            {pc.currentStep === 'store_review' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>Review parts and vehicle info. Confirm stock unavailability.</Alert>
                <TextField size="small" label="Note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Approve & Send to Quotations</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* Quotations */}
            {pc.currentStep === 'quotations' && (
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Quotations ({pc.quotations.length})</Typography>
                  <Button size="small" startIcon={<Add />} variant="contained" onClick={() => { setEditQuotation(undefined); setQuotationDialog(true) }} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Add Quotation</Button>
                </Stack>
                <QuotationsSummaryTable quotations={pc.quotations} editable onEdit={(q) => { setEditQuotation(q); setQuotationDialog(true) }} onRemove={(id) => removeQuotation(pc.id, id)} />
                <Divider />
                <TextField size="small" label="Submission note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} disabled={!pc.quotations.length} sx={{ bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}>Submit for CS</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* CS */}
            {pc.currentStep === 'cs' && (
              <Stack spacing={2}>
                <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>Select the best vendor for each part. Click a cell to select.</Typography>
                <CSMatrix pc={pc} selections={csSelections} onSelect={(casePartId, quotationId, vendorName, unitPrice, quantity, totalPrice) => setCsSelections((p) => ({ ...p, [casePartId]: { quotationId, vendorName, unitPrice, quantity, totalPrice } }))} />
                {Object.keys(csSelections).length > 0 && (
                  <Box sx={{ p: 1.5, borderRadius: radii.sm, bgcolor: colors.slate[50] }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 0.5 }}>Selection Summary:</Typography>
                    {Object.entries(csSelections).map(([partId, sel]) => {
                      const part = pc.parts.find((p) => p.id === partId)
                      return <Typography key={partId} sx={{ fontSize: '0.78rem', color: colors.slate[700] }}>{part?.partName}: <b>{sel.vendorName}</b> — ৳{sel.totalPrice.toLocaleString()}</Typography>
                    })}
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mt: 0.5, color: '#059669' }}>
                      Combined Total: ৳{Object.values(csSelections).reduce((s, v) => s + v.totalPrice, 0).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                <Divider />
                <TextField size="small" label="Decision note" value={csNote} onChange={(e) => setCsNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleCSSubmit} disabled={Object.keys(csSelections).length !== pc.parts.length} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Submit CS Decision</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* Audit */}
            {pc.currentStep === 'audit' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>Review parts, selected vendors from CS decision, and quotation attachments.</Alert>
                <CSDecisionSummary pc={pc} />
                <SectionCard title={`All Quotations & Attachments (${pc.quotations.length})`} icon={<AttachFile />} defaultCollapsed>
                  <QuotationsSummaryTable quotations={pc.quotations} />
                </SectionCard>
                <TextField size="small" label="Audit note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Approve</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* Approval — shows ALL accumulated info */}
            {pc.currentStep === 'approval' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>Final approval. Review all information below.</Alert>
                {pc.storeReview ? <CompletedStepBadge label="Store Review" byName={pc.storeReview.actionByName} date={pc.storeReview.actionDate} note={pc.storeReview.note} /> : null}
                <CSDecisionSummary pc={pc} />
                <SectionCard title={`All Quotations (${pc.quotations.length})`} icon={<AttachFile />} defaultCollapsed>
                  <QuotationsSummaryTable quotations={pc.quotations} />
                </SectionCard>
                {pc.auditReview ? <CompletedStepBadge label="Audit" byName={pc.auditReview.actionByName} date={pc.auditReview.actionDate} note={pc.auditReview.note} /> : null}
                <Divider />
                <TextField size="small" label="Approval note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Final Approve ✓</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* PO */}
            {pc.currentStep === 'po' && <POPanel pc={pc} userName={userName} navigate={navigate} />}

            {/* GRN */}
            {pc.currentStep === 'grn' && <GRNPanel pc={pc} userName={userName} navigate={navigate} />}
          </Box>
        ) : (
          <Alert severity={pc.status === 'approved' ? 'success' : 'error'} sx={{ borderRadius: radii.md, fontWeight: 700 }}>
            {pc.status === 'approved' ? 'Procurement complete — all goods received.' : 'Rejected.'}
          </Alert>
        )}

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
        <QuotationDialog open={quotationDialog} onClose={() => setQuotationDialog(false)} parts={pc.parts} initial={editQuotation}
          onSave={(q) => { if (editQuotation) updateQuotation(pc.id, editQuotation.id, q); else addQuotation(pc.id, q) }} />

        {/* History */}
        <SectionCard title="History" icon={<History />} defaultCollapsed>
          <HistoryTimeline pc={pc} />
        </SectionCard>
      </Stack>
    </Box>
  )
}
