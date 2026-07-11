import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
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
  Close,
  Delete,
  Send,
  ShoppingCart,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPurchaseOrder, CWPurchaseOrderStatus } from '../../types/cw'
import { colors, pageLayout, shadows, radii } from '../../theme/tokens'

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
  const purchaseOrders = useCwStore((s) => s.purchaseOrders)
  const vendors = useCwStore((s) => s.vendors)
  const parts = useCwStore((s) => s.parts)
  const createPurchaseOrder = useCwStore((s) => s.createPurchaseOrder)
  const submitPurchaseOrder = useCwStore((s) => s.submitPurchaseOrder)
  const cancelPurchaseOrder = useCwStore((s) => s.cancelPurchaseOrder)

  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<PODraft>(emptyDraft())

  /* ── Demo POs ── */

  const demoPOs = useMemo<CWPurchaseOrder[]>(() => [
    { id: 'po-1', poNumber: 'PO-0001', vendorId: vendors[0]?.id ?? '', status: 'Issued' as const, currency: 'BDT' as const, sourcingType: 'Local' as const, expectedArrivalDate: '2025-07-20', totalAmount: 45000, advanceRequired: false, blockedAppointmentIds: [], lines: [], createdByUserId: 'u-1', createdAt: '2025-07-10T09:00:00Z', updatedAt: '2025-07-10T09:00:00Z' },
    { id: 'po-2', poNumber: 'PO-0002', vendorId: vendors[1]?.id ?? '', status: 'Pending Approval' as const, currency: 'USD' as const, sourcingType: 'Foreign' as const, expectedArrivalDate: '2025-08-05', totalAmount: 125000, advanceRequired: true, blockedAppointmentIds: [], lines: [], createdByUserId: 'u-1', createdAt: '2025-07-11T10:00:00Z', updatedAt: '2025-07-11T10:00:00Z' },
    { id: 'po-3', poNumber: 'PO-0003', vendorId: vendors[2]?.id ?? '', status: 'Draft' as const, currency: 'BDT' as const, sourcingType: 'Foreign' as const, expectedArrivalDate: '2025-07-25', totalAmount: 68000, advanceRequired: true, advanceConfirmedAt: '2025-07-11T11:00:00Z', blockedAppointmentIds: [], lines: [], createdByUserId: 'u-1', createdAt: '2025-07-11T14:00:00Z', updatedAt: '2025-07-11T14:00:00Z' },
  ], [vendors])

  /* ── Merge demo + real ── */

  const allPOs = useMemo(() => {
    const realIds = new Set(purchaseOrders.map((po) => po.id))
    const demos = demoPOs.filter((d) => !realIds.has(d.id))
    return [...purchaseOrders, ...demos]
  }, [purchaseOrders, demoPOs])

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

  function submitCreate() {
    if (!draft.vendorId || !draft.expectedArrivalDate || draft.lines.length === 0) return
    const validLines = draft.lines.filter((l) => l.partId && l.quantity > 0)
    if (validLines.length === 0) return

    createPurchaseOrder({
      vendorId: draft.vendorId,
      currency: draft.currency,
      sourcingType: draft.sourcingType,
      expectedArrivalDate: draft.expectedArrivalDate,
      advanceRequired: draft.advanceRequired,
      createdByUserId: 'u-1',
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
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (po) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          {po.status === 'Draft' && (
            <Tooltip title="Submit for Approval">
              <IconButton size="small" onClick={() => submitPurchaseOrder(po.id)}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!['Received', 'Closed', 'Cancelled'].includes(po.status) && (
            <Tooltip title="Cancel PO">
              <IconButton size="small" onClick={() => cancelPurchaseOrder(po.id)}>
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

        {/* Table */}
        <DataTable
          columns={columns}
          rows={allPOs}
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
      </Stack>
    </Box>
  )
}
