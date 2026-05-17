import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Send, WhatsApp } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { useSessionStore } from '../../store/sessionStore'
import type { CWConcernWorkStatus, CWService, CWServiceWorkStatus } from '../../types/cw'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function SAAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const sessionUser = useSessionStore((s) => s.user)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const assignConcernTechnicians = useCwStore((s) => s.assignConcernTechnicians)
  const setConcernWorkStatus = useCwStore((s) => s.setConcernWorkStatus)
  const assignServiceTechnicians = useCwStore((s) => s.assignServiceTechnicians)
  const updateServiceItemAssignment = useCwStore((s) => s.updateServiceItemAssignment)
  const addWhatsappLog = useCwStore((s) => s.addWhatsappLog)
  const setCustomerApproval = useCwStore((s) => s.setCustomerApproval)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const services = useCwStore((s) => s.services)
  const addAppointmentService = useCwStore((s) => s.addAppointmentService)

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

  const activeUsers = useMemo(() => users.filter((u) => u.status === 'Active'), [users])

  // Concern technician assignment form: { [concernItemId]: string[] }
  const [concernTechForm, setConcernTechForm] = useState<Record<string, string[]>>({})
  // Service technician assignment form
  const [serviceTechForm, setServiceTechForm] = useState<Record<string, string[]>>({})

  // WhatsApp
  const [waDialogOpen, setWaDialogOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')

  // Customer approval
  const [approvalNote, setApprovalNote] = useState('')

  // Add service form
  const [selectedService, setSelectedService] = useState<CWService | null>(null)
  const [serviceRemark, setServiceRemark] = useState('')

  const activeServices = useMemo(
    () => services.filter((s) => s.status === 'Active'),
    [services],
  )

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const isDiagnosisPhase = ['Diagnosis In Progress', 'Diagnosis Complete', 'Customer Notified', 'Customer Approved', 'Customer Rejected', 'JC Assigning Services', 'Service In Progress', 'Closed'].includes(appt.status)
  const isDiagnosisDone = appt.status === 'Diagnosis Complete'
  const isNotified = appt.status === 'Customer Notified'
  const isServicePhase = ['Service In Progress', 'Closed'].includes(appt.status)

  // Show ALL concern/service items that have an SA assigned (no user filtering)
  const myConcerns = appt.concernItems.filter((c) => c.assignedSAUserId)
  const myServices = appt.serviceItems.filter((s) => s.assignedSAUserId)

  function saveConcernTechnicians(concernItemId: string) {
    const techIds = concernTechForm[concernItemId] ?? []
    if (!techIds.length) return
    assignConcernTechnicians({
      appointmentId: appt!.id,
      concernItemId,
      technicianUserIds: techIds,
    })
  }

  function handleConcernStatus(concernItemId: string, status: CWConcernWorkStatus) {
    setConcernWorkStatus({
      appointmentId: appt!.id,
      concernItemId,
      status,
    })
    // Check if ALL concerns are completed → auto-transition
    if (status === 'Completed') {
      const updated = appt!.concernItems.map((c) =>
        c.id === concernItemId ? { ...c, workStatus: 'Completed' as const } : c,
      )
      if (updated.every((c) => c.workStatus === 'Completed')) {
        setAppointmentStatus(appt!.id, 'Diagnosis Complete')
      }
    }
  }

  function saveServiceTechnicians(serviceItemId: string) {
    const techIds = serviceTechForm[serviceItemId] ?? []
    if (!techIds.length) return
    assignServiceTechnicians({
      appointmentId: appt!.id,
      serviceItemId,
      technicianUserIds: techIds,
    })
  }

  function handleServiceStatus(serviceItemId: string, status: CWServiceWorkStatus) {
    updateServiceItemAssignment({
      appointmentId: appt!.id,
      serviceItemId,
      workStatus: status,
    })
    // Check if ALL services completed → auto-close
    if (status === 'Completed') {
      const updated = appt!.serviceItems.map((s) =>
        s.id === serviceItemId ? { ...s, workStatus: 'Completed' as const } : s,
      )
      if (updated.every((s) => s.workStatus === 'Completed')) {
        setAppointmentStatus(appt!.id, 'Closed')
      }
    }
  }

  function openWhatsApp() {
    const parts = []
    parts.push(`*Diagnosis Summary*`)
    if (customer) parts.push(`Customer: ${customer.fullName}`)
    if (vehicle) parts.push(`Vehicle: ${vehicle.registrationNo} - ${vehicle.make ?? ''} ${vehicle.model ?? ''}`)
    parts.push(`\n*Concerns Diagnosed:*`)
    appt!.concernItems.forEach((c, i) => {
      parts.push(`${i + 1}. ${c.concernName}${c.remark ? ` — ${c.remark}` : ''}`)
    })
    parts.push(`\n*Services Recommended:*`)
    appt!.serviceItems.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.serviceDescription} — ${fmtBDT(s.price)}`)
    })
    const total = appt!.serviceItems.reduce((sum, s) => sum + s.price, 0)
    parts.push(`\n*Total Estimate: ${fmtBDT(total)}*`)
    parts.push(`\nPlease confirm your approval.`)
    setWaMessage(parts.join('\n'))
    setWaDialogOpen(true)
  }

  function sendWhatsapp() {
    if (!waMessage.trim()) return
    addWhatsappLog({
      appointmentId: appt!.id,
      message: waMessage.trim(),
      direction: 'outbound',
      authorName: sessionUser?.name ?? 'SA',
    })
    setAppointmentStatus(appt!.id, 'Customer Notified')
    setWaDialogOpen(false)
    setWaMessage('')
  }

  function handleApproval(decision: 'Approved' | 'Rejected') {
    setCustomerApproval({
      appointmentId: appt!.id,
      status: decision,
      note: approvalNote.trim() || undefined,
    })
  }

  function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
    const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
      'Diagnosis In Progress': 'primary',
      'Diagnosis Complete': 'warning',
      'Customer Notified': 'warning',
      'Customer Approved': 'success',
      'Customer Rejected': 'error',
      'Service In Progress': 'primary',
      'Closed': 'success',
    }
    return map[status] ?? 'default'
  }

  return (
    <Page title="SA — Appointment" subtitle={`#${appt.id.slice(0, 8)}`}>
      <Stack spacing={2.5}>
        {/* ── Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Vehicle</Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {vehicle?.registrationNo ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Customer</Typography>
              <Typography sx={{ fontWeight: 700 }}>{customer?.fullName ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{customer?.phone ?? ''}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={appt.status} size="small" color={statusColor(appt.status)} sx={{ fontWeight: 700, mt: 0.5 }} />
            </Box>
          </Stack>
        </Paper>

        {/* ── Diagnosis Phase: Assign Technicians & Track ── */}
        {isDiagnosisPhase && myConcerns.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'primary.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'primary.main' }}>
              Diagnosis — My Assigned Concerns
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign technicians and track diagnosis progress.
            </Typography>

            <Stack spacing={2}>
              {myConcerns.map((c) => {
                const hasTechs = c.assignedTechnicianUserIds && c.assignedTechnicianUserIds.length > 0
                const techForm = concernTechForm[c.id] ?? []
                return (
                  <Box key={c.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.concernName}</Typography>
                        {c.remark && <Typography variant="caption" color="text.secondary">{c.remark}</Typography>}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {c.plannedStartAt ? `${fmtDateTime(c.plannedStartAt)} → ${fmtDateTime(c.plannedEndAt)}` : ''}
                        </Typography>
                      </Box>
                      {c.workStatus && (
                        <Chip
                          label={c.workStatus}
                          size="small"
                          color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    {!hasTechs ? (
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <TextField
                          select
                          size="small"
                          label="Assign Technicians"
                          value={techForm}
                          onChange={(e) => {
                            const v = e.target.value
                            const ids = Array.isArray(v) ? (v as string[]) : [String(v)]
                            setConcernTechForm((p) => ({ ...p, [c.id]: ids.filter(Boolean) }))
                          }}
                          slotProps={{ select: { multiple: true, renderValue: (s) => (s as string[]).map((id) => userNameById.get(id)).filter(Boolean).join(', ') || '—' } }}
                          sx={{ minWidth: 240 }}
                        >
                          {activeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                          ))}
                        </TextField>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!techForm.length}
                          onClick={() => saveConcernTechnicians(c.id)}
                        >
                          Save
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Technicians:</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {(c.assignedTechnicianUserIds ?? []).map((id) => userNameById.get(id)).filter(Boolean).join(', ')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {c.workStatus !== 'In Progress' && c.workStatus !== 'Completed' && (
                            <Button size="small" variant="outlined" color="primary"
                              onClick={() => handleConcernStatus(c.id, 'In Progress')}
                            >
                              Start Work
                            </Button>
                          )}
                          {c.workStatus === 'In Progress' && (
                            <>
                              <Button size="small" variant="outlined" color="warning"
                                onClick={() => handleConcernStatus(c.id, 'Pending')}
                              >
                                Pause
                              </Button>
                              <Button size="small" variant="contained" color="success"
                                onClick={() => handleConcernStatus(c.id, 'Completed')}
                              >
                                Complete
                              </Button>
                            </>
                          )}
                          {c.workStatus === 'Completed' && (
                            <Chip label="✓ Completed" color="success" size="small" sx={{ fontWeight: 700 }} />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        )}

        {/* ── Add Services (after diagnosis, before sending to customer) ── */}
        {(isDiagnosisDone || isNotified) && (
          <Paper sx={{ border: '2px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'info.main' }}>
              Add Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add recommended services based on diagnosis findings. These will be included in the WhatsApp message to customer.
            </Typography>

            {/* Current services list */}
            {appt.serviceItems.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Current Services ({appt.serviceItems.length})</Typography>
                {appt.serviceItems.map((s) => (
                  <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{s.serviceDescription} <Typography component="span" variant="caption" color="text.secondary">{s.serviceCode}</Typography></Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>BDT {s.price.toLocaleString('en-BD')}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                  <Typography sx={{ fontWeight: 900 }}>Total: BDT {appt.serviceItems.reduce((sum, s) => sum + s.price, 0).toLocaleString('en-BD')}</Typography>
                </Box>
              </Box>
            )}

            {/* Add service form */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <TextField
                select
                size="small"
                label="Service"
                value={selectedService?.id ?? ''}
                onChange={(e) => {
                  const svc = activeServices.find((s) => s.id === e.target.value) ?? null
                  setSelectedService(svc)
                }}
                sx={{ minWidth: 280 }}
              >
                <MenuItem value="">— Select service —</MenuItem>
                {activeServices.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.description} · {s.code} · BDT {s.price.toLocaleString('en-BD')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Remark"
                value={serviceRemark}
                onChange={(e) => setServiceRemark(e.target.value)}
                sx={{ minWidth: 180 }}
              />
              <Button
                variant="contained"
                color="info"
                startIcon={<Add />}
                disabled={!selectedService}
                onClick={() => {
                  if (!selectedService) return
                  addAppointmentService({
                    appointmentId: appt!.id,
                    serviceId: selectedService.id,
                    serviceCode: selectedService.code,
                    serviceDescription: selectedService.description,
                    timeHrs: selectedService.timeHrs,
                    ratePerHr: selectedService.ratePerHr,
                    price: selectedService.price,
                    remark: serviceRemark.trim(),
                    addedBySA: true,
                  })
                  setSelectedService(null)
                  setServiceRemark('')
                }}
              >
                Add
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Diagnosis Complete: WhatsApp + Approval ── */}
        {(isDiagnosisDone || isNotified) && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'warning.main' }}>
              Diagnosis Complete — Customer Communication
            </Typography>

            {isDiagnosisDone && (
              <Box sx={{ mb: 2.5 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<WhatsApp />}
                  onClick={openWhatsApp}
                  sx={{ fontWeight: 700 }}
                >
                  Send WhatsApp to Customer
                </Button>
              </Box>
            )}

            {/* WhatsApp log */}
            {appt.whatsappLogs.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Messages</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Direction</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {appt.whatsappLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell><Typography variant="caption">{fmtDateTime(log.sentAt)}</Typography></TableCell>
                        <TableCell>
                          <Chip label={log.direction} size="small" color={log.direction === 'outbound' ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{log.message}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Customer Approval toggle */}
            {isNotified && appt.customerApprovalStatus === 'Pending' && (
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Customer Approval</Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Note (optional)"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    sx={{ maxWidth: 400 }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="success" onClick={() => handleApproval('Approved')}>
                      Mark Approved
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleApproval('Rejected')}>
                      Mark Rejected
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}

            {appt.customerApprovalStatus === 'Approved' && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                  ✓ Customer approved — JC will assign services next.
                </Typography>
              </Box>
            )}
            {appt.customerApprovalStatus === 'Rejected' && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  ❌ Customer rejected.
                </Typography>
                {appt.customerApprovalNote && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>Note: {appt.customerApprovalNote}</Typography>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* ── Service Phase: Assign Technicians & Track ── */}
        {isServicePhase && myServices.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'primary.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'primary.main' }}>
              Service Phase — My Assigned Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign technicians and track service progress.
            </Typography>

            <Stack spacing={2}>
              {myServices.map((s) => {
                const hasTechs = s.assignedUserIds && s.assignedUserIds.length > 0
                const techForm = serviceTechForm[s.id] ?? []
                return (
                  <Box key={s.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                        {s.bayId && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Bay: {bayNameById.get(s.bayId) ?? '—'}
                          </Typography>
                        )}
                      </Box>
                      {s.workStatus && (
                        <Chip
                          label={s.workStatus}
                          size="small"
                          color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    {!hasTechs ? (
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <TextField
                          select
                          size="small"
                          label="Assign Technicians"
                          value={techForm}
                          onChange={(e) => {
                            const v = e.target.value
                            const ids = Array.isArray(v) ? (v as string[]) : [String(v)]
                            setServiceTechForm((p) => ({ ...p, [s.id]: ids.filter(Boolean) }))
                          }}
                          slotProps={{ select: { multiple: true, renderValue: (sel) => (sel as string[]).map((id) => userNameById.get(id)).filter(Boolean).join(', ') || '—' } }}
                          sx={{ minWidth: 240 }}
                        >
                          {activeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                          ))}
                        </TextField>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!techForm.length}
                          onClick={() => saveServiceTechnicians(s.id)}
                        >
                          Save
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Technicians:</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {(s.assignedUserIds ?? []).map((id) => userNameById.get(id)).filter(Boolean).join(', ')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {s.workStatus !== 'In Progress' && s.workStatus !== 'Completed' && (
                            <Button size="small" variant="outlined" color="primary"
                              onClick={() => handleServiceStatus(s.id, 'In Progress')}
                            >
                              Start Work
                            </Button>
                          )}
                          {s.workStatus === 'In Progress' && (
                            <>
                              <Button size="small" variant="outlined" color="warning"
                                onClick={() => handleServiceStatus(s.id, 'Pending')}
                              >
                                Pause
                              </Button>
                              <Button size="small" variant="contained" color="success"
                                onClick={() => handleServiceStatus(s.id, 'Completed')}
                              >
                                Complete
                              </Button>
                            </>
                          )}
                          {s.workStatus === 'Completed' && (
                            <Chip label="✓ Completed" color="success" size="small" sx={{ fontWeight: 700 }} />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        )}

        {appt.status === 'Closed' && (
          <Paper sx={{ border: '1px solid', borderColor: 'success.main', p: 2.5 }}>
            <Chip label="✓ Appointment Closed" color="success" sx={{ fontWeight: 700 }} />
          </Paper>
        )}
      </Stack>

      {/* WhatsApp compose dialog */}
      <Dialog open={waDialogOpen} onClose={() => setWaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
            <WhatsApp color="success" />
            <Typography sx={{ fontWeight: 700 }}>Send WhatsApp Message</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {customer?.phone && (
              <Typography variant="body2" color="text.secondary">
                To: {customer.phone} ({customer.fullName})
              </Typography>
            )}
            <TextField
              label="Message"
              multiline
              minRows={6}
              fullWidth
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Send />}
            onClick={sendWhatsapp}
            disabled={!waMessage.trim()}
          >
            Log &amp; Send
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
