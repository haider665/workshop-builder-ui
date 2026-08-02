import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
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
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  Delete,
  Send,
  ReportProblem,
  Build,
  Chat,
  CheckCircle,
  Payment,
  AssignmentTurnedIn,
  ErrorOutlined,
  VerifiedUser,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore, buildDefaultInspectionChecks } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import { headerCellSx, bodyCellSx } from '../../theme/tableStyles'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWInspectionCheck } from '../../types/cw'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

/** Reusable info row for key-value pairs inside SectionCard */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

/** Status color for work-status chips */
function workStatusColor(status: string): 'success' | 'primary' | 'warning' {
  if (status === 'Completed') return 'success'
  if (status === 'In Progress') return 'primary'
  return 'warning'
}

/** Part request status color */
function partStatusColor(status: string): 'success' | 'info' | 'error' | 'warning' {
  if (status === 'Fulfilled') return 'success'
  if (status === 'Labeled') return 'info'
  if (status === 'Rejected') return 'error'
  return 'warning'
}

export function SAAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  useBackendData()
  const navigate = useNavigate()

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
  const assignQC = useCwStore((s) => s.assignQC)
  const removeAppointmentConcern = useCwStore((s) => s.removeAppointmentConcern)
  const partRequests = useCwStore((s) => s.partRequests)
  const shops = useCwStore((s) => s.shops)
  const concernCategories = useCwStore((s) => s.concernCategories)
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

  const activeServices = useMemo(() => services.filter((s) => s.status === 'Active'), [services])
  const concerns = useCwStore((s) => s.concerns)
  const activeConcerns = useMemo(() => concerns.filter((c) => c.status === 'Active'), [concerns])

  // Inspection state — lazily populate if appointment is in SA Inspection but has no checks (legacy data)
  const [inspChecks, setInspChecks] = useState<CWInspectionCheck[]>(() => {
    const existing = appt?.inspectionChecks ?? []
    return existing.length > 0 ? existing : buildDefaultInspectionChecks()
  })

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
  const concernShopId = useMemo(() => {
    const cMap = new Map(concerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (cId: string) => catMap.get(cMap.get(cId)?.categoryId ?? '')?.shopId ?? ''
  }, [concerns, concernCategories])

  if (!appt) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Appointment not found.</Alert>
      </Box>
    )
  }

  const isInspection = appt.status === 'SA Inspection'
  const isReviewed = appt.status === 'SA Reviewed'
  const isCustomerNotified = appt.status === 'Customer Notified'
  const isDiagnosisComplete = appt.status === 'Diagnosis Complete'
  const isServiceApprovalPending = appt.status === 'Service Approval Pending'
  const isServiceComplete = appt.status === 'Service Complete'
  const isQCApproved = appt.status === 'QC Approved'
  const isQCRejected = appt.status === 'QC Rejected'
  const isPaymentPending = appt.status === 'Payment Pending'

  // SA can send WhatsApp for initial concern approval
  const hasPendingParts = partRequests.some((pr) => pr.appointmentId === appointmentId && pr.status === 'Requested')
  const canSendConcernWA = isReviewed
  // SA can send WhatsApp for service approval after diagnosis
  const canSendServiceWA = isDiagnosisComplete
  // SA can approve/reject (1st round: concerns, 2nd round: services)
  const canApprove = isCustomerNotified || isServiceApprovalPending
  // SA can assign QC when service complete
  const canAssignQC = isServiceComplete
  // SA can send payment WA after QC approves
  const canSendPaymentWA = isQCApproved
  // SA can confirm payment
  const canConfirmPayment = isPaymentPending

  // QC user selection
  const qcRoleId = useMemo(() => roles.find((r) => r.name === 'QC')?.id, [roles])
  const activeQCUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && qcRoleId && u.roleIds.includes(qcRoleId)),
    [users, qcRoleId],
  )
  const [selectedQCUserId, setSelectedQCUserId] = useState('')

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

  async function handleApproval(status: 'Approved' | 'Rejected') {
    await setCustomerApproval({ appointmentId: appt!.id, status, note: approvalNote.trim() || undefined })

    if (status === 'Approved') {
      if (isCustomerNotified) {
        // 1st approval → set_customer_approval already sets status to 'Customer Approved'
        pushTimeline(appt!.id, { actor: 'SA', action: 'Customer approved concerns — ready for JC diagnosis assignment' })
      } else if (isServiceApprovalPending) {
        // 2nd approval → needs explicit transition to 'Service Approved' (after approval save)
        await setAppointmentStatus(appt!.id, 'Service Approved')
        pushTimeline(appt!.id, { actor: 'SA', action: 'Customer approved services — ready for JC service assignment' })
      }
    } else {
      // set_customer_approval already sets status to 'Customer Rejected'
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/sa')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {vehicle?.registrationNo} · {vehicle?.make} {vehicle?.model}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                Customer: {customer?.fullName} · {customer?.phone}
              </Typography>
            </Box>
          </Stack>
          <Chip
            label={appt.status}
            color="primary"
            sx={{ fontWeight: 700, fontSize: '0.78rem', borderRadius: radii.sm, px: 1 }}
          />
        </Stack>

        {/* ── Vehicle + Customer Info ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* ── Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />



        {/* ── Inspection Checklist ── */}
        {isInspection && inspChecks.length > 0 && (
          <SAInspectionTabs checks={inspChecks} onChange={setInspChecks} defaultCollapsed />
        )}
        {!isInspection && appt.inspectionChecks.length > 0 && (
          <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly defaultCollapsed />
        )}

        {/* ── Concerns ── */}
        <SectionCard title={`Concerns (${appt.concernItems.length})`} icon={<ReportProblem sx={{ fontSize: '1rem' }} />}>
          {appt.concernItems.length > 0 && (
            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                return (
                  <Box key={c.id} sx={{
                    p: 2, bgcolor: colors.bg.subtle, borderRadius: radii.md,
                    border: `1px solid ${c.workStatus === 'Completed' ? colors.status.success : colors.border.default}`,
                  }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>{c.concernName}</Typography>
                        {typeof c.processTimeMins === 'number' && (
                          <Chip size="small" label={`${c.processTimeMins} mins`} color="info" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {c.workStatus ? (
                          <Chip label={c.workStatus} size="small" color={workStatusColor(c.workStatus)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                        ) : null}
                        {(isInspection || isReviewed) && (
                          <IconButton size="small" color="error" onClick={() => removeAppointmentConcern(appt.id, c.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                    {c.remark && <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography sx={{ fontSize: '0.82rem', mt: 0.5 }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: colors.status.info, textTransform: 'uppercase' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Parts for this concern */}
                    {concernParts.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: colors.accent.purple, textTransform: 'uppercase' }}>Parts:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {concernParts.map((pr) => (
                            <Stack key={pr.id} direction="row" sx={{
                              justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.75,
                              bgcolor: colors.bg.card, borderRadius: radii.sm,
                              border: `1px solid ${colors.border.default}`,
                            }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate[900] }}>{pr.partName}</Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                                  Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                  {typeof pr.price === 'number' ? ` · ${fmtBDT(pr.price)}` : ''}
                                  {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                </Typography>
                              </Box>
                              <Chip size="small" label={pr.status} color={partStatusColor(pr.status)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
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
          {/* Add concern (during inspection or after review before sending) */}
          {(isInspection || isReviewed) && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Shop</InputLabel>
                <Select label="Shop" value={concernShopFilter} onChange={(e) => setConcernShopFilter(e.target.value as string)}>
                  <MenuItem value="">All Shops</MenuItem>
                  {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Autocomplete
                size="small"
                options={activeConcerns.filter((c) => !concernShopFilter || concernShopId(c.id) === concernShopFilter)}
                getOptionLabel={(o) => `${o.name} (${o.processTimeMins ?? '?'} mins)`}
                value={activeConcerns.find((c) => c.id === addConcernId) ?? null}
                onChange={(_, val) => setAddConcernId(val?.id ?? '')}
                sx={{ minWidth: 280 }}
                renderInput={(params) => <TextField {...params} label="Add Concern" placeholder="Type to search…" />}
              />
              <TextField size="small" label="Remark" value={addConcernRemark}
                onChange={(e) => setAddConcernRemark(e.target.value)} />
              <Button variant="contained" size="small" onClick={handleAddConcern} disabled={!addConcernId}
                sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}>
                Add
              </Button>
            </Stack>
          )}
        </SectionCard>

        {/* ── Services ── */}
        <SectionCard title={'Services (' + appt.serviceItems.length + ')'} icon={<Build sx={{ fontSize: '1rem' }} />}>
          {appt.serviceItems.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Service</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.map((s) => (
                  <TableRow key={s.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>
                        {s.serviceDescription} ({s.processTimeMins} mins)
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>{fmtBDT(s.price)}</Typography>
                    </TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip label={s.workStatus} size="small" color={workStatusColor(s.workStatus)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Add service (during inspection) */}
          {isInspection && (
            <Box sx={{ px: 3, py: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Shop</InputLabel>
                  <Select label="Shop" value={serviceShopFilter} onChange={(e) => { setServiceShopFilter(e.target.value as string); setAddServiceId('') }}>
                    <MenuItem value="">— Select Shop —</MenuItem>
                    {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <Autocomplete
                  size="small"
                  options={activeServices.filter((s) => s.shopId === serviceShopFilter)}
                  getOptionLabel={(o) => `${o.description} (${o.code}) — ${o.processTimeMins}m`}
                  value={activeServices.find((s) => s.id === addServiceId) ?? null}
                  onChange={(_, val) => setAddServiceId(val?.id ?? '')}
                  disabled={!serviceShopFilter}
                  sx={{ minWidth: 300 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Add Service" placeholder="Type to search…"
                      helperText={!serviceShopFilter ? 'Select shop first' : undefined} />
                  )}
                />
                <TextField size="small" label="Remark" value={addServiceRemark}
                  onChange={(e) => setAddServiceRemark(e.target.value)} />
                <Button variant="contained" size="small" onClick={handleAddService} disabled={!addServiceId}
                  sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}>
                  Add
                </Button>
              </Stack>
            </Box>
          )}
        </SectionCard>

        {/* ── Parts & Estimates Summary ── */}
        {(() => {
          const allParts = partRequests.filter((pr) => pr.appointmentId === appointmentId)
          if (allParts.length === 0) return null
          const labeled = allParts.filter((pr) => pr.status === 'Labeled')
          const fulfilled = allParts.filter((pr) => pr.status === 'Fulfilled')
          const pending = allParts.filter((pr) => pr.status === 'Requested')
          const readyParts = [...labeled, ...fulfilled]
          const partsTotal = readyParts.filter((pr) => typeof pr.price === 'number').reduce((sum, pr) => sum + (pr.price! * (pr.quantity ?? 1)), 0)
          return (
            <SectionCard title={`Parts Requests (${allParts.length})`} icon={<Build sx={{ fontSize: '1rem' }} />}>
              {readyParts.length > 0 && (
                <Alert severity="info" sx={{ mb: 2, fontWeight: 600, fontSize: '0.85rem', borderRadius: radii.md }}>
                  {readyParts.length} part(s) ready — total {fmtBDT(partsTotal)}. Discuss with customer.
                </Alert>
              )}
              {pending.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2, fontWeight: 600, fontSize: '0.85rem', borderRadius: radii.md }}>
                  {pending.length} part request(s) still pending admin labeling.
                </Alert>
              )}
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Part</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>ETA</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allParts.map((pr) => (
                    <TableRow key={pr.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>{pr.partName}</Typography>
                        {pr.partNumber && <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>#{pr.partNumber}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>{pr.quantity ?? 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: typeof pr.price === 'number' ? colors.slate[900] : colors.slate[400] }}>
                          {typeof pr.price === 'number' ? fmtBDT(pr.price * (pr.quantity ?? 1)) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>{pr.deliveryDate ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600], fontStyle: pr.estimatorRemarks ? 'normal' : 'italic' }}>{pr.estimatorRemarks ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={pr.status} color={partStatusColor(pr.status)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {readyParts.length > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5, px: 1 }}>
                  <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: colors.slate[900] }}>
                    Parts Total: {fmtBDT(partsTotal)}
                  </Typography>
                </Stack>
              )}
            </SectionCard>
          )
        })()}

        {/* ── Submit Inspection ── */}
        {isInspection && (
          <Button variant="contained" color="info" size="large" fullWidth
            sx={{ fontWeight: 900, py: 1.5, borderRadius: radii.md }} onClick={handleSubmitInspection}>
            Submit Inspection
          </Button>
        )}

        {/* ── WhatsApp: Concern Approval (1st round) ── */}
        {canSendConcernWA && (
          <SectionCard title="Send WhatsApp for Customer Approval" icon={<Chat sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1.5 }}>
              Review complete. Send concerns and services to customer for approval.
            </Typography>
            {hasPendingParts && (
              <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.82rem', borderRadius: radii.md }}>
                Part requests still pending admin labeling. Wait for parts to be priced before contacting customer.
              </Alert>
            )}
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('concern-approval')}
              disabled={hasPendingParts}
              sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>
              Compose WhatsApp
            </Button>
          </SectionCard>
        )}

        {/* ── WhatsApp: Service Approval (2nd round, after diagnosis) ── */}
        {canSendServiceWA && (
          <SectionCard title="Diagnosis Complete — Send Service Approval" icon={<Send sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1.5 }}>
              SE completed diagnosis and may have added services. Send updated list to customer.
            </Typography>
            {hasPendingParts && (
              <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.82rem', borderRadius: radii.md }}>
                Part requests still pending admin labeling. Wait for parts to be priced before contacting customer.
              </Alert>
            )}
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('service-approval')}
              disabled={hasPendingParts}
              sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>
              Compose WhatsApp (Services)
            </Button>
          </SectionCard>
        )}

        {/* ── Customer Approval (both rounds) ── */}

        {/* ── Assign QC (after services complete) ── */}
        {canAssignQC && (
          <SectionCard title="Services Complete — Assign QC for Verification" icon={<VerifiedUser sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1.5 }}>
              All services finished. Assign a QC inspector to verify the work before contacting the customer.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField
                select size="small" label="QC Inspector"
                value={selectedQCUserId}
                onChange={(e) => setSelectedQCUserId(e.target.value)}
                sx={{ minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
              >
                <MenuItem value="">— Select QC —</MenuItem>
                {activeQCUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained" color="info"
                disabled={!selectedQCUserId}
                onClick={() => {
                  assignQC({ appointmentId: appt!.id, qcUserId: selectedQCUserId })
                  setSelectedQCUserId('')
                }}
                sx={{ fontWeight: 800, borderRadius: '10px', px: 2.5 }}
              >
                Assign QC
              </Button>
            </Stack>
          </SectionCard>
        )}

        {/* ── QC Rejected Info ── */}
        {isQCRejected && appt.qcRejectionNote && (
          <SectionCard title="QC Rejected — Rework Required" icon={<ErrorOutlined sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1 }}>
              QC has flagged issues. Job Controller will reassign the failed items for rework.
            </Typography>
            <InfoRow label="QC Note" value={appt.qcRejectionNote} />
          </SectionCard>
        )}

        {/* ── WhatsApp: Payment (after QC approved) ── */}
        {canSendPaymentWA && (
          <SectionCard title="QC Approved — Send Payment Request" icon={<Payment sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1.5 }}>
              QC verification passed. Send payment request to customer.
            </Typography>
            <Button variant="contained" color="success" startIcon={<Send />}
              onClick={() => openWhatsApp('payment')}
              sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>
              Compose WhatsApp (Payment)
            </Button>
          </SectionCard>
        )}

        {/* ── Confirm Payment ── */}
        {canConfirmPayment && (
          <SectionCard title="Confirm Payment Received" icon={<CheckCircle sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 1.5 }}>
              Gate pass will be auto-issued upon confirmation.
            </Typography>
            <Button variant="contained" color="success" size="large" onClick={handleConfirmPayment}
              sx={{ fontWeight: 900, borderRadius: radii.md }}>
              Payment Received — Issue Gate Pass
            </Button>
          </SectionCard>
        )}

        {/* ── WhatsApp Message Log ── */}
        {appt.whatsappLogs.length > 0 && (
          <SectionCard title={`WhatsApp Messages (${appt.whatsappLogs.length})`} icon={<Chat sx={{ fontSize: '1rem' }} />}>
            <Stack spacing={1.5}>
              {appt.whatsappLogs.slice().reverse().map((log) => (
                <Box key={log.id} sx={{
                  p: 1.5, borderRadius: radii.md,
                  bgcolor: log.direction === 'outbound' ? 'success.50' : colors.bg.subtle,
                  border: `1px solid ${colors.border.default}`,
                  borderLeft: `4px solid ${log.direction === 'outbound' ? colors.status.success : colors.status.info}`,
                }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: colors.slate[900] }}>
                      {log.authorName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                      {log.direction === 'outbound' ? '→ Customer' : '← Customer'}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                      {new Date(log.sentAt).toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: colors.slate[700] }}>
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        )}

        {/* ── Customer Approval (both rounds) ── */}
        {canApprove && (
          <SectionCard title={isCustomerNotified ? 'Record Customer Approval (Concerns)' : 'Record Customer Approval (Services)'} icon={<AssignmentTurnedIn sx={{ fontSize: '1rem' }} />}>
            <TextField label="Customer Note (optional)" value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)} fullWidth multiline minRows={2}
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" color="success" onClick={() => handleApproval('Approved')}
                sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>Approve</Button>
              <Button variant="outlined" color="error" onClick={() => handleApproval('Rejected')}
                sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>Reject</Button>
            </Stack>
          </SectionCard>
        )}
      </Stack>

      {/* WhatsApp Dialog */}
      <Dialog open={waDialogOpen} onClose={() => setWaDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: radii.lg, boxShadow: shadows.dialog } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: colors.slate[900] }}>Compose WhatsApp Message</DialogTitle>
        <DialogContent>
          <TextField value={waMessage} onChange={(e) => setWaMessage(e.target.value)}
            fullWidth multiline minRows={8} sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setWaDialogOpen(false)} sx={{ color: colors.slate[600], fontWeight: 600, borderRadius: '10px' }}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<Send />} onClick={sendWhatsapp} disabled={!waMessage.trim()}
            sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
