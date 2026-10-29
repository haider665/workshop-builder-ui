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
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Inventory,
  LocalShipping,
  Public,
  ReceiptLong,
} from '@mui/icons-material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { PartDisposition, PartLineItem } from '../../types/procurementWorkflow'

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

function LineItemRow({
  item,
  requestId,
}: {
  item: PartLineItem
  requestId: string
}) {
  const setDisposition = useMockProcurementStore((s) => s.setLineItemDisposition)
  const markCompleted = useMockProcurementStore((s) => s.markLineItemCompleted)

  const [localVendorName, setLocalVendorName] = useState(item.localVendorName ?? '')
  const [localPrice, setLocalPrice] = useState(item.localPrice ?? 0)
  const [localQty, setLocalQty] = useState(item.localQuantity ?? item.quantity)
  const [localDays, setLocalDays] = useState(item.localDeliveryDays ?? 0)
  const [foreignNote, setForeignNote] = useState(item.foreignNote ?? '')

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
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CheckCircle sx={{ color: '#059669', fontSize: '1.1rem' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
            {item.partName}
          </Typography>
          {item.partNumber ? (
            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
              #{item.partNumber}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
            × {item.quantity}
          </Typography>
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
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.slate[900] }}>
            {item.partName}
          </Typography>
          {item.partNumber ? (
            <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
              #{item.partNumber}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
            Qty: {item.quantity}
          </Typography>
          <TextField
            select
            size="small"
            value={item.disposition}
            onChange={(e) =>
              setDisposition(requestId, item.id, e.target.value as PartDisposition)
            }
            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }}
          >
            {DISPOSITION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {item.disposition === 'in_stock' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Inventory />}
            onClick={() => markCompleted(requestId, item.id)}
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

        {item.disposition === 'local_vendor' && (
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
              disabled={!localVendorName.trim() || !localPrice}
              onClick={() => {
                setDisposition(requestId, item.id, 'local_vendor', {
                  localVendorName: localVendorName.trim(),
                  localPrice,
                  localQuantity: localQty,
                  localDeliveryDays: localDays,
                })
                markCompleted(requestId, item.id)
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

        {item.disposition === 'foreign_vendor' && (
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
              disabled={!foreignNote.trim()}
              onClick={() => {
                setDisposition(requestId, item.id, 'foreign_vendor', {
                  foreignNote: foreignNote.trim(),
                })
                markCompleted(requestId, item.id)
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

export function MockPartRequestsPage() {
  const navigate = useNavigate()
  const partRequests = useMockProcurementStore((s) => s.partRequests)
  const spawnApprovals = useMockProcurementStore((s) => s.spawnCustomerApprovals)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [snack, setSnack] = useState<string | null>(null)

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
          <Alert onClose={() => setSnack(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
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
                      <LineItemRow key={li.id} item={li} requestId={req.id} />
                    ))}

                    {allCompleted && hasNonStockCompleted ? (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => {
                          spawnApprovals(req.id)
                          setSnack(`Customer approvals created for ${req.requestNumber}`)
                        }}
                        sx={{
                          mt: 1,
                          bgcolor: colors.slate[900],
                          fontWeight: 700,
                          borderRadius: radii.sm,
                          textTransform: 'none',
                          '&:hover': { bgcolor: colors.slate[800] },
                        }}
                      >
                        Send for Customer Approval
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
