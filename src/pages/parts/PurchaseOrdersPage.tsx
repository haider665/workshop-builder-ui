import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  Cancel,
  CheckCircle,
  Close,
  Delete,
  LocalShipping,
  Send,
  ShoppingCart,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { workshopApi } from '../../services/workshopApi'
import type { CWPurchaseOrder, CWPurchaseOrderStatus, CWGRNLineCondition } from '../../types/cw'
import { colors, pageLayout, shadows, radii } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'

/* ─────────────────────── Helpers ─────────────────────────── */

function fmtCurrency(amount: number, currency: string) {
  if (currency === 'BDT') return `৳${amount.toLocaleString()}`
  if (currency === 'USD') return `$${amount.toLocaleString()}`
  if (currency === 'EUR') return `€${amount.toLocaleString()}`
  return String(amount)
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_CHIP: Record<CWPurchaseOrderStatus, { bg: string; color: string }> = {
  Draft:              { bg: '#f1f5f9', color: '#475569' },
  'Awaiting Advance': { bg: '#fff7ed', color: '#c2410c' },
  'Pending Approval': { bg: '#fffbeb', color: '#b45309' },
  Issued:             { bg: '#eff6ff', color: '#1d4ed8' },
  'In Transit':       { bg: '#eef2ff', color: '#4338ca' },
  Received:           { bg: '#ecfdf5', color: '#047857' },
  'Partially Received': { bg: '#f0fdfa', color: '#0f766e' },
  Rejected:           { bg: '#fef2f2', color: '#b91c1c' },
  Cancelled:          { bg: '#f1f5f9', color: '#64748b' },
  Closed:             { bg: '#f8fafc', color: '#334155' },
}

type LineDraft = {
  partId: string
  quantity: number
  unitPrice: number
  discount: number
}

type PODraft = {
  vendorId: string
  currency: 'BDT' | 'USD' | 'EUR'
  sourcingType: 'Local' | 'Foreign'
  expectedArrivalDate: string
  advanceRequired: boolean
  lines: LineDraft[]
}

function emptyDraft(): PODraft {
  return {
    vendorId: '',
    currency: 'BDT',
    sourcingType: 'Local',
    expectedArrivalDate: '',
    advanceRequired: false,
    lines: [],
  }
}

function emptyLine(): LineDraft {
  return { partId: '', quantity: 1, unitPrice: 0, discount: 0 }
}

type GRNLineDraft = {
  poLineId: string
  partId: string
  partName: string
  orderedQty: number
  alreadyReceived: number
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  sellPrice: number
  condition: CWGRNLineCondition
  notes: string
}

function lineTotal(l: LineDraft) {
  return l.quantity * l.unitPrice * (1 - l.discount / 100)
}

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

export function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<CWPurchaseOrder[]>([])
  const [vendors, setVendors] = useState<import('../../types/cw').CWVendor[]>([])
  const [parts, setParts] = useState<import('../../types/cw').CWPart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<PODraft>(emptyDraft())

  /* ── Session & Admin ── */
  const sessionUser = useSessionStore((s) => s.user)
  const isAdmin = sessionUser?.roles?.some(r => r.toLowerCase().includes('admin')) ?? false

  /* ── Store actions for approve/reject ── */
  const approvePurchaseOrder = useCwStore((s) => s.approvePurchaseOrder)
  const rejectPurchaseOrder = useCwStore((s) => s.rejectPurchaseOrder)
  const users = useCwStore((s) => s.users)

  const getUserName = (id?: string) => users.find(u => u.id === id)?.fullName || '—'

  /* ── Reject dialog state ── */
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectPoId, setRejectPoId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  /* ── GRN dialog state ── */
  const [grnDialogOpen, setGrnDialogOpen] = useState(false)
  const [grnPoId, setGrnPoId] = useState<string | null>(null)
  const [grnLines, setGrnLines] = useState<GRNLineDraft[]>([])
  const [grnNotes, setGrnNotes] = useState('')
  const [grnDiscrepancy, setGrnDiscrepancy] = useState('')

  async function loadPOData() {
    setLoading(true)
    setError(null)
    try {
      const [poRes, vendorRes, partRes] = await Promise.all([
        workshopApi.listPurchaseOrders({ pageSize: 100 }),
        workshopApi.listVendors({ pageSize: 100 }),
        workshopApi.listParts({ pageSize: 100 }),
      ])
      setPurchaseOrders(poRes.data)
      setVendors(vendorRes.data)
      setParts(partRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPOData()
  }, [])

  const allPOs = purchaseOrders

  /* ── Stats ── */

  const draftCount = allPOs.filter((po) => po.status === 'Draft').length
  const pendingCount = allPOs.filter((po) => po.status === 'Pending Approval').length
  const issuedCount = allPOs.filter((po) => po.status === 'Issued').length

  /* ── Vendor lookup ── */

  const vendorMap = useMemo(() => {
    const m = new Map<string, string>()
    vendors.forEach((v) => m.set(v.id, v.name))
    return m
  }, [vendors])

  /* ── Create PO ── */

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function handleVendorChange(vendorId: string) {
    const vendor = vendors.find((v) => v.id === vendorId)
    setDraft((d) => ({
      ...d,
      vendorId,
      sourcingType: vendor?.sourcingType ?? d.sourcingType,
    }))
  }

  function addLine() {
    setDraft((d) => ({ ...d, lines: [...d.lines, emptyLine()] }))
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }))
  }

  function removeLine(index: number) {
    setDraft((d) => ({ ...d, lines: d.lines.filter((_, i) => i !== index) }))
  }

  const grandTotal = draft.lines.reduce((sum, l) => sum + lineTotal(l), 0)

  async function submitCreate() {
    if (!draft.vendorId || !draft.expectedArrivalDate || draft.lines.length === 0) return
    const validLines = draft.lines.filter((l) => l.partId && l.quantity > 0)
    if (validLines.length === 0) return

    setError(null)
    try {
      await workshopApi.createPurchaseOrder({
        vendorId: draft.vendorId,
        currency: draft.currency,
        sourcingType: draft.sourcingType,
        expectedArrivalDate: draft.expectedArrivalDate,
        advanceRequired: draft.advanceRequired,
        createdByUserId: sessionUser?.id,
        lines: validLines.map((l) => {
          const part = parts.find((p) => p.id === l.partId)
          return {
            partId: l.partId,
            partNumber: part?.partNumber ?? '',
            partName: part?.name ?? '',
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount || undefined,
          }
        }),
      })
      setCreateOpen(false)
      await loadPOData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order')
    }
  }

  async function handleSubmitPO(id: string) {
    setError(null)
    try {
      await workshopApi.submitPurchaseOrder(id)
      await loadPOData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit purchase order')
    }
  }

  async function handleApprovePO(id: string) {
    try {
      await workshopApi.approvePurchaseOrder(id)
      approvePurchaseOrder(id, sessionUser?.id || '')
      await loadPOData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve PO')
    }
  }

  function openRejectDialog(id: string) {
    setRejectPoId(id)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  function handleConfirmReject() {
    if (rejectPoId && rejectReason.trim()) {
      rejectPurchaseOrder(rejectPoId, rejectReason.trim(), sessionUser?.id || '')
      setRejectDialogOpen(false)
      setRejectPoId(null)
      setRejectReason('')
      void loadPOData()
    }
  }

  /* ── GRN handlers ── */
  function openGrnDialog(po: CWPurchaseOrder) {
    setGrnPoId(po.id)
    setGrnLines(
      po.lines.map((line) => ({
        poLineId: line.id,
        partId: line.partId,
        partName: line.partName || line.partNumber,
        orderedQty: line.quantity,
        alreadyReceived: line.receivedQty ?? 0,
        receivedQty: line.quantity - (line.receivedQty ?? 0),
        acceptedQty: line.quantity - (line.receivedQty ?? 0),
        rejectedQty: 0,
        sellPrice: 0,
        condition: 'Good' as CWGRNLineCondition,
        notes: '',
      }))
    )
    setGrnNotes('')
    setGrnDiscrepancy('')
    setGrnDialogOpen(true)
  }

  function updateGrnLine(idx: number, patch: Partial<GRNLineDraft>) {
    setGrnLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, ...patch }
        // Auto-calc: acceptedQty = receivedQty - rejectedQty
        if ('receivedQty' in patch || 'rejectedQty' in patch) {
          updated.acceptedQty = Math.max(0, updated.receivedQty - updated.rejectedQty)
        }
        return updated
      })
    )
  }

  async function handleSubmitGRN() {
    if (!grnPoId) return
    setError(null)
    try {
      await workshopApi.createGRN(grnPoId, {
        lines: grnLines.map((l) => ({
          poLineId: l.poLineId,
          partId: l.partId,
          receivedQty: l.receivedQty,
          acceptedQty: l.acceptedQty,
          rejectedQty: l.rejectedQty,
          sellPrice: l.sellPrice,
          condition: l.condition,
          notes: l.notes || undefined,
        })),
        notes: grnNotes || undefined,
        discrepancyNotes: grnDiscrepancy || undefined,
      })
      setGrnDialogOpen(false)
      setGrnPoId(null)
      await loadPOData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create GRN')
    }
  }

  async function handleCancelPO(id: string) {
    setError(null)
    try {
      await workshopApi.cancelPurchaseOrder(id)
      await loadPOData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel purchase order')
    }
  }

  const canSubmitCreate = draft.vendorId && draft.expectedArrivalDate && draft.lines.some((l) => l.partId && l.quantity > 0)

  /* ── Table Columns ── */

  const columns: Column<CWPurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      minWidth: 120,
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 700, color: colors.slate[900] }}>
          {po.poNumber}
        </Typography>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      minWidth: 140,
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
          {vendorMap.get(po.vendorId) ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => {
        const chip = STATUS_CHIP[po.status]
        return (
          <Chip
            size="small"
            label={po.status}
            sx={{
              fontWeight: 600,
              fontSize: '0.72rem',
              bgcolor: chip.bg,
              color: chip.color,
            }}
          />
        )
      },
    },
    {
      key: 'sourcingType',
      header: 'Sourcing',
      render: (po) => (
        <Chip
          size="small"
          label={po.sourcingType}
          sx={{
            fontWeight: 600,
            fontSize: '0.72rem',
            bgcolor: po.sourcingType === 'Local' ? '#ecfdf5' : '#eff6ff',
            color: po.sourcingType === 'Local' ? '#047857' : '#1d4ed8',
          }}
        />
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {po.currency}
        </Typography>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[900] }}>
          {fmtCurrency(po.totalAmount, po.currency)}
        </Typography>
      ),
    },
    {
      key: 'expectedArrival',
      header: 'Expected Arrival',
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {fmtDate(po.expectedArrivalDate)}
        </Typography>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>
          {fmtDate(po.createdAt)}
        </Typography>
      ),
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (po) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {getUserName(po.createdByUserId)}
        </Typography>
      ),
    },
    {
      key: 'approvedBy',
      header: 'Approved By',
      render: (po) => {
        if (['Issued', 'Received', 'In Transit', 'Partially Received', 'Closed'].includes(po.status) && po.approvedByUserId) {
          return (
            <Stack spacing={0}>
              <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                {getUserName(po.approvedByUserId)}
              </Typography>
              {po.approvedAt && (
                <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                  {fmtDate(po.approvedAt)}
                </Typography>
              )}
            </Stack>
          )
        }
        if (po.status === 'Rejected' && po.rejectedByUserId) {
          return (
            <Stack spacing={0}>
              <Typography sx={{ fontSize: '0.875rem', color: '#b91c1c', fontWeight: 600 }}>
                {getUserName(po.rejectedByUserId)}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                Rejected
              </Typography>
            </Stack>
          )
        }
        return (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>—</Typography>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (po) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          {po.status === 'Draft' && (
            <Tooltip title="Submit for Approval">
              <IconButton size="small" onClick={() => { void handleSubmitPO(po.id) }}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isAdmin && po.status === 'Pending Approval' && (
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CheckCircle />}
                onClick={() => handleApprovePO(po.id)}
                sx={{
                  color: '#047857',
                  borderColor: '#047857',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.25,
                  '&:hover': { bgcolor: 'rgba(4,120,87,0.08)', borderColor: '#047857' },
                }}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => openRejectDialog(po.id)}
                sx={{
                  color: '#b91c1c',
                  borderColor: '#b91c1c',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.25,
                  '&:hover': { bgcolor: 'rgba(185,28,28,0.08)', borderColor: '#b91c1c' },
                }}
              >
                Reject
              </Button>
            </Stack>
          )}
          {['Issued', 'Partially Received', 'In Transit'].includes(po.status) && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<LocalShipping />}
              onClick={() => openGrnDialog(po)}
              sx={{
                color: '#1d4ed8',
                borderColor: '#1d4ed8',
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.25,
                '&:hover': { bgcolor: 'rgba(29,78,216,0.08)', borderColor: '#1d4ed8' },
              }}
            >
              Receive Goods
            </Button>
          )}
          {!['Received', 'Closed', 'Cancelled'].includes(po.status) && (
            <Tooltip title="Cancel PO">
              <IconButton size="small" onClick={() => { void handleCancelPO(po.id) }}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ]

  /* ── Render ── */

  const statCards: Array<{ label: string; count: number; borderColor: string }> = [
    { label: 'Draft', count: draftCount, borderColor: '#94a3b8' },
    { label: 'Pending Approval', count: pendingCount, borderColor: '#f59e0b' },
    { label: 'Issued', count: issuedCount, borderColor: '#3b82f6' },
  ]

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Purchase Module
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Create and manage purchase orders, track deliveries.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={btnSx}
          >
            Create PO
          </Button>
        </Stack>

        {/* Stats */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {statCards.map((s) => (
            <Box
              key={s.label}
              sx={{
                flex: 1,
                px: 2.5,
                py: 2,
                borderRadius: radii.md,
                border: `1px solid ${colors.border.default}`,
                borderLeft: `4px solid ${s.borderColor}`,
                background: colors.bg.card,
                boxShadow: shadows.card,
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.slate[500], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: colors.slate[900], mt: 0.5 }}>
                {s.count}
              </Typography>
            </Box>
          ))}
        </Stack>

        {error ? <Typography sx={{ color: colors.status.error, fontSize: '0.875rem' }}>{error}</Typography> : null}

        {/* Table */}
        <DataTable
          columns={columns}
          rows={allPOs}
          loading={loading}
          keyExtractor={(po) => po.id}
          emptyIcon={<ShoppingCart />}
          emptyTitle="No purchase orders yet"
          emptyDescription="Create a purchase order to get started."
          emptyAction={
            <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnSx}>
              Create PO
            </Button>
          }
        />

        {/* ── Create PO Dialog ── */}
        <FormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create Purchase Order"
          icon={<ShoppingCart />}
          onSubmit={submitCreate}
          submitLabel="Create PO"
          submitDisabled={!canSubmitCreate}
          maxWidth="md"
        >
          {/* Vendor */}
          <TextField
            label="Vendor"
            value={draft.vendorId}
            onChange={(e) => handleVendorChange(e.target.value)}
            select
            fullWidth
            required
          >
            {vendors.map((v) => (
              <MenuItem key={v.id} value={v.id}>{v.name} ({v.code})</MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            {/* Currency */}
            <TextField
              label="Currency"
              value={draft.currency}
              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value as PODraft['currency'] }))}
              select
              fullWidth
            >
              <MenuItem value="BDT">BDT (৳)</MenuItem>
              <MenuItem value="USD">USD ($)</MenuItem>
              <MenuItem value="EUR">EUR (€)</MenuItem>
            </TextField>

            {/* Sourcing Type (auto from vendor) */}
            <TextField
              label="Sourcing Type"
              value={draft.sourcingType}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
          </Stack>

          {/* Expected Arrival */}
          <TextField
            label="Expected Arrival Date"
            type="date"
            value={draft.expectedArrivalDate}
            onChange={(e) => setDraft((d) => ({ ...d, expectedArrivalDate: e.target.value }))}
            fullWidth
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {/* Advance Required */}
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.advanceRequired}
                onChange={(e) => setDraft((d) => ({ ...d, advanceRequired: e.target.checked }))}
              />
            }
            label="Advance Required"
          />

          {/* ── Lines ── */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: colors.slate[900] }}>
                Line Items
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={addLine}
                sx={{ fontWeight: 600, color: colors.slate[700] }}
              >
                Add Line
              </Button>
            </Stack>

            {draft.lines.length === 0 && (
              <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem', py: 2, textAlign: 'center' }}>
                No line items added yet. Click "Add Line" to begin.
              </Typography>
            )}

            <Stack spacing={2}>
              {draft.lines.map((line, idx) => {
                const selectedPart = parts.find((p) => p.id === line.partId) ?? null
                const lt = lineTotal(line)
                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border.default}`,
                      background: colors.bg.subtle,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: colors.slate[500] }}>
                          Line {idx + 1}
                        </Typography>
                        <IconButton size="small" onClick={() => removeLine(idx)}>
                          <Delete fontSize="small" sx={{ color: colors.slate[400] }} />
                        </IconButton>
                      </Stack>

                      {/* Part select */}
                      <Autocomplete
                        options={parts}
                        value={selectedPart}
                        onChange={(_, val) => updateLine(idx, { partId: val?.id ?? '' })}
                        getOptionLabel={(p) => `${p.partNumber} — ${p.name}`}
                        renderInput={(params) => <TextField {...params} label="Part" size="small" required />}
                        size="small"
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      />

                      <Stack direction="row" spacing={1.5}>
                        <TextField
                          label="Qty"
                          type="number"
                          size="small"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                          sx={{ flex: 1 }}
                          slotProps={{ input: { inputProps: { min: 1 } } }}
                        />
                        <TextField
                          label="Unit Price"
                          type="number"
                          size="small"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, { unitPrice: Math.max(0, Number(e.target.value)) })}
                          sx={{ flex: 1 }}
                          slotProps={{ input: { inputProps: { min: 0 } } }}
                        />
                        <TextField
                          label="Discount %"
                          type="number"
                          size="small"
                          value={line.discount}
                          onChange={(e) => updateLine(idx, { discount: Math.max(0, Math.min(100, Number(e.target.value))) })}
                          sx={{ flex: 1 }}
                          slotProps={{ input: { inputProps: { min: 0, max: 100 } } }}
                        />
                        <TextField
                          label="Line Total"
                          size="small"
                          value={fmtCurrency(lt, draft.currency)}
                          sx={{ flex: 1 }}
                          slotProps={{ input: { readOnly: true } }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>

            {/* Grand Total */}
            {draft.lines.length > 0 && (
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2, pr: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: colors.slate[900] }}>
                  Grand Total: {fmtCurrency(grandTotal, draft.currency)}
                </Typography>
              </Stack>
            )}
           </Box>
        </FormDialog>

        {/* ── Reject Reason Dialog ── */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Reject Purchase Order</DialogTitle>
          <DialogContent>
            <TextField
              label="Rejection Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRejectDialogOpen(false)} sx={{ color: colors.slate[600] }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim()}
              sx={{ bgcolor: '#b91c1c', '&:hover': { bgcolor: '#991b1b' } }}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── GRN Dialog ── */}
        <Dialog open={grnDialogOpen} onClose={() => setGrnDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping sx={{ color: '#1d4ed8' }} /> Receive Goods (GRN)
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500], mb: 2 }}>
              Record received quantities, condition, and sell price for each line item.
            </Typography>

            <Stack spacing={2}>
              {grnLines.map((line, idx) => (
                <Box
                  key={line.poLineId}
                  sx={{
                    border: `1px solid ${colors.slate[200]}`,
                    borderRadius: '8px',
                    p: 2,
                    bgcolor: line.rejectedQty > 0 ? '#fef2f2' : '#f8fafc',
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
                        {line.partName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                        Ordered: {line.orderedQty} | Already Received: {line.alreadyReceived}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        label="Received Qty"
                        type="number"
                        size="small"
                        value={line.receivedQty}
                        onChange={(e) => updateGrnLine(idx, { receivedQty: Math.max(0, Number(e.target.value)) })}
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { min: 0 } } }}
                      />
                      <TextField
                        label="Rejected Qty"
                        type="number"
                        size="small"
                        value={line.rejectedQty}
                        onChange={(e) => updateGrnLine(idx, { rejectedQty: Math.max(0, Number(e.target.value)) })}
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { min: 0 } } }}
                      />
                      <TextField
                        label="Accepted Qty"
                        size="small"
                        value={line.acceptedQty}
                        sx={{ flex: 1 }}
                        slotProps={{ input: { readOnly: true } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        label="Sell Price (৳)"
                        type="number"
                        size="small"
                        value={line.sellPrice}
                        onChange={(e) => updateGrnLine(idx, { sellPrice: Math.max(0, Number(e.target.value)) })}
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { min: 0 } } }}
                      />
                      <TextField
                        label="Condition"
                        select
                        size="small"
                        value={line.condition}
                        onChange={(e) => updateGrnLine(idx, { condition: e.target.value as CWGRNLineCondition })}
                        sx={{ flex: 1 }}
                      >
                        <MenuItem value="Good">Good</MenuItem>
                        <MenuItem value="Damaged">Damaged</MenuItem>
                        <MenuItem value="Wrong Item">Wrong Item</MenuItem>
                      </TextField>
                      <TextField
                        label="Notes"
                        size="small"
                        value={line.notes}
                        onChange={(e) => updateGrnLine(idx, { notes: e.target.value })}
                        sx={{ flex: 1 }}
                        placeholder="Optional"
                      />
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <TextField
              label="General Notes"
              value={grnNotes}
              onChange={(e) => setGrnNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="Optional receiving notes"
            />
            <TextField
              label="Discrepancy Notes"
              value={grnDiscrepancy}
              onChange={(e) => setGrnDiscrepancy(e.target.value)}
              multiline
              rows={2}
              fullWidth
              sx={{ mt: 1.5 }}
              placeholder="Note any discrepancies between ordered and received"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setGrnDialogOpen(false)} sx={{ color: colors.slate[600] }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => { void handleSubmitGRN() }}
              disabled={grnLines.every((l) => l.receivedQty === 0)}
              startIcon={<LocalShipping />}
              sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
            >
              Confirm Receipt
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
