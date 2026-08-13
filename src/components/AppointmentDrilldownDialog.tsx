import { useMemo, useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { Assignment, DirectionsCar, Search } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useCwStore } from '../store/cwStore'
import { colors } from '../theme/tokens'
import type { CWAppointment } from '../types/cw'

type Props = { open: boolean; onClose: () => void; title: string; description?: string; rows: CWAppointment[]; routeBase: string }

export function AppointmentDrilldownDialog({ open, onClose, title, description, rows, routeBase }: Props) {
  const navigate = useNavigate()
  const vehicles = useCwStore((state) => state.vehicles)
  const customers = useCwStore((state) => state.customers)
  const [search, setSearch] = useState('')
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((appointment) => {
      const vehicle = vehicles.find((item) => item.id === appointment.vehicleId)
      const customer = customers.find((item) => item.id === appointment.customerId)
      return [vehicle?.registrationNo, vehicle?.make, vehicle?.model, customer?.fullName, customer?.phone, appointment.status].filter(Boolean).join(' ').toLowerCase().includes(query)
    })
  }, [customers, rows, search, vehicles])

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: { xs: 2.5, sm: 3.5 }, maxHeight: { xs: '92dvh', sm: '86vh' }, m: { xs: 1, sm: 3 }, overflow: 'hidden' } } }}>
    <DialogTitle sx={{ pb: 1 }}><Typography sx={{ fontWeight: 850, fontSize: '1.2rem', color: colors.slate[900] }}>{title}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '.8rem' }}>{description ?? `${visible.length} visible appointment${visible.length === 1 ? '' : 's'} · open a record to continue.`}</Typography></DialogTitle>
    <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: colors.bg.subtle }}>
      <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search registration, customer, phone, vehicle or status" fullWidth size="small" slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: colors.slate[400] }} /> } }} sx={{ mb: 2, bgcolor: colors.bg.card, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      <Stack spacing={1.25}>{visible.map((appointment) => {
        const vehicle = vehicles.find((item) => item.id === appointment.vehicleId)
        const customer = customers.find((item) => item.id === appointment.customerId)
        return <Box key={appointment.id} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, border: `1px solid ${colors.border.default}`, bgcolor: colors.bg.card, boxShadow: '0 1px 3px rgba(15,23,42,.05)' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}><Stack direction="row" spacing={1.5} sx={{ minWidth: 0, alignItems: 'center' }}><Box sx={{ width: 46, height: 46, borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: 'rgba(37,99,235,.09)', color: colors.status.info }}><DirectionsCar /></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 850, color: colors.slate[900] }}>{vehicle?.registrationNo ?? 'Vehicle pending'}</Typography><Typography sx={{ color: colors.slate[600], fontSize: '.82rem' }}>{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle details pending'} · {customer?.fullName || 'Customer pending'}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '.75rem' }}>{new Date(appointment.createdAt).toLocaleString()} · {customer?.phone || 'Phone pending'}</Typography></Box></Stack><Stack direction={{ xs: 'row', sm: 'column' }} spacing={.75} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}><Chip size="small" label={appointment.status} sx={{ fontWeight: 700 }} /><Button size="small" onClick={() => { onClose(); navigate(`${routeBase}/${appointment.id}`) }} sx={{ fontWeight: 750 }}>Open appointment</Button></Stack></Stack></Box>
      })}{!visible.length ? <Box sx={{ py: 6, textAlign: 'center' }}><Assignment sx={{ fontSize: 42, color: colors.slate[300], mb: 1 }} /><Typography sx={{ fontWeight: 800, color: colors.slate[700] }}>No matching appointments</Typography><Typography sx={{ color: colors.slate[500], fontSize: '.82rem' }}>Try another search or close this view.</Typography></Box> : null}</Stack>
    </DialogContent>
    <DialogActions sx={{ px: 2.5, py: 1.5 }}><Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, bgcolor: colors.slate[900], fontWeight: 750 }}>Close</Button></DialogActions>
  </Dialog>
}
