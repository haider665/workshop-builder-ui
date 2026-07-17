import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {Delete, Image as ImageIcon, Lock, Search, Send,} from '@mui/icons-material'
import {colors, pageLayout, radii, shadows} from '../../theme/tokens'
import {workshopApi} from '../../services/workshopApi'
import type {CWEstimateLine, CWEstimateLineStatus, CWPart} from '../../types/cw'

/* ─────────────────────── Constants ─────────────────────────── */

const SOURCING_TYPES = ['OEM', 'Genuine', 'Aftermarket', 'In Stock', 'Purchase', 'Transfer'] as const

const STATUS_COLOR: Record<CWEstimateLineStatus, string> = {
  Requested: colors.accent.amber,
  Identified: colors.accent.blue,
  Priced: colors.accent.purple,
  Submitted: colors.accent.orange,
  Approved: colors.status.success,
  Declined: colors.status.error,
  Fulfilled: colors.status.success,
  'Substitution Required': colors.status.warning,
}

const QUEUE_TABS = ['All', 'Requested', 'Identified'] as const
type QueueTab = (typeof QUEUE_TABS)[number]

/* ─────────────────────── Helpers ─────────────────────────── */

function fmtBDT(n?: number) {
  if (n == null) return '—'
  return `৳${n.toLocaleString()}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBg(status: CWEstimateLineStatus) {
  const c = STATUS_COLOR[status] ?? colors.slate[400]
  return `${c}18`
}

function statusFg(status: CWEstimateLineStatus) {
  return STATUS_COLOR[status] ?? colors.slate[600]
}

/* ─────────────────────── Part Card (Left Panel) ─────────────────────────── */

function PartCard({ line, onAddToEstimate }: { line: CWEstimateLine; onAddToEstimate: (line: CWEstimateLine) => void }) {
  const isRequested = line.status === 'Requested'
  const isIdentified = line.status === 'Identified'
  const canAdd = isRequested || isIdentified

  return (
    <Box
      sx={{
        bgcolor: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radii.md,
        boxShadow: shadows.card,
        p: 2,
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        cursor: canAdd ? 'pointer' : 'default',
        '&:hover': canAdd ? { boxShadow: shadows.elevated, borderColor: colors.accent.blue } : {},
      }}
      onClick={() => canAdd && onAddToEstimate(line)}
    >
      {/* Thumbnail / placeholder */}
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: radii.sm,
          bgcolor: colors.bg.subtle,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {line.mediaUrls && line.mediaUrls.length > 0 ? (
          <Box component="img" src={line.mediaUrls[0]} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radii.sm }} />
        ) : (
          <ImageIcon sx={{ fontSize: 28, color: colors.slate[300] }} />
        )}
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}>
            {line.partName ?? line.description}
          </Typography>
          <Chip
            label={line.status}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.6rem', height: 20, bgcolor: statusBg(line.status), color: statusFg(line.status), flexShrink: 0, ml: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip label={`Qty: ${line.quantity}`} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, bgcolor: colors.accent.amber + '20', color: colors.accent.amber }} />
          {line.partNumber && (
            <Chip label={line.partNumber} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20, fontFamily: 'monospace', bgcolor: colors.bg.subtle }} />
          )}
          {line.inStock && (
            <Chip label="In Stock" size="small" sx={{ fontWeight: 700, fontSize: '0.6rem', height: 18, bgcolor: `${colors.status.success}18`, color: colors.status.success }} />
          )}
        </Stack>

        <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400], mt: 0.5 }}>
          By: {line.requestedByUserId} · {fmtDate(line.createdAt)}
        </Typography>
      </Box>

      {/* View icon */}
      <IconButton size="small" sx={{ flexShrink: 0, color: colors.slate[400] }}>
        <Search sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  )
}

/* ─────────────────────── Pricing Row (Right Panel Table) ─────────────────────────── */

type PricingRowData = {
  lineId: string
  partName: string
  partNumber?: string
  sourcingType: string
  unitPrice: string
  sellPrice: string
  quantity: string
  deliveryDate: string
  inStock: boolean
  status: CWEstimateLineStatus
  dirty: boolean
}

function PricingRow({ row, onChange, onSave, onRemove, locked }: {
  row: PricingRowData
  onChange: (field: keyof PricingRowData, value: string) => void
  onSave: () => void
  onRemove: () => void
  locked: boolean
}) {
  const total = (parseFloat(row.sellPrice) || 0) * (parseInt(row.quantity, 10) || 1)
  const isPriced = row.status === 'Priced' || row.status === 'Submitted'

  const inputSx = {
    '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75, px: 1 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border.default },
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1.8fr 1fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr 0.4fr',
        gap: 1,
        alignItems: 'center',
        py: 1,
        px: 1.5,
        borderBottom: `1px solid ${colors.border.subtle}`,
        bgcolor: locked ? colors.bg.subtle : 'transparent',
        '&:hover': { bgcolor: locked ? colors.bg.subtle : colors.bg.cardHover },
      }}
    >
      {/* Part Name */}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: colors.slate[900], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.partName}
        </Typography>
        {row.partNumber && (
          <Typography sx={{ fontSize: '0.65rem', color: colors.slate[400], fontFamily: 'monospace' }}>{row.partNumber}</Typography>
        )}
      </Box>

      {/* Sourcing Type */}
      <FormControl size="small" disabled={locked}>
        <Select
          value={row.sourcingType}
          onChange={(e) => onChange('sourcingType', e.target.value)}
          sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
        >
          {SOURCING_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: '0.8rem' }}>{t}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Sell Price */}
      <TextField
        size="small"
        type="number"
        value={row.sellPrice}
        onChange={(e) => onChange('sellPrice', e.target.value)}
        disabled={locked}
        placeholder="0.00"
        sx={inputSx}
        slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
      />

      {/* Qty */}
      <TextField
        size="small"
        type="number"
        value={row.quantity}
        onChange={(e) => onChange('quantity', e.target.value)}
        disabled={locked}
        sx={inputSx}
        slotProps={{ input: { inputProps: { min: 1 } } }}
      />

      {/* Delivery Date */}
      <TextField
        size="small"
        type="date"
        value={row.deliveryDate}
        onChange={(e) => onChange('deliveryDate', e.target.value)}
        disabled={locked}
        sx={{ ...inputSx, '& .MuiInputBase-input': { fontSize: '0.7rem', py: 0.75, px: 0.5 } }}
      />

      {/* Total */}
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: colors.slate[900], textAlign: 'right' }}>
        {fmtBDT(total)}
      </Typography>

      {/* Status indicator */}
      <Box sx={{ textAlign: 'center' }}>
        {isPriced ? (
          <Chip label="✓" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20, bgcolor: `${colors.accent.purple}18`, color: colors.accent.purple }} />
        ) : row.dirty ? (
          <Button size="small" variant="text" onClick={onSave} sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'none', color: colors.accent.purple, minWidth: 0, px: 0.5 }}>
            Save
          </Button>
        ) : null}
      </Box>

      {/* Delete */}
      <Box sx={{ textAlign: 'center' }}>
        {locked ? (
          <Lock sx={{ fontSize: 14, color: colors.slate[300] }} />
        ) : (
          <IconButton size="small" onClick={onRemove} sx={{ color: colors.slate[400], '&:hover': { color: colors.status.error } }}>
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

/* ─────────────────────── Estimation Summary ─────────────────────────── */

function EstimationSummary({ rows, onSubmit, submitting }: {
  rows: PricingRowData[]
  onSubmit: () => void
  submitting: boolean
}) {
  const pricedRows = rows.filter((r) => r.status === 'Priced')
  // const subtotal = pricedRows.reduce((sum, r) => sum + (parseFloat(r.sellPrice) || 0) * (parseInt(r.quantity, 10) || 1), 0)
  const allTotal = rows.reduce((sum, r) => sum + (parseFloat(r.sellPrice) || 0) * (parseInt(r.quantity, 10) || 1), 0)

  return (
    <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, p: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: colors.slate[900], mb: 2 }}>
        Estimation Summary
      </Typography>

      <Stack spacing={1}>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>Parts Subtotal:</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>{fmtBDT(allTotal)}</Typography>
        </Stack>

        <Box sx={{ borderTop: `2px solid ${colors.slate[900]}`, pt: 1.5, mt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: colors.slate[900] }}>Grand Total:</Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: colors.slate[900] }}>{fmtBDT(allTotal)}</Typography>
          </Stack>
        </Box>
      </Stack>

      {/* Actions */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Send sx={{ fontSize: 14 }} />}
          disabled={pricedRows.length === 0 || submitting}
          onClick={onSubmit}
          sx={{
            fontWeight: 800,
            fontSize: '0.8rem',
            textTransform: 'none',
            borderRadius: radii.sm,
            bgcolor: colors.slate[900],
            '&:hover': { bgcolor: colors.slate[800] },
            py: 1.25,
          }}
        >
          {submitting ? 'Submitting…' : 'Send to Advisor'}
        </Button>
      </Stack>

      {pricedRows.length === 0 && rows.length > 0 && (
        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 1.5, textAlign: 'center' }}>
          Save pricing on all parts before submitting.
        </Typography>
      )}
    </Box>
  )
}

/* ─────────────────────── Main Page ─────────────────────────── */

export function EstimatorPage() {
  const [lines, setLines] = useState<CWEstimateLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueTab, setQueueTab] = useState<QueueTab>('All')
  const [pricingRows, setPricingRows] = useState<PricingRowData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  // Parts catalog lookup for defaultSellPrice
  const partsMapRef = useRef<Map<string, CWPart>>(new Map())

  const loadLines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [linesRes, partsRes] = await Promise.all([
        workshopApi.listEstimateLines({ pageSize: 200 }),
        workshopApi.listParts({ status: 'Active', pageSize: 200 }),
      ])
      setLines(linesRes.data)
      const map = new Map<string, CWPart>()
      for (const p of partsRes.data) map.set(p.id, p)
      partsMapRef.current = map
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimate lines')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadLines() }, [loadLines])

  // Lines available for the queue (not yet priced/submitted)
  const queueLines = useMemo(() => {
    const inPricing = new Set(pricingRows.map((r) => r.lineId))
    const available = lines.filter((l) => (l.status === 'Requested' || l.status === 'Identified') && !inPricing.has(l.id))
    if (queueTab === 'All') return available
    return available.filter((l) => l.status === queueTab)
  }, [lines, queueTab, pricingRows])

  const queueCounts = useMemo(() => {
    const inPricing = new Set(pricingRows.map((r) => r.lineId))
    const available = lines.filter((l) => (l.status === 'Requested' || l.status === 'Identified') && !inPricing.has(l.id))
    return {
      All: available.length,
      Requested: available.filter((l) => l.status === 'Requested').length,
      Identified: available.filter((l) => l.status === 'Identified').length,
    }
  }, [lines, pricingRows])

  // Lines already priced or submitted (show in table as locked)
  useEffect(() => {
    const priced = lines.filter((l) => l.status === 'Priced' || l.status === 'Submitted')
    setPricingRows((prev) => {
      const existingIds = new Set(prev.map((r) => r.lineId))
      const newRows = priced
        .filter((l) => !existingIds.has(l.id))
        .map((l) => lineToRow(l))
      if (newRows.length === 0) return prev
      return [...prev, ...newRows]
    })
  }, [lines])

  function lineToRow(line: CWEstimateLine): PricingRowData {
    return {
      lineId: line.id,
      partName: line.partName ?? line.description,
      partNumber: line.partNumber,
      sourcingType: line.sourcingType ?? 'OEM',
      unitPrice: line.unitPrice?.toString() ?? '',
      sellPrice: line.sellPrice?.toString() ?? '',
      quantity: line.quantity?.toString() ?? '1',
      deliveryDate: line.estimatedDeliveryDate ?? '',
      inStock: line.inStock,
      status: line.status,
      dirty: false,
    }
  }

  function handleAddToEstimate(line: CWEstimateLine) {
    if (pricingRows.some((r) => r.lineId === line.id)) return
    const row = lineToRow(line)
    // Pre-fill sell price from part's defaultSellPrice if not already set
    if (!row.sellPrice && line.partId) {
      const part = partsMapRef.current.get(line.partId)
      if (part?.defaultSellPrice) {
        row.sellPrice = part.defaultSellPrice.toString()
        row.unitPrice = part.defaultSellPrice.toString()
      }
    }
    setPricingRows((prev) => [...prev, { ...row, dirty: true }])
  }

  function handleRowChange(idx: number, field: keyof PricingRowData, value: string) {
    setPricingRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value, dirty: true } : r))
  }

  async function handleRowSave(idx: number) {
    const row = pricingRows[idx]
    if (!row) return
    const sp = parseFloat(row.sellPrice)
    const qty = parseInt(row.quantity, 10) || 1
    if (isNaN(sp) || sp < 0) {
      setSnack({ open: true, msg: 'Enter valid sell price', severity: 'error' })
      return
    }

    try {
      await workshopApi.priceEstimateLine(row.lineId, {
        unitPrice: parseFloat(row.unitPrice) || sp,
        sellPrice: sp,
        quantity: qty,
        sourcingType: row.sourcingType as import('../../types/cw').CWPricingSourcingType,
        estimatedDeliveryDate: row.deliveryDate || undefined,
      })
      setPricingRows((prev) => prev.map((r, i) => i === idx ? { ...r, status: 'Priced', dirty: false } : r))
      setSnack({ open: true, msg: `${row.partName} priced`, severity: 'success' })
    } catch (err) {
      setSnack({ open: true, msg: err instanceof Error ? err.message : 'Failed to save pricing', severity: 'error' })
    }
  }

  function handleRowRemove(idx: number) {
    const row = pricingRows[idx]
    if (row.status === 'Submitted') return
    setPricingRows((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmitToAdvisor() {
    const pricedRows = pricingRows.filter((r) => r.status === 'Priced')
    if (pricedRows.length === 0) return

    // Group by appointment
    const byAppt = new Map<string, string[]>()
    for (const row of pricedRows) {
      const line = lines.find((l) => l.id === row.lineId)
      if (!line) continue
      const arr = byAppt.get(line.appointmentId) ?? []
      arr.push(row.lineId)
      byAppt.set(line.appointmentId, arr)
    }

    setSubmitting(true)
    try {
      for (const [appointmentId, lineIds] of byAppt) {
        await workshopApi.submitEstimateLines(appointmentId, lineIds)
      }
      setSnack({ open: true, msg: `${pricedRows.length} line(s) submitted to Advisor — prices locked 🔒`, severity: 'success' })
      setPricingRows([])
      await loadLines()
    } catch (err) {
      setSnack({ open: true, msg: err instanceof Error ? err.message : 'Failed to submit', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
          Estimator
        </Typography>
        <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
          Price parts submitted by engineers and send estimates to Service Advisor
        </Typography>
      </Box>

      <Snackbar open={snack.open} onClose={() => setSnack((s) => ({ ...s, open: false }))} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>

      {/* Two-panel layout */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

        {/* ── Left Panel: Parts Submitted by Engineer ── */}
        <Box sx={{ flex: { md: 4 }, minWidth: 0 }}>
          <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, p: 2.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                Parts Submitted by Engineer
              </Typography>
              <Chip label={queueCounts.All} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22, bgcolor: colors.accent.amber + '20', color: colors.accent.amber }} />
            </Stack>

            {/* Filter tabs */}
            <Tabs
              value={queueTab}
              onChange={(_e, v: QueueTab) => setQueueTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mb: 2, minHeight: 32,
                '& .MuiTab-root': { minHeight: 32, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', px: 1.5, minWidth: 0 },
                '& .Mui-selected': { color: colors.slate[900] },
                '& .MuiTabs-indicator': { bgcolor: colors.slate[900], height: 2 },
              }}
            >
              {QUEUE_TABS.map((t) => (
                <Tab key={t} label={`${t} (${queueCounts[t]})`} value={t} />
              ))}
            </Tabs>

            {/* Cards */}
            <Stack spacing={1.5} sx={{ maxHeight: { md: 'calc(100vh - 320px)' }, overflow: 'auto' }}>
              {loading ? (
                <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400], py: 4, textAlign: 'center' }}>Loading…</Typography>
              ) : error ? (
                <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>
              ) : queueLines.length === 0 ? (
                <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400], py: 4, textAlign: 'center' }}>
                  No pending parts. All submitted parts have been processed.
                </Typography>
              ) : (
                queueLines.map((line) => (
                  <PartCard key={line.id} line={line} onAddToEstimate={handleAddToEstimate} />
                ))
              )}
            </Stack>
          </Box>
        </Box>

        {/* ── Right Panel: Build Estimation ── */}
        <Box sx={{ flex: { md: 6 }, minWidth: 0 }}>
          <Stack spacing={3}>
            {/* Pricing Table */}
            <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.border.default}` }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                      Build Estimation
                    </Typography>
                    <Chip label={`${pricingRows.length} parts`} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, bgcolor: colors.accent.purple + '18', color: colors.accent.purple }} />
                  </Stack>
                </Stack>
              </Box>

              {/* Table header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 1fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr 0.4fr',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: colors.slate[50],
                  borderBottom: `1px solid ${colors.border.default}`,
                }}
              >
                {['Part Name', 'Category', 'Price', 'Qty', 'Delivery', 'Total', 'Status', ''].map((h) => (
                  <Typography key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.slate[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </Typography>
                ))}
              </Box>

              {/* Rows */}
              {pricingRows.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>
                    Click a part from the left panel to start building the estimate.
                  </Typography>
                </Box>
              ) : (
                pricingRows.map((row, idx) => (
                  <PricingRow
                    key={row.lineId}
                    row={row}
                    locked={row.status === 'Submitted'}
                    onChange={(field, value) => handleRowChange(idx, field, value)}
                    onSave={() => handleRowSave(idx)}
                    onRemove={() => handleRowRemove(idx)}
                  />
                ))
              )}
            </Box>

            {/* Summary */}
            <EstimationSummary
              rows={pricingRows}
              onSubmit={handleSubmitToAdvisor}
              submitting={submitting}
            />
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
