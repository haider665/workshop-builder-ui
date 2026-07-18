import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, ExpandMore, Warning, Build, MedicalServices, DirectionsCar, AddCircleOutlined, LocalShipping } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWConcernWorkStatus, CWServiceWorkStatus } from '../../types/cw'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

/* ── Reusable info row ────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

/* ── Styled item card ─────────────────────────────────────── */
function ItemCard({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{
      p: 2.5, bgcolor: colors.bg.page, borderRadius: radii.md,
      border: `1px solid ${done ? colors.status.success : colors.border.default}`,
      transition: 'border-color 0.2s',
    }}>
      {children}
    </Box>
  )
}

/* ── Status chip with design tokens ───────────────────────── */
function statusChipColor(status: string): 'success' | 'primary' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'Completed') return 'success'
  if (status === 'In Progress') return 'primary'
  if (status === 'Paused') return 'warning'
  if (status === 'Scheduled') return 'info'
  return 'default'
}

/* ── Action button using design tokens ────────────────────── */
const actionBtnSx = {
  fontWeight: 600,
  borderRadius: '10px',
  px: 2,
  fontSize: '0.8rem',
} as const

export function SEAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  useBackendData()
  const navigate = useNavigate()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const services = useCwStore((s) => s.services)
  const assignConcernTechnicians = useCwStore((s) => s.assignConcernTechnicians)
  const setConcernWorkStatus = useCwStore((s) => s.setConcernWorkStatus)
  const assignServiceTechnicians = useCwStore((s) => s.assignServiceTechnicians)
  const updateServiceItemAssignment = useCwStore((s) => s.updateServiceItemAssignment)
  const submitDiagnosisComplete = useCwStore((s) => s.submitDiagnosisComplete)
  const submitServiceComplete = useCwStore((s) => s.submitServiceComplete)
  const addAppointmentService = useCwStore((s) => s.addAppointmentService)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const partRequests = useCwStore((s) => s.partRequests)
  const createPartRequest = useCwStore((s) => s.createPartRequest)
  const updateConcernItemServices = useCwStore((s) => s.updateConcernItemServices)
  const updateConcernDiagnosisRemark = useCwStore((s) => s.updateConcernDiagnosisRemark)
  const assignStageTechnicians = useCwStore((s) => s.assignStageTechnicians)
  const setStageWorkStatus = useCwStore((s) => s.setStageWorkStatus)
  const shops = useCwStore((s) => s.shops)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  const roles = useCwStore((s) => s.roles)
  const techRoleId = useMemo(() => roles.find((r) => r.name === 'Technician')?.id, [roles])
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && techRoleId && u.roleIds.includes(techRoleId)),
    [users, techRoleId],
  )
  const activeServices = useMemo(() => services.filter((s) => s.status === 'Active'), [services])

  const [concernTechForm, setConcernTechForm] = useState<Record<string, string[]>>({})
  const [serviceTechForm, setServiceTechForm] = useState<Record<string, string[]>>({})
  const [concernRemarks, setConcernRemarks] = useState<Record<string, string>>(() => {
    // Init from persisted diagnosis remarks
    const init: Record<string, string> = {}
    if (appt) {
      for (const c of appt.concernItems) {
        if (c.diagnosisRemark) init[c.id] = c.diagnosisRemark
      }
    }
    return init
  })
  const [serviceRemarks, setServiceRemarks] = useState<Record<string, string>>({})

  // Add service form
  const [addServiceId, setAddServiceId] = useState('')
  const [addServiceRemark, setAddServiceRemark] = useState('')

  // Part request form (per-concern)
  const [partRequestForm, setPartRequestForm] = useState<Record<string, { name: string; qty: string }>>({})
  const [serviceShopFilter, setServiceShopFilter] = useState('')
  const [concernServiceShopFilter, setConcernServiceShopFilter] = useState<Record<string, string>>({})
  const [concernAddServiceId, setConcernAddServiceId] = useState<Record<string, string>>({})

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])

  if (!appt) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Appointment not found.</Alert>
      </Box>
    )
  }

  // Show all concern/service items — assignedSEUserId may not be populated by backend
  const myConcerns = appt.concernItems
  const myServices = appt.serviceItems

  const isDiagnosisPhase = ['Diagnosis Assigned', 'Diagnosis In Progress'].includes(appt.status)
  const isDiagnosisComplete = appt.status === 'Diagnosis Complete'
  const isServicePhase = ['Service Assigned', 'Service In Progress'].includes(appt.status)

  // Check if all concern diagnosis is done
  const allConcernsDone = myConcerns.length > 0 && myConcerns.every((c) => c.workStatus === 'Completed')

  function saveConcernTechnicians(concernItemId: string) {
    const techIds = concernTechForm[concernItemId] ?? []
    if (!techIds.length) return
    assignConcernTechnicians({ appointmentId: appt!.id, concernItemId, technicianUserIds: techIds })
    pushTimeline(appt!.id, { actor: 'SE', action: 'Assigned technicians to concern' })
    // Auto-transition to Diagnosis In Progress if still in Diagnosis Assigned
    if (appt!.status === 'Diagnosis Assigned') {
      setAppointmentStatus(appt!.id, 'Diagnosis In Progress')
    }
  }

  function saveServiceTechnicians(serviceItemId: string) {
    const techIds = serviceTechForm[serviceItemId] ?? []
    if (!techIds.length) return
    assignServiceTechnicians({ appointmentId: appt!.id, serviceItemId, technicianUserIds: techIds })
    pushTimeline(appt!.id, { actor: 'SE', action: 'Assigned technicians to service' })
    if (appt!.status === 'Service Assigned') {
      setAppointmentStatus(appt!.id, 'Service In Progress')
    }
  }

  function handleConcernStatus(concernItemId: string, status: CWConcernWorkStatus) {
    setConcernWorkStatus({ appointmentId: appt!.id, concernItemId, status })
    pushTimeline(appt!.id, { actor: 'SE', action: `Concern → ${status}` })
  }

  function handleServiceStatus(serviceItemId: string, status: CWServiceWorkStatus) {
    updateServiceItemAssignment({ appointmentId: appt!.id, serviceItemId, workStatus: status })
    pushTimeline(appt!.id, { actor: 'SE', action: `Service → ${status}` })
  }

  function handleSubmitDiagnosisComplete() {
    submitDiagnosisComplete({ appointmentId: appt!.id, actorName: 'SE' })
  }

  function handleSubmitServiceComplete() {
    submitServiceComplete({ appointmentId: appt!.id, actorName: 'SE' })
  }

  function handleAddService() {
    const svc = activeServices.find((s) => s.id === addServiceId)
    if (!svc) return
    addAppointmentService({
      appointmentId: appt!.id,
      serviceId: svc.id,
      serviceCode: svc.code,
      serviceDescription: svc.description,
      processTimeMins: svc.processTimeMins,
      ratePerHr: svc.ratePerHr,
      price: svc.price,
      remark: addServiceRemark.trim(),
      addedBySA: false,
    })
    pushTimeline(appt!.id, { actor: 'SE', action: `Added service: ${svc.description}` })
    setAddServiceId('')
    setAddServiceRemark('')
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/se')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {vehicle?.registrationNo ?? 'Appointment'}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {customer?.fullName ?? ''} {customer?.phone ? `· ${customer.phone}` : ''}
              </Typography>
            </Box>
          </Stack>
          <Chip label={appt.status} color="primary" sx={{ fontWeight: 700, fontSize: '0.78rem', borderRadius: radii.full }} />
        </Stack>

        {/* ── Vehicle + Customer Summary Card ── */}
        <SectionCard title="Vehicle Details" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
          <InfoRow label="Registration" value={vehicle?.registrationNo ?? '—'} />
          <InfoRow label="Vehicle" value={`${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`} />
          <InfoRow label="Customer" value={customer?.fullName ?? '—'} />
          <InfoRow label="Phone" value={customer?.phone ?? '—'} />
        </SectionCard>

        {/* Vehicle + Customer Info */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* Timeline */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* SA Health Check Report (readonly, collapsible) */}
        {appt.inspectionChecks.length > 0 && (
          <Accordion disableGutters sx={{
            border: `1px solid ${colors.border.default}`,
            '&:before': { display: 'none' },
            boxShadow: shadows.card,
            borderRadius: `${radii.lg} !important`,
            overflow: 'hidden',
          }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{
              bgcolor: colors.slate[900], color: 'white',
              '& .MuiSvgIcon-root': { color: 'white' },
              borderRadius: `${radii.lg} ${radii.lg} 0 0`,
            }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <MedicalServices sx={{ fontSize: '1.1rem' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
                  SA Health Check Report
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5 }}>
              <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly />
            </AccordionDetails>
          </Accordion>
        )}

        {/* ── Paused Technician Alerts ── */}
        {(() => {
          const pausedItems: { itemName: string; techName: string; reason: string }[] = []
          for (const c of appt.concernItems) {
            for (const ta of c.technicianAssignments) {
              if (ta.status === 'Paused') {
                const reason = appt.timeline.filter((t) => t.action.includes('Paused') && t.action.includes(c.concernName)).at(-1)?.details ?? ''
                pausedItems.push({ itemName: c.concernName, techName: userNameById.get(ta.technicianUserId) ?? '—', reason })
              }
            }
          }
          for (const s of appt.serviceItems) {
            for (const ta of s.technicianAssignments) {
              if (ta.status === 'Paused') {
                const reason = appt.timeline.filter((t) => t.action.includes('Paused') && t.action.includes(s.serviceDescription)).at(-1)?.details ?? ''
                pausedItems.push({ itemName: s.serviceDescription, techName: userNameById.get(ta.technicianUserId) ?? '—', reason })
              }
            }
          }
          if (pausedItems.length === 0) return null
          return (
            <Alert severity="warning" sx={{
              fontWeight: 700,
              border: `2px solid ${colors.status.warning}`,
              borderRadius: radii.md,
              '& .MuiAlert-icon': { alignItems: 'center' },
            }}>
              <Typography sx={{ fontWeight: 800, mb: 1, fontSize: '0.9rem' }}>⚠ Technician Paused ({pausedItems.length})</Typography>
              {pausedItems.map((p, idx) => (
                <Box key={idx} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {p.techName} — paused &quot;{p.itemName}&quot;
                  </Typography>
                  {p.reason && <Typography variant="body2" sx={{ color: colors.slate[500] }}>{p.reason}</Typography>}
                </Box>
              ))}
            </Alert>
          )
        })()}

        {/* ── Concern Diagnosis ── */}
        {(isDiagnosisPhase || isDiagnosisComplete) && myConcerns.length > 0 && (
          <SectionCard title={`Concern Diagnosis (${myConcerns.length})`} icon={<Warning sx={{ fontSize: '1rem' }} />}>
            <Stack spacing={2}>
              {myConcerns.map((c) => {
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                const prForm = partRequestForm[c.id] ?? { name: '', qty: '1' }
                const isConcernDone = c.workStatus === 'Completed'
                return (
                <ItemCard key={c.id} done={isConcernDone}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: colors.slate[900] }}>
                    {c.concernName}{typeof c.processTimeMins === 'number' ? ` (${c.processTimeMins} mins)` : ''}
                  </Typography>
                  {c.remark && <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], mt: 0.5 }}>{c.remark}</Typography>}
                  {c.bayId && <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>Bay: {bayNameById.get(c.bayId) ?? '—'}</Typography>}
                  <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], display: 'block', mt: 0.25 }}>
                    Status: {c.workStatus ?? 'Pending'} · Technicians: {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || 'None'}
                  </Typography>

                  {/* Technician timer statuses */}
                  {c.technicianAssignments.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {c.technicianAssignments.map((ta) => (
                        <Typography key={ta.id} sx={{ fontSize: '0.75rem', pl: 1, color: colors.slate[600] }}>
                          • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                            color={statusChipColor(ta.status)} />
                        </Typography>
                      ))}
                    </Stack>
                  )}

                  {/* Active diagnosis controls — assign techs, remark, done */}
                  {isDiagnosisPhase && !isConcernDone && (
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <TextField
                        size="small"
                        label="SE Remark"
                        value={concernRemarks[c.id] ?? ''}
                        onChange={(e) => setConcernRemarks((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        onBlur={() => {
                          const text = concernRemarks[c.id]?.trim() ?? ''
                          updateConcernDiagnosisRemark(appt.id, c.id, text)
                        }}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add diagnosis notes, findings..."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                      />
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        <TextField
                          select size="small" label="Technicians"
                          value={concernTechForm[c.id] ?? []}
                          onChange={(e) => setConcernTechForm((prev) => ({ ...prev, [c.id]: e.target.value as unknown as string[] }))}
                          slotProps={{ select: { multiple: true } }}
                          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                        >
                          {activeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                          ))}
                        </TextField>
                        <Button size="small" variant="contained" onClick={() => saveConcernTechnicians(c.id)}
                          sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                          Assign
                        </Button>
                        <Button size="small" variant="outlined" color="success" onClick={() => handleConcernStatus(c.id, 'Completed')}
                          sx={actionBtnSx}>
                          Done
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {/* ── After concern completed: Add services + parts ── */}
                  {isDiagnosisPhase && isConcernDone && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${colors.border.default}` }}>
                      <Typography sx={{ fontWeight: 800, color: colors.status.success, mb: 1, fontSize: '0.85rem' }}>
                        ✓ Concern Completed — Add Services & Parts
                      </Typography>

                      {/* Services for this concern — add one at a time */}
                      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Shop</InputLabel>
                          <Select label="Shop" value={concernServiceShopFilter[c.id] ?? ''} onChange={(e) => { setConcernServiceShopFilter((prev) => ({ ...prev, [c.id]: e.target.value as string })); setConcernAddServiceId((prev) => ({ ...prev, [c.id]: '' })) }}
                            sx={{ borderRadius: radii.sm }}>
                            <MenuItem value="">— Shop —</MenuItem>
                            {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Autocomplete
                          size="small"
                          options={activeServices.filter((s) => s.shopId === (concernServiceShopFilter[c.id] ?? '') && !(c.serviceIds ?? []).includes(s.id))}
                          getOptionLabel={(o) => `${o.description} (${o.code}) — ${fmtBDT(o.price)}`}
                          value={activeServices.find((s) => s.id === (concernAddServiceId[c.id] ?? '')) ?? null}
                          onChange={(_, val) => setConcernAddServiceId((prev) => ({ ...prev, [c.id]: val?.id ?? '' }))}
                          disabled={!(concernServiceShopFilter[c.id] ?? '')}
                          sx={{ minWidth: 280, flex: 1 }}
                          renderInput={(params) => (
                            <TextField {...params} label="Service" placeholder={!(concernServiceShopFilter[c.id] ?? '') ? 'Select shop first' : 'Type to search…'}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm } }} />
                          )}
                        />
                        <Button
                          variant="contained" size="small" sx={{ ...actionBtnSx, height: 40, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}
                          disabled={!(concernAddServiceId[c.id] ?? '')}
                          onClick={() => {
                            const svcId = concernAddServiceId[c.id] ?? ''
                            const current = c.serviceIds ?? []
                            if (svcId && !current.includes(svcId)) {
                              updateConcernItemServices(appt.id, c.id, [...current, svcId])
                            }
                            setConcernAddServiceId((prev) => ({ ...prev, [c.id]: '' }))
                          }}
                        >Add</Button>
                      </Stack>
                      {(c.serviceIds?.length ?? 0) > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                          {c.serviceIds!.map((sid) => {
                            const svc = services.find((s) => s.id === sid)
                            const shop = svc ? shops.find((sh) => sh.id === svc.shopId) : null
                            return svc ? (
                              <Chip
                                key={sid} size="small" color="info"
                                label={`${shop?.name ?? ''}: ${svc.description} · ${fmtBDT(svc.price)}`}
                                onDelete={() => updateConcernItemServices(appt.id, c.id, (c.serviceIds ?? []).filter((id) => id !== sid))}
                                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                              />
                            ) : null
                          })}
                        </Stack>
                      )}

                      {/* Parts for this concern — existing */}
                      {concernParts.length > 0 && (
                        <Stack spacing={0.5} sx={{ mb: 1 }}>
                          {concernParts.map((pr) => (
                            <Box key={pr.id} sx={{ p: 1.5, bgcolor: colors.bg.card, borderRadius: radii.sm, border: `1px solid ${colors.border.default}` }}>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>{pr.partName}</Typography>
                                  <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                                    Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                    {typeof pr.price === 'number' ? ` · BDT ${pr.price}` : ''}
                                    {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  label={pr.status}
                                  color={pr.status === 'Fulfilled' ? 'success' : pr.status === 'Labeled' ? 'info' : pr.status === 'Rejected' ? 'error' : 'warning'}
                                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                />
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      )}

                      {/* Add new part request for this concern */}
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <TextField
                          size="small" label="Part Name"
                          value={prForm.name}
                          onChange={(e) => setPartRequestForm((prev) => ({ ...prev, [c.id]: { ...prForm, name: e.target.value } }))}
                          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                          placeholder="e.g. Brake Pad Set"
                        />
                        <TextField
                          size="small" label="Qty" type="number"
                          value={prForm.qty}
                          onChange={(e) => setPartRequestForm((prev) => ({ ...prev, [c.id]: { ...prForm, qty: e.target.value } }))}
                          sx={{ width: 70, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            if (!prForm.name.trim()) return
                            createPartRequest({
                              appointmentId: appt!.id,
                              concernItemId: c.id,
                              partName: prForm.name.trim(),
                              quantity: Number(prForm.qty) || 1,
                              requestedBy: 'SE',
                            })
                            pushTimeline(appt!.id, { actor: 'SE', action: `Requested part "${prForm.name.trim()}" for concern "${c.concernName}"` })
                            setPartRequestForm((prev) => ({ ...prev, [c.id]: { name: '', qty: '1' } }))
                          }}
                          disabled={!prForm.name.trim()}
                          sx={{ ...actionBtnSx, bgcolor: colors.accent.purple, '&:hover': { bgcolor: '#7c3aed' } }}
                        >
                          <LocalShipping sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Request Part
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </ItemCard>
              )})}
            </Stack>

            {/* Submit Diagnosis Complete */}
            {isDiagnosisPhase && allConcernsDone && (() => {
              const pendingParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.status === 'Requested')
              return (
                <>
                  {pendingParts.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: radii.sm }}>
                      {pendingParts.length} part request(s) still pending admin labeling. You can still submit diagnosis.
                    </Alert>
                  )}
                  <Button
                    variant="contained" fullWidth size="large"
                    sx={{
                      fontWeight: 800, mt: 2.5, py: 1.5, borderRadius: '10px',
                      bgcolor: colors.status.warning, color: colors.slate[900],
                      '&:hover': { bgcolor: '#e6920a' },
                    }}
                    onClick={handleSubmitDiagnosisComplete}
                  >
                    Submit Diagnosis Complete
                  </Button>
                </>
              )
            })()}
          </SectionCard>
        )}

        {/* ── Add Additional Services (after diagnosis) ── */}
        {isDiagnosisComplete && (
          <SectionCard title="Add Additional Services" icon={<AddCircleOutlined sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], mb: 2 }}>
              Based on diagnosis findings, add required services. This will be sent to SA for customer approval.
            </Typography>

            {/* Existing services */}
            {appt.serviceItems.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {appt.serviceItems.map((s) => (
                  <Box key={s.id} sx={{ p: 1.5, bgcolor: colors.bg.page, borderRadius: radii.sm, border: `1px solid ${colors.border.default}` }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>
                      {s.serviceDescription} ({s.processTimeMins} mins) <Typography component="span" sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Shop</InputLabel>
                <Select label="Shop" value={serviceShopFilter} onChange={(e) => { setServiceShopFilter(e.target.value as string); setAddServiceId('') }}
                  sx={{ borderRadius: radii.sm }}>
                  <MenuItem value="">— Select Shop —</MenuItem>
                  {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                select size="small" label="Service"
                value={addServiceId}
                onChange={(e) => setAddServiceId(e.target.value)}
                sx={{ minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                disabled={!serviceShopFilter}
                helperText={!serviceShopFilter ? 'Select shop first' : undefined}
              >
                <MenuItem value="">— Select —</MenuItem>
                {activeServices.filter((s) => s.shopId === serviceShopFilter).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.description} ({s.code})</MenuItem>
                ))}
              </TextField>
              <TextField size="small" label="Remark" value={addServiceRemark}
                onChange={(e) => setAddServiceRemark(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
              <Button variant="contained" onClick={handleAddService} disabled={!addServiceId}
                sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                Add
              </Button>
            </Stack>
          </SectionCard>
        )}

        {/* ── Service Execution ── */}
        {isServicePhase && myServices.length > 0 && (
          <SectionCard title={`Assigned Services (${myServices.length})`} icon={<Build sx={{ fontSize: '1rem' }} />}>
            <Stack spacing={2}>
              {myServices.map((s) => {
                const hasStages = s.stageItems && s.stageItems.length > 0
                return (
                <ItemCard key={s.id}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: colors.slate[900] }}>
                      {s.serviceDescription} ({s.processTimeMins} mins) <Typography component="span" sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{s.serviceCode}</Typography>
                    </Typography>
                    {hasStages && <Chip size="small" label={`${s.stageItems!.length} stages`} color="info" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />}
                  </Stack>
                  <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{fmtBDT(s.price)}</Typography>
                  {s.bayId && <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>Bay: {bayNameById.get(s.bayId) ?? '—'}</Typography>}

                  {/* ── Staged service: per-stage technician assignment ── */}
                  {hasStages ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5, pl: 1.5, borderLeft: `3px solid ${colors.accent.blue}` }}>
                      {s.stageItems!.map((stage, idx) => {
                        const prevStage = idx > 0 ? s.stageItems![idx - 1] : null
                        const isBlocked = prevStage && prevStage.workStatus !== 'Completed'
                        const stageKey = `${s.id}_${stage.id}`
                        return (
                          <Box key={stage.id} sx={{
                            p: 2, bgcolor: isBlocked ? colors.bg.subtle : colors.bg.card,
                            borderRadius: radii.sm, border: `1px solid ${colors.border.default}`,
                            opacity: isBlocked ? 0.6 : 1, transition: 'opacity 0.2s',
                          }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: colors.slate[900] }}>
                                Stage {stage.stageOrder}: {stage.stageName}
                              </Typography>
                              <Chip size="small" label={`${stage.durationMins}m`} sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: colors.slate[100], color: colors.slate[700] }} />
                              <Chip size="small" label={stage.workStatus}
                                color={statusChipColor(stage.workStatus)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                              {stage.bayId && <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>Bay: {bayNameById.get(stage.bayId) ?? '—'}</Typography>}
                            </Stack>

                            {/* Technician timer statuses */}
                            {stage.technicianAssignments.length > 0 && (
                              <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                                {stage.technicianAssignments.map((ta) => (
                                  <Typography key={ta.id} sx={{ fontSize: '0.75rem', pl: 1, color: colors.slate[600] }}>
                                    • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                      color={statusChipColor(ta.status)} />
                                  </Typography>
                                ))}
                              </Stack>
                            )}

                            {/* Assignment + status controls (only if not blocked) */}
                            {!isBlocked && stage.workStatus !== 'Completed' && (
                              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <TextField
                                  select size="small" label="Technicians"
                                  value={serviceTechForm[stageKey] ?? []}
                                  onChange={(e) => setServiceTechForm((prev) => ({ ...prev, [stageKey]: e.target.value as unknown as string[] }))}
                                  slotProps={{ select: { multiple: true } }}
                                  sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                                >
                                  {activeUsers.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                                  ))}
                                </TextField>
                                <Button size="small" variant="contained" onClick={() => {
                                  const techs = serviceTechForm[stageKey] ?? []
                                  if (techs.length === 0) return
                                  assignStageTechnicians({
                                    appointmentId: appt!.id,
                                    serviceItemId: s.id,
                                    stageItemId: stage.id,
                                    technicianUserIds: techs,
                                  })
                                  setServiceTechForm((prev) => ({ ...prev, [stageKey]: [] }))
                                }} sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>Assign</Button>
                                <Button size="small" variant="outlined" color="success" onClick={() => {
                                  setStageWorkStatus({
                                    appointmentId: appt!.id,
                                    serviceItemId: s.id,
                                    stageItemId: stage.id,
                                    status: 'Completed',
                                  })
                                  pushTimeline(appt!.id, { actor: 'SE', action: `Stage "${stage.stageName}" completed for ${s.serviceDescription}` })
                                }} sx={actionBtnSx}>Done</Button>
                              </Stack>
                            )}
                            {isBlocked && (
                              <Typography sx={{ fontSize: '0.75rem', color: colors.status.warning, mt: 0.5, display: 'block' }}>
                                ⏳ Waiting for &quot;{prevStage!.stageName}&quot; to complete
                              </Typography>
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  ) : (
                    /* ── Non-staged service: existing flow ── */
                    <>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], display: 'block', mt: 0.25 }}>
                        Status: {s.workStatus ?? 'Pending'} · Technicians: {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || 'None'}
                      </Typography>

                      {/* Technician timer statuses */}
                      {s.technicianAssignments.length > 0 && (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          {s.technicianAssignments.map((ta) => (
                            <Typography key={ta.id} sx={{ fontSize: '0.75rem', pl: 1, color: colors.slate[600] }}>
                              • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                color={statusChipColor(ta.status)} />
                            </Typography>
                          ))}
                        </Stack>
                      )}

                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        <TextField
                          size="small"
                          label="SE Remark"
                          value={serviceRemarks[s.id] ?? ''}
                          onChange={(e) => setServiceRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Add service notes..."
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                        />
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <TextField
                            select size="small" label="Technicians"
                            value={serviceTechForm[s.id] ?? []}
                            onChange={(e) => setServiceTechForm((prev) => ({ ...prev, [s.id]: e.target.value as unknown as string[] }))}
                            slotProps={{ select: { multiple: true } }}
                            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                          >
                            {activeUsers.map((u) => (
                              <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                            ))}
                          </TextField>
                          <Button size="small" variant="contained" onClick={() => saveServiceTechnicians(s.id)}
                            sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                            Assign
                          </Button>
                          <Button size="small" variant="outlined" color="success" onClick={() => handleServiceStatus(s.id, 'Completed')}
                            sx={actionBtnSx}>
                            Done
                          </Button>
                        </Stack>
                      </Stack>
                    </>
                  )}
                </ItemCard>
                )
              })}
            </Stack>

            {/* Submit Service Complete */}
            {myServices.every((s) => {
              if (s.stageItems && s.stageItems.length > 0) {
                return s.stageItems.every((st) => st.workStatus === 'Completed')
              }
              return s.workStatus === 'Completed'
            }) && (
              <Button
                variant="contained" fullWidth size="large"
                sx={{
                  fontWeight: 800, mt: 2.5, py: 1.5, borderRadius: '10px',
                  bgcolor: colors.status.success, color: '#fff',
                  '&:hover': { bgcolor: '#0d9668' },
                }}
                onClick={handleSubmitServiceComplete}
              >
                Submit Service Complete
              </Button>
            )}
          </SectionCard>
        )}
      </Stack>
    </Box>
  )
}
