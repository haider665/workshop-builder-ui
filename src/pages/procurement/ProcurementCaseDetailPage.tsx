import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  Add,
  AttachFile,
  Cancel,
  CheckCircle,
  Delete,
  DirectionsCar,
  History,
  Inventory,
  LocalShipping,
  Print,
  Receipt,
} from '@mui/icons-material'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { RequestMasterDataButton } from '../../components/RequestMasterDataButton'
import { workshopApi, type CWMasterDataRequest } from '../../services/workshopApi'
import { mapBackendProcurementCase, mapBackendPurchaseOrder, mapBackendPurchaseReceipt, mapBackendSupplierInvoice, mapBackendSupplierPayment } from '../../services/procurementAdapter'
import { useCompanyStore } from '../../store/companyStore'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { MOCK_VENDORS } from '../../store/mockProcurementData'
import { useSessionStore } from '../../store/sessionStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { ProcurementCase, ProcurementStep, Quotation, QuotationLineItem, CSDecisionItem, CSDecision, GRNLineItem } from '../../types/procurementWorkflow'
import { PROCUREMENT_STEPS, PROCUREMENT_STEP_LABELS } from '../../types/procurementWorkflow'

async function hydrateBackendProcurementCase(data: Record<string, unknown>): Promise<ProcurementCase> {
  const mapped = mapBackendProcurementCase(data)
  const summaries = Array.isArray(data.supplierQuotations) ? data.supplierQuotations as Array<Record<string, unknown>> : []
  if (summaries.length) {
    const full = await Promise.all(summaries.map(async (summary) => {
      try { return await workshopApi.accountingGet('quotations', String(summary.id)) } catch { return summary }
    }))
    mapped.quotations = full.map((quote) => ({
      id: String(quote.id), vendorName: String(quote.supplierName || quote.supplierId || 'Supplier'), sourcingType: 'Local' as const,
      // Supplier quotations are created from the appointment's preselected part
      // rows. Preserve that positional relationship so duplicate requested names
      // (for example two separate "test" lines) remain distinct in the CS matrix.
      lineItems: (Array.isArray(quote.items) ? quote.items : []).map((item: Record<string, unknown>, index: number) => mapQuotationLine(item, mapped.parts[index]?.id, mapped.parts)),
      grandTotal: Number(quote.grandTotal || quote.totalAmount || 0), currency: String(quote.currency || 'BDT'), attachmentUrls: [], attachmentNames: [], submittedAt: String(quote.createdAt || data.updatedAt || new Date().toISOString()),
    }))
  }
  // CS selections are stored in the compare-sheet snapshot. Rehydrate them
  // into the case DTO so the Audit screen can show the prior decision after a
  // refresh instead of relying on the in-memory mock store.
  const compareSheetId = String(data.compareSheetId || '')
  if (compareSheetId) {
    try {
      const compareSheet = await workshopApi.accountingGet('compare_sheets', compareSheetId)
      const snapshotItems = Array.isArray(compareSheet.items) ? compareSheet.items as Array<Record<string, unknown>> : []
      const decidedItems: CSDecisionItem[] = snapshotItems.flatMap((item, index) => {
        const selectedQuotationId = String(item.selectedSupplierQuotationId || '')
        if (!selectedQuotationId) return []
        const quotation = mapped.quotations.find((candidate) => candidate.id === selectedQuotationId)
        const partRequestId = String(item.partRequestId || item.cwPartRequest || '')
        const part = mapped.parts.find((candidate) => candidate.lineItemId === partRequestId) || mapped.parts[index]
        const quantity = Number(item.qty || part?.quantity || 1)
        const unitPrice = Number(item.selectedRate || item.lowestRate || 0)
        return [{
          casePartId: part?.id || String(item.itemCode || `part-${index}`),
          partName: String(item.description || item.itemName || part?.partName || 'Requested part'),
          selectedQuotationId,
          selectedVendorName: String(item.selectedVendorName || quotation?.vendorName || 'Supplier'),
          unitPrice,
          quantity,
          totalPrice: Number(item.selectedTotal || unitPrice * quantity),
        }]
      })
      if (decidedItems.length) {
        const csDecision: CSDecision = {
          items: decidedItems,
          note: String(compareSheet.approvalReason || 'CS decision submitted'),
          decidedByName: String(compareSheet.approvedByUserId || 'CS team'),
          decidedAt: String(compareSheet.updatedAt || data.updatedAt || new Date().toISOString()),
        }
        mapped.csDecision = csDecision
      }
    } catch {
      // Older cases may not have a readable compare sheet; retain the case data.
    }
  }
  const purchaseOrderId = String(data.purchaseOrderId || '')
  const purchaseReceiptId = String(data.purchaseReceiptId || '')
  const purchaseOrderIds = Array.isArray(data.purchaseOrderIds) && data.purchaseOrderIds.length
    ? data.purchaseOrderIds.map(String)
    : purchaseOrderId ? [purchaseOrderId] : []
  const purchaseReceiptIds = Array.isArray(data.purchaseReceiptIds) && data.purchaseReceiptIds.length
    ? data.purchaseReceiptIds.map(String)
    : purchaseReceiptId ? [purchaseReceiptId] : []
  if (purchaseOrderIds.length || purchaseReceiptIds.length) {
    try {
      const [orders, receipts] = await Promise.all([
        Promise.all(purchaseOrderIds.map((id) => workshopApi.accountingGet('purchase_orders', id).catch(() => null))),
        Promise.all(purchaseReceiptIds.map((id) => workshopApi.accountingGet('receipts', id).catch(() => null))),
      ])
      const orderRows = orders.filter((row): row is Record<string, unknown> => Boolean(row))
      const receiptRows = receipts.filter((row): row is Record<string, unknown> => Boolean(row))
      const receiptOrderId = (receipt: Record<string, unknown>) => {
        const items = Array.isArray(receipt.items) ? receipt.items as Array<Record<string, unknown>> : []
        return String(items[0]?.purchaseOrderId || receipt.purchaseOrderId || '')
      }
      mapped.purchaseOrders = orderRows.map((order) => {
        const receipt = receiptRows.find((row) => receiptOrderId(row) === String(order.id)) || null
        return mapBackendPurchaseOrder(order, String(data.procurementType || ''), receipt)
      })
      mapped.grns = receiptRows.map((receipt) => {
        const order = mapped.purchaseOrders.find((candidate) => candidate.id === receiptOrderId(receipt))
        return mapBackendPurchaseReceipt(receipt, order)
      })
    } catch {
      // Keep the case usable if linked commercial documents are unavailable.
    }
  }
  const purchaseInvoiceId = String(data.purchaseInvoiceId || '')
  const paymentEntryId = String(data.paymentEntryId || '')
  if (purchaseInvoiceId || paymentEntryId) {
    try {
      const [invoice, payment] = await Promise.all([
        purchaseInvoiceId ? workshopApi.accountingGet('invoices', purchaseInvoiceId).catch(() => null) : Promise.resolve(null),
        paymentEntryId ? workshopApi.accountingGet('payments', paymentEntryId).catch(() => null) : Promise.resolve(null),
      ])
      if (invoice) mapped.supplierInvoice = mapBackendSupplierInvoice(invoice)
      if (payment) mapped.supplierPayment = mapBackendSupplierPayment(payment)
    } catch {
      // Keep the case usable if supplier settlement documents are unavailable.
    }
  }
  return mapped
}

function mapQuotationLine(item: Record<string, unknown>, fallbackCasePartId?: string, caseParts?: ProcurementCase['parts']): QuotationLineItem {
  const unitPrice = Number(item.rate ?? 0)
  const quantity = Number(item.qty ?? 0)
  const persistedTotal = item.amount ?? item.baseAmount
  const partRequestId = String(item.partRequestId || item.cwPartRequest || '')
  const rawDescription = String(item.description || '')
  const deliveryMatch = rawDescription.match(/\s*·\s*Delivery:\s*([\d.]+)\s+(Hours|Days|Week|Month|Year)\s*$/i)
  const requestedName = rawDescription.replace(/\s*·\s*Delivery:\s*[\d.]+\s+(Hours|Days|Week|Month|Year)\s*$/i, '').trim()
  const deliveryUnit = deliveryMatch?.[2]
  const normalizedUnit = deliveryUnit ? (deliveryUnit.charAt(0).toUpperCase() + deliveryUnit.slice(1).toLowerCase()) as QuotationLineItem['deliveryUnit'] : undefined
  return {
    casePartId: partRequestId ? caseParts?.find((part) => part.lineItemId === partRequestId)?.id || partRequestId : fallbackCasePartId || String(item.itemCode || item.id || ''),
    // ERPNext's item_name is the catalogue name; description retains the
    // requested appointment text and is the reliable identity for CS display.
    partName: requestedName || String(item.itemName || item.itemCode || 'Part'),
    unitPrice,
    quantity,
    totalPrice: Number(persistedTotal ?? unitPrice * quantity),
    deliveryDays: deliveryMatch ? Number(deliveryMatch[1]) : undefined,
    deliveryUnit: normalizedUnit,
  }
}

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

/** The audit record is intentionally shown separately from the CS decision.
 *  CS remains the original green decision; audit recommendations are evidence
 *  for the approver and are never silently substituted for that decision. */
