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
import {
  Delete,
  DirectionsCar,
  Build,
  MiscellaneousServices,
  CalendarMonth,
  ArrowBack,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { headerCellSx, bodyCellSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
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

/* ── Shared field styling ── */
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: radii.sm,
    fontSize: '0.85rem',
    bgcolor: colors.bg.page,
  },
}

export function NewAppointmentPage() {
  const navigate = useNavigate()
  useCREData()
  const [searchParams] = useSearchParams()

  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const concerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)
  const services = useCwStore((s) => s.services)
  const appointments = useCwStore((s) => s.appointments)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const shops = useCwStore((s) => s.shops)

  const saRoleId = useMemo(() => {
    const match = roles.find((r) => {
      const n = r.name.toLowerCase().trim()
      return n === 'sa' || n === 'service advisor'
    })
    if (!match && roles.length) {
      console.warn('[NewAppointmentPage] SA role not found. Available roles:', roles.map((r) => ({ id: r.id, name: r.name })))
    }
    return match?.id
  }, [roles])

  const saUsers = useMemo(() => {
    const filtered = users.filter((u) => u.status === 'Active' && saRoleId && u.roleIds.includes(saRoleId))
    if (!filtered.length && users.length) {
      console.warn('[NewAppointmentPage] No SA users found. saRoleId:', saRoleId, 'Users roleIds:', users.slice(0, 3).map((u) => ({ name: u.fullName, roleIds: u.roleIds })))
    }
    return filtered
  }, [users, saRoleId])

  // Customer → Vehicle selection (customer-first flow)
  const initVehicleId = searchParams.get('vehicleId') ?? ''
  const initVehicle = useMemo(() => vehicles.find((v) => v.id === initVehicleId) ?? null, [vehicles, initVehicleId])
  const initCustomer = useMemo(() => (initVehicle ? customers.find((c) => c.id === initVehicle.customerId) ?? null : null), [customers, initVehicle])

  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[number] | null>(initCustomer)
  const [selectedVehicle, setSelectedVehicle] = useState<typeof vehicles[number] | null>(initVehicle)

  // Vehicles filtered by selected customer
  const customerVehicles = useMemo(
    () => (selectedCustomer ? vehicles.filter((v) => v.customerId === selectedCustomer.id) : []),
    [vehicles, selectedCustomer],
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

  // Concern → shop name lookup
  const getConcernShopName = useMemo(() => {
    const cMap = new Map(concerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (concernId: string) => {
      const concern = cMap.get(concernId)
      if (!concern) return ''
      return shopById.get(catMap.get(concern.categoryId)?.shopId ?? '')?.name ?? ''
    }
  }, [concerns, concernCategories, shopById])

  // Service → shop name lookup
  const getServiceShopName = useMemo(() => {
    const sMap = new Map(services.map((s) => [s.id, s]))
    return (serviceId: string) => shopById.get(sMap.get(serviceId)?.shopId ?? '')?.name ?? ''
  }, [services, shopById])


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
  const concernShopId = useMemo(() => {
    const cMap = new Map(concerns.map((c) => [c.id, c]))
    return (cId: string) => catById.get(cMap.get(cId)?.categoryId ?? '')?.shopId ?? ''
  }, [concerns, catById])

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
    if (!serviceShopFilter) return []
    return services.filter((s) => s.status === 'Active' && s.shopId === serviceShopFilter)
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
        ratePerHr: s.ratePerHr ?? 0,
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

  async function submit() {
    try {
      setError(null)
      if (!selectedVehicle) throw new Error('Select a vehicle')
      if (!selectedCustomer) throw new Error('Select a customer')

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

      const appt = await workshopApi.createAppointment({
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
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
          await workshopApi.resolvePendingVehicle(gateEntryId, {
            customerId: selectedCustomer.id,
            vehicleId: selectedVehicle.id,
          })
        } catch {
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/cre/appointments')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                New Appointment
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Create new appointment from here</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/cre/vehicles/new')}
              sx={{ borderColor: colors.border.strong, color: colors.slate[700], borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: colors.slate[400] } }}
            >
              Add new vehicle
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/cre/customers/new')}
              sx={{ borderColor: colors.border.strong, color: colors.slate[700], borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: colors.slate[400] } }}
            >
              Add new customer
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert>}

        {/* ── Customer & Vehicle ── */}
        <SectionCard title="Customer & Vehicle" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
          {/* Customer Autocomplete (searchable) */}
          <Autocomplete
            size="small"
            options={customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName))}
            getOptionLabel={(c) => `${c.fullName} · ${c.phone}`}
            value={selectedCustomer}
            onChange={(_, val) => {
              setSelectedCustomer(val)
              setSelectedVehicle(null) // reset vehicle when customer changes
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Customer"
                placeholder="Type customer name or phone…"
                sx={fieldSx}
              />
            )}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            sx={{ mb: 2 }}
          />

          {/* Vehicle Autocomplete (filtered by customer, searchable) */}
          {selectedCustomer && (
            <Autocomplete
              size="small"
              options={customerVehicles}
              getOptionLabel={(v) => {
                const mm = [v.make, v.model].filter(Boolean).join(' ')
                return `${v.registrationNo}${mm ? ` – ${mm}` : ''}`
              }}
              value={selectedVehicle}
              onChange={(_, val) => setSelectedVehicle(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Vehicle"
                  placeholder="Type registration no…"
                  sx={fieldSx}
                />
              )}
              renderOption={(props, v) => {
                const mm = [v.make, v.model].filter(Boolean).join(' ')
                return (
                  <li {...props} key={v.id}>
                    <Stack>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {v.registrationNo}{mm ? ` – ${mm}` : ''}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>
                        VIN: {v.vin ?? '—'}
                      </Typography>
                    </Stack>
                  </li>
                )
              }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              noOptionsText={customerVehicles.length === 0 ? 'No vehicles for this customer' : 'No match'}
            />
          )}
          {!selectedCustomer && (
            <Typography variant="body2" sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
              Select a customer first to see their vehicles.
            </Typography>
          )}

          {selectedVehicle && (
            <>
              <Divider sx={{ my: 2, borderColor: colors.border.subtle }} />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ flexWrap: 'wrap' }}
                useFlexGap
              >
                <Stack spacing={0.5} sx={{ flex: '1 1 200px' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration Number</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{selectedVehicle.registrationNo}</Typography>
                </Stack>
                <Stack spacing={0.5} sx={{ flex: '1 1 200px' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{selectedCustomer?.fullName ?? '—'}</Typography>
                    {selectedCustomer?.email && (
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>{selectedCustomer.email}</Typography>
                    )}
                  </Stack>
                </Stack>
                <Stack spacing={0.5} sx={{ flex: '1 1 140px' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manufacturer</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{selectedVehicle.make ?? '—'}</Typography>
                </Stack>
                <Stack spacing={0.5} sx={{ flex: '1 1 140px' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model/Variant</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{selectedVehicle.model ?? '—'}</Typography>
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
                      sx={{ borderRadius: radii.sm, fontSize: '0.85rem' }}
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
        </SectionCard>

        {/* ── Concerns ── */}
        <SectionCard title="Concerns" icon={<Build sx={{ fontSize: '1rem' }} />}>
          {concernItems.length > 0 && (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell sx={{ width: 40 }}>SI</TableCell>
                  <TableCell>Concern</TableCell>
                  <TableCell>Shop</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {concernItems.map((item, idx) => {
                  const shopName = getConcernShopName(item.concernId)
                  return (
                  <TableRow key={item.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell sx={{ color: colors.slate[400] }}>#{idx + 1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: colors.slate[900] }}>{item.concernName}{typeof item.processTimeMins === 'number' ? ` (${item.processTimeMins} mins)` : ''}</Typography>
                    </TableCell>
                    <TableCell>
                      {shopName ? <Chip size="small" label={shopName} sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: colors.slate[100], color: colors.slate[700] }} /> : '—'}
                    </TableCell>
                    <TableCell>
                      {typeof item.processTimeMins === 'number' ? (
                        <Chip size="small" label={`${item.processTimeMins} mins`} sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: colors.accent.blue + '18', color: colors.accent.blue }} />
                      ) : (
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[400] }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{item.remark || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeConcern(item.id)} sx={{ color: colors.accent.red }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* Add concern row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={concernShopFilter} onChange={(e) => setConcernShopFilter(e.target.value)} sx={{ borderRadius: radii.sm, fontSize: '0.85rem' }}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              size="small"
              options={activeConcerns.filter((c) => !concernShopFilter || concernShopId(c.id) === concernShopFilter)}
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
                  sx={fieldSx}
                />
              )}
            />
            <TextField
              size="small"
              label="Remark (applies to all selected)"
              value={concernRemark}
              onChange={(e) => setConcernRemark(e.target.value)}
              sx={{ flex: '2 1 260px', ...fieldSx }}
            />
            <Button
              variant="contained"
              onClick={addConcern}
              disabled={selConcerns.length === 0}
              sx={{ height: 40, whiteSpace: 'nowrap', bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
            >
              Add {selConcerns.length > 0 ? `(${selConcerns.length})` : ''}
            </Button>
          </Stack>
        </SectionCard>

        {/* ── Service Requests ── */}
        <SectionCard
          title="Service Requests"
          icon={<MiscellaneousServices sx={{ fontSize: '1rem' }} />}
          actions={
            serviceItems.length > 0 ? (
              <Tooltip title="Total labour estimate">
                <Chip
                  label={`Total: ${fmtBDT(totalBDT)}`}
                  sx={{ fontWeight: 700, fontSize: '0.78rem', bgcolor: colors.slate[900], color: '#fff' }}
                />
              </Tooltip>
            ) : undefined
          }
        >
          <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem', mb: 2 }}>
            Select a shop to filter services, then pick services to include in the appointment.
          </Typography>

          {serviceItems.length > 0 && (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell sx={{ width: 40 }}>SI</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Shop</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell align="right">Time</TableCell>
                  <TableCell align="right">Price (BDT)</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceItems.map((item, idx) => {
                  const shopName = getServiceShopName(item.serviceId)
                  return (
                  <TableRow key={item.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell sx={{ color: colors.slate[400] }}>#{idx + 1}</TableCell>
                    <TableCell>
                      <Stack>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: colors.slate[900] }}>{item.serviceDescription} ({item.processTimeMins} mins)</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400], fontFamily: 'monospace' }}>
                          {item.serviceCode}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {shopName ? <Chip size="small" label={shopName} sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: colors.slate[100], color: colors.slate[700] }} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{item.remark || '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontSize: '0.82rem' }}>{item.processTimeMins} mins</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{item.price.toLocaleString('en-BD')}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeService(item.id)} sx={{ color: colors.accent.red }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  )
                })}
                <TableRow>
                  <TableCell colSpan={5} sx={{ fontWeight: 800, textAlign: 'right', border: 'none', fontSize: '0.82rem', color: colors.slate[700] }}>
                    Total Labour Estimate
                  </TableCell>
                  <TableCell align="right" sx={{ border: 'none' }}>
                    <Typography sx={{ fontWeight: 900, color: colors.slate[900], fontSize: '0.95rem' }}>
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
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={serviceShopFilter} onChange={(e) => setServiceShopFilter(e.target.value)} sx={{ borderRadius: radii.sm, fontSize: '0.85rem' }}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              size="small"
              options={activeServices.filter((s) => !serviceShopFilter || s.shopId === serviceShopFilter)}
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
                  sx={fieldSx}
                />
              )}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Stack>
                    <Typography variant="body2">{o.description}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
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
              sx={{ flex: '2 1 220px', ...fieldSx }}
            />
            <Button
              variant="contained"
              onClick={addService}
              disabled={selServices.length === 0}
              sx={{ height: 40, whiteSpace: 'nowrap', bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
            >
              Add {selServices.length > 0 ? `(${selServices.length})` : ''}
            </Button>
          </Stack>
        </SectionCard>

        {/* ── Appointment Info ── */}
        <SectionCard title="Appointment Info" icon={<CalendarMonth sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2.5}>
            {/* Date navigator */}
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], fontWeight: 600 }}>
                Date
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSlotDate((d) => addDays(d, -1))}
                  sx={{ minWidth: 36, px: 1, borderColor: colors.border.strong, color: colors.slate[600], borderRadius: radii.sm }}
                >
                  ‹
                </Button>
                <TextField
                  size="small"
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  sx={{ width: 200, ...fieldSx }}
                  slotProps={{ htmlInput: { min: localDateToday() } }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSlotDate((d) => addDays(d, 1))}
                  sx={{ minWidth: 36, px: 1, borderColor: colors.border.strong, color: colors.slate[600], borderRadius: radii.sm }}
                >
                  ›
                </Button>
                {slotDate && (
                  <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                    {formatDateDisplay(slotDate)}
                  </Typography>
                )}
              </Stack>
            </Stack>

            {/* Slot grid */}
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], fontWeight: 600 }}>
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
                        borderRadius: radii.sm,
                        fontWeight: 600,
                        opacity: booked && !selected ? 0.5 : 1,
                        ...(selected
                          ? { bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }
                          : { borderColor: colors.border.strong, color: colors.slate[600] }),
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{h}</Typography>
                      {booked && (
                        <Typography variant="caption" sx={{ fontSize: 9, color: colors.accent.amber }}>
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
                sx={{ flex: '1 1 200px', ...fieldSx }}
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
                sx={{ flex: '2 1 300px', ...fieldSx }}
              />
            </Stack>
          </Stack>
        </SectionCard>

        {/* ── Actions ── */}
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/cre/appointments')}
            sx={{ borderColor: colors.border.strong, color: colors.slate[700], borderRadius: '10px', fontWeight: 600, px: 2.5, '&:hover': { borderColor: colors.slate[400] } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={!selectedVehicle}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Create Appointment
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
