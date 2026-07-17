import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Assignment,
  CheckCircle,
  DirectionsCar,
  FilterList,
  Inventory2,
  LocalShipping,
  MoreVert,
  Search,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { colors, pageLayout, radii, shadows } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'


/* ─────────────────────── Helpers ─────────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning!'
  if (h < 17) return 'Good Afternoon!'
  return 'Good Evening!'
}

function todayString() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/* ─────────────────────── Styles ──────────────────────────────── */

const statCardSx = {
  bgcolor: colors.slate[800],
  color: '#fff',
  borderRadius: radii.md,
  p: 3,
  flex: 1,
  minWidth: 160,
} as const

const workCardSx = {
  bgcolor: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radii.md,
  boxShadow: shadows.card,
  p: 2,
  minWidth: 260,
  flexShrink: 0,
} as const

const scrollContainerSx = {
  display: 'flex',
  gap: 2,
  overflowX: 'auto',
  pb: 1,
  '&::-webkit-scrollbar': { height: 6 },
  '&::-webkit-scrollbar-thumb': { bgcolor: colors.slate[300], borderRadius: 3 },
} as const

const badgeSx = {
  bgcolor: '#FEF3C7',
  color: '#92400E',
  fontSize: '0.7rem',
  fontWeight: 600,
  px: 1,
  py: 0.25,
  borderRadius: '4px',
  display: 'inline-block',
} as const

const chipColors: Record<string, { bg: string; color: string }> = {
  Created: { bg: '#F1F5F9', color: '#475569' },
  'Sent to Store': { bg: '#FEF3C7', color: '#92400E' },
  'Request Received': { bg: '#FEF3C7', color: '#92400E' },
  'Part Ready': { bg: '#DBEAFE', color: '#1E40AF' },
  'Partially Ready': { bg: '#FEF9C3', color: '#854D0E' },
  Picked: { bg: '#DBEAFE', color: '#1E40AF' },
  Received: { bg: '#DCFCE7', color: '#166534' },
  Closed: { bg: '#F1F5F9', color: '#475569' },
  'Return Raised': { bg: '#FEE2E2', color: '#991B1B' },
  Cancelled: { bg: '#F1F5F9', color: '#64748B' },
}

/* ─────────────────────── Component ──────────────────────────── */