function AuditDecisionSummary({ pc }: { pc: ProcurementCase }) {
  if (!pc.auditReview) return null
  return (
    <Box sx={{ p: 2, borderRadius: radii.sm, bgcolor: '#fff1f2', border: '1px solid #fecdd3' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <History sx={{ color: '#dc2626', fontSize: '1rem' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#b91c1c' }}>Audit decision and recommendations</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
          by {pc.auditReview.actionByName} · {new Date(pc.auditReview.actionDate).toLocaleString()}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.8rem', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
        {pc.auditReview.note || 'Audit completed without additional recommendations.'}
      </Typography>
    </Box>
  )
}

/* ═══ Parts Details Table ═══ */

function ExcludedPartMarker() {
  return (
    <Tooltip title="Excluded from procurement at Store Review">
      <Chip
        size="small"
        icon={<Cancel sx={{ fontSize: '0.9rem !important', color: '#dc2626 !important' }} />}
        label="Not procured"
        sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: '#fee2e2', color: '#b91c1c' }}
      />
    </Tooltip>
  )
}

function PartsDetailsSection({ pc, selectionMode, selections, onSelectionChange }: {
  pc: ProcurementCase
  selectionMode?: boolean
  selections?: Record<string, boolean>
  onSelectionChange?: (partId: string, included: boolean) => void
}) {
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
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Procurement</TableCell>
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
                <TableCell>
                  {selectionMode ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={selections?.[p.id] !== false}
                          onChange={(event) => onSelectionChange?.(p.id, event.target.checked)}
                          sx={{ color: '#dc2626', '&.Mui-checked': { color: '#059669' } }}
                        />
                      }
                      label={selections?.[p.id] === false ? 'Exclude' : 'Include'}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem', fontWeight: 700 } }}
                    />
                  ) : p.includeInProcurement === false ? <ExcludedPartMarker /> : (
                    <Chip size="small" label="Included" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: '#d1fae5', color: '#047857' }} />
                  )}
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

