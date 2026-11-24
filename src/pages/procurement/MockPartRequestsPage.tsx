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
  CheckCircle,
  Description,
  ExpandLess,
  ExpandMore,
  Inventory,
  LocalShipping,
  Print,
  Public,
  ReceiptLong,
} from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CustomerQuotation, LivePartRequest, MockPartRequest, PartDisposition, PartLineItem } from '../../types/procurementWorkflow'

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

function stockChip(item: PartLineItem) {
  const status = item.stockStatus ?? (item.stockQuantity ? 'In Stock' : 'Out of Stock')
  const color = status === 'In Stock' ? '#059669' : status === 'Low Stock' ? '#d97706' : '#dc2626'
  return (
    <Chip
      size="small"
      label={`${status} · ${item.stockQuantity ?? 0} available`}
      sx={{
        fontWeight: 700,
        fontSize: '0.68rem',
        height: 20,
        bgcolor: `${color}15`,
        color,
        borderRadius: radii.sm,
      }}
    />
  )
}

function lineItemFromServer(row: LivePartRequest): PartLineItem {
  return {
    id: row.id,
    partName: row.partName,
    partNumber: row.partNumber,
    quantity: row.quantity ?? 1,
    stockQuantity: row.stockQuantity,
    stockStatus: row.stockStatus,
    disposition: row.disposition ?? 'pending',
    includeInProcurement: row.includeInProcurement !== false,
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
  partName: string
  partNumber?: string
  localVendorName?: string
  localPrice?: number
  localQuantity?: number
  localDeliveryDays?: number
  foreignNote?: string
}

type TriageDetails = Omit<TriageSave, 'partName' | 'partNumber'>

function LineItemRow({
  item,
  onSave,
}: {
  item: PartLineItem
  onSave?: (details: TriageSave) => Promise<void>
}) {
  const [selectedDisposition, setSelectedDisposition] = useState<PartDisposition>(item.disposition)
  const [saving, setSaving] = useState(false)
  const [partName, setPartName] = useState(item.partName)
  const [partNumber, setPartNumber] = useState(item.partNumber ?? '')

  const [localVendorName, setLocalVendorName] = useState(item.localVendorName ?? '')
  const [localPrice, setLocalPrice] = useState(item.localPrice ?? 0)
  const [localQty, setLocalQty] = useState(item.localQuantity ?? item.quantity)
  const [localDays, setLocalDays] = useState(item.localDeliveryDays ?? 0)
  const [foreignNote, setForeignNote] = useState(item.foreignNote ?? '')

  const save = async (details: TriageDetails) => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({
        ...details,
        partName: partName.trim(),
        partNumber: partNumber.trim() || undefined,
      })
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
              {stockChip(item)}
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="Part Number (optional)"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            placeholder="e.g. BRK-PAD-F-2847"
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
          />
          <TextField
            size="small"
            label="Part Name"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            required
            error={!partName.trim()}
            helperText={!partName.trim() ? 'Part name is required' : undefined}
            sx={{ flex: 2, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={saving || !partName.trim()}
            onClick={() => void save({ disposition: selectedDisposition })}
            sx={{ height: 40, textTransform: 'none', fontWeight: 700, borderRadius: radii.sm }}
          >
            Save Part Details
          </Button>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[900] }}>
                {partName}
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
              {partNumber ? (
                <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                  #{partNumber}
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
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
              Qty: {item.quantity}{item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
            </Typography>
            {stockChip(item)}
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
            disabled={saving || !partName.trim()}
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
              disabled={saving || !partName.trim() || !localVendorName.trim() || !localPrice}
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
              disabled={saving || !partName.trim() || !foreignNote.trim()}
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

type QuoteLineDraft = {
  partRequestId: string
  partName: string
  quantity: number
  rate: number
  deliveryDate: string
}

function quoteDate(days = 7) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function quoteLinesFrom(request: MockPartRequest, quote?: CustomerQuotation | null): QuoteLineDraft[] {
  const rows = quote?.requestLines?.length
    ? quote.requestLines
    : (quote?.items ?? []).map((item) => ({
        id: item.id,
        partRequestId: item.partRequestId,
        partName: item.partName || item.itemName || '',
        quantity: item.qty,
        rate: item.rate,
        deliveryDate: item.deliveryDate,
      }))
  if (rows.length) {
    return rows.flatMap((row) => {
      const partRequestId = String(row.partRequestId || '')
      if (!partRequestId) return []
      return [{
        partRequestId,
        partName: String(row.partName || request.lineItems.find((line) => line.id === partRequestId)?.partName || 'Requested part'),
        quantity: Number(row.quantity) || 1,
        rate: Number(row.rate) || 0,
        deliveryDate: String(row.deliveryDate || quoteDate()),
      }]
    })
  }
  return request.lineItems.map((line) => ({
    partRequestId: line.id,
    partName: line.partName,
    quantity: line.quantity,
    rate: line.localPrice || 0,
    deliveryDate: quoteDate(Number(line.localDeliveryDays) || 7),
  }))
}

function CustomerQuotationPanel({
  request,
  onQuoteChange,
  onNotice,
}: {
  request: MockPartRequest
  onQuoteChange: (requestId: string, quote: CustomerQuotation) => void
  onNotice: (message: string, error?: boolean) => void
}) {
  const quote = request.customerQuotation
  const [lines, setLines] = useState<QuoteLineDraft[]>(() => quoteLinesFrom(request, quote))
  const [validTill, setValidTill] = useState(quote?.validTill || quoteDate())
  const [terms, setTerms] = useState(quote?.terms || 'Prices valid subject to stock confirmation.')
  const [rejectNote, setRejectNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLines(quoteLinesFrom(request, quote))
    setValidTill(quote?.validTill || quoteDate())
    setTerms(quote?.terms || 'Prices valid subject to stock confirmation.')
  }, [quote, request])

  const editable = !quote || quote.status === 'Draft'
  const payloadLines = lines.map((line) => ({
    partRequestId: line.partRequestId,
    partName: line.partName,
    quantity: Number(line.quantity),
    rate: Number(line.rate),
    deliveryDate: line.deliveryDate,
  }))
  const pricesValid = payloadLines.length > 0 && payloadLines.every((line) => line.quantity > 0 && line.rate > 0)

  const updateLine = (partRequestId: string, patch: Partial<QuoteLineDraft>) => {
    setLines((current) => current.map((line) => line.partRequestId === partRequestId ? { ...line, ...patch } : line))
  }

  const createQuote = async () => {
    if (!pricesValid) {
      onNotice('Enter a positive unit price and quantity for every part.', true)
      return
    }
    setSaving(true)
    try {
      const created = await workshopApi.createCustomerQuotationFromRequest({
        partRequestId: lines[0].partRequestId,
        lines: payloadLines,
        validTill,
        terms,
        procurementCaseId: request.procurementCaseId,
      })
      onQuoteChange(request.id, created)
      onNotice(`Customer quotation ${created.id} created`)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not create the customer quotation', true)
    } finally {
      setSaving(false)
    }
  }

  const saveQuote = async () => {
    if (!quote || !pricesValid) {
      onNotice('Enter a positive unit price and quantity for every part.', true)
      return
    }
    setSaving(true)
    try {
      const updated = await workshopApi.updateCustomerQuotation({
        id: quote.id,
        lines: payloadLines,
        validTill,
        terms,
        reason: 'Updated from part request triage',
      })
      onQuoteChange(request.id, updated)
      onNotice(`Customer quotation ${updated.id} saved`)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not save the customer quotation', true)
    } finally {
      setSaving(false)
    }
  }

  const setDecision = async (status: 'Approved' | 'Rejected') => {
    if (!quote) return
    if (status === 'Rejected' && !rejectNote.trim()) {
      onNotice('A rejection note is required.', true)
      return
    }
    setSaving(true)
    try {
      const updated = await workshopApi.setCustomerQuotationDecision(quote.id, status, rejectNote.trim() || undefined)
      onQuoteChange(request.id, updated)
      onNotice(`Customer quotation ${updated.id} marked ${status.toLowerCase()}`)
      setRejectNote('')
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not record the customer decision', true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: 2, borderRadius: radii.sm, border: `1px solid ${colors.border.default}`, bgcolor: colors.slate[50] }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
        <Description sx={{ color: '#2563eb', fontSize: '1.1rem' }} />
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: colors.slate[900] }}>Customer Quotation</Typography>
        {quote ? (
          <>
            <Chip size="small" label={quote.id} sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: '#dbeafe', color: '#1d4ed8' }} />
            <Chip size="small" label={quote.status} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
            <Chip size="small" label={quote.customerDecision || 'Pending'} sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: quote.customerDecision === 'Approved' ? '#d1fae5' : quote.customerDecision === 'Rejected' ? '#fee2e2' : '#fef3c7' }} />
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#047857' }}>৳{(quote.grandTotal || 0).toLocaleString()}</Typography>
          </>
        ) : (
          <Chip size="small" label="Not created" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
        )}
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Part</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', width: 90 }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', width: 130 }}>Unit Price (৳)</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', width: 150 }}>Delivery Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.partRequestId}>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{line.partName}</TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={line.quantity} disabled={!editable || saving} onChange={(event) => updateLine(line.partRequestId, { quantity: Number(event.target.value) })} sx={{ width: 80 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={line.rate || ''} disabled={!editable || saving} onChange={(event) => updateLine(line.partRequestId, { rate: Number(event.target.value) })} sx={{ width: 120 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="date" value={line.deliveryDate} disabled={!editable || saving} onChange={(event) => updateLine(line.partRequestId, { deliveryDate: event.target.value })} sx={{ width: 150 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5, alignItems: 'flex-start' }}>
        <TextField size="small" type="date" label="Valid Till" value={validTill} disabled={!editable || saving} onChange={(event) => setValidTill(event.target.value)} sx={{ minWidth: 170 }} />
        <TextField size="small" label="Terms" value={terms} disabled={!editable || saving} onChange={(event) => setTerms(event.target.value)} fullWidth />
      </Stack>
      {quote ? (
        <TextField size="small" label="Customer decision note" value={rejectNote} disabled={!editable || saving} onChange={(event) => setRejectNote(event.target.value)} fullWidth sx={{ mt: 1.5 }} />
      ) : null}
      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {quote ? (
          <>
            <Button size="small" variant="contained" disabled={saving || !editable || !pricesValid} onClick={() => void saveQuote()} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Save Changes</Button>
            <Button size="small" variant="outlined" startIcon={<Print />} disabled={saving} onClick={() => window.open(workshopApi.customerQuotationPrintUrl(quote.id), '_blank', 'noopener,noreferrer')} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Print PDF</Button>
            <Button size="small" variant="contained" disabled={saving || !editable} onClick={() => void setDecision('Approved')} sx={{ bgcolor: '#059669', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Mark Approved</Button>
            <Button size="small" variant="outlined" color="error" disabled={saving || !editable} onClick={() => void setDecision('Rejected')} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Mark Rejected</Button>
          </>
        ) : (
          <Button size="small" variant="contained" disabled={saving || !pricesValid || !request.lineItems.length} onClick={() => void createQuote()} sx={{ bgcolor: '#2563eb', fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>Create Customer Quotation</Button>
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

  const handleQuoteChange = (requestId: string, quotation: CustomerQuotation) => {
    useMockProcurementStore.setState((state) => ({
      partRequests: state.partRequests.map((request) =>
        request.id === requestId ? { ...request, customerQuotation: quotation } : request,
      ),
    }))
  }

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
      setSnack(
        details.disposition === 'in_stock'
          ? 'Part picked from stock and saved'
          : details.disposition === 'pending'
            ? 'Part details saved'
            : 'Triage saved',
      )
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
        const quotations = await workshopApi.listCustomerQuotations({ appointmentId, pageSize: 100 }).catch(() => ({ data: [] as CustomerQuotation[] }))
        return {
          id: appointmentId,
          procurementCaseId: caseByAppointment.get(appointmentId),
          requestNumber: appointmentId,
          vehicleName: vehicle ? [vehicle.registrationNo, vehicle.make, vehicle.model].filter(Boolean).join(' · ') : 'Appointment vehicle',
          vin: rows[0].vin ?? vehicle?.vin ?? null,
          customerName: customer?.fullName || 'Workshop customer',
          customerPhone: customer?.phone || '',
          requestedByName: rows[0].requestedBy,
          requestedAt: rows[0].createdAt,
          notes: appointment?.concerns || appointment?.notes || undefined,
          lineItems: rows.map(lineItemFromServer),
          customerQuotation: quotations.data[0] || null,
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
                      {req.vin ? (
                        <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400], fontFamily: 'monospace' }}>
                          VIN {req.vin}
                        </Typography>
                      ) : null}
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

                    {hasNonStockCompleted ? (
                      <CustomerQuotationPanel
                        request={req}
                        onQuoteChange={handleQuoteChange}
                        onNotice={(message, error) => {
                          setSnackError(Boolean(error))
                          setSnack(message)
                        }}
                      />
                    ) : null}

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
