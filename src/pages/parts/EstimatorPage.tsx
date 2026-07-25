import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {Send} from '@mui/icons-material'
import {colors, pageLayout, radii, shadows} from '../../theme/tokens'
import {workshopApi} from '../../services/workshopApi'
import {useCwStore} from '../../store/cwStore'
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

function statusBg(status: CWEstimateLineStatus) {
  const c = STATUS_COLOR[status] ?? colors.slate[400]
  return `${c}18`
}

function statusFg(status: CWEstimateLineStatus) {
  return STATUS_COLOR[status] ?? colors.slate[600]
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
  remarks: string
}

/* ─────────────────────── Main Page ─────────────────────────── */

export function EstimatorPage() {
  const [lines, setLines] = useState<CWEstimateLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueTab, setQueueTab] = useState<QueueTab>('All')
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null)
  const [pricingMap, setPricingMap] = useState<Map<string, PricingData>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  const appointments = useCwStore(s => s.appointments)
  const vehicles = useCwStore(s => s.vehicles)
  const customers = useCwStore(s => s.customers)

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

  const groupedLines = useMemo(() => {
    const map = new Map<string, typeof queueLines>()
    for (const line of queueLines) {
      const key = line.appointmentId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(line)
    }
    return [...map.entries()]
  }, [queueLines])

  /* ── Select Appointment ── */

  function handleSelectAppointment(apptId: string) {
    setSelectedApptId(apptId)
    const apptLines = queueLines.filter(l => l.appointmentId === apptId)
    const newMap = new Map<string, PricingData>()
    for (const line of apptLines) {
      let sellPrice = ''
      if (line.partId) {
        const part = partsMapRef.current.get(line.partId)
        if (part?.defaultSellPrice) sellPrice = part.defaultSellPrice.toString()
      }
      newMap.set(line.id, {
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
        remarks: line.remarks ?? '',
      })
    }
    setPricingMap(newMap)
  }

  function updateLineField(lineId: string, field: keyof PricingData, value: string) {
    setPricingMap(prev => {
      const next = new Map(prev)
      const item = next.get(lineId)
      if (item) next.set(lineId, { ...item, [field]: value })
      return next
    })
  }

  /* ── Price & Send All ── */

  const selectedLines = useMemo(() => {
    if (!selectedApptId) return []
    return queueLines.filter(l => l.appointmentId === selectedApptId)
  }, [selectedApptId, queueLines])

  const allPriced = useMemo(() => {
    if (pricingMap.size === 0) return false
    return [...pricingMap.values()].every(p => parseFloat(p.sellPrice) > 0 && p.deliveryDate !== '')
  }, [pricingMap])

  const grandTotal = useMemo(() => {
    let sum = 0
    for (const p of pricingMap.values()) {
      sum += (parseFloat(p.sellPrice) || 0) * (parseInt(p.quantity, 10) || 1)
    }
    return sum
  }, [pricingMap])

  async function handleSendAll() {
    if (!selectedApptId || !allPriced) return
    setSubmitting(true)
    try {
      const lineIds: string[] = []
      for (const [lineId, pricing] of pricingMap.entries()) {
        const sp = parseFloat(pricing.sellPrice)
        const qty = parseInt(pricing.quantity, 10) || 1
        await workshopApi.priceEstimateLine(lineId, {
          unitPrice: sp,
          sellPrice: sp,
          quantity: qty,
          sourcingType: pricing.sourcingType as import('../../types/cw').CWPricingSourcingType,
          estimatedDeliveryDate: pricing.deliveryDate || undefined,
          remarks: pricing.remarks.trim() || undefined,
        })
        lineIds.push(lineId)
      }
      await workshopApi.submitEstimateLines(selectedApptId, lineIds)
      setSnack({ open: true, msg: `${lineIds.length} part${lineIds.length > 1 ? 's' : ''} priced & sent to Advisor ✓`, severity: 'success' })
      setSelectedApptId(null)
      setPricingMap(new Map())
      await loadLines()
    } catch (err) {
      setSnack({ open: true, msg: err instanceof Error ? err.message : 'Failed to save & send', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function getApptDisplay(apptId: string) {
    const appt = appointments.find(a => a.id === apptId)
    const vehicle = vehicles.find(v => v.id === appt?.vehicleId)
    const customer = customers.find(c => c.id === appt?.customerId)
    return {
      vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''} · ${vehicle.registrationNo}`.trim() : 'Unknown Vehicle',
      customer: customer?.fullName ?? 'Unknown Customer',
    }
  }

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
          Estimator
        </Typography>
        <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
          Price parts per appointment and send estimates to Service Advisor
        </Typography>
      </Box>

      <Snackbar open={snack.open} onClose={() => setSnack((s) => ({ ...s, open: false }))} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

        {/* ── Left Panel: Appointment Queue ── */}
        <Box sx={{ flex: { md: 4 }, minWidth: 0 }}>
          <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, p: 2.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                Appointments
              </Typography>
              <Chip label={groupedLines.length} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22, bgcolor: colors.accent.amber + '20', color: colors.accent.amber }} />
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
              ) : groupedLines.length === 0 ? (
                <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem', textAlign: 'center', py: 3 }}>No pending parts</Typography>
              ) : (
                groupedLines.map(([apptId, linesInGroup]) => {
                  const display = getApptDisplay(apptId)
                  const isSelected = selectedApptId === apptId

                  return (
                    <Box
                      key={apptId}
                      onClick={() => handleSelectAppointment(apptId)}
                      sx={{
                        p: 2,
                        borderRadius: radii.sm,
                        border: `1.5px solid ${isSelected ? colors.accent.blue : colors.border.default}`,
                        bgcolor: isSelected ? `${colors.accent.blue}08` : colors.bg.card,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: colors.accent.blue, bgcolor: `${colors.accent.blue}05` },
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[900] }}>
                        {display.vehicle}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500], mt: 0.25 }}>
                        {display.customer}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={`${linesInGroup.length} part${linesInGroup.length > 1 ? 's' : ''}`}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20, bgcolor: colors.accent.amber + '18', color: colors.accent.amber }}
                        />
                        {linesInGroup.map(l => (
                          <Chip
                            key={l.id}
                            label={l.partName ?? l.description}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20, bgcolor: statusBg(l.status), color: statusFg(l.status), maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )
                })
              )}
            </Stack>
          </Box>
        </Box>

        {/* ── Right Panel: Price All Parts for Appointment ── */}
        <Box sx={{ flex: { md: 6 }, minWidth: 0 }}>
          <Box sx={{ bgcolor: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.md, boxShadow: shadows.card, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.border.default}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                Price & Send to Advisor
              </Typography>
            </Box>

            {!selectedApptId || selectedLines.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.9rem', color: colors.slate[400], mb: 0.5 }}>
                  Select an appointment from the left panel
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: colors.slate[300] }}>
                  Price all parts for the appointment, then send to Advisor.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2.5 }}>
                {/* Appointment Header */}
                {(() => {
                  const display = getApptDisplay(selectedApptId)
                  return (
                    <Box sx={{ mb: 2.5, pb: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: colors.slate[900] }}>
                        {display.vehicle}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
                        {display.customer} · {selectedLines.length} part{selectedLines.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  )
                })()}

                {/* Per-line pricing */}
                <Stack spacing={2.5}>
                  {selectedLines.map((line, idx) => {
                    const pricing = pricingMap.get(line.id)
                    if (!pricing) return null
                    const lineTotal = (parseFloat(pricing.sellPrice) || 0) * (parseInt(pricing.quantity, 10) || 1)

                    return (
                      <Box
                        key={line.id}
                        sx={{ p: 2, border: `1px solid ${colors.border.default}`, borderRadius: radii.sm, bgcolor: colors.bg.subtle }}
                      >
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: colors.slate[900] }}>
                              {idx + 1}. {pricing.partName}
                            </Typography>
                            {pricing.partNumber && (
                              <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400], fontFamily: 'monospace' }}>
                                #{pricing.partNumber}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            {pricing.inStock && (
                              <Chip label="In Stock" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, bgcolor: `${colors.status.success}18`, color: colors.status.success }} />
                            )}
                            <Chip
                              label={fmtBDT(lineTotal)}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22, bgcolor: lineTotal > 0 ? `${colors.accent.blue}15` : colors.slate[100], color: lineTotal > 0 ? colors.accent.blue : colors.slate[400] }}
                            />
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1.5}>
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <Select
                              value={pricing.sourcingType}
                              onChange={(e) => updateLineField(line.id, 'sourcingType', e.target.value)}
                              sx={{ fontSize: '0.8rem' }}
                            >
                              {SOURCING_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: '0.8rem' }}>{t}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <TextField
                            size="small" label="Qty" type="number"
                            value={pricing.quantity}
                            onChange={(e) => updateLineField(line.id, 'quantity', e.target.value)}
                            sx={{ width: 70 }}
                            slotProps={{ input: { inputProps: { min: 1 } } }}
                          />
                          <TextField
                            size="small" label="Sell Price (৳)" type="number" required
                            value={pricing.sellPrice}
                            onChange={(e) => updateLineField(line.id, 'sellPrice', e.target.value)}
                            error={pricing.sellPrice !== '' && parseFloat(pricing.sellPrice) <= 0}
                            sx={{ flex: 1 }}
                            slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                          />
                          <TextField
                            size="small" label="Delivery" type="date" required
                            value={pricing.deliveryDate}
                            onChange={(e) => updateLineField(line.id, 'deliveryDate', e.target.value)}
                            error={pricing.deliveryDate === ''}
                            sx={{ width: 140 }}
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>

                {/* Grand Total */}
                <Box sx={{ bgcolor: colors.slate[900], borderRadius: radii.md, p: 2, mt: 3 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.9rem', color: colors.slate[300] }}>
                      Grand Total ({selectedLines.length} part{selectedLines.length > 1 ? 's' : ''})
                    </Typography>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                      {fmtBDT(grandTotal)}
                    </Typography>
                  </Stack>
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                  <Button
                    variant="outlined"
                    onClick={() => { setSelectedApptId(null); setPricingMap(new Map()) }}
                    disabled={submitting}
                    sx={{
                      flex: 1, fontWeight: 700, textTransform: 'none', borderRadius: radii.sm,
                      color: colors.slate[600], borderColor: colors.border.default,
                      '&:hover': { bgcolor: colors.bg.subtle, borderColor: colors.slate[400] },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Send sx={{ fontSize: 14 }} />}
                    disabled={!allPriced || submitting}
                    onClick={handleSendAll}
                    sx={{
                      flex: 2, fontWeight: 800, textTransform: 'none', borderRadius: radii.sm,
                      bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] }, py: 1.25,
                    }}
                  >
                    {submitting ? 'Sending…' : `Price & Send All (${selectedLines.length})`}
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