function QuotationDialog({ open, onClose, onSave, parts, initial, company, caseId, masterDataRequests, onMasterDataRequested }: {
  open: boolean
  onClose: () => void
  onSave: (q: Omit<Quotation, 'id' | 'submittedAt'>) => void | Promise<void>
  parts: ProcurementCase['parts']
  initial?: Quotation
  company?: string | null
  caseId?: string
  masterDataRequests?: CWMasterDataRequest[]
  onMasterDataRequested?: (request: CWMasterDataRequest) => void
}) {
  const includedPartIds = new Set(parts.map((part) => part.id))
  const defaultLines = () => parts.map((part) => ({ casePartId: part.id, partName: part.partName, unitPrice: 0, quantity: part.quantity, totalPrice: 0, deliveryUnit: 'Days' as const }))
  const initialLines = initial?.lineItems.filter((line) => includedPartIds.has(line.casePartId)) ?? defaultLines()
  const [vendorId, setVendorId] = useState(initial ? MOCK_VENDORS.find((v) => v.name === initial.vendorName)?.id ?? '' : '')
  const [liveVendors, setLiveVendors] = useState<Array<{ id: string; name: string; type?: string }>>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>(initialLines)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [files, setFiles] = useState<{ name: string; url: string }[]>(
    initial?.attachmentUrls?.map((url, i) => ({ name: initial.attachmentNames?.[i] ?? `file-${i + 1}`, url })) ?? [],
  )
  useEffect(() => {
    if (open) {
      setSaveError(null)
      setSaving(false)
      setVendorId(initial ? MOCK_VENDORS.find((vendor) => vendor.name === initial.vendorName)?.id ?? '' : '')
      const openPartIds = new Set(parts.map((part) => part.id))
      setLineItems(initial?.lineItems.filter((line) => openPartIds.has(line.casePartId)) ?? parts.map((part) => ({ casePartId: part.id, partName: part.partName, unitPrice: 0, quantity: part.quantity, totalPrice: 0, deliveryUnit: 'Days' as const })))
      setNotes(initial?.notes ?? '')
      setFiles(initial?.attachmentUrls?.map((url, index) => ({ name: initial.attachmentNames?.[index] ?? `file-${index + 1}`, url })) ?? [])
      if (company) {
        void workshopApi.accountingSuppliers().then((response) => setLiveVendors(response.data)).catch(() => setLiveVendors([]))
      }
    }
  }, [open, company, initial, parts])
  useEffect(() => {
    if (!open || !initial || !liveVendors.length) return
    if (liveVendors.some((vendor) => vendor.id === vendorId)) return
    const matchingVendor = liveVendors.find((vendor) => vendor.name.trim().toLowerCase() === initial.vendorName.trim().toLowerCase())
    if (matchingVendor) setVendorId(matchingVendor.id)
  }, [open, initial, liveVendors, vendorId])
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedLiveVendor = liveVendors.find((v) => v.id === vendorId)
  const selectedMockVendor = MOCK_VENDORS.find((v) => v.id === vendorId)
  const selectedVendor = selectedLiveVendor
    ? { ...selectedLiveVendor, contact: '', phone: '', sourcingType: selectedLiveVendor.type === 'Foreign' ? 'Foreign' as const : 'Local' as const }
    : selectedMockVendor

  const updateLine = (idx: number, field: keyof QuotationLineItem, value: number | string) => {
    setLineItems((prev) => prev.map((li, i) => {
      if (i !== idx) return li
      const updated = { ...li, [field]: value }
      if (field === 'unitPrice' || field === 'quantity') updated.totalPrice = (updated.unitPrice ?? 0) * (updated.quantity ?? 0)
      return updated
    }))
  }

  const grandTotal = lineItems.reduce((s, li) => s + (li.totalPrice || 0), 0)

  const handleSave = async () => {
    if (!selectedVendor) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
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
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to save this quotation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{initial ? 'Edit Quotation' : 'Add Quotation'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {saveError ? <Alert severity="error" sx={{ borderRadius: radii.sm }}>{saveError}</Alert> : null}
          <Alert severity="info" sx={{ borderRadius: radii.sm }}>
            Parts are preloaded from this appointment. If a part is not yet in the Item master, saving the quotation creates a traceable provisional purchase reference and sends the Item Master request for admin review; quotation and CS work can continue meanwhile.
          </Alert>
          <TextField select size="small" label="Select Vendor *" value={vendorId} onChange={(e) => setVendorId(e.target.value)} fullWidth>
            {(company && liveVendors.length ? liveVendors.map((v) => ({ ...v, contact: '', phone: '', sourcingType: v.type === 'Foreign' ? 'Foreign' as const : 'Local' as const })) : MOCK_VENDORS).map((v) => (
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
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{li.partName}</Typography>
                      {(() => {
                        const part = parts.find((candidate) => candidate.id === li.casePartId)
                        const existingRequest = (masterDataRequests || []).find((request: CWMasterDataRequest) => {
                          const context = request.context || {}
                          return request.targetDoctype === 'Item'
                            && String(context.partRequestId || '') === String(part?.lineItemId || li.casePartId)
                            && request.requestedValue.trim().toLowerCase() === li.partName.trim().toLowerCase()
                        })
                        if (part?.partNumber) return null
                        if (existingRequest?.status === 'Pending') {
                          return <Chip size="small" label="Item master pending approval" sx={{ mt: 0.5, fontSize: '0.65rem', bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }} />
                        }
                        if (existingRequest?.status === 'Approved') {
                          return <Chip size="small" label="Item master approved · refresh to use" sx={{ mt: 0.5, fontSize: '0.65rem', bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700 }} />
                        }
                        return (
                          <RequestMasterDataButton
                            compact
                            label={existingRequest?.status === 'Rejected' ? 'Request Item Master again' : 'Request Item Master'}
                            targetDoctype="Item"
                            targetField="item_name"
                            requestedValue={li.partName}
                            company={company || undefined}
                            sourceRoute={window.location.pathname}
                            context={{ procurementCaseId: caseId, partRequestId: part?.lineItemId, partName: li.partName }}
                            onRequested={async (requestId, requestedValue) => {
                              // The backend creates a provisional purchase-only Item at request
                              // time. Refresh the request DTO here so this quotation can use its
                              // reference immediately, while the admin review remains pending.
                              try {
                                const request = await workshopApi.ensureProvisionalItemRequest(requestId)
                                onMasterDataRequested?.(request)
                              } catch {
                                onMasterDataRequested?.({
                                  id: requestId,
                                  company,
                                  targetDoctype: 'Item',
                                  targetField: 'item_name',
                                  requestedValue: requestedValue || li.partName,
                                  context: { procurementCaseId: caseId, partRequestId: part?.lineItemId, partName: li.partName },
                                  status: 'Pending',
                                  requestedBy: 'Current user',
                                  requestedAt: new Date().toISOString(),
                                })
                              }
                            }}
                          />
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.unitPrice || ''} onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))} sx={{ width: 110 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.quantity || ''} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} sx={{ width: 70 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>৳{(li.totalPrice || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <TextField size="small" type="number" value={li.deliveryDays || ''} onChange={(e) => updateLine(idx, 'deliveryDays', Number(e.target.value))} sx={{ width: 80 }} placeholder="time" />
                        <TextField select size="small" value={li.deliveryUnit || 'Days'} onChange={(e) => updateLine(idx, 'deliveryUnit', e.target.value)} sx={{ width: 100 }} aria-label="Delivery unit">
                          <MenuItem value="Hours">Hours</MenuItem>
                          <MenuItem value="Days">Days</MenuItem>
                          <MenuItem value="Week">Week</MenuItem>
                          <MenuItem value="Month">Month</MenuItem>
                          <MenuItem value="Year">Year</MenuItem>
                        </TextField>
                      </Stack>
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
        <Button variant="contained" onClick={handleSave} disabled={saving || !vendorId || lineItems.every((li) => !li.unitPrice)}>
          {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══ Quotations Summary Table ═══ */

function QuotationsSummaryTable({ quotations, editable, onEdit, onRemove, onPrint }: {
  quotations: Quotation[]
  editable?: boolean
  onEdit?: (q: Quotation) => void
  onRemove?: (id: string) => void
  onPrint?: (q: Quotation) => void
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
            {onPrint ? <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Print</TableCell> : null}
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
              {onPrint ? (
                <TableCell>
                  <Button size="small" startIcon={<Print sx={{ fontSize: '0.9rem' }} />} onClick={() => onPrint(q)} sx={{ fontSize: '0.7rem', minWidth: 0, textTransform: 'none' }}>Print</Button>
                </TableCell>
              ) : null}
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

type AuditPriceSuggestion = {
  quotationId: string
  vendorName: string
  partName: string
  casePartId: string
  originalUnitPrice: number
  suggestedUnitPrice: number
  quantity: number
}

type DecisionSelection = {
  quotationId: string
  vendorName: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

function auditSelectionsFromReview(pc: ProcurementCase): Record<string, DecisionSelection> {
  const note = pc.auditReview?.note || ''
  const section = note.split('Audit suggestions:')[1]?.split('\n')[0]
  if (!section) return {}
  const parts = pc.parts.filter((part) => part.includeInProcurement !== false)
  const usedParts = new Set<string>()
  const selections: Record<string, DecisionSelection> = {}
  section.split(';').forEach((entry) => {
    const match = entry.trim().match(/^(.+?)\s*→\s*(.+?)\s*·\s*৳([\d,]+)/)
    if (!match) return
    const [, partName, vendorName, totalText] = match
    const part = parts.find((candidate) => !usedParts.has(candidate.id) && candidate.partName.trim() === partName.trim())
    const quotation = pc.quotations.find((candidate) => candidate.vendorName.trim() === vendorName.trim())
    if (!part || !quotation) return
    const line = quotation.lineItems.find((candidate) => candidate.casePartId === part.id) || quotation.lineItems[parts.indexOf(part)]
    if (!line) return
    const totalPrice = Number(totalText.replace(/,/g, ''))
    usedParts.add(part.id)
    selections[part.id] = { quotationId: quotation.id, vendorName: quotation.vendorName, unitPrice: totalPrice / Math.max(1, line.quantity), quantity: line.quantity, totalPrice }
  })
  return selections
}

/* ═══ CS Comparison Matrix ═══ */

function CSMatrix({ pc, selections, referenceSelections, existingSelections, onSelect, auditMode = false, auditPriceSuggestions = {}, onSuggestPrice }: {
  pc: ProcurementCase
  selections: Record<string, { quotationId: string; vendorName: string; unitPrice: number; quantity: number; totalPrice: number }>
  referenceSelections?: Record<string, DecisionSelection>
  existingSelections?: Record<string, DecisionSelection>
  onSelect: (casePartId: string, quotationId: string, vendorName: string, unitPrice: number, quantity: number, totalPrice: number) => void
  auditMode?: boolean
  auditPriceSuggestions?: Record<string, AuditPriceSuggestion>
  onSuggestPrice?: (key: string, suggestion: AuditPriceSuggestion | null) => void
}) {
  const vendors = pc.quotations
  const parts = pc.parts.filter((part) => part.includeInProcurement !== false)
  if (!vendors.length || !parts.length) return <Alert severity="warning" sx={{ borderRadius: radii.sm }}>No quotations to compare.</Alert>

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
          {parts.map((part) => (
            <TableRow key={part.id}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', position: 'sticky', left: 0, bgcolor: colors.bg.card, zIndex: 1 }}>
                {part.partName}
                <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>Qty: {part.quantity}</Typography>
              </TableCell>
              {vendors.map((q) => {
                // casePartId is assigned from the appointment part order when
                // the quote is hydrated. Name/number fallback keeps older
                // quotations visible, while occurrence matching prevents the
                // first duplicate name from being reused for every row.
                const partIndex = parts.findIndex((candidate) => candidate.id === part.id)
                const li = q.lineItems.find((line) => line.casePartId === part.id)
                  || q.lineItems[partIndex]
                  || q.lineItems.find((line) => line.partName === part.partName || (part.partNumber && line.casePartId === part.partNumber))
                const isSelected = selections[part.id]?.quotationId === q.id
                const auditReference = referenceSelections?.[part.id]
                const isAuditReference = Boolean(auditReference && auditReference.quotationId === q.id)
                const existingDecision = existingSelections?.[part.id]
                const isExistingDecision = Boolean(existingDecision && existingDecision.quotationId === q.id)
                const priorDecision = auditMode ? pc.csDecision?.items?.find((item) => item.casePartId === part.id) : undefined
                const isPriorDecision = Boolean(priorDecision && priorDecision.selectedQuotationId === q.id)
                const suggestionKey = `${q.id}:${part.id}`
                const suggestion = auditPriceSuggestions[suggestionKey]
                const isAuditRecommendation = Boolean(auditMode && (isSelected || suggestion))
                return (
                  <TableCell
                    key={q.id}
                    onClick={li ? () => onSelect(part.id, q.id, q.vendorName, li.unitPrice, li.quantity, li.totalPrice) : undefined}
                    sx={{
                      textAlign: 'center',
                      cursor: li ? 'pointer' : 'default',
                      bgcolor: isPriorDecision || isExistingDecision ? '#ecfdf5' : isAuditReference || isAuditRecommendation ? '#fff1f2' : isSelected ? '#eff6ff' : 'transparent',
                      border: isPriorDecision || isExistingDecision ? '2px solid #16a34a' : isAuditReference || isAuditRecommendation ? '2px solid #dc2626' : isSelected ? '2px solid #2563eb' : '2px solid transparent',
                      borderRadius: radii.sm,
                      '&:hover': li ? { bgcolor: isPriorDecision ? '#ecfdf5' : isAuditRecommendation ? '#fff1f2' : isSelected ? '#eff6ff' : colors.slate[50] } : {},
                    }}
                  >
                    {li ? (
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: isPriorDecision || isExistingDecision ? '#15803d' : isAuditReference || isAuditRecommendation ? '#dc2626' : isSelected ? '#1d4ed8' : colors.slate[900] }}>
                          ৳{li.unitPrice.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>
                          Total: ৳{li.totalPrice.toLocaleString()}
                        </Typography>
                        {li.deliveryDays ? <Typography sx={{ fontSize: '0.65rem', color: colors.slate[400] }}>{li.deliveryDays} {li.deliveryUnit || 'Days'} delivery</Typography> : null}
                        {isPriorDecision || isExistingDecision ? <Chip size="small" label="Existing CS decision" sx={{ mt: 0.5, height: 18, fontSize: '0.58rem', fontWeight: 700, color: '#15803d', bgcolor: '#bbf7d0' }} /> : null}
                        {(isAuditReference || (auditMode && isSelected)) && !isPriorDecision ? <Chip size="small" label="Audit recommendation" sx={{ mt: 0.5, height: 18, fontSize: '0.58rem', fontWeight: 700, color: '#dc2626', bgcolor: '#fee2e2' }} /> : null}
                        {isSelected && !isPriorDecision ? <CheckCircle sx={{ color: '#2563eb', fontSize: '0.9rem', mt: 0.25 }} /> : null}
                        {auditMode && onSuggestPrice ? (
                          <>
                            <TextField
                              size="small"
                              type="number"
                              label="Audit suggestion"
                              placeholder={String(li.unitPrice)}
                              value={suggestion?.suggestedUnitPrice ?? ''}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                const raw = event.target.value
                                const value = Number(raw)
                                if (!raw || !Number.isFinite(value)) {
                                  onSuggestPrice(suggestionKey, null)
                                } else {
                                  onSuggestPrice(suggestionKey, { quotationId: q.id, vendorName: q.vendorName, partName: part.partName, casePartId: part.id, originalUnitPrice: li.unitPrice, suggestedUnitPrice: value, quantity: li.quantity })
                                }
                              }}
                              sx={{ width: 132, mt: 0.75, '& .MuiInputLabel-root': { color: '#dc2626', fontSize: '0.68rem' }, '& .MuiOutlinedInput-root': { bgcolor: '#fff', '& fieldset': { borderColor: '#fca5a5' } } }}
                            />
                            {suggestion ? <Typography sx={{ mt: 0.25, fontSize: '0.65rem', fontWeight: 700, color: '#dc2626' }}>Suggested total: ৳{(suggestion.suggestedUnitPrice * suggestion.quantity).toLocaleString()}</Typography> : null}
                          </>
                        ) : null}
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

function POPanel({ pc, onChanged }: { pc: ProcurementCase; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [etas, setEtas] = useState<Record<string, string>>({})

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
      setSnack(success)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the purchase order')
    } finally {
      setBusy(false)
    }
  }

  const statusColors: Record<string, { bgcolor: string; color: string }> = {
    draft: { bgcolor: colors.slate[100], color: colors.slate[600] },
    placed: { bgcolor: '#dbeafe', color: '#1d4ed8' },
    in_transit: { bgcolor: '#fef3c7', color: '#92400e' },
    delivered: { bgcolor: '#d1fae5', color: '#047857' },
  }
  const allPlaced = pc.purchaseOrders.length > 0 && pc.purchaseOrders.every((po) => po.status !== 'draft')
  const allDelivered = pc.purchaseOrders.length > 0 && pc.purchaseOrders.every((po) => po.status === 'delivered')

  return (
    <Stack spacing={2}>
      <Snackbar open={Boolean(snack)} onClose={() => setSnack(null)} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack(null)} severity="success" variant="filled">{snack}</Alert>
      </Snackbar>
      {error ? <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert> : null}

      {pc.purchaseOrders.length === 0 ? (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: radii.sm }}>
            Generate the standard Purchase Orders from the approved comparative statement. One PO is created per selected vendor.
          </Alert>
          {!pc.compareSheetId ? <Alert severity="warning" sx={{ borderRadius: radii.sm }}>This case has no approved compare sheet linked yet.</Alert> : null}
          <Button
            variant="contained"
            disabled={busy || !pc.compareSheetId}
            onClick={() => void run(() => workshopApi.accountingCreatePurchaseOrder({ compareSheetId: pc.compareSheetId! }), 'Purchase Orders generated')}
            sx={{ alignSelf: 'flex-start', bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}
          >
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
                  {po.lineItems.map((li, index) => (
                    <TableRow key={`${li.casePartId}-${index}`}>
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

              {po.status === 'draft' ? (
                <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Expected Delivery (ETA)"
                    value={etas[po.id] || ''}
                    onChange={(event) => setEtas((previous) => ({ ...previous, [po.id]: event.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: 200 }}
                  />
                  <Button
                    variant="contained"
                    disabled={busy}
                    startIcon={<LocalShipping />}
                    onClick={() => void run(() => workshopApi.accountingPlacePurchaseOrder(po.id, etas[po.id] || undefined), `${po.poNumber} placed`)}
                    sx={{ bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}
                  >
                    Place Order
                  </Button>
                </Stack>
              ) : null}

              {po.status !== 'draft' ? (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {po.placedByName ? <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>Placed by {po.placedByName} · {po.placedAt ? new Date(po.placedAt).toLocaleString() : ''}</Typography> : null}
                  {po.expectedDeliveryDate ? <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>ETA: {po.expectedDeliveryDate}</Typography> : null}
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {(['placed', 'in_transit', 'delivered'] as const).map((step, index, steps) => {
                      const done = index <= steps.indexOf(po.status as 'placed' | 'in_transit' | 'delivered')
                      return (
                        <Stack key={step} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: done ? '#059669' : colors.slate[200], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {done ? <CheckCircle sx={{ fontSize: '0.9rem', color: '#fff' }} /> : <Typography sx={{ fontSize: '0.6rem', color: colors.slate[500] }}>{index + 1}</Typography>}
                          </Box>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: done ? 700 : 400, color: done ? '#047857' : colors.slate[400] }}>
                            {step === 'placed' ? 'Placed' : step === 'in_transit' ? 'In Transit' : 'Delivered'}
                          </Typography>
                          {index < steps.length - 1 ? <Box sx={{ width: 20, height: 2, bgcolor: done ? '#059669' : colors.slate[200] }} /> : null}
                        </Stack>
                      )
                    })}
                  </Stack>
                  {po.status === 'placed' ? (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => void run(() => workshopApi.accountingMarkPurchaseOrderInTransit(po.id), `${po.poNumber} → In Transit`)}
                      sx={{ alignSelf: 'flex-start', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}
                    >
                      Mark In Transit
                    </Button>
                  ) : null}
                  {po.status === 'in_transit' ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={() => void run(() => workshopApi.accountingMarkPurchaseOrderDelivered(po.id), `${po.poNumber} → Delivered`)}
                      sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}
                    >
                      Mark Delivered
                    </Button>
                  ) : null}
                  {po.status === 'delivered' ? (
                    <Box sx={{ p: 1, borderRadius: radii.sm, bgcolor: '#f0fdf4' }}>
                      <Typography sx={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                        Delivered {po.deliveredAt ? new Date(po.deliveredAt).toLocaleString() : ''}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              ) : null}
            </Box>
          ))}

          {allPlaced && !allDelivered ? (
            <Alert severity="info" sx={{ borderRadius: radii.sm }}>Waiting for all orders to be delivered before goods receipt can be recorded.</Alert>
          ) : null}
          {allDelivered ? (
            <Button
              variant="contained"
              size="large"
              disabled={busy}
              onClick={() => void run(() => workshopApi.procurementCaseAction(pc.id, 'supplier_confirm', 'All purchase orders delivered.'), 'All orders delivered — proceed to GRN')}
              sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}
            >
              All Delivered — Proceed to GRN
            </Button>
          ) : null}
        </Stack>
      )}
    </Stack>
  )
}

/* ═══ GRN Panel ═══ */

const POST_GRN_STAGES = new Set([
  'Audit Physical Review',
  'Procurement File Completion',
  'Audit Clearance',
  'Actual Accounts',
  'Reconciliation',
  'Bill Settlement',
  'Paid / Closed',
])

const SETTLEMENT_ACTIONS: Record<string, { action: string; label: string }> = {
  'Audit Physical Review': { action: 'physical_audit_approve', label: 'Approve Physical Audit' },
  'Procurement File Completion': { action: 'file_complete', label: 'Complete Procurement File' },
  'Audit Clearance': { action: 'audit_clear', label: 'Clear Audit File' },
  'Actual Accounts': { action: 'accounts_verify', label: 'Verify Accounts & Post Invoice' },
  Reconciliation: { action: 'reconciliation_confirm', label: 'Confirm Reconciliation' },
  'Bill Settlement': { action: 'settle_bill', label: 'Settle Bill & Close Case' },
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function SettlementPanel({ pc, onChanged }: { pc: ProcurementCase; onChanged: () => Promise<void> }) {
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const stage = pc.backendStage || ''
  const invoice = pc.supplierInvoice
  const payment = pc.supplierPayment
  const submittedGrns = pc.grns.filter((grn) => grn.status === 'submitted')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [billNo, setBillNo] = useState('')
  const [billDate, setBillDate] = useState(todayInput())
  const [dueDate, setDueDate] = useState(todayInput())
  const [taxTemplate, setTaxTemplate] = useState('')
  const [taxTemplates, setTaxTemplates] = useState<Array<{ id: string; name: string }>>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [paymentModes, setPaymentModes] = useState<Array<{ id: string; name: string }>>([])
  const [paidFrom, setPaidFrom] = useState('')
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayInput())

  useEffect(() => {
    setReceiptId((current) => current || submittedGrns[0]?.id || '')
  }, [submittedGrns])

  useEffect(() => {
    if (paymentAmount || !invoice) return
    setPaymentAmount(String(invoice.outstandingAmount || invoice.grandTotal || ''))
  }, [invoice, paymentAmount])

  useEffect(() => {
    if (!selectedCompanyId || invoice) return
    let cancelled = false
    void workshopApi.accountingPurchaseOptions(selectedCompanyId)
      .then((options) => { if (!cancelled) setTaxTemplates(options.taxTemplates || []) })
      .catch(() => { if (!cancelled) setTaxTemplates([]) })
    return () => { cancelled = true }
  }, [selectedCompanyId, invoice])

  useEffect(() => {
    if (!selectedCompanyId || payment) return
    let cancelled = false
    void Promise.all([
      workshopApi.accountingPaymentModes(),
      workshopApi.accountingAccounts(selectedCompanyId),
    ]).then(([modes, accounts]) => {
      if (cancelled) return
      setPaymentModes(modes.data || [])
      setBankAccounts((accounts.data || []).filter((account) => account.type === 'Bank' || account.type === 'Cash'))
    }).catch(() => {
      if (!cancelled) {
        setPaymentModes([])
        setBankAccounts([])
      }
    })
    return () => { cancelled = true }
  }, [selectedCompanyId, payment])

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
      setMessage(success)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete the accounting action')
    } finally {
      setBusy(false)
    }
  }

  const createInvoice = async () => {
    if (!receiptId) {
      setError('Select a submitted GRN before creating the supplier invoice.')
      return
    }
    if (billDate && dueDate && dueDate < billDate) {
      setError('Due date cannot be before the supplier bill date.')
      return
    }
    await run(() => workshopApi.accountingCreateInvoice({
      purchaseReceiptId: receiptId,
      billNo: billNo.trim() || undefined,
      billDate: billDate || undefined,
      dueDate: dueDate || undefined,
      taxesAndCharges: taxTemplate,
    }), 'Supplier invoice created as a draft')
  }

  const createPayment = async () => {
    if (!invoice) {
      setError('Create and post the supplier invoice before payment.')
      return
    }
    if (!paymentReference.trim()) {
      setError('Payment reference number is required.')
      return
    }
    await run(() => workshopApi.accountingCreatePaymentForInvoice({
      purchaseInvoiceId: invoice.id,
      amount: Number(paymentAmount) || undefined,
      modeOfPayment: paymentMode || undefined,
      paidFrom: paidFrom || undefined,
      referenceNo: paymentReference.trim(),
      referenceDate: paymentDate || undefined,
    }), 'Supplier payment draft created')
  }

  const stageAction = SETTLEMENT_ACTIONS[stage]
  const stageActionBlocked = stageAction ? (
    (stageAction.action === 'file_complete' && !invoice)
    || (stageAction.action === 'accounts_verify' && !invoice)
    || (['reconciliation_confirm', 'settle_bill'].includes(stageAction.action) && !payment)
  ) : false

  if (!POST_GRN_STAGES.has(stage)) return null

  return (
    <SectionCard title="Supplier Invoice & Settlement" icon={<Receipt />} defaultCollapsed={false}>
      <Stack spacing={2} sx={{ p: 2 }}>
        {message ? <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert> : null}
        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

        {!invoice && stage === 'Procurement File Completion' ? (
          <Box sx={{ p: 2, borderRadius: radii.sm, border: `1px solid ${colors.border.default}` }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1.5 }}>Create Supplier Invoice</Typography>
            <Stack spacing={1.5}>
              {submittedGrns.length > 1 ? (
                <TextField select size="small" label="Submitted GRN" value={receiptId} onChange={(event) => setReceiptId(event.target.value)}>
                  {submittedGrns.map((grn) => <MenuItem key={grn.id} value={grn.id}>{grn.grnNumber} · {grn.vendorName}</MenuItem>)}
                </TextField>
              ) : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField size="small" label="Supplier Bill No." value={billNo} onChange={(event) => setBillNo(event.target.value)} fullWidth />
                <TextField size="small" type="date" label="Bill Date" value={billDate} onChange={(event) => {
                  const nextBillDate = event.target.value
                  setBillDate(nextBillDate)
                  if (nextBillDate && dueDate && dueDate < nextBillDate) setDueDate(nextBillDate)
                }} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="date" label="Due Date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: billDate || undefined } }} />
              </Stack>
              <TextField select size="small" label="VAT / Tax" value={taxTemplate} onChange={(event) => setTaxTemplate(event.target.value)} helperText="Choose a company purchase tax template, or keep No VAT.">
                <MenuItem value="">No VAT / No Tax</MenuItem>
                {taxTemplates.map((template) => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}
              </TextField>
              <Button variant="contained" disabled={busy} onClick={() => void createInvoice()} sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                {busy ? 'Creating…' : 'Create Supplier Invoice'}
              </Button>
            </Stack>
          </Box>
        ) : null}

        {invoice ? (
          <Box sx={{ p: 2, borderRadius: radii.sm, border: '1px solid #bfdbfe', bgcolor: '#eff6ff' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1d4ed8' }}>Supplier Invoice {invoice.id}</Typography>
              <Chip size="small" label={(invoice.status || 'Draft').toUpperCase()} sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
            </Stack>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600], mt: 0.5 }}>
              {invoice.billNo ? `Bill ${invoice.billNo}` : 'Supplier bill'} {invoice.billDate ? `· ${invoice.billDate}` : ''} · Due {invoice.dueDate || '—'}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.8rem' }}>Net: <b>৳{invoice.netTotal.toLocaleString()}</b></Typography>
              <Typography sx={{ fontSize: '0.8rem' }}>Tax: <b>৳{invoice.totalTaxesAndCharges.toLocaleString()}</b></Typography>
              <Typography sx={{ fontSize: '0.8rem' }}>Total: <b>৳{invoice.grandTotal.toLocaleString()}</b></Typography>
              <Typography sx={{ fontSize: '0.8rem' }}>Outstanding: <b>৳{invoice.outstandingAmount.toLocaleString()}</b></Typography>
            </Stack>
            {invoice.taxes.length ? (
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {invoice.taxes.map((tax, index) => (
                  <Typography key={`${tax.accountHead}-${index}`} sx={{ fontSize: '0.76rem', color: colors.slate[600] }}>
                    {tax.description || tax.accountHead || 'Tax'}: {tax.rate}% — ৳{tax.taxAmount.toLocaleString()}
                  </Typography>
                ))}
              </Stack>
            ) : <Typography sx={{ fontSize: '0.76rem', color: colors.slate[500], mt: 1 }}>No VAT/tax applied.</Typography>}
          </Box>
        ) : null}

        {invoice && !payment && stage === 'Reconciliation' ? (
          <Box sx={{ p: 2, borderRadius: radii.sm, border: `1px solid ${colors.border.default}` }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1.5 }}>Create Supplier Payment</Typography>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField size="small" type="number" label="Amount" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} fullWidth />
                <TextField select size="small" label="Payment Mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} fullWidth>
                  <MenuItem value="">Default</MenuItem>
                  {paymentModes.map((mode) => <MenuItem key={mode.id} value={mode.name}>{mode.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Paid From" value={paidFrom} onChange={(event) => setPaidFrom(event.target.value)} fullWidth>
                  <MenuItem value="">Company default</MenuItem>
                  {bankAccounts.map((account) => <MenuItem key={account.id} value={account.id}>{account.name}</MenuItem>)}
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField size="small" label="Bank / Payment Reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} fullWidth />
                <TextField size="small" type="date" label="Reference Date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <Button variant="contained" disabled={busy} onClick={() => void createPayment()} sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                {busy ? 'Creating…' : 'Create Payment Draft'}
              </Button>
            </Stack>
          </Box>
        ) : null}

        {payment ? (
          <Alert severity={payment.docstatus === 1 ? 'success' : 'info'}>
            Payment {payment.id} · ৳{payment.amount.toLocaleString()} · {(payment.status || 'Draft')}
            {payment.referenceNo ? ` · Ref ${payment.referenceNo}` : ''}
          </Alert>
        ) : null}

        {stageAction ? (
          <Stack spacing={1.25}>
            <TextField size="small" label="Action note / reason" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} fullWidth />
            <Button
              variant="contained"
              disabled={busy || stageActionBlocked}
              onClick={() => void run(() => workshopApi.procurementCaseAction(pc.id, stageAction.action, note.trim() || undefined), `${stageAction.label} complete`)}
              sx={{ alignSelf: 'flex-start', bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#1d4ed8' } }}
            >
              {busy ? 'Working…' : stageAction.label}
            </Button>
            {stageActionBlocked ? <Typography sx={{ fontSize: '0.76rem', color: '#b45309' }}>Complete the supplier invoice/payment step above before this action.</Typography> : null}
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  )
}

function GRNPanel({ pc, onChanged }: { pc: ProcurementCase; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePoId, setActivePoId] = useState('')
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>([])
  const [grnNote, setGrnNote] = useState('')
  const [invoiceFiles, setInvoiceFiles] = useState<Array<{ name: string; file: File }>>([])

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
      setSnack(success)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the goods receipt')
    } finally {
      setBusy(false)
    }
  }

  const grnPoIds = new Set(pc.grns.map((grn) => grn.poId))
  const deliveredPOs = pc.purchaseOrders.filter((po) => po.status === 'delivered' || grnPoIds.has(po.id))
  const pendingPOs = deliveredPOs.filter((po) => !grnPoIds.has(po.id))
  const activePO = pendingPOs.find((po) => po.id === activePoId) ?? pendingPOs[0]
  const awaitingDelivery = pc.purchaseOrders.filter((po) => po.status !== 'delivered' && !grnPoIds.has(po.id))
  const allReceived = pc.purchaseOrders.length > 0 && pc.purchaseOrders.every((po) => pc.grns.some((grn) => grn.poId === po.id && grn.status === 'submitted'))

  useEffect(() => {
    if (!activePO) {
      setGrnLines([])
      setGrnNote('')
      setInvoiceFiles([])
      return
    }
    setGrnLines(activePO.lineItems.map((line) => ({
      casePartId: line.casePartId,
      partName: line.partName,
      orderedQty: line.quantity,
      receivedQty: line.quantity,
      condition: 'good' as const,
    })))
    setGrnNote('')
    setInvoiceFiles([])
  }, [activePO])

  const handleRecordGRN = async () => {
    if (!activePO) return
    setBusy(true)
    setError(null)
    let createdId = ''
    try {
      const uploaded = await Promise.all(invoiceFiles.map((file) => workshopApi.uploadFile(file.file, { isPrivate: true })))
      const receipt = await workshopApi.accountingCreateReceipt({
        purchaseOrderId: activePO.id,
        items: grnLines.map((line) => ({
          purchaseOrderItemId: line.casePartId,
          receivedQty: line.receivedQty,
          condition: line.condition,
        })),
        notes: grnNote.trim() || undefined,
        attachmentFileIds: uploaded.map((file) => file.name),
      })
      createdId = String(receipt.id || '')
      if (createdId) await workshopApi.accountingSubmit('receipts', createdId)
      await onChanged()
      setSnack(`GRN recorded for ${activePO.poNumber}`)
      const nextPo = pendingPOs.find((po) => po.id !== activePO.id)
      setActivePoId(nextPo?.id ?? '')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to record the goods receipt'
      setError(createdId
        ? `${message} Draft ${createdId} was saved; use Submit GRN below when ready.`
        : message)
      if (createdId) await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Snackbar open={Boolean(snack)} onClose={() => setSnack(null)} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack(null)} severity="success" variant="filled">{snack}</Alert>
      </Snackbar>
      {error ? <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert> : null}

      {!pc.purchaseOrders.length ? <Alert severity="warning" sx={{ borderRadius: radii.sm }}>A submitted Purchase Order is required before goods can be received.</Alert> : null}
      {allReceived ? <Alert severity="success" sx={{ borderRadius: radii.sm }}>All purchase orders have been received. The procurement case is ready for audit and invoice processing.</Alert> : null}
      {awaitingDelivery.length ? (
        <Alert severity="info" sx={{ borderRadius: radii.sm }}>
          Mark {awaitingDelivery.map((po) => po.poNumber).join(', ')} delivered before recording the goods receipt.
        </Alert>
      ) : null}

      {pc.grns.length > 0 ? (
        <SectionCard title={`Recorded GRNs (${pc.grns.length})`} icon={<Receipt />}>
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {pc.grns.map((grn) => (
              <Box key={grn.id} sx={{ p: 2, borderRadius: radii.sm, border: `1px solid ${grn.status === 'submitted' ? '#bbf7d0' : '#fde68a'}`, bgcolor: grn.status === 'submitted' ? '#f0fdf4' : '#fffbeb' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                  <CheckCircle sx={{ color: grn.status === 'submitted' ? '#059669' : '#d97706', fontSize: '1rem' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: grn.status === 'submitted' ? '#047857' : '#92400e' }}>{grn.grnNumber} — {grn.vendorName}</Typography>
                  <Chip size="small" label={(grn.status || 'draft').toUpperCase()} sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: grn.status === 'submitted' ? '#d1fae5' : '#fef3c7', color: grn.status === 'submitted' ? '#047857' : '#92400e' }} />
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>by {grn.receivedByName} · {new Date(grn.receivedAt).toLocaleString()}</Typography>
                </Stack>
                {grn.lineItems.map((line, index) => (
                  <Typography key={`${line.casePartId}-${index}`} sx={{ fontSize: '0.78rem', color: colors.slate[700], pl: 3 }}>
                    {line.partName}: received {line.receivedQty}/{line.orderedQty} — {line.condition}
                  </Typography>
                ))}
                {grn.notes ? <Typography sx={{ fontSize: '0.76rem', color: colors.slate[600], pl: 3, mt: 0.5 }}>Note: {grn.notes}</Typography> : null}
                {grn.invoiceAttachmentNames.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ pl: 3, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <AttachFile sx={{ fontSize: '0.8rem', color: colors.slate[400] }} />
                    {grn.invoiceAttachmentNames.map((name, index) => (
                      <Typography key={`${name}-${index}`} component="a" href={grn.invoiceAttachmentUrls[index]} target="_blank" rel="noreferrer" sx={{ fontSize: '0.72rem', color: '#2563eb', textDecoration: 'underline' }}>{name}</Typography>
                    ))}
                  </Stack>
                ) : null}
                {grn.status === 'draft' ? (
                  <Button size="small" variant="contained" disabled={busy} onClick={() => void run(() => workshopApi.accountingSubmit('receipts', grn.id), 'GRN submitted')} sx={{ mt: 1.5, bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
                    Submit GRN
                  </Button>
                ) : null}
              </Box>
            ))}
          </Stack>
        </SectionCard>
      ) : null}

      {pendingPOs.length > 0 && activePO ? (
        <Box sx={{ p: 2.5, borderRadius: radii.md, border: `1px solid ${colors.border.default}`, bgcolor: colors.bg.card }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Record GRN for {activePO.poNumber} — {activePO.vendorName}</Typography>
            {pendingPOs.length > 1 ? <Chip size="small" label={`${pendingPOs.findIndex((po) => po.id === activePO.id) + 1} of ${pendingPOs.length}`} sx={{ fontWeight: 700, fontSize: '0.65rem' }} /> : null}
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Part</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Ordered</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 90 }}>Received</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', width: 130 }}>Condition</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grnLines.map((line, index) => (
                <TableRow key={`${line.casePartId}-${index}`}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{line.partName}</TableCell>
                  <TableCell>{line.orderedQty}</TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={line.receivedQty} onChange={(event) => setGrnLines((previous) => previous.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, receivedQty: Number(event.target.value) } : candidate))} slotProps={{ htmlInput: { min: 0, max: line.orderedQty, step: 'any' } }} sx={{ width: 78 }} />
                  </TableCell>
                  <TableCell>
                    <TextField select size="small" value={line.condition} onChange={(event) => setGrnLines((previous) => previous.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, condition: event.target.value as GRNLineItem['condition'] } : candidate))} sx={{ width: 120 }}>
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
            <TextField size="small" label="Note (optional)" value={grnNote} onChange={(event) => setGrnNote(event.target.value)} multiline minRows={2} fullWidth />
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colors.slate[600], mb: 0.5 }}>Invoice Attachment</Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<AttachFile />} disabled={busy} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
                Upload Invoice
                <input type="file" multiple hidden onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []).map((file) => ({ name: file.name, file }))
                  setInvoiceFiles((previous) => [...previous, ...selected])
                  event.target.value = ''
                }} />
              </Button>
              {invoiceFiles.map((file, index) => (
                <Stack key={`${file.name}-${index}`} direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
                  <AttachFile sx={{ fontSize: '0.8rem', color: colors.slate[400] }} />
                  <Typography sx={{ fontSize: '0.78rem', flex: 1 }}>{file.name}</Typography>
                  <IconButton size="small" disabled={busy} onClick={() => setInvoiceFiles((previous) => previous.filter((_, candidateIndex) => candidateIndex !== index))}><Delete sx={{ fontSize: '0.85rem', color: '#ef4444' }} /></IconButton>
                </Stack>
              ))}
            </Box>
            <Button variant="contained" disabled={busy || grnLines.every((line) => line.receivedQty <= 0)} onClick={() => void handleRecordGRN()}
              sx={{ alignSelf: 'flex-start', bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>
              {busy ? 'Recording…' : 'Record GRN'}
            </Button>
          </Stack>
        </Box>
      ) : null}
      <SettlementPanel pc={pc} onChanged={onChanged} />
    </Stack>
  )
}

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
  const setCSDecisionStore = useMockProcurementStore((s) => s.setCSDecision)
  const generatePOs = useMockProcurementStore((s) => s.generatePurchaseOrders)
  const setProcurementPartSelection = useMockProcurementStore((s) => s.setProcurementPartSelection)

  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const [backendPc, setBackendPc] = useState<ProcurementCase | null>(null)
  const [backendMaterialRequestId, setBackendMaterialRequestId] = useState<string | undefined>()
  const [masterDataRequests, setMasterDataRequests] = useState<CWMasterDataRequest[]>([])
  const [backendError, setBackendError] = useState<string | null>(null)
  const [approvalQuotationId, setApprovalQuotationId] = useState('')
  const refreshBackendCase = async () => {
    if (!backendPc) return
    setBackendPc(await hydrateBackendProcurementCase(await workshopApi.procurementCase(backendPc.id)))
  }
  useEffect(() => {
    if (!caseId || !selectedCompanyId) return
    let cancelled = false
    void workshopApi.procurementCase(caseId)
      .then(async (data) => {
        setBackendMaterialRequestId(String((data as Record<string, unknown>).materialRequestId || '') || undefined)
        setApprovalQuotationId(String((data as Record<string, unknown>).selectedSupplierQuotationId || ''))
        const mapped = await hydrateBackendProcurementCase(data as Record<string, unknown>)
        if (!cancelled) setBackendPc(mapped)
      })
      .catch((cause) => { if (!cancelled) setBackendError(cause instanceof Error ? cause.message : 'Unable to load live case') })
    return () => { cancelled = true }
  }, [caseId, selectedCompanyId])
  useEffect(() => {
    if (!caseId || !selectedCompanyId) return
    let cancelled = false
    void workshopApi.listMasterDataRequests({ company: selectedCompanyId, page: 1, pageSize: 100 })
      .then((response) => {
        if (!cancelled) {
          setMasterDataRequests(response.data.filter((request) => {
            const context = request.context || {}
            return String(context.procurementCaseId || context.procurement_case_id || '') === caseId
          }))
        }
      })
      .catch(() => { if (!cancelled) setMasterDataRequests([]) })
    return () => { cancelled = true }
  }, [caseId, selectedCompanyId])
  const pc = backendPc || cases.find((c) => c.id === caseId)
  const [snack, setSnack] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [storeReviewSelections, setStoreReviewSelections] = useState<Record<string, boolean>>({})
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [quotationDialog, setQuotationDialog] = useState(false)
  const [editQuotation, setEditQuotation] = useState<Quotation | undefined>(undefined)
  // CS selections: casePartId → { quotationId, vendorName, ... }
  const [csSelections, setCsSelections] = useState<Record<string, { quotationId: string; vendorName: string; unitPrice: number; quantity: number; totalPrice: number }>>({})
  // Audit may recommend a different quotation per requested part. The final
  // approver still makes the commercial decision; these recommendations are
  // included in the immutable audit action note.
  const [auditSelections, setAuditSelections] = useState<Record<string, { quotationId: string; vendorName: string; unitPrice: number; quantity: number; totalPrice: number }>>({})
  const [auditPriceSuggestions, setAuditPriceSuggestions] = useState<Record<string, AuditPriceSuggestion>>({})
  const [approvalSelections, setApprovalSelections] = useState<Record<string, DecisionSelection>>({})
  const [csNote, setCsNote] = useState('')

  useEffect(() => {
    if (!pc?.csDecision || Object.keys(approvalSelections).length) return
    setApprovalSelections(Object.fromEntries(pc.csDecision.items.filter((item) => pc.parts.some((part) => part.id === item.casePartId && part.includeInProcurement !== false)).map((item) => [item.casePartId, {
      quotationId: item.selectedQuotationId,
      vendorName: item.selectedVendorName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    }])))
  }, [pc?.id, pc?.parts, pc?.csDecision, approvalSelections])

  useEffect(() => {
    setStoreReviewSelections(Object.fromEntries((pc?.parts || []).map((part) => [part.id, part.includeInProcurement !== false])))
  }, [pc?.id, pc?.parts])

  if (!pc) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[600] }}>{backendError || 'Case not found'}</Typography>
        <Button onClick={() => navigate('/mock-procurement/pipeline')} sx={{ mt: 2 }}>Back to Pipeline</Button>
      </Box>
    )
  }

  const currentIdx = PROCUREMENT_STEPS.indexOf(pc.currentStep)
  const isCompleted = pc.status === 'approved' || pc.status === 'rejected'
  const procurementParts = pc.parts.filter((part) => part.includeInProcurement !== false)
  const hasIncludedPart = Object.values(storeReviewSelections).some(Boolean)
  const printQuotation = (quotation: Quotation) => {
    if (!backendPc) {
      setSnack('Printing is available for saved procurement cases')
      return
    }
    window.open(workshopApi.accountingPrintUrl('quotations', quotation.id), '_blank', 'noopener,noreferrer')
  }
  const printCompareSheet = () => {
    if (!backendPc?.compareSheetId) {
      setSnack('Submit a comparative statement before printing it')
      return
    }
    window.open(workshopApi.accountingPrintUrl('compare_sheets', backendPc.compareSheetId), '_blank', 'noopener,noreferrer')
  }
  const printComparisonPacket = () => {
    if (!backendPc) {
      setSnack('Printing is available for saved procurement cases')
      return
    }
    window.open(workshopApi.procurementQuotationPacketPrintUrl(backendPc.id), '_blank', 'noopener,noreferrer')
  }
  const persistedAuditSelections = auditSelectionsFromReview(pc)
  const existingCSSelections: Record<string, DecisionSelection> = Object.fromEntries(
    (pc.csDecision?.items || []).map((item) => [item.casePartId, {
      quotationId: item.selectedQuotationId,
      vendorName: item.selectedVendorName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    }]),
  )

  const handleApprove = async () => {
    if (backendPc) {
      try {
        const stage = backendPc.backendStage || ''
        if (stage === 'Procurement Review' || stage === 'Requested') {
          if (!hasIncludedPart) throw new Error('Select at least one part for procurement.')
          await workshopApi.procurementStoreReview(backendPc.id, {
            storeReviewStatus: 'Local Shortage',
            procurementType: 'Local',
            vendorRoute: 'Enlisted Vendor',
            note: actionNote.trim() || undefined,
            parts: backendPc.parts.map((part) => {
              const status = part.disposition === 'foreign_vendor' ? 'Foreign Required' : 'Local Shortage'
              return {
                partRequestId: part.lineItemId,
                storeReviewStatus: status,
                procurementType: status === 'Foreign Required' ? 'Foreign' : 'Local',
                stockAvailable: 0,
                includeInProcurement: storeReviewSelections[part.id] !== false,
              }
            }),
          })
          setBackendPc(await hydrateBackendProcurementCase(await workshopApi.procurementCase(backendPc.id)))
        } else if (stage === 'GM Approval') {
          const finalSelections = Object.entries(approvalSelections).filter(([casePartId]) => procurementParts.some((part) => part.id === casePartId)).map(([casePartId, selection]) => ({ casePartId, partName: backendPc.parts.find((part) => part.id === casePartId)?.partName || '', ...selection }))
          const quotationId = finalSelections[0]?.quotationId || approvalQuotationId || backendPc.quotations[0]?.id || ''
          if (!quotationId) throw new Error('Select a supplier quotation before approving.')
          const finalDecisionNote = finalSelections.length
            ? `Final CS decision: ${finalSelections.map((selection) => `${backendPc.parts.find((part) => part.id === selection.casePartId)?.partName || 'Part'} → ${selection.vendorName} · ৳${selection.totalPrice.toLocaleString()}`).join('; ')}`
            : ''
          // Selecting at GM Approval also approves the submitted compare sheet
          // and moves the case to Management Approval or PO Creation according
          // to the server-side policy.
          await workshopApi.procurementSelectQuotation(backendPc.id, quotationId, [actionNote.trim(), finalDecisionNote].filter(Boolean).join('\n') || 'Supplier quotation selected during approval', finalSelections)
          setBackendPc(await hydrateBackendProcurementCase(await workshopApi.procurementCase(backendPc.id)))
        } else {
          const actionByStage: Record<string, string> = { 'Quotation Collection': 'complete_quotation_collection', 'Audit Verification': 'audit_verify', 'GM Approval': 'gm_approve', 'Management Approval': 'management_approve', 'Supplier Confirmation': 'supplier_confirm', 'Audit Physical Review': 'physical_audit_approve', 'Procurement File Completion': 'file_complete', 'Audit Clearance': 'audit_clear', 'Actual Accounts': 'accounts_verify', Reconciliation: 'reconciliation_confirm', 'Bill Settlement': 'settle_bill' }
          const action = actionByStage[stage]
          if (!action) throw new Error(`No live action is available for stage ${stage || 'Unknown'}.`)
          const auditSuggestion = stage === 'Audit Verification' && Object.keys(auditSelections).length
            ? `Audit suggestions: ${Object.entries(auditSelections).map(([partId, selection]) => `${pc.parts.find((part) => part.id === partId)?.partName || 'Part'} → ${selection.vendorName} · ৳${selection.totalPrice.toLocaleString()}`).join('; ')}`
            : ''
          const auditPriceCorrection = stage === 'Audit Verification' && Object.keys(auditPriceSuggestions).length
            ? `Audit price corrections: ${Object.values(auditPriceSuggestions).map((suggestion) => `${suggestion.vendorName} / ${suggestion.partName}: ৳${suggestion.originalUnitPrice.toLocaleString()} → ৳${suggestion.suggestedUnitPrice.toLocaleString()} × ${suggestion.quantity}`).join('; ')}`
            : ''
          const note = [actionNote.trim(), auditSuggestion, auditPriceCorrection].filter(Boolean).join('\n') || undefined
          await workshopApi.procurementCaseAction(backendPc.id, action, note)
          setBackendPc(await hydrateBackendProcurementCase(await workshopApi.procurementCase(backendPc.id)))
        }
        setActionNote(''); setSnack('Procurement case updated')
      } catch (cause) { setSnack(cause instanceof Error ? cause.message : 'Unable to update procurement case') }
      return
    }
    if (pc.currentStep === 'store_review') {
      if (!hasIncludedPart) {
        setSnack('Select at least one part for procurement.')
        return
      }
      setProcurementPartSelection(pc.id, storeReviewSelections)
    }
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

  const handleReject = async () => {
    if (backendPc) {
      try {
        const actionByStage: Record<string, string> = { 'Procurement Review': 'return_to_requester', 'Quotation Collection': 'return_to_requester', 'Audit Verification': 'audit_reject', 'GM Approval': 'gm_reject', 'Management Approval': 'management_reject', 'Audit Physical Review': 'physical_audit_reject', 'Audit Clearance': 'audit_clearance_reject' }
        const action = actionByStage[backendPc.backendStage || '']
        if (!action) throw new Error(`No live rejection action is available for stage ${backendPc.backendStage || 'Unknown'}.`)
        setBackendPc(mapBackendProcurementCase(await workshopApi.procurementCaseAction(backendPc.id, action, rejectNote.trim() || 'Returned for correction')))
        setRejectNote(''); setShowReject(false); setSnack('Procurement case returned for correction')
      } catch (cause) { setSnack(cause instanceof Error ? cause.message : 'Unable to return procurement case') }
      return
    }
    rejectStep(pc.id, rejectNote.trim() || 'Rejected', userName)
    setRejectNote('')
    setShowReject(false)
    setSnack(`${PROCUREMENT_STEP_LABELS[pc.currentStep]} — Rejected`)
    navigate('/mock-procurement/pipeline')
  }

  const handleCSSubmit = async () => {
    if (Object.keys(csSelections).length !== procurementParts.length) {
      setSnack('Select a vendor for every part included in procurement')
      return
    }
    const items: CSDecisionItem[] = Object.entries(csSelections).filter(([casePartId]) => procurementParts.some((part) => part.id === casePartId)).map(([casePartId, sel]) => {
      const part = procurementParts.find((p) => p.id === casePartId)
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
    if (backendPc) {
      try {
        // The comparative statement must preserve every collected offer, not
        // only the currently recommended cells in the UI. Approval can then
        // select the winning supplier against the complete evidence set.
        const quotationIds = [...new Set(pc.quotations.map((quotation) => quotation.id))]
        const compareSheet = await workshopApi.accountingCreateCompareSheet({
          company: selectedCompanyId,
          quotationIds,
          materialRequestId: backendMaterialRequestId,
          procurementCaseId: backendPc.id,
          selections: items,
          overrideReason: quotationIds.length < 2 ? (csNote.trim() || 'Single supplier quotation selected for this appointment') : undefined,
        })
        const compareSheetId = String(compareSheet.id || '')
        if (!compareSheetId) throw new Error('Compare sheet was not created.')
        await workshopApi.accountingSubmit('compare_sheets', compareSheetId, csNote.trim() || 'CS submitted for audit verification')
        const refreshed = await workshopApi.procurementCase(backendPc.id)
        setBackendPc(await hydrateBackendProcurementCase(refreshed))
        setSnack('Comparative statement submitted for audit verification')
      } catch (cause) {
        setSnack(cause instanceof Error ? cause.message : 'Unable to create the comparative statement')
      }
      return
    }
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
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button size="small" startIcon={<Print sx={{ fontSize: '1rem' }} />} variant="outlined" onClick={printComparisonPacket}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Print Comparison Packet</Button>
            <Button size="small" startIcon={<Print sx={{ fontSize: '1rem' }} />} variant="outlined" onClick={printCompareSheet}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Print Compare Sheet</Button>
          </Stack>
        </Stack>

        {/* Step Progress */}
        <Box sx={{ p: 2, borderRadius: radii.md, bgcolor: colors.bg.card, boxShadow: shadows.card, border: `1px solid ${colors.border.subtle}` }}>
          <StepProgressBar currentStep={pc.currentStep} status={pc.status} />
        </Box>

        {/* Parts Details — always visible */}
        <PartsDetailsSection
          pc={pc}
          selectionMode={pc.currentStep === 'store_review' && !isCompleted}
          selections={storeReviewSelections}
          onSelectionChange={(partId, included) => setStoreReviewSelections((current) => ({ ...current, [partId]: included }))}
        />
        <VehicleInfoSection pc={pc} />

        {/* Accumulated completed steps */}
        {pc.storeReview && currentIdx > 0 && pc.currentStep !== 'approval' ? <CompletedStepBadge label="Store Review" byName={pc.storeReview.actionByName} date={pc.storeReview.actionDate} note={pc.storeReview.note} /> : null}
        {currentIdx > 1 && pc.currentStep !== 'approval' && pc.currentStep !== 'audit' && !isCompleted ? (
          <SectionCard title={`Quotations (${pc.quotations.length})`} icon={<Add />} defaultCollapsed>
            <QuotationsSummaryTable quotations={pc.quotations} onPrint={backendPc ? printQuotation : undefined} />
          </SectionCard>
        ) : null}
        {pc.csDecision && currentIdx > 2 && pc.currentStep !== 'approval' ? <CSDecisionSummary pc={pc} /> : null}
        {pc.auditReview && currentIdx > 3 && pc.currentStep !== 'approval' ? <CompletedStepBadge label="Audit Review" byName={pc.auditReview.actionByName} date={pc.auditReview.actionDate} note={pc.auditReview.note} /> : null}
        {pc.managementApproval && currentIdx > 4 ? <CompletedStepBadge label="Approval" byName={pc.managementApproval.actionByName} date={pc.managementApproval.actionDate} note={pc.managementApproval.note} /> : null}

        {/* ═══ Active Step Panel ═══ */}
        {!isCompleted ? (
          <Box sx={{ p: 3, borderRadius: radii.md, border: '2px solid #2563eb', bgcolor: '#f8faff', boxShadow: shadows.elevated }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1d4ed8', mb: 2 }}>Action: {PROCUREMENT_STEP_LABELS[pc.currentStep]}</Typography>

            {/* Store Review */}
            {pc.currentStep === 'store_review' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>Select the parts that should go to procurement. Unselected parts stay on the case as <b>Not procured</b> with a red cross and are excluded from quotations.</Alert>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: hasIncludedPart ? '#047857' : '#b91c1c' }}>
                  {Object.values(storeReviewSelections).filter(Boolean).length} of {pc.parts.length} parts selected for procurement
                </Typography>
                <TextField size="small" label="Note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" disabled={!hasIncludedPart} onClick={handleApprove} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Approve & Send to Quotations</Button>
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
                <QuotationsSummaryTable
                  quotations={pc.quotations}
                  editable
                  onPrint={backendPc ? printQuotation : undefined}
                  onEdit={(q) => { setEditQuotation(q); setQuotationDialog(true) }}
                  onRemove={async (id) => {
                    if (!backendPc) return
                    try {
                      await workshopApi.procurementRemoveQuotation(backendPc.id, id)
                      setBackendPc(await hydrateBackendProcurementCase(await workshopApi.procurementCase(backendPc.id)))
                      setSnack('Quotation removed from this procurement case')
                    } catch (cause) {
                      setSnack(cause instanceof Error ? cause.message : 'Unable to remove quotation')
                    }
                  }}
                />
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
                      const part = procurementParts.find((p) => p.id === partId)
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
                  <Button variant="contained" onClick={handleCSSubmit} disabled={Object.keys(csSelections).length !== procurementParts.length} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Submit CS Decision</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* Audit */}
            {pc.currentStep === 'audit' && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: radii.sm }}>Review every quotation and attachment. You may add a late quotation, compare each product amount, and record an audit suggestion before sending the verified file to approval.</Alert>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Audit comparison and recommendation</Typography>
                  <Button size="small" startIcon={<Add />} variant="contained" onClick={() => { setEditQuotation(undefined); setQuotationDialog(true) }} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Add Quotation</Button>
                </Stack>
                <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>Green marks the existing CS decision. Click a quotation cell to record an audit recommendation, or enter a red suggested unit price directly in that same cell. The next-stage approver decides whether to accept any audit change.</Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                  <Chip size="small" label="Existing CS decision" sx={{ fontWeight: 700, color: '#15803d', bgcolor: '#bbf7d0' }} />
                  <Chip size="small" label="Audit suggestion / change" sx={{ fontWeight: 700, color: '#dc2626', bgcolor: '#fee2e2' }} />
                </Stack>
                <CSMatrix
                  pc={pc}
                  selections={auditSelections}
                  auditMode
                  auditPriceSuggestions={auditPriceSuggestions}
                  onSuggestPrice={(key, suggestion) => setAuditPriceSuggestions((current) => {
                  const next = { ...current }
                  if (suggestion) next[key] = suggestion
                  else delete next[key]
                  return next
                })}
                  onSelect={(casePartId, quotationId, vendorName, unitPrice, quantity, totalPrice) => setAuditSelections((current) => ({ ...current, [casePartId]: { quotationId, vendorName, unitPrice, quantity, totalPrice } }))}
                />
                <SectionCard title={`All Quotations & Attachments (${pc.quotations.length})`} icon={<AttachFile />} defaultCollapsed={false}>
                  <QuotationsSummaryTable quotations={pc.quotations} onPrint={backendPc ? printQuotation : undefined} />
                </SectionCard>
                {Object.keys(auditSelections).length ? <Alert severity="success" sx={{ borderRadius: radii.sm }}>Audit suggestions recorded for {Object.keys(auditSelections).length} of {procurementParts.length} parts. Add a note if any quote needs clarification.</Alert> : null}
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
                <AuditDecisionSummary pc={pc} />
                <Box sx={{ p: 2, borderRadius: radii.sm, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <Typography sx={{ fontWeight: 800, color: '#1d4ed8', fontSize: '0.9rem', mb: 0.5 }}>Final CS decision</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: colors.slate[600] }}>
                    Select one quotation per part. The green CS decision and red audit recommendations remain unchanged above; this matrix records the final approver&apos;s decision.
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
                  Compare every vendor quotation below and choose the final vendor and amount for each requested part.
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                  <Chip size="small" label="Existing CS decision" sx={{ fontWeight: 700, color: '#15803d', bgcolor: '#bbf7d0' }} />
                  <Chip size="small" label="Audit recommendation" sx={{ fontWeight: 700, color: '#dc2626', bgcolor: '#fee2e2' }} />
                  <Chip size="small" label="Final selection" sx={{ fontWeight: 700, color: '#1d4ed8', bgcolor: '#dbeafe' }} />
                </Stack>
                <CSMatrix
                  pc={pc}
                  selections={approvalSelections}
                  referenceSelections={persistedAuditSelections}
                  existingSelections={existingCSSelections}
                  onSelect={(casePartId, quotationId, vendorName, unitPrice, quantity, totalPrice) => setApprovalSelections((current) => ({ ...current, [casePartId]: { quotationId, vendorName, unitPrice, quantity, totalPrice } }))}
                />
                <Divider />
                <TextField size="small" label="Approval note (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} multiline minRows={2} fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={handleApprove} disabled={Object.keys(approvalSelections).length !== procurementParts.length} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, '&:hover': { bgcolor: '#047857' } }}>Final Approve ✓</Button>
                  <Button variant="outlined" color="error" onClick={() => setShowReject(true)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Reject</Button>
                </Stack>
              </Stack>
            )}

            {/* PO */}
            {pc.currentStep === 'po' && <POPanel pc={pc} onChanged={refreshBackendCase} />}

            {/* GRN */}
            {pc.currentStep === 'grn' && <GRNPanel pc={pc} onChanged={refreshBackendCase} />}
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
        <QuotationDialog open={quotationDialog} onClose={() => setQuotationDialog(false)} parts={procurementParts} initial={editQuotation} company={selectedCompanyId} caseId={pc.id} masterDataRequests={masterDataRequests}
          onMasterDataRequested={(request) => setMasterDataRequests((current) => [...current, request])}
          onSave={async (q) => {
            if (backendPc) {
              const suppliers = await workshopApi.accountingSuppliers(q.vendorName)
              let supplier = suppliers.data.find((row) => row.name.toLowerCase() === q.vendorName.toLowerCase())
              if (!supplier) {
                const created = await workshopApi.accountingCreateSupplier({ name: q.vendorName, supplierType: 'Company' })
                supplier = { id: created.id, name: created.name }
              }
              const itemRows = await Promise.all(q.lineItems.map(async (line) => {
                const part = procurementParts.find((candidate) => candidate.id === line.casePartId)
                const search = part?.partNumber || part?.partName || line.partName
                const itemResponse = await workshopApi.accountingItems(search)
                let item = itemResponse.data.find((row) => row.itemCode === part?.partNumber) || itemResponse.data[0]
                if (!item) {
                  const request = masterDataRequests.find((candidate) => {
                    const context = candidate.context || {}
                    return candidate.targetDoctype === 'Item'
                      && String(context.partRequestId || '') === String(part?.lineItemId || line.casePartId)
                      && candidate.requestedValue.trim().toLowerCase() === line.partName.trim().toLowerCase()
                  })
                  if (request) {
                    const ensured = request.context?.masterDataId
                      ? request
                      : await workshopApi.ensureProvisionalItemRequest(request.id)
                    setMasterDataRequests((current) => current.map((candidate) => candidate.id === ensured.id ? ensured : candidate))
                    const provisionalCode = String(ensured.context?.masterDataId || '')
                    if (provisionalCode) {
                      const provisionalResponse = await workshopApi.accountingItems(provisionalCode)
                      item = provisionalResponse.data.find((row) => row.itemCode === provisionalCode) || provisionalResponse.data[0]
                    }
                  }
                  // Do not make quotation collection depend on a separate button click.
                  // If the requested part has no Item master request yet, create the pending
                  // request and provisional purchase reference inline, then continue saving
                  // the quotation and CS. Admin approval can complete the master record later.
                  if (!item) {
                    const createdRequest = await workshopApi.createMasterDataRequest({
                      targetDoctype: 'Item',
                      targetField: 'item_name',
                      requestedValue: line.partName,
                      company: selectedCompanyId,
                      sourceRoute: window.location.pathname,
                      context: { procurementCaseId: backendPc.id, partRequestId: part?.lineItemId, partName: line.partName },
                    })
                    const ensured = createdRequest.context?.masterDataId
                      ? createdRequest
                      : await workshopApi.ensureProvisionalItemRequest(createdRequest.id)
                    setMasterDataRequests((current) => [...current.filter((candidate) => candidate.id !== ensured.id), ensured])
                    const provisionalCode = String(ensured.context?.masterDataId || '')
                    if (provisionalCode) {
                      const provisionalResponse = await workshopApi.accountingItems(provisionalCode)
                      item = provisionalResponse.data.find((row) => row.itemCode === provisionalCode) || provisionalResponse.data[0]
                    }
                  }
                }
                if (!item) throw new Error(`No purchasable Item master record found for ${line.partName}.`)
                const delivery = line.deliveryDays && line.deliveryUnit ? ` · Delivery: ${line.deliveryDays} ${line.deliveryUnit}` : ''
                return { itemCode: item.itemCode, qty: line.quantity, rate: line.unitPrice, description: `${line.partName}${delivery}`, partRequestId: part?.lineItemId }
              }))
              const createdQuotation = editQuotation
                ? await workshopApi.accountingUpdate('quotations', editQuotation.id, { supplierId: supplier.id, items: itemRows, terms: q.notes })
                : await workshopApi.accountingCreate('quotations', { company: selectedCompanyId, supplierId: supplier.id, items: itemRows, remarks: q.notes })
              if (!editQuotation) {
                await workshopApi.procurementAttachQuotation(backendPc.id, String(createdQuotation.id), 'Quotation collected from the mock procurement workflow')
              }
              const refreshed = await workshopApi.procurementCase(backendPc.id)
              const mapped = mapBackendProcurementCase(refreshed)
              const summaries = Array.isArray((refreshed as Record<string, unknown>).supplierQuotations) ? (refreshed as Record<string, unknown>).supplierQuotations as Array<Record<string, unknown>> : []
              const full = await Promise.all(summaries.map(async (summary) => { try { return await workshopApi.accountingGet('quotations', String(summary.id)) } catch { return summary } }))
              mapped.quotations = full.map((quote) => ({ id: String(quote.id), vendorName: String(quote.supplierName || quote.supplierId || 'Supplier'), sourcingType: 'Local' as const, lineItems: (Array.isArray(quote.items) ? quote.items : []).map((item: Record<string, unknown>, index: number) => mapQuotationLine(item, mapped.parts[index]?.id, mapped.parts)), grandTotal: Number(quote.grandTotal || quote.totalAmount || 0), currency: String(quote.currency || 'BDT'), attachmentUrls: [], attachmentNames: [], submittedAt: String(quote.createdAt || new Date().toISOString()) }))
              setBackendPc(mapped)
              setSnack('Supplier quotation saved to this procurement case')
            } else if (editQuotation) updateQuotation(pc.id, editQuotation.id, q)
            else addQuotation(pc.id, q)
          }} />

        {/* History */}
        <SectionCard title="History" icon={<History />} defaultCollapsed>
          <HistoryTimeline pc={pc} />
        </SectionCard>
      </Stack>
    </Box>
  )
}
