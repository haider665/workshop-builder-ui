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
import {Image as ImageIcon, Search, Send,} from '@mui/icons-material'
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

function PartCard({ line, onSelect, active }: { line: CWEstimateLine; onSelect: (line: CWEstimateLine) => void; active: boolean }) {
  const isRequested = line.status === 'Requested'
  const isIdentified = line.status === 'Identified'
  const canAdd = isRequested || isIdentified

  return (
    <Box
      sx={{
        bgcolor: active ? colors.accent.blue + '08' : colors.bg.card,
        border: `1px solid ${active ? colors.accent.blue : colors.border.default}`,
        borderRadius: radii.md,
        boxShadow: active ? `0 0 0 2px ${colors.accent.blue}30` : shadows.card,
        p: 2,
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        cursor: canAdd ? 'pointer' : 'default',
        '&:hover': canAdd ? { boxShadow: shadows.elevated, borderColor: colors.accent.blue } : {},
      }}
      onClick={() => canAdd && onSelect(line)}
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

/* ─────────────────────── Pricing State ─────────────────────────── */

type PricingData = {
  lineId: string
  appointmentId: string
  partName: string
  partNumber?: string
  description: string
  sourcingType: string
  sellPrice: string
  quantity: string
  deliveryDate: string
  inStock: boolean
}

/* ─────────────────────── Main Page ─────────────────────────── */

export function EstimatorPage() {
  const [lines, setLines] = useState<CWEstimateLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueTab, setQueueTab] = useState<QueueTab>('All')
  const [activePricing, setActivePricing] = useState<PricingData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

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

  /* ── Queue ── */

  const queueLines = useMemo(() => {
    const available = lines.filter((l) => (l.status === 'Requested' || l.status === 'Identified'))
    if (queueTab === 'All') return available
    return available.filter((l) => l.status === queueTab)
  }, [lines, queueTab])

  const queueCounts = useMemo(() => {
    const available = lines.filter((l) => (l.status === 'Requested' || l.status === 'Identified'))
    return {
      All: available.length,
      Requested: available.filter((l) => l.status === 'Requested').length,
      Identified: available.filter((l) => l.status === 'Identified').length,
    }
  }, [lines])

  /* ── Select Part ── */

  function handleSelectPart(line: CWEstimateLine) {
    let sellPrice = ''
    if (line.partId) {
      const part = partsMapRef.current.get(line.partId)
      if (part?.defaultSellPrice) {
        sellPrice = part.defaultSellPrice.toString()
      }
    }
    setActivePricing({
      lineId: line.id,
      appointmentId: line.appointmentId,
      partName: line.partName ?? line.description,
      partNumber: line.partNumber,
      description: line.description,
      sourcingType: line.sourcingType ?? 'OEM',
      sellPrice: line.sellPrice?.toString() ?? sellPrice,
      quantity: line.quantity?.toString() ?? '1',
      deliveryDate: line.estimatedDeliveryDate ?? '',
      inStock: line.inStock,
    })
  }

  function updateField(field: keyof PricingData, value: string) {
    setActivePricing((prev) => prev ? { ...prev, [field]: value } : null)
  }

  /* ── Price & Send ── */

  async function handleSaveAndSend() {
    if (!activePricing) return
    const sp = parseFloat(activePricing.sellPrice)
    const qty = parseInt(activePricing.quantity, 10) || 1
    if (isNaN(sp) || sp <= 0) {
      setSnack({ open: true, msg: 'Enter valid sell price', severity: 'error' })
      return
    }

    setSubmitting(true)
    try {
      // Price the line
      await workshopApi.priceEstimateLine(activePricing.lineId, {
        unitPrice: sp,
        sellPrice: sp,
        quantity: qty,
        sourcingType: activePricing.sourcingType as import('../../types/cw').CWPricingSourcingType,
        estimatedDeliveryDate: activePricing.deliveryDate || undefined,
      })
      // Submit to advisor
      await workshopApi.submitEstimateLines(activePricing.appointmentId, [activePricing.lineId])

      setSnack({ open: true, msg: `${activePricing.partName} — priced & sent to Advisor ✓`, severity: 'success' })
      setActivePricing(null)
      await loadLines()
    } catch (err) {
      setSnack({ open: true, msg: err instanceof Error ? err.message : 'Failed to save & send', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const total = activePricing ? (parseFloat(activePricing.sellPrice) || 0) * (parseInt(activePricing.quantity, 10) || 1) : 0
  const canSend = activePricing && parseFloat(activePricing.sellPrice) > 0

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

        {/* ── Left Panel: Parts Queue ── */}
        <Box sx={{ flex: { md: 4 }, minWidth: 0 }}>
          <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, p: 2.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                Parts Queue
              </Typography>
              <Chip label={queueCounts.All} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22, bgcolor: colors.accent.amber + '20', color: colors.accent.amber }} />
            </Stack>

            <Tabs value={queueTab} onChange={(_, v) => setQueueTab(v as QueueTab)} sx={{ minHeight: 32, mb: 2, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' } }}>
              {QUEUE_TABS.map((t) => (
                <Tab key={t} label={`${t} (${queueCounts[t]})`} value={t} />
              ))}
            </Tabs>

            <Stack spacing={1.5} sx={{ maxHeight: 540, overflowY: 'auto' }}>
              {loading ? (
                <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem', textAlign: 'center', py: 3 }}>Loading…</Typography>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : queueLines.length === 0 ? (
                <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem', textAlign: 'center', py: 3 }}>No pending parts</Typography>
              ) : (
                queueLines.map((line) => (
                  <PartCard key={line.id} line={line} onSelect={handleSelectPart} active={activePricing?.lineId === line.id} />
                ))
              )}
            </Stack>
          </Box>
        </Box>

        {/* ── Right Panel: Price & Send ── */}
        <Box sx={{ flex: { md: 6 }, minWidth: 0 }}>
          <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.border.default}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                Price & Send to Advisor
              </Typography>
            </Box>

            {!activePricing ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.9rem', color: colors.slate[400], mb: 0.5 }}>
                  Select a part from the left panel to price it.
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: colors.slate[300] }}>
                  One part at a time — Price → Send → Next.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 3 }}>
                {/* Part Info */}
                <Box sx={{ mb: 3, pb: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: colors.slate[900], mb: 0.25 }}>
                    {activePricing.partName}
                  </Typography>
                  {activePricing.partNumber && (
                    <Typography sx={{ fontSize: '0.78rem', color: colors.slate[400], fontFamily: 'monospace' }}>
                      #{activePricing.partNumber}
                    </Typography>
                  )}
                  {activePricing.description !== activePricing.partName && (
                    <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], mt: 0.5 }}>
                      {activePricing.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {activePricing.inStock && (
                      <Chip label="In Stock" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: `${colors.status.success}18`, color: colors.status.success }} />
                    )}
                    <Chip
                      label={`Appt: ${activePricing.appointmentId.length > 10 ? activePricing.appointmentId.slice(0, 10) + '…' : activePricing.appointmentId}`}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.65rem', fontFamily: 'monospace', bgcolor: colors.bg.subtle }}
                    />
                  </Stack>
                </Box>

                {/* Pricing Form */}
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={2}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <Select
                        value={activePricing.sourcingType}
                        onChange={(e) => updateField('sourcingType', e.target.value)}
                        sx={{ fontSize: '0.85rem' }}
                      >
                        {SOURCING_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                      <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400], mt: 0.5 }}>Sourcing Type</Typography>
                    </FormControl>

                    <TextField
                      size="small"
                      label="Quantity"
                      type="number"
                      value={activePricing.quantity}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      sx={{ flex: 0.6 }}
                      slotProps={{ input: { inputProps: { min: 1 } } }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      label="Sell Price (৳)"
                      type="number"
                      required
                      value={activePricing.sellPrice}
                      onChange={(e) => updateField('sellPrice', e.target.value)}
                      error={activePricing.sellPrice !== '' && parseFloat(activePricing.sellPrice) <= 0}
                      helperText={activePricing.sellPrice !== '' && parseFloat(activePricing.sellPrice) <= 0 ? 'Must be > 0' : ''}
                      sx={{ flex: 1 }}
                      slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                    />

                    <TextField
                      size="small"
                      label="Delivery Date"
                      type="date"
                      value={activePricing.deliveryDate}
                      onChange={(e) => updateField('deliveryDate', e.target.value)}
                      sx={{ flex: 1 }}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Stack>

                  {/* Total */}
                  <Box sx={{ bgcolor: colors.bg.subtle, borderRadius: radii.md, p: 2, border: `1px solid ${colors.border.default}` }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>Total</Typography>
                      <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: colors.slate[900] }}>
                        {fmtBDT(total)}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={() => setActivePricing(null)}
                      disabled={submitting}
                      sx={{
                        flex: 1,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: radii.sm,
                        color: colors.slate[600],
                        borderColor: colors.border.default,
                        '&:hover': { bgcolor: colors.bg.subtle, borderColor: colors.slate[400] },
                      }}
                    >
                      Skip
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Send sx={{ fontSize: 14 }} />}
                      disabled={!canSend || submitting}
                      onClick={handleSaveAndSend}
                      sx={{
                        flex: 2,
                        fontWeight: 800,
                        textTransform: 'none',
                        borderRadius: radii.sm,
                        bgcolor: colors.slate[900],
                        '&:hover': { bgcolor: colors.slate[800] },
                        py: 1.25,
                      }}
                    >
                      {submitting ? 'Sending…' : 'Price & Send to Advisor'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
