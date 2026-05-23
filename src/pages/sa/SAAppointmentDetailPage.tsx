import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  Typography,
} from '@mui/material'
import { Send } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import type { CWInspectionCheck } from '../../types/cw'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function SAAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const services = useCwStore((s) => s.services)
  const submitInspection = useCwStore((s) => s.submitInspection)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const addWhatsappLog = useCwStore((s) => s.addWhatsappLog)
  const setCustomerApproval = useCwStore((s) => s.setCustomerApproval)
  const addAppointmentService = useCwStore((s) => s.addAppointmentService)
  const addAppointmentConcern = useCwStore((s) => s.addAppointmentConcern)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const confirmPayment = useCwStore((s) => s.confirmPayment)
  const partRequests = useCwStore((s) => s.partRequests)
  const shops = useCwStore((s) => s.shops)
  const concernCategories = useCwStore((s) => s.concernCategories)

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

  const activeServices = useMemo(() => services.filter((s) => s.status === 'Active'), [services])
  const concerns = useCwStore((s) => s.concerns)
  const activeConcerns = useMemo(() => concerns.filter((c) => c.status === 'Active'), [concerns])

  // Inspection state
  const [inspChecks, setInspChecks] = useState<CWInspectionCheck[]>(appt?.inspectionChecks ?? [])

  // WhatsApp dialog
  const [waDialogOpen, setWaDialogOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waDialogPurpose, setWaDialogPurpose] = useState<'concern-approval' | 'service-approval' | 'payment'>('concern-approval')

  // Approval dialog
  const [approvalNote, setApprovalNote] = useState('')

  // Add concern/service forms
  const [addConcernId, setAddConcernId] = useState('')
  const [addConcernRemark, setAddConcernRemark] = useState('')
  const [addServiceId, setAddServiceId] = useState('')
  const [addServiceRemark, setAddServiceRemark] = useState('')
  const [concernShopFilter, setConcernShopFilter] = useState('')
  const [serviceShopFilter, setServiceShopFilter] = useState('')

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])
  const concernShopId = useMemo(() => {
    const cMap = new Map(concerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (cId: string) => catMap.get(cMap.get(cId)?.categoryId ?? '')?.shopId ?? ''
  }, [concerns, concernCategories])
  const serviceShopIdMap = useMemo(() => new Map(services.map((s) => [s.id, s.shopId])), [services])

  if (!appt) {
    return (
      <Page title="SA — Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const isInspection = appt.status === 'SA Inspection'
  const isReviewed = appt.status === 'SA Reviewed'
  const isCustomerNotified = appt.status === 'Customer Notified'
  const isDiagnosisComplete = appt.status === 'Diagnosis Complete'
  const isServiceApprovalPending = appt.status === 'Service Approval Pending'
  const isServiceComplete = appt.status === 'Service Complete'
  const isPaymentPending = appt.status === 'Payment Pending'

  // SA can send WhatsApp for initial concern approval
  const canSendConcernWA = isReviewed
  // SA can send WhatsApp for service approval after diagnosis
  const canSendServiceWA = isDiagnosisComplete
  // SA can approve/reject (1st round: concerns, 2nd round: services)
  const canApprove = isCustomerNotified || isServiceApprovalPending
  // SA can send payment WA
  const canSendPaymentWA = isServiceComplete
  // SA can confirm payment
  const canConfirmPayment = isPaymentPending

  function handleSubmitInspection() {
    submitInspection({
      appointmentId: appt!.id,
      checks: inspChecks,
      actorName: userNameById.get(appt!.assignedSAUserId ?? '') ?? 'SA',
    })
  }

  function openWhatsApp(purpose: 'concern-approval' | 'service-approval' | 'payment') {
    setWaDialogPurpose(purpose)
    const name = customer?.fullName ?? 'Customer'
    const reg = vehicle?.registrationNo ?? ''

    if (purpose === 'concern-approval') {
      const concernBlock = appt!.concernItems.map((c) => {
        let block = `• ${c.concernName}`
        if (c.remark) block += `\n  Note: ${c.remark}`
        return block
      }).join('\n')
      const serviceList = appt!.serviceItems.map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const total = appt!.serviceItems.reduce((sum, s) => sum + s.price, 0)
      setWaMessage(`Dear ${name},\n\nVehicle: ${reg}\n\nConcerns:\n${concernBlock}\n\nProposed Services:\n${serviceList}\n\nEstimated Total: ${fmtBDT(total)}\n\nPlease confirm.`)
    } else if (purpose === 'service-approval') {
      const allParts = partRequests.filter((pr) => pr.appointmentId === appt!.id)
      const concernBlock = appt!.concernItems.map((c) => {
        const lines: string[] = [`• ${c.concernName}`]
        if (c.diagnosisRemark) lines.push(`  Diagnosis: ${c.diagnosisRemark}`)
        const cServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
        if (cServices.length > 0) {
          lines.push(`  Services: ${cServices.map((s) => s ? `${s.code} (${fmtBDT(s.price)})` : '').join(', ')}`)
        }
        const cParts = allParts.filter((pr) => pr.concernItemId === c.id)
        if (cParts.length > 0) {
          lines.push(`  Parts: ${cParts.map((pr) => `${pr.partName} x${pr.quantity ?? 1}${typeof pr.price === 'number' ? ` (${fmtBDT(pr.price)})` : ''}${pr.deliveryDate ? ` ETA: ${pr.deliveryDate}` : ''}`).join(', ')}`)
        }
        return lines.join('\n')
      }).join('\n\n')
      const globalServices = appt!.serviceItems.map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const partsTotal = allParts.filter((pr) => typeof pr.price === 'number').reduce((sum, pr) => sum + (pr.price! * (pr.quantity ?? 1)), 0)
      const serviceTotal = appt!.serviceItems.reduce((sum, s) => sum + s.price, 0)
      const grandTotal = serviceTotal + partsTotal
      setWaMessage(`Dear ${name},\n\nVehicle: ${reg}\n\nDiagnosis Report:\n${concernBlock}\n\nAll Services:\n${globalServices}\n\nServices Total: ${fmtBDT(serviceTotal)}${partsTotal > 0 ? `\nParts Total: ${fmtBDT(partsTotal)}` : ''}\nGrand Total: ${fmtBDT(grandTotal)}\n\nPlease confirm to proceed.`)
    } else {
      const allParts = partRequests.filter((pr) => pr.appointmentId === appt!.id)
      const serviceList = appt!.serviceItems.map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const partsTotal = allParts.filter((pr) => typeof pr.price === 'number').reduce((sum, pr) => sum + (pr.price! * (pr.quantity ?? 1)), 0)
      const serviceTotal = appt!.serviceItems.reduce((sum, s) => sum + s.price, 0)
      const grandTotal = serviceTotal + partsTotal
      let partBlock = ''
      if (allParts.length > 0) {
        partBlock = `\n\nParts Used:\n${allParts.map((pr) => `• ${pr.partName} x${pr.quantity ?? 1}${typeof pr.price === 'number' ? ` — ${fmtBDT(pr.price * (pr.quantity ?? 1))}` : ''}`).join('\n')}`
      }
      setWaMessage(`Dear ${name},\n\nGreat news! Your vehicle ${reg} is ready for pickup.\n\nCompleted Services:\n${serviceList}${partBlock}\n\nServices: ${fmtBDT(serviceTotal)}${partsTotal > 0 ? `\nParts: ${fmtBDT(partsTotal)}` : ''}\nTotal Due: ${fmtBDT(grandTotal)}\n\nPickup Hours: 9:00 AM - 6:00 PM (Sat-Thu)\n\nPlease make payment at the cashier counter to collect your vehicle. We accept Cash, Card, and Mobile Banking.\n\nThank you for choosing Continental Workshop!`)
    }
    setWaDialogOpen(true)
  }

  function sendWhatsapp() {
    addWhatsappLog({
      appointmentId: appt!.id,
      direction: 'outbound',
      authorName: userNameById.get(appt!.assignedSAUserId ?? '') ?? 'SA',
      message: waMessage.trim(),
    })

    if (waDialogPurpose === 'concern-approval') {
      setAppointmentStatus(appt!.id, 'Customer Notified')
      pushTimeline(appt!.id, { actor: 'SA', action: 'WhatsApp sent for concern/service approval' })
    } else if (waDialogPurpose === 'service-approval') {
      setAppointmentStatus(appt!.id, 'Service Approval Pending')
      pushTimeline(appt!.id, { actor: 'SA', action: 'WhatsApp sent for service approval (post-diagnosis)' })
    } else {
      setAppointmentStatus(appt!.id, 'Payment Pending')
      pushTimeline(appt!.id, { actor: 'SA', action: 'WhatsApp sent for payment' })
    }

    setWaDialogOpen(false)
    setWaMessage('')
  }

  function handleApproval(status: 'Approved' | 'Rejected') {
    setCustomerApproval({ appointmentId: appt!.id, status, note: approvalNote.trim() || undefined })

    if (status === 'Approved') {
      if (isCustomerNotified) {
        // 1st approval → goes to JC for diagnosis assignment
        setAppointmentStatus(appt!.id, 'Customer Approved')
        pushTimeline(appt!.id, { actor: 'SA', action: 'Customer approved concerns — ready for JC diagnosis assignment' })
      } else if (isServiceApprovalPending) {
        // 2nd approval → goes to JC for service assignment
        setAppointmentStatus(appt!.id, 'Service Approved')
        pushTimeline(appt!.id, { actor: 'SA', action: 'Customer approved services — ready for JC service assignment' })
      }
    } else {
      setAppointmentStatus(appt!.id, 'Customer Rejected')
      pushTimeline(appt!.id, { actor: 'SA', action: `Customer rejected${approvalNote.trim() ? `: ${approvalNote.trim()}` : ''}` })
    }
    setApprovalNote('')
  }

  function handleConfirmPayment() {
    confirmPayment({ appointmentId: appt!.id, actorName: 'SA' })
  }

  function handleAddConcern() {
    const concern = activeConcerns.find((c) => c.id === addConcernId)
    if (!concern) return
    addAppointmentConcern({
      appointmentId: appt!.id,
      concernId: concern.id,
      concernName: concern.name,
      remark: addConcernRemark.trim(),
    })
    pushTimeline(appt!.id, { actor: 'SA', action: `Added concern: ${concern.name}` })
    setAddConcernId('')
    setAddConcernRemark('')
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
      addedBySA: true,
    })
    pushTimeline(appt!.id, { actor: 'SA', action: `Added service: ${svc.description}` })
    setAddServiceId('')
    setAddServiceRemark('')
  }

  return (
    <Page title={`SA — ${vehicle?.registrationNo ?? 'Appointment'}`} subtitle={customer?.fullName ?? ''}>
      <Stack spacing={2.5}>
        {/* ── Header ── */}
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

        {/* ── Vehicle + Customer Info ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* ── Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* ── Inspection Checklist ── */}
        {isInspection && inspChecks.length > 0 && (
          <SAInspectionTabs checks={inspChecks} onChange={setInspChecks} />
        )}

        {/* ── Concerns ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 900 }}>Concerns ({appt.concernItems.length})</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={concernShopFilter} onChange={(e) => setConcernShopFilter(e.target.value as string)}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            {concernShopFilter && <Chip label={shopById.get(concernShopFilter)?.name} onDelete={() => setConcernShopFilter('')} color="primary" size="small" />}
          </Stack>
          {appt.concernItems.length > 0 && (
            <Stack spacing={2}>
              {appt.concernItems.filter((c) => !concernShopFilter || concernShopId(c.concernId) === concernShopFilter).map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                return (
                  <Box key={c.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: c.workStatus === 'Completed' ? 'success.main' : 'divider' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 800 }}>{c.concernName}</Typography>
                        {typeof c.processTimeMins === 'number' && (
                          <Chip size="small" label={`${c.processTimeMins} mins`} color="info" sx={{ fontWeight: 700 }} />
                        )}
                      </Stack>
                      {c.workStatus ? (
                        <Chip label={c.workStatus} size="small" color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} />
                      ) : null}
                    </Stack>
                    {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.code} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Parts for this concern */}
                    {concernParts.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>Parts:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {concernParts.map((pr) => (
                            <Stack key={pr.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5, bgcolor: 'white', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{pr.partName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                  {typeof pr.price === 'number' ? ` · ${fmtBDT(pr.price)}` : ''}
                                  {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                </Typography>
                              </Box>
                              <Chip size="small" label={pr.status}
                                color={pr.status === 'Fulfilled' ? 'success' : pr.status === 'Labeled' ? 'info' : pr.status === 'Rejected' ? 'error' : 'warning'}
                              />
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
          {/* Add concern (during inspection) */}
          {isInspection && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <TextField select size="small" label="Add Concern" value={addConcernId}
                onChange={(e) => setAddConcernId(e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">— Select —</MenuItem>
                {activeConcerns.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Remark" value={addConcernRemark}
                onChange={(e) => setAddConcernRemark(e.target.value)} />
              <Button variant="contained" size="small" onClick={handleAddConcern} disabled={!addConcernId}>Add</Button>
            </Stack>
          )}
        </Paper>

        {/* ── Services ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 900 }}>Services ({appt.serviceItems.length})</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={serviceShopFilter} onChange={(e) => setServiceShopFilter(e.target.value as string)}>
                <MenuItem value="">All Shops</MenuItem>
                {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            {serviceShopFilter && <Chip label={shopById.get(serviceShopFilter)?.name} onDelete={() => setServiceShopFilter('')} color="primary" size="small" />}
          </Stack>
          {appt.serviceItems.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.filter((s) => !serviceShopFilter || (serviceShopIdMap.get(s.serviceId) ?? '') === serviceShopFilter).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription} ({s.processTimeMins} mins)</Typography>
                      <Typography variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell>{fmtBDT(s.price)}</TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip label={s.workStatus} size="small" color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'} />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Add service (during inspection) */}
          {isInspection && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <TextField select size="small" label="Add Service" value={addServiceId}
                onChange={(e) => setAddServiceId(e.target.value)} sx={{ minWidth: 250 }}>
                <MenuItem value="">— Select —</MenuItem>
                {activeServices.map((s) => <MenuItem key={s.id} value={s.id}>{s.description} ({s.code})</MenuItem>)}
              </TextField>
              <TextField size="small" label="Remark" value={addServiceRemark}
                onChange={(e) => setAddServiceRemark(e.target.value)} />
              <Button variant="contained" size="small" onClick={handleAddService} disabled={!addServiceId}>Add</Button>
            </Stack>
          )}
        </Paper>

        {/* ── Submit Inspection ── */}
        {isInspection && (
          <Button variant="contained" color="info" size="large" fullWidth
            sx={{ fontWeight: 900, py: 1.5 }} onClick={handleSubmitInspection}>
            Submit Inspection
          </Button>
        )}

        {/* ── WhatsApp: Concern Approval (1st round) ── */}
        {canSendConcernWA && (
          <Paper sx={{ border: '2px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'info.main' }}>
              Send WhatsApp for Customer Approval
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Review complete. Send concerns and services to customer for approval.
            </Typography>
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('concern-approval')}>
              Compose WhatsApp
            </Button>
          </Paper>
        )}

        {/* ── WhatsApp: Service Approval (2nd round, after diagnosis) ── */}
        {canSendServiceWA && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'warning.main' }}>
              Diagnosis Complete — Send Service Approval
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              SE completed diagnosis and may have added services. Send updated list to customer.
            </Typography>
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('service-approval')}>
              Compose WhatsApp (Services)
            </Button>
          </Paper>
        )}

        {/* ── Customer Approval (both rounds) ── */}

        {/* ── WhatsApp: Payment (after services complete) ── */}
        {canSendPaymentWA && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'warning.main' }}>
              Services Complete — Send Payment Request
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              All services finished. Send payment request to customer.
            </Typography>
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('payment')}>
              Compose WhatsApp (Payment)
            </Button>
          </Paper>
        )}

        {/* ── Confirm Payment ── */}
        {canConfirmPayment && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'success.main' }}>
              Confirm Payment Received
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Gate pass will be auto-issued upon confirmation.
            </Typography>
            <Button variant="contained" color="success" size="large" onClick={handleConfirmPayment}
              sx={{ fontWeight: 900 }}>
              Payment Received — Issue Gate Pass
            </Button>
          </Paper>
        )}

        {/* ── WhatsApp Message Log ── */}
        {appt.whatsappLogs.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
              WhatsApp Messages ({appt.whatsappLogs.length})
            </Typography>
            <Stack spacing={1.5}>
              {appt.whatsappLogs.slice().reverse().map((log) => (
                <Box key={log.id} sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: log.direction === 'outbound' ? 'success.50' : 'grey.50',
                  border: '1px solid',
                  borderColor: log.direction === 'outbound' ? 'success.200' : 'divider',
                  borderLeft: '4px solid',
                  borderLeftColor: log.direction === 'outbound' ? 'success.main' : 'info.main',
                }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {log.authorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.direction === 'outbound' ? '→ Customer' : '← Customer'}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.sentAt).toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* ── Customer Approval (both rounds) ── */}
        {canApprove && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'success.main' }}>
              {isCustomerNotified ? 'Record Customer Approval (Concerns)' : 'Record Customer Approval (Services)'}
            </Typography>
            <TextField label="Customer Note (optional)" value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)} fullWidth multiline minRows={2} sx={{ mb: 1.5 }} />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" color="success" onClick={() => handleApproval('Approved')}>Approve</Button>
              <Button variant="outlined" color="error" onClick={() => handleApproval('Rejected')}>Reject</Button>
            </Stack>
          </Paper>
        )}
      </Stack>

      {/* WhatsApp Dialog */}
      <Dialog open={waDialogOpen} onClose={() => setWaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compose WhatsApp Message</DialogTitle>
        <DialogContent>
          <TextField value={waMessage} onChange={(e) => setWaMessage(e.target.value)}
            fullWidth multiline minRows={8} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<Send />} onClick={sendWhatsapp} disabled={!waMessage.trim()}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
