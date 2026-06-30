import {
  Alert,
  Box,
  Button,
  Chip,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Inventory2 } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPartRequest, CWPartRequestStatus } from '../../types/cw'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Constants ─────────────────────────── */

const STATUS_FILTERS: (CWPartRequestStatus | 'All')[] = ['All', 'Requested', 'Labeled', 'Fulfilled', 'Rejected']
const STATUS_COLORS: Record<CWPartRequestStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Requested: 'warning',
  Labeled: 'info',
  Fulfilled: 'success',
  Rejected: 'error',
}

/* ─────────────────────── Component ─────────────────────────── */

export function PartRequestsPage() {
  const partRequests = useCwStore((s) => s.partRequests)
  const labelPartRequest = useCwStore((s) => s.labelPartRequest)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const [statusFilter, setStatusFilter] = useState<CWPartRequestStatus | 'All'>('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [partNumber, setPartNumber] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const filtered = useMemo(() => {
    const list = statusFilter === 'All' ? partRequests : partRequests.filter((pr) => pr.status === statusFilter)
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [partRequests, statusFilter])

  /* ── Helpers ── */

  function getApptInfo(appointmentId: string, concernItemId?: string) {
    const appt = appointments.find((a) => a.id === appointmentId)
    if (!appt) return { vehicle: '—', customer: '—', concern: '—' }
    const vehicle = vehicles.find((v) => v.id === appt.vehicleId)
    const customer = customers.find((c) => c.id === appt.customerId)
    const concern = concernItemId ? appt.concernItems.find((ci) => ci.id === concernItemId) : null
    return {
      vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''} · ${vehicle.registrationNo}`.trim() : '—',
      customer: customer?.fullName ?? '—',
      concern: concern?.concernName ?? '—',
    }
  }

  function startEdit(prId: string) {
    const pr = partRequests.find((p) => p.id === prId)
    if (!pr) return
    setEditingId(prId)
    setPartNumber(pr.partNumber ?? '')
    setPrice(typeof pr.price === 'number' ? String(pr.price) : '')
    setQuantity(typeof pr.quantity === 'number' ? String(pr.quantity) : '1')
    setDeliveryDate(pr.deliveryDate ?? '')
  }

  function submitLabel() {
    if (!editingId) return
    labelPartRequest(editingId, {
      partNumber: partNumber.trim(),
      price: Number(price) || 0,
      quantity: Number(quantity) || 1,
      deliveryDate: deliveryDate || undefined,
      labeledBy: 'Admin',
    })
    setEditingId(null)
    setSuccessMsg('Part request labeled successfully')
    setSuccessOpen(true)
  }

  function rejectRequest(prId: string) {
    labelPartRequest(prId, {
      partNumber: '',
      price: 0,
      quantity: 0,
      labeledBy: 'Admin',
      status: 'Rejected',
    })
    setSuccessMsg('Part request rejected')
    setSuccessOpen(true)
  }

  /* ── Table Columns ── */

  const columns: Column<CWPartRequest>[] = [
    {
      key: 'partName',
      header: 'Part Name',
      minWidth: 160,
      render: (pr) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {pr.partName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
            by {pr.requestedBy}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'concern',
      header: 'Concern',
      render: (pr) => {
        const info = getApptInfo(pr.appointmentId, pr.concernItemId)
        return (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>
            {info.concern}
          </Typography>
        )
      },
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (pr) => {
        const info = getApptInfo(pr.appointmentId, pr.concernItemId)
        return (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>
            {info.vehicle}
          </Typography>
        )
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (pr) => {
        const info = getApptInfo(pr.appointmentId, pr.concernItemId)
        return (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>
            {info.customer}
          </Typography>
        )
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <TextField size="small" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} sx={{ width: 70 }} />
          )
        }
        return <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>{pr.quantity ?? 1}</Typography>
      },
    },
    {
      key: 'partNumber',
      header: 'Part #',
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <TextField size="small" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Part #" sx={{ width: 120 }} />
          )
        }
        return <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>{pr.partNumber || '—'}</Typography>
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <TextField size="small" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" sx={{ width: 100 }} />
          )
        }
        return (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>
            {typeof pr.price === 'number' ? `BDT ${pr.price}` : '—'}
          </Typography>
        )
      },
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <TextField
              size="small"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 140 }}
            />
          )
        }
        return <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>{pr.deliveryDate || '—'}</Typography>
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (pr) => (
        <Chip size="small" label={pr.status} color={STATUS_COLORS[pr.status]} sx={{ fontWeight: 700 }} />
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (pr.status === 'Requested' && !isEditing) {
          return (
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => startEdit(pr.id)}
                sx={{
                  fontWeight: 700,
                  bgcolor: colors.slate[900],
                  borderRadius: '8px',
                  '&:hover': { bgcolor: colors.slate[800] },
                }}
              >
                Label
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => rejectRequest(pr.id)}
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              >
                Reject
              </Button>
            </Stack>
          )
        }
        if (isEditing) {
          return (
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={submitLabel}
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setEditingId(null)}
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              >
                Cancel
              </Button>
            </Stack>
          )
        }
        return null
      },
    },
  ]

  /* ── Render ── */

  return (
    <Page title="Part Requests" subtitle="Label and manage part requests from Service Engineers">
      <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled">{successMsg}</Alert>
      </Snackbar>

      <Stack spacing={2.5}>
        {/* ── Status Filter ── */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                borderColor: colors.border.default,
                color: colors.slate[600],
                '&.Mui-selected': {
                  bgcolor: colors.slate[900],
                  color: '#fff',
                  '&:hover': { bgcolor: colors.slate[800] },
                },
              },
            }}
          >
            {STATUS_FILTERS.map((s) => (
              <ToggleButton key={s} value={s}>
                {s}
                <Chip
                  size="small"
                  label={s === 'All' ? partRequests.length : partRequests.filter((pr) => pr.status === s).length}
                  sx={{
                    ml: 0.5,
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: statusFilter === s ? 'rgba(255,255,255,0.2)' : colors.slate[100],
                    color: statusFilter === s ? '#fff' : colors.slate[600],
                  }}
                />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {/* ── Table ── */}
        <DataTable
          columns={columns}
          rows={filtered}
          keyExtractor={(pr) => pr.id}
          emptyIcon={<Inventory2 />}
          emptyTitle="No part requests found"
          emptyDescription="Part requests from Service Engineers will appear here."
        />
      </Stack>
    </Page>
  )
}
