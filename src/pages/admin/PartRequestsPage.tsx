import {
  Alert,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWPartRequestStatus } from '../../types/cw'

const STATUS_FILTERS: (CWPartRequestStatus | 'All')[] = ['All', 'Requested', 'Labeled', 'Fulfilled', 'Rejected']
const STATUS_COLORS: Record<CWPartRequestStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Requested: 'warning',
  Labeled: 'info',
  Fulfilled: 'success',
  Rejected: 'error',
}

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

  return (
    <Page title="Part Requests" subtitle="Label and manage part requests from Service Engineers">
      <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled">{successMsg}</Alert>
      </Snackbar>

      <Stack spacing={2.5}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
            size="small"
          >
            {STATUS_FILTERS.map((s) => (
              <ToggleButton key={s} value={s} sx={{ fontWeight: 700, textTransform: 'none', px: 2 }}>
                {s}
                <Chip
                  size="small"
                  label={s === 'All' ? partRequests.length : partRequests.filter((pr) => pr.status === s).length}
                  sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800 }}>Part Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Qty</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Part #</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      No part requests found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((pr) => {
                const info = getApptInfo(pr.appointmentId, pr.concernItemId)
                const isEditing = editingId === pr.id
                return (
                  <TableRow key={pr.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{pr.partName}</Typography>
                      <Typography variant="caption" color="text.secondary">by {pr.requestedBy}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{info.concern}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{info.vehicle}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{info.customer}</Typography></TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} sx={{ width: 70 }} />
                      ) : (
                        <Typography variant="body2">{pr.quantity ?? 1}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Part #" sx={{ width: 120 }} />
                      ) : (
                        <Typography variant="body2">{pr.partNumber || '—'}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" sx={{ width: 100 }} />
                      ) : (
                        <Typography variant="body2">{typeof pr.price === 'number' ? `BDT ${pr.price}` : '—'}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 140 }} />
                      ) : (
                        <Typography variant="body2">{pr.deliveryDate || '—'}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={pr.status} color={STATUS_COLORS[pr.status]} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      {pr.status === 'Requested' && !isEditing && (
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" variant="contained" onClick={() => startEdit(pr.id)} sx={{ fontWeight: 700 }}>
                            Label
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => rejectRequest(pr.id)} sx={{ fontWeight: 700 }}>
                            Reject
                          </Button>
                        </Stack>
                      )}
                      {isEditing && (
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" variant="contained" color="success" onClick={submitLabel} sx={{ fontWeight: 700 }}>
                            Save
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => setEditingId(null)} sx={{ fontWeight: 700 }}>
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
        </Paper>
      </Stack>
    </Page>
  )
}
