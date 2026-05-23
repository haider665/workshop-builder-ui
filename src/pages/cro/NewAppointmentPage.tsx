import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Delete, DirectionsCar } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWConcern, CWService } from '../../types/cw'

const HOURS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
]

function localDateToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const concerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)
  const services = useCwStore((s) => s.services)
  const appointments = useCwStore((s) => s.appointments)
  const createAppointment = useCwStore((s) => s.createAppointment)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const resolvePendingVehicle = useCwStore((s) => s.resolvePendingVehicle)
  const shops = useCwStore((s) => s.shops)

  const saRoleId = useMemo(() => roles.find((r) => r.name === 'SA')?.id, [roles])
  const saUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && saRoleId && u.roleIds.includes(saRoleId)),
    [users, saRoleId],
  )

  // Vehicle selection
  const initVehicleId = searchParams.get('vehicleId') ?? ''
  const [vehicleId, setVehicleId] = useState(initVehicleId)

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId) ?? null, [vehicles, vehicleId])
  const selectedCustomer = useMemo(
    () => (selectedVehicle ? customers.find((c) => c.id === selectedVehicle.customerId) ?? null : null),
    [customers, selectedVehicle],
  )

  // Concerns state
  const [concernItems, setConcernItems] = useState<{ id: string; concernId: string; concernName: string; processTimeMins?: number; remark: string }[]>([])
  const [selConcerns, setSelConcerns] = useState<CWConcern[]>([])
  const [concernRemark, setConcernRemark] = useState('')

  // Services state
  const [serviceItems, setServiceItems] = useState<
    { id: string; serviceId: string; serviceCode: string; serviceDescription: string; processTimeMins: number; ratePerHr: number; price: number; remark: string }[]
  >([])
  const [selServices, setSelServices] = useState<CWService[]>([])
  const [serviceRemark, setServiceRemark] = useState('')

  // Appointment info
  const [slotDate, setSlotDate] = useState(localDateToday())
  const [slotTime, setSlotTime] = useState('')
  const [notes, setNotes] = useState('')
  const [gateEntryId, setGateEntryId] = useState(searchParams.get('pendingVehicleId') ?? '')
  const [saUserId, setSaUserId] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [concernShopFilter, setConcernShopFilter] = useState('')
  const [serviceShopFilter, setServiceShopFilter] = useState('')

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])


  // Booked slots on selected date
  const bookedSlots = useMemo(() => {
    const slots = new Set<string>()
    for (const appt of appointments) {
      if (appt.slotDate === slotDate && appt.slotTime) slots.add(appt.slotTime)
    }
    return slots
  }, [appointments, slotDate])

  // Concern categories map
  const catById = useMemo(() => new Map(concernCategories.map((c) => [c.id, c])), [concernCategories])

  // Active concerns grouped — filtered by shop
  const activeConcerns = useMemo(() => {
    let list = concerns.filter((c) => c.status === 'Active')
    if (concernShopFilter) {
      const catIdsInShop = new Set(concernCategories.filter((cat) => cat.shopId === concernShopFilter).map((cat) => cat.id))
      list = list.filter((c) => catIdsInShop.has(c.categoryId))
    }
    return list
  }, [concerns, concernCategories, concernShopFilter])
  const activeServices = useMemo(() => {
    let list = services.filter((s) => s.status === 'Active')
    if (serviceShopFilter) list = list.filter((s) => s.shopId === serviceShopFilter)
    return list
  }, [services, serviceShopFilter])

  const totalBDT = useMemo(() => serviceItems.reduce((sum, i) => sum + i.price, 0), [serviceItems])

  function addConcern() {
    if (selConcerns.length === 0) return
    const remark = concernRemark.trim()
    setConcernItems((prev) => [
      ...prev,
      ...selConcerns.map((c) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${c.id}`,
        concernId: c.id,
        concernName: c.name,
        processTimeMins: c.processTimeMins,
        remark,
      })),
    ])
    setSelConcerns([])
    setConcernRemark('')
  }

  function removeConcern(id: string) {
    setConcernItems((prev) => prev.filter((i) => i.id !== id))
  }

  function addService() {
    if (selServices.length === 0) return
    const remark = serviceRemark.trim()
    setServiceItems((prev) => [
      ...prev,
      ...selServices.map((s) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${s.id}`,
        serviceId: s.id,
        serviceCode: s.code,
        serviceDescription: s.description,
        processTimeMins: s.processTimeMins,
        ratePerHr: s.ratePerHr,
        price: s.price,
        remark,
      })),
    ])
    setSelServices([])
    setServiceRemark('')
  }

  function removeService(id: string) {
    setServiceItems((prev) => prev.filter((i) => i.id !== id))
  }

  function submit() {
    try {
      setError(null)
      if (!vehicleId) throw new Error('Select a vehicle')
      if (!selectedCustomer) throw new Error('Vehicle has no linked customer')

      // Auto-commit any selected-but-not-yet-added concerns/services
      const pendingConcernItems = selConcerns.map((c) => ({
        concernId: c.id,
        concernName: c.name,
        remark: concernRemark.trim(),
      }))
      const pendingServiceItems = selServices.map((s) => ({
        serviceId: s.id,
        serviceCode: s.code,
        serviceDescription: s.description,
        processTimeMins: s.processTimeMins,
        ratePerHr: s.ratePerHr,
        price: s.price,
        remark: serviceRemark.trim(),
        addedBySA: false as const,
      }))

      const appt = createAppointment({
        customerId: selectedCustomer.id,
        vehicleId,
        slotDate: slotDate || undefined,
        slotTime: slotTime || undefined,
        assignedSAUserId: saUserId || undefined,
        notes: notes.trim(),
        concernItems: [
          ...concernItems.map((i) => ({
            concernId: i.concernId,
            concernName: i.concernName,
            remark: i.remark,
          })),
          ...pendingConcernItems,
        ],
        serviceItems: [
          ...serviceItems.map((i) => ({
            serviceId: i.serviceId,
            serviceCode: i.serviceCode,
            serviceDescription: i.serviceDescription,
            processTimeMins: i.processTimeMins,
            ratePerHr: i.ratePerHr,
            price: i.price,
            remark: i.remark,
            addedBySA: false as const,
          })),
          ...pendingServiceItems,
        ],
      })

      // Resolve pending vehicle if linked
      if (gateEntryId) {
        try {
          resolvePendingVehicle(gateEntryId, {
            customerId: selectedCustomer.id,
            vehicleId,
            appointmentId: appt.id,
          })
        } catch (_) {
          // Non-fatal: gate entry may not match perfectly
        }
      }

      navigate(`/cre/appointments/${appt.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // Pending gate entries without appointment (for linking)
  const pendingEntries = useMemo(
    () => pendingVehicles.filter((p) => p.status === 'Pending' && !p.appointmentId),
    [pendingVehicles],
  )

  return (
    <Page
      title="New Appointment"
      subtitle="Create new appointment from here"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={() => navigate('/cre/vehicles/new')}>
            Add new vehicle
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate('/cre/customers/new')}>
            Add new customer
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Vehicle Info ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, bgcolor: 'background.paper' }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>Vehicle Info</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Vehicle</InputLabel>
              <Select
                label="Vehicle"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                renderValue={(val) => {
                  const v = vehicles.find((x) => x.id === val)
                  if (!v) return 'Select vehicle'
                  const mm = [v.make, v.model].filter(Boolean).join(' ')
                  return `${v.registrationNo}${mm ? ` – ${mm}` : ''} · VIN: ${v.vin ?? '—'}`
                }}
                startAdornment={<DirectionsCar sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                {vehicles.map((v) => {
                  const mm = [v.make, v.model].filter(Boolean).join(' ')
                  const cust = customers.find((c) => c.id === v.customerId)
                  return (
                    <MenuItem key={v.id} value={v.id}>
                      <Stack>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {v.registrationNo}{mm ? ` – ${mm}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cust?.fullName ?? '—'} · VIN: {v.vin ?? '—'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            {selectedVehicle && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  sx={{ flexWrap: 'wrap' }}
                  useFlexGap
                >
                  <Stack spacing={0.5} sx={{ flex: '1 1 200px' }}>
                    <Typography variant="caption" color="text.secondary">Registration Number</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{selectedVehicle.registrationNo}</Typography>
                  </Stack>
                  <Stack spacing={0.5} sx={{ flex: '1 1 200px' }}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 700 }}>{selectedCustomer?.fullName ?? '—'}</Typography>
                      {selectedCustomer?.email && (
                        <Typography variant="caption" color="text.secondary">{selectedCustomer.email}</Typography>
                      )}
                    </Stack>
                  </Stack>
                  <Stack spacing={0.5} sx={{ flex: '1 1 140px' }}>
                    <Typography variant="caption" color="text.secondary">Manufacturer</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{selectedVehicle.make ?? '—'}</Typography>
                  </Stack>
                  <Stack spacing={0.5} sx={{ flex: '1 1 140px' }}>
                    <Typography variant="caption" color="text.secondary">Model/Variant</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{selectedVehicle.model ?? '—'}</Typography>
                  </Stack>
                </Stack>

                {/* Gate entry link */}
                {pendingEntries.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 240 }}>
                      <InputLabel>Link gate entry (optional)</InputLabel>
                      <Select
                        label="Link gate entry (optional)"
                        value={gateEntryId}
                        onChange={(e) => setGateEntryId(e.target.value)}
                      >
                        <MenuItem value="">— None —</MenuItem>
                        {pendingEntries.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.registrationNo} (arrived {new Date(p.arrivedAt).toLocaleTimeString()})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Paper>

        {/* ── Concerns ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 900 }}>Concerns</Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Shop</InputLabel>
                <Select label="Shop" value={concernShopFilter} onChange={(e) => setConcernShopFilter(e.target.value)}>
                  <MenuItem value="">All Shops</MenuItem>
                  {activeShops.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {concernShopFilter && (
                <Chip
                  label={shopById.get(concernShopFilter)?.name}
                  onDelete={() => setConcernShopFilter('')}
                  color="primary"
                  size="small"
                />
              )}
            </Stack>

            {concernItems.length > 0 && (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 40 }}>SI</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {concernItems.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ color: 'text.secondary' }}>#{idx + 1}</TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.concernName}{typeof item.processTimeMins === 'number' ? ` (${item.processTimeMins} mins)` : ''}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {typeof item.processTimeMins === 'number' ? (
                          <Chip size="small" label={`${item.processTimeMins} mins`} color="info" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{item.remark || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeConcern(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add concern row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Autocomplete
                multiple
                size="small"
                options={activeConcerns}
                groupBy={(o) => catById.get(o.categoryId)?.name ?? 'Other'}
                getOptionLabel={(o) => `${o.name} (${o.processTimeMins ?? '?'} mins)`}
                value={selConcerns}
                onChange={(_, val) => setSelConcerns(val)}
                disableCloseOnSelect
                sx={{ flex: '1 1 280px' }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Choose Concerns"
                    placeholder={selConcerns.length === 0 ? 'Select one or more…' : ''}
                  />
                )}
              />
              <TextField
                size="small"
                label="Remark (applies to all selected)"
                value={concernRemark}
                onChange={(e) => setConcernRemark(e.target.value)}
                sx={{ flex: '2 1 260px' }}
              />
              <Button
                variant="contained"
                onClick={addConcern}
                disabled={selConcerns.length === 0}
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                Add {selConcerns.length > 0 ? `(${selConcerns.length})` : ''}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── Service Requests ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 900 }}>Service Requests</Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Shop</InputLabel>
                  <Select label="Shop" value={serviceShopFilter} onChange={(e) => setServiceShopFilter(e.target.value)}>
                    <MenuItem value="">All Shops</MenuItem>
                    {activeShops.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {serviceShopFilter && (
                  <Chip
                    label={shopById.get(serviceShopFilter)?.name}
                    onDelete={() => setServiceShopFilter('')}
                    color="primary"
                    size="small"
                  />
                )}
              </Stack>
              {serviceItems.length > 0 && (
                <Tooltip title="Total labour estimate">
                  <Chip
                    label={`Total: ${fmtBDT(totalBDT)}`}
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                </Tooltip>
              )}
            </Stack>

            {serviceItems.length > 0 && (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 40 }}>SI</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Time</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Price (BDT)</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceItems.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ color: 'text.secondary' }}>#{idx + 1}</TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.serviceDescription} ({item.processTimeMins} mins)</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {item.serviceCode}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{item.remark || '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{item.processTimeMins} mins</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 700 }}>{item.price.toLocaleString('en-BD')}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeService(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 800, textAlign: 'right', border: 'none' }}>
                      Total Labour Estimate
                    </TableCell>
                    <TableCell align="right" sx={{ border: 'none' }}>
                      <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>
                        {totalBDT.toLocaleString('en-BD')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 'none' }} />
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* Add service row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Autocomplete
                multiple
                size="small"
                options={activeServices}
                groupBy={(o) => o.category}
                getOptionLabel={(o) => `${o.code} – ${o.description} (${o.processTimeMins} mins)`}
                value={selServices}
                onChange={(_, val) => setSelServices(val)}
                disableCloseOnSelect
                sx={{ flex: '2 1 320px' }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Service Requests"
                    placeholder={selServices.length === 0 ? 'Select one or more…' : ''}
                  />
                )}
                renderOption={(props, o) => (
                  <li {...props} key={o.id}>
                    <Stack>
                      <Typography variant="body2">{o.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.code} · {o.processTimeMins}m · BDT {o.price.toLocaleString('en-BD')}
                      </Typography>
                    </Stack>
                  </li>
                )}
              />
              <TextField
                size="small"
                label="Remark (applies to all selected)"
                value={serviceRemark}
                onChange={(e) => setServiceRemark(e.target.value)}
                sx={{ flex: '2 1 220px' }}
              />
              <Button
                variant="contained"
                onClick={addService}
                disabled={selServices.length === 0}
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                Add {selServices.length > 0 ? `(${selServices.length})` : ''}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── Appointment Info ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>Appointment Info</Typography>
            <Stack spacing={2.5}>
              {/* Date navigator */}
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Date
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSlotDate((d) => addDays(d, -1))}
                    sx={{ minWidth: 36, px: 1 }}
                  >
                    ‹
                  </Button>
                  <TextField
                    size="small"
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    sx={{ width: 200 }}
                    slotProps={{ htmlInput: { min: localDateToday() } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSlotDate((d) => addDays(d, 1))}
                    sx={{ minWidth: 36, px: 1 }}
                  >
                    ›
                  </Button>
                  {slotDate && (
                    <Typography variant="body2" color="text.secondary">
                      {formatDateDisplay(slotDate)}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Slot grid */}
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Slot
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {HOURS.map((h) => {
                    const booked = bookedSlots.has(h)
                    const selected = slotTime === h
                    return (
                      <Button
                        key={h}
                        size="small"
                        variant={selected ? 'contained' : 'outlined'}
                        disabled={booked && !selected}
                        onClick={() => setSlotTime(selected ? '' : h)}
                        sx={{
                          minWidth: 90,
                          flexDirection: 'column',
                          py: 0.75,
                          opacity: booked && !selected ? 0.5 : 1,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{h}</Typography>
                        {booked && (
                          <Typography variant="caption" sx={{ fontSize: 9, color: 'warning.main' }}>
                            Booked
                          </Typography>
                        )}
                      </Button>
                    )
                  })}
                </Stack>
              </Stack>

              {/* Service Advisor + Notes */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  size="small"
                  label="Assign Service Advisor"
                  value={saUserId}
                  onChange={(e) => setSaUserId(e.target.value)}
                  sx={{ flex: '1 1 200px' }}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {saUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Additional Note"
                  multiline
                  minRows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ flex: '2 1 300px' }}
                />
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {/* ── Actions ── */}
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate('/cre/appointments')}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={!vehicleId}>
            Create Appointment
          </Button>
        </Stack>
      </Stack>
    </Page>
  )
}
