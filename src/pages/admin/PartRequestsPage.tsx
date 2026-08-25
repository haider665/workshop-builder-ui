import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { Inventory2, Send, ExpandMore, DirectionsCar } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { useCwStore } from '../../store/cwStore'
import type { CWPartRequest, CWPartRequestStatus, CWPart } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { workshopApi } from '../../services/workshopApi'
import { fetchAllPages } from '../../services/pagination'
import { useToast } from '../../hooks/useToast'

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
  const toast = useToast()
  const partRequests = useCwStore((s) => s.partRequests)
  const labelPartRequest = useCwStore((s) => s.labelPartRequest)
  const refreshPartRequests = useCwStore((s) => s.refreshPartRequests)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const partsCatalog = useCwStore((s) => s.parts)
  const sessionUser = useSessionStore((s) => s.user)

  // Fetch fresh part requests from backend on mount
  useEffect(() => {
    refreshPartRequests().catch((error) => toast.error(error, 'Failed to refresh part requests.'))
  }, [refreshPartRequests, toast])

  // Load parts from API (store may be empty)
  const [apiParts, setApiParts] = useState<CWPart[]>([])
  useEffect(() => {
    fetchAllPages((page, pageSize) => workshopApi.listParts({ status: 'Active', page, pageSize }))
      .then(setApiParts)
      .catch(() => { /* fallback to store */ })
  }, [])

  const [statusFilter, setStatusFilter] = useState<CWPartRequestStatus | 'All'>('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<CWPart | null>(null)
  const [quantity, setQuantity] = useState('')

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

  const grouped = useMemo(() => {
    const map = new Map<string, CWPartRequest[]>()
    filtered.forEach((pr) => {
      const arr = map.get(pr.appointmentId) ?? []
      arr.push(pr)
      map.set(pr.appointmentId, arr)
    })
    return map
  }, [filtered])

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
    if (!editingId || !selectedPart) {
      toast.warning('Select a catalog part before labeling the request.')
      return
    }
    labelPartRequest(editingId, {
      partNumber: selectedPart.partNumber,
      price: 0,
      quantity: Number(quantity) || 1,
      labeledBy: sessionUser?.name || 'Admin',
    })
    setEditingId(null)
    setSelectedPart(null)
    toast.success(`Labeled as ${selectedPart.name} (${selectedPart.partNumber}).`)
  }

  function rejectRequest(prId: string) {
    labelPartRequest(prId, {
      partNumber: '',
      price: 0,
      quantity: 0,
      labeledBy: sessionUser?.name || 'Admin',
      status: 'Rejected',
    })
    toast.success('Part request rejected.')
  }

  async function sendToEstimator(pr: CWPartRequest) {
    const part = activePartOptions.find((p) => p.partNumber === pr.partNumber)
    if (!part) {
      throw new Error(`Catalog part not found for "${pr.partName}" (${pr.partNumber ?? 'no part number'})`)
    }

    // Create estimate line in backend directly (with partId → status: Identified)
    await workshopApi.createEstimateLine({
      appointmentId: pr.appointmentId,
      concernItemId: pr.concernItemId,
      partRequestId: pr.id,
      description: pr.partName,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      quantity: pr.quantity ?? 1,
    })

    // Mark as Fulfilled via label API (avoids race with fire-and-forget label sync)
    await workshopApi.labelPartRequest(pr.id, {
      partNumber: pr.partNumber ?? part.partNumber,
      price: pr.price ?? 0,
      quantity: pr.quantity ?? 1,
      labeledBy: sessionUser?.name || 'Admin',
      status: 'Fulfilled',
    })
    // Update local state
    set_partRequestStatusLocal(pr.id, 'Fulfilled')
  }

  function set_partRequestStatusLocal(id: string, status: CWPartRequestStatus) {
    const store = useCwStore.getState()
    useCwStore.setState({
      partRequests: store.partRequests.map((r) =>
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
      ),
    })
  }

  async function sendAllToEstimator(groupParts: CWPartRequest[]) {
    const labeled = groupParts.filter(pr => pr.status === 'Labeled')
    if (labeled.length === 0) {
      toast.info('Label at least one part before sending it to the estimator.')
      return
    }
    let sent = 0
    for (const pr of labeled) {
      try {
        await sendToEstimator(pr)
        sent++
      } catch (err) {
        toast.error(err, 'Failed to send part request to the estimator.')
        return
      }
    }
    toast.success(`Sent ${sent} part${sent > 1 ? 's' : ''} to the estimator.`)
  }

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

        {/* ── Accordion List ── */}
        <Box>
          {grouped.size === 0 ? (
            <Stack sx={{ alignItems: 'center', py: 8, bgcolor: '#fff', borderRadius: '12px', border: `1px dashed ${colors.border.default}` }}>
              <Inventory2 sx={{ fontSize: 48, color: colors.slate[300], mb: 2 }} />
              <Typography sx={{ fontWeight: 600, color: colors.slate[700], fontSize: '1.1rem' }}>No part requests found</Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.9rem', mt: 0.5 }}>Part requests from Service Engineers will appear here.</Typography>
            </Stack>
          ) : (
            Array.from(grouped.entries()).map(([appointmentId, parts]) => {
              const info = getApptInfo(appointmentId)
              const allReady = parts.every(pr => pr.status === 'Labeled' || pr.status === 'Fulfilled' || pr.status === 'Rejected')
              const hasLabeled = parts.some(pr => pr.status === 'Labeled')
              const canSendAll = allReady && hasLabeled

              return (
                <Accordion
                  key={appointmentId}
                  defaultExpanded
                  sx={{
                    borderRadius: '12px !important',
                    mb: 2,
                    border: `1px solid ${colors.border.default}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    '&:before': { display: 'none' },
                    overflow: 'hidden'
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Box sx={{ p: 1, bgcolor: colors.slate[50], borderRadius: '8px', display: 'flex' }}>
                          <DirectionsCar sx={{ color: colors.slate[600] }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: colors.slate[900] }}>
                            {info.vehicle}
                          </Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
                            {info.customer} · #{appointmentId.slice(-6).toUpperCase()}
                          </Typography>
                        </Box>
                        <Chip size="small" label={`${parts.length} part${parts.length === 1 ? '' : 's'}`} sx={{ fontWeight: 600 }} />
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${colors.border.default}` }}>
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ bgcolor: colors.slate[50] }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5, pl: 3 }}>Part Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5 }}>Concern</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5 }}>Qty</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5 }}>Catalog Part</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5 }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: colors.slate[600], py: 1.5, pr: 3 }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parts.map(pr => {
                            const concernInfo = getApptInfo(pr.appointmentId, pr.concernItemId)
                            const isEditing = editingId === pr.id

                            return (
                              <TableRow key={pr.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ pl: 3 }}>
                                  <Box>
                                    <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
                                      {pr.partName}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
                                      by {pr.requestedBy}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>
                                    {concernInfo.concern}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField size="small" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} sx={{ width: 70 }} slotProps={{ input: { inputProps: { min: 1 } } }} />
                                  ) : (
                                    <Typography sx={{ fontSize: '0.875rem', color: colors.slate[900] }}>{pr.quantity ?? 1}</Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ minWidth: 220 }}>
                                  {isEditing ? (
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
                                  ) : pr.partNumber ? (
                                    (() => {
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
                                    })()
                                  ) : (
                                    <Typography sx={{ fontSize: '0.8rem', color: colors.slate[400] }}>Not mapped</Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip size="small" label={pr.status} color={STATUS_COLORS[pr.status]} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                                </TableCell>
                                <TableCell align="right" sx={{ pr: 3 }}>
                                  {pr.status === 'Requested' && !isEditing && (
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
                                  )}
                                  {isEditing && (
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
                                  )}

                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {/* Footer */}
                    <Stack direction="row" sx={{ justifyContent: 'flex-end', p: 2, borderTop: `1px solid ${colors.border.default}`, bgcolor: colors.slate[50] }}>
                      <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={() => sendAllToEstimator(parts)}
                        disabled={!canSendAll}
                        sx={{
                          bgcolor: canSendAll ? '#7c3aed' : undefined,
                          fontWeight: 700,
                          borderRadius: '10px',
                          textTransform: 'none',
                          px: 3,
                          '&:hover': { bgcolor: canSendAll ? '#6d28d9' : undefined },
                        }}
                      >
                        Send All to Estimator
                      </Button>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )
            })
          )}
        </Box>
      </Stack>
    </Box>
  )
}
