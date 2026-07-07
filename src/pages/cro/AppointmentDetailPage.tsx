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
import { Send } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { useCwStore } from '../../store/cwStore'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}


function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    'New': 'info',
    'SA Inspection': 'primary',
    'SA Reviewed': 'warning',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Approval Pending': 'warning',
    'Service Approved': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    Released: 'success',
  }
  return map[status] ?? 'default'
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const catalogServices = useCwStore((s) => s.services)
  const partRequests = useCwStore((s) => s.partRequests)
  const shops = useCwStore((s) => s.shops)
  const allConcerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)
  const addWhatsappLog = useCwStore((s) => s.addWhatsappLog)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const setCustomerApproval = useCwStore((s) => s.setCustomerApproval)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const confirmPayment = useCwStore((s) => s.confirmPayment)
  const assignQC = useCwStore((s) => s.assignQC)
  const assignSA = useCwStore((s) => s.assignSA)
  const roles = useCwStore((s) => s.roles)

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

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])

  // Concern → shop name lookup: concernId → concern → categoryId → category → shopId → shop
  const getConcernShopName = useMemo(() => {
    const cMap = new Map(allConcerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (concernId: string) => {
      const concern = cMap.get(concernId)
      if (!concern) return ''
      const shopId = catMap.get(concern.categoryId)?.shopId ?? ''
      return shopById.get(shopId)?.name ?? ''
    }
  }, [allConcerns, concernCategories, shopById])

  // Service → shop name lookup: serviceId → service → shopId → shop
  const getServiceShopName = useMemo(() => {
    const sMap = new Map(catalogServices.map((s) => [s.id, s]))
    return (serviceId: string) => {
      const svc = sMap.get(serviceId)
      return svc ? shopById.get(svc.shopId)?.name ?? '' : ''
    }
  }, [catalogServices, shopById])

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const totalBDT = appt.serviceItems.reduce((sum, s) => sum + s.price, 0)

  // ── Workflow flags ──
  const isReviewed = appt.status === 'SA Reviewed'
  const isCustomerNotified = appt.status === 'Customer Notified'
  const isDiagnosisComplete = appt.status === 'Diagnosis Complete'
  const isServiceApprovalPending = appt.status === 'Service Approval Pending'
  const isServiceComplete = appt.status === 'Service Complete'
  const isQCApproved = appt.status === 'QC Approved'
  const isPaymentPending = appt.status === 'Payment Pending'

  const canSendConcernWA = isReviewed
  const canSendServiceWA = isDiagnosisComplete
  const canApprove = isCustomerNotified || isServiceApprovalPending
  const canAssignQC = isServiceComplete
  const canSendPaymentWA = isQCApproved
  const canConfirmPayment = isPaymentPending

  // WhatsApp dialog state
  const [waDialogOpen, setWaDialogOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waDialogPurpose, setWaDialogPurpose] = useState<'concern-approval' | 'service-approval' | 'payment'>('concern-approval')
  const [approvalNote, setApprovalNote] = useState('')

  // QC user selection
  const qcRoleId = useMemo(() => roles.find((r) => r.name === 'QC')?.id, [roles])
  const activeQCUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && qcRoleId && u.roleIds.includes(qcRoleId)),
    [users, qcRoleId],
  )
  const [selectedQCUserId, setSelectedQCUserId] = useState('')
  const [selectedSAUserId, setSelectedSAUserId] = useState('')

  // SA user list
  const saRoleId = useMemo(() => roles.find((r) => r.name === 'SA')?.id, [roles])
  const activeSAUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && saRoleId && u.roleIds.includes(saRoleId)),
    [users, saRoleId],
  )
  const assignedSA = useMemo(
    () => (appt ? users.find((u) => u.id === appt.assignedSAUserId) : null),
    [users, appt],
  )

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
        const cServices = (c.serviceIds ?? []).map((sid) => catalogServices.find((s) => s.id === sid)).filter(Boolean)
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
      authorName: 'CRE',
      message: waMessage.trim(),
    })
    if (waDialogPurpose === 'concern-approval') {
      setAppointmentStatus(appt!.id, 'Customer Notified')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for concern/service approval' })
    } else if (waDialogPurpose === 'service-approval') {
      setAppointmentStatus(appt!.id, 'Service Approval Pending')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for service approval (post-diagnosis)' })
    } else {
      setAppointmentStatus(appt!.id, 'Payment Pending')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for payment' })
    }
    setWaDialogOpen(false)
    setWaMessage('')
  }

  function handleApproval(status: 'Approved' | 'Rejected') {
    setCustomerApproval({ appointmentId: appt!.id, status, note: approvalNote.trim() || undefined })
    if (status === 'Approved') {
      if (isCustomerNotified) {
        setAppointmentStatus(appt!.id, 'Customer Approved')
        pushTimeline(appt!.id, { actor: 'CRE', action: 'Customer approved concerns — ready for JC diagnosis assignment' })
      } else if (isServiceApprovalPending) {
        setAppointmentStatus(appt!.id, 'Service Approved')
        pushTimeline(appt!.id, { actor: 'CRE', action: 'Customer approved services — ready for JC service assignment' })
      }
    } else {
      setAppointmentStatus(appt!.id, 'Customer Rejected')
      pushTimeline(appt!.id, { actor: 'CRE', action: `Customer rejected${approvalNote.trim() ? `: ${approvalNote.trim()}` : ''}` })
    }
    setApprovalNote('')
  }

  return (
    <Page title="Appointment" subtitle={`#${appt.id.slice(0, 8)}`}>
      <Stack spacing={2.5}>
        {/* ── Workflow Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* ── Vehicle & Customer Info (collapsible) ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

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
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>{fmtBDT(totalBDT)}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Typography variant="body2">{fmtDate(appt.createdAt)}</Typography>
            </Box>
          </Stack>
          {appt.slotDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Slot: {fmtDate(appt.slotDate)} {appt.slotTime ?? ''}
            </Typography>
          )}
          {appt.concerns && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Notes: {appt.concerns}
            </Typography>
          )}
        </Paper>

        {/* ── Service Advisor Assignment ── */}
        {!appt.assignedSAUserId ? (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'warning.main' }}>
              No Service Advisor Assigned
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField select size="small" label="Assign Service Advisor" value={selectedSAUserId}
                onChange={(e) => setSelectedSAUserId(e.target.value)} sx={{ minWidth: 280 }}>
                <MenuItem value="">— Select SA —</MenuItem>
                {activeSAUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
              </TextField>
              <Button variant="contained" color="warning" disabled={!selectedSAUserId}
                onClick={() => { assignSA(appt.id, selectedSAUserId); setSelectedSAUserId('') }}>
                Assign SA
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Service Advisor: <strong>{assignedSA?.fullName ?? appt.assignedSAUserId}</strong>
            </Typography>
          </Paper>
        )}

        {/* ── Concerns ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Concerns ({appt.concernItems.length})
          </Typography>
          {appt.concernItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No concerns listed.</Typography>
          ) : (
            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => catalogServices.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                const shopName = getConcernShopName(c.concernId)
                return (
                  <Box key={c.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: c.workStatus === 'Completed' ? 'success.main' : 'divider' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {c.concernName}
                        {typeof c.processTimeMins === 'number' && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'info.main', color: 'white', borderRadius: 1, fontWeight: 700 }}>
                            {c.processTimeMins}m
                          </Typography>
                        )}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {shopName && <Chip size="small" label={shopName} color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />}
                        {c.assignedSEUserId && <Chip size="small" label={userNameById.get(c.assignedSEUserId) ?? '—'} variant="outlined" />}
                        {c.bayId && <Chip size="small" label={bayNameById.get(c.bayId) ?? '—'} variant="outlined" />}
                        {c.workStatus ? (
                          <Chip label={c.workStatus} size="small" color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700 }} />
                        ) : null}
                      </Stack>
                    </Stack>
                    {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}
                    {c.plannedStartAt && (
                      <Typography variant="caption" color="text.secondary">
                        {fmtDateTime(c.plannedStartAt)} → {fmtDateTime(c.plannedEndAt)}
                      </Typography>
                    )}
                    {c.technicianAssignments.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Technicians: {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.code} · ${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" />
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
        </Paper>

        {/* ── Services ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Services ({appt.serviceItems.length})
          </Typography>
          {appt.serviceItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SA</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Technicians</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.map((s) => {
                  const svcShopName = getServiceShopName(s.serviceId)
                  return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell>
                      {svcShopName ? <Chip size="small" label={svcShopName} color="secondary" variant="outlined" sx={{ fontWeight: 700 }} /> : '—'}
                    </TableCell>
                    <TableCell><Typography variant="body2">{fmtBDT(s.price)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip
                          label={s.workStatus}
                          size="small"
                          color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

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

        {/* ── Assign QC ── */}
        {canAssignQC && (
          <Paper sx={{ border: '2px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'info.main' }}>
              Services Complete — Assign QC
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField select size="small" label="QC Inspector" value={selectedQCUserId}
                onChange={(e) => setSelectedQCUserId(e.target.value)} sx={{ minWidth: 250 }}>
                <MenuItem value="">— Select QC —</MenuItem>
                {activeQCUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
              </TextField>
              <Button variant="contained" color="info" disabled={!selectedQCUserId}
                onClick={() => { assignQC({ appointmentId: appt.id, qcUserId: selectedQCUserId }); setSelectedQCUserId('') }}>
                Assign QC
              </Button>
            </Stack>
          </Paper>
        )}

        {/* ── WhatsApp: Payment ── */}
        {canSendPaymentWA && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'warning.main' }}>
              QC Approved — Send Payment Request
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
            <Button variant="contained" color="success" size="large"
              onClick={() => confirmPayment({ appointmentId: appt.id, actorName: 'CRE' })}
              sx={{ fontWeight: 900 }}>
              Payment Received — Issue Gate Pass
            </Button>
          </Paper>
        )}

        {/* ── WhatsApp Log ── */}
        {appt.whatsappLogs.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>WhatsApp Communication</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Direction</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Author</TableCell>
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
                    <TableCell><Typography variant="caption">{log.authorName}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{log.message}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* ── Customer Approval Status ── */}
        {appt.customerApprovalStatus !== 'Pending' && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Customer Approval</Typography>
            <Chip
              label={appt.customerApprovalStatus}
              color={appt.customerApprovalStatus === 'Approved' ? 'success' : 'error'}
              sx={{ fontWeight: 700 }}
            />
            {appt.customerApprovalNote && (
              <Typography variant="body2" sx={{ mt: 1 }}>Note: {appt.customerApprovalNote}</Typography>
            )}
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
