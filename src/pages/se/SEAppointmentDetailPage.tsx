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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import type { CWConcernWorkStatus, CWServiceWorkStatus } from '../../types/cw'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function SEAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

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
  const [concernServiceShopFilter, setConcernServiceShopFilter] = useState('')
  const [concernAddServiceId, setConcernAddServiceId] = useState('')

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const myConcerns = appt.concernItems.filter((c) => c.assignedSEUserId)
  const myServices = appt.serviceItems.filter((s) =>
    s.assignedSEUserId || (s.stageItems && s.stageItems.some((st) => st.assignedSEUserId))
  )

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
    <Page title={`SE — ${vehicle?.registrationNo ?? 'Appointment'}`} subtitle={customer?.fullName ?? ''}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                {vehicle?.registrationNo} · {vehicle?.make} {vehicle?.model}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer: {customer?.fullName} · {customer?.phone}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Chip label={appt.status} color="primary" sx={{ fontWeight: 800 }} />
          </Stack>
        </Paper>

        {/* Vehicle + Customer Info */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* Timeline */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* SA Health Check Report (readonly, collapsible) */}
        {appt.inspectionChecks.length > 0 && (
          <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'info.main', '&:before': { display: 'none' }, boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'info.main', color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }}>
              <Typography sx={{ fontWeight: 900 }}>SA Health Check Report</Typography>
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
            <Alert severity="warning" sx={{ fontWeight: 700, border: '2px solid', borderColor: 'warning.main' }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>⚠ Technician Paused ({pausedItems.length})</Typography>
              {pausedItems.map((p, idx) => (
                <Box key={idx} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {p.techName} — paused "{p.itemName}"
                  </Typography>
                  {p.reason && <Typography variant="body2" color="text.secondary">{p.reason}</Typography>}
                </Box>
              ))}
            </Alert>
          )
        })()}
        {/* ── Concern Diagnosis ── */}
        {(isDiagnosisPhase || isDiagnosisComplete) && myConcerns.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'warning.main' }}>
              Concern Diagnosis ({myConcerns.length})
            </Typography>
            <Stack spacing={2}>
              {myConcerns.map((c) => {
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                const prForm = partRequestForm[c.id] ?? { name: '', qty: '1' }
                const isConcernDone = c.workStatus === 'Completed'
                return (
                <Box key={c.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: isConcernDone ? 'success.main' : 'divider' }}>
                  <Typography sx={{ fontWeight: 800 }}>{c.concernName}{typeof c.processTimeMins === 'number' ? ` (${c.processTimeMins} mins)` : ''}</Typography>
                  {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                  {c.bayId && <Typography variant="caption" color="text.secondary">Bay: {bayNameById.get(c.bayId) ?? '—'}</Typography>}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Status: {c.workStatus ?? 'Pending'} · Technicians: {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || 'None'}
                  </Typography>

                  {/* Technician timer statuses */}
                  {c.technicianAssignments.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {c.technicianAssignments.map((ta) => (
                        <Typography key={ta.id} variant="caption" sx={{ pl: 1 }}>
                          • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem' }}
                            color={ta.status === 'Completed' ? 'success' : ta.status === 'In Progress' ? 'primary' : ta.status === 'Paused' ? 'warning' : 'default'} />
                        </Typography>
                      ))}
                    </Stack>
                  )}

                  {/* Active diagnosis controls — assign techs, remark, done */}
                  {isDiagnosisPhase && !isConcernDone && (
                    <Stack spacing={1} sx={{ mt: 1 }}>
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
                      />
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        <TextField
                          select size="small" label="Technicians"
                          value={concernTechForm[c.id] ?? []}
                          onChange={(e) => setConcernTechForm((prev) => ({ ...prev, [c.id]: e.target.value as unknown as string[] }))}
                          slotProps={{ select: { multiple: true } }}
                          sx={{ minWidth: 200 }}
                        >
                          {activeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                          ))}
                        </TextField>
                        <Button size="small" variant="contained" onClick={() => saveConcernTechnicians(c.id)}>
                          Assign
                        </Button>
                        <Button size="small" variant="outlined" color="success" onClick={() => handleConcernStatus(c.id, 'Completed')}>
                          Done
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {/* ── After concern completed: Add services + parts ── */}
                  {isDiagnosisPhase && isConcernDone && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main', mb: 1 }}>
                        ✓ Concern Completed — Add Services & Parts
                      </Typography>

                      {/* Services for this concern — add one at a time */}
                      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Shop</InputLabel>
                          <Select label="Shop" value={concernServiceShopFilter} onChange={(e) => { setConcernServiceShopFilter(e.target.value as string); setConcernAddServiceId('') }}>
                            <MenuItem value="">— Shop —</MenuItem>
                            {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Autocomplete
                          size="small"
                          options={activeServices.filter((s) => s.shopId === concernServiceShopFilter && !(c.serviceIds ?? []).includes(s.id))}
                          getOptionLabel={(o) => `${o.description} (${o.code}) — ${fmtBDT(o.price)}`}
                          value={activeServices.find((s) => s.id === concernAddServiceId) ?? null}
                          onChange={(_, val) => setConcernAddServiceId(val?.id ?? '')}
                          disabled={!concernServiceShopFilter}
                          sx={{ minWidth: 280, flex: 1 }}
                          renderInput={(params) => (
                            <TextField {...params} label="Service" placeholder={!concernServiceShopFilter ? 'Select shop first' : 'Type to search…'} />
                          )}
                        />
                        <Button
                          variant="contained" size="small" sx={{ height: 40 }}
                          disabled={!concernAddServiceId}
                          onClick={() => {
                            const current = c.serviceIds ?? []
                            if (!current.includes(concernAddServiceId)) {
                              updateConcernItemServices(appt.id, c.id, [...current, concernAddServiceId])
                            }
                            setConcernAddServiceId('')
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
                              />
                            ) : null
                          })}
                        </Stack>
                      )}

                      {/* Parts for this concern — existing */}
                      {concernParts.length > 0 && (
                        <Stack spacing={0.5} sx={{ mb: 1 }}>
                          {concernParts.map((pr) => (
                            <Box key={pr.id} sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{pr.partName}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                    {typeof pr.price === 'number' ? ` · BDT ${pr.price}` : ''}
                                    {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  label={pr.status}
                                  color={pr.status === 'Fulfilled' ? 'success' : pr.status === 'Labeled' ? 'info' : pr.status === 'Rejected' ? 'error' : 'warning'}
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
                          sx={{ minWidth: 200 }}
                          placeholder="e.g. Brake Pad Set"
                        />
                        <TextField
                          size="small" label="Qty" type="number"
                          value={prForm.qty}
                          onChange={(e) => setPartRequestForm((prev) => ({ ...prev, [c.id]: { ...prForm, qty: e.target.value } }))}
                          sx={{ width: 70 }}
                        />
                        <Button
                          variant="contained"
                          color="secondary"
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
                        >
                          Request Part
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              )})}            </Stack>

            {/* Submit Diagnosis Complete */}
            {isDiagnosisPhase && allConcernsDone && (() => {
              const pendingParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.status === 'Requested')
              if (pendingParts.length > 0) {
                return (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Cannot submit diagnosis: {pendingParts.length} part request(s) still pending admin labeling.
                  </Alert>
                )
              }
              return (
                <Button
                  variant="contained" color="warning" fullWidth size="large"
                  sx={{ fontWeight: 900, mt: 2.5, py: 1.5 }}
                  onClick={handleSubmitDiagnosisComplete}
                >
                  Submit Diagnosis Complete
                </Button>
              )
            })()}
          </Paper>
        )}

        {/* ── Add Additional Services (after diagnosis) ── */}
        {isDiagnosisComplete && (
          <Paper sx={{ border: '2px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'info.main' }}>
              Add Additional Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Based on diagnosis findings, add required services. This will be sent to SA for customer approval.
            </Typography>

            {/* Existing services */}
            {appt.serviceItems.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {appt.serviceItems.map((s) => (
                  <Box key={s.id} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {s.serviceDescription} ({s.processTimeMins} mins) <Typography component="span" variant="caption" color="text.secondary">{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Shop</InputLabel>
                <Select label="Shop" value={serviceShopFilter} onChange={(e) => { setServiceShopFilter(e.target.value as string); setAddServiceId('') }}>
                  <MenuItem value="">— Select Shop —</MenuItem>
                  {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                select size="small" label="Service"
                value={addServiceId}
                onChange={(e) => setAddServiceId(e.target.value)}
                sx={{ minWidth: 250 }}
                disabled={!serviceShopFilter}
                helperText={!serviceShopFilter ? 'Select shop first' : undefined}
              >
                <MenuItem value="">— Select —</MenuItem>
                {activeServices.filter((s) => s.shopId === serviceShopFilter).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.description} ({s.code})</MenuItem>
                ))}
              </TextField>
              <TextField size="small" label="Remark" value={addServiceRemark}
                onChange={(e) => setAddServiceRemark(e.target.value)} />
              <Button variant="contained" onClick={handleAddService} disabled={!addServiceId}>
                Add
              </Button>
            </Stack>
          </Paper>
        )}

        {/* ── Service Execution ── */}
        {isServicePhase && myServices.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'success.main' }}>
              Assigned Services ({myServices.length})
            </Typography>
            <Stack spacing={2}>
              {myServices.map((s) => {
                const hasStages = s.stageItems && s.stageItems.length > 0
                return (
                <Box key={s.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {s.serviceDescription} ({s.processTimeMins} mins) <Typography component="span" variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                    </Typography>
                    {hasStages && <Chip size="small" label={`${s.stageItems!.length} stages`} color="info" variant="outlined" sx={{ fontWeight: 700 }} />}
                  </Stack>
                  <Typography variant="body2">{fmtBDT(s.price)}</Typography>
                  {s.bayId && <Typography variant="caption" color="text.secondary">Bay: {bayNameById.get(s.bayId) ?? '—'}</Typography>}

                  {/* ── Staged service: per-stage technician assignment ── */}
                  {hasStages ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5, pl: 1, borderLeft: '3px solid', borderColor: 'info.main' }}>
                      {s.stageItems!.map((stage, idx) => {
                        const prevStage = idx > 0 ? s.stageItems![idx - 1] : null
                        const isBlocked = prevStage && prevStage.workStatus !== 'Completed'
                        const stageKey = `${s.id}_${stage.id}`
                        return (
                          <Box key={stage.id} sx={{ p: 1.5, bgcolor: isBlocked ? 'action.disabledBackground' : 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider', opacity: isBlocked ? 0.6 : 1 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                Stage {stage.stageOrder}: {stage.stageName}
                              </Typography>
                              <Chip size="small" label={`${stage.durationMins}m`} color="default" sx={{ fontWeight: 700 }} />
                              <Chip size="small" label={stage.workStatus}
                                color={stage.workStatus === 'Completed' ? 'success' : stage.workStatus === 'In Progress' ? 'primary' : stage.workStatus === 'Scheduled' ? 'info' : 'default'} />
                              {stage.bayId && <Typography variant="caption" color="text.secondary">Bay: {bayNameById.get(stage.bayId) ?? '—'}</Typography>}
                            </Stack>

                            {/* Technician timer statuses */}
                            {stage.technicianAssignments.length > 0 && (
                              <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                                {stage.technicianAssignments.map((ta) => (
                                  <Typography key={ta.id} variant="caption" sx={{ pl: 1 }}>
                                    • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem' }}
                                      color={ta.status === 'Completed' ? 'success' : ta.status === 'In Progress' ? 'primary' : ta.status === 'Paused' ? 'warning' : 'default'} />
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
                                  sx={{ minWidth: 200 }}
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
                                }}>Assign</Button>
                                <Button size="small" variant="outlined" color="success" onClick={() => {
                                  setStageWorkStatus({
                                    appointmentId: appt!.id,
                                    serviceItemId: s.id,
                                    stageItemId: stage.id,
                                    status: 'Completed',
                                  })
                                  pushTimeline(appt!.id, { actor: 'SE', action: `Stage "${stage.stageName}" completed for ${s.serviceDescription}` })
                                }}>Done</Button>
                              </Stack>
                            )}
                            {isBlocked && (
                              <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                                ⏳ Waiting for "{prevStage!.stageName}" to complete
                              </Typography>
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  ) : (
                    /* ── Non-staged service: existing flow ── */
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Status: {s.workStatus ?? 'Pending'} · Technicians: {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || 'None'}
                      </Typography>

                      {/* Technician timer statuses */}
                      {s.technicianAssignments.length > 0 && (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          {s.technicianAssignments.map((ta) => (
                            <Typography key={ta.id} variant="caption" sx={{ pl: 1 }}>
                              • {userNameById.get(ta.technicianUserId) ?? '—'}: <Chip label={ta.status} size="small" sx={{ height: 18, fontSize: '0.65rem' }}
                                color={ta.status === 'Completed' ? 'success' : ta.status === 'In Progress' ? 'primary' : ta.status === 'Paused' ? 'warning' : 'default'} />
                            </Typography>
                          ))}
                        </Stack>
                      )}

                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          size="small"
                          label="SE Remark"
                          value={serviceRemarks[s.id] ?? ''}
                          onChange={(e) => setServiceRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Add service notes..."
                        />
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <TextField
                            select size="small" label="Technicians"
                            value={serviceTechForm[s.id] ?? []}
                            onChange={(e) => setServiceTechForm((prev) => ({ ...prev, [s.id]: e.target.value as unknown as string[] }))}
                            slotProps={{ select: { multiple: true } }}
                            sx={{ minWidth: 200 }}
                          >
                            {activeUsers.map((u) => (
                              <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                            ))}
                          </TextField>
                          <Button size="small" variant="contained" onClick={() => saveServiceTechnicians(s.id)}>
                            Assign
                          </Button>
                          <Button size="small" variant="outlined" color="success" onClick={() => handleServiceStatus(s.id, 'Completed')}>
                            Done
                          </Button>
                        </Stack>
                      </Stack>
                    </>
                  )}
                </Box>
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
                variant="contained" color="success" fullWidth size="large"
                sx={{ fontWeight: 900, mt: 2.5, py: 1.5 }}
                onClick={handleSubmitServiceComplete}
              >
                Submit Service Complete
              </Button>
            )}
          </Paper>
        )}
      </Stack>
    </Page>
  )
}