export function CounterDeskPage() {
  const [search, setSearch] = useState('')
  useBackendData()

  /* ── Store data ── */

  const requisitions = useCwStore((s) => s.requisitions)
  const appointments = useCwStore((s) => s.appointments)
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const users = useCwStore((s) => s.users)

  /* ── Enriched requisitions ── */

  const enrichedReqs = useMemo(() => {
    return requisitions.map((req) => {
      const appt = appointments.find((a) => a.id === req.appointmentId)
      const customer = appt ? customers.find((c) => c.id === appt.customerId) : undefined
      const vehicle = appt ? vehicles.find((v) => v.id === appt.vehicleId) : undefined
      const user = users.find((u) => u.id === req.requestedByUserId)
      return {
        id: req.id,
        reqNumber: req.requisitionNumber,
        appointmentNumber: appt?.id ?? req.appointmentId,
        requestedOn: req.createdAt,
        requestedBy: user?.fullName ?? customer?.fullName ?? req.requestedByUserId,
        phone: customer?.phone ?? '—',
        vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registrationNo : '—',
        vin: vehicle?.vin ?? '—',
        status: req.status,
      }
    })
  }, [requisitions, appointments, customers, vehicles, users])

  /* ── Picker cards (requisitions in Picked status) ── */

  const pickerCards = useMemo(() => {
    return requisitions
      .filter((r) => r.status === 'Picked')
      .map((r) => {
        const user = users.find((u) => u.id === r.pickedByUserId)
        const requester = users.find((u) => u.id === r.requestedByUserId)
        const firstLine = r.lines[0]
        return {
          id: r.id,
          reqNumber: r.requisitionNumber,
          partName: firstLine?.partName ?? '—',
          requestedBy: requester?.fullName ?? r.requestedByUserId,
          picker: user?.fullName ?? '—',
          date: formatDate(r.pickedAt ?? r.updatedAt),
          time: formatTime(r.pickedAt ?? r.updatedAt),
        }
      })
  }, [requisitions, users])

  /* ── Receiver cards (requisitions in Received status) ── */

  const receiverCards = useMemo(() => {
    return requisitions
      .filter((r) => r.status === 'Received')
      .map((r) => {
        const user = users.find((u) => u.id === r.receivedByUserId)
        const requester = users.find((u) => u.id === r.requestedByUserId)
        const firstLine = r.lines[0]
        return {
          id: r.id,
          reqNumber: r.requisitionNumber,
          partName: firstLine?.partName ?? '—',
          requestedBy: requester?.fullName ?? r.requestedByUserId,
          technician: user?.fullName ?? '—',
          date: formatDate(r.receivedAt ?? r.updatedAt),
          time: formatTime(r.receivedAt ?? r.updatedAt),
        }
      })
  }, [requisitions, users])

  /* ── Derived ── */

  const pendingCount = requisitions.filter(
    (r) => !['Picked', 'Received', 'Closed', 'Cancelled'].includes(r.status),
  ).length
  const pickedCount = requisitions.filter((r) => r.status === 'Picked').length
  const deliveredCount = requisitions.filter((r) => r.status === 'Received').length

  const filteredReqs = enrichedReqs.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.reqNumber.toLowerCase().includes(q) ||
      r.appointmentNumber.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q) ||
      r.vehicle.toLowerCase().includes(q)
    )
  })

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* ════════════ Dashboard Header ════════════ */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 1 }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}
            >
              {getGreeting()}
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Your task stats are ready for today!
            </Typography>
          </Box>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            It&apos;s {todayString()}
          </Typography>
        </Stack>

        {/* ════════════ Stat Cards ════════════ */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* Pending */}
          <Box sx={statCardSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Assignment sx={{ fontSize: 28, opacity: 0.8 }} />
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {pendingCount}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, mt: 0.25 }}>
                  Pending
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Picked */}
          <Box sx={statCardSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <LocalShipping sx={{ fontSize: 28, opacity: 0.8 }} />
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {pickedCount}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, mt: 0.25 }}>
                  Picked
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Delivered */}
          <Box sx={statCardSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <CheckCircle sx={{ fontSize: 28, opacity: 0.8 }} />
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {deliveredCount}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, mt: 0.25 }}>
                  Delivered
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>

        {/* ════════════ Picker Section ════════════ */}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900], mb: 1.5 }}>
            Picker
          </Typography>
          <Box sx={scrollContainerSx}>
            {pickerCards.length === 0 ? (
              <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 4, width: '100%', textAlign: 'center' }}>
                No items to pick
              </Typography>
            ) : (
              pickerCards.map((card) => (
                <Box key={card.id} sx={workCardSx}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                    <Inventory2 sx={{ fontSize: 18, color: colors.slate[500] }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}>
                        {card.reqNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                        {card.partName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                      Requested By:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: colors.slate[700] }}>
                        {card.requestedBy}
                      </Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                      Picker:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: colors.slate[700] }}>
                        {card.picker}
                      </Box>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box sx={badgeSx}>{card.date}</Box>
                    <Box sx={badgeSx}>{card.time}</Box>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderColor: colors.border.default,
                        color: colors.slate[700],
                        borderRadius: '6px',
                        px: 1.5,
                        py: 0.25,
                        textTransform: 'none',
                        '&:hover': { borderColor: colors.border.strong, bgcolor: colors.bg.subtle },
                      }}
                    >
                      Review
                    </Button>
                  </Stack>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* ════════════ Receiver Section ════════════ */}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900], mb: 1.5 }}>
            Receiver
          </Typography>
          <Box sx={scrollContainerSx}>
            {receiverCards.length === 0 ? (
              <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 4, width: '100%', textAlign: 'center' }}>
                No items to receive
              </Typography>
            ) : (
              receiverCards.map((card) => (
                <Box key={card.id} sx={workCardSx}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                    <Inventory2 sx={{ fontSize: 18, color: colors.slate[500] }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}>
                        {card.reqNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                        {card.partName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                      Requested By:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: colors.slate[700] }}>
                        {card.requestedBy}
                      </Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                      Technician:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: colors.slate[700] }}>
                        {card.technician}
                      </Box>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box sx={badgeSx}>{card.date}</Box>
                    <Box sx={badgeSx}>{card.time}</Box>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderColor: colors.border.default,
                        color: colors.slate[700],
                        borderRadius: '6px',
                        px: 1.5,
                        py: 0.25,
                        textTransform: 'none',
                        '&:hover': { borderColor: colors.border.strong, bgcolor: colors.bg.subtle },
                      }}
                    >
                      Review
                    </Button>
                  </Stack>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* ════════════ Part Requisition List ════════════ */}
        <Box>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 1, mb: 2 }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
                Part Requisition List
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
                Description
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
              Showing {filteredReqs.length} of {enrichedReqs.length} Results
            </Typography>
          </Stack>

          {/* Search + Filter */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: colors.slate[400], fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radii.sm,
                  bgcolor: colors.bg.card,
                  '& fieldset': { borderColor: colors.border.default },
                  '&:hover fieldset': { borderColor: colors.border.strong },
                },
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              sx={{
                borderColor: colors.border.default,
                color: colors.slate[600],
                fontWeight: 600,
                borderRadius: radii.sm,
                px: 2.5,
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: colors.border.strong, bgcolor: colors.bg.subtle },
              }}
            >
              Filters
            </Button>
          </Stack>

          {/* Table */}
          <TableContainer
            sx={{
              bgcolor: colors.bg.card,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radii.md,
              boxShadow: shadows.card,
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  {[
                    'Requisition Number',
                    'Repair Order Number',
                    'Requested On',
                    'Requested By',
                    'Vehicle',
                    'Status',
                    '',
                  ].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: colors.slate[500],
                        borderBottom: `1px solid ${colors.border.default}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, borderBottom: 'none' }}>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>
                        No requisitions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReqs.map((req) => {
                    const chip = chipColors[req.status] ?? { bg: '#F1F5F9', color: '#475569' }
                    return (
                      <TableRow
                        key={req.id}
                        sx={{ '&:hover': { bgcolor: colors.bg.cardHover } }}
                      >
                        {/* Requisition Number */}
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: colors.slate[900],
                            borderBottom: `1px solid ${colors.border.subtle}`,
                          }}
                        >
                          {req.reqNumber}
                        </TableCell>

                        {/* Repair Order Number */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: colors.accent.blue,
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            {req.appointmentNumber}
                          </Typography>
                        </TableCell>

                        {/* Requested On */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}`, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: colors.slate[900] }}>
                            {formatTime(req.requestedOn)}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {formatDate(req.requestedOn)}
                          </Typography>
                        </TableCell>

                        {/* Requested By */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: colors.accent.indigo,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials(req.requestedBy)}
                            </Box>
                            <Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: colors.slate[900] }}>
                                {req.requestedBy}
                              </Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                                {req.phone}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <DirectionsCar sx={{ fontSize: 18, color: colors.slate[400] }} />
                            <Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: colors.slate[900] }}>
                                {req.vehicle}
                              </Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                                {req.vin}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <Chip
                            size="small"
                            label={req.status}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              bgcolor: chip.bg,
                              color: chip.color,
                              border: 'none',
                            }}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <IconButton size="small">
                            <MoreVert sx={{ fontSize: 18, color: colors.slate[500] }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Box>
  )
}
