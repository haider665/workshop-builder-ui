import {
  Alert,
  Autocomplete,
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
import { Inventory2, Send } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPartRequest, CWPartRequestStatus, CWPart } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { workshopApi } from '../../services/workshopApi'

/* ─────────────────────── Constants ─────────────────────────── */

const STATUS_FILTERS: (CWPartRequestStatus | 'All')[] = ['All', 'Requested', 'Labeled', 'Fulfilled', 'Rejected']
const STATUS_COLORS: Record<CWPartRequestStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Requested: 'warning',
  Labeled: 'info',
  Fulfilled: 'success',
  Rejected: 'error',
}

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

export function PartRequestsPage() {
  const partRequests = useCwStore((s) => s.partRequests)
  const labelPartRequest = useCwStore((s) => s.labelPartRequest)
  const setPartRequestStatus = useCwStore((s) => s.setPartRequestStatus)
  const refreshPartRequests = useCwStore((s) => s.refreshPartRequests)
  const createEstimateLine = useCwStore((s) => s.createEstimateLine)
  const identifyEstimateLine = useCwStore((s) => s.identifyEstimateLine)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const partsCatalog = useCwStore((s) => s.parts)
  const sessionUser = useSessionStore((s) => s.user)

  // Fetch fresh part requests from backend on mount
  useEffect(() => { refreshPartRequests().catch(console.error) }, [refreshPartRequests])

  // Load parts from API (store may be empty)
  const [apiParts, setApiParts] = useState<CWPart[]>([])
  useEffect(() => {
    workshopApi.listParts({ status: 'Active', pageSize: 500 })
      .then((res) => setApiParts(res.data))
      .catch(() => { /* fallback to store */ })
  }, [])

  const [statusFilter, setStatusFilter] = useState<CWPartRequestStatus | 'All'>('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<CWPart | null>(null)
  const [quantity, setQuantity] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const filtered = useMemo(() => {
    const list = statusFilter === 'All' ? partRequests : partRequests.filter((pr) => pr.status === statusFilter)
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [partRequests, statusFilter])

  const activePartOptions = useMemo(
    () => {
      // Prefer API parts, fallback to store
      const source = apiParts.length > 0 ? apiParts : partsCatalog
      return source.filter((p) => p.status === 'Active')
    },
    [apiParts, partsCatalog],
  )

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
    // Try to find matching catalog part
    const match = activePartOptions.find((p) => p.partNumber === pr.partNumber || p.name === pr.partName)
    setSelectedPart(match ?? null)
    setQuantity(typeof pr.quantity === 'number' ? String(pr.quantity) : '1')
  }

  function submitLabel() {
    if (!editingId || !selectedPart) return
    labelPartRequest(editingId, {
      partNumber: selectedPart.partNumber,
      price: 0,
      quantity: Number(quantity) || 1,
      labeledBy: sessionUser?.name || 'Admin',
    })
    setEditingId(null)
    setSelectedPart(null)
    setSuccessMsg(`Labeled as ${selectedPart.name} (${selectedPart.partNumber})`)
    setSuccessOpen(true)
  }

  function rejectRequest(prId: string) {
    labelPartRequest(prId, {
      partNumber: '',
      price: 0,
      quantity: 0,
      labeledBy: sessionUser?.name || 'Admin',
      status: 'Rejected',
    })
    setSuccessMsg('Part request rejected')
    setSuccessOpen(true)
  }

  async function sendToEstimator(pr: CWPartRequest) {
    const part = activePartOptions.find((p) => p.partNumber === pr.partNumber)
    if (!part) return

    // Create estimate line (status: Requested, then immediately identify)
    try {
      const line = createEstimateLine({
        appointmentId: pr.appointmentId,
        concernItemId: pr.concernItemId,
        description: pr.partName,
        requestedByUserId: pr.requestedBy,
        quantity: pr.quantity ?? 1,
      })

      // Immediately identify with catalog part
      identifyEstimateLine(line.id, {
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        identifiedByUserId: sessionUser?.id || '',
      })

      // Mark part request as fulfilled (awaits backend)
      await setPartRequestStatus(pr.id, 'Fulfilled')

      setSuccessMsg(`Sent "${part.name}" to Estimator for pricing`)
      setSuccessOpen(true)
    } catch (err) {
      setSuccessMsg(`Failed to send to estimator: ${err instanceof Error ? err.message : String(err)}`)
      setSuccessOpen(true)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWPartRequest>[] = [
    {
      key: 'partName',
      header: 'Part Name',
      sortable: true,
      sortValue: (pr) => pr.partName.toLowerCase(),
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
      sortable: true,
      sortValue: (pr) => pr.quantity ?? 1,
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <TextField size="small" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} sx={{ width: 70 }} slotProps={{ input: { inputProps: { min: 1 } } }} />
          )
        }
        return <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>{pr.quantity ?? 1}</Typography>
      },
    },
    {
      key: 'catalogPart',
      header: 'Catalog Part',
      minWidth: 220,
      render: (pr) => {
        const isEditing = editingId === pr.id
        if (isEditing) {
          return (
            <Autocomplete
              size="small"
              options={activePartOptions}
              value={selectedPart}
              onChange={(_, v) => setSelectedPart(v)}
              getOptionLabel={(p) => `${p.name} (${p.partNumber})`}
              renderOption={(props, p) => (
                <Box component="li" {...props} key={p.id}>
                  <Stack spacing={0}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500] }}>
                      {p.partNumber} {p.brand ? `· ${p.brand}` : ''}
                    </Typography>
                  </Stack>
                </Box>
              )}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} placeholder="Search parts..." />}
            />
          )
        }
        if (pr.partNumber) {
          const match = activePartOptions.find((p) => p.partNumber === pr.partNumber)
          return (
            <Stack spacing={0}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: colors.slate[900] }}>
                {match?.name ?? pr.partNumber}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500], fontFamily: 'monospace' }}>
                {pr.partNumber}
              </Typography>
            </Stack>
          )
        }
        return <Typography sx={{ fontSize: '0.8rem', color: colors.slate[400] }}>Not mapped</Typography>
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (pr) => pr.status,
      render: (pr) => (
        <Chip size="small" label={pr.status} color={STATUS_COLORS[pr.status]} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
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
              <Button size="small" variant="contained" onClick={() => startEdit(pr.id)} sx={btnSx}>
                Label
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => rejectRequest(pr.id)}
                sx={{ fontWeight: 700, borderRadius: '10px' }}
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
                disabled={!selectedPart}
                sx={{ fontWeight: 700, borderRadius: '10px' }}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setEditingId(null); setSelectedPart(null) }}
                sx={{ fontWeight: 700, borderRadius: '10px' }}
              >
                Cancel
              </Button>
            </Stack>
          )
        }

        if (pr.status === 'Labeled') {
          return (
            <Button
              size="small"
              variant="contained"
              startIcon={<Send />}
              onClick={() => sendToEstimator(pr)}
              sx={{
                bgcolor: '#7c3aed',
                fontWeight: 700,
                borderRadius: '10px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#6d28d9' },
              }}
            >
              Send to Estimator
            </Button>
          )
        }

        return null
      },
    },
  ]

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Part Requests
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Map part requests to catalog, then send to Estimator for pricing</Typography>
          </Box>
        </Stack>

        <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled">{successMsg}</Alert>
        </Snackbar>

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
    </Box>
  )
}
