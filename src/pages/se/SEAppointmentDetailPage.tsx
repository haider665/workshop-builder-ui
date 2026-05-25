import {
  Alert,
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

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const myConcerns = appt.concernItems.filter((c) => c.assignedSEUserId)
  const myServices = appt.serviceItems.filter((s) => s.assignedSEUserId)

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

        {/* SA Health Check Report (readonly) */}
        {appt.inspectionChecks.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'info.main' }}>
              SA Health Check Report
            </Typography>
            <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly />
          </Paper>
        )}

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

                      {/* Services for this concern */}
                      <TextField
                        select size="small" label="Services for this concern"
                        value={c.serviceIds ?? []}
                        onChange={(e) => updateConcernItemServices(appt.id, c.id, e.target.value as unknown as string[])}
                        slotProps={{ select: { multiple: true } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        {activeServices.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.code} — {s.description} ({fmtBDT(s.price)})</MenuItem>
                        ))}
                      </TextField>
                      {(c.serviceIds?.length ?? 0) > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                          {c.serviceIds!.map((sid) => {
                            const svc = services.find((s) => s.id === sid)
                            return svc ? <Chip key={sid} size="small" label={`${svc.description} · ${fmtBDT(svc.price)}`} color="info" /> : null
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
                <Select label="Shop" value={serviceShopFilter} onChange={(e) => setServiceShopFilter(e.target.value as string)}>
                  <MenuItem value="">All Shops</MenuItem>
                  {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                select size="small" label="Service"
                value={addServiceId}
                onChange={(e) => setAddServiceId(e.target.value)}
                sx={{ minWidth: 250 }}
              >
                <MenuItem value="">— Select —</MenuItem>
                {activeServices.filter((s) => !serviceShopFilter || s.shopId === serviceShopFilter).map((s) => (
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
              {myServices.map((s) => (
                <Box key={s.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {s.serviceDescription} ({s.processTimeMins} mins) <Typography component="span" variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                  </Typography>
                  <Typography variant="body2">{fmtBDT(s.price)}</Typography>
                  {s.bayId && <Typography variant="caption" color="text.secondary">Bay: {bayNameById.get(s.bayId) ?? '—'}</Typography>}
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
                </Box>
              ))}
            </Stack>

            {/* Submit Service Complete */}
            {myServices.every((s) => s.workStatus === 'Completed') && (
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
