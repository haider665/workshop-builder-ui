import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  AddCircleOutlined,
  PersonAdd,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { headerCellSx, bodyCellSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import type { CWConcern, CWService } from '../../types/cw'
import type { CWVehicleSize } from '../../types/cw'
import { useToast } from '../../hooks/useToast'

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

type NewAppointmentPageProps = { initialPendingVehicleId?: string; initialVehicleId?: string; initialCustomerId?: string; initialAction?: 'customer' | 'vehicle'; embedded?: boolean; onComplete?: (appointmentId?: string) => void; onCancel?: () => void }

export function NewAppointmentPage({ initialPendingVehicleId, initialVehicleId, initialCustomerId, initialAction, embedded = false, onComplete, onCancel }: NewAppointmentPageProps = {}) {
  const navigate = useNavigate()
  const toast = useToast()
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
  const initVehicleId = initialVehicleId ?? searchParams.get('vehicleId') ?? ''
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
  const [gateEntryId, setGateEntryId] = useState(initialPendingVehicleId ?? searchParams.get('pendingVehicleId') ?? '')
  const [saUserId, setSaUserId] = useState('')
  const linkedPendingVehicle = useMemo(() => pendingVehicles.find((item) => item.id === gateEntryId) ?? null, [pendingVehicles, gateEntryId])

  const [customerDialogOpen, setCustomerDialogOpen] = useState(initialAction === 'customer')
  const [customerDraft, setCustomerDraft] = useState({ fullName: '', phone: '', email: '' })
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(initialAction === 'vehicle')
  const [vehicleDraft, setVehicleDraft] = useState<{ registrationNo: string; make: string; model: string; vin: string; vehicleSize: CWVehicleSize }>({ registrationNo: '', make: '', model: '', vin: '', vehicleSize: 'Medium' })
  const [modalSaving, setModalSaving] = useState(false)

  useEffect(() => {
    const pending = pendingVehicles.find((item) => item.id === gateEntryId) ?? null
    const knownVehicle = vehicles.find((item) => item.id === (initialVehicleId || pending?.vehicleId))
      ?? (pending ? vehicles.find((item) => item.registrationNo.trim().replace(/\s+/g, " ").toUpperCase() === pending.registrationNo.trim().replace(/\s+/g, " ").toUpperCase()) : null)
      ?? null
    if (knownVehicle) {
      setSelectedVehicle(knownVehicle)
      setSelectedCustomer(customers.find((item) => item.id === knownVehicle.customerId) ?? null)
    } else if (initialCustomerId) {
      setSelectedCustomer(customers.find((item) => item.id === initialCustomerId) ?? null)
    }
    if (pending) {
      setVehicleDraft((current) => ({ ...current, registrationNo: pending.registrationNo || current.registrationNo }))
      if (initialAction === "customer" && !knownVehicle) setCustomerDraft((current) => ({ ...current, fullName: current.fullName || pending.intakerName || "", phone: current.phone || pending.intakerPhone || "" }))
    }
  }, [gateEntryId, initialVehicleId, initialCustomerId, initialAction, pendingVehicles, vehicles, customers])

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

  async function createCustomerInline() {
    try {
      setModalSaving(true)
      if (!customerDraft.fullName.trim()) throw new Error('Customer name is required')
      if (!customerDraft.phone.trim()) throw new Error('Customer phone is required')
      const created = await workshopApi.createCustomer({ fullName: customerDraft.fullName.trim(), phone: customerDraft.phone.trim(), email: customerDraft.email.trim() || undefined, type: 'Individual' })
      useCwStore.setState((state) => ({ customers: [created, ...state.customers.filter((item) => item.id !== created.id)] }))
      setSelectedCustomer(created)
      setSelectedVehicle(null)
      setCustomerDialogOpen(false)
      setCustomerDraft({ fullName: '', phone: '', email: '' })
      toast.success('Customer created and selected.')
    } catch (cause) { toast.error(cause, 'Unable to create customer') } finally { setModalSaving(false) }
  }

  function openVehicleDialog() {
    if (!selectedCustomer) { toast.warning('Select or create a customer first.'); return }
    setVehicleDraft((current) => ({ ...current, registrationNo: linkedPendingVehicle?.registrationNo || current.registrationNo }))
    setVehicleDialogOpen(true)
  }

  async function createVehicleInline() {
    try {
      setModalSaving(true)
      if (!selectedCustomer) throw new Error('Select a customer first')
      if (!vehicleDraft.registrationNo.trim()) throw new Error('Registration number is required')
      const created = await workshopApi.createVehicle({ customerId: selectedCustomer.id, registrationNo: vehicleDraft.registrationNo.trim(), make: vehicleDraft.make.trim() || undefined, model: vehicleDraft.model.trim() || undefined, vin: vehicleDraft.vin.trim() || undefined, vehicleSize: vehicleDraft.vehicleSize, vehicleDocuments: linkedPendingVehicle?.vehicleDocuments })
      useCwStore.setState((state) => ({ vehicles: [created, ...state.vehicles.filter((item) => item.id !== created.id)] }))
      setSelectedVehicle(created)
      setVehicleDialogOpen(false)
      toast.success('Vehicle created from the Guard intake and selected.')
    } catch (cause) { toast.error(cause, 'Unable to create vehicle') } finally { setModalSaving(false) }
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

      const createdAppointment = await workshopApi.createAppointment({
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
        slotDate: slotDate || undefined,
        slotTime: slotTime || undefined,
        assignedSAUserId: saUserId || undefined,
        gateEntryId: linkedPendingVehicle?.gateEntryId || undefined,
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
      useCwStore.setState((state) => ({ appointments: [createdAppointment, ...state.appointments.filter((item) => item.id !== createdAppointment.id)] }))

      // Resolve pending vehicle if linked
      if (gateEntryId) {
        try {
          const resolvedPending = await workshopApi.resolvePendingVehicle(gateEntryId, {
            customerId: selectedCustomer.id,
            vehicleId: selectedVehicle.id,
          })
          useCwStore.setState((state) => ({ pendingVehicles: state.pendingVehicles.map((item) => item.id === resolvedPending.id ? resolvedPending : item) }))
        } catch (cause) {
          toast.warning(cause instanceof Error ? `Appointment saved, but Guard intake needs manual resolution: ${cause.message}` : "Appointment saved, but Guard intake needs manual resolution.")
        }
      }

      toast.success('Appointment created successfully.')
      if (onComplete) onComplete(createdAppointment.id)
      else navigate('/cre/appointments')
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
    <Box sx={{ py: embedded ? 1 : { xs: 3, md: 4 }, px: embedded ? { xs: 0, sm: 1 } : { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => onCancel ? onCancel() : navigate('/cre/appointments')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
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
              onClick={openVehicleDialog}
              startIcon={<AddCircleOutlined />}
              sx={{ borderColor: colors.border.strong, color: colors.slate[700], borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: colors.slate[400] } }}
            >
              Add new vehicle
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCustomerDialogOpen(true)}
              startIcon={<PersonAdd />}
              sx={{ borderColor: colors.border.strong, color: colors.slate[700], borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: colors.slate[400] } }}
            >
              Add new customer
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ borderRadius: radii.sm }}>{error}</Alert>}

        {linkedPendingVehicle ? <Alert severity="info" sx={{ borderRadius: radii.sm }}>
          <Typography component="div" sx={{ fontWeight: 800 }}>Guard intake linked: {linkedPendingVehicle.registrationNo}</Typography>
          <Typography component="div" variant="body2">Handed over by {linkedPendingVehicle.intakerName || 'Not recorded'} ({linkedPendingVehicle.intakerType || 'Other'}){linkedPendingVehicle.intakerPhone ? ` · ${linkedPendingVehicle.intakerPhone}` : ''}. Evidence: {linkedPendingVehicle.vehicleDocuments?.length ?? 0} vehicle document(s){linkedPendingVehicle.intakerPhotoUrl ? ' and live person photo' : ''}. CRE/Admin verification remains required.</Typography>
        </Alert> : null}

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
            <Button size="small" variant="text" startIcon={<PersonAdd />} onClick={() => setCustomerDialogOpen(true)}>Create customer here</Button>
            <Button size="small" variant="text" startIcon={<AddCircleOutlined />} onClick={openVehicleDialog} disabled={!selectedCustomer}>Create vehicle here</Button>
          </Stack>

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

        <Dialog open={customerDialogOpen} onClose={() => !modalSaving && setCustomerDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Create customer without leaving appointment</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Full name" required value={customerDraft.fullName} onChange={(event) => setCustomerDraft((draft) => ({ ...draft, fullName: event.target.value }))} autoFocus />
            <TextField label="Phone" required value={customerDraft.phone} onChange={(event) => setCustomerDraft((draft) => ({ ...draft, phone: event.target.value }))} inputMode="tel" />
            <TextField label="Email (optional)" type="email" value={customerDraft.email} onChange={(event) => setCustomerDraft((draft) => ({ ...draft, email: event.target.value }))} />
            <Alert severity="info">Use the full customer form later to add address, occupation, identity papers and corporate information.</Alert>
          </Stack></DialogContent>
          <DialogActions><Button onClick={() => setCustomerDialogOpen(false)} disabled={modalSaving}>Cancel</Button><Button variant="contained" onClick={() => void createCustomerInline()} disabled={modalSaving}>{modalSaving ? 'Creating…' : 'Create and select'}</Button></DialogActions>
        </Dialog>

        <Dialog open={vehicleDialogOpen} onClose={() => !modalSaving && setVehicleDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Create vehicle without leaving appointment</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Registration number" required value={vehicleDraft.registrationNo} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, registrationNo: event.target.value }))} helperText={linkedPendingVehicle ? 'Prefilled from the linked Guard intake. Confirm before saving.' : undefined} autoFocus />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Manufacturer" value={vehicleDraft.make} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, make: event.target.value }))} /><TextField fullWidth label="Model" value={vehicleDraft.model} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, model: event.target.value }))} /></Stack>
            <TextField label="VIN (optional)" value={vehicleDraft.vin} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, vin: event.target.value }))} />
            <TextField select label="Vehicle size" required value={vehicleDraft.vehicleSize} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, vehicleSize: event.target.value as CWVehicleSize }))}>{(['Small', 'Medium', 'Large'] as CWVehicleSize[]).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
            {linkedPendingVehicle?.vehicleDocuments?.length ? <Alert severity="success">{linkedPendingVehicle.vehicleDocuments.length} Guard-uploaded vehicle document(s) will be copied for CRE/Admin verification.</Alert> : null}
          </Stack></DialogContent>
          <DialogActions><Button onClick={() => setVehicleDialogOpen(false)} disabled={modalSaving}>Cancel</Button><Button variant="contained" onClick={() => void createVehicleInline()} disabled={modalSaving || !selectedCustomer}>{modalSaving ? 'Creating…' : 'Create and select'}</Button></DialogActions>
        </Dialog>

        {/* ── Concerns ── */}
        <SectionCard title="Concerns" icon={<Build sx={{ fontSize: '1rem' }} />} defaultCollapsed>
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
          defaultCollapsed
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
        <SectionCard title="Appointment Info" icon={<CalendarMonth sx={{ fontSize: '1rem' }} />} defaultCollapsed>
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
            onClick={() => onCancel ? onCancel() : navigate('/cre/appointments')}
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
