import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import {
  Check,
  Close,
  HourglassBottom,
  Image as ImageIcon,
  Send,
} from '@mui/icons-material'
import { colors, pageLayout, shadows, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import type { CWEstimateLine, CWEstimateLineStatus } from '../../types/cw'

/* ─────────────────────── Helpers ─────────────────────────── */

function fmtBDT(n?: number) {
  if (n == null) return '—'
  return `৳${n.toLocaleString()}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

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

function statusBg(status: CWEstimateLineStatus) {
  const c = STATUS_COLOR[status] ?? colors.slate[400]
  return `${c}18` // 10% opacity hex suffix
}

function statusFg(status: CWEstimateLineStatus) {
  return STATUS_COLOR[status] ?? colors.slate[600]
}

const FILTER_TABS = ['All', 'Requested', 'Identified', 'Priced', 'Submitted'] as const
type FilterTab = (typeof FILTER_TABS)[number]

/* ─────────────────────── Demo Data ─────────────────────────── */

const DEMO_LINES: CWEstimateLine[] = [
  { id: 'el-1', appointmentId: 'ap-001', description: 'Front brake pads worn beyond limit', requestedByUserId: 'se-1', quantity: 1, status: 'Requested', inStock: false, advanceRequired: false, createdAt: '2025-07-10T09:00:00Z', updatedAt: '2025-07-10T09:00:00Z' },
  { id: 'el-2', appointmentId: 'ap-001', description: 'Oil filter needs replacement', requestedByUserId: 'se-1', quantity: 1, partId: 'p-1', partNumber: 'AP-2024-001', partName: 'Oil Filter Premium', status: 'Identified', inStock: true, advanceRequired: false, createdAt: '2025-07-10T09:30:00Z', updatedAt: '2025-07-10T10:00:00Z' },
  { id: 'el-3', appointmentId: 'ap-002', description: 'Alternator not charging properly', requestedByUserId: 'se-2', quantity: 1, partId: 'p-5', partNumber: 'AP-2024-005', partName: 'Alternator', vendorId: 'v-1', unitPrice: 5500, sellPrice: 7500, sourcingType: 'Genuine', status: 'Priced', inStock: true, advanceRequired: false, createdAt: '2025-07-09T14:00:00Z', updatedAt: '2025-07-10T11:00:00Z' },
  { id: 'el-4', appointmentId: 'ap-002', description: 'Dashboard cover cracked', requestedByUserId: 'se-2', quantity: 1, partId: 'p-10', partNumber: 'AP-2024-010', partName: 'Dashboard Cover', vendorId: 'v-3', unitPrice: 3800, sellPrice: 5200, sourcingType: 'Aftermarket', status: 'Submitted', submittedAt: '2025-07-10T12:00:00Z', inStock: false, estimatedDeliveryDate: '2025-07-20', advanceRequired: true, createdAt: '2025-07-09T14:30:00Z', updatedAt: '2025-07-10T12:00:00Z' },
  { id: 'el-5', appointmentId: 'ap-003', description: 'Radiator leaking coolant', requestedByUserId: 'se-1', quantity: 1, partId: 'p-6', partNumber: 'AP-2024-006', partName: 'Radiator Core', vendorId: 'v-2', unitPrice: 8500, sellPrice: 12000, sourcingType: 'OEM', status: 'Approved', approvedAt: '2025-07-10T15:00:00Z', inStock: false, advanceRequired: true, createdAt: '2025-07-08T10:00:00Z', updatedAt: '2025-07-10T15:00:00Z' },
  { id: 'el-6', appointmentId: 'ap-003', description: 'Spark plugs fouled', requestedByUserId: 'se-1', quantity: 4, partId: 'p-4', partNumber: 'SP-NGK-2847', partName: 'Spark Plug NGK', vendorId: 'v-1', unitPrice: 400, sellPrice: 600, sourcingType: 'Aftermarket', status: 'Declined', declinedAt: '2025-07-10T15:30:00Z', inStock: true, advanceRequired: false, createdAt: '2025-07-08T10:30:00Z', updatedAt: '2025-07-10T15:30:00Z' },
]

/* ─────────────────────── Requirement Card ─────────────────────────── */

function RequirementCard({ line }: { line: CWEstimateLine }) {
  return (
    <Box
      sx={{
        bgcolor: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radii.md,
        boxShadow: shadows.card,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: shadows.elevated },
      }}
    >
      {/* Top row: status + appointment */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip
          label={line.status}
          size="small"
          sx={{
            bgcolor: statusBg(line.status),
            color: statusFg(line.status),
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 24,
            borderRadius: radii.sm,
          }}
        />
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: colors.accent.blue,
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {line.appointmentId}
        </Typography>
      </Stack>

      {/* Description */}
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[800], lineHeight: 1.4 }}>
        {line.description}
      </Typography>

      {/* Part info (if identified) */}
      {line.partName && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
            {line.partNumber}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[700], fontWeight: 600 }}>
            {line.partName}
          </Typography>
          {line.sourcingType && (
            <Chip label={line.sourcingType} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: colors.bg.subtle }} />
          )}
        </Stack>
      )}

      {/* Pricing row */}
      {line.sellPrice != null && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
            Unit: {fmtBDT(line.unitPrice)}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: colors.slate[900] }}>
            Sell: {fmtBDT(line.sellPrice)}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
            Qty: {line.quantity}
          </Typography>
        </Stack>
      )}

      {/* Media thumbnails placeholder */}
      {line.mediaUrls && line.mediaUrls.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <ImageIcon sx={{ fontSize: 16, color: colors.slate[400] }} />
          <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>
            {line.mediaUrls.length} attachment{line.mediaUrls.length > 1 ? 's' : ''}
          </Typography>
        </Stack>
      )}

      {/* Footer: requester + date + actions */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>
            By: {line.requestedByUserId}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>
            {fmtDate(line.createdAt)}
          </Typography>
          {line.inStock && (
            <Chip label="In Stock" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: `${colors.status.success}18`, color: colors.status.success, fontWeight: 700 }} />
          )}
        </Stack>
        <ActionButton status={line.status} />
      </Stack>
    </Box>
  )
}

/* ─────────────────────── Action Button ─────────────────────────── */

function ActionButton({ status }: { status: CWEstimateLineStatus }) {
  switch (status) {
    case 'Requested':
      return (
        <Button
          size="small"
          variant="contained"
          sx={{ bgcolor: colors.accent.blue, fontSize: '0.7rem', fontWeight: 700, borderRadius: radii.sm, px: 1.5, py: 0.25, minWidth: 0, textTransform: 'none', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Identify
        </Button>
      )
    case 'Identified':
      return (
        <Button
          size="small"
          variant="contained"
          sx={{ bgcolor: colors.accent.purple, fontSize: '0.7rem', fontWeight: 700, borderRadius: radii.sm, px: 1.5, py: 0.25, minWidth: 0, textTransform: 'none', '&:hover': { bgcolor: '#7c3aed' } }}
        >
          Price
        </Button>
      )
    case 'Priced':
      return (
        <Chip
          label="Ready to Submit"
          size="small"
          sx={{ fontSize: '0.65rem', fontWeight: 700, height: 22, bgcolor: `${colors.accent.purple}18`, color: colors.accent.purple }}
        />
      )
    case 'Submitted':
      return (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <HourglassBottom sx={{ fontSize: 14, color: colors.accent.orange }} />
          <Typography sx={{ fontSize: '0.7rem', color: colors.accent.orange, fontWeight: 700 }}>Awaiting SA</Typography>
        </Stack>
      )
    case 'Approved':
      return <Check sx={{ fontSize: 20, color: colors.status.success }} />
    case 'Declined':
      return <Close sx={{ fontSize: 20, color: colors.status.error }} />
    default:
      return null
  }
}

/* ─────────────────────── Estimate Summary Panel ─────────────────────────── */

function EstimateSummary({ lines }: { lines: CWEstimateLine[] }) {
  const pricedLines = useMemo(() => lines.filter((l) => l.status === 'Priced'), [lines])

  const grouped = useMemo(() => {
    const map = new Map<string, CWEstimateLine[]>()
    for (const l of pricedLines) {
      const arr = map.get(l.appointmentId) ?? []
      arr.push(l)
      map.set(l.appointmentId, arr)
    }
    return map
  }, [pricedLines])

  const total = useMemo(
    () => pricedLines.reduce((sum, l) => sum + (l.sellPrice ?? 0) * l.quantity, 0),
    [pricedLines],
  )

  return (
    <Box
      sx={{
        bgcolor: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radii.md,
        boxShadow: shadows.card,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: 'fit-content',
        position: { md: 'sticky' },
        top: { md: 24 },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: colors.slate[900] }}>
        Estimate Summary
      </Typography>

      {pricedLines.length === 0 ? (
        <Typography sx={{ fontSize: '0.8rem', color: colors.slate[400], py: 4, textAlign: 'center' }}>
          No priced lines yet. Identify and price parts from the queue.
        </Typography>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([apptId, items]) => (
            <Box key={apptId}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: colors.accent.blue, mb: 1 }}>
                {apptId}
              </Typography>
              {items.map((item) => (
                <Stack key={item.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: colors.slate[800], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.partName ?? item.description}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>
                      {item.quantity} × {fmtBDT(item.sellPrice)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: colors.slate[900], ml: 1, flexShrink: 0 }}>
                    {fmtBDT((item.sellPrice ?? 0) * item.quantity)}
                  </Typography>
                </Stack>
              ))}
              <Divider sx={{ mt: 0.5 }} />
            </Box>
          ))}

          {/* Total */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: colors.slate[900] }}>
              Total
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: colors.slate[900] }}>
              {fmtBDT(total)}
            </Typography>
          </Stack>

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            startIcon={<Send sx={{ fontSize: 16 }} />}
            disabled={pricedLines.length === 0}
            sx={{
              bgcolor: colors.slate[900],
              fontWeight: 700,
              borderRadius: radii.sm,
              textTransform: 'none',
              mt: 1,
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            Submit to SA
          </Button>
        </>
      )}
    </Box>
  )
}

/* ─────────────────────── Main Page ─────────────────────────── */

export function EstimatorPage() {
  const storeLines = useCwStore((s) => s.estimateLines)
  const [tab, setTab] = useState<FilterTab>('All')

  // Merge demo lines with real store lines (demo lines won't duplicate if store is empty)
  const allLines = useMemo(() => {
    const storeIds = new Set(storeLines.map((l) => l.id))
    const deduped = DEMO_LINES.filter((d) => !storeIds.has(d.id))
    return [...deduped, ...storeLines]
  }, [storeLines])

  const filteredLines = useMemo(() => {
    if (tab === 'All') return allLines
    return allLines.filter((l) => l.status === tab)
  }, [allLines, tab])

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allLines.length }
    for (const l of allLines) {
      c[l.status] = (c[l.status] ?? 0) + 1
    }
    return c
  }, [allLines])

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.5rem', md: '1.85rem' },
            color: colors.slate[900],
            letterSpacing: '-0.02em',
          }}
        >
          Estimator
        </Typography>
        <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
          Manage part requirements and build estimates
        </Typography>
      </Box>

      {/* Two-panel layout */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Left: Requirements Queue (70%) */}
        <Box sx={{ flex: { md: 7 }, minWidth: 0 }}>
          {/* Section title + count */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
              Incoming Requirements
            </Typography>
            <Chip
              label={allLines.length}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.7rem',
                height: 22,
                bgcolor: colors.slate[100],
                color: colors.slate[600],
              }}
            />
          </Stack>

          {/* Filter tabs */}
          <Tabs
            value={tab}
            onChange={(_e, v: FilterTab) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 2,
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                px: 1.5,
                minWidth: 0,
              },
              '& .Mui-selected': { color: colors.slate[900] },
              '& .MuiTabs-indicator': { bgcolor: colors.slate[900], height: 2 },
            }}
          >
            {FILTER_TABS.map((t) => (
              <Tab
                key={t}
                label={`${t}${counts[t] ? ` (${counts[t]})` : ''}`}
                value={t}
              />
            ))}
          </Tabs>

          {/* Cards */}
          <Stack spacing={1.5}>
            {filteredLines.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>
                  No requirements matching "{tab}"
                </Typography>
              </Box>
            ) : (
              filteredLines.map((line) => <RequirementCard key={line.id} line={line} />)
            )}
          </Stack>
        </Box>

        {/* Right: Estimate Summary (30%) */}
        <Box sx={{ flex: { md: 3 }, minWidth: { md: 280 } }}>
          <EstimateSummary lines={allLines} />
        </Box>
      </Stack>
    </Box>
  )
}
